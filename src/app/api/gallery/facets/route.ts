// ─── GET /api/gallery/facets ───────────────────────────────────────────────────
// Facet counts for filter UIs (roles/styles/stacks/qualities/consents),
// computed server-side so clients never download the full corpus. Pairs with
// the paginated /api/gallery/summaries.

import type { NextRequest } from "next/server";

import {
  GalleryRepositoryPrisma,
  AuditRepositoryPrisma,
} from "@/persistence/gallery-repository-prisma";
import { ProvenanceRepositoryPrisma } from "@/persistence/provenance-repository-prisma";
import { CurationServiceImpl } from "@/domain/curation/curation-service";
import type { ProvenanceRebuildQueue } from "@/domain/provenance/ports";

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

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const facets = await curationService.getPublicFacets();
    return Response.json(
      { facets },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "gallery_unavailable" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
