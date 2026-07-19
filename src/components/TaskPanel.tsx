"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button, Card, Empty, Input } from "./ui";
import { Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TaskPanel({ date }: { date: string }) {
  const tasks = useQuery(api.tasks.byDate, { date }) ?? [];
  const create = useMutation(api.tasks.create);
  const toggle = useMutation(api.tasks.toggle);
  const remove = useMutation(api.tasks.remove);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    try {
      await create({ date, title });
      setTitle("");
    } finally {
      setAdding(false);
    }
  }

  const pending = tasks.filter((t) => !t.done).length;

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-stone-900">Tareas del día</h2>
          <p className="text-xs text-stone-500">
            {pending === 0
              ? "Nada pendiente"
              : pending === 1
                ? "1 pendiente"
                : `${pending} pendientes`}
          </p>
        </div>
      </div>

      <form onSubmit={addTask} className="mb-4 flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Llamar al abogado..."
        />
        <Button type="submit" disabled={adding || !title.trim()} size="md" aria-label="Agregar">
          <Plus className="h-5 w-5" />
        </Button>
      </form>

      {tasks.length === 0 ? (
        <Empty title="Sin tareas" hint="Agregá lo que no querés olvidar hoy" />
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li
              key={t._id}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                t.done
                  ? "border-stone-100 bg-stone-50"
                  : "border-stone-200 bg-white",
              )}
            >
              <button
                type="button"
                onClick={() => void toggle({ id: t._id })}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                  t.done
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-stone-300 bg-white text-transparent hover:border-teal-500",
                )}
                aria-label={t.done ? "Desmarcar" : "Completar"}
              >
                <Check className="h-4 w-4" />
              </button>
              <span
                className={cn(
                  "flex-1 text-sm",
                  t.done ? "text-stone-400 line-through" : "text-stone-800",
                )}
              >
                {t.title}
              </span>
              <button
                type="button"
                onClick={() => void remove({ id: t._id })}
                className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
