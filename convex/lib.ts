import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("No autenticado");
  }
  return userId;
}

export function dayKey(ms: number, timeZone = "America/Argentina/Buenos_Aires"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export function startOfDayMs(dateStr: string): number {
  // dateStr YYYY-MM-DD interpreted as Argentina midnight roughly via UTC-3
  return new Date(`${dateStr}T00:00:00-03:00`).getTime();
}

export function endOfDayMs(dateStr: string): number {
  return new Date(`${dateStr}T23:59:59.999-03:00`).getTime();
}

export function thirdFridayOfMonth(year: number, monthIndex: number): Date {
  // monthIndex 0-based
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, monthIndex, day);
    if (d.getMonth() !== monthIndex) break;
    if (d.getDay() === 5) {
      count++;
      if (count === 3) return d;
    }
  }
  throw new Error("No hay tercer viernes");
}

export const DEFAULT_TYPES = [
  { name: "Consultorio psicológico", color: "#3B82F6", isPsychiatrist: false, sortOrder: 0 },
  { name: "Pericia consultorio", color: "#8B5CF6", isPsychiatrist: false, sortOrder: 1 },
  { name: "Pericia Rosario", color: "#14B8A6", isPsychiatrist: false, sortOrder: 2 },
  { name: "Pericia Rafaela", color: "#22C55E", isPsychiatrist: false, sortOrder: 3 },
  { name: "Otro laboral", color: "#64748B", isPsychiatrist: false, sortOrder: 4 },
  { name: "Psiquiatría", color: "#F59E0B", isPsychiatrist: true, sortOrder: 5 },
] as const;
