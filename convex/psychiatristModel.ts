import { Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";
import { thirdFridayOfMonth } from "./lib";

export const MAX_PSYCHIATRIST_MONTHS_AHEAD = 12;
export const MAX_PSYCHIATRIST_SLOT_COUNT = 20;
export const MIN_PSYCHIATRIST_SLOT_DURATION_MIN = 5;
export const MAX_PSYCHIATRIST_SLOT_DURATION_MIN = 240;

const MIN_DATE_MS = Date.UTC(2000, 0, 1);
const MAX_DATE_MS = Date.UTC(2101, 0, 1);

export function validatePsychiatristGeneration(
  count: number,
  durationMin: number,
  monthsAhead: number,
) {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > MAX_PSYCHIATRIST_SLOT_COUNT
  ) {
    throw new Error(
      `La cantidad de turnos debe estar entre 1 y ${MAX_PSYCHIATRIST_SLOT_COUNT}`,
    );
  }
  if (
    !Number.isInteger(durationMin) ||
    durationMin < MIN_PSYCHIATRIST_SLOT_DURATION_MIN ||
    durationMin > MAX_PSYCHIATRIST_SLOT_DURATION_MIN ||
    count * durationMin > 24 * 60
  ) {
    throw new Error("La duración configurada debe ocupar como máximo 24 horas");
  }
  if (
    !Number.isInteger(monthsAhead) ||
    monthsAhead < 1 ||
    monthsAhead > MAX_PSYCHIATRIST_MONTHS_AHEAD
  ) {
    throw new Error(
      `La generación debe abarcar entre 1 y ${MAX_PSYCHIATRIST_MONTHS_AHEAD} meses`,
    );
  }
}

export function psychiatristMonthKey(ms: number): string {
  if (!Number.isSafeInteger(ms) || ms < MIN_DATE_MS || ms >= MAX_DATE_MS) {
    throw new Error("Fecha de slot inválida");
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(ms));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Fecha de slot inválida");
  return `${year}-${month}`;
}

export function psychiatristGenerationKey(monthKey: string, index: number) {
  if (!/^\d{4}-\d{2}$/.test(monthKey) || !Number.isInteger(index) || index < 0) {
    throw new Error("Clave de generación inválida");
  }
  return `third-friday:${monthKey}:${index}`;
}

export function psychiatristSlotTimes(
  year: number,
  monthIndex: number,
  count: number,
  durationMin: number,
): Array<{ startTime: number; endTime: number; generationKey: string; monthKey: string }> {
  validatePsychiatristGeneration(count, durationMin, 1);
  const friday = thirdFridayOfMonth(year, monthIndex);
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const dateKey = `${monthKey}-${String(friday.getUTCDate()).padStart(2, "0")}`;
  const base = new Date(`${dateKey}T15:00:00-03:00`).getTime();
  return Array.from({ length: count }, (_, index) => {
    const startTime = base + index * durationMin * 60_000;
    return {
      startTime,
      endTime: startTime + durationMin * 60_000,
      generationKey: psychiatristGenerationKey(monthKey, index),
      monthKey,
    };
  });
}

export function intervalsOverlap(
  left: { startTime: number; endTime: number },
  right: { startTime: number; endTime: number },
) {
  return left.startTime < right.endTime && left.endTime > right.startTime;
}

export function assertPsychiatristSlotAssignable(slot: {
  state: string;
  appointmentId?: unknown;
}) {
  if (slot.state !== "available" || slot.appointmentId !== undefined) {
    throw new Error("El horario ya no está disponible");
  }
}

export function isLegacyPsychiatristPlaceholder(appointment: {
  patientId?: unknown;
  title?: string;
  isPsychiatrist: boolean;
  paymentStatus: string;
  reminderEnabled: boolean;
  deletedAt?: number;
}) {
  return (
    appointment.isPsychiatrist &&
    appointment.patientId === undefined &&
    appointment.deletedAt === undefined &&
    appointment.title === "Turno psiquiatra (libre)" &&
    appointment.paymentStatus === "na" &&
    !appointment.reminderEnabled
  );
}

function argentinaYearMonth(ms: number) {
  const [year, month] = psychiatristMonthKey(ms).split("-").map(Number);
  return { year, monthIndex: month - 1 };
}

export async function reconcilePsychiatristMonths(
  ctx: MutationCtx,
  userId: Id<"users">,
  count: number,
  durationMin: number,
  monthsAhead: number,
  nowMs = Date.now(),
) {
  validatePsychiatristGeneration(count, durationMin, monthsAhead);
  const current = argentinaYearMonth(nowMs);
  const totals = { created: 0, updated: 0, removed: 0, skipped: 0 };

  for (let offset = 0; offset < monthsAhead; offset++) {
    const monthDate = new Date(Date.UTC(current.year, current.monthIndex + offset, 1));
    const desired = psychiatristSlotTimes(
      monthDate.getUTCFullYear(),
      monthDate.getUTCMonth(),
      count,
      durationMin,
    );
    const monthKey = desired[0].monthKey;
    const existing = await ctx.db
      .query("psychiatristSlots")
      .withIndex("by_user_month", (q) =>
        q.eq("userId", userId).eq("monthKey", monthKey),
      )
      .collect();
    const mutable = existing.filter(
      (slot) => slot.state === "available" && slot.startTime >= nowMs,
    );
    const occupied: Array<{ startTime: number; endTime: number }> = existing.filter(
      (slot) => !mutable.some((candidate) => candidate._id === slot._id),
    );
    const firstStart = desired[0].startTime;
    const lastEnd = desired.at(-1)!.endTime;
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_user_start", (q) =>
        q.eq("userId", userId).lt("startTime", lastEnd),
      )
      .filter((q) =>
        q.and(
          q.gt(q.field("endTime"), firstStart),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();
    occupied.push(
      ...appointments.filter(
        (appointment) =>
          appointment.status !== "cancelled" &&
          !isLegacyPsychiatristPlaceholder(appointment),
      ),
    );

    const retained = new Set<Id<"psychiatristSlots">>();
    for (const candidate of desired) {
      if (candidate.startTime < nowMs) {
        totals.skipped++;
        continue;
      }
      const currentSlot = mutable.find(
        (slot) =>
          slot.generationKey === candidate.generationKey && !retained.has(slot._id),
      );
      if (occupied.some((interval) => intervalsOverlap(interval, candidate))) {
        totals.skipped++;
        continue;
      }
      if (currentSlot) {
        retained.add(currentSlot._id);
        occupied.push(candidate);
        if (
          currentSlot.startTime !== candidate.startTime ||
          currentSlot.endTime !== candidate.endTime
        ) {
          await ctx.db.patch(currentSlot._id, {
            startTime: candidate.startTime,
            endTime: candidate.endTime,
            updatedAt: nowMs,
          });
          totals.updated++;
        }
        continue;
      }
      await ctx.db.insert("psychiatristSlots", {
        userId,
        ...candidate,
        state: "available",
        createdAt: nowMs,
        updatedAt: nowMs,
      });
      occupied.push(candidate);
      totals.created++;
    }
    for (const slot of mutable) {
      if (retained.has(slot._id)) continue;
      await ctx.db.delete(slot._id);
      totals.removed++;
    }
  }
  return totals;
}

export async function releaseSlotForAppointment(
  ctx: MutationCtx,
  userId: Id<"users">,
  appointmentId: Id<"appointments">,
) {
  const slots = await ctx.db
    .query("psychiatristSlots")
    .withIndex("by_user_appointment", (q) =>
      q.eq("userId", userId).eq("appointmentId", appointmentId),
    )
    .collect();
  const now = Date.now();
  for (const slot of slots) {
    if (slot.state !== "assigned") continue;
    await ctx.db.patch(slot._id, {
      state: "available",
      appointmentId: undefined,
      updatedAt: now,
    });
  }
  return slots.length;
}

export async function claimAvailableSlotForAppointment(
  ctx: MutationCtx,
  userId: Id<"users">,
  appointmentId: Id<"appointments">,
  startTime: number,
  endTime: number,
) {
  const linked = await ctx.db
    .query("psychiatristSlots")
    .withIndex("by_user_appointment", (q) =>
      q.eq("userId", userId).eq("appointmentId", appointmentId),
    )
    .first();
  if (linked) return linked._id;
  const exactSlots = await ctx.db
    .query("psychiatristSlots")
    .withIndex("by_user_start", (q) =>
      q.eq("userId", userId).eq("startTime", startTime),
    )
    .collect();
  const available = exactSlots.find(
    (slot) =>
      slot.endTime === endTime &&
      slot.state === "available" &&
      slot.appointmentId === undefined,
  );
  if (!available) return null;
  await ctx.db.patch(available._id, {
    state: "assigned",
    appointmentId,
    updatedAt: Date.now(),
  });
  return available._id;
}
