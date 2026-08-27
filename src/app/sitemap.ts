import type { MetadataRoute } from "next";

/**
 * Dynamic sitemap for FolioMuse.
 *
 * Generates sitemap entries for all public pages.
 * Gallery detail pages are included dynamically from the database.
 * Updated daily for search engine freshness signals.
 */

const BASE_URL = "https://foliomuse.com";

/** Static pages with their priorities and change frequencies. */
const staticPages: MetadataRoute.Sitemap = [
  {
    url: BASE_URL,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/browse`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/docs`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    url: `${BASE_URL}/design`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Dynamic gallery pages would be fetched here if needed.
  // For now, return static pages only.
  // When gallery grows, add:
  //   const items = await prisma.galleryItem.findMany({ where: { status: 'ACCEPTED' }, select: { id: true, updatedAt: true } });
  //   const galleryPages = items.map(item => ({ url: `${BASE_URL}/gallery/${item.id}`, lastModified: item.updatedAt, changeFrequency: 'weekly' as const, priority: 0.8 }));
  //   return [...staticPages, ...galleryPages];

  return staticPages;
}
