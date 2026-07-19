import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const update = mutation({
  args: {
    workDayStart: v.optional(v.string()),
    workDayEnd: v.optional(v.string()),
    defaultDurationMin: v.optional(v.number()),
    psychiatristSlotCount: v.optional(v.number()),
    psychiatristSlotDurationMin: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) throw new Error("Configuración no encontrada");
    const patch: Record<string, string | number | boolean> = {};
    if (args.workDayStart !== undefined) patch.workDayStart = args.workDayStart;
    if (args.workDayEnd !== undefined) patch.workDayEnd = args.workDayEnd;
    if (args.defaultDurationMin !== undefined) patch.defaultDurationMin = args.defaultDurationMin;
    if (args.psychiatristSlotCount !== undefined)
      patch.psychiatristSlotCount = args.psychiatristSlotCount;
    if (args.psychiatristSlotDurationMin !== undefined)
      patch.psychiatristSlotDurationMin = args.psychiatristSlotDurationMin;
    await ctx.db.patch(existing._id, patch);
  },
});
