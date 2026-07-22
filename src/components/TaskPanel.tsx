"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button, Card, Empty, Input } from "./ui";
import { IconBadge } from "./Icons";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Plus,
  Trash2,
} from "lucide-react";
import { addDays, cn, todayKey } from "@/lib/utils";

function shortLabel(date: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00-03:00`));
}

export function TaskPanel({
  date,
  onDateChange,
}: {
  date: string;
  onDateChange?: (date: string) => void;
}) {
  const tasks = useQuery(api.tasks.byDate, { date }) ?? [];
  const create = useMutation(api.tasks.create);
  const toggle = useMutation(api.tasks.toggle);
  const remove = useMutation(api.tasks.remove);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const isToday = date === todayKey();

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
      <div className="mb-4 flex items-center gap-2.5">
        <IconBadge tone="violet" className="h-9 w-9 rounded-xl">
          <ListTodo className="h-4 w-4" />
        </IconBadge>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-stone-900">
            {isToday ? "Tareas de hoy" : "Tareas"}
          </h2>
          <p className="text-xs text-stone-500">
            {pending === 0
              ? "Nada pendiente"
              : pending === 1
                ? "1 pendiente"
                : `${pending} pendientes`}
          </p>
        </div>
      </div>

      {onDateChange && (
        <div className="mb-4 flex items-center gap-1.5 rounded-2xl bg-stone-100/80 p-1 ring-1 ring-stone-200/60">
          <button
            type="button"
            onClick={() => onDateChange(addDays(date, -1))}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-500 transition hover:bg-white hover:text-stone-900 hover:shadow-sm"
            aria-label="Día anterior"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <label className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-2 shadow-sm">
            <CalendarDays className="h-4 w-4 shrink-0 text-violet-600" />
            <span className="sr-only">Fecha de las tareas</span>
            <input
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              className="h-9 min-w-0 flex-1 bg-transparent text-sm font-semibold text-stone-800 outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => onDateChange(addDays(date, 1))}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-500 transition hover:bg-white hover:text-stone-900 hover:shadow-sm"
            aria-label="Día siguiente"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => onDateChange(todayKey())}
              className="shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-xs font-semibold text-teal-700 shadow-sm ring-1 ring-teal-100 transition hover:bg-teal-50"
            >
              Volver a hoy
            </button>
          )}
        </div>
      )}

      <form onSubmit={addTask} className="mb-4 flex gap-2">
        <Input
          aria-label="Nueva tarea"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            isToday
              ? "Ej. Llamar al abogado..."
              : `Tarea para ${shortLabel(date)}...`
          }
        />
        <Button
          type="submit"
          disabled={adding || !title.trim()}
          size="md"
          aria-label="Agregar"
          className="shrink-0 px-3"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </Button>
      </form>

      {tasks.length === 0 ? (
        <Empty
          title="Sin tareas"
          hint={
            isToday
              ? "Agregá lo que no querés olvidar hoy"
              : "Agregá lo que no querés olvidar ese día"
          }
        />
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li
              key={t._id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition",
                t.done
                  ? "border-stone-100 bg-stone-50"
                  : "border-stone-200 bg-white shadow-sm",
              )}
            >
              <button
                type="button"
                onClick={() => void toggle({ id: t._id })}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition",
                  t.done
                    ? "border-teal-600 bg-teal-600 text-white shadow-sm shadow-teal-700/20"
                    : "border-stone-300 bg-white text-transparent hover:border-teal-500 hover:bg-teal-50",
                )}
                aria-label={t.done ? "Desmarcar" : "Completar"}
              >
                <Check className="h-4 w-4" strokeWidth={2.75} />
              </button>
              <span
                className={cn(
                  "flex-1 text-sm font-medium",
                  t.done ? "text-stone-400 line-through" : "text-stone-800",
                )}
              >
                {t.title}
              </span>
              <button
                type="button"
                onClick={() => void remove({ id: t._id })}
                className="rounded-xl p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
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
