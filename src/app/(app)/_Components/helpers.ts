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
