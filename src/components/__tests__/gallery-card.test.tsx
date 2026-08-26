// GalleryCard shell tests (plan portfolio-card-system T6).
// Uses react-dom/server renderToStaticMarkup - no jsdom/RTL dependency.
// Consumes the shared fixtures/contracts from T4 so card and tests cannot drift.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { GalleryCard } from "@/components/gallery-card";
import {
  CARD_FIXTURES,
  CARD_MEDIA_ASPECT_RATIO,
  CARD_TEST_IDS,
} from "@/components/gallery-card-fixtures";

describe("GalleryCard media region", () => {
  it("renders a 16:9 media box with a lazy no-referrer image when media is present", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);

    expect(html).toContain(CARD_TEST_IDS.media);
    expect(html).toContain("aspect-ratio");
    expect(html).toContain(CARD_MEDIA_ASPECT_RATIO);
    expect(html).toContain('src="https://cdn.example.com/card.webp"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('referrerPolicy="no-referrer"');
    // Meaningful alt from title + creator.
    expect(html).toContain("alt=");
  });

  it("renders a fallback box (no image) when media is null", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaNull} />);

    expect(html).toContain(CARD_TEST_IDS.mediaFallback);
    expect(html).not.toContain("<img");
    expect(html).toContain("aspect-ratio");
  });

  it("keeps the media box ratio for the broken-media fixture (fallback path)", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.brokenMedia} />);
    expect(html).toContain("aspect-ratio");
  });
});

describe("GalleryCard metadata", () => {
  it("renders title, creator, role, style tags, and stack tags", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.withStack} />);

    expect(html).toContain(CARD_TEST_IDS.title);
    expect(html).toContain(CARD_TEST_IDS.creator);
    expect(html).toContain(CARD_TEST_IDS.role);
    expect(html).toContain(CARD_TEST_IDS.stack);
    expect(html).toContain(CARD_TEST_IDS.style);
    expect(html).toContain("React");
    expect(html).toContain("Next.js");
  });

  it("renders a freshness label derived from reviewedAt", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.recent} />);
    expect(html).toContain(CARD_TEST_IDS.freshness);
  });

  it("renders attribution/source link and quality badge", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);

    expect(html).toContain(CARD_TEST_IDS.source);
    expect(html).toContain("https://jane-doe.com/portfolio");
    expect(html).toContain(CARD_TEST_IDS.quality);
    expect(html).toContain("noopener");
    expect(html).toContain("noreferrer");
  });

  it("labels editorial samples", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.sample} />);
    expect(html).toContain(CARD_TEST_IDS.sample);
  });
});

describe("GalleryCard preview behavior (T7)", () => {
  it("renders a preview trigger and panel when media is present", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);

    expect(html).toContain(CARD_TEST_IDS.preview);
    expect(html).toContain(CARD_TEST_IDS.previewPanel);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("aria-controls=");
  });

  it("renders no preview affordance when media is null", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaNull} />);

    expect(html).not.toContain(CARD_TEST_IDS.preview);
    expect(html).not.toContain(CARD_TEST_IDS.previewPanel);
  });

  it("keeps the preview trigger OUTSIDE the source anchor (no nesting)", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);

    const anchorBlocks = html.match(/<a[\s\S]*?<\/a>/g) ?? [];
    expect(anchorBlocks.length).toBeGreaterThan(0);
    for (const block of anchorBlocks) {
      expect(block.includes("card-preview"), `preview nested in anchor: ${block.slice(0, 120)}`).toBe(false);
      expect(block.includes("<button"), `anchor contains a button: ${block.slice(0, 120)}`).toBe(false);
    }
  });

  it("sets a meaningful preview aria-label from copy register", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);
    expect(html).toContain('aria-label="Preview portfolio media"');
  });

  it("marks the closed panel aria-hidden (decorative hover preview)", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);
    expect(html).toContain('aria-hidden="true"');
  });
});

describe("GalleryCard bookmark control (T8)", () => {
  it("renders a bookmark button with aria-pressed=false and add label on first render (SSR-safe)", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);

    expect(html).toContain(CARD_TEST_IDS.bookmark);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Like portfolio"');
  });

  it("keeps the bookmark button outside the source anchor (no nesting)", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);

    const anchorBlocks = html.match(/<a[\s\S]*?<\/a>/g) ?? [];
    for (const block of anchorBlocks) {
      expect(block.includes("card-bookmark"), `bookmark nested in anchor: ${block.slice(0, 120)}`).toBe(false);
      expect(block.includes("<button"), `anchor contains a button: ${block.slice(0, 120)}`).toBe(false);
    }
  });
});

describe("GalleryCard detail navigation (T12)", () => {
  it("renders an internal detail link to /gallery/[id]", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);
    expect(html).toContain('data-testid="card-detail-link"');
    expect(html).toContain("/gallery/item-1");
  });

  it("preserves the external source link as a separate target", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);
    expect(html).toContain('data-testid="card-source"');
    expect(html).toContain("https://jane-doe.com/portfolio");
    expect(html).toContain('target="_blank"');
  });

  it("keeps the internal detail link outside the external source anchor", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);
    const anchorBlocks = html.match(/<a[\s\S]*?<\/a>/g) ?? [];
    expect(anchorBlocks.length).toBeGreaterThanOrEqual(2);
    for (const block of anchorBlocks) {
      // No anchor contains another anchor (no nesting).
      expect(block.match(/<a[\s\S]*<a/)).toBeNull();
    }
  });
});

describe("GalleryCard interaction structure (T4/Metis: no nested controls)", () => {
  it("does not wrap buttons inside anchors", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);

    // Find each <a ...>...</a> block and assert no <button> inside it.
    const anchorBlocks = html.match(/<a[\s\S]*?<\/a>/g) ?? [];
    expect(anchorBlocks.length).toBeGreaterThan(0);
    for (const block of anchorBlocks) {
      expect(block.includes("<button"), `anchor contains a button: ${block.slice(0, 120)}`).toBe(false);
    }
  });

  it("links the media region to the attributed source in a new tab", () => {
    const html = renderToStaticMarkup(<GalleryCard item={CARD_FIXTURES.mediaPresent} />);
    expect(html).toContain('target="_blank"');
    expect(html).toContain("opens in new tab");
  });
});
