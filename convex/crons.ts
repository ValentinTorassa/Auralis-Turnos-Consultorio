import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Monthly: ensure psychiatrist slots exist for next 6 months
crons.monthly(
  "ensure psychiatrist slots",
  { day: 1, hourUTC: 12, minuteUTC: 0 },
  internal.psychiatristInternal.ensureAllUsers,
);

// Semanal: copia de seguridad automática de cada usuario.
// Domingo 06:00 UTC = 03:00 en Argentina, fuera del horario de consultorio.
crons.weekly(
  "auto backup",
  { dayOfWeek: "sunday", hourUTC: 6, minuteUTC: 0 },
  internal.backupAuto.runAll,
);

export default crons;
