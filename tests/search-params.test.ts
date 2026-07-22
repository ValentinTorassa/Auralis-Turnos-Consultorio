import { describe, expect, it } from "vitest";

import {
  agendaSearchParams,
  homeTaskSearchParams,
  patientListSearchParams,
} from "../src/lib/search-params";

describe("URL search parameter parsers", () => {
  it("accepts only supported agenda views", () => {
    expect(agendaSearchParams.view.parseServerSide("week")).toBe("week");
    expect(agendaSearchParams.view.parseServerSide("year")).toBe("day");
    expect(agendaSearchParams.view.parseServerSide(undefined)).toBe("day");
  });

  it("rejects invalid calendar dates", () => {
    expect(agendaSearchParams.date.parseServerSide("2026-07-22")).toBe(
      "2026-07-22",
    );
    expect(agendaSearchParams.date.parseServerSide("2026-02-29")).toBe("");
    expect(homeTaskSearchParams.tasks.parseServerSide("not-a-date")).toBe("");
  });

  it("bounds patient searches before they reach the query", () => {
    const oversizedQuery = "a".repeat(150);
    expect(patientListSearchParams.q.parseServerSide(oversizedQuery)).toHaveLength(
      120,
    );
  });
});
