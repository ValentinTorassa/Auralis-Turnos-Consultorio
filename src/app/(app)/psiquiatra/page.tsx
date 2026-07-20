"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button, Card, Empty, Modal } from "@/components/ui";
import { PatientPicker } from "@/components/PatientPicker";
import { formatDateTime } from "@/lib/utils";
import { Brain, CalendarPlus, UserPlus } from "lucide-react";
import { IconBadge } from "@/components/Icons";
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

  const byMonth = slots.reduce<Map<string, typeof slots>>((acc, s) => {
    const label = new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      month: "long",
      year: "numeric",
    }).format(new Date(s.startTime));
    const list = acc.get(label);
    if (list) list.push(s);
    else acc.set(label, [s]);
    return acc;
  }, new Map());

  return (
    <div className="anim-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <IconBadge tone="amber">
            <Brain className="h-5 w-5" />
          </IconBadge>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              Agenda del psiquiatra
            </h1>
            <p className="text-sm text-stone-500">
              Tercer viernes de cada mes · desde las 15:00
            </p>
          </div>
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
        <div className="space-y-5">
          {[...byMonth.entries()].map(([monthLabel, monthSlots]) => (
            <section key={monthLabel}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500 capitalize">
                {monthLabel}
              </h2>
              <ul className="space-y-2">
                {monthSlots.map((s) => (
                  <li
                    key={s._id}
                    className={`flex flex-col gap-2 rounded-2xl border bg-white px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
                      s.patientId
                        ? "border-teal-200 bg-teal-50/40"
                        : "border-stone-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          s.patientId ? "bg-teal-600" : "bg-stone-300"
                        }`}
                      />
                      <div>
                        <p className="font-semibold text-stone-900">
                          {formatDateTime(s.startTime)}
                        </p>
                        <p className="text-sm text-stone-500">
                          {s.patient
                            ? s.patient.fullName
                            : "Horario libre"}
                        </p>
                      </div>
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
            </section>
          ))}
        </div>
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
