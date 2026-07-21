import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { backfillAppointmentTypesForUser } from "./appointmentTypeDefaults";

/** Safe to run repeatedly with: npx convex run migrations:backfillAppointmentTypes */
export const backfillAppointmentTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const [users, settings, types] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("settings").collect(),
      ctx.db.query("appointmentTypes").collect(),
    ]);
    const userIds = new Set<Id<"users">>([
      ...users.map((user) => user._id),
      ...settings.map((setting) => setting.userId),
      ...types.map((type) => type.userId),
    ]);
    const durationByUser = new Map(
      settings.map((setting) => [setting.userId, setting.defaultDurationMin]),
    );
    let created = 0;
    let updated = 0;
    for (const userId of userIds) {
      const result = await backfillAppointmentTypesForUser(
        ctx,
        userId,
        durationByUser.get(userId) ?? 50,
      );
      created += result.created;
      updated += result.updated;
    }
    return { users: userIds.size, created, updated };
  },
});
