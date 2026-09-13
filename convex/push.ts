import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireUserId } from "./lib";

/** Cuánto antes del vencimiento se avisa. */
export const LEAD_TIME_MS = 0;

/**
 * Un aviso sale cuando ya venció, sigue activo, no está hecho y todavía no se
 * notificó. `cutoffMs` evita revivir avisos viejos si el cron estuvo caído:
 * nada más antiguo que eso se marca como notificado sin mandar nada.
 */
export const STALE_AFTER_MS = 12 * 60 * 60 * 1000;

export function isDeliverable(
  reminder: {
    active: boolean;
    done: boolean;
    dueAt: number;
    notificationSentAt?: number;
  },
  now: number,
): boolean {
  if (!reminder.active || reminder.done) return false;
  if (reminder.notificationSentAt !== undefined) return false;
  return reminder.dueAt - LEAD_TIME_MS <= now;
}

export function isStale(reminder: { dueAt: number }, now: number): boolean {
  return now - reminder.dueAt > STALE_AFTER_MS;
}

/** Guarda (o refresca) la suscripción de este navegador. */
export const subscribe = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (
      !/^https:\/\//.test(args.endpoint) ||
      args.endpoint.length > 1000 ||
      args.p256dh.length > 400 ||
      args.auth.length > 400
    ) {
      throw new Error("Suscripción inválida");
    }

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    if (existing) {
      // Mismo navegador: puede haber rotado las claves o cambiado de usuario.
      await ctx.db.patch(existing._id, {
        userId,
        p256dh: args.p256dh,
        auth: args.auth,
        lastFailureAt: undefined,
      });
      return existing._id;
    }

    return ctx.db.insert("pushSubscriptions", {
      userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      createdAt: Date.now(),
    });
  },
});

export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (existing && existing.userId === userId) {
      await ctx.db.delete(existing._id);
    }
  },
});

/** Si este navegador ya está suscripto (para pintar el botón en Ajustes). */
export const isSubscribed = query({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    return Boolean(existing && existing.userId === userId);
  },
});

/** Avisos vencidos sin notificar, con las suscripciones a las que mandarlos. */
export const dueDeliveries = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const reminders = await ctx.db.query("reminders").collect();
    const deliverable = reminders.filter((row) => isDeliverable(row, now));
    if (deliverable.length === 0) return [];

    const byUser = new Map<string, typeof deliverable>();
    for (const row of deliverable) {
      const key = row.userId as string;
      byUser.set(key, [...(byUser.get(key) ?? []), row]);
    }

    const out: Array<{
      reminderId: string;
      userId: string;
      title: string;
      body: string;
      stale: boolean;
      subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>;
    }> = [];

    for (const [userKey, rows] of byUser) {
      const userId = ctx.db.normalizeId("users", userKey);
      if (!userId) continue;
      const subs = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const row of rows) {
        const patient = row.patientId ? await ctx.db.get(row.patientId) : null;
        const name =
          patient && patient.userId === userId ? patient.fullName : null;
        out.push({
          reminderId: row._id,
          userId: userKey,
          title: name ? `Aviso · ${name}` : "Aviso de Auralis",
          body: row.message.slice(0, 200),
          stale: isStale(row, now),
          subscriptions: subs.map((s) => ({
            endpoint: s.endpoint,
            p256dh: s.p256dh,
            auth: s.auth,
          })),
        });
      }
    }
    return out;
  },
});

export const markNotified = internalMutation({
  args: { reminderIds: v.array(v.id("reminders")) },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.reminderIds) {
      const row = await ctx.db.get(id);
      if (row && row.notificationSentAt === undefined) {
        await ctx.db.patch(id, { notificationSentAt: now });
      }
    }
  },
});

/** Una suscripción que el navegador ya dio de baja (410/404) se borra. */
export const dropSubscriptions = internalMutation({
  args: { endpoints: v.array(v.string()) },
  handler: async (ctx, args) => {
    for (const endpoint of args.endpoints) {
      const row = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
        .unique();
      if (row) await ctx.db.delete(row._id);
    }
  },
});
