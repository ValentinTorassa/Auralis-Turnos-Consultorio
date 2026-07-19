"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { Input } from "./ui";

export function PatientPicker({
  value,
  onChange,
}: {
  value?: Id<"patients">;
  onChange: (id: Id<"patients"> | undefined, name?: string) => void;
}) {
  const [q, setQ] = useState("");
  const results = useQuery(api.patients.search, { q });
  const selected = useQuery(
    api.patients.get,
    value ? { id: value } : "skip",
  );

  return (
    <div className="space-y-2">
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
            placeholder="Buscar por apellido o nombre..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
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
        </>
      )}
    </div>
  );
}
