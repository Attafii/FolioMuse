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
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Chat API route for Foliobot with proper RAG.
 *
 * Searches ALL portfolios in the database using text search (q parameter).
 * Returns portfolio cards with images, star ratings, and links.
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
const SYSTEM_PROMPT = `You are Foliobot, the AI assistant for FolioMuse — a portfolio inspiration gallery with 2000+ portfolios.

CRITICAL RULES:
- NEVER generate tool calls, function calls, or any special syntax
- NEVER output <tool_call>, <function_call>, or similar XML/JSON tags
- Respond ONLY in natural, conversational text
- The system automatically searches for portfolios when users ask — you will receive the results in your context
- Present portfolio recommendations clearly with explanations

Your role:
1. Help users understand how FolioMuse works (curated gallery, AI ratings, star ratings 1-5)
2. When you receive portfolio search results in your context, present them clearly to the user
3. Be helpful, concise, and friendly

Star ratings:
- 5 stars: Best-in-class, exceptional craft (L4 Exemplary)
- 4 stars: High quality, well-executed (L3 Strong)
- 3 stars: Meets standards, solid work (L2 Adequate)
- 2 stars: Below average, limited value (L1 Minimal)
- 1 star: Does not meet standards (L0 Unusable)

When presenting portfolios, explain WHY each one matches their criteria. Mention the star rating and key details.

If the user asks about something unrelated to portfolios or FolioMuse, gently redirect them.`;

/** Map quality level to star rating. */
function qualityToStars(level: string): number {
  const map: Record<string, number> = { L0: 1, L1: 2, L2: 3, L3: 4, L4: 5 };
  return map[level] ?? 3;
}

/** Map quality level to star display string. */
function qualityToStarString(level: string): string {
  const stars = qualityToStars(level);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

/**
 * Extract search query from user message.
 * Extracts names, roles, styles, and builds a search query.
 */
function extractSearchQuery(message: string): {
  query: string;
  role?: string;
  style?: string;
  quality?: string[];
} {
  const lower = message.toLowerCase();
  const result: { query: string; role?: string; style?: string; quality?: string[] } = {
    query: "",
  };

  // Extract potential name (look for capitalized words that might be names)
  const nameMatch = message.match(/(?:by|from|find|show|search|look for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (nameMatch) {
    result.query = nameMatch[1];
  }

  // Extract role - MUST match database values exactly
  const rolePatterns = [
    { pattern: /design(?:er)?|ui\/ux|ux/i, role: "Designer" },
    { pattern: /frontend|front-end|react|vue|angular/i, role: "Frontend" },
    { pattern: /backend|back-end|node|python|java/i, role: "Backend" },
    { pattern: /full.?stack/i, role: "Full Stack" },
    { pattern: /mobile|ios|android|react native|flutter/i, role: "Mobile" },
    { pattern: /devops|infrastructure|cloud/i, role: "DevOps" },
    { pattern: /ai|ml|machine learning|data scien/i, role: "AI/ML" },
    { pattern: /data|analytics/i, role: "Data" },
    { pattern: /game|unity|unreal/i, role: "Game Dev" },
    { pattern: /security|cyber/i, role: "Security" },
    { pattern: /photo/i, role: "Photographer" },
    { pattern: /architect/i, role: "Architect" },
    { pattern: /embedded/i, role: "Embedded" },
    { pattern: /mechanical/i, role: "Mechanical Engineer" },
    { pattern: /finance|fintech/i, role: "Finance" },
    { pattern: /market/i, role: "Marketer" },
  ];

  for (const { pattern, role } of rolePatterns) {
    if (pattern.test(lower)) {
      result.role = role;
      // If no name query extracted, use the role as query
      if (!result.query) {
        result.query = role;
      }
      break;
    }
  }

  // Extract style
  const stylePatterns = [
    { pattern: /minimal(?:ist)?/i, style: "minimal" },
    { pattern: /editorial/i, style: "editorial" },
    { pattern: /brutalist/i, style: "brutalist" },
    { pattern: /dark|moody|atmospheric/i, style: "dark-mode" },
    { pattern: /colorful|vibrant|bright/i, style: "colorful" },
    { pattern: /clean|simple/i, style: "clean" },
    { pattern: /modern|contemporary/i, style: "modern" },
    { pattern: /creative|artistic/i, style: "creative" },
    { pattern: /neon|cyberpunk|futuristic/i, style: "dark-mode" },
  ];

  for (const { pattern, style } of stylePatterns) {
    if (pattern.test(lower)) {
      result.style = style;
      break;
    }
  }

  // Extract quality preference
  if (lower.includes("best") || lower.includes("top") || lower.includes("exemplary") || lower.includes("5 star")) {
    result.quality = ["L4"];
  } else if (lower.includes("high quality") || lower.includes("strong") || lower.includes("4 star")) {
    result.quality = ["L3", "L4"];
  }

  // If no specific query extracted, use the full message as query
  if (!result.query) {
    result.query = message;
  }

  return result;
}

/**
 * Search for matching portfolios using the CurationService.
 * Uses role filter first, then text search, then top-rated fallback.
 * Ahmed Attafi's portfolio is always prioritized first.
 */
async function searchPortfolios(criteria: {
  query: string;
  role?: string;
  style?: string;
  quality?: string[];
}): Promise<PortfolioMatch[]> {
  try {
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

    // Always fetch Ahmed Attafi's portfolio first
    const AHMED_ATTAFI_ID = "cmt8us4xv00dgigktqsz3viqh";
    let ahmedPortfolio: PortfolioMatch | null = null;

    try {
      const ahmedResult = await service.listAcceptedFiltered({
        ids: [AHMED_ATTAFI_ID],
        page: 1,
        pageSize: 1,
      } as Parameters<typeof service.listAcceptedFiltered>[0]);

      if (ahmedResult.items.length > 0) {
        const item = ahmedResult.items[0];
        ahmedPortfolio = {
          id: item.id,
          title: item.title,
          creatorName: item.attribution.creatorName,
          creatorRole: item.creatorRole,
          qualityLevel: item.qualityLevel,
          stars: qualityToStars(item.qualityLevel),
          starString: qualityToStarString(item.qualityLevel),
          mediaUrl: item.mediaUrl,
          sourceUrl: item.attribution.sourceUrl,
          stackTags: item.stackTags,
          styleTags: item.styleTags,
          matchReason: "Creator's portfolio — featured on FolioMuse",
        };
      }
    } catch (err) {
      console.warn("[Foliobot] Could not fetch Ahmed Attafi's portfolio:", err);
    }

    let result: { items: GalleryItemSummary[]; total: number } = { items: [], total: 0 };

    // Strategy 1: If we have a role, search by role first (most specific)
    if (criteria.role) {
      const roleParams: Record<string, unknown> = {
        page: 1,
        pageSize: 10,
        sort: "quality",
        role: [criteria.role],
      };
      if (criteria.style) {
        roleParams.style = [criteria.style];
      }
      if (criteria.quality) {
        roleParams.quality = criteria.quality;
      }
      result = await service.listAcceptedFiltered(roleParams as Parameters<typeof service.listAcceptedFiltered>[0]);
    }

    // Strategy 2: If no role results, try text search
    if (result.items.length === 0 && criteria.query) {
      const textParams: Record<string, unknown> = {
        q: criteria.query,
        page: 1,
        pageSize: 10,
        sort: "quality",
      };
      if (criteria.style) {
        textParams.style = [criteria.style];
      }
      if (criteria.quality) {
        textParams.quality = criteria.quality;
      }
      result = await service.listAcceptedFiltered(textParams as Parameters<typeof service.listAcceptedFiltered>[0]);
    }

    // Strategy 3: If still no results, get top-rated portfolios
    if (result.items.length === 0) {
      const topParams: Record<string, unknown> = {
        page: 1,
        pageSize: 10,
        sort: "quality",
      };
      result = await service.listAcceptedFiltered(topParams as Parameters<typeof service.listAcceptedFiltered>[0]);
    }

    // Map results and filter out Ahmed's portfolio if already in results
    const mappedResults = result.items
      .filter((item) => item.id !== AHMED_ATTAFI_ID)
      .map((item: GalleryItemSummary) => ({
        id: item.id,
        title: item.title,
        creatorName: item.attribution.creatorName,
        creatorRole: item.creatorRole,
        qualityLevel: item.qualityLevel,
        stars: qualityToStars(item.qualityLevel),
        starString: qualityToStarString(item.qualityLevel),
        mediaUrl: item.mediaUrl,
        sourceUrl: item.attribution.sourceUrl,
        stackTags: item.stackTags,
        styleTags: item.styleTags,
        matchReason: buildMatchReason(item, criteria),
      }));

    // Prepend Ahmed's portfolio if available
    const finalResults = ahmedPortfolio
      ? [ahmedPortfolio, ...mappedResults].slice(0, 10)
      : mappedResults.slice(0, 10);

    return finalResults;
  } catch (error) {
    console.error("[Foliobot] Search error:", error);
    return [];
  }
}

function buildMatchReason(
  item: GalleryItemSummary,
  criteria: { query: string; role?: string; style?: string; quality?: string[] },
): string {
  const reasons: string[] = [];

  // Check if query matches title or creator name
  const queryLower = criteria.query.toLowerCase();
  if (item.title.toLowerCase().includes(queryLower)) {
    reasons.push(`Title matches "${criteria.query}"`);
  }
  if (item.attribution.creatorName.toLowerCase().includes(queryLower)) {
    reasons.push(`Creator name matches "${criteria.query}"`);
  }

  if (criteria.role && item.creatorRole === criteria.role) {
    reasons.push(`Matches ${criteria.role} role`);
  }
  if (criteria.style && item.styleTags.some(s => s.toLowerCase().includes(criteria.style!.toLowerCase()))) {
    reasons.push(`Has ${criteria.style} style`);
  }
  if (criteria.quality?.includes(item.qualityLevel)) {
    reasons.push(`${item.qualityLevel} quality rating`);
  }

  if (item.stackTags.length > 0 && reasons.length === 0) {
    reasons.push(`Uses ${item.stackTags.slice(0, 3).join(", ")}`);
  }

  return reasons.length > 0 ? reasons.join(" · ") : "Top-rated portfolio";
}

interface PortfolioMatch {
  id: string;
  title: string;
  creatorName: string;
  creatorRole: string;
  qualityLevel: string;
  stars: number;
  starString: string;
  mediaUrl: string | null;
  sourceUrl: string;
  stackTags: string[];
  styleTags: string[];
  matchReason: string;
}

export async function POST(request: Request) {
  try {
    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`chat:${ip}`, RATE_LIMITS.chat);
    if (!rateLimit.success) {
      return NextResponse.json(
        { content: "Rate limit exceeded. Please try again later.", portfolios: [] },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

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

    // Extract search query and search portfolios
    const criteria = extractSearchQuery(lastUserMessage.content);
    const portfolios = await searchPortfolios(criteria);

    // Build context for the LLM
    let contextPrefix = "";
    if (portfolios.length > 0) {
      contextPrefix = `\n\nI found ${portfolios.length} matching portfolios in our gallery (searched across 2000+ portfolios). Here are the results:\n\n`;
      portfolios.forEach((p, i) => {
        contextPrefix += `${i + 1}. **${p.title}** by ${p.creatorName} (${p.creatorRole})\n`;
        contextPrefix += `   - Star Rating: ${p.starString} (${p.stars}/5)\n`;
        contextPrefix += `   - Why it matches: ${p.matchReason}\n`;
        if (p.stackTags.length > 0) {
          contextPrefix += `   - Tech Stack: ${p.stackTags.slice(0, 4).join(", ")}\n`;
        }
        contextPrefix += `   - View: /gallery/${p.id}\n\n`;
      });
      contextPrefix += `Present these portfolios to the user. Explain why each one matches their criteria. Mention the star ratings and key details. Do NOT generate any tool calls — just present the results naturally.`;
    } else {
      contextPrefix = `\n\nNo portfolios found matching "${criteria.query}". Suggest the user try different search terms or browse the gallery at /browse.`;
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
    let content =
      data.choices?.[0]?.message?.content ||
      "I could not generate a response. Please try again.";

    // Post-process: strip any tool calls the LLM might still generate
    content = content
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
      .replace(/<function_call>[\s\S]*?<\/function_call>/g, "")
      .replace(/<arg_key>[\s\S]*?<\/arg_key>/g, "")
      .replace(/<arg_value>[\s\S]*?<\/arg_value>/g, "")
      .replace(/FolioMuse_search\s*\([^)]*\)/g, "")
      .trim();

    // If content is empty after stripping, provide a fallback
    if (!content) {
      content = portfolios.length > 0
        ? `I found ${portfolios.length} matching portfolios for you! Check them out below.`
        : "I'd be happy to help you find portfolios. Could you tell me more about what you're looking for?";
    }

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
