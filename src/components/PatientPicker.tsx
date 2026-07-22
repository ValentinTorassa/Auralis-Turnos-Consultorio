"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useId, useState } from "react";
import { Button, Input, Label } from "./ui";

export function PatientPicker({
  value,
  onChange,
  id,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: {
  value?: Id<"patients">;
  onChange: (id: Id<"patients"> | undefined, name?: string) => void;
  id?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const generatedId = useId();
  const groupId = id ?? generatedId;
  const searchId = `${groupId}-search`;
  const newNameId = `${groupId}-new-name`;
  const newPhoneId = `${groupId}-new-phone`;
  const errorId = `${groupId}-error`;
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { data: results = [] } = useQuery(
    convexQuery(api.patients.search, { q }),
  );
  const create = useMutation({
    mutationFn: useConvexMutation(api.patients.create),
  });
  const { data: duplicates } = useQuery(
    convexQuery(
      api.patients.duplicateCandidates,
      creating && newName.trim()
        ? { fullName: newName, phone: newPhone || undefined }
        : "skip",
    ),
  );
  const { data: selected } = useQuery(
    convexQuery(api.patients.get, value ? { id: value } : "skip"),
  );

  return (
    <div
      id={groupId}
      role="group"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className="space-y-2"
    >
      {value && selected?.patient ? (
        <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-3 py-2">
          <span className="font-medium text-teal-900">
            {selected.patient.fullName}
          </span>
          <button
            type="button"
            className="text-sm text-teal-700 underline"
            onClick={() => onChange(undefined)}
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <Input
            id={searchId}
            aria-label="Buscar paciente"
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            placeholder="Buscar por nombre o teléfono..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCreating(false);
            }}
            autoComplete="off"
          />
          {q.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-stone-200 divide-y divide-stone-100">
              {(results ?? []).length === 0 && (
                <p className="px-3 py-2 text-sm text-stone-500">Sin resultados</p>
              )}
              {(results ?? []).map((p) => (
                <button
                  key={p._id}
                  type="button"
                  className="block w-full px-3 py-2.5 text-left text-sm hover:bg-stone-50"
                  onClick={() => {
                    onChange(p._id, p.fullName);
                    setQ("");
                  }}
                >
                  <span className="font-medium text-stone-900">{p.fullName}</span>
                  {p.phone && (
                    <span className="ml-2 text-stone-500">{p.phone}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {q.trim() && !creating && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewName(q.trim());
                setCreating(true);
              }}
            >
              Crear paciente “{q.trim()}”
            </Button>
          )}
          {creating && (
            <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <div>
                <Label htmlFor={newNameId}>Nombre y apellido</Label>
                <Input
                  id={newNameId}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  aria-describedby={error ? errorId : undefined}
                  aria-invalid={Boolean(error)}
                />
              </div>
              <div>
                <Label htmlFor={newPhoneId}>Teléfono (opcional)</Label>
                <Input
                  id={newPhoneId}
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  inputMode="tel"
                />
              </div>
              {(duplicates?.length ?? 0) > 0 && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Posible duplicado: {duplicates?.map((p) => p.fullName).join(", ")}.
                  Elegilo arriba si es la misma persona.
                </p>
              )}
              {error && (
                <p id={errorId} role="alert" className="text-sm text-rose-700">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || !newName.trim()}
                  onClick={async () => {
                    setSaving(true);
                    setError("");
                    try {
                      const id = await create.mutateAsync({
                        fullName: newName,
                        phone: newPhone || undefined,
                        careType: "Consultorio",
                      });
                      onChange(id, newName.trim());
                      setQ("");
                      setCreating(false);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "No se pudo crear");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? "Creando..." : "Crear y seleccionar"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
