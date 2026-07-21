import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { DEFAULT_TYPES } from "./lib";

export function appointmentTypeRules(type: {
  code?: string;
  name: string;
  requiresPatient?: boolean;
  tracksPayment?: boolean;
  supportsReminder?: boolean;
  defaultDurationMin?: number;
}) {
  const system = DEFAULT_TYPES.find(
    (candidate) =>
      candidate.code === type.code ||
      (!type.code && candidate.name === type.name),
  );
  return {
    requiresPatient:
      type.requiresPatient ?? system?.requiresPatient ?? true,
    tracksPayment: type.tracksPayment ?? system?.tracksPayment ?? true,
    supportsReminder: type.supportsReminder ?? system?.supportsReminder ?? true,
    defaultDurationMin:
      type.defaultDurationMin ?? system?.defaultDurationMin ?? 50,
  };
}

export async function backfillAppointmentTypesForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  customDefaultDurationMin = 50,
) {
  const types = await ctx.db
    .query("appointmentTypes")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  let created = 0;
  let updated = 0;

  for (const systemType of DEFAULT_TYPES) {
    const existing = types.find(
      (type) =>
        type.code === systemType.code ||
        (!type.code && type.name === systemType.name),
    );
    if (!existing) {
      await ctx.db.insert("appointmentTypes", {
        userId,
        ...systemType,
        isSystemType: true,
      });
      created++;
      continue;
    }

    const patch: Record<string, string | number | boolean> = {};
    if (existing.code === undefined) patch.code = systemType.code;
    if (existing.requiresPatient === undefined)
      patch.requiresPatient = systemType.requiresPatient;
    if (existing.tracksPayment === undefined)
      patch.tracksPayment = systemType.tracksPayment;
    if (existing.supportsReminder === undefined)
      patch.supportsReminder = systemType.supportsReminder;
    if (existing.defaultDurationMin === undefined)
      patch.defaultDurationMin = systemType.defaultDurationMin;
    if (existing.isSystemType === undefined) patch.isSystemType = true;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
      updated++;
    }
  }

  for (const type of types) {
    const isKnownSystemType = DEFAULT_TYPES.some(
      (candidate) =>
        candidate.code === type.code ||
        (!type.code && candidate.name === type.name),
    );
    if (isKnownSystemType) continue;
    const patch: Record<string, number | boolean> = {};
    if (type.requiresPatient === undefined) patch.requiresPatient = true;
    if (type.tracksPayment === undefined) patch.tracksPayment = true;
    if (type.supportsReminder === undefined) patch.supportsReminder = true;
    if (type.defaultDurationMin === undefined)
      patch.defaultDurationMin = customDefaultDurationMin;
    if (type.isSystemType === undefined) patch.isSystemType = false;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(type._id, patch);
      updated++;
    }
  }

  return { created, updated };
}
