"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TaskPanel } from "@/components/TaskPanel";
import { AppointmentForm } from "@/components/AppointmentForm";
import { Badge, Button, Card, Empty, Modal } from "@/components/ui";
import {
  formatDateLong,
  formatTime,
  paymentLabel,
  todayKey,
  whatsappUrl,
} from "@/lib/utils";
import { Bell, MessageCircle, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

export default function HomePage() {
  const date = todayKey();
  const summary = useQuery(api.appointments.todaySummary, { date });
  const reminders = useQuery(api.reminders.pending) ?? [];
  const markDone = useMutation(api.reminders.markDone);
  const [openNew, setOpenNew] = useState(false);
  const [editId, setEditId] = useState<Id<"appointments"> | null>(null);

  const appointments = summary?.appointments ?? [];
  const next = summary?.next;
  const editAppt = useMemo(
    () => appointments.find((a) => a._id === editId),
    [appointments, editId],
  );

  const dueReminders = reminders.filter(
    (r) => r.dueAt <= Date.now() + 24 * 3600 * 1000,
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">Hoy</p>
          <h1 className="text-2xl sm:text-3xl font-semibold capitalize text-stone-900">
            {formatDateLong(date)}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {appointments.length === 0
              ? "Sin turnos cargados"
              : appointments.length === 1
                ? "1 turno hoy"
                : `${appointments.length} turnos hoy`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenNew(true)} size="lg">
            <Plus className="h-5 w-5" />
            Turno
          </Button>
          <Link href="/agenda">
            <Button variant="outline" size="lg">
              Ver agenda
            </Button>
          </Link>
        </div>
      </section>

      {next && (
        <Card className="overflow-hidden border-amber-200 bg-gradient-to-r from-amber-50 to-white">
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Próximo turno
              </p>
              <p className="mt-0.5 truncate text-lg font-semibold text-stone-900">
                {next.patient?.fullName || next.title || "Sin nombre"}
              </p>
              <p className="text-sm text-stone-600">
                {formatTime(next.startTime)} – {formatTime(next.endTime)}
                {next.type ? ` · ${next.type.name}` : ""}
              </p>
              {next.notes && (
                <p className="mt-1 text-sm text-stone-500">{next.notes}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditId(next._id)}
            >
              Abrir
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-base font-semibold text-stone-900">
            Turnos de hoy
          </h2>
          {appointments.length === 0 ? (
            <Empty
              title="Día libre de turnos"
              hint="Tocá + Turno para cargar el primero"
            />
          ) : (
            <ul className="space-y-2">
              {appointments.map((a) => {
                const isNext = next?._id === a._id;
                return (
                  <li key={a._id}>
                    <button
                      type="button"
                      onClick={() => setEditId(a._id)}
                      className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-teal-300 ${
                        isNext
                          ? "border-amber-300 ring-2 ring-amber-200"
                          : "border-stone-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 h-12 w-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: a.type?.color ?? "#94a3b8",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-teal-800">
                              {formatTime(a.startTime)}
                            </span>
                            {isNext && (
                              <Badge color="#F59E0B">Siguiente</Badge>
                            )}
                            {a.type && (
                              <Badge color={a.type.color}>{a.type.name}</Badge>
                            )}
                          </div>
                          <p className="mt-1 truncate font-semibold text-stone-900">
                            {a.patient?.fullName || a.title || "Sin paciente"}
                          </p>
                          <p className="text-xs text-stone-500">
                            Hasta {formatTime(a.endTime)} · Pago:{" "}
                            {paymentLabel(a.paymentStatus)}
                          </p>
                          {a.notes && (
                            <p className="mt-1 line-clamp-2 text-sm text-stone-500">
                              {a.notes}
                            </p>
                          )}
                        </div>
                        {a.patient?.phone && (
                          <a
                            href={whatsappUrl(
                              a.patient.phone,
                              `Hola ${a.patient.fullName.split(" ")[0]}, te escribo para recordarte tu turno de hoy a las ${formatTime(a.startTime)}.`,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 hover:bg-emerald-100"
                            aria-label="WhatsApp"
                          >
                            <MessageCircle className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <TaskPanel date={date} />

          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-semibold text-stone-900">Avisos</h2>
            </div>
            {dueReminders.length === 0 ? (
              <p className="text-sm text-stone-500">
                No hay recordatorios pendientes.
              </p>
            ) : (
              <ul className="space-y-2">
                {dueReminders.map((r) => (
                  <li
                    key={r._id}
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3"
                  >
                    <p className="text-sm text-stone-800">{r.message}</p>
                    {r.patient?.fullName && (
                      <p className="mt-1 text-xs text-stone-500">
                        {r.patient.fullName}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.patient?.phone && (
                        <a
                          href={whatsappUrl(r.patient.phone, r.message)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => void markDone({ id: r._id })}
                        className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700"
                      >
                        Hecho
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={openNew}
        onClose={() => setOpenNew(false)}
        title="Nuevo turno"
        wide
      >
        <AppointmentForm defaultDate={date} onDone={() => setOpenNew(false)} />
      </Modal>

      <Modal
        open={!!editAppt}
        onClose={() => setEditId(null)}
        title="Editar turno"
        wide
      >
        {editAppt && (
          <AppointmentForm
            initial={editAppt as any}
            onDone={() => setEditId(null)}
          />
        )}
      </Modal>
    </div>
  );
}
