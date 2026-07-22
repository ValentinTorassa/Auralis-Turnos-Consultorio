"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../../../convex/_generated/api";
import { TaskPanel } from "@/components/TaskPanel";
import {
  AppointmentModal,
  AppointmentFormResult,
} from "@/components/AppointmentForm";
import {
  Badge,
  Button,
  Card,
  Empty,
  Modal,
  Skeleton,
} from "@/components/ui";
import { IconBadge } from "@/components/Icons";
import {
  formatDateLong,
  formatTime,
  paymentLabel,
  shouldShowPaymentAsDebt,
  todayKey,
  whatsappUrl,
} from "@/lib/utils";
import { useNow } from "@/lib/useNow";
import {
  ArrowUpRight,
  BellPlus,
  BellRing,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  MessageCircle,
  NotebookPen,
  Sparkles,
  SunMedium,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useQueryState } from "nuqs";
import { homeTaskSearchParams } from "@/lib/search-params";
import { greeting } from "./helpers";
import { NewReminderForm } from "./NewReminderForm";

type ActiveDialog =
  | { kind: "new-appointment" }
  | { kind: "new-reminder" }
  | { kind: "edit-appointment"; id: Id<"appointments"> }
  | null;

export function HomeClient() {
  const date = todayKey();
  const now = useNow();
  const { data: summary } = useQuery(
    convexQuery(api.appointments.todaySummary, { date }),
  );
  const { data: reminders = [] } = useQuery(
    convexQuery(api.reminders.pending, {}),
  );
  const markDone = useMutation({
    mutationFn: useConvexMutation(api.reminders.markDone),
  });
  const closeout = useMutation({
    mutationFn: useConvexMutation(api.appointments.closeout),
  });
  const restoreAppointment = useMutation({
    mutationFn: useConvexMutation(api.appointments.restore),
  });
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [taskDateParam, setTaskDate] = useQueryState(
    "tasks",
    homeTaskSearchParams.tasks.withOptions({ history: "push", shallow: true }),
  );
  const taskDate = taskDateParam || date;
  const [deleted, setDeleted] = useState<Id<"appointments"> | null>(null);

  const appointments = useMemo(() => summary?.appointments ?? [], [summary]);
  const loading = summary === undefined;
  const next =
    now > 0
      ? appointments.find(
          (appointment) =>
            appointment.endTime > now && appointment.status === "confirmed",
        )
      : summary?.next;
  const editAppt = useMemo(
    () =>
      appointments.find(
        (appointment) =>
          activeDialog?.kind === "edit-appointment" &&
          appointment._id === activeDialog.id,
      ),
    [activeDialog, appointments],
  );

  const dueReminders =
    now === 0
      ? []
      : reminders.filter((r) => r.dueAt <= now + 24 * 3600 * 1000);

  const completedCount = appointments.filter(
    (a) => a.status === "completed",
  ).length;
  const pendingPayments = appointments.filter(
    (a) => shouldShowPaymentAsDebt(a.status, a.paymentStatus),
  ).length;

  function finishAppointment(result: AppointmentFormResult) {
    setActiveDialog(null);
    if (result.deleted) setDeleted(result.id);
  }

  return (
    <div className="anim-page space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <IconBadge tone="amber">
            <SunMedium className="h-5 w-5" strokeWidth={2.25} />
          </IconBadge>
          <div>
            <p className="text-sm font-semibold text-teal-700">
              {greeting(now)}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900 first-letter:uppercase sm:text-3xl">
              {formatDateLong(date)}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-stone-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-stone-600 ring-1 ring-stone-200/80 shadow-sm">
                <Clock3 className="h-3.5 w-3.5 text-teal-600" />
                {appointments.length === 0
                  ? "Sin turnos"
                  : appointments.length === 1
                    ? "1 turno"
                    : `${appointments.length} turnos`}
              </span>
              {completedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {completedCount} realizados
                </span>
              )}
              {pendingPayments > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200/70 shadow-sm">
                  <Wallet className="h-3.5 w-3.5" />
                  {pendingPayments} pagos pendientes
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setActiveDialog({ kind: "new-appointment" })}
            size="lg"
          >
            <CalendarPlus className="h-5 w-5" />
            Turno
          </Button>
          <Link
            href="/agenda"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <CalendarClock data-icon="inline-start" className="h-5 w-5" />
            Agenda
          </Link>
        </div>
      </section>

      {deleted && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>Turno eliminado.</span>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await restoreAppointment.mutateAsync({ id: deleted });
              setDeleted(null);
            }}
          >
            Deshacer
          </Button>
        </div>
      )}

      {next && (
        <Card className="overflow-hidden border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-teal-50/30">
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md shadow-amber-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Próximo turno
              </p>
              <p className="mt-0.5 truncate text-lg font-semibold text-stone-900">
                {next.patient?.fullName || next.title || "Sin nombre"}
              </p>
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-stone-600">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Clock3 className="h-3.5 w-3.5 text-amber-600" />
                  {formatTime(next.startTime)} – {formatTime(next.endTime)}
                </span>
                {next.type ? <span>· {next.type.name}</span> : null}
              </p>
              {next.notes && (
                <p className="mt-1 flex items-start gap-1.5 text-sm text-stone-500">
                  <NotebookPen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {next.notes}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setActiveDialog({ kind: "edit-appointment", id: next._id })
              }
            >
              Abrir
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center gap-2">
            <IconBadge tone="teal" className="h-9 w-9 rounded-xl">
              <CalendarClock className="h-4 w-4" />
            </IconBadge>
            <h2 className="text-base font-semibold text-stone-900">
              Turnos de hoy
            </h2>
          </div>
          {loading ? (
            <div className="space-y-2.5">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : appointments.length === 0 ? (
            <Empty
              title="Día libre de turnos"
              hint="Tocá + Turno para cargar el primero"
            />
          ) : (
            <ul className="space-y-2.5">
              {appointments.map((a) => {
                const isNext = next?._id === a._id;
                return (
                  <li key={a._id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setActiveDialog({ kind: "edit-appointment", id: a._id })
                      }
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActiveDialog({ kind: "edit-appointment", id: a._id });
                        }
                      }}
                      className={`w-full rounded-3xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md ${
                        isNext
                          ? "border-amber-300 ring-2 ring-amber-200/80"
                          : "border-stone-200/90"
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
                            <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums text-teal-800">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatTime(a.startTime)}
                            </span>
                            {isNext && (
                              <Badge color="#F59E0B">
                                <Sparkles className="h-3 w-3" />
                                Siguiente
                              </Badge>
                            )}
                            {a.type && (
                              <Badge color={a.type.color}>{a.type.name}</Badge>
                            )}
                          </div>
                          <p className="mt-1 truncate font-semibold text-stone-900">
                            {a.patient?.fullName || a.title || "Sin paciente"}
                          </p>
                           <p className="text-xs text-stone-500">
                             Hasta {formatTime(a.endTime)}
                             {a.status === "completed"
                               ? ` · Pago: ${paymentLabel(a.paymentStatus)}`
                               : a.status === "confirmed"
                                 ? " · Pago al cierre"
                                 : ""}
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
                            className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
                            aria-label="WhatsApp"
                          >
                            <MessageCircle className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                      {a.status === "confirmed" && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                          <Button
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              closeout.mutate({ id: a._id, action: "completed_paid" });
                            }}
                          >
                            {a.type?.tracksPayment === false ? "Realizado" : "Realizado + pagó"}
                          </Button>
                          {a.type?.tracksPayment !== false && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                closeout.mutate({ id: a._id, action: "completed_owes" });
                              }}
                            >
                              Realizado + debe
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              closeout.mutate({ id: a._id, action: "no_show" });
                            }}
                          >
                            Ausente
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              closeout.mutate({ id: a._id, action: "cancelled" });
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <TaskPanel
            date={taskDate}
            today={date}
            onDateChange={(nextDate) =>
              void setTaskDate(nextDate === date ? null : nextDate)
            }
          />

          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <IconBadge tone="amber" className="h-9 w-9 rounded-xl">
                  <BellRing className="h-4 w-4" />
                </IconBadge>
                <h2 className="text-base font-semibold text-stone-900">
                  Avisos
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveDialog({ kind: "new-reminder" })}
                aria-label="Nuevo aviso"
              >
                <BellPlus className="h-4 w-4" />
                Nuevo
              </Button>
            </div>
            {dueReminders.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-stone-500">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                No hay recordatorios pendientes.
              </p>
            ) : (
              <ul className="space-y-2">
                {dueReminders.map((r) => (
                  <li
                    key={r._id}
                    className="rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-3"
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
                          href={whatsappUrl(r.patient.phone, r.patientMessage)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => markDone.mutate({ id: r._id })}
                        className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
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

      <AppointmentModal
        open={activeDialog?.kind === "new-appointment"}
        onClose={() => setActiveDialog(null)}
        title="Nuevo turno"
        defaultDate={date}
        onDone={finishAppointment}
      />

      <Modal
        open={activeDialog?.kind === "new-reminder"}
        onClose={() => setActiveDialog(null)}
        title="Nuevo aviso"
      >
        <NewReminderForm onDone={() => setActiveDialog(null)} />
      </Modal>

      <AppointmentModal
        open={!!editAppt}
        onClose={() => setActiveDialog(null)}
        title="Editar turno"
        initial={editAppt}
        onDone={finishAppointment}
      />
    </div>
  );
}
