"use client";

import { useMutation, useQuery } from "convex/react";
import { useReducer } from "react";
import { api } from "../../../../../convex/_generated/api";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { Button, Card, Input, Label, Skeleton } from "@/components/ui";
import { TimePicker } from "@/components/ui/time-picker";
import { mergeFormState, readableError } from "@/lib/form-state";
import { Clock } from "lucide-react";

type SettingsDraft = Pick<
  Doc<"settings">,
  | "workDayStart"
  | "workDayEnd"
  | "defaultDurationMin"
  | "psychiatristSlotCount"
  | "psychiatristSlotDurationMin"
> & { saved: boolean; error: string };

function SettingsForm({ settings }: { settings: Doc<"settings"> }) {
  const update = useMutation(api.settings.update);
  const [draft, updateDraft] = useReducer(mergeFormState<SettingsDraft>, {
    workDayStart: settings.workDayStart,
    workDayEnd: settings.workDayEnd,
    defaultDurationMin: settings.defaultDurationMin,
    psychiatristSlotCount: settings.psychiatristSlotCount,
    psychiatristSlotDurationMin: settings.psychiatristSlotDurationMin,
    saved: false,
    error: "",
  });
  const {
    workDayStart,
    workDayEnd,
    defaultDurationMin,
    psychiatristSlotCount,
    psychiatristSlotDurationMin,
    saved,
    error,
  } = draft;

  async function handleSave(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    updateDraft({ saved: false, error: "" });

    try {
      await update({
        workDayStart,
        workDayEnd,
        defaultDurationMin,
        psychiatristSlotCount,
        psychiatristSlotDurationMin,
      });
      updateDraft({ saved: true });
      window.setTimeout(() => updateDraft({ saved: false }), 2000);
    } catch (caught) {
      updateDraft({
        error: readableError(caught, "No se pudo guardar la configuración."),
      });
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="settings-workday-start">Inicio del día</Label>
          <TimePicker
            id="settings-workday-start"
            value={workDayStart}
            onChange={(workDayStart) => updateDraft({ workDayStart })}
          />
        </div>
        <div>
          <Label htmlFor="settings-workday-end">Fin del día</Label>
          <TimePicker
            id="settings-workday-end"
            value={workDayEnd}
            onChange={(workDayEnd) => updateDraft({ workDayEnd })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="settings-default-duration">
          Duración por defecto (minutos)
        </Label>
        <Input
          id="settings-default-duration"
          type="number"
          min={15}
          max={180}
          step={5}
          value={defaultDurationMin}
          onChange={(event) =>
            updateDraft({ defaultDurationMin: Number(event.target.value) })
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="settings-psychiatrist-slots">
            Slots psiquiatra / día
          </Label>
          <Input
            id="settings-psychiatrist-slots"
            type="number"
            min={1}
            max={20}
            value={psychiatristSlotCount}
            onChange={(event) =>
              updateDraft({
                psychiatristSlotCount: Number(event.target.value),
              })
            }
          />
        </div>
        <div>
          <Label htmlFor="settings-psychiatrist-duration">
            Duración slot psiquiatra
          </Label>
          <Input
            id="settings-psychiatrist-duration"
            type="number"
            min={15}
            max={60}
            value={psychiatristSlotDurationMin}
            onChange={(event) =>
              updateDraft({
                psychiatristSlotDurationMin: Number(event.target.value),
              })
            }
          />
        </div>
      </div>
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
        Al guardar, la cantidad y duración se aplican a los horarios libres de
        los próximos 6 meses. Los turnos ya asignados y los horarios bloqueados
        no se modifican; si una nueva distribución se superpone, ese horario no
        se genera.
      </p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {saved ? (
          <span className="text-center text-sm text-teal-700 sm:text-right">
            Guardado ✓
          </span>
        ) : null}
        <Button type="submit" className="w-full sm:min-w-40 sm:w-auto">
          Guardar cambios
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

export function AgendaSettingsCard() {
  const settings = useQuery(api.settings.get);

  return (
    <Card className="p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Clock className="h-4 w-4 text-teal-700" />
        Agenda
      </h2>
      {settings === undefined ? (
        <div className="space-y-3">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      ) : settings === null ? (
        <p className="text-sm text-stone-500">
          La configuración se crea automáticamente al iniciar sesión.
        </p>
      ) : (
        <SettingsForm key={settings._id} settings={settings} />
      )}
    </Card>
  );
}
