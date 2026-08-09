// ─── GET /api/gallery/items/[id] ────────────────────────────────────────────
// Safe single-item detail read for /gallery/[id] (plan portfolio-detail-page
// T7/T9, ADR-0007 D1/D2). Returns the strict PortfolioDetail DTO only - never
// contentBlob/structureJSON/raw captures/private provenance evidence.
//
// - Loader is injected via createDetailGet for testability (mirrors the
//   createEventsPost factory pattern).
// - 200 + safe DTO for eligible records; 404 {error:"not_found"} for
//   unknown/hidden records; 500 {error:"detail_unavailable"} opaque.
// - Cache-Control: no-store (public read, removal/consent can change).
// - Routes through CurationService - never touches Prisma directly.

import type { PortfolioDetail } from "@/domain/curation/detail-schemas";
import { loadPortfolioDetail } from "@/lib/load-portfolio-detail";

export type DetailLoader = (id: string) => Promise<PortfolioDetail | null>;

export function createDetailGet(loadDetail: DetailLoader) {
  return async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> {
    const { id } = await context.params;
    try {
      const detail = await loadDetail(id);
      if (!detail) {
        return Response.json(
          { error: "not_found" },
          {
            status: 404,
            headers: { "Cache-Control": "no-store" },
          },
        );
      }
      return Response.json(detail, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      // Never leak stack traces or connection details (public route).
      return Response.json(
        { error: "detail_unavailable" },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
  };
}

export const GET = createDetailGet(loadPortfolioDetail);
