// Read-only data access + pure ranking/aggregation helpers for MCP tools.
//
// Layering note (AGENTS.md Â§7): this module is part of the MCP transport
// layer and stays THIN â€” reads go through the domain service where one
// exists (CurationServiceImpl.listAccepted / loadPortfolioDetail) and
// read-only Prisma groupBy for pattern aggregation that no domain service
// exposes yet. No writes, ever: the MCP agent cannot mutate gallery data.
//
// Charter guardrails baked into every output shape:
// - Attribution-safe summaries only (ADR-0001/0003 D9): id, title, creator,
//   source link, role, tags, screenshot reference. NEVER contentBlob /
//   structureJSON / raw DOM â€” those do not exist in our schema by design.
// - Pattern outputs are aggregated across creators (R2 floor: â‰¥3 items AND
//   â‰¥2 distinct creators). Below floor â†’ flagged, never surfaced as advice.
// - Every reference payload carries the do-not-copy contract (R1â€“R8).

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { CurationServiceImpl } from "@/domain/curation/curation-service";
import {
  GalleryRepositoryPrisma,
  AuditRepositoryPrisma,
} from "@/persistence/gallery-repository-prisma";
import { ProvenanceRepositoryPrisma } from "@/persistence/provenance-repository-prisma";
import type { ProvenanceRebuildQueue } from "@/domain/provenance/ports";
import type { GalleryItemSummary } from "@/domain/curation/types";
import { loadPortfolioDetail } from "@/lib/load-portfolio-detail";
import { GalleryQuerySchema } from "@/lib/gallery-query";
import type { PortfolioDetail } from "@/domain/curation/detail-schemas";

const rebuildQueue: ProvenanceRebuildQueue = { enqueueRebuild: async () => {} };
const curation = new CurationServiceImpl(
  new GalleryRepositoryPrisma(),
  new AuditRepositoryPrisma(),
  new ProvenanceRepositoryPrisma(),
  rebuildQueue,
);

/** Charter banner attached to tool payloads so agent output stays compliant. */
export const USAGE_NOTE =
  "Reference & derive only. Never copy a portfolio's copy, layout code, or assets verbatim " +
  "(FolioMuse originality rules R1â€“R8; ADR-0001). Build original work informed by aggregated patterns.";

// â”€â”€ Pure helpers (unit-testable without a database) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface PatternRow {
  sectionType: string;
  creatorId: string | null;
  itemTitle: string;
}

export interface AggregatedPattern {
  sectionType: string;
  itemCount: number;
  distinctCreators: number;
  r2FloorMet: boolean;
  examples: { title: string; creatorName: string }[];
}

/**
 * Aggregate raw pattern rows into R2-gated patterns. Pure: rows in, facts
 * out. Below-floor groups are still returned but flagged r2FloorMet=false so
 * callers can honestly say "insufficient data" instead of inventing lessons.
 */
export function aggregatePatternRows(rows: PatternRow[]): AggregatedPattern[] {
  const map = new Map<string, { creators: Set<string>; examples: { title: string; creatorName: string }[] }>();
  for (const row of rows) {
    const entry = map.get(row.sectionType) ?? {
      creators: new Set<string>(),
      examples: [],
    };
    if (row.creatorId) entry.creators.add(row.creatorId);
    if (entry.examples.length < 5) {
      entry.examples.push({ title: row.itemTitle, creatorName: row.itemTitle.split(" â€” ")[0] });
    }
    map.set(row.sectionType, entry);
  }
  return [...map.entries()]
    .map(([sectionType, v]) => ({
      sectionType,
      itemCount: v.creators.size >= 0 ? Math.max(v.examples.length, v.creators.size) : 0,
      distinctCreators: v.creators.size,
      r2FloorMet: v.examples.length >= 3 && v.creators.size >= 2,
      examples: v.examples.slice(0, 5),
    }))
    .sort((a, b) => b.itemCount - a.itemCount);
}

const ROLE_KEYWORDS: Record<string, string[]> = {
  frontend: ["Frontend"],
  "front end": ["Frontend"],
  ui: ["Designer", "Frontend"],
  ux: ["Designer"],
  design: ["Designer"],
  backend: ["Backend"],
  api: ["Backend"],
  "full stack": ["Full Stack"],
  fullstack: ["Full Stack"],
  ai: ["AI/ML"],
  ml: ["AI/ML"],
  "machine learning": ["AI/ML"],
  mobile: ["Mobile"],
  ios: ["Mobile"],
  android: ["Mobile"],
  flutter: ["Mobile"],
  "react native": ["Mobile"],
  devops: ["DevOps"],
  sre: ["DevOps"],
  cloud: ["DevOps"],
  data: ["Data"],
  game: ["Game Dev"],
  security: ["Security"],
};

export interface ResumeMatch {
  item: GalleryItemSummary;
  score: number;
  reasons: string[];
}

/**
 * Metadata-only resume matcher. Scores each summary on:
 *  - role alignment with roles implied by the resume text (+3)
 *  - style/stack tag overlap with resume keywords (+1 per tag, cap 5)
 *  - curated quality L3/L4 bonus (+2/+3)
 * Pure function â€” trivially unit-testable, no DB.
 */
export function matchResumeToSummaries(
  resumeText: string,
  items: GalleryItemSummary[],
  limit: number,
): ResumeMatch[] {
  const text = resumeText.toLowerCase();

  const roleBoosts = new Set<string>();
  for (const [kw, roles] of Object.entries(ROLE_KEYWORDS)) {
    if (text.includes(kw)) for (const r of roles) roleBoosts.add(r);
  }

  const stop = new Set([
    "the","and","with","for","from","this","that","have","has","are","was","were",
    "our","your","their","will","been","into","over","under","about","work",
    "working","experience","years","year","team","teams","project","projects",
    "built","build","building","using","used","strong","good","great","skills",
    "skill","developer","engineer","development","software","web","apps","app",
  ]);
  const keywords = new Set(
    (resumeText.toLowerCase().match(/[a-z][a-z+#.\-]{2,}/g) ?? []).filter((w) => !stop.has(w)),
  );

  const matches: ResumeMatch[] = [];
  for (const item of items) {
    const reasons: string[] = [];
    let score = 0;

    if (roleBoosts.has(item.creatorRole)) {
      score += 3;
      reasons.push(`ROLE_MATCH:${item.creatorRole}`);
    }

    let tagHits = 0;
    for (const tag of [...item.styleTags, ...item.stackTags]) {
      const t = tag.toLowerCase();
      if (keywords.has(t) || [...keywords].some((k) => t.length > 3 && k.includes(t))) {
        tagHits += 1;
        if (tagHits <= 5) reasons.push(`TAG_MATCH:${tag}`);
      }
    }
    score += Math.min(tagHits, 5);

    if (item.qualityLevel === "L4") { score += 3; reasons.push("QUALITY:L4"); }
    else if (item.qualityLevel === "L3") { score += 2; reasons.push("QUALITY:L3"); }

    if (score > 0) matches.push({ item, score, reasons });
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

// â”€â”€ DB-backed accessors (thin, read-only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function listAcceptedSummaries(): Promise<GalleryItemSummary[]> {
  return curation.listAccepted();
}

/** Server-filtered search for MCP tools — DB executes q/role/tag constraints. */
export async function searchAcceptedFiltered(
  input: Parameters<typeof GalleryQuerySchema.parse>[0],
): Promise<{ items: GalleryItemSummary[]; total: number }> {
  return curation.listAcceptedFiltered(GalleryQuerySchema.parse(input));
}

export async function getPortfolioReference(id: string): Promise<PortfolioDetail | null> {
  // Safe DTO + deterministic similar examples — same path as /gallery/[id].
  return loadPortfolioDetail(id);
}

export async function getAggregatedPatterns(): Promise<AggregatedPattern[]> {
  const records = await prisma.sectionRecord.findMany({
    select: {
      sectionType: true,
      item: {
        select: {
          title: true,
          attribution: { select: { creatorId: true } },
        },
      },
    },
    take: 500,
  });
  const rows: PatternRow[] = records.map((r) => ({
    sectionType: r.sectionType,
    creatorId: r.item.attribution.creatorId,
    itemTitle: r.item.title,
  }));
  return aggregatePatternRows(rows);
}

export async function closeDb(): Promise<void> {
  await prisma.$disconnect();
}
