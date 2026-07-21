"use client";

import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";
import { Button, Card, Input, Label, Skeleton } from "@/components/ui";
import { IconBadge } from "@/components/Icons";
import {
  Check,
  Clock,
  LogOut,
  Palette,
  Pencil,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

function SettingsForm({ settings }: { settings: Doc<"settings"> }) {
  const update = useMutation(api.settings.update);
  const [workDayStart, setWorkDayStart] = useState(settings.workDayStart);
  const [workDayEnd, setWorkDayEnd] = useState(settings.workDayEnd);
  const [defaultDurationMin, setDefaultDurationMin] = useState(
    settings.defaultDurationMin,
  );
  const [psychiatristSlotCount, setPsychiatristSlotCount] = useState(
    settings.psychiatristSlotCount,
  );
  const [psychiatristSlotDurationMin, setPsychiatristSlotDurationMin] =
    useState(settings.psychiatristSlotDurationMin);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await update({
      workDayStart,
      workDayEnd,
      defaultDurationMin,
      psychiatristSlotCount,
      psychiatristSlotDurationMin,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Inicio del día</Label>
          <Input
            type="time"
            value={workDayStart}
            onChange={(e) => setWorkDayStart(e.target.value)}
          />
        </div>
        <div>
          <Label>Fin del día</Label>
          <Input
            type="time"
            value={workDayEnd}
            onChange={(e) => setWorkDayEnd(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label>Duración por defecto (minutos)</Label>
        <Input
          type="number"
          min={15}
          max={180}
          step={5}
          value={defaultDurationMin}
          onChange={(e) => setDefaultDurationMin(Number(e.target.value))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Slots psiquiatra / día</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={psychiatristSlotCount}
            onChange={(e) => setPsychiatristSlotCount(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Duración slot psiquiatra</Label>
          <Input
            type="number"
            min={15}
            max={60}
            value={psychiatristSlotDurationMin}
            onChange={(e) =>
              setPsychiatristSlotDurationMin(Number(e.target.value))
            }
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit">Guardar</Button>
        {saved && <span className="text-sm text-teal-700">Guardado ✓</span>}
      </div>
    </form>
  );
}

function TypeRow({ type }: { type: Doc<"appointmentTypes"> }) {
  const updateType = useMutation(api.types.update);
  const removeType = useMutation(api.types.remove);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(type.name);
  const [color, setColor] = useState(type.color);
  const [requiresPatient, setRequiresPatient] = useState(
    type.requiresPatient ?? true,
  );
  const [tracksPayment, setTracksPayment] = useState(
    type.tracksPayment ?? true,
  );
  const [supportsReminder, setSupportsReminder] = useState(
    type.supportsReminder ?? true,
  );
  const [defaultDurationMin, setDefaultDurationMin] = useState(
    type.defaultDurationMin ?? 50,
  );
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim()) return;
    await updateType({
      id: type._id,
      name,
      color,
      requiresPatient,
      tracksPayment,
      supportsReminder,
      defaultDurationMin,
    });
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el tipo "${type.name}"?`)) return;
    setError("");
    try {
      await removeType({ id: type._id });
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("turnos")
          ? "No se puede eliminar: hay turnos que usan este tipo."
          : "No se pudo eliminar.",
      );
    }
  }

  return (
    <li className="rounded-xl border border-stone-100 px-3 py-2 transition hover:border-stone-200">
      {editing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="color"
              className="h-9 w-12 shrink-0 p-1"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <Input
              className="h-9"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-2 text-xs text-stone-700 sm:grid-cols-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requiresPatient}
                onChange={(e) => setRequiresPatient(e.target.checked)}
                className="accent-teal-700"
              />
              Requiere paciente
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={tracksPayment}
                onChange={(e) => setTracksPayment(e.target.checked)}
                className="accent-teal-700"
              />
              Registra pago
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={supportsReminder}
                onChange={(e) => setSupportsReminder(e.target.checked)}
                className="accent-teal-700"
              />
              Admite aviso
            </label>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Duración por defecto (min)</Label>
              <Input
                type="number"
                min={5}
                step={5}
                className="h-9"
                value={defaultDurationMin}
                onChange={(e) => setDefaultDurationMin(Number(e.target.value))}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSave()}
              className="rounded-lg p-2 text-teal-700 transition hover:bg-teal-50"
              aria-label="Guardar"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setName(type.name);
                setColor(type.color);
                setRequiresPatient(type.requiresPatient ?? true);
                setTracksPayment(type.tracksPayment ?? true);
                setSupportsReminder(type.supportsReminder ?? true);
                setDefaultDurationMin(type.defaultDurationMin ?? 50);
              }}
              className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100"
              aria-label="Cancelar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white shadow-sm"
            style={{ backgroundColor: type.color }}
          />
          <span className="flex-1 truncate text-sm font-medium text-stone-800">
            {type.name}
          </span>
          {type.isPsychiatrist && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200/70">
              Psiquiatría
            </span>
          )}
          <span className="hidden text-[11px] text-stone-400 sm:inline">
            {type.requiresPatient === false ? "Sin paciente" : "Paciente"} ·{" "}
            {type.defaultDurationMin ?? 50} min
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {!type.isSystemType && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded-lg p-2 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"
              aria-label="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </li>
  );
}

export default function ConfigPage() {
  const settings = useQuery(api.settings.get);
  const types = useQuery(api.types.list) ?? [];
  const createType = useMutation(api.types.create);
  const { signOut } = useAuthActions();

  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#6366F1");
  const [newRequiresPatient, setNewRequiresPatient] = useState(true);
  const [newTracksPayment, setNewTracksPayment] = useState(true);
  const [newSupportsReminder, setNewSupportsReminder] = useState(true);
  const [newDefaultDurationMin, setNewDefaultDurationMin] = useState(50);

  return (
    <div className="anim-page space-y-5 max-w-2xl">
      <div className="flex items-start gap-3">
        <IconBadge tone="stone">
          <Settings2 className="h-5 w-5" />
        </IconBadge>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Configuración
          </h1>
          <p className="text-sm text-stone-500">
            Horarios, duración y tipos de turno
          </p>
        </div>
      </div>

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

      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Palette className="h-4 w-4 text-teal-700" />
          Tipos de actividad
        </h2>
        <ul className="mb-4 space-y-2">
          {types.map((t) => (
            <TypeRow key={t._id} type={t} />
          ))}
        </ul>
        <div className="space-y-3 rounded-2xl bg-stone-50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Nuevo tipo..."
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
            />
            <Input
              type="color"
              className="h-11 w-full p-1 sm:w-20"
              value={newTypeColor}
              onChange={(e) => setNewTypeColor(e.target.value)}
            />
            <Input
              type="number"
              min={5}
              step={5}
              aria-label="Duración por defecto en minutos"
              className="sm:w-28"
              value={newDefaultDurationMin}
              onChange={(e) => setNewDefaultDurationMin(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newRequiresPatient}
                onChange={(e) => setNewRequiresPatient(e.target.checked)}
                className="accent-teal-700"
              />
              Requiere paciente
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newTracksPayment}
                onChange={(e) => setNewTracksPayment(e.target.checked)}
                className="accent-teal-700"
              />
              Registra pago
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newSupportsReminder}
                onChange={(e) => setNewSupportsReminder(e.target.checked)}
                className="accent-teal-700"
              />
              Admite aviso
            </label>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!newTypeName.trim() || newDefaultDurationMin < 5}
            onClick={async () => {
              await createType({
                name: newTypeName,
                color: newTypeColor,
                requiresPatient: newRequiresPatient,
                tracksPayment: newTracksPayment,
                supportsReminder: newSupportsReminder,
                defaultDurationMin: newDefaultDurationMin,
              });
              setNewTypeName("");
            }}
          >
            Agregar
          </Button>
        </div>
      </Card>

      <Card className="p-5 text-sm text-stone-600 leading-relaxed">
        <p className="mb-1 flex items-center gap-2 font-semibold text-stone-800">
          <ShieldCheck className="h-4 w-4 text-teal-700" />
          Privacidad
        </p>
        <p>
          Los datos viven en tu proyecto Convex, protegidos con usuario y
          contraseña. Solo vos podés ver y editar tu agenda.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-medium text-stone-500 shadow-sm transition hover:bg-stone-50 hover:text-stone-800"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </Card>
    </div>
  );
}
