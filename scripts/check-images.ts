// Script to check portfolio image URLs.
// Run with: npx tsx scripts/check-images.ts

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Get sample of portfolios with media URLs
  const items = await prisma.galleryItem.findMany({
    where: { status: "ACCEPTED", mediaUrl: { not: null } },
    take: 20,
    select: {
      id: true,
      title: true,
      mediaUrl: true,
      attribution: {
        select: {
          creatorName: true,
        },
      },
    },
  });

  console.log("Checking image URLs...\n");

  let broken = 0;
  let working = 0;

  for (const item of items) {
    if (!item.mediaUrl) continue;

    try {
      const response = await fetch(item.mediaUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        working++;
        console.log(`✓ ${item.title} by ${item.attribution.creatorName}`);
      } else {
        broken++;
        console.log(`✗ ${item.title} by ${item.attribution.creatorName} - Status: ${response.status}`);
      }
    } catch (error) {
      broken++;
      console.log(`✗ ${item.title} by ${item.attribution.creatorName} - Error: ${error instanceof Error ? error.message : "Unknown"}`);
    }
  }

  console.log(`\nResults: ${working} working, ${broken} broken out of ${items.length} checked`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
