// GET /api/sections/[id] (plan section-library-detail T7).
// Safe section detail: strict SectionDetail projection, eligible-only,
// with deterministic similar sections. Factory-injectable for tests.

import { SectionRecordPrismaProvider } from "@/persistence/section-record-prisma";
import {
  getSectionDetail,
  selectSimilarSections,
  type SectionRowProvider,
} from "@/domain/sections/section-service";

export function createSectionDetailGet(provider: SectionRowProvider) {
  return async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> {
    const { id } = await context.params;
    try {
      const detail = await getSectionDetail(provider, id);
      if (!detail) {
        return Response.json(
          { error: "not_found" },
          { status: 404, headers: { "Cache-Control": "no-store" } },
        );
      }
      const similar = await selectSimilarSections(provider, id, { max: 4 });
      return Response.json({ ...detail, similarSections: similar }, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      return Response.json(
        { error: "section_unavailable" },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}

export const GET = createSectionDetailGet(new SectionRecordPrismaProvider());
