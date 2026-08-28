// RSS feed for new portfolio additions.
// ponytail: minimal RSS 2.0, no external dependencies.

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export async function GET(): Promise<Response> {
  try {
    const items = await prisma.galleryItem.findMany({
      where: { status: "ACCEPTED" },
      orderBy: { reviewedAt: "desc" },
      take: 50,
      include: {
        attribution: {
          select: {
            creatorName: true,
            sourceUrl: true,
          },
        },
      },
    });

    const baseUrl = "https://foliomuse.com";
    const now = new Date().toUTCString();

    const rssItems = items
      .map(
        (item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${baseUrl}/gallery/${item.id}</link>
      <description><![CDATA[Portfolio by ${item.attribution.creatorName} — ${item.creatorRole}]]></description>
      <pubDate>${item.reviewedAt ? new Date(item.reviewedAt).toUTCString() : now}</pubDate>
      <guid isPermaLink="true">${baseUrl}/gallery/${item.id}</guid>
    </item>`,
      )
      .join("");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>FolioMuse — Portfolio Inspiration Gallery</title>
    <link>${baseUrl}</link>
    <description>Browse 2,000+ real portfolios from designers, developers, and creators. AI-rated, curated, and ready to inspire your next project.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[RSS] Error generating feed:", error);
    return new Response("Error generating feed", { status: 500 });
  }
}
