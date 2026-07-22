"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useId, useRef, useState } from "react";
import {
  Button,
  Input,
  Label,
  Modal,
  Segmented,
  Select,
  Textarea,
  WarningBox,
} from "./ui";
import { PatientPicker } from "./PatientPicker";
import {
  addDays,
  formatDateTime,
  parseLocalDateTime,
  todayKey,
} from "@/lib/utils";

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

export type AppointmentFormResult = {
  id: Id<"appointments">;
  created: boolean;
  activity: string;
  date: string;
  startTime: number;
  endTime: number;
  deleted?: boolean;
};

type AppointmentFormProps = {
  initial?: Appt;
  defaultDate?: string;
  defaultTime?: string;
  defaultPatientId?: Id<"patients">;
  onDone: (result: AppointmentFormResult) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onCancel?: () => void;
};

export function AppointmentModal({
  open,
  onClose,
  title,
  wide = true,
  ...formProps
}: Omit<AppointmentFormProps, "onDirtyChange" | "onCancel"> & {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
}) {
  const [dirty, setDirty] = useState(false);

  function canClose() {
    return (
      !dirty ||
      window.confirm("Hay cambios sin guardar. ¿Querés cerrar igualmente?")
    );
  }

  function close() {
    setDirty(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      onBeforeClose={canClose}
      title={title}
      wide={wide}
    >
      <AppointmentForm
        {...formProps}
        onDirtyChange={setDirty}
        onCancel={() => {
          if (canClose()) close();
        }}
        onDone={(result) => {
          setDirty(false);
          formProps.onDone(result);
        }}
      />
    </Modal>
  );
}

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
  onDirtyChange,
  onCancel,
}: AppointmentFormProps) {
  const types = useQuery(api.types.list);
  const settings = useQuery(api.settings.get);
  const create = useMutation(api.appointments.create);
  const update = useMutation(api.appointments.update);
  const remove = useMutation(api.appointments.remove);

  const startParts = initial
    ? toDateParts(initial.startTime)
    : { date: defaultDate ?? todayKey(), time: defaultTime ?? "09:00" };
  const endParts = initial ? toDateParts(initial.endTime) : null;

  const [patientId, setPatientId] = useState<Id<"patients"> | undefined>(
    initial?.patientId ?? defaultPatientId,
  );
  const [typeId, setTypeId] = useState<string>(initial?.typeId ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(startParts.date);
  const [startTime, setStartTime] = useState(startParts.time);
  const [endTime, setEndTime] = useState(
    endParts?.time ?? "",
  );
  const [endsNextDay, setEndsNextDay] = useState(
    Boolean(initial && endParts && endParts.date !== startParts.date),
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
  const [recurrenceCount, setRecurrenceCount] = useState<1 | 4 | 8 | 12>(1);
  const [duplicating, setDuplicating] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errorControlId, setErrorControlId] = useState("");
  const [configInitialized, setConfigInitialized] = useState(Boolean(initial));
  const [endEdited, setEndEdited] = useState(false);
  const submittingRef = useRef(false);
  const baselineRef = useRef<string | null>(null);

  const typeControlId = useId();
  const recurrenceControlId = useId();
  const patientLabelId = useId();
  const patientControlId = useId();
  const titleControlId = useId();
  const dateControlId = useId();
  const startControlId = useId();
  const endControlId = useId();
  const overnightControlId = useId();
  const notesControlId = useId();
  const paymentLabelId = useId();
  const paymentMethodControlId = useId();
  const paymentNotesControlId = useId();
  const statusLabelId = useId();
  const reminderControlId = useId();
  const errorId = useId();

  const configResolved = types !== undefined && settings !== undefined;
  const effectiveTypeId = typeId;
  const selectedType = types?.find((type) => type._id === effectiveTypeId);
  const requiresPatient = selectedType?.requiresPatient ?? true;
  const tracksPayment = selectedType?.tracksPayment ?? true;
  const supportsReminder = selectedType?.supportsReminder ?? true;
  const editing = Boolean(initial && !duplicating);

  if (!initial && configResolved && !configInitialized) {
    // Establish query-backed defaults once; later query updates cannot replace edits.
    const defaultType = types[0];
    if (defaultType) {
      setTypeId(defaultType._id);
      if (!endEdited) {
        const duration =
          defaultType.defaultDurationMin ?? settings?.defaultDurationMin ?? 50;
        const nextEnd = timeToMin(startTime) + duration;
        setEndTime(minToTime(nextEnd));
        setEndsNextDay(nextEnd >= 1440);
      }
    }
    setConfigInitialized(true);
  }

  const valueSignature = JSON.stringify([
    patientId ?? "",
    typeId,
    title,
    date,
    startTime,
    endTime,
    endsNextDay,
    notes,
    paymentStatus,
    paymentMethod,
    paymentNotes,
    status,
    reminder,
    recurrenceCount,
    duplicating,
  ]);

  useEffect(() => {
    if (!configInitialized) return;
    if (baselineRef.current === null) {
      baselineRef.current = valueSignature;
      onDirtyChange?.(false);
      return;
    }
    onDirtyChange?.(baselineRef.current !== valueSignature);
  }, [configInitialized, onDirtyChange, valueSignature]);

  const previewStart = date && startTime ? parseLocalDateTime(date, startTime) : 0;
  const previewEnd =
    date && endTime
      ? parseLocalDateTime(date, endTime) + (endsNextDay ? 86400000 : 0)
      : 0;
  const conflictRows = useQuery(
    api.appointments.conflicts,
    previewEnd > previewStart
      ? {
          startTime: previewStart,
          endTime: previewEnd,
          recurrenceCount: editing ? 1 : recurrenceCount,
          excludeId: editing ? initial?._id : undefined,
        }
      : "skip",
  );

  const warnings = useQuery(
    api.patients.warnings,
    patientId ? { patientId } : "skip",
  );

  const canSave = Boolean(
    configResolved && selectedType && date && startTime && endTime,
  );

  function showError(message: string, controlId: string) {
    setError(message);
    setErrorControlId(controlId);
    window.requestAnimationFrame(() => {
      const container = document.getElementById(controlId);
      if (!container) return;
      const focusTarget = container.matches("input, select, textarea, button")
        ? container
        : container.querySelector<HTMLElement>(
            "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])",
          );
      if (focusTarget instanceof HTMLElement) focusTarget.focus();
    });
  }

  function handleStartChange(next: string) {
    // Mantiene la duración corriendo el horario de fin junto con el de inicio.
    const rawDuration =
      timeToMin(endTime) - timeToMin(startTime) + (endsNextDay ? 1440 : 0);
    const duration = Math.max(5, rawDuration);
    setStartTime(next);
    if (next) {
      const nextEnd = timeToMin(next) + duration;
      setEndTime(minToTime(nextEnd));
      setEndsNextDay(nextEnd >= 1440);
    }
  }

  function handleTypeChange(nextId: string) {
    setTypeId(nextId);
    const nextType = types?.find((type) => type._id === nextId);
    if (!nextType) return;
    const duration =
      nextType.defaultDurationMin ?? settings?.defaultDurationMin ?? 50;
    const nextEnd = timeToMin(startTime) + duration;
    setEndTime(minToTime(nextEnd));
    setEndsNextDay(nextEnd >= 1440);
    if (nextType.tracksPayment === false) setPaymentStatus("na");
    if (nextType.supportsReminder === false) setReminder(false);
  }

  async function handleSubmit(allowConflict = false) {
    if (!canSave || submittingRef.current) return;
    if (!selectedType) {
      showError("Elegí un tipo de actividad.", typeControlId);
      return;
    }
    if (requiresPatient && !patientId) {
      showError(
        "Elegí el paciente para este tipo de actividad.",
        patientControlId,
      );
      return;
    }
    if (!requiresPatient && !title.trim()) {
      showError(
        "Ingresá un título para la actividad sin paciente.",
        titleControlId,
      );
      return;
    }
    if (timeToMin(endTime) <= timeToMin(startTime) && !endsNextDay) {
      showError(
        "La hora de fin debe ser posterior. Si termina mañana, marcá ‘Finaliza al día siguiente’.",
        endControlId,
      );
      return;
    }
    if ((conflictRows?.length ?? 0) > 0 && !allowConflict) {
      setShowConflicts(true);
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setError("");
    setErrorControlId("");
    try {
      const start = parseLocalDateTime(date, startTime);
      const end =
        parseLocalDateTime(date, endTime) + (endsNextDay ? 86400000 : 0);
      if (end <= start) {
        throw new Error("La hora de fin debe ser posterior a la de inicio.");
      }
      const submittedPatientId = requiresPatient ? patientId : undefined;
      const submittedPaymentStatus = tracksPayment ? paymentStatus : "na";
      const submittedReminder = supportsReminder ? reminder : false;
      let id: Id<"appointments">;
      if (editing && initial) {
        id = await update({
          id: initial._id,
          patientId: submittedPatientId ?? null,
          typeId: effectiveTypeId as Id<"appointmentTypes">,
          title,
          startTime: start,
          endTime: end,
          notes,
          paymentStatus: submittedPaymentStatus,
          paymentMethod: tracksPayment ? paymentMethod : undefined,
          paymentNotes: tracksPayment ? paymentNotes : undefined,
          status,
          reminderEnabled: submittedReminder,
          allowConflict,
        });
      } else {
        id = await create({
          patientId: submittedPatientId,
          typeId: effectiveTypeId as Id<"appointmentTypes">,
          title: title || undefined,
          startTime: start,
          endTime: end,
          notes,
          paymentStatus: submittedPaymentStatus,
          paymentMethod: tracksPayment ? paymentMethod || undefined : undefined,
          paymentNotes: tracksPayment ? paymentNotes || undefined : undefined,
          reminderEnabled: submittedReminder,
          recurrenceCount,
          allowConflict,
        });
      }
      onDirtyChange?.(false);
      onDone({
        id,
        created: !editing,
        activity: selectedType.name,
        date,
        startTime: start,
        endTime: end,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar";
      if (message.includes("APPOINTMENT_CONFLICT")) {
        setShowConflicts(true);
        setError("");
      } else {
        setError(message.split("Uncaught Error: ").pop()?.split("\n")[0] ?? message);
        setErrorControlId("");
      }
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      className="space-y-4"
    >
      {!configResolved && (
        <p role="status" className="text-sm text-stone-500">
          Cargando tipos de actividad y configuración...
        </p>
      )}

      <div>
        <Label htmlFor={typeControlId}>Tipo de actividad</Label>
        <Select
          id={typeControlId}
          value={effectiveTypeId}
          onChange={(e) => handleTypeChange(e.target.value)}
          required
          autoFocus
          disabled={!configResolved}
          aria-invalid={errorControlId === typeControlId}
          aria-describedby={errorControlId === typeControlId ? errorId : undefined}
        >
          {(types ?? []).map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      {!editing && (
        <div>
          <Label htmlFor={recurrenceControlId}>Repetición semanal</Label>
          <Select
            id={recurrenceControlId}
            value={recurrenceCount}
            onChange={(event) =>
              setRecurrenceCount(Number(event.target.value) as 1 | 4 | 8 | 12)
            }
          >
            <option value={1}>Solo este turno</option>
            <option value={4}>4 semanas</option>
            <option value={8}>8 semanas</option>
            <option value={12}>12 semanas</option>
          </Select>
          {recurrenceCount > 1 && (
            <p className="mt-1.5 text-xs text-stone-500">
              Se crearán {recurrenceCount} turnos, uno por semana, solo si todos
              los horarios están disponibles.
            </p>
          )}
        </div>
      )}

      {requiresPatient && (
        <div>
          <Label id={patientLabelId}>Paciente (obligatorio)</Label>
          <PatientPicker
            id={patientControlId}
            aria-labelledby={patientLabelId}
            aria-describedby={
              errorControlId === patientControlId ? errorId : undefined
            }
            aria-invalid={errorControlId === patientControlId}
            value={patientId}
            onChange={(id) => setPatientId(id)}
          />
        </div>
      )}

      {requiresPatient && warnings && warnings.length > 0 && (
        <WarningBox items={warnings} />
      )}

      <div>
        <Label htmlFor={titleControlId}>
          Título {requiresPatient ? "(opcional)" : "(obligatorio)"}
        </Label>
        <Input
          id={titleControlId}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={requiresPatient ? "Detalle opcional" : "Ej. Curso de capacitación"}
          required={!requiresPatient}
          aria-invalid={errorControlId === titleControlId}
          aria-describedby={errorControlId === titleControlId ? errorId : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor={dateControlId}>Fecha</Label>
          <Input
            id={dateControlId}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor={startControlId}>Desde</Label>
          <Input
            id={startControlId}
            type="time"
            value={startTime}
            onChange={(e) => handleStartChange(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor={endControlId}>Hasta</Label>
          <Input
            id={endControlId}
            type="time"
            value={endTime}
            onChange={(e) => {
              setEndEdited(true);
              setEndTime(e.target.value);
            }}
            required
            aria-invalid={errorControlId === endControlId}
            aria-describedby={errorControlId === endControlId ? errorId : undefined}
          />
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-stone-200 px-3 py-2.5 transition hover:bg-stone-50">
        <input
          id={overnightControlId}
          type="checkbox"
          checked={endsNextDay}
          onChange={(e) => setEndsNextDay(e.target.checked)}
          className="h-5 w-5 rounded border-stone-300 accent-teal-700"
        />
        <span className="text-sm text-stone-700">Finaliza al día siguiente</span>
      </label>
      {endTime && timeToMin(endTime) <= timeToMin(startTime) && !endsNextDay && (
        <p role="alert" className="text-sm text-amber-700">
          El fin no puede ser anterior al inicio, salvo que finalice mañana.
        </p>
      )}

      <div>
        <Label htmlFor={notesControlId}>Observaciones</Label>
        <Textarea
          id={notesControlId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Confirmar día anterior, traer informe..."
        />
      </div>

      {tracksPayment && (
        <div>
          <Label id={paymentLabelId}>Pago</Label>
          <Segmented
            aria-labelledby={paymentLabelId}
            value={paymentStatus}
            onChange={setPaymentStatus}
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
      )}

      {tracksPayment && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={paymentMethodControlId}>Forma de pago</Label>
            <Input
              id={paymentMethodControlId}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="Efectivo, transferencia..."
            />
          </div>
          <div>
            <Label htmlFor={paymentNotesControlId}>Nota de pago</Label>
            <Input
              id={paymentNotesControlId}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Observación rápida"
            />
          </div>
        </div>
      )}

      {initial && (
        <div>
          <Label id={statusLabelId}>Estado</Label>
          <Segmented
            aria-labelledby={statusLabelId}
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

      {supportsReminder && (
        <label className="flex items-center gap-3 rounded-2xl border border-stone-200 px-3 py-3 transition hover:bg-stone-50">
          <input
            id={reminderControlId}
            type="checkbox"
            checked={reminder}
            onChange={(e) => setReminder(e.target.checked)}
            className="h-5 w-5 rounded border-stone-300 accent-teal-700"
          />
          <span className="text-sm text-stone-700">
            Recordarme avisar al paciente (24 h antes)
          </span>
        </label>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-100"
        >
          {error}
        </p>
      )}

      {showConflicts && (conflictRows?.length ?? 0) > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
        >
          <p className="font-semibold">Hay superposición de horarios</p>
          <ul className="mt-1.5 space-y-1">
            {conflictRows?.map((conflict) => (
              <li key={`${conflict._id}-${conflict.occurrenceIndex}`}>
                {formatDateTime(conflict.startTime)} · {" "}
                {conflict.patient?.fullName || conflict.title || "Sin nombre"}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={saving}
            onClick={() => void handleSubmit(true)}
          >
            Guardar de todos modos
          </Button>
        </div>
      )}

      <div className="sticky bottom-0 z-[5] -mx-5 flex flex-wrap gap-2 border-t border-stone-200 bg-white/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(28,25,23,0.08)] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-2 sm:shadow-none">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={!canSave || saving} className="flex-1">
          {saving
            ? "Guardando..."
            : editing
              ? "Guardar cambios"
              : duplicating
                ? "Crear copia"
                : recurrenceCount > 1
                  ? `Crear ${recurrenceCount} turnos`
                  : "Crear turno"}
        </Button>
        {initial && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDuplicating(true);
              setDate(addDays(startParts.date, 7));
              setStatus("confirmed");
              setPaymentStatus(tracksPayment ? "unpaid" : "na");
              setRecurrenceCount(1);
              setShowConflicts(false);
              setError("");
            }}
          >
            Duplicar +1 semana
          </Button>
        )}
        {initial && editing && (
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              if (!confirm("¿Eliminar este turno?")) return;
              await remove({ id: initial._id });
              onDirtyChange?.(false);
              onDone({
                id: initial._id,
                created: false,
                activity: selectedType?.name ?? "Actividad",
                date,
                startTime: initial.startTime,
                endTime: initial.endTime,
                deleted: true,
              });
            }}
          >
            Eliminar
          </Button>
        )}
      </div>
    </form>
  );
}
