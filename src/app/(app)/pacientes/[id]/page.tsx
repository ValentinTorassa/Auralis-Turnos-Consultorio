"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Label,
  Select,
  Textarea,
  WarningBox,
} from "@/components/ui";
import {
  formatDateTime,
  paymentLabel,
  statusLabel,
  whatsappUrl,
} from "@/lib/utils";
import { ArrowLeft, MessageCircle, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PacienteDetailPage() {
  const params = useParams();
  const id = params.id as Id<"patients">;
  const data = useQuery(api.patients.get, { id });
  const warnings = useQuery(api.patients.warnings, { patientId: id }) ?? [];
  const update = useMutation(api.patients.update);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [careType, setCareType] = useState("Consultorio");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data?.patient) return;
    setFullName(data.patient.fullName);
    setPhone(data.patient.phone ?? "");
    setBirthDate(data.patient.birthDate ?? "");
    setCareType(data.patient.careType);
    setAdminNotes(data.patient.adminNotes ?? "");
  }, [data?.patient]);

  if (data === undefined) {
    return <p className="text-sm text-stone-500">Cargando...</p>;
  }
  if (!data) {
    return <Empty title="Paciente no encontrado" />;
  }

  const { patient, appointments, stats, nextAppointment } = data;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await update({
        id,
        fullName,
        phone,
        birthDate,
        careType,
        adminNotes,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Link
          href="/pacientes"
          className="mt-1 rounded-xl p-2 hover:bg-stone-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold text-stone-900">
            {patient.fullName}
          </h1>
          <p className="text-sm text-stone-500">{patient.careType}</p>
        </div>
        {patient.phone && (
          <a
            href={whatsappUrl(patient.phone)}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="secondary">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </a>
        )}
      </div>

      <WarningBox items={warnings} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-stone-500">Turnos</p>
          <p className="text-2xl font-semibold text-stone-900">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-stone-500">
            Cancel. últimos {stats.last10Count || 10}
          </p>
          <p className="text-2xl font-semibold text-stone-900">
            {stats.cancelledInLast10}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-stone-500">Sin pagar</p>
          <p className="text-2xl font-semibold text-stone-900">
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
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label>Nombre y apellido</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Teléfono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Nacimiento</Label>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Tipo de atención</Label>
            <Select value={careType} onChange={(e) => setCareType(e.target.value)}>
              {["Consultorio", "Pericia", "Psiquiatría", "Otro"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Observaciones administrativas</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar"}
            </Button>
            {saved && <span className="text-sm text-teal-700">Guardado</span>}
          </div>
        </form>
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-stone-900">
                    {formatDateTime(a.startTime)}
                  </span>
                  {a.type && <Badge color={a.type.color}>{a.type.name}</Badge>}
                  <span className="text-xs text-stone-500">
                    {statusLabel(a.status)} · {paymentLabel(a.paymentStatus)}
                  </span>
                </div>
                {a.notes && (
                  <p className="mt-1 text-sm text-stone-500">{a.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
