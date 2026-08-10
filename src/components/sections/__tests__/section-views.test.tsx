// Section library/detail view tests (plan section-library-detail T9/T10).
// renderToStaticMarkup (no jsdom): library grid + filters render, detail full
// context renders, no prohibited/private fields, no nested interactive elements.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { SectionLibraryView } from "@/components/sections/section-library-view";
import { SectionDetailView } from "@/components/sections/section-detail-view";
import { SectionDetailSchema, type SectionCard, type SectionDetail } from "@/domain/curation/section-schemas";

const card: SectionCard = {
  id: "section-1",
  sectionType: "hero",
  title: "Editorial hero",
  creatorName: "Jane Doe",
  creatorRole: "Product Designer",
  desktopCropUrl: "https://cdn.example.com/crop.webp",
  mobileCropUrl: null,
  itemId: "item-1",
};

function detail(overrides: Record<string, unknown> = {}): SectionDetail {
  return SectionDetailSchema.parse({
    ...card,
    styleTags: ["minimal", "editorial"],
    stackTags: ["React"],
    lessons: [{ code: "CLARITY", label: "Clear single message" }],
    aggregateLessons: [],
    aggregateFloorMet: false,
    doNotCopyNote: "Do not copy this section verbatim - use it as a structural reference only.",
    attribution: {
      creatorName: "Jane Doe",
      sourceUrl: "https://jane-doe.com/portfolio",
      licenseType: "EXPLICIT_PERMISSION",
      consentDate: "2026-01-15T00:00:00.000Z",
    },
    similarSections: [],
    ...overrides,
  });
}

describe("SectionLibraryView", () => {
  it("renders the taxonomy filters, card grid, and empty state wiring", () => {
    const html = renderToStaticMarkup(
      <SectionLibraryView cards={[card]} taxonomy={["hero", "timeline"]} />,
    );
    expect(html).toContain('data-testid="section-library"');
    expect(html).toContain("Section library");
    expect(html).toContain('data-testid="section-filter-all"');
    expect(html).toContain("hero");
    expect(html).toContain("/sections/section-1");
    expect(html).toContain("/gallery/item-1");
  });

  it("never renders prohibited fields", () => {
    const html = renderToStaticMarkup(<SectionLibraryView cards={[card]} taxonomy={["hero"]} />);
    for (const forbidden of ["contentBlob", "structureJSON", "claimantContact", "evidenceHash"]) {
      expect(html.includes(forbidden), forbidden).toBe(false);
    }
  });

  it("keeps interactive elements non-nested (cards are links; collect is a button)", () => {
    const html = renderToStaticMarkup(<SectionLibraryView cards={[card]} taxonomy={["hero"]} />);
    const anchorBlocks = html.match(/<a[\s\S]*?<\/a>/g) ?? [];
    for (const block of anchorBlocks) {
      expect(block.includes("<button")).toBe(false);
    }
  });
});

describe("SectionDetailView", () => {
  it("renders full safe context: crops, lessons, notes, attribution, floor", () => {
    const html = renderToStaticMarkup(<SectionDetailView detail={detail()} />);
    expect(html).toContain('data-testid="section-detail"');
    expect(html).toContain('data-testid="section-crop-desktop"');
    expect(html).toContain('data-testid="section-crop-mobile"');
    expect(html).toContain('data-testid="section-lessons"');
    expect(html).toContain('data-testid="section-notes"');
    expect(html).toContain('data-testid="section-attribution"');
    expect(html).toContain('data-testid="section-floor"');
    expect(html).toContain("Do not copy this section verbatim");
  });

  it("renders similar sections and portfolio link when present", () => {
    const html = renderToStaticMarkup(
      <SectionDetailView
        detail={detail({
          similarSections: [{ ...card, id: "section-2", title: "Similar hero" }],
        })}
      />,
    );
    expect(html).toContain('data-testid="section-similar"');
    expect(html).toContain("/sections/section-2");
    expect(html).toContain('data-testid="section-portfolio-link"');
  });

  it("never renders prohibited or private fields", () => {
    const html = renderToStaticMarkup(<SectionDetailView detail={detail()} />);
    for (const forbidden of ["contentBlob", "structureJSON", "claimantContact", "evidenceHash", "promptHash"]) {
      expect(html.includes(forbidden), forbidden).toBe(false);
    }
  });

  it("keeps collect button outside source/portfolio anchors", () => {
    const html = renderToStaticMarkup(<SectionDetailView detail={detail()} />);
    const anchorBlocks = html.match(/<a[\s\S]*?<\/a>/g) ?? [];
    for (const block of anchorBlocks) {
      expect(block.includes("<button")).toBe(false);
    }
  });
});
