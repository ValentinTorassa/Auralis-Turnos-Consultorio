import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { thirdFridayOfMonth } from "../convex/lib";
import {
  assertPsychiatristSlotAssignable,
  intervalsOverlap,
  isLegacyPsychiatristPlaceholder,
  psychiatristSlotTimes,
  validatePsychiatristGeneration,
} from "../convex/psychiatristModel";

describe("third-Friday psychiatrist generation", () => {
  it("keeps the Buenos Aires third Friday at 15:00", () => {
    expect(thirdFridayOfMonth(2026, 7).getUTCDate()).toBe(21);
    const slots = psychiatristSlotTimes(2026, 7, 3, 30);
    expect(new Date(slots[0].startTime).toISOString()).toBe(
      "2026-08-21T18:00:00.000Z",
    );
    expect(slots.map((slot) => slot.monthKey)).toEqual([
      "2026-08",
      "2026-08",
      "2026-08",
    ]);
    expect(
      slots.some(
        (slot, index) =>
          slots[index + 1] && intervalsOverlap(slot, slots[index + 1]),
      ),
    ).toBe(false);
  });

  it("uses stable index keys while duration changes the generated model", () => {
    const short = psychiatristSlotTimes(2026, 8, 3, 30);
    const long = psychiatristSlotTimes(2026, 8, 3, 45);
    expect(short.map((slot) => slot.generationKey)).toEqual(
      long.map((slot) => slot.generationKey),
    );
    expect(short[1].startTime).not.toBe(long[1].startTime);
  });

  it("rejects abusive generation bounds", () => {
    expect(() => validatePsychiatristGeneration(21, 30, 6)).toThrow(
      "cantidad de turnos",
    );
    expect(() => validatePsychiatristGeneration(6, 30, 13)).toThrow(
      "generación",
    );
    expect(() => thirdFridayOfMonth(2026, 12)).toThrow("Mes inválido");
  });
});

describe("psychiatrist assignment race guards", () => {
  it("only accepts an unlinked available slot", () => {
    expect(() =>
      assertPsychiatristSlotAssignable({ state: "available" }),
    ).not.toThrow();
    expect(() =>
      assertPsychiatristSlotAssignable({ state: "assigned" }),
    ).toThrow("ya no está disponible");
    expect(() =>
      assertPsychiatristSlotAssignable({
        state: "available",
        appointmentId: "appointment-1",
      }),
    ).toThrow("ya no está disponible");
  });
});

describe("psychiatrist slot migration", () => {
  const legacyPlaceholder = {
    isPsychiatrist: true,
    title: "Turno psiquiatra (libre)",
    paymentStatus: "na",
    reminderEnabled: false,
  };

  it("only classifies the exact generated unassigned placeholder as disposable", () => {
    expect(isLegacyPsychiatristPlaceholder(legacyPlaceholder)).toBe(true);
    expect(
      isLegacyPsychiatristPlaceholder({
        ...legacyPlaceholder,
        patientId: "patient-1",
      }),
    ).toBe(false);
    expect(
      isLegacyPsychiatristPlaceholder({
        ...legacyPlaceholder,
        title: "Consulta real sin paciente",
      }),
    ).toBe(false);
    expect(
      isLegacyPsychiatristPlaceholder({ ...legacyPlaceholder, deletedAt: 1 }),
    ).toBe(false);
  });

  it("contains idempotent conversion and appointment-link branches", () => {
    const migration = readFileSync(
      new URL("../convex/migrations.ts", import.meta.url),
      "utf8",
    );
    expect(migration).toContain("migratePsychiatristSlots");
    expect(migration).toContain("deletedAt: now");
    expect(migration).toContain('withIndex("by_user_appointment"');
    expect(migration).toContain("exact?.state === \"available\"");
    expect(migration).toContain("linked-appointment:");
  });
});
