"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import { useReducer, useRef } from "react";
import { Download, FileKey2, LockKeyhole, Trash2, Upload } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import {
  BackupCounts,
  BackupSnapshot,
  backupCounts,
  validateBackupSnapshot,
} from "../../../../../convex/backupModel";
import { Button, Card, Input, Label } from "@/components/ui";
import {
  MAX_ENCRYPTED_BACKUP_BYTES,
  decryptBackup,
  encryptBackup,
} from "@/lib/backupCrypto";
import { mergeFormState, readableError } from "@/lib/form-state";

type RestorePreview = {
  mode: "replace";
  incoming: BackupCounts;
  current: BackupCounts;
  alreadyImported: boolean;
  importedAt?: number;
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
        <div
          key={key}
          className="rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200/80"
        >
          <dt className="text-xs leading-tight text-stone-500">{label}</dt>
          <dd className="mt-1 font-semibold tabular-nums text-stone-900">
            {counts[key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function BackupSection() {
  const convex = useConvex();
  const { mutateAsync: restore } = useMutation({
    mutationFn: useConvexMutation(api.backup.restoreSnapshot),
  });
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

  async function handleExport() {
    updateState({ exportError: "", exportSummary: null });
    if (exportPassphrase !== exportConfirmation) {
      updateState({ exportError: "Las frases secretas no coinciden." });
      return;
    }

    updateState({ exportBusy: true });
    try {
      const exported = await convex.query(api.backup.exportSnapshot, {
        snapshotId: crypto.randomUUID(),
      });
      const validated = validateBackupSnapshot(exported);
      const envelope = await encryptBackup(
        JSON.stringify(validated),
        exportPassphrase,
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(envelope)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `auralis-${new Date().toISOString().slice(0, 10)}.auralis-backup`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      updateState({
        exportSummary: backupCounts(validated),
        exportPassphrase: "",
        exportConfirmation: "",
      });
    } catch (error) {
      updateState({
        exportError: readableError(error, "No se pudo crear la copia."),
      });
    } finally {
      updateState({ exportBusy: false });
    }
  }

  function resetPreview() {
    updateState({
      snapshot: null,
      preview: null,
      destructiveConfirmation: "",
      restoreSummary: null,
      restoreError: "",
    });
  }

  async function handlePreview() {
    updateState({
      restoreError: "",
      restoreSummary: null,
      snapshot: null,
      preview: null,
    });
    const file = fileRef.current?.files?.[0];
    if (!file) {
      updateState({ restoreError: "Elegí un archivo de copia cifrada." });
      return;
    }
    if (file.size > MAX_ENCRYPTED_BACKUP_BYTES * 1.5) {
      updateState({ restoreError: "El archivo supera el límite permitido." });
      return;
    }

    updateState({ restoreBusy: true });
    try {
      const envelope = JSON.parse(await file.text()) as unknown;
      const plaintext = await decryptBackup(envelope, restorePassphrase);
      const validated = validateBackupSnapshot(
        JSON.parse(plaintext) as unknown,
      );
      const result = await convex.query(api.backup.previewRestore, {
        snapshot: validated,
        mode: "replace",
      });
      updateState({ snapshot: validated, preview: result });
    } catch (error) {
      updateState({
        restoreError: readableError(
          error,
          "No se pudo leer o validar la copia.",
        ),
      });
    } finally {
      updateState({ restoreBusy: false });
    }
  }

  async function handleRestore() {
    if (!snapshot || !preview || destructiveConfirmation !== "REEMPLAZAR") {
      return;
    }

    updateState({ restoreBusy: true, restoreError: "" });
    try {
      const result = await restore({
        snapshot,
        mode: "replace",
        confirmation: destructiveConfirmation,
      });
      updateState({
        restoreSummary: result.counts,
        snapshot: null,
        preview: null,
        restorePassphrase: "",
        destructiveConfirmation: "",
      });
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      updateState({
        restoreError: readableError(error, "No se pudo restaurar la copia."),
      });
    } finally {
      updateState({ restoreBusy: false });
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
            <h3
              id="backup-export-title"
              className="flex items-center gap-2 text-sm font-semibold text-stone-900"
            >
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
              onChange={(event) =>
                updateState({ exportPassphrase: event.target.value })
              }
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
              onChange={(event) =>
                updateState({ exportConfirmation: event.target.value })
              }
              aria-describedby={exportError ? "backup-export-error" : undefined}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={
              exportBusy ||
              exportPassphrase.length < 10 ||
              exportConfirmation.length < 10
            }
            onClick={() => void handleExport()}
          >
            <LockKeyhole className="h-4 w-4" />
            {exportBusy ? "Cifrando..." : "Cifrar y descargar"}
          </Button>
          {exportError ? (
            <p
              id="backup-export-error"
              role="alert"
              className="text-xs text-rose-700"
            >
              {exportError}
            </p>
          ) : null}
          {exportSummary ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900">
              Copia descargada: {exportSummary.total} registros, incluidos{" "}
              {exportSummary.deletedAppointments} turnos eliminados.
            </div>
          ) : null}
        </section>

        <section
          aria-labelledby="backup-restore-title"
          className="space-y-3 border-t border-stone-100 pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"
        >
          <div>
            <h3
              id="backup-restore-title"
              className="flex items-center gap-2 text-sm font-semibold text-stone-900"
            >
              <Upload className="h-4 w-4 text-amber-600" /> Restaurar
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              Modo reemplazar: conserva tu usuario, pero elimina los datos
              actuales y recrea los de la copia con identificadores nuevos.
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
              onChange={(event) =>
                updateState({
                  restorePassphrase: event.target.value,
                  snapshot: null,
                  preview: null,
                })
              }
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
          {restoreError ? (
            <p
              id="backup-restore-error"
              role="alert"
              className="text-xs text-rose-700"
            >
              {restoreError}
            </p>
          ) : null}
        </section>
      </div>

      {preview && snapshot ? (
        <div className="border-t border-amber-200 bg-amber-50/70 p-5">
          <p className="text-sm font-semibold text-amber-950">
            Previsualización validada
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900">
            Se importarán {preview.incoming.total} registros y se reemplazarán{" "}
            {preview.current.total} actuales. La escritura es una única
            transacción: ante un error no se aplica ningún cambio.
          </p>
          <div className="mt-3">
            <CountsGrid counts={preview.incoming} />
          </div>
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
                  onChange={(event) =>
                    updateState({
                      destructiveConfirmation: event.target.value,
                    })
                  }
                  autoComplete="off"
                  placeholder="REEMPLAZAR"
                />
              </div>
              <Button
                type="button"
                variant="danger"
                disabled={
                  restoreBusy || destructiveConfirmation !== "REEMPLAZAR"
                }
                onClick={() => void handleRestore()}
              >
                <Trash2 className="h-4 w-4" />
                {restoreBusy ? "Restaurando..." : "Reemplazar y restaurar"}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {restoreSummary ? (
        <div className="border-t border-teal-200 bg-teal-50 px-5 py-4 text-sm text-teal-900">
          <p className="font-semibold">Restauración completada</p>
          <p className="mt-1">
            Se recrearon {restoreSummary.total} registros con identificadores
            nuevos, incluidos {restoreSummary.deletedAppointments} turnos
            eliminados recuperables.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
