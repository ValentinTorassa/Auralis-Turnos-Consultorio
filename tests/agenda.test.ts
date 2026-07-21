import { describe, expect, it } from "vitest";

import {
  formatTimelineMinute,
  getTimelineBounds,
  timeStringToMinutes,
} from "../src/lib/agenda";

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
