import { NextResponse } from "next/server";
import { z } from "zod";

import { CurationServiceImpl } from "@/domain/curation/curation-service";
import {
  GalleryRepositoryPrisma,
  AuditRepositoryPrisma,
} from "@/persistence/gallery-repository-prisma";
import { ProvenanceRepositoryPrisma } from "@/persistence/provenance-repository-prisma";
import type { ProvenanceRebuildQueue } from "@/domain/provenance/ports";
import type { GalleryItemSummary } from "@/domain/curation/types";

/**
 * Chat API route for Foliobot.
 *
 * Uses OpenRouter as the LLM provider. When the user describes portfolio
 * requirements, the route performs RAG-style search against the gallery
 * and returns matching portfolios inline in the response.
 *
 * Environment variables:
 * - OPENROUTER_API_KEY: Required. User's OpenRouter API key.
 * - OPENROUTER_MODEL: Optional. Defaults to "anthropic/claude-3.5-sonnet".
 */

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),
});

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/** System prompt for Foliobot. */
const SYSTEM_PROMPT = `You are Foliobot, the AI assistant for FolioMuse — a portfolio inspiration gallery.

Your role:
1. Help users understand how FolioMuse works (curated gallery, AI ratings, quality levels L0-L4)
2. When users describe what kind of portfolio they're looking for, extract search criteria and recommend matching portfolios
3. Be helpful, concise, and friendly

Quality levels:
- L4 Exemplary: Best-in-class, exceptional craft
- L3 Strong: High quality, well-executed
- L2 Adequate: Meets standards, solid work
- L1 Minimal: Below average, limited value
- L0 Unusable: Does not meet standards

When recommending portfolios, explain WHY each one matches their criteria.

If the user asks about something unrelated to portfolios or FolioMuse, gently redirect them.`;

/**
 * Extract search criteria from user message using simple heuristics.
 * Returns null if no portfolio search intent detected.
 */
function extractSearchCriteria(message: string): {
  role?: string;
  style?: string;
  quality?: string[];
  query?: string;
} | null {
  const lower = message.toLowerCase();

  // Check if user is asking for portfolios
  const searchIntent =
    lower.includes("find") ||
    lower.includes("show") ||
    lower.includes("recommend") ||
    lower.includes("looking for") ||
    lower.includes("search") ||
    lower.includes("portfolio") ||
    lower.includes("example") ||
    lower.includes("inspiration");

  if (!searchIntent) return null;

  const criteria: { role?: string; style?: string; quality?: string[]; query?: string } = {};

  // Extract role
  const rolePatterns = [
    { pattern: /design(?:er)?/i, role: "Product Designer" },
    { pattern: /frontend|front-end/i, role: "Frontend Developer" },
    { pattern: /backend|back-end/i, role: "Backend Developer" },
    { pattern: /full.?stack/i, role: "Full-Stack Developer" },
    { pattern: /mobile/i, role: "Mobile Developer" },
    { pattern: /devops/i, role: "DevOps Engineer" },
    { pattern: /ai|ml|machine learning/i, role: "AI/ML Engineer" },
    { pattern: /data/i, role: "Data Engineer" },
    { pattern: /game/i, role: "Game Developer" },
    { pattern: /security/i, role: "Security Engineer" },
    { pattern: /photo/i, role: "Photographer" },
  ];

  for (const { pattern, role } of rolePatterns) {
    if (pattern.test(lower)) {
      criteria.role = role;
      break;
    }
  }

  // Extract style
  const stylePatterns = [
    { pattern: /minimal(?:ist)?/i, style: "minimal" },
    { pattern: /editorial/i, style: "editorial" },
    { pattern: /brutalist/i, style: "brutalist" },
    { pattern: /dark/i, style: "dark-mode" },
    { pattern: /colorful|vibrant/i, style: "colorful" },
    { pattern: /clean/i, style: "clean" },
    { pattern: /modern/i, style: "modern" },
    { pattern: /creative/i, style: "creative" },
  ];

  for (const { pattern, style } of stylePatterns) {
    if (pattern.test(lower)) {
      criteria.style = style;
      break;
    }
  }

  // Extract quality preference
  if (lower.includes("best") || lower.includes("top") || lower.includes("exemplary")) {
    criteria.quality = ["L4"];
  } else if (lower.includes("high quality") || lower.includes("strong")) {
    criteria.quality = ["L3", "L4"];
  }

  criteria.query = message;
  return criteria;
}

/**
 * Search for matching portfolios using the CurationService.
 */
async function searchPortfolios(criteria: {
  role?: string;
  style?: string;
  quality?: string[];
  query?: string;
}): Promise<PortfolioMatch[]> {
  try {
    // Module-level singleton pattern (same as other API routes)
    const galleryRepo = new GalleryRepositoryPrisma();
    const auditRepo = new AuditRepositoryPrisma();
    const provenanceRepo = new ProvenanceRepositoryPrisma();
    const rebuildQueue: ProvenanceRebuildQueue = {
      enqueueRebuild: async () => {},
    };
    const service = new CurationServiceImpl(
      galleryRepo,
      auditRepo,
      provenanceRepo,
      rebuildQueue,
    );

    // Build filter params
    const params: Record<string, unknown> = {
      page: 1,
      pageSize: 5,
    };

    if (criteria.role) {
      params.role = [criteria.role];
    }
    if (criteria.style) {
      params.style = [criteria.style];
    }
    if (criteria.quality) {
      params.quality = criteria.quality;
    }

    // Use the service to get filtered items
    const result = await service.listAcceptedFiltered(params as Parameters<typeof service.listAcceptedFiltered>[0]);

    return result.items.map((item: GalleryItemSummary) => ({
      id: item.id,
      title: item.title,
      creatorName: item.attribution.creatorName,
      qualityLevel: item.qualityLevel,
      matchReason: buildMatchReason(item, criteria),
    }));
  } catch {
    return [];
  }
}

function buildMatchReason(
  item: GalleryItemSummary,
  criteria: { role?: string; style?: string; quality?: string[] },
): string {
  const reasons: string[] = [];

  if (criteria.role && item.creatorRole === criteria.role) {
    reasons.push(`Matches ${criteria.role} role`);
  }
  if (criteria.style && item.styleTags.includes(criteria.style)) {
    reasons.push(`Has ${criteria.style} style`);
  }
  if (criteria.quality?.includes(item.qualityLevel)) {
    reasons.push(`${item.qualityLevel} quality rating`);
  }

  if (item.stackTags.length > 0) {
    reasons.push(`Uses ${item.stackTags.slice(0, 3).join(", ")}`);
  }

  return reasons.length > 0 ? reasons.join(" · ") : "Matches your search criteria";
}

interface PortfolioMatch {
  id: string;
  title: string;
  creatorName: string;
  qualityLevel: string;
  matchReason: string;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          content:
            "Chat is not configured. Please add OPENROUTER_API_KEY to your environment variables.",
          portfolios: [],
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { content: "Invalid request format.", portfolios: [] },
        { status: 400 },
      );
    }

    const { messages } = parsed.data;
    const lastUserMessage = messages[messages.length - 1];

    // Check if we should search for portfolios
    const criteria = extractSearchCriteria(lastUserMessage.content);
    let portfolios: PortfolioMatch[] = [];

    if (criteria) {
      portfolios = await searchPortfolios(criteria);
    }

    // Build context for the LLM
    let contextPrefix = "";
    if (portfolios.length > 0) {
      contextPrefix = `\n\nI found ${portfolios.length} matching portfolios in our gallery:\n`;
      portfolios.forEach((p, i) => {
        contextPrefix += `${i + 1}. "${p.title}" by ${p.creatorName} (${p.qualityLevel}) - ${p.matchReason}\n`;
      });
      contextPrefix += "\nPlease present these to the user and explain why they match their criteria.";
    }

    // Call OpenRouter
    const model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://foliomuse.com",
        "X-Title": "FolioMuse Foliobot",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextPrefix },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Foliobot] OpenRouter error:", error);
      return NextResponse.json(
        {
          content:
            "I encountered an error connecting to the AI service. Please check your API key and try again.",
          portfolios: [],
        },
        { status: 502 },
      );
    }

    const data = await response.json();
    const content =
      data.choices?.[0]?.message?.content ||
      "I could not generate a response. Please try again.";

    return NextResponse.json({ content, portfolios });
  } catch (error) {
    console.error("[Foliobot] Error:", error);
    return NextResponse.json(
      {
        content: "An unexpected error occurred. Please try again.",
        portfolios: [],
      },
      { status: 500 },
    );
  }
}
