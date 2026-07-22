"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  useEffect,
  useEffectEvent,
  useId,
  useReducer,
  useRef,
  useState,
} from "react";
import { Button, Modal } from "./ui";
import {
  addDays,
  formatDateTime,
  parseLocalDateTime,
} from "@/lib/utils";
import { mergeFormState, readableError } from "@/lib/form-state";
import {
  appointmentDateParts,
  minutesToTime,
  timeToMinutes,
} from "@/lib/appointment-form";
import { AppointmentFields } from "./appointment-form/AppointmentFormFields";
import {
  AppointmentRecord,
  AppointmentState,
} from "./appointment-form/types";

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
  initial?: AppointmentRecord;
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

export function AppointmentForm({
  initial,
  defaultDate,
  defaultTime,
  defaultPatientId,
  onDone,
  onDirtyChange,
  onCancel,
}: AppointmentFormProps) {
  const { data: types } = useQuery(convexQuery(api.types.list, {}));
  const { data: settings } = useQuery(convexQuery(api.settings.get, {}));
  const create = useMutation({
    mutationFn: useConvexMutation(api.appointments.create),
  });
  const update = useMutation({
    mutationFn: useConvexMutation(api.appointments.update),
  });
  const remove = useMutation({
    mutationFn: useConvexMutation(api.appointments.remove),
  });

  const startParts = initial
    ? appointmentDateParts(initial.startTime)
    : { date: defaultDate ?? "", time: defaultTime ?? "09:00" };
  const endParts = initial ? appointmentDateParts(initial.endTime) : null;

  const [state, updateState] = useReducer(mergeFormState<AppointmentState>, {
    patientId: initial?.patientId ?? defaultPatientId,
    typeId: initial?.typeId ?? "",
    title: initial?.title ?? "",
    date: startParts.date,
    startTime: startParts.time,
    endTime: endParts?.time ?? "",
    endsNextDay: Boolean(
      initial && endParts && endParts.date !== startParts.date,
    ),
    notes: initial?.notes ?? "",
    paymentStatus: initial?.paymentStatus ?? "unpaid",
    paymentMethod: initial?.paymentMethod ?? "",
    paymentNotes: initial?.paymentNotes ?? "",
    status: initial?.status ?? "confirmed",
    reminder: initial?.reminderEnabled ?? false,
    recurrenceCount: 1,
    duplicating: false,
    showConflicts: false,
    error: "",
    errorControlId: "",
    configInitialized: Boolean(initial),
    endEdited: false,
  });
  const {
    patientId,
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
    showConflicts,
    error,
    configInitialized,
    endEdited,
  } = state;
  const setTypeId = (typeId: string) => updateState({ typeId });
  const setDate = (date: string) => updateState({ date });
  const setStartTime = (startTime: string) => updateState({ startTime });
  const setEndTime = (endTime: string) => updateState({ endTime });
  const setEndsNextDay = (endsNextDay: boolean) => updateState({ endsNextDay });
  const setPaymentStatus = (
    paymentStatus: AppointmentRecord["paymentStatus"],
  ) =>
    updateState({ paymentStatus });
  const setStatus = (status: AppointmentRecord["status"]) =>
    updateState({ status });
  const setReminder = (reminder: boolean) => updateState({ reminder });
  const setRecurrenceCount = (recurrenceCount: 1 | 4 | 8 | 12) =>
    updateState({ recurrenceCount });
  const setDuplicating = (duplicating: boolean) => updateState({ duplicating });
  const setShowConflicts = (showConflicts: boolean) => updateState({ showConflicts });
  const setError = (error: string) => updateState({ error });
  const setErrorControlId = (errorControlId: string) => updateState({ errorControlId });
  const saving = create.isPending || update.isPending || remove.isPending;
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
      const patch: Partial<AppointmentState> = {
        typeId: defaultType._id,
        configInitialized: true,
      };
      if (!endEdited) {
        const duration =
          defaultType.defaultDurationMin ?? settings?.defaultDurationMin ?? 50;
        const nextEnd = timeToMinutes(startTime) + duration;
        patch.endTime = minutesToTime(nextEnd);
        patch.endsNextDay = nextEnd >= 1440;
      }
      updateState(patch);
    } else {
      updateState({ configInitialized: true });
    }
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

  const notifyDirtyChange = useEffectEvent((dirty: boolean) => {
    onDirtyChange?.(dirty);
  });

  useEffect(() => {
    if (!configInitialized) return;
    if (baselineRef.current === null) {
      baselineRef.current = valueSignature;
      notifyDirtyChange(false);
      return;
    }
    notifyDirtyChange(baselineRef.current !== valueSignature);
  }, [configInitialized, valueSignature]);

  const previewStart = date && startTime ? parseLocalDateTime(date, startTime) : 0;
  const previewEnd =
    date && endTime
      ? parseLocalDateTime(date, endTime) + (endsNextDay ? 86400000 : 0)
      : 0;
  const { data: conflictRows } = useQuery(
    convexQuery(
      api.appointments.conflicts,
      previewEnd > previewStart
        ? {
            startTime: previewStart,
            endTime: previewEnd,
            recurrenceCount: editing ? 1 : recurrenceCount,
            excludeId: editing ? initial?._id : undefined,
          }
        : "skip",
    ),
  );

  const { data: warnings } = useQuery(
    convexQuery(
      api.patients.warnings,
      patientId ? { patientId } : "skip",
    ),
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
      timeToMinutes(endTime) -
      timeToMinutes(startTime) +
      (endsNextDay ? 1440 : 0);
    const duration = Math.max(5, rawDuration);
    setStartTime(next);
    if (next) {
      const nextEnd = timeToMinutes(next) + duration;
      setEndTime(minutesToTime(nextEnd));
      setEndsNextDay(nextEnd >= 1440);
    }
  }

  function handleTypeChange(nextId: string) {
    setTypeId(nextId);
    const nextType = types?.find((type) => type._id === nextId);
    if (!nextType) return;
    const duration =
      nextType.defaultDurationMin ?? settings?.defaultDurationMin ?? 50;
    const nextEnd = timeToMinutes(startTime) + duration;
    setEndTime(minutesToTime(nextEnd));
    setEndsNextDay(nextEnd >= 1440);
    if (nextType.tracksPayment === false) setPaymentStatus("na");
    if (nextType.supportsReminder === false) setReminder(false);
  }

  async function saveAppointment(allowConflict = false) {
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
    if (
      timeToMinutes(endTime) <= timeToMinutes(startTime) &&
      !endsNextDay
    ) {
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
    updateState({ error: "", errorControlId: "" });
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
        id = await update.mutateAsync({
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
        id = await create.mutateAsync({
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
        updateState({ showConflicts: true, error: "" });
      } else {
        updateState({
          error: readableError(err, "Error al guardar"),
          errorControlId: "",
        });
      }
    } finally {
      submittingRef.current = false;
    }
  }

  function handleFormSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveAppointment();
  }

  return (
    <form
      onSubmit={handleFormSubmit}
      className="space-y-4"
    >
      {!configResolved && (
        <p role="status" className="text-sm text-stone-500">
          Cargando tipos de actividad y configuración...
        </p>
      )}
      <AppointmentFields.Provider
        value={{
          state,
          actions: {
            update: updateState,
            changeType: handleTypeChange,
            changeStart: handleStartChange,
          },
          meta: {
            types,
            warnings,
            ids: {
              type: typeControlId,
              recurrence: recurrenceControlId,
              patientLabel: patientLabelId,
              patient: patientControlId,
              title: titleControlId,
              date: dateControlId,
              start: startControlId,
              end: endControlId,
              overnight: overnightControlId,
              notes: notesControlId,
              paymentLabel: paymentLabelId,
              paymentMethod: paymentMethodControlId,
              paymentNotes: paymentNotesControlId,
              statusLabel: statusLabelId,
              reminder: reminderControlId,
              error: errorId,
            },
            configResolved,
            editing,
            showStatus: Boolean(initial),
            requiresPatient,
            tracksPayment,
            supportsReminder,
          },
        }}
      >
        <AppointmentFields.Identity />
        <AppointmentFields.Schedule />
        <AppointmentFields.Payment />
        <AppointmentFields.StatusAndReminder />
      </AppointmentFields.Provider>

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
            onClick={() => void saveAppointment(true)}
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
              await remove.mutateAsync({ id: initial._id });
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
