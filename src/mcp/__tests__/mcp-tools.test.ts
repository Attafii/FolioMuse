import { describe, it, expect } from "vitest";

import { TOOLS } from "@/mcp/tools";
import {
  aggregatePatternRows,
  matchResumeToSummaries,
  type PatternRow,
} from "@/mcp/data";
import type { GalleryItemSummary } from "@/domain/curation/types";

// ── Charter contract: the tool surface itself ────────────────────────────────

describe("MCP tool registry (charter contract)", () => {
  const FORBIDDEN = ["clone", "contentblob", "structurejson", "full content", "full-content"];

  it("exposes exactly the four safe-projection tools", () => {
    expect(TOOLS.map((t) => t.name).sort()).toEqual([
      "get_portfolio_reference",
      "list_section_patterns",
      "recommend_portfolios_for_resume",
      "search_portfolios",
    ]);
  });

  it("never offers a cloning or full-content fetch tool (ADR-0001/NG1)", () => {
    for (const tool of TOOLS) {
      const hay = `${tool.name} ${tool.description}`.toLowerCase();
      for (const bad of FORBIDDEN) {
        expect(hay.includes(bad), `${tool.name} must not mention "${bad}"`).toBe(false);
      }
    }
  });

  // Handlers hit the live gallery corpus (~2k rows) — allow DB latency.
  it("every handler output carries the do-not-copy usage note", { timeout: 30_000 }, async () => {
    for (const tool of TOOLS) {
      const args =
        tool.name === "get_portfolio_reference"
          ? { id: "nonexistent-id" }
          : tool.name === "recommend_portfolios_for_resume"
            ? { resumeText: "frontend developer with react and tailwind experience" }
            : tool.name === "search_portfolios"
              ? { limit: 1 }
              : {};
      const res = await tool.handler(args);
      const text = res.content[0]?.text ?? "";
      // Reference tool returns not_found payload (still safe); others include note.
      if (!text.includes("not_found_or_not_public")) {
        expect(
          text.toLowerCase().includes("never copy") ||
            text.toLowerCase().includes("reference & derive"),
          `${tool.name} should carry usage note`,
        ).toBe(true);
      }
    }
  });
});

// ── R2 floor aggregation (pure) ──────────────────────────────────────────────

describe("aggregatePatternRows (R2 floor)", () => {
  const rows = (spec: [string, string, string][]): PatternRow[] =>
    spec.map(([sectionType, creatorId, itemTitle]) => ({ sectionType, creatorId, itemTitle }));

  it("marks a pattern met when ≥3 items AND ≥2 distinct creators", () => {
    const out = aggregatePatternRows(
      rows([
        ["hero", "c1", "A — Portfolio"],
        ["hero", "c1", "A2 — Portfolio"],
        ["hero", "c2", "B — Portfolio"],
        ["hero", "c3", "C — Portfolio"],
      ]),
    );
    const hero = out.find((p) => p.sectionType === "hero")!;
    expect(hero.itemCount).toBe(4);
    expect(hero.distinctCreators).toBe(3);
    expect(hero.r2FloorMet).toBe(true);
  });

  it("flags below-floor patterns (single creator, even with many items)", () => {
    const out = aggregatePatternRows(
      rows([
        ["contact CTA", "c1", "A — Portfolio"],
        ["contact CTA", "c1", "B — Portfolio"],
        ["contact CTA", "c1", "C — Portfolio"],
      ]),
    );
    const cta = out.find((p) => p.sectionType === "contact CTA")!;
    expect(cta.r2FloorMet).toBe(false); // 3 items but 1 creator
  });

  it("caps examples at 5 and sorts by size desc", () => {
    const many: PatternRow[] = [];
    for (let i = 0; i < 8; i++) {
      many.push({ sectionType: "hero", creatorId: `c${i}`, itemTitle: `T${i} — Portfolio` });
    }
    many.push({ sectionType: "about", creatorId: "cx", itemTitle: "X — Portfolio" });
    const out = aggregatePatternRows(many);
    expect(out[0].sectionType).toBe("hero");
    expect(out[0].examples.length).toBe(5);
  });
});

// ── Resume matching (pure) ───────────────────────────────────────────────────

function summary(overrides: Partial<GalleryItemSummary>): GalleryItemSummary {
  return {
    id: "x",
    title: "T — Portfolio",
    creatorRole: "Frontend",
    styleTags: [],
    stackTags: [],
    qualityLevel: "L2",
    complianceStatus: "PASS",
    status: "ACCEPTED",
    attribution: {
      creatorName: "C",
      sourceUrl: "https://example.com",
      licenseType: "EXPLICIT_PERMISSION",
      consentDate: "2026-01-01T00:00:00.000Z",
    },
    consentTier: "DISPLAY",
    reviewedAt: null,
    duplicateOfId: null,
    mediaUrl: null,
    ...overrides,
  };
}

describe("matchResumeToSummaries", () => {
  it("boosts role alignment and tags, ranks accordingly", () => {
    const items = [
      summary({ id: "fe", creatorRole: "Frontend", styleTags: ["react", "tailwind"] }),
      summary({ id: "be", creatorRole: "Backend" }),
      summary({
        id: "fe4",
        creatorRole: "Frontend",
        qualityLevel: "L4",
        stackTags: ["React"],
      }),
    ];
    const out = matchResumeToSummaries(
      "Frontend engineer, 3 years React and Tailwind, design systems.",
      items,
      10,
    );
    expect(out[0].item.id).toBe("fe4"); // role + tag + L4
    expect(out.some((m) => m.item.id === "fe")).toBe(true);
    expect(out.every((m) => m.item.id !== "be" || m.score < out[0].score)).toBe(true);
    const feRec = out.find((m) => m.item.id === "fe")!;
    expect(feRec.reasons.some((r) => r.startsWith("ROLE_MATCH"))).toBe(true);
    expect(feRec.reasons.some((r) => r.startsWith("TAG_MATCH:react"))).toBe(true);
  });

  it("returns empty when nothing matches", () => {
    const out = matchResumeToSummaries(
      "kubernetes cluster operator",
      [summary({ id: "a", creatorRole: "Designer" })],
      10,
    );
    expect(out).toEqual([]);
  });
});
