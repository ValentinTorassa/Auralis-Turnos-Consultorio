import { describe, expect, it } from "vitest";

import { consistentAppointmentRef } from "../convex/backup";
import type { Id } from "../convex/_generated/dataModel";

const appt = (id: string, patientId?: string) =>
  ({ _id: id as Id<"appointments">, patientId: patientId as Id<"patients"> | undefined });

const rem = (appointmentId?: string, patientId?: string) => ({
  appointmentId: appointmentId as Id<"appointments"> | undefined,
  patientId: patientId as Id<"patients"> | undefined,
});

describe("consistentAppointmentRef", () => {
  const appointments = [appt("a1", "p1"), appt("a2", "p2"), appt("a3")];

  it("keeps a reference that still matches", () => {
    expect(consistentAppointmentRef(appointments, rem("a1", "p1"))).toBe("a1");
  });

  it("drops it when the appointment changed patient", () => {
    // El caso real: el aviso quedó cerrado apuntando a a1 y después al turno
    // le cambiaron el paciente. Antes esto rompía la copia entera.
    expect(
      consistentAppointmentRef(appointments, rem("a1", "p2")),
    ).toBeUndefined();
  });

  it("drops it when the appointment no longer exists", () => {
    expect(
      consistentAppointmentRef(appointments, rem("borrado", "p1")),
    ).toBeUndefined();
  });

  it("keeps a match where neither side has a patient", () => {
    expect(consistentAppointmentRef(appointments, rem("a3"))).toBe("a3");
  });

  it("drops it when only one side has a patient", () => {
    expect(consistentAppointmentRef(appointments, rem("a3", "p1"))).toBeUndefined();
    expect(consistentAppointmentRef(appointments, rem("a1"))).toBeUndefined();
  });

  it("leaves reminders without an appointment alone", () => {
    expect(
      consistentAppointmentRef(appointments, rem(undefined, "p1")),
    ).toBeUndefined();
  });
});
