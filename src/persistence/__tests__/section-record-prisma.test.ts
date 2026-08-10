// SectionRecordPrismaProvider integration tests (plan section-library-detail T11).
// DB-gated: skips cleanly without DATABASE_URL. Verifies rows map into the
// domain SectionRecordRow shape with eligibility fields from the parent item.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { SectionRecordPrismaProvider } from "@/persistence/section-record-prisma";

describe.skipIf(!process.env.DATABASE_URL)("SectionRecordPrismaProvider integration", () => {
  let itemId: string | null = null;
  let sectionId: string | null = null;
  const suffix = `section-it-${Date.now()}`;

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
    // Reuse an existing accepted item or create a minimal fixture item.
    const existing = await prisma.galleryItem.findFirst({ where: { status: "ACCEPTED" } });
    if (existing) {
      itemId = existing.id;
    } else {
      const attribution = await prisma.attribution.create({
        data: {
          creatorName: `IT ${suffix}`,
          sourceUrl: `https://example.com/${suffix}`,
          licenseType: "EXPLICIT_PERMISSION",
          consentDate: new Date(),
        },
      });
      const consent = await prisma.consentRecord.create({
        data: {
          tier: "FULL",
          consentedBy: `it-${suffix}`,
          consentedAt: new Date(),
          terms: "EXPLICIT_PERMISSION",
          expiresAt: null,
        },
      });
      const item = await prisma.galleryItem.create({
        data: {
          title: `Section IT ${suffix}`,
          creatorRole: "Product Designer",
          styleTags: ["minimal"],
          stackTags: ["React"],
          status: "ACCEPTED",
          complianceStatus: "PASS",
          attributionId: attribution.id,
          consentRecordId: consent.id,
        },
      });
      itemId = item.id;
    }

    const section = await prisma.sectionRecord.create({
      data: {
        sectionType: "hero",
        title: `IT hero ${suffix}`,
        desktopCropUrl: "https://cdn.example.com/it-crop.webp",
        lessons: [{ code: "CLARITY", label: "Clear message" }],
        doNotCopyNote: "IT note",
        itemId: itemId!,
      },
    });
    sectionId = section.id;
  });

  afterAll(async () => {
    if (sectionId) await prisma.sectionRecord.deleteMany({ where: { id: sectionId } });
    if (itemId) {
      await prisma.galleryItem.deleteMany({ where: { id: itemId, title: { startsWith: "Section IT" } } });
    }
    if (itemId) {
      // Cleanup attribution/consent created by this suite only (reused items keep theirs).
      await prisma.attribution.deleteMany({ where: { creatorName: { startsWith: `IT ${suffix}` } } });
      await prisma.consentRecord.deleteMany({ where: { consentedBy: { startsWith: `it-${suffix}` } } });
    }
  });

  it("listRows returns mapped rows with parent eligibility fields", async () => {
    const provider = new SectionRecordPrismaProvider();
    const rows = await provider.listRows();
    const row = rows.find((r) => r.id === sectionId);
    expect(row).toBeDefined();
    expect(row!.sectionType).toBe("hero");
    expect(row!.itemId).toBe(itemId);
    expect(row!.status).toBe("ACCEPTED");
    expect(row!.creatorName).toBeTruthy();
    expect(row!.sourceUrl).toMatch(/^https:\/\//);
  });

  it("findRowById returns the mapped row", async () => {
    const provider = new SectionRecordPrismaProvider();
    const row = await provider.findRowById(sectionId!);
    expect(row).not.toBeNull();
    expect(row!.lessons).toEqual([{ code: "CLARITY", label: "Clear message" }]);
    expect(row!.doNotCopyNote).toBe("IT note");
  });

  it("findRowById returns null for unknown ids", async () => {
    const provider = new SectionRecordPrismaProvider();
    expect(await provider.findRowById("does-not-exist")).toBeNull();
  });
});
