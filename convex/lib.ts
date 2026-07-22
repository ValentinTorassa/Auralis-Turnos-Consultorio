import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function requireUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("No autenticado");
  }
  return userId;
}

export function dayKey(
  ms: number,
  timeZone = "America/Argentina/Buenos_Aires",
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export function isValidDateKey(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(`${dateStr}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === dateStr;
}

export function startOfDayMs(dateStr: string): number {
  if (!isValidDateKey(dateStr)) throw new Error("Fecha inválida");
  // dateStr YYYY-MM-DD interpreted as Argentina midnight roughly via UTC-3
  return new Date(`${dateStr}T00:00:00-03:00`).getTime();
}

export function endOfDayMs(dateStr: string): number {
  if (!isValidDateKey(dateStr)) throw new Error("Fecha inválida");
  return new Date(`${dateStr}T23:59:59.999-03:00`).getTime();
}

export function thirdFridayOfMonth(year: number, monthIndex: number): Date {
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    throw new Error("Mes inválido");
  }
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(Date.UTC(year, monthIndex, day, 12));
    if (d.getUTCMonth() !== monthIndex) break;
    if (d.getUTCDay() === 5) {
      count++;
      if (count === 3) return d;
    }
  }
  throw new Error("No hay tercer viernes");
}

export const DEFAULT_TYPES = [
  {
    code: "consultorio_psicologico",
    name: "Consultorio psicológico",
    color: "#3B82F6",
    isPsychiatrist: false,
    sortOrder: 0,
    requiresPatient: true,
    tracksPayment: true,
    supportsReminder: true,
    defaultDurationMin: 50,
  },
  {
    code: "pericia_consultorio",
    name: "Pericia consultorio",
    color: "#8B5CF6",
    isPsychiatrist: false,
    sortOrder: 1,
    requiresPatient: true,
    tracksPayment: true,
    supportsReminder: true,
    defaultDurationMin: 50,
  },
  {
    code: "pericia_rosario",
    name: "Pericia Rosario",
    color: "#14B8A6",
    isPsychiatrist: false,
    sortOrder: 2,
    requiresPatient: true,
    tracksPayment: true,
    supportsReminder: true,
    defaultDurationMin: 50,
  },
  {
    code: "pericia_rafaela",
    name: "Pericia Rafaela",
    color: "#22C55E",
    isPsychiatrist: false,
    sortOrder: 3,
    requiresPatient: true,
    tracksPayment: true,
    supportsReminder: true,
    defaultDurationMin: 50,
  },
  {
    code: "otro_laboral",
    name: "Otro laboral",
    color: "#64748B",
    isPsychiatrist: false,
    sortOrder: 4,
    requiresPatient: false,
    tracksPayment: false,
    supportsReminder: false,
    defaultDurationMin: 60,
  },
  {
    code: "psiquiatria",
    name: "Psiquiatría",
    color: "#F59E0B",
    isPsychiatrist: true,
    sortOrder: 5,
    requiresPatient: true,
    tracksPayment: true,
    supportsReminder: true,
    defaultDurationMin: 30,
  },
  {
    code: "armas_clu",
    name: "Armas / CLU",
    color: "#B45309",
    isPsychiatrist: false,
    sortOrder: 6,
    requiresPatient: true,
    tracksPayment: true,
    supportsReminder: true,
    defaultDurationMin: 50,
  },
  {
    code: "curso_capacitacion",
    name: "Curso / capacitación",
    color: "#7C3AED",
    isPsychiatrist: false,
    sortOrder: 7,
    requiresPatient: false,
    tracksPayment: false,
    supportsReminder: false,
    defaultDurationMin: 225,
  },
] as const;
