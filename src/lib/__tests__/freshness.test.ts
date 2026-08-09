// Freshness label tests (plan portfolio-card-system T6).
import { describe, it, expect } from "vitest";

import { freshnessLabel } from "@/lib/freshness";

const NOW = new Date("2026-07-20T12:00:00.000Z");

describe("freshnessLabel", () => {
  it("returns null for never-reviewed items", () => {
    expect(freshnessLabel(null, NOW)).toBeNull();
  });

  it("returns null for malformed dates", () => {
    expect(freshnessLabel("not-a-date", NOW)).toBeNull();
  });

  it("labels today", () => {
    expect(freshnessLabel("2026-07-20T09:00:00.000Z", NOW)).toBe("Reviewed today");
  });

  it("labels this week", () => {
    expect(freshnessLabel("2026-07-16T12:00:00.000Z", NOW)).toBe("Reviewed this week");
  });

  it("labels days ago", () => {
    expect(freshnessLabel("2026-07-01T12:00:00.000Z", NOW)).toBe("Reviewed 19 days ago");
  });

  it("labels months ago (singular and plural)", () => {
    expect(freshnessLabel("2026-06-01T12:00:00.000Z", NOW)).toBe("Reviewed 1 month ago");
    expect(freshnessLabel("2026-04-01T12:00:00.000Z", NOW)).toBe("Reviewed 3 months ago");
  });

  it("labels over a year ago", () => {
    expect(freshnessLabel("2024-01-01T12:00:00.000Z", NOW)).toBe("Reviewed over a year ago");
  });

  it("clamps future dates to today (no negative days)", () => {
    expect(freshnessLabel("2026-07-21T12:00:00.000Z", NOW)).toBe("Reviewed today");
  });
});
