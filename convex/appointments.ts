import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireUserId, endOfDayMs, startOfDayMs } from "./lib";
import { appointmentTypeRules } from "./appointmentTypeDefaults";
import {
  claimAvailableSlotForAppointment,
  isLegacyPsychiatristPlaceholder,
  releaseSlotForAppointment,
} from "./psychiatristModel";

const statusV = v.union(
  v.literal("confirmed"),
  v.literal("cancelled"),
  v.literal("no_show"),
  v.literal("completed"),
);
const paymentV = v.union(
  v.literal("paid"),
  v.literal("unpaid"),
  v.literal("owes"),
  v.literal("na"),
);
const recurrenceV = v.optional(
  v.union(v.literal(1), v.literal(4), v.literal(8), v.literal(12)),
);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_APPOINTMENT_MS = 5 * 60 * 1000;
const MAX_APPOINTMENT_MS = 24 * 60 * 60 * 1000;
const MIN_DATE_MS = Date.UTC(2000, 0, 1);
const MAX_DATE_MS = Date.UTC(2101, 0, 1);

export function validateAppointmentInterval(startTime: number, endTime: number) {
  if (
    !Number.isSafeInteger(startTime) ||
    !Number.isSafeInteger(endTime) ||
    startTime < MIN_DATE_MS ||
    endTime >= MAX_DATE_MS
  ) {
    throw new Error("Fecha u horario inválido");
  }
  const duration = endTime - startTime;
  if (duration < MIN_APPOINTMENT_MS || duration > MAX_APPOINTMENT_MS) {
    throw new Error("La duración debe estar entre 5 minutos y 24 horas");
  }
}

export function appointmentOccurrences(
  startTime: number,
  endTime: number,
  count: number,
) {
  if (![1, 4, 8, 12].includes(count)) {
    throw new Error("Cantidad de repeticiones inválida");
  }
  validateAppointmentInterval(startTime, endTime);
  const rows = Array.from({ length: count }, (_, occurrenceIndex) => ({
    occurrenceIndex,
    startTime: startTime + occurrenceIndex * WEEK_MS,
    endTime: endTime + occurrenceIndex * WEEK_MS,
  }));
  validateAppointmentInterval(rows.at(-1)!.startTime, rows.at(-1)!.endTime);
  return rows;
}

export function isConflictingAppointment(
  appointment: {
    _id: string;
    startTime: number;
    endTime: number;
    status: string;
    deletedAt?: number;
  },
  startTime: number,
  endTime: number,
  excludeId?: string,
): boolean {
  return (
    appointment._id !== excludeId &&
    appointment.status !== "cancelled" &&
    appointment.deletedAt === undefined &&
    appointment.startTime < endTime &&
    appointment.endTime > startTime
  );
}

function optionalText(value: string | undefined, max: number) {
  const trimmed = value?.trim() || undefined;
  if (trimmed && trimmed.length > max) throw new Error("Texto demasiado largo");
  return trimmed;
}

export function isTerminalAppointmentStatus(status: string): boolean {
  return status === "cancelled" || status === "no_show" || status === "completed";
}

export function rescheduledReminderDueAt(
  currentDueAt: number,
  previousStartTime: number,
  nextStartTime: number,
): number {
  return currentDueAt + (nextStartTime - previousStartTime);
}

export function shouldCreateAppointmentReminder(
  wasEnabled: boolean,
  isEnabled: boolean,
  hasReminderHistory: boolean,
): boolean {
  return isEnabled && (!wasEnabled || !hasReminderHistory);
}

async function enrich(
  ctx: QueryCtx,
  userId: Id<"users">,
  rows: Doc<"appointments">[],
) {
  const types = await ctx.db
    .query("appointmentTypes")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const typeMap = new Map(types.map((t) => [t._id, t]));
  const patientIds = [
    ...new Set(rows.flatMap((r) => (r.patientId ? [r.patientId] : []))),
  ];
  const patients = await Promise.all(patientIds.map((id) => ctx.db.get(id)));
  const patientMap = new Map(
    patients.flatMap((p) =>
      p && p.userId === userId ? [[p._id, p] as const] : [],
    ),
  );
  return rows.map((r) => ({
    ...r,
    type: typeMap.get(r.typeId) ?? null,
    patient: r.patientId ? (patientMap.get(r.patientId) ?? null) : null,
  }));
}

async function overlappingRows(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  startMs: number,
  endMs: number,
  psychiatristOnly = false,
) {
  if (endMs <= startMs) return [];

  if (psychiatristOnly) {
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_user_psychiatrist", (q) =>
        q
          .eq("userId", userId)
          .eq("isPsychiatrist", true)
          .lt("startTime", endMs),
      )
      .filter((q) =>
        q.and(
          q.gt(q.field("endTime"), startMs),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();
    return rows.filter((row) => !isLegacyPsychiatristPlaceholder(row));
  }

  const rows = await ctx.db
    .query("appointments")
    .withIndex("by_user_start", (q) =>
      q.eq("userId", userId).lt("startTime", endMs),
    )
    .filter((q) =>
      q.and(
        q.gt(q.field("endTime"), startMs),
        q.eq(q.field("deletedAt"), undefined),
      ),
    )
    .collect();
  return rows.filter((row) => !isLegacyPsychiatristPlaceholder(row));
}

async function conflictsForOccurrences(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  occurrences: ReturnType<typeof appointmentOccurrences>,
  excludeId?: Id<"appointments">,
) {
  const conflicts: Array<{
    appointment: Doc<"appointments">;
    occurrenceIndex: number;
    occurrenceStartTime: number;
  }> = [];
  for (const occurrence of occurrences) {
    const rows = await overlappingRows(
      ctx,
      userId,
      occurrence.startTime,
      occurrence.endTime,
    );
    for (const appointment of rows) {
      if (
        !isConflictingAppointment(
          appointment,
          occurrence.startTime,
          occurrence.endTime,
          excludeId,
        )
      ) {
        continue;
      }
      conflicts.push({
        appointment,
        occurrenceIndex: occurrence.occurrenceIndex,
        occurrenceStartTime: occurrence.startTime,
      });
    }
  }
  return conflicts;
}

export const conflicts = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
    recurrenceCount: recurrenceV,
    excludeId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const occurrences = appointmentOccurrences(
      args.startTime,
      args.endTime,
      args.recurrenceCount ?? 1,
    );
    if (args.excludeId) {
      const excluded = await ctx.db.get(args.excludeId);
      if (!excluded || excluded.userId !== userId) {
        throw new Error("Turno no encontrado");
      }
    }
    const matches = await conflictsForOccurrences(
      ctx,
      userId,
      occurrences,
      args.excludeId,
    );
    const enriched = await enrich(
      ctx,
      userId,
      matches.map((match) => match.appointment),
    );
    return matches.map((match, index) => ({
      ...enriched[index],
      occurrenceIndex: match.occurrenceIndex,
      occurrenceStartTime: match.occurrenceStartTime,
    }));
  },
});

export const byRange = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
    psychiatristOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (
      !Number.isSafeInteger(args.startMs) ||
      !Number.isSafeInteger(args.endMs) ||
      args.startMs < MIN_DATE_MS ||
      args.endMs >= MAX_DATE_MS ||
      args.endMs <= args.startMs ||
      args.endMs - args.startMs > 370 * 24 * 60 * 60 * 1000
    ) {
      throw new Error("Rango de fechas inválido");
    }
    const rows = await overlappingRows(
      ctx,
      userId,
      args.startMs,
      args.endMs,
      args.psychiatristOnly,
    );
    return enrich(ctx, userId, rows);
  },
});

export const byDay = query({
  args: {
    date: v.string(),
    psychiatristOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const start = startOfDayMs(args.date);
    const end = endOfDayMs(args.date) + 1;
    const rows = await overlappingRows(
      ctx,
      userId,
      start,
      end,
      args.psychiatristOnly,
    );
    const enriched = await enrich(ctx, userId, rows);
    return enriched.sort((a, b) => a.startTime - b.startTime);
  },
});

export const todaySummary = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const start = startOfDayMs(args.date);
    const end = endOfDayMs(args.date) + 1;
    const rows = await overlappingRows(ctx, userId, start, end);
    const day = rows.filter((r) => r.status !== "cancelled");
    const enriched = await enrich(ctx, userId, day);
    const sorted = enriched.sort((a, b) => a.startTime - b.startTime);
    const now = Date.now();
    const next = sorted.find((a) => a.endTime > now && a.status === "confirmed");
    return { appointments: sorted, next };
  },
});

export const create = mutation({
  args: {
    patientId: v.optional(v.id("patients")),
    typeId: v.id("appointmentTypes"),
    title: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    notes: v.optional(v.string()),
    paymentStatus: v.optional(paymentV),
    paymentMethod: v.optional(v.string()),
    paymentNotes: v.optional(v.string()),
    reminderEnabled: v.optional(v.boolean()),
    recurrenceCount: recurrenceV,
    allowConflict: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const type = await ctx.db.get(args.typeId);
    if (!type || type.userId !== userId) throw new Error("Tipo inválido");
    const rules = appointmentTypeRules(type);
    if (args.patientId) {
      const p = await ctx.db.get(args.patientId);
      if (!p || p.userId !== userId || p.archivedAt)
        throw new Error("Paciente inválido o archivado");
    }
    const title = optionalText(args.title, 200);
    if (rules.requiresPatient && !args.patientId)
      throw new Error("Este tipo de actividad requiere un paciente");
    if (!rules.requiresPatient && !title)
      throw new Error("Ingresá un título para la actividad sin paciente");
    const occurrences = appointmentOccurrences(
      args.startTime,
      args.endTime,
      args.recurrenceCount ?? 1,
    );
    const conflicts = await conflictsForOccurrences(ctx, userId, occurrences);
    if (conflicts.length > 0 && !args.allowConflict) {
      throw new Error("APPOINTMENT_CONFLICT: El horario se superpone con otro turno");
    }
    const now = Date.now();
    const reminderEnabled = rules.supportsReminder
      ? (args.reminderEnabled ?? false)
      : false;
    const paymentStatus = rules.tracksPayment
      ? (args.paymentStatus ?? "unpaid")
      : "na";
    const patient = args.patientId ? await ctx.db.get(args.patientId) : null;
    const ids: Id<"appointments">[] = [];
    for (const occurrence of occurrences) {
      const id = await ctx.db.insert("appointments", {
        userId,
        patientId: args.patientId,
        typeId: args.typeId,
        title,
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
        status: "confirmed",
        paymentStatus,
        paymentMethod: rules.tracksPayment
          ? optionalText(args.paymentMethod, 200)
          : undefined,
        paymentNotes: rules.tracksPayment
          ? optionalText(args.paymentNotes, 500)
          : undefined,
        paidAt: paymentStatus === "paid" ? now : undefined,
        notes: optionalText(args.notes, 4000),
        isPsychiatrist: type.isPsychiatrist,
        reminderEnabled,
        occurrenceIndex:
          occurrences.length > 1 ? occurrence.occurrenceIndex : undefined,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
      if (type.isPsychiatrist) {
        await claimAvailableSlotForAppointment(
          ctx,
          userId,
          id,
          occurrence.startTime,
          occurrence.endTime,
        );
      }
      if (!reminderEnabled) continue;
      await ctx.db.insert("reminders", {
        userId,
        patientId: args.patientId,
        appointmentId: id,
        message: `Enviar recordatorio de asistencia a ${patient?.fullName ?? title ?? "paciente"}.`,
        dueAt: occurrence.startTime - 24 * 60 * 60 * 1000,
        active: true,
        done: false,
        createdAt: now,
      });
    }
    if (ids.length > 1) {
      const seriesId = ids[0];
      for (const id of ids) await ctx.db.patch(id, { seriesId });
    }
    return ids[0];
  },
});

export const update = mutation({
  args: {
    id: v.id("appointments"),
    patientId: v.optional(v.union(v.id("patients"), v.null())),
    typeId: v.optional(v.id("appointmentTypes")),
    title: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    status: v.optional(statusV),
    paymentStatus: v.optional(paymentV),
    paymentMethod: v.optional(v.string()),
    paymentNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
    reminderEnabled: v.optional(v.boolean()),
    allowConflict: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId || row.deletedAt)
      throw new Error("Turno no encontrado");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    let type = await ctx.db.get(row.typeId);
    if (!type || type.userId !== userId) throw new Error("Tipo inválido");
    if (args.patientId !== undefined) {
      if (args.patientId !== null) {
        const patient = await ctx.db.get(args.patientId);
        if (!patient || patient.userId !== userId || patient.archivedAt)
          throw new Error("Paciente inválido o archivado");
      }
      patch.patientId = args.patientId === null ? undefined : args.patientId;
    }
    if (args.typeId !== undefined) {
      type = await ctx.db.get(args.typeId);
      if (!type || type.userId !== userId) throw new Error("Tipo inválido");
      patch.typeId = args.typeId;
      patch.isPsychiatrist = type.isPsychiatrist;
    }
    if (args.title !== undefined) patch.title = optionalText(args.title, 200);
    if (args.startTime !== undefined) patch.startTime = args.startTime;
    if (args.endTime !== undefined) patch.endTime = args.endTime;
    if (args.status !== undefined) patch.status = args.status;
    if (args.paymentStatus !== undefined) patch.paymentStatus = args.paymentStatus;
    if (args.paymentMethod !== undefined)
      patch.paymentMethod = optionalText(args.paymentMethod, 200);
    if (args.paymentNotes !== undefined)
      patch.paymentNotes = optionalText(args.paymentNotes, 500);
    if (args.notes !== undefined) patch.notes = optionalText(args.notes, 4000);
    if (args.reminderEnabled !== undefined)
      patch.reminderEnabled = args.reminderEnabled;

    const start = (patch.startTime as number | undefined) ?? row.startTime;
    const end = (patch.endTime as number | undefined) ?? row.endTime;

    const rules = appointmentTypeRules(type);
    const patientId =
      args.patientId === undefined
        ? row.patientId
        : args.patientId === null
          ? undefined
          : args.patientId;
    const title =
      args.title === undefined ? row.title : args.title.trim() || undefined;
    if (rules.requiresPatient && !patientId)
      throw new Error("Este tipo de actividad requiere un paciente");
    if (!rules.requiresPatient && !title)
      throw new Error("Ingresá un título para la actividad sin paciente");
    if (!rules.tracksPayment) {
      patch.paymentStatus = "na";
      patch.paymentMethod = undefined;
      patch.paymentNotes = undefined;
    }
    const status = args.status ?? row.status;
    const changesSchedule =
      args.startTime !== undefined ||
      args.endTime !== undefined ||
      (row.status === "cancelled" && status !== "cancelled");
    if (changesSchedule) validateAppointmentInterval(start, end);
    if (status !== "cancelled" && changesSchedule) {
      const conflicts = await conflictsForOccurrences(
        ctx,
        userId,
        appointmentOccurrences(start, end, 1),
        args.id,
      );
      if (conflicts.length > 0 && !args.allowConflict) {
        throw new Error("APPOINTMENT_CONFLICT: El horario se superpone con otro turno");
      }
    }
    const paymentStatus =
      (patch.paymentStatus as Doc<"appointments">["paymentStatus"] | undefined) ??
      row.paymentStatus;
    patch.paidAt = paymentStatus === "paid" ? row.paidAt ?? Date.now() : undefined;
    const reminderEnabled =
      rules.supportsReminder && !isTerminalAppointmentStatus(status)
        ? (args.reminderEnabled ?? row.reminderEnabled)
        : false;

    patch.reminderEnabled = reminderEnabled;
    await ctx.db.patch(args.id, patch);
    if (
      (args.typeId !== undefined && !type.isPsychiatrist) ||
      (args.startTime !== undefined && args.startTime !== row.startTime) ||
      (args.endTime !== undefined && args.endTime !== row.endTime) ||
      status === "cancelled"
    ) {
      await releaseSlotForAppointment(ctx, userId, args.id);
    }
    if (type.isPsychiatrist && status !== "cancelled") {
      await claimAvailableSlotForAppointment(
        ctx,
        userId,
        args.id,
        start,
        end,
      );
    }

    const reminderHistory = await ctx.db
      .query("reminders")
      .withIndex("by_user_due", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("appointmentId"), args.id))
      .collect();
    const activeReminders = reminderHistory.filter(
      (reminder) => reminder.active && !reminder.done,
    );
    if (reminderEnabled) {
      const [first, ...duplicates] = activeReminders;
      if (first) {
        await ctx.db.patch(first._id, {
          patientId,
          appointmentId: args.id,
          dueAt: rescheduledReminderDueAt(
            first.dueAt,
            row.startTime,
            start,
          ),
        });
      } else if (
        shouldCreateAppointmentReminder(
          row.reminderEnabled,
          reminderEnabled,
          reminderHistory.length > 0,
        )
      ) {
        const patient = patientId ? await ctx.db.get(patientId) : null;
        await ctx.db.insert("reminders", {
          userId,
          patientId,
          appointmentId: args.id,
          message: `Enviar recordatorio de asistencia a ${patient?.fullName ?? title ?? "paciente"}.`,
          dueAt: start - 24 * 60 * 60 * 1000,
          active: true,
          done: false,
          createdAt: Date.now(),
        });
      }
      for (const duplicate of duplicates) {
        await ctx.db.patch(duplicate._id, { active: false, done: true });
      }
    } else {
      for (const reminder of activeReminders) {
        await ctx.db.patch(reminder._id, { active: false, done: true });
      }
    }
    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId || row.deletedAt)
      throw new Error("Turno no encontrado");
    const activeReminders = await ctx.db
      .query("reminders")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("active", true),
      )
      .filter((q) => q.eq(q.field("appointmentId"), args.id))
      .collect();
    for (const reminder of activeReminders) {
      await ctx.db.patch(reminder._id, { active: false, done: true });
    }
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      reminderEnabled: false,
      updatedAt: Date.now(),
    });
    await releaseSlotForAppointment(ctx, userId, args.id);
  },
});

export const restore = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId || !row.deletedAt) {
      throw new Error("Turno eliminado no encontrado");
    }
    await ctx.db.patch(args.id, { deletedAt: undefined, updatedAt: Date.now() });
    if (row.isPsychiatrist && row.status !== "cancelled") {
      await claimAvailableSlotForAppointment(
        ctx,
        userId,
        args.id,
        row.startTime,
        row.endTime,
      );
    }
    return args.id;
  },
});

export const closeout = mutation({
  args: {
    id: v.id("appointments"),
    action: v.union(
      v.literal("completed_paid"),
      v.literal("completed_owes"),
      v.literal("no_show"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId || row.deletedAt) {
      throw new Error("Turno no encontrado");
    }
    const type = await ctx.db.get(row.typeId);
    if (!type || type.userId !== userId) throw new Error("Tipo inválido");
    const tracksPayment = appointmentTypeRules(type).tracksPayment;
    const now = Date.now();
    const status: Doc<"appointments">["status"] =
      args.action === "completed_paid" || args.action === "completed_owes"
        ? "completed"
        : args.action;
    const paymentStatus = !tracksPayment
      ? "na"
      : args.action === "completed_paid"
        ? "paid"
        : args.action === "completed_owes"
          ? "owes"
          : row.paymentStatus;
    await ctx.db.patch(args.id, {
      status,
      paymentStatus,
      paidAt: paymentStatus === "paid" ? row.paidAt ?? now : undefined,
      reminderEnabled: false,
      updatedAt: now,
    });
    if (status === "cancelled") {
      await releaseSlotForAppointment(ctx, userId, args.id);
    }
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("active", true),
      )
      .filter((q) => q.eq(q.field("appointmentId"), args.id))
      .collect();
    for (const reminder of reminders) {
      await ctx.db.patch(reminder._id, { active: false, done: true });
    }
    return args.id;
  },
});

export const move = mutation({
  args: {
    id: v.id("appointments"),
    startTime: v.number(),
    endTime: v.number(),
    allowConflict: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId || row.deletedAt)
      throw new Error("Turno no encontrado");
    validateAppointmentInterval(args.startTime, args.endTime);
    if (row.status !== "cancelled") {
      const conflicts = await conflictsForOccurrences(
        ctx,
        userId,
        appointmentOccurrences(args.startTime, args.endTime, 1),
        args.id,
      );
      if (conflicts.length > 0 && !args.allowConflict) {
        throw new Error("APPOINTMENT_CONFLICT: El horario se superpone con otro turno");
      }
    }
    await ctx.db.patch(args.id, {
      startTime: args.startTime,
      endTime: args.endTime,
      updatedAt: Date.now(),
    });
    await releaseSlotForAppointment(ctx, userId, args.id);
    if (row.isPsychiatrist && row.status !== "cancelled") {
      await claimAvailableSlotForAppointment(
        ctx,
        userId,
        args.id,
        args.startTime,
        args.endTime,
      );
    }
    const activeReminders = await ctx.db
      .query("reminders")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("active", true),
      )
      .filter((q) => q.eq(q.field("appointmentId"), args.id))
      .collect();
    if (isTerminalAppointmentStatus(row.status)) {
      for (const reminder of activeReminders) {
        await ctx.db.patch(reminder._id, { active: false, done: true });
      }
      if (row.reminderEnabled) {
        await ctx.db.patch(args.id, { reminderEnabled: false });
      }
    } else if (row.reminderEnabled) {
      for (const reminder of activeReminders) {
        await ctx.db.patch(reminder._id, {
          dueAt: rescheduledReminderDueAt(
            reminder.dueAt,
            row.startTime,
            args.startTime,
          ),
        });
      }
    }
  },
});
