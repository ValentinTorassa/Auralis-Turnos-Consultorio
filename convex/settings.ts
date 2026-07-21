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
    const start = args.workDayStart ?? existing.workDayStart;
    const end = args.workDayEnd ?? existing.workDayEnd;
    const toMinutes = (value: string) => {
      const match = /^(\d{1,2}):(\d{2})$/.exec(value);
      if (!match) return Number.NaN;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (hour > 23 || minute > 59) return Number.NaN;
      return hour * 60 + minute;
    };
    if (
      !Number.isFinite(toMinutes(start)) ||
      !Number.isFinite(toMinutes(end)) ||
      toMinutes(start) >= toMinutes(end)
    ) {
      throw new Error("El fin de la jornada debe ser posterior al inicio");
    }
    if (
      args.defaultDurationMin !== undefined &&
      args.defaultDurationMin < 5
    ) {
      throw new Error("La duración debe ser de al menos 5 minutos");
    }
    const patch: Record<string, string | number | boolean> = {};
    if (args.workDayStart !== undefined) patch.workDayStart = args.workDayStart;
    if (args.workDayEnd !== undefined) patch.workDayEnd = args.workDayEnd;
    if (args.defaultDurationMin !== undefined)
      patch.defaultDurationMin = args.defaultDurationMin;
    if (args.psychiatristSlotCount !== undefined)
      patch.psychiatristSlotCount = args.psychiatristSlotCount;
    if (args.psychiatristSlotDurationMin !== undefined)
      patch.psychiatristSlotDurationMin = args.psychiatristSlotDurationMin;
    await ctx.db.patch(existing._id, patch);
  },
});
