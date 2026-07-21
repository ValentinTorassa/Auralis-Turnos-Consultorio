import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib";

export const register = mutation({
  args: {
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const token = args.token.trim();
    if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
      throw new Error("Token de notificaciones inválido");
    }
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId,
        platform: args.platform,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("pushTokens", {
      userId,
      token,
      platform: args.platform,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (existing?.userId === userId) await ctx.db.delete(existing._id);
  },
});
