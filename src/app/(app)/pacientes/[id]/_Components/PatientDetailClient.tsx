"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import {
  Badge,
  Button,
  Card,
  Empty,
  Skeleton,
  WarningBox,
} from "@/components/ui";
import {
  formatDateTime,
  paymentLabel,
  statusLabel,
  whatsappUrl,
} from "@/lib/utils";
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  MessageCircle,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  AppointmentModal,
  AppointmentFormResult,
} from "@/components/AppointmentForm";
import { ActionError } from "@/components/ActionError";
import Link from "next/link";
import { useState } from "react";
import { readableError } from "@/lib/form-state";
import { PatientForm } from "./PatientForm";

export function PatientDetailClient({ id }: { id: string }) {
  // Backend accepts plain strings and normalizes/validates ownership.
  const { data } = useQuery(convexQuery(api.patients.get, { id }));
  const { data: warnings = [] } = useQuery(
    convexQuery(api.patients.warnings, { patientId: id }),
  );
  const [openNew, setOpenNew] = useState(false);
  const [editId, setEditId] = useState<Id<"appointments"> | null>(null);
  const [deleted, setDeleted] = useState<AppointmentFormResult | null>(null);
  const [actionError, setActionError] = useState("");
  const archive = useMutation({
    mutationFn: useConvexMutation(api.patients.archive),
  });
  const reactivate = useMutation({
    mutationFn: useConvexMutation(api.patients.reactivate),
  });
  const restoreAppointment = useMutation({
    mutationFn: useConvexMutation(api.appointments.restore),
  });
  const archiveBusy = archive.isPending || reactivate.isPending;

  async function runPatientAction(
    action: () => Promise<unknown>,
    fallback: string,
  ) {
    setActionError("");
    try {
      await action();
    } catch (error) {
      setActionError(readableError(error, fallback));
    }
  }

  if (data === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-2/3" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (!data) {
    return <Empty title="Paciente no encontrado" />;
  }

  const { patient, appointments, stats, nextAppointment } = data;
  const editAppointment = appointments.find((appointment) => appointment._id === editId);

  function handleAppointmentDone(result: AppointmentFormResult) {
    setOpenNew(false);
    setEditId(null);
    if (result.deleted) setDeleted(result);
  }

  return (
    <div className="anim-page space-y-5">
      <div className="flex items-start gap-3">
        <Link
          href="/pacientes"
          className="mt-1 rounded-xl p-2 transition hover:bg-stone-100"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold text-stone-900">
            {patient.fullName}
          </h1>
          <p className="text-sm text-stone-500">{patient.careType}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenNew(true)} disabled={Boolean(patient.archivedAt)}>
            <CalendarPlus className="h-4 w-4" />
            Turno
          </Button>
          {patient.phone && (
            <a href={whatsappUrl(patient.phone)} target="_blank" rel="noreferrer">
              <Button variant="secondary">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </a>
          )}
          <Button
            variant="outline"
            disabled={archiveBusy}
            onClick={() =>
              void runPatientAction(
                () =>
                  patient.archivedAt
                    ? reactivate.mutateAsync({ id: patient._id })
                    : archive.mutateAsync({ id: patient._id }),
                patient.archivedAt
                  ? "No se pudo reactivar la ficha."
                  : "No se pudo archivar la ficha.",
              )
            }
          >
            {patient.archivedAt ? "Reactivar" : "Archivar"}
          </Button>
        </div>
      </div>

      <ActionError message={actionError} onDismiss={() => setActionError("")} />

      {patient.archivedAt && (
        <p className="rounded-2xl border border-stone-200 bg-stone-100 px-4 py-3 text-sm text-stone-700">
          Esta ficha está archivada. Reactivala para asignarle nuevos turnos.
        </p>
      )}

      {deleted && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>Turno eliminado.</span>
          <Button
            size="sm"
            variant="outline"
            disabled={restoreAppointment.isPending}
            onClick={() =>
              void runPatientAction(async () => {
                await restoreAppointment.mutateAsync({ id: deleted.id });
                setDeleted(null);
              }, "No se pudo restaurar el turno.")
            }
          >
            Deshacer
          </Button>
        </div>
      )}

      <WarningBox items={warnings} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-stone-500">
            <CalendarClock className="h-3.5 w-3.5 text-teal-600" />
            Turnos
          </p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {stats.total}
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-stone-500">
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            Cancel. últimos {stats.last10Count || 10}
          </p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {stats.cancelledInLast10}
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-stone-500">
            <Wallet className="h-3.5 w-3.5 text-amber-600" />
            Sin pagar
          </p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {stats.unpaidCount}
          </p>
        </Card>
      </div>

      {nextAppointment && (
        <Card className="border-teal-200 bg-teal-50/50 p-4">
          <p className="text-xs font-semibold uppercase text-teal-700">
            Próximo turno
          </p>
          <p className="mt-1 font-semibold text-stone-900">
            {formatDateTime(nextAppointment.startTime)}
          </p>
          {nextAppointment.type && (
            <Badge color={nextAppointment.type.color} className="mt-2">
              {nextAppointment.type.name}
            </Badge>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Ficha administrativa</h2>
        <PatientForm key={patient._id} id={patient._id} patient={patient} />
      </Card>

      <section>
        <h2 className="mb-3 text-base font-semibold">Historial de turnos</h2>
        {appointments.length === 0 ? (
          <Empty title="Sin turnos todavía" />
        ) : (
          <ul className="space-y-2">
            {appointments.map((a) => (
              <li
                key={a._id}
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
              >
                <button
                  type="button"
                  className="block w-full text-left transition hover:text-teal-800"
                  onClick={() => setEditId(a._id)}
                >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-stone-900">
                    {formatDateTime(a.startTime)}
                  </span>
                  {a.type && <Badge color={a.type.color}>{a.type.name}</Badge>}
                   <span className="text-xs text-stone-500">
                     {statusLabel(a.status)}
                     {a.status === "completed"
                       ? ` · ${paymentLabel(a.paymentStatus)}`
                       : ""}
                   </span>
                </div>
                {a.notes && (
                  <p className="mt-1 text-sm text-stone-500">{a.notes}</p>
                )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AppointmentModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        title={`Nuevo turno · ${patient.fullName}`}
        defaultPatientId={patient._id}
        onDone={handleAppointmentDone}
      />

      <AppointmentModal
        open={!!editAppointment}
        onClose={() => setEditId(null)}
        title="Editar turno"
        initial={editAppointment}
        onDone={handleAppointmentDone}
      />
    </div>
  );
}
