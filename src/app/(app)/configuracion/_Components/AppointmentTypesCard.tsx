"use client";

import { useMutation, useQuery } from "convex/react";
import { useId, useReducer } from "react";
import { api } from "../../../../../convex/_generated/api";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { Button, Card, Input, Label } from "@/components/ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { mergeFormState, readableError } from "@/lib/form-state";
import { Check, Palette, Pencil, Trash2, X } from "lucide-react";

type TypeDraft = {
  editing: boolean;
  name: string;
  color: string;
  requiresPatient: boolean;
  tracksPayment: boolean;
  supportsReminder: boolean;
  defaultDurationMin: number;
  error: string;
};

type NewTypeDraft = Omit<TypeDraft, "editing">;

function draftFromType(type: Doc<"appointmentTypes">): TypeDraft {
  return {
    editing: false,
    name: type.name,
    color: type.color,
    requiresPatient: type.requiresPatient ?? true,
    tracksPayment: type.tracksPayment ?? true,
    supportsReminder: type.supportsReminder ?? true,
    defaultDurationMin: type.defaultDurationMin ?? 50,
    error: "",
  };
}

function TypeCapabilities({
  requiresPatient,
  tracksPayment,
  supportsReminder,
  onChange,
}: Pick<
  TypeDraft,
  "requiresPatient" | "tracksPayment" | "supportsReminder"
> & {
  onChange: (patch: Partial<TypeDraft>) => void;
}) {
  const fieldId = useId();

  return (
    <FieldSet>
      <FieldLegend className="sr-only">Opciones del tipo de actividad</FieldLegend>
      <FieldGroup className="flex-row flex-wrap gap-x-4 gap-y-2">
        <Field orientation="horizontal" className="w-auto gap-2">
          <Checkbox
            id={`${fieldId}-patient`}
          checked={requiresPatient}
            onCheckedChange={(requiresPatient) =>
              onChange({ requiresPatient })
            }
          />
          <FieldLabel htmlFor={`${fieldId}-patient`} className="text-xs text-stone-700">
            Requiere paciente
          </FieldLabel>
        </Field>
        <Field orientation="horizontal" className="w-auto gap-2">
          <Checkbox
            id={`${fieldId}-payment`}
          checked={tracksPayment}
            onCheckedChange={(tracksPayment) => onChange({ tracksPayment })}
          />
          <FieldLabel htmlFor={`${fieldId}-payment`} className="text-xs text-stone-700">
            Registra pago
          </FieldLabel>
        </Field>
        <Field orientation="horizontal" className="w-auto gap-2">
          <Checkbox
            id={`${fieldId}-reminder`}
          checked={supportsReminder}
            onCheckedChange={(supportsReminder) =>
              onChange({ supportsReminder })
            }
          />
          <FieldLabel htmlFor={`${fieldId}-reminder`} className="text-xs text-stone-700">
            Admite aviso
          </FieldLabel>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}

function TypeRow({ type }: { type: Doc<"appointmentTypes"> }) {
  const durationId = useId();
  const updateType = useMutation(api.types.update);
  const removeType = useMutation(api.types.remove);
  const [draft, updateDraft] = useReducer(
    mergeFormState<TypeDraft>,
    draftFromType(type),
  );
  const {
    editing,
    name,
    color,
    requiresPatient,
    tracksPayment,
    supportsReminder,
    defaultDurationMin,
    error,
  } = draft;

  async function handleSave() {
    if (!name.trim()) return;
    updateDraft({ error: "" });
    try {
      await updateType({
        id: type._id,
        name: name.trim(),
        color,
        requiresPatient,
        tracksPayment,
        supportsReminder,
        defaultDurationMin,
      });
      updateDraft({ editing: false });
    } catch (caught) {
      updateDraft({ error: readableError(caught, "No se pudo actualizar.") });
    }
  }

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar el tipo "${type.name}"?`)) return;
    updateDraft({ error: "" });
    try {
      await removeType({ id: type._id });
    } catch (caught) {
      updateDraft({
        error:
          caught instanceof Error && caught.message.includes("turnos")
            ? "No se puede eliminar: hay turnos que usan este tipo."
            : "No se pudo eliminar.",
      });
    }
  }

  return (
    <li className="rounded-xl border border-stone-100 px-3 py-2 transition hover:border-stone-200">
      {editing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="color"
              aria-label={`Color de ${type.name}`}
              className="h-9 w-12 shrink-0"
              value={color}
              onChange={(event) => updateDraft({ color: event.target.value })}
            />
            <Input
              aria-label="Nombre del tipo de actividad"
              className="h-9"
              value={name}
              onChange={(event) => updateDraft({ name: event.target.value })}
              autoFocus
            />
          </div>
          <TypeCapabilities
            requiresPatient={requiresPatient}
            tracksPayment={tracksPayment}
            supportsReminder={supportsReminder}
            onChange={updateDraft}
          />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor={durationId} className="text-xs">
                Duración por defecto (min)
              </Label>
              <Input
                id={durationId}
                type="number"
                min={5}
                step={5}
                className="h-9"
                value={defaultDurationMin}
                onChange={(event) =>
                  updateDraft({
                    defaultDurationMin: Number(event.target.value),
                  })
                }
              />
            </div>
            <Button
              type="button"
              onClick={() => void handleSave()}
              size="icon-sm"
              aria-label="Guardar"
            >
              <Check />
            </Button>
            <Button
              type="button"
              onClick={() => updateDraft(draftFromType(type))}
              size="icon-sm"
              variant="ghost"
              aria-label="Cancelar"
            >
              <X />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 shrink-0 rounded-full shadow-sm ring-2 ring-white"
            style={{ backgroundColor: type.color }}
          />
          <span className="flex-1 truncate text-sm font-medium text-stone-800">
            {type.name}
          </span>
          {type.isPsychiatrist ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200/70">
              Psiquiatría
            </span>
          ) : null}
          <span className="hidden text-[11px] text-stone-400 sm:inline">
            {type.requiresPatient === false ? "Sin paciente" : "Paciente"} ·{" "}
            {type.defaultDurationMin ?? 50} min
          </span>
          <Button
            type="button"
            onClick={() => updateDraft({ editing: true })}
            size="icon-sm"
            variant="ghost"
            aria-label="Editar"
          >
            <Pencil />
          </Button>
          {!type.isSystemType ? (
            <Button
              type="button"
              onClick={() => void handleDelete()}
              size="icon-sm"
              variant="destructive"
              aria-label="Eliminar"
            >
              <Trash2 />
            </Button>
          ) : null}
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-rose-600">
          {error}
        </p>
      ) : null}
    </li>
  );
}

const initialNewTypeDraft: NewTypeDraft = {
  name: "",
  color: "#6366F1",
  requiresPatient: true,
  tracksPayment: true,
  supportsReminder: true,
  defaultDurationMin: 50,
  error: "",
};

export function AppointmentTypesCard() {
  const types = useQuery(api.types.list) ?? [];
  const createType = useMutation(api.types.create);
  const [draft, updateDraft] = useReducer(
    mergeFormState<NewTypeDraft>,
    initialNewTypeDraft,
  );
  const {
    name,
    color,
    requiresPatient,
    tracksPayment,
    supportsReminder,
    defaultDurationMin,
    error,
  } = draft;

  async function handleCreate(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || defaultDurationMin < 5) return;

    updateDraft({ error: "" });
    try {
      await createType({
        name: name.trim(),
        color,
        requiresPatient,
        tracksPayment,
        supportsReminder,
        defaultDurationMin,
      });
      updateDraft({ ...initialNewTypeDraft });
    } catch (caught) {
      updateDraft({ error: readableError(caught, "No se pudo crear el tipo.") });
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Palette className="h-4 w-4 text-teal-700" />
        Tipos de actividad
      </h2>
      <ul className="mb-4 space-y-2">
        {types.map((type) => (
          <TypeRow key={type._id} type={type} />
        ))}
      </ul>
      <form
        onSubmit={handleCreate}
        className="space-y-3 rounded-2xl bg-stone-50 p-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="Nombre del nuevo tipo de actividad"
            placeholder="Nuevo tipo..."
            value={name}
            onChange={(event) => updateDraft({ name: event.target.value })}
          />
          <Input
            type="color"
            aria-label="Color del nuevo tipo de actividad"
            className="h-11 w-full sm:w-20"
            value={color}
            onChange={(event) => updateDraft({ color: event.target.value })}
          />
          <Input
            type="number"
            min={5}
            step={5}
            aria-label="Duración por defecto en minutos"
            className="sm:w-28"
            value={defaultDurationMin}
            onChange={(event) =>
              updateDraft({ defaultDurationMin: Number(event.target.value) })
            }
          />
        </div>
        <TypeCapabilities
          requiresPatient={requiresPatient}
          tracksPayment={tracksPayment}
          supportsReminder={supportsReminder}
          onChange={updateDraft}
        />
        <Button
          type="submit"
          className="w-full sm:ml-auto sm:flex sm:w-auto sm:min-w-36"
          disabled={!name.trim() || defaultDurationMin < 5}
        >
          Agregar tipo
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
