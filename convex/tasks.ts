import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isValidDateKey, requireUserId } from "./lib";

function assertDate(date: string) {
  if (!isValidDateKey(date)) {
    throw new Error("Fecha inválida");
  }
}

export const byDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    assertDate(args.date);
    const tasks = await ctx.db
      .query("dailyTasks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();
    return tasks.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const title = args.title.trim();
    if (!title) throw new Error("Título requerido");
    if (title.length > 200) throw new Error("El título es demasiado largo");
    assertDate(args.date);
    const existing = await ctx.db
      .query("dailyTasks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();
    return await ctx.db.insert("dailyTasks", {
      userId,
      date: args.date,
      title,
      done: false,
      sortOrder: existing.length,
      createdAt: Date.now(),
    });
  },
});

export const toggle = mutation({
  args: { id: v.id("dailyTasks") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Tarea no encontrada");
    await ctx.db.patch(args.id, { done: !row.done });
  },
});

export const remove = mutation({
  args: { id: v.id("dailyTasks") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Tarea no encontrada");
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("dailyTasks"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Tarea no encontrada");
    const title = args.title.trim();
    if (!title) throw new Error("Título requerido");
    if (title.length > 200) throw new Error("El título es demasiado largo");
    await ctx.db.patch(args.id, { title });
  },
});
