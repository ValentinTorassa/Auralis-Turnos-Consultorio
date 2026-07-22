import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib";
import {
  assertPsychiatristSlotAssignable,
  intervalsOverlap,
  isLegacyPsychiatristPlaceholder,
  reconcilePsychiatristMonths,
} from "./psychiatristModel";

const DEFAULT_MONTHS_AHEAD = 6;

export const ensureMonths = mutation({
  args: { monthsAhead: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return reconcilePsychiatristMonths(
      ctx,
      userId,
      settings?.psychiatristSlotCount ?? 6,
      settings?.psychiatristSlotDurationMin ?? 30,
      args.monthsAhead ?? DEFAULT_MONTHS_AHEAD,
    );
  },
});

export const listUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const slots = await ctx.db
      .query("psychiatristSlots")
      .withIndex("by_user_start", (q) =>
        q.eq("userId", userId).gte("startTime", Date.now()),
      )
      .take(120);

    return Promise.all(
      slots.map(async (slot) => {
        const appointment = slot.appointmentId
          ? await ctx.db.get(slot.appointmentId)
          : null;
        const validAppointment =
          appointment &&
          appointment.userId === userId &&
          !appointment.deletedAt &&
          appointment.isPsychiatrist
            ? appointment
            : null;
        const patient = validAppointment?.patientId
          ? await ctx.db.get(validAppointment.patientId)
          : null;
        return {
          ...slot,
          appointment: validAppointment,
          patient: patient?.userId === userId ? patient : null,
        };
      }),
    );
  },
});

export const assignPatient = mutation({
  args: {
    slotId: v.id("psychiatristSlots"),
    patientId: v.id("patients"),
    typeId: v.id("appointmentTypes"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const slot = await ctx.db.get(args.slotId);
    if (!slot || slot.userId !== userId) throw new Error("Horario no válido");
    assertPsychiatristSlotAssignable(slot);
    if (slot.startTime < Date.now()) {
      throw new Error("No se puede asignar un horario pasado");
    }

    const [patient, type] = await Promise.all([
      ctx.db.get(args.patientId),
      ctx.db.get(args.typeId),
    ]);
    if (!patient || patient.userId !== userId || patient.archivedAt) {
      throw new Error("Paciente inválido o archivado");
    }
    if (!type || type.userId !== userId || !type.isPsychiatrist) {
      throw new Error("Tipo de psiquiatría inválido");
    }

    const overlapping = await ctx.db
      .query("appointments")
      .withIndex("by_user_start", (q) =>
        q.eq("userId", userId).lt("startTime", slot.endTime),
      )
      .filter((q) =>
        q.and(
          q.gt(q.field("endTime"), slot.startTime),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();
    if (
      overlapping.some(
        (appointment) =>
          appointment.status !== "cancelled" &&
          !isLegacyPsychiatristPlaceholder(appointment) &&
          intervalsOverlap(appointment, slot),
      )
    ) {
      throw new Error("El horario se superpone con otro turno");
    }

    const now = Date.now();
    const appointmentId = await ctx.db.insert("appointments", {
      userId,
      patientId: patient._id,
      typeId: type._id,
      title: patient.fullName,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: "confirmed",
      paymentStatus: "unpaid",
      isPsychiatrist: true,
      reminderEnabled: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(slot._id, {
      state: "assigned",
      appointmentId,
      updatedAt: now,
    });
    return appointmentId;
  },
});

export const reassignPatient = mutation({
  args: {
    slotId: v.id("psychiatristSlots"),
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const [slot, patient] = await Promise.all([
      ctx.db.get(args.slotId),
      ctx.db.get(args.patientId),
    ]);
    if (
      !slot ||
      slot.userId !== userId ||
      slot.state !== "assigned" ||
      !slot.appointmentId
    ) {
      throw new Error("Asignación no válida");
    }
    if (!patient || patient.userId !== userId || patient.archivedAt) {
      throw new Error("Paciente inválido o archivado");
    }
    const appointment = await ctx.db.get(slot.appointmentId);
    const type = appointment ? await ctx.db.get(appointment.typeId) : null;
    if (
      !appointment ||
      appointment.userId !== userId ||
      appointment.deletedAt ||
      !appointment.isPsychiatrist ||
      !type ||
      type.userId !== userId ||
      !type.isPsychiatrist
    ) {
      throw new Error("Turno de psiquiatría no encontrado");
    }
    await ctx.db.patch(appointment._id, {
      patientId: patient._id,
      title: patient.fullName,
      updatedAt: Date.now(),
    });
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_user_due", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("appointmentId"), appointment._id))
      .collect();
    for (const reminder of reminders) {
      await ctx.db.patch(reminder._id, {
        patientId: patient._id,
        message: `Enviar recordatorio de asistencia a ${patient.fullName}.`,
      });
    }
    return appointment._id;
  },
});

export const release = mutation({
  args: { slotId: v.id("psychiatristSlots") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const slot = await ctx.db.get(args.slotId);
    if (!slot || slot.userId !== userId || slot.state !== "assigned") {
      throw new Error("Asignación no válida");
    }
    const now = Date.now();
    if (slot.appointmentId) {
      const appointment = await ctx.db.get(slot.appointmentId);
      if (appointment && appointment.userId === userId && !appointment.deletedAt) {
        await ctx.db.patch(appointment._id, {
          deletedAt: now,
          reminderEnabled: false,
          updatedAt: now,
        });
        const reminders = await ctx.db
          .query("reminders")
          .withIndex("by_user_active", (q) =>
            q.eq("userId", userId).eq("active", true),
          )
          .filter((q) => q.eq(q.field("appointmentId"), appointment._id))
          .collect();
        for (const reminder of reminders) {
          await ctx.db.patch(reminder._id, { active: false, done: true });
        }
      }
    }
    await ctx.db.patch(slot._id, {
      state: "available",
      appointmentId: undefined,
      updatedAt: now,
    });
  },
});

export const block = mutation({
  args: { slotId: v.id("psychiatristSlots") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const slot = await ctx.db.get(args.slotId);
    if (!slot || slot.userId !== userId) throw new Error("Horario no válido");
    assertPsychiatristSlotAssignable(slot);
    await ctx.db.patch(slot._id, { state: "blocked", updatedAt: Date.now() });
  },
});

export const unblock = mutation({
  args: { slotId: v.id("psychiatristSlots") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const slot = await ctx.db.get(args.slotId);
    if (!slot || slot.userId !== userId || slot.state !== "blocked") {
      throw new Error("Horario bloqueado no válido");
    }
    await ctx.db.patch(slot._id, { state: "available", updatedAt: Date.now() });
  },
});
