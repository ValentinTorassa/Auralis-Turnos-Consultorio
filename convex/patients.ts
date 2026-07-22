import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isValidDateKey, requireUserId } from "./lib";

export function normalizePatientSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isAppointmentDebt(
  status: string,
  paymentStatus: string,
): boolean {
  return (
    status === "completed" &&
    (paymentStatus === "unpaid" || paymentStatus === "owes")
  );
}

function phoneDigits(value: string | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

function validatePatientFields(args: {
  fullName?: string;
  phone?: string;
  birthDate?: string;
  careType?: string;
  adminNotes?: string;
}) {
  if (args.fullName !== undefined) {
    const name = args.fullName.trim();
    if (!name) throw new Error("Nombre requerido");
    if (name.length > 200) throw new Error("El nombre es demasiado largo");
  }
  if (args.phone !== undefined && args.phone.trim().length > 50)
    throw new Error("El teléfono es demasiado largo");
  if (
    args.birthDate &&
    !isValidDateKey(args.birthDate)
  ) {
    throw new Error("Fecha de nacimiento inválida");
  }
  if (args.careType !== undefined) {
    const careType = args.careType.trim();
    if (!careType) throw new Error("Tipo de atención requerido");
    if (careType.length > 100) throw new Error("Tipo de atención demasiado largo");
  }
  if (args.adminNotes !== undefined && args.adminNotes.trim().length > 4000)
    throw new Error("Las observaciones son demasiado largas");
}

export const search = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const term = normalizePatientSearch(args.q);
    const digits = phoneDigits(args.q);
    if (term.length < 1) return [];
    const all = await ctx.db
      .query("patients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return all
      .filter(
        (p) =>
          !p.archivedAt &&
          (normalizePatientSearch(p.fullName).includes(term) ||
            (digits.length > 0 && phoneDigits(p.phone).includes(digits))),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"))
      .slice(0, 20);
  },
});

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const all = await ctx.db
      .query("patients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return all
      .filter((patient) => args.includeArchived || !patient.archivedAt)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
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
    const visibleAppointments = appointments.filter((a) => !a.deletedAt);

    const sorted = visibleAppointments.sort((a, b) => b.startTime - a.startTime);
    const now = Date.now();
    const last10 = sorted.slice(0, 10);
    const cancelledInLast10 = last10.filter(
      (a) => a.status === "cancelled" || a.status === "no_show",
    ).length;
    const unpaidCount = visibleAppointments.filter((a) =>
      isAppointmentDebt(a.status, a.paymentStatus),
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
        total: visibleAppointments.length,
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
    const visibleAppointments = appointments.filter((a) => !a.deletedAt);

    const sorted = visibleAppointments.sort((a, b) => b.startTime - a.startTime);
    const last10 = sorted.slice(0, 10);
    const cancelled = last10.filter(
      (a) => a.status === "cancelled" || a.status === "no_show",
    ).length;
    const unpaid = visibleAppointments.filter((a) =>
      isAppointmentDebt(a.status, a.paymentStatus),
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

export const duplicateCandidates = query({
  args: { fullName: v.string(), phone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = normalizePatientSearch(args.fullName);
    const phone = phoneDigits(args.phone);
    if (!name && !phone) return [];
    const all = await ctx.db
      .query("patients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return all
      .filter((patient) => {
        if (patient.archivedAt) return false;
        const sameName = name.length > 2 && normalizePatientSearch(patient.fullName) === name;
        const existingPhone = phoneDigits(patient.phone);
        const samePhone =
          phone.length >= 8 &&
          existingPhone.length >= 8 &&
          existingPhone.slice(-8) === phone.slice(-8);
        return sameName || samePhone;
      })
      .slice(0, 5);
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
    validatePatientFields(args);
    const fullName = args.fullName.trim();
    return await ctx.db.insert("patients", {
      userId,
      fullName,
      fullNameLower: normalizePatientSearch(fullName),
      phone: args.phone?.trim() || undefined,
      birthDate: args.birthDate || undefined,
      careType: args.careType.trim(),
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
    validatePatientFields(args);
    const patch: Record<string, string | undefined> = {};
    if (args.fullName !== undefined) {
      const fullName = args.fullName.trim();
      patch.fullName = fullName;
      patch.fullNameLower = normalizePatientSearch(fullName);
    }
    if (args.phone !== undefined) patch.phone = args.phone.trim() || undefined;
    if (args.birthDate !== undefined) patch.birthDate = args.birthDate || undefined;
    if (args.careType !== undefined) patch.careType = args.careType.trim();
    if (args.adminNotes !== undefined)
      patch.adminNotes = args.adminNotes.trim() || undefined;
    await ctx.db.patch(args.id, patch);
  },
});

export const archive = mutation({
  args: { id: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Paciente no encontrado");
    await ctx.db.patch(args.id, { archivedAt: row.archivedAt ?? Date.now() });
  },
});

export const reactivate = mutation({
  args: { id: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Paciente no encontrado");
    await ctx.db.patch(args.id, { archivedAt: undefined });
  },
});
