import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const types = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return types.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    isPsychiatrist: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return await ctx.db.insert("appointmentTypes", {
      userId,
      name: args.name.trim(),
      color: args.color,
      isPsychiatrist: args.isPsychiatrist ?? false,
      sortOrder: existing.length,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("appointmentTypes"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Tipo no encontrado");
    const patch: { name?: string; color?: string } = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.color !== undefined) patch.color = args.color;
    await ctx.db.patch(args.id, patch);
  },
});
