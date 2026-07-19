import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Monthly: ensure psychiatrist slots exist for next 6 months
crons.monthly(
  "ensure psychiatrist slots",
  { day: 1, hourUTC: 12, minuteUTC: 0 },
  internal.psychiatristInternal.ensureAllUsers,
);

export default crons;
