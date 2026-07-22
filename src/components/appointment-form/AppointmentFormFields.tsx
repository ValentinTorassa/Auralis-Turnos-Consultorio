"use client";

import { createContext, ReactNode, use } from "react";
import { Doc } from "../../../convex/_generated/dataModel";
import { PatientPicker } from "@/components/PatientPicker";
import {
  Input,
  Label,
  Segmented,
  Select,
  Textarea,
  WarningBox,
} from "@/components/ui";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { timeToMinutes } from "@/lib/appointment-form";
import { AppointmentState } from "./types";

type FieldIds = {
  type: string;
  recurrence: string;
  patientLabel: string;
  patient: string;
  title: string;
  date: string;
  start: string;
  end: string;
  overnight: string;
  notes: string;
  paymentLabel: string;
  paymentMethod: string;
  paymentNotes: string;
  statusLabel: string;
  reminder: string;
  error: string;
};

type AppointmentFieldsContextValue = {
  state: AppointmentState;
  actions: {
    update: (patch: Partial<AppointmentState>) => void;
    changeType: (typeId: string) => void;
    changeStart: (startTime: string) => void;
  };
  meta: {
    types: Doc<"appointmentTypes">[] | undefined;
    warnings: string[] | undefined;
    ids: FieldIds;
    configResolved: boolean;
    editing: boolean;
    showStatus: boolean;
    requiresPatient: boolean;
    tracksPayment: boolean;
    supportsReminder: boolean;
  };
};

const AppointmentFieldsContext =
  createContext<AppointmentFieldsContextValue | null>(null);

function useAppointmentFields() {
  const value = use(AppointmentFieldsContext);
  if (!value) {
    throw new Error(
      "AppointmentFields debe renderizarse dentro de AppointmentFields.Provider.",
    );
  }
  return value;
}

function Provider({
  value,
  children,
}: {
  value: AppointmentFieldsContextValue;
  children: ReactNode;
}) {
  return (
    <AppointmentFieldsContext value={value}>
      {children}
    </AppointmentFieldsContext>
  );
}

function Identity() {
  const {
    state: { patientId, typeId, title, recurrenceCount, errorControlId },
    actions: { update, changeType },
    meta: {
      types,
      warnings,
      ids,
      configResolved,
      editing,
      requiresPatient,
    },
  } = useAppointmentFields();

  return (
    <>
      <div>
        <Label htmlFor={ids.type}>Tipo de actividad</Label>
        <Select
          id={ids.type}
          value={typeId}
          onChange={(event) => changeType(event.target.value)}
          required
          autoFocus
          disabled={!configResolved}
          aria-invalid={errorControlId === ids.type}
          aria-describedby={
            errorControlId === ids.type ? ids.error : undefined
          }
        >
          {(types ?? []).map((type) => (
            <option key={type._id} value={type._id}>
              {type.name}
            </option>
          ))}
        </Select>
      </div>

      {!editing ? (
        <div>
          <Label htmlFor={ids.recurrence}>Repetición semanal</Label>
          <Select
            id={ids.recurrence}
            value={recurrenceCount}
            onChange={(event) =>
              update({
                recurrenceCount: Number(event.target.value) as 1 | 4 | 8 | 12,
              })
            }
          >
            <option value={1}>Solo este turno</option>
            <option value={4}>4 semanas</option>
            <option value={8}>8 semanas</option>
            <option value={12}>12 semanas</option>
          </Select>
          {recurrenceCount > 1 ? (
            <p className="mt-1.5 text-xs text-stone-500">
              Se crearán {recurrenceCount} turnos, uno por semana, solo si todos
              los horarios están disponibles.
            </p>
          ) : null}
        </div>
      ) : null}

      {requiresPatient ? (
        <div>
          <Label id={ids.patientLabel}>Paciente (obligatorio)</Label>
          <PatientPicker
            id={ids.patient}
            aria-labelledby={ids.patientLabel}
            aria-describedby={
              errorControlId === ids.patient ? ids.error : undefined
            }
            aria-invalid={errorControlId === ids.patient}
            value={patientId}
            onChange={(nextPatientId) =>
              update({ patientId: nextPatientId })
            }
          />
        </div>
      ) : null}

      {requiresPatient && warnings && warnings.length > 0 ? (
        <WarningBox items={warnings} />
      ) : null}

      <div>
        <Label htmlFor={ids.title}>
          Título {requiresPatient ? "(opcional)" : "(obligatorio)"}
        </Label>
        <Input
          id={ids.title}
          value={title}
          onChange={(event) => update({ title: event.target.value })}
          placeholder={
            requiresPatient
              ? "Detalle opcional"
              : "Ej. Curso de capacitación"
          }
          required={!requiresPatient}
          aria-invalid={errorControlId === ids.title}
          aria-describedby={
            errorControlId === ids.title ? ids.error : undefined
          }
        />
      </div>
    </>
  );
}

function Schedule() {
  const {
    state: {
      date,
      startTime,
      endTime,
      endsNextDay,
      notes,
      errorControlId,
    },
    actions: { update, changeStart },
    meta: { ids },
  } = useAppointmentFields();

  const invalidRange =
    Boolean(endTime) &&
    timeToMinutes(endTime) <= timeToMinutes(startTime) &&
    !endsNextDay;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor={ids.date}>Fecha</Label>
          <DatePicker
            id={ids.date}
            value={date}
            onChange={(nextDate) => update({ date: nextDate })}
            required
          />
        </div>
        <div>
          <Label htmlFor={ids.start}>Desde</Label>
          <TimePicker
            id={ids.start}
            value={startTime}
            onChange={changeStart}
            required
          />
        </div>
        <div>
          <Label htmlFor={ids.end}>Hasta</Label>
          <TimePicker
            id={ids.end}
            value={endTime}
            onChange={(endTime) => update({ endEdited: true, endTime })}
            required
            aria-invalid={errorControlId === ids.end}
            aria-describedby={
              errorControlId === ids.end ? ids.error : undefined
            }
          />
        </div>
      </div>

      <Field
        orientation="horizontal"
        className="items-center rounded-2xl border border-stone-200 px-3 py-2.5 transition hover:bg-stone-50"
      >
        <Checkbox
          id={ids.overnight}
          checked={endsNextDay}
          onCheckedChange={(endsNextDay) => update({ endsNextDay })}
        />
        <FieldLabel htmlFor={ids.overnight} className="text-sm text-stone-700">
          Finaliza al día siguiente
        </FieldLabel>
      </Field>
      {invalidRange ? (
        <p role="alert" className="text-sm text-amber-700">
          El fin no puede ser anterior al inicio, salvo que finalice mañana.
        </p>
      ) : null}

      <div>
        <Label htmlFor={ids.notes}>Observaciones</Label>
        <Textarea
          id={ids.notes}
          value={notes}
          onChange={(event) => update({ notes: event.target.value })}
          placeholder="Confirmar día anterior, traer informe..."
        />
      </div>
    </>
  );
}

function Payment() {
  const {
    state: { paymentStatus, paymentMethod, paymentNotes },
    actions: { update },
    meta: { ids, tracksPayment },
  } = useAppointmentFields();

  if (!tracksPayment) return null;

  return (
    <>
      <div>
        <Label id={ids.paymentLabel}>Pago</Label>
        <Segmented
          aria-labelledby={ids.paymentLabel}
          value={paymentStatus}
          onChange={(nextStatus) => update({ paymentStatus: nextStatus })}
          options={[
            {
              value: "unpaid",
              label: "Pendiente",
              activeClass: "text-rose-700",
            },
            { value: "paid", label: "Pagó", activeClass: "text-teal-700" },
            { value: "owes", label: "Debe", activeClass: "text-amber-700" },
            { value: "na", label: "N/A" },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={ids.paymentMethod}>Forma de pago</Label>
          <Input
            id={ids.paymentMethod}
            value={paymentMethod}
            onChange={(event) =>
              update({ paymentMethod: event.target.value })
            }
            placeholder="Efectivo, transferencia..."
          />
        </div>
        <div>
          <Label htmlFor={ids.paymentNotes}>Nota de pago</Label>
          <Input
            id={ids.paymentNotes}
            value={paymentNotes}
            onChange={(event) => update({ paymentNotes: event.target.value })}
            placeholder="Observación rápida"
          />
        </div>
      </div>
    </>
  );
}

function StatusAndReminder() {
  const {
    state: { status, reminder },
    actions: { update },
    meta: { ids, showStatus, supportsReminder },
  } = useAppointmentFields();

  return (
    <>
      {showStatus ? (
        <div>
          <Label id={ids.statusLabel}>Estado</Label>
          <Segmented
            aria-labelledby={ids.statusLabel}
            value={status}
            onChange={(nextStatus) => update({ status: nextStatus })}
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
      ) : null}

      {supportsReminder ? (
        <Field
          orientation="horizontal"
          className="items-center rounded-2xl border border-stone-200 px-3 py-3 transition hover:bg-stone-50"
        >
          <Checkbox
            id={ids.reminder}
            checked={reminder}
            onCheckedChange={(reminder) => update({ reminder })}
          />
          <FieldLabel htmlFor={ids.reminder} className="text-sm text-stone-700">
            Recordarme avisar al paciente (24 h antes)
          </FieldLabel>
        </Field>
      ) : null}
    </>
  );
}

export const AppointmentFields = {
  Provider,
  Identity,
  Schedule,
  Payment,
  StatusAndReminder,
};
