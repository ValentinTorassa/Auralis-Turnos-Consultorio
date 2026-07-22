"use client";

import { useConvex, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";
import { Button, Card, Input, Label, Skeleton } from "@/components/ui";
import { IconBadge } from "@/components/Icons";
import {
  Check,
  Clock,
  Download,
  FileKey2,
  LockKeyhole,
  LogOut,
  Palette,
  Pencil,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useId, useReducer, useRef } from "react";
import {
  BackupCounts,
  BackupSnapshot,
  backupCounts,
  validateBackupSnapshot,
} from "../../../../convex/backupModel";
import {
  MAX_ENCRYPTED_BACKUP_BYTES,
  decryptBackup,
  encryptBackup,
} from "@/lib/backupCrypto";
import { mergeFormState, readableError } from "@/lib/form-state";

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="settings-workday-start">Inicio del día</Label>
          <Input
            id="settings-workday-start"
            type="time"
            value={workDayStart}
            onChange={(e) => updateDraft({ workDayStart: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="settings-workday-end">Fin del día</Label>
          <Input
            id="settings-workday-end"
            type="time"
            value={workDayEnd}
            onChange={(e) => updateDraft({ workDayEnd: e.target.value })}
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
          onChange={(e) =>
            updateDraft({ defaultDurationMin: Number(e.target.value) })
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
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
            onChange={(e) =>
              updateDraft({ psychiatristSlotCount: Number(e.target.value) })
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
            onChange={(e) =>
              updateDraft({
                psychiatristSlotDurationMin: Number(e.target.value),
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
      <div className="flex items-center gap-3">
        <Button type="submit">Guardar</Button>
        {saved && <span className="text-sm text-teal-700">Guardado ✓</span>}
      </div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </form>
  );
}

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

function typeDraft(type: Doc<"appointmentTypes">): TypeDraft {
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

function TypeRow({ type }: { type: Doc<"appointmentTypes"> }) {
  const durationId = useId();
  const updateType = useMutation(api.types.update);
  const removeType = useMutation(api.types.remove);
  const [draft, updateDraft] = useReducer(
    mergeFormState<TypeDraft>,
    typeDraft(type),
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
    if (!confirm(`¿Eliminar el tipo "${type.name}"?`)) return;
    updateDraft({ error: "" });
    try {
      await removeType({ id: type._id });
    } catch (e) {
      updateDraft({
        error:
          e instanceof Error && e.message.includes("turnos")
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
              className="h-9 w-12 shrink-0 p-1"
              value={color}
              onChange={(e) => updateDraft({ color: e.target.value })}
            />
            <Input
              aria-label="Nombre del tipo de actividad"
              className="h-9"
              value={name}
              onChange={(e) => updateDraft({ name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="grid gap-2 text-xs text-stone-700 sm:grid-cols-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requiresPatient}
                onChange={(e) =>
                  updateDraft({ requiresPatient: e.target.checked })
                }
                className="accent-teal-700"
              />
              Requiere paciente
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={tracksPayment}
                onChange={(e) =>
                  updateDraft({ tracksPayment: e.target.checked })
                }
                className="accent-teal-700"
              />
              Registra pago
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={supportsReminder}
                onChange={(e) =>
                  updateDraft({ supportsReminder: e.target.checked })
                }
                className="accent-teal-700"
              />
              Admite aviso
            </label>
          </div>
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
                onChange={(e) =>
                  updateDraft({ defaultDurationMin: Number(e.target.value) })
                }
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
                updateDraft(typeDraft(type));
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
            onClick={() => updateDraft({ editing: true })}
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
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-rose-600">
          {error}
        </p>
      )}
    </li>
  );
}

const countLabels: Array<[keyof Omit<BackupCounts, "total">, string]> = [
  ["appointmentTypes", "Tipos de actividad"],
  ["patients", "Pacientes"],
  ["appointments", "Turnos"],
  ["deletedAppointments", "Turnos eliminados incluidos"],
  ["tasks", "Tareas"],
  ["reminders", "Recordatorios"],
  ["psychiatristSlots", "Horarios de psiquiatría"],
  ["settings", "Configuración"],
];

function CountsGrid({ counts }: { counts: BackupCounts }) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
      {countLabels.map(([key, label]) => (
        <div key={key} className="rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200/80">
          <dt className="text-xs leading-tight text-stone-500">{label}</dt>
          <dd className="mt-1 font-semibold tabular-nums text-stone-900">
            {counts[key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type RestorePreview = {
  mode: "replace";
  incoming: BackupCounts;
  current: BackupCounts;
  alreadyImported: boolean;
  importedAt?: number;
};

function BackupSection() {
  const convex = useConvex();
  const restore = useMutation(api.backup.restoreSnapshot);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, updateState] = useReducer(mergeFormState<BackupState>, {
    exportPassphrase: "",
    exportConfirmation: "",
    exportBusy: false,
    exportError: "",
    exportSummary: null,
    restorePassphrase: "",
    restoreBusy: false,
    restoreError: "",
    snapshot: null,
    preview: null,
    destructiveConfirmation: "",
    restoreSummary: null,
  });
  const {
    exportPassphrase,
    exportConfirmation,
    exportBusy,
    exportError,
    exportSummary,
    restorePassphrase,
    restoreBusy,
    restoreError,
    snapshot,
    preview,
    destructiveConfirmation,
    restoreSummary,
  } = state;
  const setExportPassphrase = (exportPassphrase: string) =>
    updateState({ exportPassphrase });
  const setExportConfirmation = (exportConfirmation: string) =>
    updateState({ exportConfirmation });
  const setExportBusy = (exportBusy: boolean) => updateState({ exportBusy });
  const setExportError = (exportError: string) => updateState({ exportError });
  const setExportSummary = (exportSummary: BackupCounts | null) =>
    updateState({ exportSummary });
  const setRestorePassphrase = (restorePassphrase: string) =>
    updateState({ restorePassphrase });
  const setRestoreBusy = (restoreBusy: boolean) => updateState({ restoreBusy });
  const setRestoreError = (restoreError: string) => updateState({ restoreError });
  const setSnapshot = (snapshot: BackupSnapshot | null) => updateState({ snapshot });
  const setPreview = (preview: RestorePreview | null) => updateState({ preview });
  const setDestructiveConfirmation = (destructiveConfirmation: string) =>
    updateState({ destructiveConfirmation });
  const setRestoreSummary = (restoreSummary: BackupCounts | null) =>
    updateState({ restoreSummary });

  async function handleExport() {
    setExportError("");
    setExportSummary(null);
    if (exportPassphrase !== exportConfirmation) {
      setExportError("Las frases secretas no coinciden.");
      return;
    }
    setExportBusy(true);
    try {
      const exported = await convex.query(api.backup.exportSnapshot, {
        snapshotId: crypto.randomUUID(),
      });
      const validated = validateBackupSnapshot(exported);
      const envelope = await encryptBackup(
        JSON.stringify(validated),
        exportPassphrase,
      );
      const blob = new Blob([JSON.stringify(envelope)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `auralis-${new Date().toISOString().slice(0, 10)}.auralis-backup`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportSummary(backupCounts(validated));
      setExportPassphrase("");
      setExportConfirmation("");
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "No se pudo crear la copia.",
      );
    } finally {
      setExportBusy(false);
    }
  }

  function resetPreview() {
    setSnapshot(null);
    setPreview(null);
    setDestructiveConfirmation("");
    setRestoreSummary(null);
    setRestoreError("");
  }

  async function handlePreview() {
    setRestoreError("");
    setRestoreSummary(null);
    setSnapshot(null);
    setPreview(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setRestoreError("Elegí un archivo de copia cifrada.");
      return;
    }
    if (file.size > MAX_ENCRYPTED_BACKUP_BYTES * 1.5) {
      setRestoreError("El archivo supera el límite permitido.");
      return;
    }
    setRestoreBusy(true);
    try {
      const envelope = JSON.parse(await file.text()) as unknown;
      const plaintext = await decryptBackup(envelope, restorePassphrase);
      const validated = validateBackupSnapshot(JSON.parse(plaintext) as unknown);
      const result = await convex.query(api.backup.previewRestore, {
        snapshot: validated,
        mode: "replace",
      });
      setSnapshot(validated);
      setPreview(result);
    } catch (error) {
      setRestoreError(
        error instanceof Error
          ? error.message
          : "No se pudo leer o validar la copia.",
      );
    } finally {
      setRestoreBusy(false);
    }
  }

  async function handleRestore() {
    if (!snapshot || !preview || destructiveConfirmation !== "REEMPLAZAR") return;
    setRestoreBusy(true);
    setRestoreError("");
    try {
      const result = await restore({
        snapshot,
        mode: "replace",
        confirmation: destructiveConfirmation,
      });
      setRestoreSummary(result.counts);
      setSnapshot(null);
      setPreview(null);
      setRestorePassphrase("");
      setDestructiveConfirmation("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      setRestoreError(
        error instanceof Error ? error.message : "No se pudo restaurar la copia.",
      );
    } finally {
      setRestoreBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-stone-100 bg-gradient-to-r from-teal-50/80 to-stone-50 px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-stone-900">
          <FileKey2 className="h-4 w-4 text-teal-700" />
          Copia cifrada y recuperación
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          La frase secreta nunca sale de este navegador. Guardala por separado:
          no se puede recuperar si la perdés.
        </p>
      </div>

      <div className="grid gap-6 p-5 sm:grid-cols-2">
        <section aria-labelledby="backup-export-title" className="space-y-3">
          <div>
            <h3 id="backup-export-title" className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <Download className="h-4 w-4 text-teal-700" /> Exportar
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              Incluye pacientes, turnos activos y eliminados, tareas, avisos,
              horarios y configuración. No incluye cuenta, contraseña ni tokens.
            </p>
          </div>
          <div>
            <Label htmlFor="backup-export-passphrase">Frase secreta nueva</Label>
            <Input
              id="backup-export-passphrase"
              type="password"
              autoComplete="off"
              minLength={10}
              maxLength={1024}
              value={exportPassphrase}
              onChange={(event) => setExportPassphrase(event.target.value)}
              placeholder="Mínimo 10 caracteres"
              aria-describedby={exportError ? "backup-export-error" : undefined}
            />
          </div>
          <div>
            <Label htmlFor="backup-export-confirmation">
              Repetir frase secreta
            </Label>
            <Input
              id="backup-export-confirmation"
              type="password"
              autoComplete="off"
              minLength={10}
              maxLength={1024}
              value={exportConfirmation}
              onChange={(event) => setExportConfirmation(event.target.value)}
              aria-describedby={exportError ? "backup-export-error" : undefined}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={exportBusy || exportPassphrase.length < 10 || exportConfirmation.length < 10}
            onClick={() => void handleExport()}
          >
            <LockKeyhole className="h-4 w-4" />
            {exportBusy ? "Cifrando..." : "Cifrar y descargar"}
          </Button>
          {exportError && (
            <p id="backup-export-error" role="alert" className="text-xs text-rose-700">
              {exportError}
            </p>
          )}
          {exportSummary && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900">
              Copia descargada: {exportSummary.total} registros, incluidos {exportSummary.deletedAppointments} turnos eliminados.
            </div>
          )}
        </section>

        <section aria-labelledby="backup-restore-title" className="space-y-3 border-t border-stone-100 pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <div>
            <h3 id="backup-restore-title" className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <Upload className="h-4 w-4 text-amber-600" /> Restaurar
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              Modo reemplazar: conserva tu usuario, pero elimina los datos actuales
              y recrea los de la copia con identificadores nuevos.
            </p>
          </div>
          <Label htmlFor="backup-restore-file">Archivo de copia cifrada</Label>
          <input
            id="backup-restore-file"
            ref={fileRef}
            type="file"
            accept=".auralis-backup,application/json"
            className="h-auto w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-900 shadow-sm outline-none file:mr-2 file:rounded-lg file:border-0 file:bg-stone-100 file:px-2 file:py-1 file:text-xs file:font-semibold focus:border-teal-600 focus:ring-4 focus:ring-teal-100/80"
            onChange={resetPreview}
          />
          <div>
            <Label htmlFor="backup-restore-passphrase">
              Frase secreta de la copia
            </Label>
            <Input
              id="backup-restore-passphrase"
              type="password"
              autoComplete="off"
              minLength={10}
              maxLength={1024}
              value={restorePassphrase}
              onChange={(event) => {
                setRestorePassphrase(event.target.value);
                setSnapshot(null);
                setPreview(null);
              }}
              aria-describedby={restoreError ? "backup-restore-error" : undefined}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={restoreBusy || restorePassphrase.length < 10}
            onClick={() => void handlePreview()}
          >
            {restoreBusy ? "Validando..." : "Descifrar y previsualizar"}
          </Button>
          {restoreError && (
            <p id="backup-restore-error" role="alert" className="text-xs text-rose-700">
              {restoreError}
            </p>
          )}
        </section>
      </div>

      {preview && snapshot && (
        <div className="border-t border-amber-200 bg-amber-50/70 p-5">
          <p className="text-sm font-semibold text-amber-950">Previsualización validada</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900">
            Se importarán {preview.incoming.total} registros y se reemplazarán {preview.current.total} actuales. La escritura es una única transacción: ante un error no se aplica ningún cambio.
          </p>
          <div className="mt-3"><CountsGrid counts={preview.incoming} /></div>
          {preview.alreadyImported ? (
            <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-medium text-stone-700 ring-1 ring-stone-200">
              Esta copia ya fue importada. No se volverá a aplicar.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="backup-destructive-confirmation">
                  Escribí REEMPLAZAR para confirmar
                </Label>
                <Input
                  id="backup-destructive-confirmation"
                  value={destructiveConfirmation}
                  onChange={(event) => setDestructiveConfirmation(event.target.value)}
                  autoComplete="off"
                  placeholder="REEMPLAZAR"
                />
              </div>
              <Button
                type="button"
                variant="danger"
                disabled={restoreBusy || destructiveConfirmation !== "REEMPLAZAR"}
                onClick={() => void handleRestore()}
              >
                <Trash2 className="h-4 w-4" />
                {restoreBusy ? "Restaurando..." : "Reemplazar y restaurar"}
              </Button>
            </div>
          )}
        </div>
      )}

      {restoreSummary && (
        <div className="border-t border-teal-200 bg-teal-50 px-5 py-4 text-sm text-teal-900">
          <p className="font-semibold">Restauración completada</p>
          <p className="mt-1">Se recrearon {restoreSummary.total} registros con identificadores nuevos, incluidos {restoreSummary.deletedAppointments} turnos eliminados recuperables.</p>
        </div>
      )}
    </Card>
  );
}

type NewTypeDraft = {
  name: string;
  color: string;
  requiresPatient: boolean;
  tracksPayment: boolean;
  supportsReminder: boolean;
  defaultDurationMin: number;
};

type BackupState = {
  exportPassphrase: string;
  exportConfirmation: string;
  exportBusy: boolean;
  exportError: string;
  exportSummary: BackupCounts | null;
  restorePassphrase: string;
  restoreBusy: boolean;
  restoreError: string;
  snapshot: BackupSnapshot | null;
  preview: RestorePreview | null;
  destructiveConfirmation: string;
  restoreSummary: BackupCounts | null;
};

const initialNewTypeDraft: NewTypeDraft = {
  name: "",
  color: "#6366F1",
  requiresPatient: true,
  tracksPayment: true,
  supportsReminder: true,
  defaultDurationMin: 50,
};

export function SettingsClient() {
  const settings = useQuery(api.settings.get);
  const types = useQuery(api.types.list) ?? [];
  const createType = useMutation(api.types.create);
  const { signOut } = useAuthActions();

  const [newType, updateNewType] = useReducer(
    mergeFormState<NewTypeDraft>,
    initialNewTypeDraft,
  );
  const {
    name: newTypeName,
    color: newTypeColor,
    requiresPatient: newRequiresPatient,
    tracksPayment: newTracksPayment,
    supportsReminder: newSupportsReminder,
    defaultDurationMin: newDefaultDurationMin,
  } = newType;

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
              aria-label="Nombre del nuevo tipo de actividad"
              placeholder="Nuevo tipo..."
              value={newTypeName}
              onChange={(e) => updateNewType({ name: e.target.value })}
            />
            <Input
              type="color"
              aria-label="Color del nuevo tipo de actividad"
              className="h-11 w-full p-1 sm:w-20"
              value={newTypeColor}
              onChange={(e) => updateNewType({ color: e.target.value })}
            />
            <Input
              type="number"
              min={5}
              step={5}
              aria-label="Duración por defecto en minutos"
              className="sm:w-28"
              value={newDefaultDurationMin}
              onChange={(e) =>
                updateNewType({ defaultDurationMin: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newRequiresPatient}
                onChange={(e) =>
                  updateNewType({ requiresPatient: e.target.checked })
                }
                className="accent-teal-700"
              />
              Requiere paciente
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newTracksPayment}
                onChange={(e) =>
                  updateNewType({ tracksPayment: e.target.checked })
                }
                className="accent-teal-700"
              />
              Registra pago
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newSupportsReminder}
                onChange={(e) =>
                  updateNewType({ supportsReminder: e.target.checked })
                }
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
              updateNewType({ name: "" });
            }}
          >
            Agregar
          </Button>
        </div>
      </Card>

      <BackupSection />

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
