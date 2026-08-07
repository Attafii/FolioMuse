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
    skipped++;
    console.log(`[SKIP] ${item.sourceUrl} (already present)`);
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
