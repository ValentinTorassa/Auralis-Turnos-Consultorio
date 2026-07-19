import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId, endOfDayMs, startOfDayMs } from "./lib";

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

async function enrich(ctx: { db: any }, userId: any, rows: any[]) {
  const types = await ctx.db
    .query("appointmentTypes")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  const typeMap = Object.fromEntries(types.map((t: any) => [t._id, t]));
  const patientIds = [
    ...new Set(rows.map((r) => r.patientId).filter(Boolean)),
  ] as string[];
  const patients = await Promise.all(
    patientIds.map((id) => ctx.db.get(id as any)),
  );
  const patientMap = Object.fromEntries(
    patients.filter(Boolean).map((p: any) => [p._id, p]),
  );
  return rows.map((r) => ({
    ...r,
    type: typeMap[r.typeId] ?? null,
    patient: r.patientId ? (patientMap[r.patientId] ?? null) : null,
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
    if (args.patientId) {
      const p = await ctx.db.get(args.patientId);
      if (!p || p.userId !== userId) throw new Error("Paciente inválido");
    }
    if (args.endTime <= args.startTime) throw new Error("Horario inválido");
    const now = Date.now();
    return await ctx.db.insert("appointments", {
      userId,
      patientId: args.patientId,
      typeId: args.typeId,
      title: args.title?.trim() || undefined,
      startTime: args.startTime,
      endTime: args.endTime,
      status: "confirmed",
      paymentStatus: args.paymentStatus ?? "unpaid",
      paymentMethod: args.paymentMethod,
      paymentNotes: args.paymentNotes,
      notes: args.notes?.trim() || undefined,
      isPsychiatrist: type.isPsychiatrist,
      reminderEnabled: args.reminderEnabled ?? false,
      createdAt: now,
      updatedAt: now,
    });
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
    if (args.patientId !== undefined) {
      patch.patientId = args.patientId === null ? undefined : args.patientId;
    }
    if (args.typeId !== undefined) {
      const type = await ctx.db.get(args.typeId);
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
    if (end <= start) throw new Error("Horario inválido");

    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Turno no encontrado");
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
    if (args.endTime <= args.startTime) throw new Error("Horario inválido");
    await ctx.db.patch(args.id, {
      startTime: args.startTime,
      endTime: args.endTime,
      updatedAt: Date.now(),
    });
  },
});
