// ─── GET /api/gallery/summaries ────────────────────────────────────────────────
// Public read path for gallery surfaces (plan T6 + LCP fix).
//
// SERVER-SIDE pagination/search: executes the shared gallery query with
// skip/take and returns ONE page plus total count — never the whole corpus
// (2k portfolios ≈ 1.1 MB unpaginated; a default page is ~30 KB).
//
// Query params (all optional): q, role*, style*, stack*, quality*, consent*,
// sort=newest|title-asc|title-desc|quality, page>=1, pageSize 1..100 (24).
// Response: { items, total, page, pageSize }.
//
// Routes through CurationService — never touches Prisma directly (AGENTS §7).
// Next 16 route handlers run at request time; Cache-Control: no-store kept.

import type { NextRequest } from "next/server";

import {
  GalleryRepositoryPrisma,
  AuditRepositoryPrisma,
} from "@/persistence/gallery-repository-prisma";
import { ProvenanceRepositoryPrisma } from "@/persistence/provenance-repository-prisma";
import { CurationServiceImpl } from "@/domain/curation/curation-service";
import type { ProvenanceRebuildQueue } from "@/domain/provenance/ports";
import { parseGalleryQuery } from "@/lib/gallery-query";

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

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const query = parseGalleryQuery(request.nextUrl.searchParams);
    const { items, total } = await curationService.listAcceptedFiltered(query);

    return Response.json(
      { items, total, page: query.page, pageSize: query.pageSize },
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
