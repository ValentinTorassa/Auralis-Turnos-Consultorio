import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId, thirdFridayOfMonth } from "./lib";

function slotTimes(
  year: number,
  monthIndex: number,
  count: number,
  durationMin: number,
): { start: number; end: number }[] {
  const friday = thirdFridayOfMonth(year, monthIndex);
  // 15:00 Argentina (UTC-3)
  const y = friday.getFullYear();
  const m = String(friday.getMonth() + 1).padStart(2, "0");
  const d = String(friday.getDate()).padStart(2, "0");
  const base = new Date(`${y}-${m}-${d}T15:00:00-03:00`).getTime();
  const slots: { start: number; end: number }[] = [];
  for (let i = 0; i < count; i++) {
    const start = base + i * durationMin * 60 * 1000;
    const end = start + durationMin * 60 * 1000;
    slots.push({ start, end });
  }
  return slots;
}

export const ensureMonths = mutation({
  args: { monthsAhead: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const count = settings?.psychiatristSlotCount ?? 6;
    const duration = settings?.psychiatristSlotDurationMin ?? 30;
    const monthsAhead = args.monthsAhead ?? 6;

    const types = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    let psyType = types.find((t) => t.isPsychiatrist);
    if (!psyType) {
      const id = await ctx.db.insert("appointmentTypes", {
        userId,
        name: "Psiquiatría",
        color: "#F59E0B",
        isPsychiatrist: true,
        sortOrder: 99,
        code: "psiquiatria",
        requiresPatient: true,
        tracksPayment: true,
        supportsReminder: true,
        defaultDurationMin: 30,
        isSystemType: true,
      });
      psyType = (await ctx.db.get(id))!;
    }

    const now = new Date();
    let created = 0;
    for (let i = 0; i < monthsAhead; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const slots = slotTimes(year, monthIndex, count, duration);
      for (const slot of slots) {
        // skip past slots
        if (slot.end < Date.now()) continue;
        const existing = await ctx.db
          .query("appointments")
          .withIndex("by_user_psychiatrist", (q) =>
            q
              .eq("userId", userId)
              .eq("isPsychiatrist", true)
              .eq("startTime", slot.start),
          )
          .first();
        if (existing) continue;
        await ctx.db.insert("appointments", {
          userId,
          typeId: psyType._id,
          title: "Turno psiquiatra (libre)",
          startTime: slot.start,
          endTime: slot.end,
          status: "confirmed",
          paymentStatus: "na",
          isPsychiatrist: true,
          reminderEnabled: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        created++;
      }
    }
    return { created };
  },
});

export const listUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_user_psychiatrist", (q) =>
        q.eq("userId", userId).eq("isPsychiatrist", true).gte("startTime", now),
      )
      .collect();
    const sorted = rows
      .filter((r) => r.status !== "cancelled")
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 80);

    const withPatients = await Promise.all(
      sorted.map(async (r) => {
        const patient = r.patientId ? await ctx.db.get(r.patientId) : null;
        return { ...r, patient };
      }),
    );
    return withPatients;
  },
});

export const assignPatient = mutation({
  args: {
    appointmentId: v.id("appointments"),
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const appt = await ctx.db.get(args.appointmentId);
    if (!appt || appt.userId !== userId || !appt.isPsychiatrist) {
      throw new Error("Turno no válido");
    }
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.userId !== userId) throw new Error("Paciente inválido");
    await ctx.db.patch(args.appointmentId, {
      patientId: args.patientId,
      title: patient.fullName,
      updatedAt: Date.now(),
    });
  },
});
