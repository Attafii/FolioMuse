// MCP tool definitions + handlers (plan T14, pillar 3).
//
// Safe-projection contract (ADR-0001/0003 D9 â€” hard charter line):
//   * NO tool returns full item content. Our schema does not even store
//     contentBlob/structureJSON; outputs are metadata + curated descriptors.
//   * NO "clone portfolio" tool exists and none will be built (NG1/NG4):
//     agents may search, reference, and derive from aggregated patterns;
//     verbatim copying is refused at the protocol level by omission.
//   * Patterns respect the R2 floor (â‰¥3 items / â‰¥2 creators); below-floor
//     groups are flagged r2FloorMet=false â†’ callers must say "insufficient
//     data" instead of inventing single-source lessons (R2/R4).
// All inputs are validated with Zod 4 (Standard Schema) by the SDK.

import { z } from "zod";

import {
  USAGE_NOTE,
  getPortfolioReference,
  getAggregatedPatterns,
  listAcceptedSummaries,
  matchResumeToSummaries,
  searchAcceptedFiltered,
} from "./data";
import type { GalleryItemSummary } from "@/domain/curation/types";

/** Attribution-safe wire shape for summaries (deliberately minimal). */
function toSummaryWire(item: GalleryItemSummary) {
  return {
    id: item.id,
    title: item.title,
    creatorName: item.attribution.creatorName,
    sourceUrl: item.attribution.sourceUrl,
    creatorRole: item.creatorRole,
    styleTags: item.styleTags,
    stackTags: item.stackTags,
    qualityLevel: item.qualityLevel,
    screenshotUrl: item.mediaUrl,
    detailHint: `get_portfolio_reference(id="${item.id}")`,
    githubUrl: item.githubUrl ?? null,
  };
}

const LimitSchema = z.number().int().min(1).max(25).default(10);

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: unknown) => Promise<{ content: { type: "text"; text: string }[] }>;
}

export const TOOLS: ToolDef[] = [
  {
    name: "search_portfolios",
    description:
      "Search the FolioMuse gallery of 140+ real, attributed developer/designer portfolios. " +
      "Filter by free-text query, exact role (Designer|Frontend|Backend|Full Stack|AI/ML|Mobile|DevOps|Data|Game Dev|Security), " +
      "and/or tags. Returns attribution-safe metadata + live screenshot URLs only.",
    inputSchema: z.object({
      q: z.string().max(120).optional().describe("Free text matched against title, creator, role, and tags."),
      role: z.string().max(20).optional().describe("Exact role filter (case-insensitive)."),
      tag: z.string().max(40).optional().describe("Match items carrying this style or stack tag."),
      limit: LimitSchema.describe("Max results (1-25)."),
    }),
    handler: async (raw) => {
      const args = (await z
        .object({
          q: z.string().max(120).optional(),
          role: z.string().max(20).optional(),
          tag: z.string().max(40).optional(),
          limit: LimitSchema.optional(),
        })
        .parseAsync(raw ?? {})) as { q?: string; role?: string; tag?: string; limit?: number };

      const limit = Math.min(args.limit ?? 10, 25);
      const base = {
        q: args.q?.trim() || undefined,
        role: args.role?.trim() || undefined,
        sort: "newest" as const,
        page: 1,
      };

      // DB executes text/role/tag constraints (corpus is 2k+ items).
      let page = await searchAcceptedFiltered({
        ...base,
        style: args.tag ? [args.tag] : undefined,
        pageSize: limit,
      });
      if (page.items.length === 0 && args.tag) {
        // Tag semantics span both tag arrays: retry against stackTags.
        page = await searchAcceptedFiltered({
          ...base,
          stack: [args.tag],
          pageSize: limit,
        });
      }

      const payload = {
        totalInGallery: page.total,
        matches: page.items.length,
        results: page.items.slice(0, limit).map(toSummaryWire),
        usageNote: USAGE_NOTE,
      };
      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
    },
  },

  {
    name: "get_portfolio_reference",
    description:
      "Get the full safe reference for one portfolio by id: captures (live screenshot URLs), page index, " +
      "which sections exist (presence only), curated strengths, stack evidence, provenance/attribution, " +
      "licence & consent tier, similar examples, and the do-not-copy contract. Use after search_portfolios.",
    inputSchema: z.object({
      id: z.string().min(1).max(64).describe("GalleryItem id from search_portfolios."),
    }),
    handler: async (raw) => {
      const args = (await z.object({ id: z.string().min(1).max(64) }).parseAsync(raw ?? {})) as {
        id: string;
      };
      const detail = await getPortfolioReference(args.id);
      if (!detail) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "not_found_or_not_public", id: args.id }, null, 2),
            },
          ],
        };
      }
      const payload = {
        id: detail.id,
        title: detail.title,
        creatorName: detail.attribution.creatorName,
        sourceUrl: detail.attribution.sourceUrl,
        githubUrl: detail.githubUrl ?? null,
        creatorRole: detail.creatorRole,
        styleTags: detail.styleTags,
        stackTags: detail.stackTags,
        qualityLevel: detail.qualityLevel,
        consentTier: detail.consentTier,
        licence: detail.provenance?.licence ?? null,
        captures: {
          desktopUrl: detail.desktopMediaUrl,
          mobileUrl: detail.mobileMediaUrl,
        },
        pageIndex: detail.pageIndex,
        sectionsPresence: detail.sections,
        strengths: detail.strengths,
        stackEvidence: detail.stackEvidence,
        captureFreshness: detail.captureFreshness,
        similarExamples: detail.similarExamples.map((s) => ({
          id: s.id,
          title: s.title,
          creatorName: s.attribution.creatorName,
          sourceUrl: s.attribution.sourceUrl,
        })),
        doNotCopy:
          "Structure-level reference only. The copy, imagery, branding, and assets belong to the creator. " +
          "Derive your own original design; never reproduce theirs verbatim (R1â€“R8).",
        usageNote: USAGE_NOTE,
      };
      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
    },
  },

  {
    name: "list_section_patterns",
    description:
      "List section patterns (hero, project grid, contact CTA, â€¦) aggregated across the whole gallery. " +
      "Each pattern reports itemCount, distinctCreators, and whether the R2 floor (â‰¥3 items / â‰¥2 creators) " +
      "is met. Below-floor patterns MUST be treated as insufficient data â€” no single-source lessons exist.",
    inputSchema: z.object({}),
    handler: async () => {
      const patterns = await getAggregatedPatterns();
      const payload = {
        patterns,
        floorRule: "R2: advice requires â‰¥3 items AND â‰¥2 distinct creators.",
        usageNote: USAGE_NOTE,
      };
      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
    },
  },

  {
    name: "recommend_portfolios_for_resume",
    description:
      "Given a developer's resume / bio text (skills, roles, technologies), rank the gallery and return the " +
      "best-matching attributed portfolios to use as references, each with machine-readable reason codes " +
      "(ROLE_MATCH / TAG_MATCH / QUALITY). Metadata-only; pair with get_portfolio_reference for details.",
    inputSchema: z.object({
      resumeText: z.string().min(20).max(8000).describe("Plain-text resume, bio, or skills summary."),
      limit: LimitSchema.describe("Max recommendations (1-25)."),
    }),
    handler: async (raw) => {
      const args = (await z
        .object({ resumeText: z.string().min(20).max(8000), limit: LimitSchema.optional() })
        .parseAsync(raw ?? {})) as { resumeText: string; limit?: number };

      const all = await listAcceptedSummaries();
      const matches = matchResumeToSummaries(args.resumeText, all, args.limit ?? 8);
      const payload = {
        analyzedItems: all.length,
        recommendations: matches.map((m) => ({
          score: m.score,
          reasons: m.reasons,
          ...toSummaryWire(m.item),
        })),
        usageNote: USAGE_NOTE,
      };
      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
    },
  },
];
