"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  MessageCircle,
  Wallet,
} from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { Card, Empty, Skeleton } from "@/components/ui";
import { IconBadge } from "@/components/Icons";
import { cn, whatsappUrl } from "@/lib/utils";
import {
  currentMonthKey,
  formatDayMonth,
  formatPesos,
  monthLabel,
  monthRange,
  shiftMonth,
} from "./helpers";

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "paid" | "owed" | "pending";
}) {
  const tones = {
    paid: "text-teal-700",
    owed: "text-amber-700",
    pending: "text-stone-600",
  } as const;

  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", tones[tone])}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </Card>
  );
}

export function CashClient() {
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const range = useMemo(() => monthRange(monthKey), [monthKey]);

  const summary = useQuery(convexQuery(api.payments.summary, range));
  const debtors = useQuery(convexQuery(api.payments.debtors, {}));

  const data = summary.data;
  const debtorRows = debtors.data ?? [];
  const totalDebt = debtorRows.reduce((acc, row) => acc + row.total, 0);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge>
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </IconBadge>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              Caja
            </h1>
            <p className="text-sm text-stone-500">
              Cobrado, pendiente y quién debe
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-stone-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setMonthKey((key) => shiftMonth(key, -1))}
            aria-label="Mes anterior"
            className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold text-stone-800">
            {monthLabel(monthKey)}
          </span>
          <button
            type="button"
            onClick={() => setMonthKey((key) => shiftMonth(key, 1))}
            aria-label="Mes siguiente"
            className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {summary.isPending && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat
              label="Cobrado"
              value={formatPesos(data.paid.total)}
              hint={`${data.paid.count} ${data.paid.count === 1 ? "turno" : "turnos"}`}
              tone="paid"
            />
            <Stat
              label="Adeudado"
              value={formatPesos(data.owed.total)}
              hint={`${data.owed.count} ${data.owed.count === 1 ? "turno" : "turnos"}`}
              tone="owed"
            />
            <Stat
              label="Por cobrar"
              value={formatPesos(data.pending.total)}
              hint={`${data.pending.count} agendados sin cobrar`}
              tone="pending"
            />
          </div>

          {data.missingAmount > 0 && (
            <Card className="flex items-start gap-3 border-amber-200 bg-amber-50/60 p-4">
              <CircleAlert
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <p className="text-sm text-amber-900">
                {data.missingAmount === 1
                  ? "Hay 1 turno sin importe cargado, así que este total queda corto."
                  : `Hay ${data.missingAmount} turnos sin importe cargado, así que estos totales quedan cortos.`}{" "}
                Se completan editando el turno en la agenda.
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-sm font-bold text-stone-900">Por tipo</h2>
              {data.byType.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">
                  Todavía no hay movimientos este mes.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.byType.map((row) => (
                    <li
                      key={row.typeId}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: row.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate text-stone-700">
                          {row.name}
                        </span>
                        <span className="shrink-0 text-xs text-stone-400">
                          ({row.count})
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-stone-900">
                        {formatPesos(row.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-bold text-stone-900">
                Por forma de pago
              </h2>
              {data.byMethod.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">
                  Todavía no hay cobros este mes.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.byMethod.map((row) => (
                    <li
                      key={row.method}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate text-stone-700">
                        {row.method}
                        <span className="ml-1.5 text-xs text-stone-400">
                          ({row.count})
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-stone-900">
                        {formatPesos(row.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      <Card className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold text-stone-900">Quién debe</h2>
          {debtorRows.length > 0 && (
            <span className="text-sm font-semibold tabular-nums text-amber-700">
              {formatPesos(totalDebt)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-stone-500">
          Todas las consultas impagas, sin límite de fecha
        </p>

        {debtors.isPending ? (
          <Skeleton className="mt-4 h-24" />
        ) : debtorRows.length === 0 ? (
          <div className="mt-4">
            <Empty title="Nadie debe nada" hint="Todas las consultas están cobradas." />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {debtorRows.map((row) => (
              <li
                key={row.patientId ?? "sin-paciente"}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  {row.patientId ? (
                    <Link
                      href={`/pacientes/${row.patientId}`}
                      className="truncate text-sm font-semibold text-stone-800 hover:text-teal-700"
                    >
                      {row.fullName}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-semibold text-stone-800">
                      {row.fullName}
                    </span>
                  )}
                  <p className="text-xs text-stone-500">
                    {row.count} {row.count === 1 ? "consulta" : "consultas"} · desde{" "}
                    {formatDayMonth(row.oldestAt)}
                    {row.missingAmount > 0 && " · falta cargar importe"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold tabular-nums text-amber-700">
                    {formatPesos(row.total)}
                  </span>
                  {row.phone && (
                    <a
                      href={whatsappUrl(row.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Escribir a ${row.fullName} por WhatsApp`}
                      className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-teal-700"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
