import { describe, expect, it } from "vitest";

import { normalizeAmount } from "../convex/appointments";
import { isDebt } from "../convex/payments";
import {
  currentMonthKey,
  monthRange,
  shiftMonth,
} from "../src/app/(app)/caja/_Components/helpers";

describe("normalizeAmount", () => {
  it("treats empty and zero as 'sin importe' instead of a $0 charge", () => {
    expect(normalizeAmount(undefined)).toBeUndefined();
    expect(normalizeAmount(0)).toBeUndefined();
  });

  it("rounds to whole pesos", () => {
    expect(normalizeAmount(25_499.6)).toBe(25_500);
  });

  it("rejects negatives and absurd values", () => {
    expect(() => normalizeAmount(-1)).toThrow("Importe inválido");
    expect(() => normalizeAmount(100_000_001)).toThrow("Importe inválido");
    expect(() => normalizeAmount(Number.NaN)).toThrow("Importe inválido");
  });
});

describe("isDebt", () => {
  it("counts an explicit 'debe'", () => {
    expect(isDebt({ status: "completed", paymentStatus: "owes" })).toBe(true);
  });

  it("counts a finished session left unpaid", () => {
    expect(isDebt({ status: "completed", paymentStatus: "unpaid" })).toBe(true);
  });

  it("does not count a future session that is simply not paid yet", () => {
    expect(isDebt({ status: "confirmed", paymentStatus: "unpaid" })).toBe(false);
  });

  it("does not count cancellations or non-billable types", () => {
    expect(isDebt({ status: "cancelled", paymentStatus: "unpaid" })).toBe(false);
    expect(isDebt({ status: "completed", paymentStatus: "na" })).toBe(false);
  });
});

describe("month range", () => {
  it("covers the whole month in Argentine time", () => {
    const { startMs, endMs } = monthRange("2026-09");
    expect(new Date(startMs).toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(new Date(endMs).toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });

  it("handles February and the December rollover", () => {
    expect(monthRange("2026-02").endMs).toBe(monthRange("2026-03").startMs);
    expect(monthRange("2026-12").endMs).toBe(monthRange("2027-01").startMs);
  });

  it("shifts months across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-09", 0)).toBe("2026-09");
  });

  it("builds a key the range helper accepts", () => {
    const key = currentMonthKey(new Date("2026-09-13T18:00:00Z"));
    expect(key).toBe("2026-09");
    expect(monthRange(key).endMs).toBeGreaterThan(monthRange(key).startMs);
  });

  it("uses Argentine time for the key near UTC midnight", () => {
    // 2026-10-01T02:00Z is still 30 de septiembre en Argentina (UTC-3).
    expect(currentMonthKey(new Date("2026-10-01T02:00:00Z"))).toBe("2026-09");
  });
});
