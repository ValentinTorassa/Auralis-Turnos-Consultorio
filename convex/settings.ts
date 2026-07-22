import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib";
import {
  MAX_PSYCHIATRIST_SLOT_COUNT,
  MAX_PSYCHIATRIST_SLOT_DURATION_MIN,
  MIN_PSYCHIATRIST_SLOT_DURATION_MIN,
  reconcilePsychiatristMonths,
} from "./psychiatristModel";

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
      (!Number.isInteger(args.defaultDurationMin) ||
        args.defaultDurationMin < 5 ||
        args.defaultDurationMin > 24 * 60)
    ) {
      throw new Error("La duración debe estar entre 5 minutos y 24 horas");
    }
    if (
      args.psychiatristSlotCount !== undefined &&
      (!Number.isInteger(args.psychiatristSlotCount) ||
        args.psychiatristSlotCount < 1 ||
        args.psychiatristSlotCount > MAX_PSYCHIATRIST_SLOT_COUNT)
    ) {
      throw new Error(
        `La cantidad de turnos debe estar entre 1 y ${MAX_PSYCHIATRIST_SLOT_COUNT}`,
      );
    }
    if (
      args.psychiatristSlotDurationMin !== undefined &&
      (!Number.isInteger(args.psychiatristSlotDurationMin) ||
        args.psychiatristSlotDurationMin < MIN_PSYCHIATRIST_SLOT_DURATION_MIN ||
        args.psychiatristSlotDurationMin > MAX_PSYCHIATRIST_SLOT_DURATION_MIN)
    ) {
      throw new Error(
        `La duración de turnos debe estar entre ${MIN_PSYCHIATRIST_SLOT_DURATION_MIN} y ${MAX_PSYCHIATRIST_SLOT_DURATION_MIN} minutos`,
      );
    }
    const nextPsychiatristCount =
      args.psychiatristSlotCount ?? existing.psychiatristSlotCount;
    const nextPsychiatristDuration =
      args.psychiatristSlotDurationMin ?? existing.psychiatristSlotDurationMin;
    if (nextPsychiatristCount * nextPsychiatristDuration > 24 * 60) {
      throw new Error("Los turnos de psiquiatría deben ocupar como máximo 24 horas");
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
    if (
      args.psychiatristSlotCount !== undefined ||
      args.psychiatristSlotDurationMin !== undefined
    ) {
      return await reconcilePsychiatristMonths(
        ctx,
        userId,
        nextPsychiatristCount,
        nextPsychiatristDuration,
        6,
      );
    }
    return null;
  },
});
