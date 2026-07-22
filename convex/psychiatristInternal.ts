import { internalMutation } from "./_generated/server";
import {
  reconcilePsychiatristMonths,
  validatePsychiatristGeneration,
} from "./psychiatristModel";

export const ensureAllUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").collect();
    const totals = {
      users: 0,
      invalidSettings: 0,
      created: 0,
      updated: 0,
      removed: 0,
      skipped: 0,
    };
    for (const userSettings of settings) {
      try {
        validatePsychiatristGeneration(
          userSettings.psychiatristSlotCount,
          userSettings.psychiatristSlotDurationMin,
          6,
        );
      } catch {
        totals.invalidSettings++;
        continue;
      }
      const result = await reconcilePsychiatristMonths(
        ctx,
        userSettings.userId,
        userSettings.psychiatristSlotCount,
        userSettings.psychiatristSlotDurationMin,
        6,
      );
      totals.users++;
      totals.created += result.created;
      totals.updated += result.updated;
      totals.removed += result.removed;
      totals.skipped += result.skipped;
    }
    return totals;
  },
});
