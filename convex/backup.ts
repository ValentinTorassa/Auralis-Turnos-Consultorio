import { v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUserId } from "./lib";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  MAX_RESTORE_TRANSACTION_RECORDS,
  backupCounts,
  restoreAppointmentOrder,
  validateBackupSnapshot,
} from "./backupModel";

type Ctx = QueryCtx | MutationCtx;

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  );
}

async function userDomainRows(ctx: Ctx, userId: Id<"users">) {
  const [appointmentTypes, patients, appointments, tasks, reminders, slots, settings] =
    await Promise.all([
      ctx.db.query("appointmentTypes").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("patients").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("appointments").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("dailyTasks").withIndex("by_user_date", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("reminders").withIndex("by_user_due", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("psychiatristSlots").withIndex("by_user_start", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("settings").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);

  for (const rows of [appointmentTypes, patients, appointments, tasks, reminders, slots, settings]) {
    if (rows.some((row) => row.userId !== userId)) {
      throw new Error("Se detectó un registro fuera del alcance del usuario");
    }
  }
  return { appointmentTypes, patients, appointments, tasks, reminders, slots, settings };
}

function domainCounts(rows: Awaited<ReturnType<typeof userDomainRows>>) {
  const total =
    rows.appointmentTypes.length + rows.patients.length + rows.appointments.length +
    rows.tasks.length + rows.reminders.length + rows.slots.length + rows.settings.length;
  return {
    appointmentTypes: rows.appointmentTypes.length,
    patients: rows.patients.length,
    appointments: rows.appointments.length,
    deletedAppointments: rows.appointments.filter((row) => row.deletedAt !== undefined).length,
    tasks: rows.tasks.length,
    reminders: rows.reminders.length,
    psychiatristSlots: rows.slots.length,
    settings: rows.settings.length,
    total,
  };
}

function assertTransactionSize(current: number, incoming: number, seriesRoots: number) {
  if (current + incoming + seriesRoots > MAX_RESTORE_TRANSACTION_RECORDS) {
    throw new Error(
      `La restauración supera el límite transaccional de ${MAX_RESTORE_TRANSACTION_RECORDS} operaciones; reducí la copia o limpiá datos actuales`,
    );
  }
}

async function importReceipt(ctx: Ctx, userId: Id<"users">, snapshotId: string) {
  return ctx.db
    .query("backupImports")
    .withIndex("by_user_snapshot", (q) =>
      q.eq("userId", userId).eq("snapshotId", snapshotId),
    )
    .unique();
}

async function userImportReceipts(ctx: Ctx, userId: Id<"users">) {
  return ctx.db
    .query("backupImports")
    .withIndex("by_user_snapshot", (q) => q.eq("userId", userId))
    .collect();
}

export const exportSnapshot = query({
  args: { snapshotId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!/^[A-Za-z0-9-]{16,80}$/.test(args.snapshotId)) {
      throw new Error("Identificador de copia inválido");
    }
    const rows = await userDomainRows(ctx, userId);
    const exportedAt = Date.now();
    const snapshot = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      snapshotId: args.snapshotId,
      exportedAt,
      data: {
        appointmentTypes: rows.appointmentTypes.map((row) =>
          withoutUndefined({
            id: row._id,
            name: row.name,
            color: row.color,
            isPsychiatrist: row.isPsychiatrist,
            sortOrder: row.sortOrder,
            code: row.code,
            requiresPatient: row.requiresPatient,
            tracksPayment: row.tracksPayment,
            supportsReminder: row.supportsReminder,
            defaultDurationMin: row.defaultDurationMin,
            isSystemType: row.isSystemType,
          }),
        ),
        patients: rows.patients.map((row) =>
          withoutUndefined({
            id: row._id,
            fullName: row.fullName,
            phone: row.phone,
            birthDate: row.birthDate,
            careType: row.careType,
            adminNotes: row.adminNotes,
            archivedAt: row.archivedAt,
            createdAt: row.createdAt,
          }),
        ),
        appointments: rows.appointments.map((row) =>
          withoutUndefined({
            id: row._id,
            patientRef: row.patientId,
            typeRef: row.typeId,
            title: row.title,
            startTime: row.startTime,
            endTime: row.endTime,
            status: row.status,
            paymentStatus: row.paymentStatus,
            paymentMethod: row.paymentMethod,
            paymentNotes: row.paymentNotes,
            paidAt: row.paidAt,
            notes: row.notes,
            isPsychiatrist: row.isPsychiatrist,
            reminderEnabled: row.reminderEnabled,
            seriesRef: row.seriesId,
            occurrenceIndex: row.occurrenceIndex,
            deletedAt: row.deletedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          }),
        ),
        tasks: rows.tasks.map((row) => ({
          id: row._id,
          date: row.date,
          title: row.title,
          done: row.done,
          sortOrder: row.sortOrder,
          createdAt: row.createdAt,
        })),
        reminders: rows.reminders.map((row) =>
          withoutUndefined({
            id: row._id,
            patientRef: row.patientId,
            appointmentRef: row.appointmentId,
            message: row.message,
            dueAt: row.dueAt,
            active: row.active,
            done: row.done,
            notificationSentAt: row.notificationSentAt,
            createdAt: row.createdAt,
          }),
        ),
        psychiatristSlots: rows.slots.map((row) =>
          withoutUndefined({
            id: row._id,
            startTime: row.startTime,
            endTime: row.endTime,
            state: row.state,
            appointmentRef: row.appointmentId,
            generationKey: row.generationKey,
            monthKey: row.monthKey,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          }),
        ),
        settings: rows.settings.map((row) => ({
          workDayStart: row.workDayStart,
          workDayEnd: row.workDayEnd,
          defaultDurationMin: row.defaultDurationMin,
          psychiatristSlotCount: row.psychiatristSlotCount,
          psychiatristSlotDurationMin: row.psychiatristSlotDurationMin,
          seeded: row.seeded,
        })),
      },
    };

    // The same strict parser used by restore also checks all exported references.
    return validateBackupSnapshot(snapshot);
  },
});

export const previewRestore = query({
  args: { snapshot: v.any(), mode: v.literal("replace") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const snapshot = validateBackupSnapshot(args.snapshot);
    const currentRows = await userDomainRows(ctx, userId);
    const incoming = backupCounts(snapshot);
    const current = domainCounts(currentRows);
    const roots = snapshot.data.appointments.filter((row) => row.seriesRef === row.id).length;
    assertTransactionSize(current.total, incoming.total, roots);
    const receipt = await importReceipt(ctx, userId, snapshot.snapshotId);
    return {
      mode: args.mode,
      incoming,
      current,
      alreadyImported: receipt !== null,
      importedAt: receipt?.importedAt,
    };
  },
});

function normalizePatientName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export const restoreSnapshot = mutation({
  args: {
    snapshot: v.any(),
    mode: v.literal("replace"),
    confirmation: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (args.confirmation !== "REEMPLAZAR") {
      throw new Error("Confirmación destructiva inválida");
    }
    const snapshot = validateBackupSnapshot(args.snapshot);
    const incoming = backupCounts(snapshot);
    const existingReceipt = await importReceipt(ctx, userId, snapshot.snapshotId);
    if (existingReceipt) {
      return { imported: false as const, duplicate: true as const, counts: incoming };
    }

    const current = await userDomainRows(ctx, userId);
    const roots = snapshot.data.appointments.filter((row) => row.seriesRef === row.id).length;
    assertTransactionSize(domainCounts(current).total, incoming.total, roots);

    for (const row of current.reminders) await ctx.db.delete(row._id);
    for (const row of current.slots) await ctx.db.delete(row._id);
    for (const row of current.appointments) await ctx.db.delete(row._id);
    for (const row of current.patients) await ctx.db.delete(row._id);
    for (const row of current.tasks) await ctx.db.delete(row._id);
    for (const row of current.appointmentTypes) await ctx.db.delete(row._id);
    for (const row of current.settings) await ctx.db.delete(row._id);

    const typeIds = new Map<string, Id<"appointmentTypes">>();
    for (const row of snapshot.data.appointmentTypes) {
      const newId = await ctx.db.insert("appointmentTypes", {
        userId,
        name: row.name,
        color: row.color,
        isPsychiatrist: row.isPsychiatrist,
        sortOrder: row.sortOrder,
        code: row.code,
        requiresPatient: row.requiresPatient,
        tracksPayment: row.tracksPayment,
        supportsReminder: row.supportsReminder,
        defaultDurationMin: row.defaultDurationMin,
        isSystemType: row.isSystemType,
      });
      typeIds.set(row.id, newId);
    }

    const patientIds = new Map<string, Id<"patients">>();
    for (const row of snapshot.data.patients) {
      const newId = await ctx.db.insert("patients", {
        userId,
        fullName: row.fullName,
        fullNameLower: normalizePatientName(row.fullName),
        phone: row.phone,
        birthDate: row.birthDate,
        careType: row.careType,
        adminNotes: row.adminNotes,
        archivedAt: row.archivedAt,
        createdAt: row.createdAt,
      });
      patientIds.set(row.id, newId);
    }

    const appointmentIds = new Map<string, Id<"appointments">>();
    for (const row of restoreAppointmentOrder(snapshot)) {
      const seriesId =
        row.seriesRef && row.seriesRef !== row.id
          ? appointmentIds.get(row.seriesRef)
          : undefined;
      const newId = await ctx.db.insert("appointments", {
        userId,
        patientId: row.patientRef ? patientIds.get(row.patientRef) : undefined,
        typeId: typeIds.get(row.typeRef)!,
        title: row.title,
        startTime: row.startTime,
        endTime: row.endTime,
        status: row.status,
        paymentStatus: row.paymentStatus,
        paymentMethod: row.paymentMethod,
        paymentNotes: row.paymentNotes,
        paidAt: row.paidAt,
        notes: row.notes,
        isPsychiatrist: row.isPsychiatrist,
        reminderEnabled: row.reminderEnabled,
        seriesId,
        occurrenceIndex: row.occurrenceIndex,
        deletedAt: row.deletedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
      appointmentIds.set(row.id, newId);
      if (row.seriesRef === row.id) await ctx.db.patch(newId, { seriesId: newId });
    }

    for (const row of snapshot.data.tasks) {
      await ctx.db.insert("dailyTasks", {
        userId,
        date: row.date,
        title: row.title,
        done: row.done,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt,
      });
    }

    for (const row of snapshot.data.reminders) {
      await ctx.db.insert("reminders", {
        userId,
        patientId: row.patientRef ? patientIds.get(row.patientRef) : undefined,
        appointmentId: row.appointmentRef
          ? appointmentIds.get(row.appointmentRef)
          : undefined,
        message: row.message,
        dueAt: row.dueAt,
        active: row.active,
        done: row.done,
        notificationSentAt: row.notificationSentAt,
        createdAt: row.createdAt,
      });
    }

    for (const row of snapshot.data.psychiatristSlots) {
      await ctx.db.insert("psychiatristSlots", {
        userId,
        startTime: row.startTime,
        endTime: row.endTime,
        state: row.state,
        appointmentId: row.appointmentRef
          ? appointmentIds.get(row.appointmentRef)
          : undefined,
        generationKey: row.generationKey,
        monthKey: row.monthKey,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }

    for (const row of snapshot.data.settings) {
      await ctx.db.insert("settings", { userId, ...row });
    }
    // Only the latest receipt is needed to make an immediate mutation retry a no-op.
    for (const receipt of await userImportReceipts(ctx, userId)) {
      await ctx.db.delete(receipt._id);
    }
    await ctx.db.insert("backupImports", {
      userId,
      snapshotId: snapshot.snapshotId,
      importedAt: Date.now(),
    });
    return { imported: true as const, duplicate: false as const, counts: incoming };
  },
});
