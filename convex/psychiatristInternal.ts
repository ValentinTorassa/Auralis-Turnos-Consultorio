import { internalMutation } from "./_generated/server";
import { thirdFridayOfMonth } from "./lib";

function slotTimes(
  year: number,
  monthIndex: number,
  count: number,
  durationMin: number,
): { start: number; end: number }[] {
  const friday = thirdFridayOfMonth(year, monthIndex);
  const y = friday.getFullYear();
  const m = String(friday.getMonth() + 1).padStart(2, "0");
  const d = String(friday.getDate()).padStart(2, "0");
  const base = new Date(`${y}-${m}-${d}T15:00:00-03:00`).getTime();
  const slots: { start: number; end: number }[] = [];
  for (let i = 0; i < count; i++) {
    const start = base + i * durationMin * 60 * 1000;
    slots.push({ start, end: start + durationMin * 60 * 1000 });
  }
  return slots;
}

export const ensureAllUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").collect();
    const now = new Date();
    for (const s of settings) {
      const userId = s.userId;
      const types = await ctx.db
        .query("appointmentTypes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      let psyType = types.find((t) => t.isPsychiatrist);
      if (!psyType) {
        const id = await ctx.db.insert("appointmentTypes", {
          userId,
          name: "Psiquiatría",
          color: "#F59E0B",
          isPsychiatrist: true,
          sortOrder: 99,
        });
        psyType = (await ctx.db.get(id))!;
      }
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const slots = slotTimes(
          d.getFullYear(),
          d.getMonth(),
          s.psychiatristSlotCount,
          s.psychiatristSlotDurationMin,
        );
        for (const slot of slots) {
          if (slot.end < Date.now()) continue;
          const existing = await ctx.db
            .query("appointments")
            .withIndex("by_user_psychiatrist", (q) =>
              q
                .eq("userId", userId)
                .eq("isPsychiatrist", true)
                .eq("startTime", slot.start),
            )
            .first();
          if (existing) continue;
          await ctx.db.insert("appointments", {
            userId,
            typeId: psyType._id,
            title: "Turno psiquiatra (libre)",
            startTime: slot.start,
            endTime: slot.end,
            status: "confirmed",
            paymentStatus: "na",
            isPsychiatrist: true,
            reminderEnabled: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    }
  },
});
