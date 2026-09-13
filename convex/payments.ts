import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { requireUserId } from "./lib";
import { appointmentTypeRules } from "./appointmentTypeDefaults";

const MIN_DATE_MS = Date.UTC(2000, 0, 1);
const MAX_DATE_MS = Date.UTC(2101, 0, 1);
const MAX_RANGE_MS = 370 * 24 * 60 * 60 * 1000;

/** Un turno cuenta como deuda si ya pasó y quedó sin cobrar. */
export function isDebt(row: Pick<Doc<"appointments">, "status" | "paymentStatus">) {
  if (row.paymentStatus === "owes") return true;
  return row.status === "completed" && row.paymentStatus === "unpaid";
}

function bucketOf(row: Doc<"appointments">): "paid" | "owed" | "pending" | null {
  if (row.paymentStatus === "na") return null;
  if (row.paymentStatus === "paid") return "paid";
  if (isDebt(row)) return "owed";
  if (row.status === "cancelled" || row.status === "no_show") return null;
  return "pending";
}

function assertRange(startMs: number, endMs: number) {
  if (
    !Number.isSafeInteger(startMs) ||
    !Number.isSafeInteger(endMs) ||
    startMs < MIN_DATE_MS ||
    endMs >= MAX_DATE_MS ||
    endMs <= startMs ||
    endMs - startMs > MAX_RANGE_MS
  ) {
    throw new Error("Rango de fechas inválido");
  }
}

/**
 * Totales de un período, agrupados por estado de cobro, forma de pago y tipo.
 *
 * Los turnos se ubican por su fecha (`startTime`), no por `paidAt`: "septiembre"
 * significa las sesiones de septiembre. `missingAmount` cuenta los que no tienen
 * importe cargado — sin ese dato los totales quedan cortos y conviene avisarlo
 * en pantalla en vez de mostrar un número que miente.
 */
export const summary = query({
  args: { startMs: v.number(), endMs: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    assertRange(args.startMs, args.endMs);

    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_user_start", (q) =>
        q
          .eq("userId", userId)
          .gte("startTime", args.startMs)
          .lt("startTime", args.endMs),
      )
      .collect();

    const types = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const typeMap = new Map(types.map((t) => [t._id, t]));

    const totals = {
      paid: { count: 0, total: 0 },
      owed: { count: 0, total: 0 },
      pending: { count: 0, total: 0 },
    };
    const byMethod = new Map<string, { count: number; total: number }>();
    const byType = new Map<
      string,
      { typeId: string; name: string; color: string; count: number; total: number }
    >();
    let missingAmount = 0;
    let attended = 0;

    for (const row of rows) {
      if (row.deletedAt) continue;
      const type = typeMap.get(row.typeId);
      if (type && !appointmentTypeRules(type).tracksPayment) continue;

      const bucket = bucketOf(row);
      if (!bucket) continue;

      const amount = typeof row.amount === "number" ? row.amount : 0;
      if (!row.amount && bucket !== "pending") missingAmount++;
      if (row.status === "completed") attended++;

      totals[bucket].count++;
      totals[bucket].total += amount;

      if (bucket === "paid") {
        const method = row.paymentMethod?.trim() || "Sin especificar";
        const prev = byMethod.get(method) ?? { count: 0, total: 0 };
        byMethod.set(method, {
          count: prev.count + 1,
          total: prev.total + amount,
        });
      }

      if (bucket === "paid" || bucket === "owed") {
        const key = row.typeId as string;
        const prev = byType.get(key) ?? {
          typeId: key,
          name: type?.name ?? "Tipo eliminado",
          color: type?.color ?? "#78716C",
          count: 0,
          total: 0,
        };
        byType.set(key, {
          ...prev,
          count: prev.count + 1,
          total: prev.total + amount,
        });
      }
    }

    return {
      ...totals,
      attended,
      missingAmount,
      byMethod: [...byMethod.entries()]
        .map(([method, v]) => ({ method, ...v }))
        .sort((a, b) => b.total - a.total),
      byType: [...byType.values()].sort((a, b) => b.total - a.total),
    };
  },
});

/**
 * Quién debe, sumando todas las consultas impagas sin límite de fecha.
 * Es la vista que hoy obliga a entrar paciente por paciente.
 */
export const debtors = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const types = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const typeMap = new Map(types.map((t) => [t._id, t]));

    const grouped = new Map<
      string,
      {
        patientId: string | null;
        count: number;
        total: number;
        oldestAt: number;
        missingAmount: number;
      }
    >();

    for (const row of rows) {
      if (row.deletedAt || !isDebt(row)) continue;
      const type = typeMap.get(row.typeId);
      if (type && !appointmentTypeRules(type).tracksPayment) continue;

      const key = (row.patientId as string | undefined) ?? "__sin_paciente__";
      const prev = grouped.get(key) ?? {
        patientId: (row.patientId as string | undefined) ?? null,
        count: 0,
        total: 0,
        oldestAt: row.startTime,
        missingAmount: 0,
      };
      grouped.set(key, {
        ...prev,
        count: prev.count + 1,
        total: prev.total + (typeof row.amount === "number" ? row.amount : 0),
        oldestAt: Math.min(prev.oldestAt, row.startTime),
        missingAmount: prev.missingAmount + (row.amount ? 0 : 1),
      });
    }

    const entries = await Promise.all(
      [...grouped.values()].map(async (entry) => {
        if (!entry.patientId) {
          return { ...entry, fullName: "Sin paciente", phone: undefined };
        }
        const patientId = ctx.db.normalizeId("patients", entry.patientId);
        const patient = patientId ? await ctx.db.get(patientId) : null;
        if (!patient || patient.userId !== userId) {
          return { ...entry, fullName: "Paciente eliminado", phone: undefined };
        }
        return { ...entry, fullName: patient.fullName, phone: patient.phone };
      }),
    );

    return entries.sort((a, b) =>
      b.total === a.total ? a.oldestAt - b.oldestAt : b.total - a.total,
    );
  },
});
