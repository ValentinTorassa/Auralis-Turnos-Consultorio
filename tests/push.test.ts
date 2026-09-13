import { describe, expect, it } from "vitest";

import { STALE_AFTER_MS, isDeliverable, isStale } from "../convex/push";
import { urlBase64ToUint8Array } from "../src/lib/push";

const NOW = Date.UTC(2026, 8, 13, 15, 0, 0);
const base = { active: true, done: false, dueAt: NOW - 60_000 };

describe("isDeliverable", () => {
  it("delivers an active reminder that already came due", () => {
    expect(isDeliverable(base, NOW)).toBe(true);
  });

  it("does not deliver one that is not due yet", () => {
    expect(isDeliverable({ ...base, dueAt: NOW + 60_000 }, NOW)).toBe(false);
  });

  it("never delivers twice", () => {
    expect(
      isDeliverable({ ...base, notificationSentAt: NOW - 30_000 }, NOW),
    ).toBe(false);
  });

  it("skips reminders already done or dismissed", () => {
    expect(isDeliverable({ ...base, done: true }, NOW)).toBe(false);
    expect(isDeliverable({ ...base, active: false }, NOW)).toBe(false);
  });

  it("delivers exactly at the due moment", () => {
    expect(isDeliverable({ ...base, dueAt: NOW }, NOW)).toBe(true);
  });
});

describe("isStale", () => {
  it("treats a fresh overdue reminder as deliverable", () => {
    expect(isStale({ dueAt: NOW - STALE_AFTER_MS + 1000 }, NOW)).toBe(false);
  });

  it("discards one older than the window, so a dead cron does not spam", () => {
    expect(isStale({ dueAt: NOW - STALE_AFTER_MS - 1000 }, NOW)).toBe(true);
  });
});

describe("urlBase64ToUint8Array", () => {
  it("decodes url-safe base64 without padding", () => {
    // "Hi!" en base64 estándar es "SGkh"; sin padding y con alfabeto url-safe.
    expect([...urlBase64ToUint8Array("SGkh")]).toEqual([72, 105, 33]);
  });

  it("restores missing padding", () => {
    expect(urlBase64ToUint8Array("SGk")).toHaveLength(2);
  });

  it("maps the url-safe alphabet back to standard base64", () => {
    const urlSafe = "-_8";
    expect([...urlBase64ToUint8Array(urlSafe)]).toEqual([251, 255]);
  });

  it("returns a plain ArrayBuffer, which applicationServerKey requires", () => {
    expect(urlBase64ToUint8Array("SGkh").buffer).toBeInstanceOf(ArrayBuffer);
  });
});
