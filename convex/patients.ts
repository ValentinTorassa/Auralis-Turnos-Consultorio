import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib";

export const search = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const term = args.q.trim().toLowerCase();
    if (term.length < 1) return [];
    const all = await ctx.db
      .query("patients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return all
      .filter((p) => p.fullNameLower.includes(term))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"))
      .slice(0, 20);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const all = await ctx.db
      .query("patients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return all.sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
  },
});

export const get = query({
  args: { id: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const patient = await ctx.db.get(args.id);
    if (!patient || patient.userId !== userId) return null;

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.id))
      .collect();

    const sorted = appointments.sort((a, b) => b.startTime - a.startTime);
    const now = Date.now();
    const last10 = sorted.slice(0, 10);
    const cancelledInLast10 = last10.filter(
      (a) => a.status === "cancelled" || a.status === "no_show",
    ).length;
    const unpaidCount = appointments.filter(
      (a) =>
        a.status !== "cancelled" &&
        (a.paymentStatus === "unpaid" || a.paymentStatus === "owes"),
    ).length;
    const next = sorted
      .filter((a) => a.startTime >= now && a.status === "confirmed")
      .sort((a, b) => a.startTime - b.startTime)[0];

    const types = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const typeMap = Object.fromEntries(types.map((t) => [t._id, t]));

    return {
      patient,
      appointments: sorted.map((a) => ({
        ...a,
        type: typeMap[a.typeId] ?? null,
      })),
      stats: {
        total: appointments.length,
        cancelledInLast10,
        last10Count: last10.length,
        unpaidCount,
        cancellationRate:
          last10.length > 0 ? cancelledInLast10 / last10.length : 0,
      },
      nextAppointment: next
        ? { ...next, type: typeMap[next.typeId] ?? null }
        : null,
    };
  },
});

export const warnings = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.userId !== userId) return [];

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();

    const sorted = appointments.sort((a, b) => b.startTime - a.startTime);
    const last10 = sorted.slice(0, 10);
    const cancelled = last10.filter(
      (a) => a.status === "cancelled" || a.status === "no_show",
    ).length;
    const unpaid = appointments.filter(
      (a) =>
        a.status !== "cancelled" &&
        (a.paymentStatus === "unpaid" || a.paymentStatus === "owes"),
    ).length;

    const warnings: string[] = [];
    if (cancelled >= 2 && last10.length >= 3) {
      warnings.push(
        `Este paciente canceló o faltó ${cancelled} de los últimos ${last10.length} turnos.`,
      );
    }
    if (unpaid > 0) {
      warnings.push(
        unpaid === 1
          ? "Tiene 1 consulta pendiente de pago."
          : `Tiene ${unpaid} consultas pendientes de pago.`,
      );
    }
    return warnings;
  },
});

export const create = mutation({
  args: {
    fullName: v.string(),
    phone: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    careType: v.string(),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const fullName = args.fullName.trim();
    if (!fullName) throw new Error("Nombre requerido");
    return await ctx.db.insert("patients", {
      userId,
      fullName,
      fullNameLower: fullName.toLowerCase(),
      phone: args.phone?.trim() || undefined,
      birthDate: args.birthDate || undefined,
      careType: args.careType,
      adminNotes: args.adminNotes?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("patients"),
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    careType: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Paciente no encontrado");
    const patch: Record<string, string | undefined> = {};
    if (args.fullName !== undefined) {
      const fullName = args.fullName.trim();
      patch.fullName = fullName;
      patch.fullNameLower = fullName.toLowerCase();
    }
    if (args.phone !== undefined) patch.phone = args.phone.trim() || undefined;
    if (args.birthDate !== undefined) patch.birthDate = args.birthDate || undefined;
    if (args.careType !== undefined) patch.careType = args.careType;
    if (args.adminNotes !== undefined)
      patch.adminNotes = args.adminNotes.trim() || undefined;
    await ctx.db.patch(args.id, patch);
  },
});
