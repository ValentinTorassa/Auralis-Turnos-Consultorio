import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib";
import { backfillAppointmentTypesForUser } from "./appointmentTypeDefaults";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const ensureSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!existing) {
      await ctx.db.insert("settings", {
        userId,
        workDayStart: "08:00",
        workDayEnd: "20:00",
        defaultDurationMin: 50,
        psychiatristSlotCount: 6,
        psychiatristSlotDurationMin: 30,
        seeded: true,
      });
    } else {
      await ctx.db.patch(existing._id, { seeded: true });
    }

    const result = await backfillAppointmentTypesForUser(
      ctx,
      userId,
      existing?.defaultDurationMin ?? 50,
    );
    return {
      ok: true,
      already: Boolean(existing?.seeded) && result.created === 0,
      ...result,
    };
  },
});
