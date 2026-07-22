import { describe, expect, it } from "vitest";

import {
  eventOverlapsDay,
  eventOverlapsRange,
  formatTimelineMinute,
  getEventSpanForDay,
  getTimelineBounds,
  timeStringToMinutes,
} from "../src/lib/agenda";
import { getCalendarRange } from "../src/lib/utils";

describe("agenda timeline bounds", () => {
  it("extends a 21:00 workday to show a course ending at 21:45", () => {
    expect(
      getTimelineBounds("08:45", "21:00", [
        { startMinute: 18 * 60, endMinute: 21 * 60 + 45 },
      ]),
    ).toEqual({
      habitualStart: 8 * 60 + 45,
      habitualEnd: 21 * 60,
      displayStart: 8 * 60 + 45,
      displayEnd: 22 * 60,
    });
  });

  it("extends upward and rounds to a half hour", () => {
    const bounds = getTimelineBounds("08:45", "21:00", [
      { startMinute: 6 * 60 + 10, endMinute: 7 * 60 },
    ]);
    expect(bounds.displayStart).toBe(6 * 60);
    expect(bounds.displayEnd).toBe(21 * 60);
  });

  it("supports overnight labels", () => {
    expect(formatTimelineMinute(24 * 60 + 30)).toBe("00:30 +1");
  });

  it("preserves minute-accurate settings", () => {
    expect(timeStringToMinutes("08:45", 0)).toBe(525);
  });
});

describe("Buenos Aires calendar ranges", () => {
  it("uses Buenos Aires midnight at month boundaries", () => {
    const march = getCalendarRange("2026-03-18", "month");
    expect(new Date(march.startMs).toISOString()).toBe(
      "2026-03-01T03:00:00.000Z",
    );
    expect(new Date(march.endMs).toISOString()).toBe(
      "2026-04-01T03:00:00.000Z",
    );
  });

  it("rolls December into the next year", () => {
    const december = getCalendarRange("2026-12-31", "month");
    expect(new Date(december.endMs).toISOString()).toBe(
      "2027-01-01T03:00:00.000Z",
    );
  });
});

describe("agenda overlap", () => {
  const day = "2026-07-22";
  const { startMs, endMs } = getCalendarRange(day, "day");

  it("includes an overnight event on both calendar days", () => {
    const event = {
      startTime: startMs - 60 * 60_000,
      endTime: startMs + 60 * 60_000,
    };
    expect(eventOverlapsDay(event, "2026-07-21")).toBe(true);
    expect(eventOverlapsDay(event, day)).toBe(true);
    expect(getEventSpanForDay(event, day)).toEqual({
      startMinute: 0,
      endMinute: 60,
    });
  });

  it("treats ranges as half-open at midnight", () => {
    expect(
      eventOverlapsRange(
        { startTime: startMs - 60_000, endTime: startMs },
        startMs,
        endMs,
      ),
    ).toBe(false);
    expect(
      eventOverlapsRange(
        { startTime: endMs, endTime: endMs + 60_000 },
        startMs,
        endMs,
      ),
    ).toBe(false);
  });
});
