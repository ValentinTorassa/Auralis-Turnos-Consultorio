import { describe, expect, it } from "vitest";

import { appointmentTypeRules } from "../convex/appointmentTypeDefaults";
import { DEFAULT_TYPES } from "../convex/lib";

describe("built-in activity types", () => {
  it("requires a patient and tracks payment for Armas / CLU", () => {
    const type = DEFAULT_TYPES.find((item) => item.code === "armas_clu");
    expect(type).toBeDefined();
    expect(appointmentTypeRules(type!)).toMatchObject({
      requiresPatient: true,
      tracksPayment: true,
      supportsReminder: true,
      defaultDurationMin: 50,
    });
  });

  it("allows a long course without patient, payment, or reminder", () => {
    const type = DEFAULT_TYPES.find(
      (item) => item.code === "curso_capacitacion",
    );
    expect(type).toBeDefined();
    expect(appointmentTypeRules(type!)).toMatchObject({
      requiresPatient: false,
      tracksPayment: false,
      supportsReminder: false,
      defaultDurationMin: 225,
    });
  });
});
