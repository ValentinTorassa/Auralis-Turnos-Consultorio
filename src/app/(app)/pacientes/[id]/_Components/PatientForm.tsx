"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useReducer } from "react";
import { Save } from "lucide-react";
import { api } from "../../../../../../convex/_generated/api";
import { Doc, Id } from "../../../../../../convex/_generated/dataModel";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { DatePicker } from "@/components/ui/date-picker";
import { mergeFormState, readableError } from "@/lib/form-state";

type PatientDraft = {
  fullName: string;
  phone: string;
  birthDate: string;
  careType: string;
  adminNotes: string;
  saving: boolean;
  saved: boolean;
  error: string;
};

const CARE_TYPES = [
  "Consultorio",
  "Pericia",
  "Psiquiatría",
  "Armas / CLU",
  "Otro",
];

export function PatientForm({
  id,
  patient,
}: {
  id: Id<"patients">;
  patient: Doc<"patients">;
}) {
  const update = useMutation({
    mutationFn: useConvexMutation(api.patients.update),
  });
  const [draft, updateDraft] = useReducer(mergeFormState<PatientDraft>, {
    fullName: patient.fullName,
    phone: patient.phone ?? "",
    birthDate: patient.birthDate ?? "",
    careType: patient.careType,
    adminNotes: patient.adminNotes ?? "",
    saving: false,
    saved: false,
    error: "",
  });
  const {
    fullName,
    phone,
    birthDate,
    careType,
    adminNotes,
    saving,
    saved,
    error,
  } = draft;

  async function handleSave(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    updateDraft({ saving: true, saved: false, error: "" });
    try {
      await update.mutateAsync({
        id,
        fullName: fullName.trim(),
        phone,
        birthDate,
        careType,
        adminNotes,
      });
      updateDraft({ saved: true });
    } catch (caught) {
      updateDraft({ error: readableError(caught, "No se pudo guardar.") });
    } finally {
      updateDraft({ saving: false });
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <Label htmlFor="patient-detail-name">Nombre y apellido</Label>
        <Input
          id="patient-detail-name"
          value={fullName}
          onChange={(event) => updateDraft({ fullName: event.target.value })}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="patient-detail-phone">Teléfono</Label>
          <Input
            id="patient-detail-phone"
            value={phone}
            onChange={(event) => updateDraft({ phone: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="patient-detail-birth-date">Nacimiento</Label>
          <DatePicker
            id="patient-detail-birth-date"
            value={birthDate}
            onChange={(birthDate) => updateDraft({ birthDate })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="patient-detail-care-type">Tipo de atención</Label>
        <Select
          id="patient-detail-care-type"
          value={careType}
          onChange={(event) => updateDraft({ careType: event.target.value })}
        >
          {CARE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
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
          onChange={(event) => updateDraft({ adminNotes: event.target.value })}
        />
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {saved ? (
          <span className="text-center text-sm text-teal-700 sm:text-right">
            Guardado ✓
          </span>
        ) : null}
        <Button
          type="submit"
          className="w-full sm:min-w-36 sm:w-auto"
          disabled={saving}
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
