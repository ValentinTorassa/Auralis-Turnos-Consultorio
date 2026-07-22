import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib";
import { appointmentTypeRules } from "./appointmentTypeDefaults";

const TERMINAL_APPOINTMENT_STATUSES = new Set([
  "cancelled",
  "no_show",
  "completed",
]);

export function appointmentPatientMessage(
  patientName: string,
  startTime: number,
): string {
  const date = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(startTime));
  const time = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(startTime));
  return `Hola ${patientName}, te recuerdo tu turno del ${date} a las ${time}. Por favor confirmame si podés asistir.`;
}

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

        if (r.patientId && (!patient || patient.userId !== userId)) return null;
        if (
          r.appointmentId &&
          (!appointment ||
            appointment.userId !== userId ||
            appointment.patientId !== r.patientId ||
            !appointment.reminderEnabled ||
            TERMINAL_APPOINTMENT_STATUSES.has(appointment.status))
        ) {
          return null;
        }

        const patientMessage =
          appointment && patient
            ? appointmentPatientMessage(patient.fullName, appointment.startTime)
            : patient
              ? `Hola ${patient.fullName}, ¿cómo estás? Te escribo por una consulta pendiente.`
              : r.message;
        return { ...r, patient, appointment, patientMessage };
      }),
    );
    return withRefs
      .filter((row) => row !== null)
      .sort((a, b) => a.dueAt - b.dueAt);
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

    const appointment = args.appointmentId
      ? await ctx.db.get(args.appointmentId)
      : null;
    if (
      args.appointmentId &&
      (!appointment || appointment.userId !== userId)
    ) {
      throw new Error("Turno no encontrado");
    }
    if (
      appointment &&
      TERMINAL_APPOINTMENT_STATUSES.has(appointment.status)
    ) {
      throw new Error("No se puede recordar un turno finalizado");
    }
    if (
      appointment &&
      args.patientId !== undefined &&
      appointment.patientId !== args.patientId
    ) {
      throw new Error("El paciente no corresponde al turno");
    }
    if (appointment) {
      const type = await ctx.db.get(appointment.typeId);
      if (!type || type.userId !== userId) throw new Error("Tipo inválido");
      if (!appointmentTypeRules(type).supportsReminder)
        throw new Error("Este tipo de actividad no admite recordatorios");
    }

    const patientId = appointment?.patientId ?? args.patientId;
    if (patientId) {
      const patient = await ctx.db.get(patientId);
      if (!patient || patient.userId !== userId)
        throw new Error("Paciente no encontrado");
    }

    const id = await ctx.db.insert("reminders", {
      userId,
      patientId,
      appointmentId: args.appointmentId,
      message,
      dueAt: args.dueAt,
      active: true,
      done: false,
      createdAt: Date.now(),
    });
    if (appointment) {
      await ctx.db.patch(appointment._id, { reminderEnabled: true });
    }
    return id;
  },
});

export const markDone = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Recordatorio no encontrado");
    await ctx.db.patch(args.id, { done: true, active: false });
    if (row.appointmentId) {
      const appointment = await ctx.db.get(row.appointmentId);
      if (appointment?.userId === userId) {
        const duplicates = await ctx.db
          .query("reminders")
          .withIndex("by_user_active", (q) =>
            q.eq("userId", userId).eq("active", true),
          )
          .filter((q) => q.eq(q.field("appointmentId"), row.appointmentId))
          .collect();
        for (const duplicate of duplicates) {
          await ctx.db.patch(duplicate._id, { done: true, active: false });
        }
        await ctx.db.patch(appointment._id, { reminderEnabled: false });
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Recordatorio no encontrado");
    if (row.appointmentId) {
      const appointment = await ctx.db.get(row.appointmentId);
      if (appointment?.userId === userId) {
        const linked = await ctx.db
          .query("reminders")
          .withIndex("by_user_active", (q) =>
            q.eq("userId", userId).eq("active", true),
          )
          .filter((q) => q.eq(q.field("appointmentId"), row.appointmentId))
          .collect();
        for (const reminder of linked) {
          if (reminder._id !== row._id) {
            await ctx.db.patch(reminder._id, { done: true, active: false });
          }
        }
        await ctx.db.patch(appointment._id, { reminderEnabled: false });
      }
    }
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
    if (TERMINAL_APPOINTMENT_STATUSES.has(appt.status))
      throw new Error("No se puede recordar un turno finalizado");
    const type = await ctx.db.get(appt.typeId);
    if (!type || type.userId !== userId) throw new Error("Tipo inválido");
    if (!appointmentTypeRules(type).supportsReminder)
      throw new Error("Este tipo de actividad no admite recordatorios");
    if (args.hoursBefore < 0)
      throw new Error("Las horas de anticipación no pueden ser negativas");
    const patient = appt.patientId ? await ctx.db.get(appt.patientId) : null;
    if (appt.patientId && (!patient || patient.userId !== userId))
      throw new Error("Paciente no encontrado");
    const existing = await ctx.db
      .query("reminders")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("active", true))
      .filter((q) => q.eq(q.field("appointmentId"), args.appointmentId))
      .first();
    const dueAt = appt.startTime - args.hoursBefore * 60 * 60 * 1000;
    const name = patient?.fullName ?? "paciente";
    const message =
      args.message?.trim() ||
      `Avisar a ${name} sobre el turno (recordatorio de asistencia).`;
    await ctx.db.patch(args.appointmentId, { reminderEnabled: true });
    if (existing) {
      await ctx.db.patch(existing._id, {
        patientId: appt.patientId,
        dueAt,
        active: true,
        done: false,
        ...(args.message?.trim() ? { message } : {}),
      });
      return existing._id;
    }
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
