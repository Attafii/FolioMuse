// Section library service tests (plan section-library-detail T5/T6).
// Proves eligible-only guards, taxonomy filter, safe projections, similar
// sections, and aggregation-floor handling with in-memory fakes.

import { describe, it, expect } from "vitest";

import {
  listSectionCards,
  getSectionDetail,
  selectSimilarSections,
  type SectionRowProvider,
} from "@/domain/sections/section-service";
import { SectionTypeSchema } from "@/domain/curation/section-schemas";
import { SectionCardSchema, SectionDetailSchema } from "@/domain/curation/section-schemas";

function row(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    sectionType: "hero",
    title: `Section ${id}`,
    desktopCropUrl: "https://cdn.example.com/crop.webp",
    mobileCropUrl: null,
    lessons: null,
    doNotCopyNote: null,
    itemId: `item-${id}`,
    creatorName: "Jane Doe",
    creatorRole: "Product Designer",
    styleTags: ["minimal"],
    stackTags: ["React"],
    sourceUrl: "https://jane-doe.com/portfolio",
    licenseType: "EXPLICIT_PERMISSION",
    consentDate: "2026-01-15T00:00:00.000Z",
    status: "ACCEPTED",
    complianceStatus: "PASS",
    consentRevokedAt: null,
    ...overrides,
  };
}

function provider(rows: ReturnType<typeof row>[]): SectionRowProvider {
  return {
    listRows: async () => rows,
    findRowById: async (id) => rows.find((r) => r.id === id) ?? null,
  };
}

describe("listSectionCards", () => {
  it("returns only cards for eligible parents (ACCEPTED, non-FLAG, not revoked)", async () => {
    const p = provider([
      row("ok"),
      row("suspended", { status: "SUSPENDED" }),
      row("flagged", { complianceStatus: "FLAG" }),
      row("revoked", { consentRevokedAt: "2026-05-01T00:00:00.000Z" }),
    ]);
    const cards = await listSectionCards(p);
    expect(cards.map((c) => c.id).sort()).toEqual(["ok"]);
  });

  it("filters by sectionType when provided", async () => {
    const p = provider([
      row("a", { sectionType: "hero" }),
      row("b", { sectionType: "timeline" }),
    ]);
    const cards = await listSectionCards(p, { sectionType: SectionTypeSchema.parse("timeline") });
    expect(cards.map((c) => c.id)).toEqual(["b"]);
  });

  it("returns strict-safe card projections (no private/raw fields)", async () => {
    const p = provider([row("ok")]);
    const cards = await listSectionCards(p);
    for (const card of cards) {
      const parsed = SectionCardSchema.safeParse(card);
      expect(parsed.success).toBe(true);
      const rec = card as unknown as Record<string, unknown>;
      expect(rec).not.toHaveProperty("claimantContact");
      expect(rec).not.toHaveProperty("contentBlob");
      expect(rec).not.toHaveProperty("structureJSON");
    }
  });

  it("returns an empty array when no rows or all ineligible", async () => {
    expect(await listSectionCards(provider([]))).toEqual([]);
    expect(await listSectionCards(provider([row("x", { status: "ARCHIVED" })]))).toEqual([]);
  });
});

describe("getSectionDetail", () => {
  it("returns a strict safe detail for an eligible parent", async () => {
    const p = provider([
      row("sec-1", {
        lessons: [{ code: "CLARITY", label: "Clear single message" }],
        doNotCopyNote: "Do not copy this section verbatim.",
      }),
    ]);
    const detail = await getSectionDetail(p, "sec-1");
    expect(detail).not.toBeNull();
    const parsed = SectionDetailSchema.safeParse(detail);
    expect(parsed.success, JSON.stringify(parsed.success ? "" : parsed.error.issues)).toBe(true);
    expect(detail!.lessons[0].code).toBe("CLARITY");
    expect(detail!.doNotCopyNote).toContain("Do not copy");
  });

  it("returns null for unknown or ineligible parents", async () => {
    const p = provider([row("sec-hidden", { status: "SUSPENDED" })]);
    expect(await getSectionDetail(p, "sec-hidden")).toBeNull();
    expect(await getSectionDetail(p, "does-not-exist")).toBeNull();
  });

  it("reports aggregate floor state honestly", async () => {
    const p = provider([row("sec-floor", { lessons: null })]);
    const detail = await getSectionDetail(p, "sec-floor");
    expect(detail).not.toBeNull();
    // No curated lessons + no aggregate input => floor not met.
    expect(detail!.lessons).toEqual([]);
    expect(detail!.aggregateFloorMet).toBe(false);
    expect(detail!.aggregateLessons).toEqual([]);
  });

  it("never exposes raw/private fields in the detail", async () => {
    const p = provider([row("sec-safe")]);
    const detail = await getSectionDetail(p, "sec-safe");
    const rec = detail as unknown as Record<string, unknown>;
    for (const forbidden of ["claimantContact", "contentBlob", "structureJSON", "evidenceHash"]) {
      expect(forbidden in rec).toBe(false);
    }
  });
});

describe("selectSimilarSections", () => {
  const source = row("source", { sectionType: "hero", styleTags: ["minimal", "dark"], stackTags: ["React", "Tailwind"] });

  it("excludes self and ineligible candidates", async () => {
    const p = provider([
      source,
      row("b", { sectionType: "hero", styleTags: ["minimal"] }),
      row("c", { sectionType: "hero", status: "SUSPENDED" }),
    ]);
    const similar = await selectSimilarSections(p, "source");
    expect(similar.map((s) => s.id)).toEqual(["b"]);
  });

  it("scores same sectionType plus tag overlap, deterministic order, capped at 4", async () => {
    const p = provider([
      source,
      // same type + 1 tag overlap
      row("t1", { sectionType: "hero", styleTags: ["minimal"] }),
      // same type + 2 tag overlap (ranks higher)
      row("t2", { sectionType: "hero", styleTags: ["minimal", "dark"] }),
      // different type but 1 tag overlap (ranks below same-type 1-tag)
      row("t3", { sectionType: "timeline", styleTags: ["minimal"] }),
      // no overlap
      row("t4", { sectionType: "about", styleTags: ["editorial"], stackTags: ["Vue"] }),
    ]);
    const similar = await selectSimilarSections(p, "source", { max: 4 });
    expect(similar.map((s) => s.id)).toEqual(["t2", "t1", "t3"]);
  });

  it("returns an empty array when no eligible similar candidates exist", async () => {
    const p = provider([
      source,
      row("z", { sectionType: "footer", styleTags: ["editorial"], stackTags: ["Vue"] }),
    ]);
    expect(await selectSimilarSections(p, "source")).toEqual([]);
  });
});
