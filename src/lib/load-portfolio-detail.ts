// Shared safe detail loader for /gallery/[id] (plan portfolio-detail-page T9).
// Composes getAcceptedDetail (eligibility + provenance enrichment) with the
// deterministic similar-example selection. Used by both the API route and the
// server page so the safe DTO is produced once per request (React cache in
// the page dedupes page + generateMetadata).

import {
  CurationServiceImpl,
} from "@/domain/curation/curation-service";
import {
  GalleryRepositoryPrisma,
  AuditRepositoryPrisma,
} from "@/persistence/gallery-repository-prisma";
import { ProvenanceRepositoryPrisma } from "@/persistence/provenance-repository-prisma";
import type { ProvenanceRebuildQueue } from "@/domain/provenance/ports";
import type { PortfolioDetail } from "@/domain/curation/detail-schemas";
import { selectSimilarExamples } from "@/lib/browse/similar-examples";

// Module-level singletons (stateless apart from the shared Prisma client).
const galleryRepo = new GalleryRepositoryPrisma();
const auditRepo = new AuditRepositoryPrisma();
const provenanceRepo = new ProvenanceRepositoryPrisma();
const rebuildQueue: ProvenanceRebuildQueue = { enqueueRebuild: async () => {} };
const curationService = new CurationServiceImpl(
  galleryRepo,
  auditRepo,
  provenanceRepo,
  rebuildQueue,
);

export async function loadPortfolioDetail(id: string): Promise<PortfolioDetail | null> {
  const detail = await curationService.getAcceptedDetail(id);
  if (!detail) return null;

  // Deterministic similar examples (ADR-0007 D4): accepted/non-FLAG overlap.
  const accepted = await curationService.listAccepted();
  const similar = selectSimilarExamples(detail, accepted, { max: 4 });
  return { ...detail, similarExamples: similar };
}
