import type { MetadataRoute } from "next";

/**
 * robots.txt for FolioMuse.
 *
 * Allows all crawlers to index the site.
 * Explicitly allows AI bots for LLM citation (ChatGPT, Claude, Perplexity, Gemini).
 * Blocks API routes and internal pages from indexing.
 * References the sitemap for search engine discovery.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://foliomuse.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/mcp",
          "/builder",
          "/liked",
          "/random",
          "/_next/",
        ],
      },
      // Explicitly allow AI search bots for LLM citation
      {
        userAgent: ["GPTBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "anthropic-ai"],
        allow: "/",
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
