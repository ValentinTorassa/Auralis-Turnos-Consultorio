import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { backfillAppointmentTypesForUser } from "./appointmentTypeDefaults";
import {
  intervalsOverlap,
  isLegacyPsychiatristPlaceholder,
  psychiatristMonthKey,
} from "./psychiatristModel";

/** Safe to run repeatedly with: npx convex run migrations:backfillAppointmentTypes */
export const backfillAppointmentTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const [users, settings, types] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("settings").collect(),
      ctx.db.query("appointmentTypes").collect(),
    ]);
    const userIds = new Set<Id<"users">>([
      ...users.map((user) => user._id),
      ...settings.map((setting) => setting.userId),
      ...types.map((type) => type.userId),
    ]);
    const durationByUser = new Map(
      settings.map((setting) => [setting.userId, setting.defaultDurationMin]),
    );
    let created = 0;
    let updated = 0;
    for (const userId of userIds) {
      const result = await backfillAppointmentTypesForUser(
        ctx,
        userId,
        durationByUser.get(userId) ?? 50,
      );
      created += result.created;
      updated += result.updated;
    }
    return { users: userIds.size, created, updated };
  },
});

/** Safe to run repeatedly with: npx convex run migrations:migratePsychiatristSlots */
export const migratePsychiatristSlots = internalMutation({
  args: {},
  handler: async (ctx) => {
    const appointments = await ctx.db.query("appointments").collect();
    const now = Date.now();
    const totals = {
      placeholdersConverted: 0,
      appointmentsLinked: 0,
      alreadyLinked: 0,
      conflictsSkipped: 0,
    };

    for (const appointment of appointments) {
      if (!isLegacyPsychiatristPlaceholder(appointment)) continue;
      const exactSlots = await ctx.db
        .query("psychiatristSlots")
        .withIndex("by_user_start", (q) =>
          q
            .eq("userId", appointment.userId)
            .eq("startTime", appointment.startTime),
        )
        .collect();
      const exact = exactSlots.find(
        (slot) => slot.endTime === appointment.endTime,
      );
      if (!exact) {
        await ctx.db.insert("psychiatristSlots", {
          userId: appointment.userId,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          state: "available",
          generationKey: `legacy-placeholder:${appointment._id}`,
          monthKey: psychiatristMonthKey(appointment.startTime),
          createdAt: now,
          updatedAt: now,
        });
      }
      await ctx.db.patch(appointment._id, {
        deletedAt: now,
        reminderEnabled: false,
        updatedAt: now,
      });
      totals.placeholdersConverted++;
    }

    for (const appointment of appointments) {
      if (
        !appointment.isPsychiatrist ||
        !appointment.patientId ||
        appointment.deletedAt ||
        appointment.status === "cancelled"
      ) {
        continue;
      }
      const linked = await ctx.db
        .query("psychiatristSlots")
        .withIndex("by_user_appointment", (q) =>
          q
            .eq("userId", appointment.userId)
            .eq("appointmentId", appointment._id),
        )
        .first();
      if (linked) {
        totals.alreadyLinked++;
        continue;
      }
      const monthKey = psychiatristMonthKey(appointment.startTime);
      const monthSlots = await ctx.db
        .query("psychiatristSlots")
        .withIndex("by_user_month", (q) =>
          q.eq("userId", appointment.userId).eq("monthKey", monthKey),
        )
        .collect();
      const exact = monthSlots.find(
        (slot) =>
          slot.startTime === appointment.startTime &&
          slot.endTime === appointment.endTime,
      );
      if (exact?.state === "available" && !exact.appointmentId) {
        await ctx.db.patch(exact._id, {
          state: "assigned",
          appointmentId: appointment._id,
          updatedAt: now,
        });
        totals.appointmentsLinked++;
        continue;
      }
      if (
        exact ||
        monthSlots.some((slot) => intervalsOverlap(slot, appointment))
      ) {
        totals.conflictsSkipped++;
        continue;
      }
      await ctx.db.insert("psychiatristSlots", {
        userId: appointment.userId,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        state: "assigned",
        appointmentId: appointment._id,
        generationKey: `linked-appointment:${appointment._id}`,
        monthKey,
        createdAt: now,
        updatedAt: now,
      });
      totals.appointmentsLinked++;
    }
    return totals;
  },
});
