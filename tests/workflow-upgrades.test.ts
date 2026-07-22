import { describe, expect, it } from "vitest";

import {
  appointmentOccurrences,
  isConflictingAppointment,
  validateAppointmentInterval,
} from "../convex/appointments";
import {
  isAppointmentDebt,
  normalizePatientSearch,
} from "../convex/patients";
import { isValidDateKey } from "../convex/lib";
import {
  normalizeArgentineWhatsapp,
  shouldShowPaymentAsDebt,
} from "../src/lib/utils";

describe("weekly appointment materialization", () => {
  const start = Date.parse("2026-07-22T12:00:00Z");
  const end = Date.parse("2026-07-22T12:50:00Z");

  it("creates bounded weekly occurrences without changing duration", () => {
    const occurrences = appointmentOccurrences(start, end, 4);
    expect(occurrences).toHaveLength(4);
    expect(occurrences[3].startTime - occurrences[0].startTime).toBe(
      21 * 24 * 60 * 60 * 1000,
    );
    expect(occurrences.every((row) => row.endTime - row.startTime === 50 * 60_000)).toBe(true);
  });

  it("rejects unsupported recurrence and appointment bounds", () => {
    expect(() => appointmentOccurrences(start, end, 5)).toThrow(
      "Cantidad de repeticiones inválida",
    );
    expect(() => validateAppointmentInterval(start, start + 60_000)).toThrow(
      "La duración debe estar entre 5 minutos y 24 horas",
    );
  });
});

describe("appointment conflicts", () => {
  const appointment = {
    _id: "appointment-1",
    startTime: 1_000,
    endTime: 2_000,
    status: "confirmed",
  };

  it("uses half-open overlap boundaries", () => {
    expect(isConflictingAppointment(appointment, 500, 1_001)).toBe(true);
    expect(isConflictingAppointment(appointment, 2_000, 3_000)).toBe(false);
    expect(isConflictingAppointment(appointment, 0, 1_000)).toBe(false);
  });

  it("ignores cancelled, deleted, and currently edited appointments", () => {
    expect(
      isConflictingAppointment({ ...appointment, status: "cancelled" }, 1_000, 2_000),
    ).toBe(false);
    expect(
      isConflictingAppointment({ ...appointment, deletedAt: 1 }, 1_000, 2_000),
    ).toBe(false);
    expect(
      isConflictingAppointment(appointment, 1_000, 2_000, appointment._id),
    ).toBe(false);
  });
});

describe("payment debt semantics", () => {
  it("only treats completed unpaid appointments as debt", () => {
    expect(isAppointmentDebt("confirmed", "unpaid")).toBe(false);
    expect(shouldShowPaymentAsDebt("confirmed", "owes")).toBe(false);
    expect(isAppointmentDebt("completed", "owes")).toBe(true);
    expect(shouldShowPaymentAsDebt("completed", "unpaid")).toBe(true);
    expect(isAppointmentDebt("cancelled", "owes")).toBe(false);
  });
});

describe("patient normalization", () => {
  it("rejects calendar dates that only look structurally valid", () => {
    expect(isValidDateKey("2026-02-28")).toBe(true);
    expect(isValidDateKey("2026-02-31")).toBe(false);
  });

  it("normalizes accents and whitespace for search", () => {
    expect(normalizePatientSearch("  María   José Álvarez ")).toBe(
      "maria jose alvarez",
    );
  });

  it.each([
    ["0341 15 612-3456", "5493416123456"],
    ["+54 341 15 612-3456", "5493416123456"],
    ["+54 9 341 612-3456", "5493416123456"],
    ["011 15 1234-5678", "5491112345678"],
  ])("normalizes Argentine mobile %s", (input, expected) => {
    expect(normalizeArgentineWhatsapp(input)).toBe(expected);
  });
});
