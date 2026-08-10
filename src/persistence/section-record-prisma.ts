// SectionRecord Prisma adapter (plan section-library-detail T7).
// Maps SectionRecord rows + their parent GalleryItem into the domain
// SectionRecordRow shape the section service consumes. Never exposes raw
// content or private data - the service builds strict safe projections.

import { prisma } from "@/lib/prisma";
import type { SectionRowProvider } from "@/domain/sections/section-service";
import type { SectionRecordRow } from "@/domain/curation/section-schemas";

export class SectionRecordPrismaProvider implements SectionRowProvider {
  async listRows(): Promise<SectionRecordRow[]> {
    const dbRows = await prisma.sectionRecord.findMany({
      include: {
        item: {
          include: { attribution: true, consent: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return dbRows.map(mapRow);
  }

  async findRowById(id: string): Promise<SectionRecordRow | null> {
    const dbRow = await prisma.sectionRecord.findUnique({
      where: { id },
      include: {
        item: {
          include: { attribution: true, consent: true },
        },
      },
    });
    return dbRow ? mapRow(dbRow) : null;
  }
}

function mapRow(db: {
  id: string;
  sectionType: string;
  title: string;
  desktopCropUrl: string | null;
  mobileCropUrl: string | null;
  lessons: unknown;
  doNotCopyNote: string | null;
  itemId: string;
  item: {
    creatorRole: string;
    styleTags: string[];
    stackTags: string[];
    status: string;
    complianceStatus: string | null;
    attribution: { creatorName: string; sourceUrl: string; licenseType: string; consentDate: Date };
    consent: { revokedAt: Date | null };
  };
}): SectionRecordRow {
  return {
    id: db.id,
    sectionType: db.sectionType,
    title: db.title,
    desktopCropUrl: db.desktopCropUrl,
    mobileCropUrl: db.mobileCropUrl,
    lessons: db.lessons,
    doNotCopyNote: db.doNotCopyNote,
    itemId: db.itemId,
    creatorName: db.item.attribution.creatorName,
    creatorRole: db.item.creatorRole,
    styleTags: db.item.styleTags,
    stackTags: db.item.stackTags,
    sourceUrl: db.item.attribution.sourceUrl,
    licenseType: db.item.attribution.licenseType,
    consentDate: db.item.attribution.consentDate.toISOString(),
    status: db.item.status,
    complianceStatus: db.item.complianceStatus,
    consentRevokedAt: db.item.consent.revokedAt?.toISOString() ?? null,
  };
}
