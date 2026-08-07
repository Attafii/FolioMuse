/**
 * Editorial collections (plan T12).
 *
 * Hand-written, human-authored collections curating REAL seeded items by their
 * sourceUrl. Copy is specific editorial opinion — no fake stats, no social
 * proof, no invented items. Items are resolved against fetched summaries at
 * render time; any reference that is missing from the gallery is dropped
 * gracefully (never renders a broken card). Attribution always stays on the
 * card (R3).
 */

export interface EditorialCollection {
  id: string;
  title: string;
  intro: string;
  /** sourceUrls of seeded gallery items (scripts/seed-gallery.ts). */
  itemSourceUrls: string[];
}

export const EDITORIAL_COLLECTIONS: EditorialCollection[] = [
  {
    id: "collections-that-ship",
    title: "Portfolios that ship",
    intro:
      "Four portfolios that read like working products rather than résumés: each one leads with a case study, shows the trade-offs made along the way, and earns its L3 rating by explaining outcomes instead of just showing screens.",
    itemSourceUrls: [
      "https://example.com/portfolio/aurora-studio",
      "https://example.com/portfolio/loop-labs",
      "https://example.com/portfolio/northstar-dev",
      "https://example.com/portfolio/terra-maps",
    ],
  },
  {
    id: "collections-narrative",
    title: "Narrative-driven portfolios",
    intro:
      "Some portfolios are documents; these are essays. Field Notes and Quiet Machines treat every project as a chapter with a point of view, while Kindred Type pairs strong typography with a voice you can hear in the captions.",
    itemSourceUrls: [
      "https://example.com/portfolio/field-notes",
      "https://example.com/portfolio/quiet-machines",
      "https://example.com/portfolio/kindred-type",
    ],
  },
  {
    id: "collections-typographic",
    title: "Typographic experiments",
    intro:
      "For portfolios that lean on type as the primary material: Marlow & Co wields oversized display faces, Ink & Grid breaks the grid on purpose, and Signal & Form proves minimal layouts still have room for surprise.",
    itemSourceUrls: [
      "https://example.com/portfolio/marlow-co",
      "https://example.com/portfolio/ink-and-grid",
      "https://example.com/portfolio/signal-and-form",
    ],
  },
];
