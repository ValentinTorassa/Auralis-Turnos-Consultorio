import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { requireUserId, DEFAULT_TYPES } from "./lib";

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

    if (existing?.seeded) {
      return { ok: true, already: true };
    }

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

    const types = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (types.length === 0) {
      for (const t of DEFAULT_TYPES) {
        await ctx.db.insert("appointmentTypes", {
          userId,
          name: t.name,
          color: t.color,
          isPsychiatrist: t.isPsychiatrist,
          sortOrder: t.sortOrder,
        });
      }
    }

    return { ok: true, already: false };
  },
});
