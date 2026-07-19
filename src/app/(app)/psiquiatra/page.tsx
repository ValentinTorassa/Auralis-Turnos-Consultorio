"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button, Card, Empty, Modal } from "@/components/ui";
import { PatientPicker } from "@/components/PatientPicker";
import { formatDateTime } from "@/lib/utils";
import { CalendarPlus, UserPlus } from "lucide-react";
import { useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";

export default function PsiquiatraPage() {
  const slots = useQuery(api.psychiatrist.listUpcoming) ?? [];
  const ensure = useMutation(api.psychiatrist.ensureMonths);
  const assign = useMutation(api.psychiatrist.assignPatient);
  const [busy, setBusy] = useState(false);
  const [assignId, setAssignId] = useState<Id<"appointments"> | null>(null);
  const [patientId, setPatientId] = useState<Id<"patients"> | undefined>();
  const [msg, setMsg] = useState("");

  async function generate() {
    setBusy(true);
    setMsg("");
    try {
      const res = await ensure({ monthsAhead: 6 });
      setMsg(
        res.created === 0
          ? "Los slots ya estaban generados."
          : `Se crearon ${res.created} horarios libres.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAssign() {
    if (!assignId || !patientId) return;
    await assign({ appointmentId: assignId, patientId });
    setAssignId(null);
    setPatientId(undefined);
  }

  const free = slots.filter((s) => !s.patientId).length;
  const taken = slots.filter((s) => s.patientId).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">
            Agenda del psiquiatra
          </h1>
          <p className="text-sm text-stone-500">
            Tercer viernes de cada mes · desde las 15:00
          </p>
        </div>
        <Button onClick={() => void generate()} disabled={busy}>
          <CalendarPlus className="h-4 w-4" />
          {busy ? "Generando..." : "Generar próximos 6 meses"}
        </Button>
      </div>

      {msg && (
        <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {msg}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs uppercase text-stone-500">Libres</p>
          <p className="text-2xl font-semibold text-teal-800">{free}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-stone-500">Asignados</p>
          <p className="text-2xl font-semibold text-stone-900">{taken}</p>
        </Card>
      </div>

      {slots.length === 0 ? (
        <Empty
          title="No hay turnos generados"
          hint='Tocá "Generar próximos 6 meses" para crear los terceros viernes automáticamente'
        />
      ) : (
        <ul className="space-y-2">
          {slots.map((s) => (
            <li
              key={s._id}
              className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-stone-900">
                  {formatDateTime(s.startTime)}
                </p>
                <p className="text-sm text-stone-500">
                  {s.patient
                    ? s.patient.fullName
                    : s.title || "Horario libre"}
                </p>
              </div>
              {!s.patientId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAssignId(s._id)}
                >
                  <UserPlus className="h-4 w-4" />
                  Asignar paciente
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!assignId}
        onClose={() => {
          setAssignId(null);
          setPatientId(undefined);
        }}
        title="Asignar paciente al turno"
      >
        <div className="space-y-4">
          <PatientPicker value={patientId} onChange={(id) => setPatientId(id)} />
          <Button
            className="w-full"
            disabled={!patientId}
            onClick={() => void handleAssign()}
          >
            Confirmar asignación
          </Button>
        </div>
      </Modal>
    </div>
  );
}
