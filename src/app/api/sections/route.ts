// GET /api/sections (plan section-library-detail T7).
// Safe section-library list: strict SectionCard projections, eligible-only,
// optional sectionType filter. Factory-injectable for tests.

import { SectionTypeSchema, type SectionType } from "@/domain/curation/section-schemas";
import { SectionRecordPrismaProvider } from "@/persistence/section-record-prisma";
import { listSectionCards, type SectionRowProvider } from "@/domain/sections/section-service";

export function createSectionsGet(provider: SectionRowProvider) {
  return async function GET(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const rawType = url.searchParams.get("sectionType");
      let filter: { sectionType?: SectionType } = {};
      if (rawType) {
        const parsed = SectionTypeSchema.safeParse(rawType);
        if (!parsed.success) {
          return Response.json(
            { error: "invalid_section_type" },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }
        filter = { sectionType: parsed.data };
      }
      const cards = await listSectionCards(provider, filter);
      return Response.json({ items: cards, count: cards.length }, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      return Response.json(
        { error: "sections_unavailable" },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}

export const GET = createSectionsGet(new SectionRecordPrismaProvider());
