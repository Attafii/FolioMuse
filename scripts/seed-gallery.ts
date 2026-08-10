// ─── Editorial Sample Gallery Seed Script ───────────────────────────────────────
// Seeds a labeled "Editorial sample gallery" (8-10 items) for the homepage
// experience. All data is clearly fictional sample content — no real portfolios,
// no real-company names, no implied social proof.
//
// Usage: npx tsx scripts/seed-gallery.ts
//   Requires: DATABASE_URL in environment (Neon connection string).
//   Idempotent: re-runs skip any sourceUrl already present. Second run reports
//   0 new inserts.
//   Exit 0: success. Exit 1: DATABASE_URL missing or failure.
// ────────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";

// ─── Sample fixture data ────────────────────────────────────────────────────────
// All URLs are clearly fictional. Creator names carry an "Editorial Sample"
// marker so the origin is unambiguous (plan T5; no implied social proof).

const SAMPLE_CONSENT_EMAIL = "samples@foliomuse.example";

interface SeedItem {
  title: string;
  creatorRole: string;
  styleTags: string[];
  stackTags: string[];
  mediaUrl: string;
  creatorName: string;
  sourceUrl: string;
  licenseType: "CC_BY" | "EXPLICIT_PERMISSION" | "LICENSED";
  qualityLevel: "L2" | "L3";
  reviewedAt: string;
}

const SEED_ITEMS: SeedItem[] = [
  {
    title: "Editorial Sample — Aurora Studio",
    creatorRole: "Product Designer",
    styleTags: ["minimal", "editorial", "case-study"],
    stackTags: ["Figma", "Webflow"],
    mediaUrl: "https://picsum.photos/seed/aurora-studio/800/450",
    creatorName: "Editorial Sample · Ana",
    sourceUrl: "https://example.com/portfolio/aurora-studio",
    licenseType: "EXPLICIT_PERMISSION",
    qualityLevel: "L3",
    reviewedAt: "2026-07-28T10:00:00.000Z",
  },
  {
    title: "Editorial Sample — Northstar Dev",
    creatorRole: "Frontend Developer",
    styleTags: ["dark mode", "grid-heavy", "case-study"],
    stackTags: ["React", "Next.js", "TypeScript"],
    mediaUrl: "https://picsum.photos/seed/northstar-dev/800/450",
    creatorName: "Editorial Sample · Ben",
    sourceUrl: "https://example.com/portfolio/northstar-dev",
    licenseType: "EXPLICIT_PERMISSION",
    qualityLevel: "L3",
    reviewedAt: "2026-07-25T14:30:00.000Z",
  },
  {
    title: "Editorial Sample — Marlow & Co",
    creatorRole: "Brand Designer",
    styleTags: ["bold typography", "editorial"],
    stackTags: ["Illustrator", "Photoshop"],
    mediaUrl: "https://picsum.photos/seed/marlow-co/800/450",
    creatorName: "Editorial Sample · Celine",
    sourceUrl: "https://example.com/portfolio/marlow-co",
    licenseType: "CC_BY",
    qualityLevel: "L2",
    reviewedAt: "2026-07-22T09:15:00.000Z",
  },
  {
    title: "Editorial Sample — Field Notes",
    creatorRole: "Photographer",
    styleTags: ["editorial", "portfolio"],
    stackTags: ["Lightroom", "Capture One"],
    mediaUrl: "https://picsum.photos/seed/field-notes/800/450",
    creatorName: "Editorial Sample · Dario",
    sourceUrl: "https://example.com/portfolio/field-notes",
    licenseType: "EXPLICIT_PERMISSION",
    qualityLevel: "L3",
    reviewedAt: "2026-07-20T16:45:00.000Z",
  },
  {
    title: "Editorial Sample — Ink & Grid",
    creatorRole: "Illustrator",
    styleTags: ["experimental", "grid-heavy"],
    stackTags: ["Procreate", "After Effects"],
    mediaUrl: "https://picsum.photos/seed/ink-grid/800/450",
    creatorName: "Editorial Sample · Elena",
    sourceUrl: "https://example.com/portfolio/ink-and-grid",
    licenseType: "LICENSED",
    qualityLevel: "L2",
    reviewedAt: "2026-07-18T11:00:00.000Z",
  },
  {
    title: "Editorial Sample — Loop Labs",
    creatorRole: "UX Engineer",
    styleTags: ["dark mode", "minimal", "case-study"],
    stackTags: ["React", "Tailwind", "Vercel"],
    mediaUrl: "https://picsum.photos/seed/loop-labs/800/450",
    creatorName: "Editorial Sample · Farid",
    sourceUrl: "https://example.com/portfolio/loop-labs",
    licenseType: "EXPLICIT_PERMISSION",
    qualityLevel: "L3",
    reviewedAt: "2026-07-15T13:20:00.000Z",
  },
  {
    title: "Editorial Sample — Kindred Type",
    creatorRole: "Brand Designer",
    styleTags: ["bold typography", "portfolio"],
    stackTags: ["Glyphs", "FontForge"],
    mediaUrl: "https://picsum.photos/seed/kindred-type/800/450",
    creatorName: "Editorial Sample · Greta",
    sourceUrl: "https://example.com/portfolio/kindred-type",
    licenseType: "CC_BY",
    qualityLevel: "L2",
    reviewedAt: "2026-07-12T08:30:00.000Z",
  },
  {
    title: "Editorial Sample — Signal & Form",
    creatorRole: "Product Designer",
    styleTags: ["minimal", "experimental"],
    stackTags: ["Figma", "Framer"],
    mediaUrl: "https://picsum.photos/seed/signal-form/800/450",
    creatorName: "Editorial Sample · Hugo",
    sourceUrl: "https://example.com/portfolio/signal-and-form",
    licenseType: "EXPLICIT_PERMISSION",
    qualityLevel: "L2",
    reviewedAt: "2026-07-10T15:50:00.000Z",
  },
  {
    title: "Editorial Sample — Terra Maps",
    creatorRole: "Frontend Developer",
    styleTags: ["grid-heavy", "editorial", "case-study"],
    stackTags: ["TypeScript", "Mapbox", "Next.js"],
    mediaUrl: "https://picsum.photos/seed/terra-maps/800/450",
    creatorName: "Editorial Sample · Ines",
    sourceUrl: "https://example.com/portfolio/terra-maps",
    licenseType: "EXPLICIT_PERMISSION",
    qualityLevel: "L3",
    reviewedAt: "2026-07-08T10:10:00.000Z",
  },
  {
    title: "Editorial Sample — Quiet Machines",
    creatorRole: "Photographer",
    styleTags: ["portfolio", "editorial"],
    stackTags: ["Lightroom", "Blender"],
    mediaUrl: "https://picsum.photos/seed/quiet-machines/800/450",
    creatorName: "Editorial Sample · Jonas",
    sourceUrl: "https://example.com/portfolio/quiet-machines",
    licenseType: "CC_BY",
    qualityLevel: "L2",
    reviewedAt: "2026-07-05T17:25:00.000Z",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

let inserted = 0;
let skipped = 0;

async function seedItem(item: SeedItem): Promise<void> {
  // Idempotency guard: skip any sourceUrl already present.
  const existing = await prisma.attribution.findUnique({
    where: { sourceUrl: item.sourceUrl },
  });
  if (existing) {
    // Upsert card metadata on existing editorial-sample rows (seed fixtures
    // only - never real gallery content). Keeps the seed idempotent while
    // allowing the card QA fixtures to gain curated media/stack on re-run.
    await prisma.galleryItem.updateMany({
      where: { attributionId: existing.id },
      data: {
        mediaUrl: item.mediaUrl,
        stackTags: item.stackTags,
      },
    });
    skipped++;
    console.log(`[UPDATE] ${item.title} card metadata (${item.creatorRole})`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const attribution = await tx.attribution.create({
      data: {
        creatorName: item.creatorName,
        sourceUrl: item.sourceUrl,
        licenseType: item.licenseType,
        consentDate: new Date(item.reviewedAt),
      },
    });

    const consent = await tx.consentRecord.create({
      data: {
        tier: "FULL",
        consentedBy: SAMPLE_CONSENT_EMAIL,
        consentedAt: new Date(item.reviewedAt),
        terms: item.licenseType,
        expiresAt: null,
      },
    });

    await tx.galleryItem.create({
      data: {
        title: item.title,
        creatorRole: item.creatorRole,
        styleTags: item.styleTags,
        stackTags: item.stackTags,
        mediaUrl: item.mediaUrl,
        qualityLevel: item.qualityLevel,
        complianceStatus: "PASS",
        status: "ACCEPTED",
        attributionId: attribution.id,
        consentRecordId: consent.id,
        reviewedAt: new Date(item.reviewedAt),
      },
    });
  });

  inserted++;
  console.log(`[INSERT] ${item.title} (${item.creatorRole})`);
}

// ─── Detail reference fixture (plan portfolio-detail-page T13) ───────────────
// Enriches the FIRST accepted editorial-sample item with curated detail
// metadata + provenance rows (creator, source record, AI provenance) so the
// /gallery/[id] reference page and its integration tests have real data.
// Idempotent: re-runs update the same fixture rather than duplicating.
// Editorial fixtures only - never real portfolio content.

async function seedDetailFixture(): Promise<void> {
  const item = await prisma.galleryItem.findFirst({
    where: { status: "ACCEPTED" },
    orderBy: { reviewedAt: "desc" },
    include: { attribution: true },
  });
  if (!item) return;

  await prisma.$transaction(async (tx) => {
    const creator = await tx.creator.upsert({
      where: { id: "sample-creator-1" },
      create: { id: "sample-creator-1", name: "Editorial Sample Creator", url: null, verificationStatus: "UNVERIFIED" },
      update: { name: "Editorial Sample Creator" },
    });

    const sourceRecord = await tx.sourceRecord.upsert({
      where: { canonicalUrl: item.attribution.sourceUrl },
      create: {
        sourceUrl: item.attribution.sourceUrl,
        canonicalUrl: item.attribution.sourceUrl,
        captureMode: "MANUAL_SUBMISSION",
        capturedAt: item.reviewedAt ?? new Date(),
        creatorId: creator.id,
      },
      update: {},
    });

    const ai = await tx.aiProvenance.upsert({
      where: { id: "sample-ai-1" },
      create: {
        id: "sample-ai-1",
        provider: "openai",
        modelName: "sample-model",
        generatedAt: item.reviewedAt ?? new Date(),
        disclosureStatus: "AI_ASSISTED",
        promptHash: null,
        outputHash: null,
      },
      update: {},
    });

    await tx.galleryItem.update({
      where: { id: item.id },
      data: {
        sourceRecordId: sourceRecord.id,
        aiProvenanceId: ai.id,
        desktopMediaUrl: "https://picsum.photos/seed/desktop-capture/1200/675",
        mobileMediaUrl: "https://picsum.photos/seed/mobile-capture/720/405",
        pageIndex: ["Home", "Work", "About", "Contact"],
        sections: [
          { key: "hero", label: "Hero", present: true },
          { key: "work", label: "Selected work", present: true },
          { key: "about", label: "About", present: true },
        ],
        strengths: [
          { code: "QUALITY", label: "Strong curated quality" },
          { code: "STRUCTURE", label: "Clear section structure" },
        ],
        stackEvidence: [
          { name: "React", evidenceType: "metadata" },
          { name: "Next.js", evidenceType: "metadata" },
        ],
      },
    });
  });

  console.log(`[DETAIL] enriched ${item.title} with detail metadata + provenance`);
}

// ─── Section library fixtures (plan section-library-detail T11) ──────────────
// Creates SectionRecords across several taxonomy types for the first few
// accepted editorial-sample items (crops, curated lessons, do-not-copy notes).
// Idempotent: re-runs skip records already present for the same item/type.
// Editorial fixtures only - never real portfolio content.

const SECTION_FIXTURES: Array<{
  sectionType: string;
  title: string;
  lessons: { code: string; label: string }[];
  note: string;
}> = [
  {
    sectionType: "hero",
    title: "Editorial hero with clear message",
    lessons: [
      { code: "CLARITY", label: "One clear value proposition above the fold" },
      { code: "HIERARCHY", label: "Strong type hierarchy leads the eye" },
    ],
    note: "Do not copy this hero verbatim - use it as a structural reference for a single clear message.",
  },
  {
    sectionType: "project grid",
    title: "Minimal project grid",
    lessons: [
      { code: "FOCUS", label: "Consistent card rhythm helps scanning" },
      { code: "HIERARCHY", label: "Largest items carry the strongest work" },
    ],
    note: "Do not reuse these project tiles as-is; borrow the grid rhythm only.",
  },
  {
    sectionType: "timeline",
    title: "Career timeline",
    lessons: [
      { code: "CLARITY", label: "Chronology tells a story without paragraphs" },
      { code: "ACCESSIBILITY", label: "Timeline entries remain readable at small sizes" },
    ],
    note: "Do not copy the timeline content - build your own chronology.",
  },
  {
    sectionType: "contact CTA",
    title: "Contact call to action",
    lessons: [
      { code: "MOTION", label: "Restrained hover feedback on the primary action" },
      { code: "CLARITY", label: "One contact intent, one label" },
    ],
    note: "Do not reuse the copy; structure a single clear contact action.",
  },
];

async function seedSectionRecords(): Promise<void> {
  const accepted = await prisma.galleryItem.findMany({
    where: { status: "ACCEPTED" },
    orderBy: { reviewedAt: "desc" },
    take: 4,
  });

  for (const item of accepted) {
    for (const fixture of SECTION_FIXTURES) {
      const existing = await prisma.sectionRecord.findFirst({
        where: { itemId: item.id, sectionType: fixture.sectionType },
      });
      if (existing) continue;
      await prisma.sectionRecord.create({
        data: {
          sectionType: fixture.sectionType,
          title: fixture.title,
          desktopCropUrl: `https://picsum.photos/seed/${item.id}-${fixture.sectionType.replace(/\s+/g, "-")}/1200/675`,
          mobileCropUrl: null,
          lessons: fixture.lessons,
          doNotCopyNote: fixture.note,
          itemId: item.id,
        },
      });
    }
  }

  console.log(`[SECTIONS] seeded section records for ${accepted.length} items`);
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  console.log("Seeding editorial sample gallery…");
  for (const item of SEED_ITEMS) {
    await seedItem(item);
  }

  await seedDetailFixture();
  await seedSectionRecords();

  const acceptedCount = await prisma.galleryItem.count({
    where: { status: "ACCEPTED" },
  });

  console.log(
    `\nDone. Inserted ${inserted}, skipped ${skipped}. ` +
      `Total ACCEPTED items in gallery: ${acceptedCount}.`,
  );

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("[SEED ERROR]", err);
  await prisma.$disconnect();
  process.exit(1);
});
