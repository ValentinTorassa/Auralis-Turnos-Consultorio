const BUENOS_AIRES_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function greeting(timestamp: number): string {
  if (timestamp === 0) return "Hoy";

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: BUENOS_AIRES_TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(new Date(timestamp)),
  );

  if (hour < 13) return "Buen día";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Cuántos días faltan, contando por día calendario y no por horas exactas. */
export function daysUntil(dueAt: number, now: number): number {
  const startOfDay = (ms: number) => {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };
  return Math.round((startOfDay(dueAt) - startOfDay(now)) / DAY_MS);
}

export function deadlineLabel(days: number): string {
  if (days < -1) return `Vencido hace ${Math.abs(days)} días`;
  if (days === -1) return "Vencido ayer";
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Faltan ${days} días`;
}

export function deadlineTone(days: number): "late" | "soon" | "calm" {
  if (days < 0) return "late";
  if (days <= 3) return "soon";
  return "calm";
}
