"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Segmented,
  Select,
  Textarea,
  WarningBox,
} from "./ui";
import { PatientPicker } from "./PatientPicker";
import { parseLocalDateTime, todayKey } from "@/lib/utils";

type Appt = {
  _id: Id<"appointments">;
  patientId?: Id<"patients">;
  typeId: Id<"appointmentTypes">;
  title?: string;
  startTime: number;
  endTime: number;
  notes?: string;
  paymentStatus: "paid" | "unpaid" | "owes" | "na";
  paymentMethod?: string;
  paymentNotes?: string;
  status: "confirmed" | "cancelled" | "no_show" | "completed";
  reminderEnabled: boolean;
};

function toDateParts(ms: number) {
  const d = new Date(ms);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minToTime(total: number): string {
  const clamped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

export function AppointmentForm({
  initial,
  defaultDate,
  defaultTime,
  defaultPatientId,
  onDone,
}: {
  initial?: Appt;
  defaultDate?: string;
  defaultTime?: string;
  defaultPatientId?: Id<"patients">;
  onDone: () => void;
}) {
  const types = useQuery(api.types.list);
  const settings = useQuery(api.settings.get);
  const create = useMutation(api.appointments.create);
  const update = useMutation(api.appointments.update);
  const remove = useMutation(api.appointments.remove);
  const addReminder = useMutation(api.reminders.fromAppointment);

  const startParts = initial
    ? toDateParts(initial.startTime)
    : { date: defaultDate ?? todayKey(), time: defaultTime ?? "09:00" };
  const endParts = initial ? toDateParts(initial.endTime) : null;

  const defaultDuration = settings?.defaultDurationMin ?? 50;

  const [patientId, setPatientId] = useState<Id<"patients"> | undefined>(
    initial?.patientId ?? defaultPatientId,
  );
  const [typeId, setTypeId] = useState<string>(initial?.typeId ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(startParts.date);
  const [startTime, setStartTime] = useState(startParts.time);
  const [endTime, setEndTime] = useState(
    endParts?.time ?? minToTime(timeToMin(startParts.time) + defaultDuration),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [paymentStatus, setPaymentStatus] = useState<Appt["paymentStatus"]>(
    initial?.paymentStatus ?? "unpaid",
  );
  const [paymentMethod, setPaymentMethod] = useState(
    initial?.paymentMethod ?? "",
  );
  const [paymentNotes, setPaymentNotes] = useState(initial?.paymentNotes ?? "");
  const [status, setStatus] = useState<Appt["status"]>(
    initial?.status ?? "confirmed",
  );
  const [reminder, setReminder] = useState(initial?.reminderEnabled ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Sin efecto: si todavía no se eligió tipo, usamos el primero disponible.
  const effectiveTypeId = typeId || types?.[0]?._id || "";

  const warnings = useQuery(
    api.patients.warnings,
    patientId ? { patientId } : "skip",
  );

  const canSave = Boolean(effectiveTypeId && date && startTime && endTime);

  function handleStartChange(next: string) {
    // Mantiene la duración corriendo el horario de fin junto con el de inicio.
    const duration = Math.max(5, timeToMin(endTime) - timeToMin(startTime));
    setStartTime(next);
    if (next) setEndTime(minToTime(timeToMin(next) + duration));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const start = parseLocalDateTime(date, startTime);
      const end = parseLocalDateTime(date, endTime);
      if (initial) {
        await update({
          id: initial._id,
          patientId: patientId ?? null,
          typeId: effectiveTypeId as Id<"appointmentTypes">,
          title: title || undefined,
          startTime: start,
          endTime: end,
          notes,
          paymentStatus,
          paymentMethod: paymentMethod || undefined,
          paymentNotes: paymentNotes || undefined,
          status,
          reminderEnabled: reminder,
        });
        if (reminder && !initial.reminderEnabled) {
          await addReminder({ appointmentId: initial._id, hoursBefore: 24 });
        }
      } else {
        const id = await create({
          patientId,
          typeId: effectiveTypeId as Id<"appointmentTypes">,
          title: title || undefined,
          startTime: start,
          endTime: end,
          notes,
          paymentStatus,
          paymentMethod: paymentMethod || undefined,
          paymentNotes: paymentNotes || undefined,
          reminderEnabled: reminder,
        });
        if (reminder) {
          await addReminder({ appointmentId: id, hoursBefore: 24 });
        }
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Paciente</Label>
        <PatientPicker value={patientId} onChange={(id) => setPatientId(id)} />
      </div>

      {warnings && warnings.length > 0 && <WarningBox items={warnings} />}

      <div>
        <Label>Tipo de turno</Label>
        <Select
          value={effectiveTypeId}
          onChange={(e) => setTypeId(e.target.value)}
          required
        >
          {(types ?? []).map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Título (opcional)</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Si no hay paciente, ej. Reunión"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 sm:col-span-1">
          <Label>Fecha</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Desde</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => handleStartChange(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Hasta</Label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label>Observaciones</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Confirmar día anterior, traer informe..."
        />
      </div>

      <div>
        <Label>Pago</Label>
        <Segmented
          value={paymentStatus}
          onChange={setPaymentStatus}
          options={[
            {
              value: "unpaid",
              label: "No pagó",
              activeClass: "text-rose-700",
            },
            { value: "paid", label: "Pagó", activeClass: "text-teal-700" },
            { value: "owes", label: "Debe", activeClass: "text-amber-700" },
            { value: "na", label: "N/A" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Forma de pago</Label>
          <Input
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="Efectivo, transferencia..."
          />
        </div>
        <div>
          <Label>Nota de pago</Label>
          <Input
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="Observación rápida"
          />
        </div>
      </div>

      {initial && (
        <div>
          <Label>Estado</Label>
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              {
                value: "confirmed",
                label: "Confirmado",
                activeClass: "text-teal-700",
              },
              {
                value: "completed",
                label: "Realizado",
                activeClass: "text-emerald-700",
              },
              {
                value: "cancelled",
                label: "Cancelado",
                activeClass: "text-rose-700",
              },
              {
                value: "no_show",
                label: "Ausente",
                activeClass: "text-amber-700",
              },
            ]}
          />
        </div>
      )}

      <label className="flex items-center gap-3 rounded-2xl border border-stone-200 px-3 py-3 transition hover:bg-stone-50">
        <input
          type="checkbox"
          checked={reminder}
          onChange={(e) => setReminder(e.target.checked)}
          className="h-5 w-5 rounded border-stone-300 accent-teal-700"
        />
        <span className="text-sm text-stone-700">
          Recordarme avisar al paciente (24 h antes)
        </span>
      </label>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-100">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={!canSave || saving} className="flex-1">
          {saving ? "Guardando..." : initial ? "Guardar cambios" : "Crear turno"}
        </Button>
        {initial && (
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              if (!confirm("¿Eliminar este turno?")) return;
              await remove({ id: initial._id });
              onDone();
            }}
          >
            Eliminar
          </Button>
        )}
      </div>
    </form>
  );
}
