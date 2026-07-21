import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib";
import { appointmentTypeRules } from "./appointmentTypeDefaults";

export const pending = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const end = now + 7 * 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("reminders")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("active", true))
      .collect();
    const filtered = rows.filter((r) => !r.done && r.dueAt <= end);
    const withRefs = await Promise.all(
      filtered.map(async (r) => {
        const patient = r.patientId ? await ctx.db.get(r.patientId) : null;
        const appointment = r.appointmentId
          ? await ctx.db.get(r.appointmentId)
          : null;
        return { ...r, patient, appointment };
      }),
    );
    return withRefs.sort((a, b) => a.dueAt - b.dueAt);
  },
});

export const create = mutation({
  args: {
    patientId: v.optional(v.id("patients")),
    appointmentId: v.optional(v.id("appointments")),
    message: v.string(),
    dueAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const message = args.message.trim();
    if (!message) throw new Error("Mensaje requerido");
    return await ctx.db.insert("reminders", {
      userId,
      patientId: args.patientId,
      appointmentId: args.appointmentId,
      message,
      dueAt: args.dueAt,
      active: true,
      done: false,
      createdAt: Date.now(),
    });
  },
});

export const markDone = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Recordatorio no encontrado");
    await ctx.db.patch(args.id, { done: true, active: false });
  },
});

export const remove = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Recordatorio no encontrado");
    await ctx.db.delete(args.id);
  },
});

export const fromAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    hoursBefore: v.number(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const appt = await ctx.db.get(args.appointmentId);
    if (!appt || appt.userId !== userId) throw new Error("Turno no encontrado");
    const type = await ctx.db.get(appt.typeId);
    if (!type || type.userId !== userId) throw new Error("Tipo inválido");
    if (!appointmentTypeRules(type).supportsReminder)
      throw new Error("Este tipo de actividad no admite recordatorios");
    const existing = await ctx.db
      .query("reminders")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("active", true))
      .filter((q) => q.eq(q.field("appointmentId"), args.appointmentId))
      .first();
    if (existing) return existing._id;
    const dueAt = appt.startTime - args.hoursBefore * 60 * 60 * 1000;
    const patient = appt.patientId ? await ctx.db.get(appt.patientId) : null;
    const name = patient?.fullName ?? "paciente";
    const message =
      args.message?.trim() ||
      `Avisar a ${name} sobre el turno (recordatorio de asistencia).`;
    await ctx.db.patch(args.appointmentId, { reminderEnabled: true });
    return await ctx.db.insert("reminders", {
      userId,
      patientId: appt.patientId,
      appointmentId: args.appointmentId,
      message,
      dueAt,
      active: true,
      done: false,
      createdAt: Date.now(),
    });
  },
});
