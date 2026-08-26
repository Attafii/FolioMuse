// Shared card contract constants + fixture builders (plan portfolio-card-system T4).
//
// Single source of truth for the card system's visual/interaction contract so
// the card implementation (T6) and every consumer (T9) cannot drift:
// - CARD_MEDIA_ASPECT_RATIO: fixed stable media ratio (no layout shift).
// - CARD_TEST_IDS: exact selectors for browser QA and component tests.
// - makeGalleryCardItem(): summary fixtures covering every card state.
//
// Visible copy register: no em-dashes (PS5.1-safe), no fabricated numbers,
// attribution always present (R3).

export const CARD_MEDIA_ASPECT_RATIO = "16 / 10";

export const CARD_TEST_IDS = {
  card: "gallery-card",
  media: "card-media",
  mediaFallback: "card-media-fallback",
  title: "card-title",
  creator: "card-creator",
  role: "card-role",
  stack: "card-stack",
  style: "card-style",
  freshness: "card-freshness",
  quality: "quality-badge",
  source: "card-source",
  bookmark: "card-bookmark",
  preview: "card-preview",
  previewPanel: "card-preview-panel",
  sample: "editorial-sample-badge",
} as const;

export const CARD_COPY = {
  bookmarkAdd: "Bookmark portfolio",
  bookmarkRemove: "Remove bookmark",
  previewOpen: "Preview portfolio media",
  previewClose: "Close media preview",
  sourceLabel: "View source",
  freshnessStale: "Reviewed over 18 months ago",
} as const;

import type { GalleryItemSummary } from "@/domain/curation/types";

const BASE_ATTRIBUTION = {
  creatorName: "Jane Doe",
  sourceUrl: "https://jane-doe.com/portfolio",
  licenseType: "EXPLICIT_PERMISSION" as const,
  consentDate: "2026-01-15T00:00:00.000Z",
};

/**
 * Build a GalleryItemSummary fixture. Every state must be concrete - no
 * undefined media fixtures (plan T4: media present / null / broken states).
 * `mediaUrl` accepts a sentinel `"__broken__"` to simulate a failing image.
 */
export function makeGalleryCardItem(
  overrides: Partial<GalleryItemSummary> & { id?: string } = {},
): GalleryItemSummary {
  const id = overrides.id ?? "item-1";
  return {
    id,
    title: "Editorial Sample Portfolio",
    creatorRole: "Product Designer",
    styleTags: ["minimal", "editorial"],
    qualityLevel: "L3",
    complianceStatus: "PASS",
    status: "ACCEPTED",
    attribution: BASE_ATTRIBUTION,
    consentTier: "FULL",
    reviewedAt: "2026-06-01T12:00:00.000Z",
    duplicateOfId: null,
    mediaUrl: "https://cdn.example.com/card.webp",
    stackTags: ["React", "Tailwind"],
    ...overrides,
  };
}

export const CARD_FIXTURES = {
  /** Media present: the happy path. */
  mediaPresent: makeGalleryCardItem(),
  /** Media absent: legacy/not-yet-curated item. */
  mediaNull: makeGalleryCardItem({ id: "item-media-null", mediaUrl: null }),
  /** Broken media: image request will 404; must fall back without shift. */
  brokenMedia: makeGalleryCardItem({ id: "item-broken", mediaUrl: "https://cdn.example.com/missing.webp" }),
  /** Stack metadata present. */
  withStack: makeGalleryCardItem({
    id: "item-stack",
    stackTags: ["React", "Next.js", "Tailwind", "PostgreSQL"],
  }),
  /** Fresh (recently reviewed). */
  recent: makeGalleryCardItem({ id: "item-recent", reviewedAt: "2026-07-20T12:00:00.000Z" }),
  /** Stale (reviewed more than 18 months ago). */
  stale: makeGalleryCardItem({ id: "item-stale", reviewedAt: "2024-01-01T12:00:00.000Z" }),
  /** Empty stack + empty style tags. */
  noTags: makeGalleryCardItem({ id: "item-notags", styleTags: [], stackTags: [] }),
  /** Editorial sample labeling. */
  sample: makeGalleryCardItem({ id: "item-sample", title: "Editorial Sample - Hero Layout" }),
  /** Long metadata to exercise wrap/truncation. */
  longMetadata: makeGalleryCardItem({
    id: "item-long",
    title: "A very long portfolio title that should wrap gracefully without breaking the card grid",
    creatorRole: "Senior Product Designer and Design Systems Lead",
    styleTags: ["minimal", "editorial", "brutalist", "experimental", "grid-heavy", "dark-mode"],
    stackTags: ["React", "Next.js", "Tailwind CSS", "TypeScript", "PostgreSQL", "Prisma", "Vercel"],
  }),
} as const;

/** Every fixture id must be unique (test fixture hygiene). */
export const CARD_FIXTURE_IDS: string[] = Object.values(CARD_FIXTURES).map((f) => f.id);
