"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useId, useReducer } from "react";
import { Button, Input, Label } from "./ui";
import { debounce, useQueryState } from "nuqs";
import { patientPickerSearchParser } from "@/lib/search-params";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { mergeFormState, readableError } from "@/lib/form-state";

type PickerDraft = {
  creating: boolean;
  newName: string;
  newPhone: string;
};

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
  const [q, setQ] = useQueryState(
    "patient",
    patientPickerSearchParser.withOptions({
      history: "replace",
      shallow: true,
      limitUrlUpdates: debounce(250),
    }),
  );
  const debouncedQuery = useDebouncedValue(q.trim(), 250);
  const [draft, updateDraft] = useReducer(mergeFormState<PickerDraft>, {
    creating: false,
    newName: "",
    newPhone: "",
  });
  const { creating, newName, newPhone } = draft;
  const { data: results = [] } = useQuery(
    convexQuery(
      api.patients.search,
      debouncedQuery ? { q: debouncedQuery } : "skip",
    ),
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
            onClick={() => {
              onChange(undefined);
              void setQ(null);
            }}
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
              void setQ(e.target.value || null);
              updateDraft({ creating: false });
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
                    void setQ(null);
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
                updateDraft({ newName: q.trim(), creating: true });
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
                  onChange={(e) => updateDraft({ newName: e.target.value })}
                  aria-describedby={create.error ? errorId : undefined}
                  aria-invalid={Boolean(create.error)}
                />
              </div>
              <div>
                <Label htmlFor={newPhoneId}>Teléfono (opcional)</Label>
                <Input
                  id={newPhoneId}
                  value={newPhone}
                  onChange={(e) => updateDraft({ newPhone: e.target.value })}
                  inputMode="tel"
                />
              </div>
              {(duplicates?.length ?? 0) > 0 && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Posible duplicado: {duplicates?.map((p) => p.fullName).join(", ")}.
                  Elegilo arriba si es la misma persona.
                </p>
              )}
              {create.error && (
                <p id={errorId} role="alert" className="text-sm text-rose-700">
                  {readableError(create.error, "No se pudo crear el paciente.")}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={create.isPending || !newName.trim()}
                  onClick={async () => {
                    create.reset();
                    try {
                      const id = await create.mutateAsync({
                        fullName: newName,
                        phone: newPhone || undefined,
                        careType: "Consultorio",
                      });
                      onChange(id, newName.trim());
                      void setQ(null);
                      updateDraft({ creating: false, newName: "", newPhone: "" });
                    } catch {
                      // TanStack conserva el error para mostrarlo en el formulario.
                    }
                  }}
                >
                  {create.isPending ? "Creando..." : "Crear y seleccionar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateDraft({ creating: false })}
                >
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
