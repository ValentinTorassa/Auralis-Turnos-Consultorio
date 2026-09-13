import { describe, expect, it } from "vitest";

import { appointmentTypeRules } from "../convex/appointmentTypeDefaults";
import { DEFAULT_TYPES } from "../convex/lib";
import { normalizeReportDueAt } from "../convex/appointments";
import {
  daysUntil,
  deadlineLabel,
  deadlineTone,
} from "../src/app/(app)/_Components/helpers";

describe("which activity types produce a report", () => {
  it("marks every pericia", () => {
    const pericias = DEFAULT_TYPES.filter((t) => t.code.startsWith("pericia_"));
    expect(pericias).toHaveLength(3);
    for (const type of pericias) {
      expect(appointmentTypeRules(type).tracksReport).toBe(true);
    }
  });

  it("leaves the rest out", () => {
    const others = DEFAULT_TYPES.filter((t) => !t.code.startsWith("pericia_"));
    for (const type of others) {
      expect(appointmentTypeRules(type).tracksReport).toBe(false);
    }
  });

  it("defaults to false for a custom type that never heard of reports", () => {
    expect(
      appointmentTypeRules({ name: "Taller propio" }).tracksReport,
    ).toBe(false);
  });
});

describe("normalizeReportDueAt", () => {
  it("treats empty and zero as 'sin plazo'", () => {
    expect(normalizeReportDueAt(undefined)).toBeUndefined();
    expect(normalizeReportDueAt(0)).toBeUndefined();
  });

  it("keeps a valid date", () => {
    const due = Date.UTC(2026, 9, 30, 15, 0, 0);
    expect(normalizeReportDueAt(due)).toBe(due);
  });

  it("rejects dates outside the supported window", () => {
    expect(() => normalizeReportDueAt(Date.UTC(1990, 0, 1))).toThrow(
      "Fecha de entrega inválida",
    );
    expect(() => normalizeReportDueAt(Date.UTC(2200, 0, 1))).toThrow(
      "Fecha de entrega inválida",
    );
  });
});

describe("deadline display", () => {
  const noon = Date.UTC(2026, 8, 13, 12, 0, 0);

  it("counts calendar days, not elapsed hours", () => {
    // 23:00 de hoy y 01:00 de mañana están a 2 horas, pero son días distintos.
    expect(daysUntil(Date.UTC(2026, 8, 13, 23, 0), noon)).toBe(0);
    expect(daysUntil(Date.UTC(2026, 8, 14, 1, 0), noon)).toBe(1);
  });

  it("labels the near cases in words", () => {
    expect(deadlineLabel(0)).toBe("Vence hoy");
    expect(deadlineLabel(1)).toBe("Vence mañana");
    expect(deadlineLabel(-1)).toBe("Vencido ayer");
    expect(deadlineLabel(-4)).toBe("Vencido hace 4 días");
    expect(deadlineLabel(9)).toBe("Faltan 9 días");
  });

  it("escalates the tone as the deadline approaches", () => {
    expect(deadlineTone(-1)).toBe("late");
    expect(deadlineTone(0)).toBe("soon");
    expect(deadlineTone(3)).toBe("soon");
    expect(deadlineTone(4)).toBe("calm");
  });
});
