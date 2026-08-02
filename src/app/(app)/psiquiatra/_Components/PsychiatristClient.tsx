"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useReducer } from "react";
import {
  Ban,
  Brain,
  CalendarPlus,
  LockOpen,
  Pencil,
  UserPlus,
  UserRoundPen,
  UserRoundX,
} from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { AppointmentModal } from "@/components/AppointmentForm";
import { IconBadge } from "@/components/Icons";
import { PatientPicker } from "@/components/PatientPicker";
import { Button, Card, Empty, Label, Modal } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { mergeFormState } from "@/lib/form-state";
import { actionErrorMessage } from "./helpers";

type PsychiatristState = {
  actionId: Id<"psychiatristSlots"> | null;
  assignId: Id<"psychiatristSlots"> | null;
  patientId?: Id<"patients">;
  editId: Id<"appointments"> | null;
  message: string;
  error: string;
};

export function PsychiatristClient() {
  const { data: slots = [] } = useQuery(
    convexQuery(api.psychiatrist.listUpcoming, {}),
  );
  const { data: types } = useQuery(convexQuery(api.types.list, {}));
  const ensure = useMutation({
    mutationFn: useConvexMutation(api.psychiatrist.ensureMonths),
  });
  const assign = useMutation({
    mutationFn: useConvexMutation(api.psychiatrist.assignPatient),
  });
  const reassign = useMutation({
    mutationFn: useConvexMutation(api.psychiatrist.reassignPatient),
  });
  const release = useMutation({
    mutationFn: useConvexMutation(api.psychiatrist.release),
  });
  const block = useMutation({
    mutationFn: useConvexMutation(api.psychiatrist.block),
  });
  const unblock = useMutation({
    mutationFn: useConvexMutation(api.psychiatrist.unblock),
  });
  const psychiatristType = types?.find((type) => type.isPsychiatrist);
  const [state, updateState] = useReducer(mergeFormState<PsychiatristState>, {
    actionId: null,
    assignId: null,
    patientId: undefined,
    editId: null,
    message: "",
    error: "",
  });
  const { actionId, assignId, patientId, editId, message: msg, error } = state;
  const busy = ensure.isPending;
  const setActionId = (actionId: Id<"psychiatristSlots"> | null) =>
    updateState({ actionId });
  const setAssignId = (assignId: Id<"psychiatristSlots"> | null) =>
    updateState({ assignId });
  const setPatientId = (patientId?: Id<"patients">) => updateState({ patientId });
  const setEditId = (editId: Id<"appointments"> | null) => updateState({ editId });
  const setMsg = (message: string) => updateState({ message });
  const setError = (error: string) => updateState({ error });

  const assignSlot = slots.find((slot) => slot._id === assignId);
  const editAppointment = slots.find(
    (slot) => slot.appointment?._id === editId,
  )?.appointment;

  async function generate() {
    setMsg("");
    setError("");
    try {
      const result = await ensure.mutateAsync({ monthsAhead: 6 });
      setMsg(
        result.created || result.updated || result.removed
          ? `Horarios reconciliados: ${result.created} creados, ${result.updated} actualizados y ${result.removed} retirados.`
          : result.skipped
            ? `No hubo cambios; ${result.skipped} horarios se conservaron sin superponer turnos o bloqueos.`
            : "Los horarios ya estaban actualizados.",
      );
    } catch (caught) {
      setError(actionErrorMessage(caught));
    }
  }

  async function handleAssign() {
    if (!assignSlot || !patientId) return;
    setActionId(assignSlot._id);
    setError("");
    try {
      if (assignSlot.state === "assigned") {
        await reassign.mutateAsync({ slotId: assignSlot._id, patientId });
        setMsg("Paciente cambiado sin alterar el pago ni el recordatorio del turno.");
      } else {
        if (!psychiatristType) {
          throw new Error("No existe un tipo de Psiquiatría configurado");
        }
        await assign.mutateAsync({
          slotId: assignSlot._id,
          patientId,
          typeId: psychiatristType._id,
        });
        setMsg("Turno de psiquiatría creado como confirmado y pago pendiente.");
      }
      setAssignId(null);
      setPatientId(undefined);
    } catch (caught) {
      setError(actionErrorMessage(caught));
    } finally {
      setActionId(null);
    }
  }

  async function runSlotAction(
    slotId: Id<"psychiatristSlots">,
    action: "release" | "block" | "unblock",
  ) {
    if (
      action === "release" &&
      !confirm("¿Liberar el horario? El turno se eliminará de forma recuperable.")
    ) {
      return;
    }
    setActionId(slotId);
    setError("");
    try {
      if (action === "release") await release.mutateAsync({ slotId });
      if (action === "block") await block.mutateAsync({ slotId });
      if (action === "unblock") await unblock.mutateAsync({ slotId });
      setMsg(
        action === "release"
          ? "Horario liberado y turno retirado de la agenda."
          : action === "block"
            ? "Horario bloqueado."
            : "Horario disponible nuevamente.",
      );
    } catch (caught) {
      setError(actionErrorMessage(caught));
    } finally {
      setActionId(null);
    }
  }

  const free = slots.filter((slot) => slot.state === "available").length;
  const taken = slots.filter((slot) => slot.state === "assigned").length;
  const blocked = slots.filter((slot) => slot.state === "blocked").length;
  const byMonth = slots.reduce<Map<string, typeof slots>>((acc, slot) => {
    const label = new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      month: "long",
      year: "numeric",
    }).format(new Date(slot.startTime));
    const list = acc.get(label);
    if (list) list.push(slot);
    else acc.set(label, [slot]);
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
          {busy ? "Reconciliando..." : "Actualizar próximos 6 meses"}
        </Button>
      </div>

      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
        La cantidad y duración se definen en Configuración. Al actualizarlas se
        reorganizan únicamente horarios futuros libres; las asignaciones y los
        bloqueos se conservan y nunca se crean superposiciones.
      </p>
      {msg && (
        <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {msg}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-stone-500">Libres</p>
          <p className="text-2xl font-semibold text-teal-800">{free}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-stone-500">Asignados</p>
          <p className="text-2xl font-semibold text-stone-900">{taken}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-stone-500">Bloqueados</p>
          <p className="text-2xl font-semibold text-amber-800">{blocked}</p>
        </Card>
      </div>

      {slots.length === 0 ? (
        <Empty
          title="No hay horarios generados"
          hint='Tocá "Actualizar próximos 6 meses" para generar los terceros viernes'
        />
      ) : (
        <div className="space-y-5">
          {[...byMonth.entries()].map(([monthLabel, monthSlots]) => (
            <section key={monthLabel}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500 capitalize">
                {monthLabel}
              </h2>
              <ul className="space-y-2">
                {monthSlots.map((slot) => {
                  const isAssigned = slot.state === "assigned";
                  const isBlocked = slot.state === "blocked";
                  const rowBusy = actionId === slot._id;
                  return (
                    <li
                      key={slot._id}
                      className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
                        isAssigned
                          ? "border-teal-200 bg-teal-50/40"
                          : isBlocked
                            ? "border-amber-200 bg-amber-50/50"
                            : "border-stone-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            isAssigned
                              ? "bg-teal-600"
                              : isBlocked
                                ? "bg-amber-500"
                                : "bg-stone-300"
                          }`}
                        />
                        <div>
                          <p className="font-semibold text-stone-900">
                            {formatDateTime(slot.startTime)}
                          </p>
                          <p className="text-sm text-stone-500">
                            {slot.patient?.fullName ??
                              (isBlocked
                                ? "Horario bloqueado"
                                : isAssigned
                                  ? "Asignación sin turno válido"
                                  : "Horario libre")}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {slot.state === "available" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={rowBusy || !psychiatristType}
                              onClick={() => setAssignId(slot._id)}
                            >
                              <UserPlus className="h-4 w-4" />
                              Asignar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={rowBusy}
                              onClick={() =>
                                void runSlotAction(slot._id, "block")
                              }
                            >
                              <Ban className="h-4 w-4" />
                              Bloquear
                            </Button>
                          </>
                        )}
                        {isBlocked && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={rowBusy}
                            onClick={() =>
                              void runSlotAction(slot._id, "unblock")
                            }
                          >
                            <LockOpen className="h-4 w-4" />
                            Desbloquear
                          </Button>
                        )}
                        {isAssigned && (
                          <>
                            {slot.appointment && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditId(slot.appointment!._id)}
                              >
                                <Pencil className="h-4 w-4" />
                                Abrir turno
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={rowBusy || !slot.appointment}
                              onClick={() => {
                                setPatientId(slot.appointment?.patientId);
                                setAssignId(slot._id);
                              }}
                            >
                              <UserRoundPen className="h-4 w-4" />
                              Cambiar paciente
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={rowBusy}
                              onClick={() =>
                                void runSlotAction(slot._id, "release")
                              }
                            >
                              <UserRoundX className="h-4 w-4" />
                              Liberar
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
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
        title={
          assignSlot?.state === "assigned"
            ? "Cambiar paciente"
            : "Asignar paciente"
        }
      >
        <div className="space-y-4">
          <div>
            <Label id="psychiatry-patient-label">Paciente</Label>
            <PatientPicker
              id="psychiatry-patient"
              aria-labelledby="psychiatry-patient-label"
              value={patientId}
              onChange={(id) => setPatientId(id)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!patientId || actionId === assignId}
            onClick={() => void handleAssign()}
          >
            {assignSlot?.state === "assigned"
              ? "Guardar cambio"
              : "Crear turno confirmado"}
          </Button>
          {assignSlot?.state !== "assigned" && (
            <p className="text-xs leading-relaxed text-stone-500">
              Se crea un turno normal de Psiquiatría, con pago pendiente y sin
              recordatorio. Podés activar el recordatorio al abrirlo.
            </p>
          )}
        </div>
      </Modal>

      <AppointmentModal
        open={Boolean(editAppointment)}
        onClose={() => setEditId(null)}
        title="Editar turno de psiquiatría"
        initial={editAppointment ?? undefined}
        onDone={() => {
          setEditId(null);
          setMsg("Turno actualizado.");
        }}
      />
    </div>
  );
}
