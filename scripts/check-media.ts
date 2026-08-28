// Script to check portfolio media status.
// Run with: npx tsx scripts/check-media.ts

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const total = await prisma.galleryItem.count({ where: { status: "ACCEPTED" } });
  const withMedia = await prisma.galleryItem.count({ where: { status: "ACCEPTED", mediaUrl: { not: null } } });
  const withoutMedia = total - withMedia;
  
  console.log("Total accepted:", total);
  console.log("With media:", withMedia);
  console.log("Without media:", withoutMedia);
  console.log("Percentage with media:", Math.round(withMedia / total * 100) + "%");
  
  // Show some examples without media
  const examples = await prisma.galleryItem.findMany({
    where: { status: "ACCEPTED", mediaUrl: null },
    take: 5,
    select: {
      id: true,
      title: true,
      attribution: {
        select: {
          creatorName: true,
          sourceUrl: true,
        },
      },
    },
  });
  
  console.log("\nExamples without media:");
  for (const ex of examples) {
    console.log(`- ${ex.title} by ${ex.attribution.creatorName} (${ex.attribution.sourceUrl})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
