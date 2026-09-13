"use node";

import webpush from "web-push";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Entrega los avisos vencidos por Web Push.
 *
 * Las claves VAPID viven en variables de entorno del deployment de Convex
 * (`bunx convex env set`). Si faltan, el cron no falla: sale sin hacer nada,
 * porque un deployment sin notificaciones configuradas es un estado válido.
 */
export const deliverDue = internalAction({
  args: {},
  handler: async (ctx) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) {
      return { skipped: "VAPID sin configurar" as const };
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const deliveries = await ctx.runQuery(internal.push.dueDeliveries, {});
    if (deliveries.length === 0) return { sent: 0, failed: 0, dropped: 0 };

    const notified: Id<"reminders">[] = [];
    const goneEndpoints = new Set<string>();
    let sent = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      // Un aviso viejo se marca como notificado sin mandarlo: que el cron haya
      // estado caído no justifica despertar a nadie por algo de ayer.
      if (delivery.stale || delivery.subscriptions.length === 0) {
        notified.push(delivery.reminderId as Id<"reminders">);
        continue;
      }

      const payload = JSON.stringify({
        title: delivery.title,
        body: delivery.body,
        url: "/",
      });

      let anySent = false;
      for (const sub of delivery.subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
          anySent = true;
          sent++;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            goneEndpoints.add(sub.endpoint);
          }
          failed++;
        }
      }

      // Sin ninguna entrega exitosa no se marca: se reintenta en la próxima
      // corrida, hasta que el aviso quede viejo y se descarte.
      if (anySent) notified.push(delivery.reminderId as Id<"reminders">);
    }

    if (notified.length > 0) {
      await ctx.runMutation(internal.push.markNotified, {
        reminderIds: notified,
      });
    }
    if (goneEndpoints.size > 0) {
      await ctx.runMutation(internal.push.dropSubscriptions, {
        endpoints: [...goneEndpoints],
      });
    }

    return { sent, failed, dropped: goneEndpoints.size };
  },
});
