import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireUserId } from "./lib";
import { buildSnapshot } from "./backup";
import { backupCounts } from "./backupModel";

/** Cuántas copias automáticas se conservan por usuario. */
export const KEEP_PER_USER = 8;

/**
 * Decide qué copias se borran al guardar una nueva.
 * Se conservan las `keep` más recientes; el resto se elimina del storage.
 */
export function backupsToPrune<T extends { exportedAt: number }>(
  rows: T[],
  keep = KEEP_PER_USER,
): T[] {
  return [...rows]
    .sort((a, b) => b.exportedAt - a.exportedAt)
    .slice(keep);
}

/** Id de snapshot válido para el parser estricto: `auto-<fecha>-<random>`. */
export function autoSnapshotId(now: number, random: string): string {
  const stamp = new Date(now).toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  return `auto-${stamp}-${random}`.slice(0, 80);
}

export const usersToBackup = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").collect();
    return settings.map((row) => row.userId);
  },
});

export const snapshotForUser = internalQuery({
  args: { userId: v.id("users"), snapshotId: v.string() },
  handler: async (ctx, args) => {
    return buildSnapshot(ctx, args.userId, args.snapshotId);
  },
});

export const record = internalMutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    snapshotId: v.string(),
    exportedAt: v.number(),
    recordCount: v.number(),
    bytes: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("autoBackups", args);

    const existing = await ctx.db
      .query("autoBackups")
      .withIndex("by_user_exported", (q) => q.eq("userId", args.userId))
      .collect();

    let removed = 0;
    for (const row of backupsToPrune(existing)) {
      await ctx.storage.delete(row.storageId);
      await ctx.db.delete(row._id);
      removed++;
    }
    return { removed };
  },
});

/**
 * Corre semanalmente. Por cada usuario arma el snapshot, lo guarda como
 * archivo en el storage de Convex y poda los viejos.
 */
export const runAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const userIds: Id<"users">[] = await ctx.runQuery(
      internal.backupAuto.usersToBackup,
      {},
    );

    const totals = {
      users: 0,
      failed: 0,
      removed: 0,
      errors: [] as string[],
    };
    for (const userId of userIds) {
      try {
        const now = Date.now();
        const snapshotId = autoSnapshotId(
          now,
          crypto.randomUUID().replace(/-/g, "").slice(0, 12),
        );
        const snapshot = await ctx.runQuery(
          internal.backupAuto.snapshotForUser,
          { userId, snapshotId },
        );
        const body = JSON.stringify(snapshot);
        const storageId = await ctx.storage.store(
          new Blob([body], { type: "application/json" }),
        );
        const result = await ctx.runMutation(internal.backupAuto.record, {
          userId,
          storageId,
          snapshotId,
          exportedAt: now,
          recordCount: backupCounts(snapshot).total,
          bytes: body.length,
        });
        totals.users++;
        totals.removed += result.removed;
      } catch (error) {
        // Un usuario con datos inconsistentes no debe frenar al resto, pero el
        // motivo tiene que quedar visible: una copia que falla en silencio es
        // peor que no tenerla, porque nadie se entera hasta que la necesita.
        totals.failed++;
        const reason = error instanceof Error ? error.message : String(error);
        totals.errors.push(`${userId}: ${reason}`.slice(0, 300));
        console.error(`[backupAuto] falló la copia de ${userId}: ${reason}`);
      }
    }
    return totals;
  },
});

/** Últimas copias automáticas del usuario, para mostrarlas en Ajustes. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("autoBackups")
      .withIndex("by_user_exported", (q) => q.eq("userId", userId))
      .order("desc")
      .take(KEEP_PER_USER);

    return Promise.all(
      rows.map(async (row) => ({
        id: row._id,
        snapshotId: row.snapshotId,
        exportedAt: row.exportedAt,
        recordCount: row.recordCount,
        bytes: row.bytes,
        url: await ctx.storage.getUrl(row.storageId),
      })),
    );
  },
});
