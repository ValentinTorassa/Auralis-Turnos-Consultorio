"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button, Card, Input, Label } from "@/components/ui";
import { useEffect, useState } from "react";

export default function ConfigPage() {
  const settings = useQuery(api.settings.get);
  const types = useQuery(api.types.list) ?? [];
  const update = useMutation(api.settings.update);
  const createType = useMutation(api.types.create);

  const [workDayStart, setWorkDayStart] = useState("08:00");
  const [workDayEnd, setWorkDayEnd] = useState("20:00");
  const [defaultDurationMin, setDefaultDurationMin] = useState(50);
  const [psychiatristSlotCount, setPsychiatristSlotCount] = useState(6);
  const [psychiatristSlotDurationMin, setPsychiatristSlotDurationMin] =
    useState(30);
  const [saved, setSaved] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#6366F1");

  useEffect(() => {
    if (!settings) return;
    setWorkDayStart(settings.workDayStart);
    setWorkDayEnd(settings.workDayEnd);
    setDefaultDurationMin(settings.defaultDurationMin);
    setPsychiatristSlotCount(settings.psychiatristSlotCount);
    setPsychiatristSlotDurationMin(settings.psychiatristSlotDurationMin);
  }, [settings]);

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
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Configuración</h1>
        <p className="text-sm text-stone-500">
          Horarios, duración y tipos de turno
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Agenda</h2>
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
                onChange={(e) =>
                  setPsychiatristSlotCount(Number(e.target.value))
                }
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
            {saved && <span className="text-sm text-teal-700">Guardado</span>}
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Tipos de actividad</h2>
        <ul className="mb-4 space-y-2">
          {types.map((t) => (
            <li
              key={t._id}
              className="flex items-center gap-3 rounded-xl border border-stone-100 px-3 py-2"
            >
              <span
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              <span className="text-sm font-medium text-stone-800">
                {t.name}
              </span>
              {t.isPsychiatrist && (
                <span className="text-xs text-amber-700">Psiquiatría</span>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Nuevo tipo..."
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
          />
          <Input
            type="color"
            className="h-11 w-full sm:w-20 p-1"
            value={newTypeColor}
            onChange={(e) => setNewTypeColor(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!newTypeName.trim()}
            onClick={async () => {
              await createType({ name: newTypeName, color: newTypeColor });
              setNewTypeName("");
            }}
          >
            Agregar
          </Button>
        </div>
      </Card>

      <Card className="p-5 text-sm text-stone-600 leading-relaxed">
        <p className="font-medium text-stone-800 mb-1">Privacidad</p>
        <p>
          Los datos viven en tu proyecto Convex, protegidos con usuario y
          contraseña. Solo vos podés ver y editar tu agenda.
        </p>
      </Card>
    </div>
  );
}
