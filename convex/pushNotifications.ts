import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

type DueReminder = {
  reminderId: Id<"reminders">;
  tokens: string[];
};

export const due = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oldest = now - 48 * 60 * 60 * 1000;
    const reminders = (await ctx.db.query("reminders").collect()).filter(
      (reminder) =>
        reminder.active &&
        !reminder.done &&
        reminder.notificationSentAt === undefined &&
        reminder.dueAt <= now &&
        reminder.dueAt >= oldest,
    );
    return await Promise.all(
      reminders.map(async (reminder) => ({
        reminderId: reminder._id,
        tokens: (
          await ctx.db
            .query("pushTokens")
            .withIndex("by_user", (q) => q.eq("userId", reminder.userId))
            .collect()
        ).map((entry) => entry.token),
      })),
    );
  },
});

export const markSent = internalMutation({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.reminderId);
    if (reminder) {
      await ctx.db.patch(args.reminderId, { notificationSentAt: Date.now() });
    }
  },
});

export const sendDue = internalAction({
  args: {},
  handler: async (ctx): Promise<{ checked: number; sent: number }> => {
    const due: DueReminder[] = await ctx.runQuery(
      internal.pushNotifications.due,
      {},
    );
    let sent = 0;
    for (const reminder of due) {
      if (reminder.tokens.length === 0) continue;
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          reminder.tokens.map((to) => ({
            to,
            sound: "default",
            title: "Recordatorio de agenda",
            body: "Tenés una actividad pendiente. Abrí Auralis para ver los detalles.",
            data: { reminderId: reminder.reminderId },
          })),
        ),
      });
      if (!response.ok) continue;
      await ctx.runMutation(internal.pushNotifications.markSent, {
        reminderId: reminder.reminderId,
      });
      sent++;
    }
    return { checked: due.length, sent };
  },
});
