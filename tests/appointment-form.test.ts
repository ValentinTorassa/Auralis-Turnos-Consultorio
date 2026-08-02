import { describe, expect, it } from "vitest";

import {
  appointmentDateParts,
  minutesToTime,
  timeToMinutes,
} from "../src/lib/appointment-form";

describe("appointment form date helpers", () => {
  it("formats timestamps in the Buenos Aires timezone", () => {
    expect(appointmentDateParts(Date.UTC(2026, 6, 22, 15, 30))).toEqual({
      date: "2026-07-22",
      time: "12:30",
    });
  });

  it("converts time values to minutes", () => {
    expect(timeToMinutes("09:30")).toBe(570);
  });

  it("normalizes minute offsets across midnight", () => {
    expect(minutesToTime(1445)).toBe("00:05");
    expect(minutesToTime(-5)).toBe("23:55");
  });
});
