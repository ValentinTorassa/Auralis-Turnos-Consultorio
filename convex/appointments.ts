import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireUserId, endOfDayMs, startOfDayMs } from "./lib";
import { appointmentTypeRules } from "./appointmentTypeDefaults";

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
    patients.flatMap((p) => (p ? [[p._id, p] as const] : [])),
  );
  return rows.map((r) => ({
    ...r,
    type: typeMap.get(r.typeId) ?? null,
    patient: r.patientId ? (patientMap.get(r.patientId) ?? null) : null,
  }));
}

export const byRange = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
    psychiatristOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_user_start", (q) =>
        q.eq("userId", userId).gte("startTime", args.startMs),
      )
      .collect();
    const filtered = rows.filter((r) => {
      if (r.startTime > args.endMs) return false;
      if (args.psychiatristOnly && !r.isPsychiatrist) return false;
      return true;
    });
    return enrich(ctx, userId, filtered);
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
    const end = endOfDayMs(args.date);
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_user_start", (q) =>
        q.eq("userId", userId).gte("startTime", start),
      )
      .collect();
    const filtered = rows.filter((r) => {
      if (r.startTime > end) return false;
      if (args.psychiatristOnly && !r.isPsychiatrist) return false;
      return true;
    });
    const enriched = await enrich(ctx, userId, filtered);
    return enriched.sort((a, b) => a.startTime - b.startTime);
  },
});

export const todaySummary = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const start = startOfDayMs(args.date);
    const end = endOfDayMs(args.date);
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_user_start", (q) =>
        q.eq("userId", userId).gte("startTime", start),
      )
      .collect();
    const day = rows.filter(
      (r) => r.startTime <= end && r.status !== "cancelled",
    );
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
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const type = await ctx.db.get(args.typeId);
    if (!type || type.userId !== userId) throw new Error("Tipo inválido");
    const rules = appointmentTypeRules(type);
    if (args.patientId) {
      const p = await ctx.db.get(args.patientId);
      if (!p || p.userId !== userId) throw new Error("Paciente inválido");
    }
    const title = args.title?.trim() || undefined;
    if (rules.requiresPatient && !args.patientId)
      throw new Error("Este tipo de actividad requiere un paciente");
    if (!rules.requiresPatient && !title)
      throw new Error("Ingresá un título para la actividad sin paciente");
    if (args.endTime <= args.startTime)
      throw new Error("El horario de fin debe ser posterior al de inicio");
    const now = Date.now();
    const reminderEnabled = rules.supportsReminder
      ? (args.reminderEnabled ?? false)
      : false;
    const id = await ctx.db.insert("appointments", {
      userId,
      patientId: args.patientId,
      typeId: args.typeId,
      title,
      startTime: args.startTime,
      endTime: args.endTime,
      status: "confirmed",
      paymentStatus: rules.tracksPayment
        ? (args.paymentStatus ?? "unpaid")
        : "na",
      paymentMethod: rules.tracksPayment ? args.paymentMethod : undefined,
      paymentNotes: rules.tracksPayment ? args.paymentNotes : undefined,
      notes: args.notes?.trim() || undefined,
      isPsychiatrist: type.isPsychiatrist,
      reminderEnabled,
      createdAt: now,
      updatedAt: now,
    });
    if (reminderEnabled) {
      const patient = args.patientId ? await ctx.db.get(args.patientId) : null;
      await ctx.db.insert("reminders", {
        userId,
        patientId: args.patientId,
        appointmentId: id,
        message: `Avisar a ${patient?.fullName ?? title ?? "paciente"} sobre el turno (recordatorio de asistencia).`,
        dueAt: args.startTime - 24 * 60 * 60 * 1000,
        active: true,
        done: false,
        createdAt: now,
      });
    }
    return id;
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
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Turno no encontrado");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    let type = await ctx.db.get(row.typeId);
    if (!type || type.userId !== userId) throw new Error("Tipo inválido");
    if (args.patientId !== undefined) {
      if (args.patientId !== null) {
        const patient = await ctx.db.get(args.patientId);
        if (!patient || patient.userId !== userId)
          throw new Error("Paciente inválido");
      }
      patch.patientId = args.patientId === null ? undefined : args.patientId;
    }
    if (args.typeId !== undefined) {
      type = await ctx.db.get(args.typeId);
      if (!type || type.userId !== userId) throw new Error("Tipo inválido");
      patch.typeId = args.typeId;
      patch.isPsychiatrist = type.isPsychiatrist;
    }
    if (args.title !== undefined) patch.title = args.title.trim() || undefined;
    if (args.startTime !== undefined) patch.startTime = args.startTime;
    if (args.endTime !== undefined) patch.endTime = args.endTime;
    if (args.status !== undefined) patch.status = args.status;
    if (args.paymentStatus !== undefined) patch.paymentStatus = args.paymentStatus;
    if (args.paymentMethod !== undefined) patch.paymentMethod = args.paymentMethod;
    if (args.paymentNotes !== undefined) patch.paymentNotes = args.paymentNotes;
    if (args.notes !== undefined) patch.notes = args.notes.trim() || undefined;
    if (args.reminderEnabled !== undefined)
      patch.reminderEnabled = args.reminderEnabled;

    const start = (patch.startTime as number | undefined) ?? row.startTime;
    const end = (patch.endTime as number | undefined) ?? row.endTime;
    if (end <= start)
      throw new Error("El horario de fin debe ser posterior al de inicio");

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
    const reminderEnabled = rules.supportsReminder
      ? (args.reminderEnabled ?? row.reminderEnabled)
      : false;
    if (!rules.supportsReminder) patch.reminderEnabled = false;

    patch.reminderEnabled = reminderEnabled;
    await ctx.db.patch(args.id, patch);

    const activeReminders = await ctx.db
      .query("reminders")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("active", true),
      )
      .filter((q) => q.eq(q.field("appointmentId"), args.id))
      .collect();
    if (reminderEnabled) {
      const patient = patientId ? await ctx.db.get(patientId) : null;
      const reminderPatch = {
        patientId,
        appointmentId: args.id,
        message: `Avisar a ${patient?.fullName ?? title ?? "paciente"} sobre el turno (recordatorio de asistencia).`,
        dueAt: start - 24 * 60 * 60 * 1000,
        active: true,
        done: false,
      };
      const [first, ...duplicates] = activeReminders;
      if (first) {
        await ctx.db.patch(first._id, reminderPatch);
      } else {
        await ctx.db.insert("reminders", {
          userId,
          ...reminderPatch,
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
    if (!row || row.userId !== userId) throw new Error("Turno no encontrado");
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
    await ctx.db.delete(args.id);
  },
});

export const move = mutation({
  args: {
    id: v.id("appointments"),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Turno no encontrado");
    if (args.endTime <= args.startTime)
      throw new Error("El horario de fin debe ser posterior al de inicio");
    await ctx.db.patch(args.id, {
      startTime: args.startTime,
      endTime: args.endTime,
      updatedAt: Date.now(),
    });
    if (row.reminderEnabled) {
      const activeReminders = await ctx.db
        .query("reminders")
        .withIndex("by_user_active", (q) =>
          q.eq("userId", userId).eq("active", true),
        )
        .filter((q) => q.eq(q.field("appointmentId"), args.id))
        .collect();
      for (const reminder of activeReminders) {
        await ctx.db.patch(reminder._id, {
          dueAt: args.startTime - 24 * 60 * 60 * 1000,
        });
      }
    }
  },
});
