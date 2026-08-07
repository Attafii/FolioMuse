// ─── GET /api/gallery/summaries ────────────────────────────────────────────────
// Public read path for the homepage gallery surface (plan T6).
// Returns metadata-only GalleryItemSummary[] — NO contentBlob/structureJSON
// (ADR-0001 anti-cloning boundary). Routes through CurationService.listAccepted
// — never touches Prisma directly (AGENTS.md §7 layering).
//
// Next 16 route handler conventions (node_modules/next/dist/docs/01-app/01-
// getting-started/15-route-handlers.md): GET route handlers run at request time
// by default; we additionally set Cache-Control: no-store for correctness
// (gallery data changes via seed).

import {
  GalleryRepositoryPrisma,
  AuditRepositoryPrisma,
} from "@/persistence/gallery-repository-prisma";
import { ProvenanceRepositoryPrisma } from "@/persistence/provenance-repository-prisma";
import { CurationServiceImpl } from "@/domain/curation/curation-service";
import type { ProvenanceRebuildQueue } from "@/domain/provenance/ports";

// Module-level singleton: repositories and service are stateless apart from
// the shared Prisma client, so constructing once per module is safe.
const galleryRepo = new GalleryRepositoryPrisma();
const auditRepo = new AuditRepositoryPrisma();
const provenanceRepo = new ProvenanceRepositoryPrisma();

// No production rebuild queue exists yet (Section 02+) — this read path never
// enqueues rebuilds, so an inert queue is compositionally sufficient.
const rebuildQueue: ProvenanceRebuildQueue = {
  enqueueRebuild: async () => {},
};

const curationService = new CurationServiceImpl(
  galleryRepo,
  auditRepo,
  provenanceRepo,
  rebuildQueue,
);

export async function GET(): Promise<Response> {
  try {
    const items = await curationService.listAccepted();
    return Response.json(
      { items, count: items.length },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    // Never leak stack traces or connection details to the client.
    return Response.json(
      { error: "gallery_unavailable" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
