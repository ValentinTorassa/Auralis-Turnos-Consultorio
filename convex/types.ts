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
    code: v.optional(v.string()),
    requiresPatient: v.optional(v.boolean()),
    tracksPayment: v.optional(v.boolean()),
    supportsReminder: v.optional(v.boolean()),
    defaultDurationMin: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("El nombre es obligatorio");
    if ((args.defaultDurationMin ?? 50) < 5)
      throw new Error("La duración debe ser de al menos 5 minutos");
    const existing = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return await ctx.db.insert("appointmentTypes", {
      userId,
      name,
      color: args.color,
      isPsychiatrist: args.isPsychiatrist ?? false,
      sortOrder: existing.length,
      code: args.code?.trim() || undefined,
      requiresPatient: args.requiresPatient ?? true,
      tracksPayment: args.tracksPayment ?? true,
      supportsReminder: args.supportsReminder ?? true,
      defaultDurationMin: args.defaultDurationMin ?? 50,
      isSystemType: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("appointmentTypes"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    code: v.optional(v.string()),
    requiresPatient: v.optional(v.boolean()),
    tracksPayment: v.optional(v.boolean()),
    supportsReminder: v.optional(v.boolean()),
    defaultDurationMin: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Tipo no encontrado");
    const patch: {
      name?: string;
      color?: string;
      code?: string;
      requiresPatient?: boolean;
      tracksPayment?: boolean;
      supportsReminder?: boolean;
      defaultDurationMin?: number;
    } = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("El nombre es obligatorio");
      patch.name = name;
    }
    if (args.color !== undefined) patch.color = args.color;
    if (args.code !== undefined) patch.code = args.code.trim();
    if (args.requiresPatient !== undefined)
      patch.requiresPatient = args.requiresPatient;
    if (args.tracksPayment !== undefined)
      patch.tracksPayment = args.tracksPayment;
    if (args.supportsReminder !== undefined)
      patch.supportsReminder = args.supportsReminder;
    if (args.defaultDurationMin !== undefined) {
      if (args.defaultDurationMin < 5)
        throw new Error("La duración debe ser de al menos 5 minutos");
      patch.defaultDurationMin = args.defaultDurationMin;
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("appointmentTypes") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("Tipo no encontrado");
    if (row.isSystemType)
      throw new Error("Los tipos incorporados no se pueden eliminar");
    const inUse = await ctx.db
      .query("appointments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("typeId"), args.id))
      .first();
    if (inUse) {
      throw new Error(
        "No se puede eliminar: hay turnos que usan este tipo. Editá el nombre o color si querés cambiarlo.",
      );
    }
    await ctx.db.delete(args.id);
  },
});
