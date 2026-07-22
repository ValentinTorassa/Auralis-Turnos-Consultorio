"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Label,
  Select,
  Skeleton,
  Textarea,
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
  Save,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  AppointmentModal,
  AppointmentFormResult,
} from "@/components/AppointmentForm";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

function PatientForm({
  id,
  patient,
}: {
  id: Id<"patients">;
  patient: Doc<"patients">;
}) {
  const update = useMutation(api.patients.update);
  const [fullName, setFullName] = useState(patient.fullName);
  const [phone, setPhone] = useState(patient.phone ?? "");
  const [birthDate, setBirthDate] = useState(patient.birthDate ?? "");
  const [careType, setCareType] = useState(patient.careType);
  const [adminNotes, setAdminNotes] = useState(patient.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await update({ id, fullName, phone, birthDate, careType, adminNotes });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <Label htmlFor="patient-detail-name">Nombre y apellido</Label>
        <Input
          id="patient-detail-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="patient-detail-phone">Teléfono</Label>
          <Input
            id="patient-detail-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="patient-detail-birth-date">Nacimiento</Label>
          <Input
            id="patient-detail-birth-date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="patient-detail-care-type">Tipo de atención</Label>
        <Select
          id="patient-detail-care-type"
          value={careType}
          onChange={(e) => setCareType(e.target.value)}
        >
          {["Consultorio", "Pericia", "Psiquiatría", "Armas / CLU", "Otro"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="patient-detail-admin-notes">
          Observaciones administrativas
        </Label>
        <Textarea
          id="patient-detail-admin-notes"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar"}
        </Button>
        {saved && <span className="text-sm text-teal-700">Guardado ✓</span>}
      </div>
    </form>
  );
}

export default function PacienteDetailPage() {
  const params = useParams();
  const id = params.id as Id<"patients">;
  const data = useQuery(api.patients.get, { id });
  const warnings = useQuery(api.patients.warnings, { patientId: id }) ?? [];
  const [openNew, setOpenNew] = useState(false);
  const [editId, setEditId] = useState<Id<"appointments"> | null>(null);
  const [deleted, setDeleted] = useState<AppointmentFormResult | null>(null);
  const archive = useMutation(api.patients.archive);
  const reactivate = useMutation(api.patients.reactivate);
  const restoreAppointment = useMutation(api.appointments.restore);

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
            onClick={() =>
              void (patient.archivedAt ? reactivate({ id }) : archive({ id }))
            }
          >
            {patient.archivedAt ? "Reactivar" : "Archivar"}
          </Button>
        </div>
      </div>

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
            onClick={async () => {
              await restoreAppointment({ id: deleted.id });
              setDeleted(null);
            }}
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
        <PatientForm key={patient._id} id={id} patient={patient} />
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
        defaultPatientId={id}
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
