// Server-side gallery query contract shared by the API routes and the MCP
// tools. Pure functions only: parse/validate a public query, build the
// Prisma `where` + `orderBy` for it. No IO here — persistence owns execution.
//
// LCP fix: /api/gallery/summaries no longer returns the whole corpus; it
// executes this query server-side with skip/take and returns one page plus
// a total count (~30 KB instead of ~1.1 MB at 2k portfolios).

import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

export const SORT_KEYS = ["newest", "title-asc", "title-desc", "quality"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

/**
 * Tolerant public query schema. Invalid enum values are dropped per-facet
 * (mirrors parseBrowseParams semantics) so malformed URLs degrade to
 * "no constraint" instead of erroring.
 */
export const GalleryQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v ?? ""),
  role: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  style: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  stack: z.array(z.string().trim().min(1).max(64)).max(10).optional(),
  quality: z.array(z.enum(["L0", "L1", "L2", "L3", "L4"])).max(5).optional(),
  consent: z.array(z.enum(["DISPLAY", "PATTERN_DERIVE", "FULL"])).max(3).optional(),
  /** Exact sourceUrl lookups (EditorialCollections cover resolution). */
  source: z.array(z.string().url().max(300)).max(60).optional(),
  sort: z.enum(SORT_KEYS).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type GalleryQuery = z.infer<typeof GalleryQuerySchema>;

/** Parse URLSearchParams (repeated keys supported) into a GalleryQuery. */
export function parseGalleryQuery(params: URLSearchParams): GalleryQuery {
  const raw = {
    q: params.get("q") ?? undefined,
    role: params.getAll("role").filter(Boolean),
    style: params.getAll("style").filter(Boolean),
    stack: params.getAll("stack").filter(Boolean),
    quality: params.getAll("quality").filter(Boolean),
    consent: params.getAll("consent").filter(Boolean),
    source: params.getAll("source").filter(Boolean),
    sort: params.get("sort") ?? undefined,
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
  };
  return GalleryQuerySchema.parse(raw);
}

const insensitive = { mode: "insensitive" } as const;

/** Build the Prisma where clause enforcing the public invariant
 *  (ACCEPTED + non-FLAG) plus every supplied constraint. */
export function buildGalleryWhere(query: GalleryQuery): Prisma.GalleryItemWhereInput {
  const where: Prisma.GalleryItemWhereInput = {
    status: "ACCEPTED",
    complianceStatus: { not: "FLAG" },
  };

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, ...insensitive } },
      { creatorRole: { contains: query.q, ...insensitive } },
      { attribution: { is: { creatorName: { contains: query.q, ...insensitive } } } },
      { styleTags: { hasSome: [query.q] } },
      { stackTags: { hasSome: [query.q] } },
    ];
  }
  if (query.role?.length) {
    where.creatorRole = { in: query.role, ...insensitive };
  }
  if (query.style?.length) {
    // Facet values originate from stored tag casing, so exact hasSome matches.
    where.styleTags = { hasSome: query.style };
  }
  if (query.stack?.length) {
    where.stackTags = { hasSome: query.stack };
  }
  if (query.quality?.length) {
    where.qualityLevel = { in: query.quality };
  }
  if (query.consent?.length) {
    where.consent = { tier: { in: query.consent } };
  }
  if (query.source?.length) {
    // AND-composed so it composes cleanly with the q OR-block above.
    const andConditions: Prisma.GalleryItemWhereInput[] = Array.isArray(where.AND)
      ? [...where.AND]
      : where.AND
        ? [where.AND]
        : [];
    andConditions.push({ attribution: { is: { sourceUrl: { in: query.source } } } });
    where.AND = andConditions;
  }

  return where;
}

/** Order-by map for the supported sort keys (nulls last where relevant). */
export function buildGalleryOrderBy(query: GalleryQuery): Prisma.GalleryItemOrderByWithRelationInput[] {
  switch (query.sort) {
    case "title-asc":
      return [{ title: "asc" }];
    case "title-desc":
      return [{ title: "desc" }];
    case "quality":
      return [
        { qualityLevel: { sort: "desc", nulls: "last" } },
        { reviewedAt: { sort: "desc", nulls: "last" } },
      ];
    case "newest":
    default:
      return [
        { reviewedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ];
  }
}
