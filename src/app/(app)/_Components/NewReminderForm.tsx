"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useReducer } from "react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { PatientPicker } from "@/components/PatientPicker";
import { Button, Label, Textarea } from "@/components/ui";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { mergeFormState, readableError } from "@/lib/form-state";
import { parseLocalDateTime, todayKey } from "@/lib/utils";

type ReminderDraft = {
  message: string;
  patientId?: Id<"patients">;
  date: string;
  time: string;
  saving: boolean;
  error: string;
};

export function NewReminderForm({ onDone }: { onDone: () => void }) {
  const createReminder = useMutation({
    mutationFn: useConvexMutation(api.reminders.create),
  });
  const [draft, updateDraft] = useReducer(mergeFormState<ReminderDraft>, {
    message: "",
    patientId: undefined,
    date: todayKey(),
    time: "09:00",
    saving: false,
    error: "",
  });
  const { message, patientId, date, time, saving, error } = draft;

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;

    updateDraft({ saving: true, error: "" });
    try {
      await createReminder.mutateAsync({
        message: message.trim(),
        patientId,
        dueAt: parseLocalDateTime(date, time),
      });
      onDone();
    } catch (caught) {
      updateDraft({
        error: readableError(caught, "No se pudo crear el aviso."),
      });
    } finally {
      updateDraft({ saving: false });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="new-reminder-message">Mensaje</Label>
        <Textarea
          id="new-reminder-message"
          value={message}
          onChange={(event) => updateDraft({ message: event.target.value })}
          placeholder="Ej. Confirmar turno, pedir informe..."
          autoFocus
          required
        />
      </div>
      <div>
        <Label id="new-reminder-patient-label">Paciente (opcional)</Label>
        <PatientPicker
          id="new-reminder-patient"
          aria-labelledby="new-reminder-patient-label"
          value={patientId}
          onChange={(patientId) => updateDraft({ patientId })}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="new-reminder-date">Fecha</Label>
          <DatePicker
            id="new-reminder-date"
            value={date}
            onChange={(date) => updateDraft({ date })}
            required
          />
        </div>
        <div>
          <Label htmlFor="new-reminder-time">Hora</Label>
          <TimePicker
            id="new-reminder-time"
            value={time}
            onChange={(time) => updateDraft({ time })}
            required
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={saving || !message.trim()}
      >
        {saving ? "Guardando..." : "Crear aviso"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
