// ─── GET /api/gallery/random ──────────────────────────────────────────────────
// Returns a random accepted gallery item ID.
// Used by the hero section's "Random portfolio" button.
//
// Uses CurationService (same as /api/gallery/summaries) for consistent
// filtering. Picks a random item from the first page of results.

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
    const { items, total } = await curationService.listAcceptedFiltered({
      q: "",
      sort: "newest",
      page: 1,
      pageSize: 100,
    });

    if (total === 0 || items.length === 0) {
      return Response.json(
        { error: "no_portfolios", message: "No accepted portfolios found in the gallery." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const randomIndex = Math.floor(Math.random() * items.length);
    const item = items[randomIndex];

    return Response.json(
      { id: item.id },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "gallery_unavailable", message: "Could not load portfolios right now." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
