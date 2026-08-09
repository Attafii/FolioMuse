// PortfolioDetailView tests (plan portfolio-detail-page T10).
// renderToStaticMarkup (no jsdom): safe sections render, prohibited fields
// absent, single h1, attribution perceivable, no nested interactive elements.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PortfolioDetailView } from "@/components/portfolio-detail/portfolio-detail-view";
import { PortfolioDetailSchema, type PortfolioDetail } from "@/domain/curation/detail-schemas";

function detail(overrides: Record<string, unknown> = {}): PortfolioDetail {
  const raw = {
    id: "item-123",
    title: "Editorial Sample Portfolio",
    creatorRole: "Product Designer",
    styleTags: ["minimal", "editorial"],
    qualityLevel: "L3",
    complianceStatus: "PASS",
    status: "ACCEPTED",
    attribution: {
      creatorName: "Jane Doe",
      sourceUrl: "https://jane-doe.com/portfolio",
      licenseType: "EXPLICIT_PERMISSION",
      consentDate: "2026-01-15T00:00:00.000Z",
    },
    consentTier: "FULL",
    reviewedAt: "2026-06-01T12:00:00.000Z",
    duplicateOfId: null,
    mediaUrl: "https://cdn.example.com/card.webp",
    stackTags: ["React", "Tailwind"],
    desktopMediaUrl: "https://cdn.example.com/desktop.webp",
    mobileMediaUrl: null,
    pageIndex: ["Home", "Work"],
    sections: [
      { key: "hero", label: "Hero", present: true },
      { key: "work", label: "Selected work", present: true },
    ],
    strengths: [{ code: "QUALITY", label: "Strong curated quality" }],
    stackEvidence: [{ name: "React", evidenceType: "metadata" }],
    captureFreshness: { capturedAt: "2026-01-15T00:00:00.000Z", label: "Captured 6 months ago" },
    provenance: {
      hasCreator: true,
      hasSourceRecord: true,
      hasAiProvenance: true,
      hasConsent: true,
      aiDisclosure: "AI_ASSISTED",
      creator: { id: "creator-1", name: "Jane Doe", verificationStatus: "UNVERIFIED" },
      licence: { id: "EXPLICIT_PERMISSION", effectivePermission: "FULL" },
      source: {
        sourceUrl: "https://jane-doe.com/portfolio",
        canonicalUrl: "https://jane-doe.com/portfolio",
        captureMode: "MANUAL_SUBMISSION",
        capturedAt: "2026-01-15T00:00:00.000Z",
      },
      removalAvailable: true,
    },
    similarExamples: [],
    ...overrides,
  };
  return PortfolioDetailSchema.parse(raw);
}

describe("PortfolioDetailView", () => {
  it("renders one h1 and the safe reference sections", () => {
    const html = renderToStaticMarkup(<PortfolioDetailView detail={detail()} />);
    expect(html).toContain('data-testid="portfolio-detail"');
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain('data-testid="attribution-section"');
    expect(html).toContain('data-testid="page-index"');
    expect(html).toContain('data-testid="sections-list"');
    expect(html).toContain('data-testid="strengths-list"');
    expect(html).toContain('data-testid="stack-evidence"');
    expect(html).toContain('data-testid="detail-source"');
    expect(html).toContain('data-testid="capture-freshness"');
  });

  it("renders desktop and mobile capture slots with explicit alt/fallback", () => {
    const html = renderToStaticMarkup(<PortfolioDetailView detail={detail()} />);
    expect(html).toContain('data-testid="desktop-capture"');
    expect(html).toContain('data-testid="mobile-capture"');
    expect(html).toContain("desktop capture");
    expect(html).toContain("No mobile capture");
    expect(html).toContain('referrerPolicy="no-referrer"');
  });

  it("never renders prohibited or private fields", () => {
    const html = renderToStaticMarkup(<PortfolioDetailView detail={detail()} />);
    for (const forbidden of [
      "contentBlob",
      "structureJSON",
      "evidenceHash",
      "promptHash",
      "outputHash",
      "structureFingerprint",
    ]) {
      expect(html.includes(forbidden), `forbidden ${forbidden}`).toBe(false);
    }
    // claimantContact appears only as a form FIELD NAME (input name attr),
    // never as a rendered value or JSON echo.
    expect(html.includes("owner@example.com")).toBe(false);
    expect(html.includes('"claimantContact":')).toBe(false);
  });

  it("renders similar examples as internal attributed links", () => {
    const html = renderToStaticMarkup(
      <PortfolioDetailView
        detail={detail({
          similarExamples: [
            {
              id: "item-456",
              title: "Similar Portfolio",
              creatorRole: "Product Designer",
              styleTags: ["minimal"],
              stackTags: [],
              qualityLevel: "L3",
              reviewedAt: null,
              mediaUrl: null,
              attribution: {
                creatorName: "Jane Roe",
                sourceUrl: "https://jane-roe.com/portfolio",
                licenseType: "EXPLICIT_PERMISSION",
                consentDate: "2026-01-15T00:00:00.000Z",
              },
            },
          ],
        })}
      />,
    );
    expect(html).toContain('data-testid="similar-examples"');
    expect(html).toContain("/gallery/item-456");
    expect(html).toContain("Jane Roe");
  });

  it("renders honest empty states when optional data is absent", () => {
    const html = renderToStaticMarkup(
      <PortfolioDetailView
        detail={detail({
          mediaUrl: null,
          desktopMediaUrl: null,
          mobileMediaUrl: null,
          pageIndex: [],
          sections: null,
          strengths: null,
          stackEvidence: null,
          captureFreshness: { capturedAt: null, label: null },
        })}
      />,
    );
    expect(html).toContain("No desktop capture");
    expect(html).not.toContain('data-testid="page-index"');
    expect(html).not.toContain('data-testid="sections-list"');
    // Attribution still present without optional sections.
    expect(html).toContain('data-testid="attribution-section"');
  });

  it("keeps source links external and keyboard reachable (no nested interactive controls)", () => {
    const html = renderToStaticMarkup(<PortfolioDetailView detail={detail()} />);
    const anchorBlocks = html.match(/<a[\s\S]*?<\/a>/g) ?? [];
    expect(anchorBlocks.length).toBeGreaterThan(0);
    for (const block of anchorBlocks) {
      expect(block.includes("<button"), `button nested in anchor: ${block.slice(0, 120)}`).toBe(false);
    }
  });

  it("renders labelled claim and removal forms without private echoes", () => {
    const html = renderToStaticMarkup(<PortfolioDetailView detail={detail()} />);
    expect(html).toContain('data-testid="owner-claim-form"');
    expect(html).toContain('data-testid="removal-request-form"');
    expect(html).toContain('name="claimantName"');
    expect(html).toContain('name="claimantContact"');
    expect(html).toContain("Request removal");
    // Never renders the private claimant contact back in the DOM.
    expect(html.includes("owner@example.com")).toBe(false);
  });
});
