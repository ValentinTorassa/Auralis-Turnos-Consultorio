import { describe, expect, it } from "vitest";

import {
  KEEP_PER_USER,
  autoSnapshotId,
  backupsToPrune,
} from "../convex/backupAuto";

const at = (exportedAt: number) => ({ exportedAt });

describe("backupsToPrune", () => {
  it("keeps everything while under the limit", () => {
    const rows = Array.from({ length: KEEP_PER_USER }, (_, i) => at(i));
    expect(backupsToPrune(rows)).toEqual([]);
  });

  it("drops the oldest once the limit is exceeded", () => {
    const rows = Array.from({ length: KEEP_PER_USER + 3 }, (_, i) => at(i));
    const pruned = backupsToPrune(rows);
    expect(pruned).toHaveLength(3);
    expect(pruned.map((r) => r.exportedAt).sort((a, b) => a - b)).toEqual([
      0, 1, 2,
    ]);
  });

  it("prunes by date, not by insertion order", () => {
    const rows = [at(500), at(100), at(900), at(300)];
    expect(backupsToPrune(rows, 2)).toEqual([at(300), at(100)]);
  });
});

describe("autoSnapshotId", () => {
  it("matches the strict id format the backup parser demands", () => {
    const id = autoSnapshotId(Date.UTC(2026, 8, 13, 6, 0, 0), "abc123def456");
    expect(id).toMatch(/^[A-Za-z0-9-]{16,80}$/);
    expect(id).toBe("auto-20260913060000-abc123def456");
  });

  it("stays inside the 80 character ceiling", () => {
    const id = autoSnapshotId(Date.now(), "f".repeat(80));
    expect(id.length).toBeLessThanOrEqual(80);
    expect(id).toMatch(/^[A-Za-z0-9-]{16,80}$/);
  });
});
