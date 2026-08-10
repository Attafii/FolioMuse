// Shared section loaders for /sections + /sections/[id] (plan T8).
// Compose the SectionRecordPrismaProvider with the section domain service to
// produce strict safe projections. Wrapped in React cache() at the page layer
// so page + generateMetadata share one DB read.

import { SectionRecordPrismaProvider } from "@/persistence/section-record-prisma";
import {
  getSectionDetail,
  listSectionCards,
  selectSimilarSections,
  type SectionRowProvider,
} from "@/domain/sections/section-service";
import type { SectionCard, SectionDetail, SectionType } from "@/domain/curation/section-schemas";

const provider: SectionRowProvider = new SectionRecordPrismaProvider();

export async function loadSectionCards(filter?: { sectionType?: SectionType }): Promise<SectionCard[]> {
  return listSectionCards(provider, filter);
}

export async function loadSectionDetail(id: string): Promise<SectionDetail | null> {
  const detail = await getSectionDetail(provider, id);
  if (!detail) return null;
  const similar = await selectSimilarSections(provider, id, { max: 4 });
  return { ...detail, similarSections: similar };
}
