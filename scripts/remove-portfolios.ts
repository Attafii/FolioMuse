// Script to remove specific portfolios from the database.
// Run with: npx tsx scripts/remove-portfolios.ts

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Find the portfolios to remove
  const portfolios = await prisma.galleryItem.findMany({
    where: {
      OR: [
        { title: { contains: "Aditya Dutt Pandey" } },
        { title: { contains: "Hozaifa Ali" } },
        { title: { contains: "Ahmed Allali" } },
        { title: { contains: "Liran Tal" } },
      ],
    },
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

  console.log("Found portfolios to remove:");
  for (const p of portfolios) {
    console.log(`- ${p.title} by ${p.attribution.creatorName} (${p.attribution.sourceUrl})`);
  }

  if (portfolios.length === 0) {
    console.log("No portfolios found to remove.");
    return;
  }

  // Remove the portfolios
  for (const p of portfolios) {
    console.log(`Removing: ${p.title}...`);
    
    // Delete related records first
    await prisma.behaviorEvent.deleteMany({ where: { itemId: p.id } });
    await prisma.rankingScore.deleteMany({ where: { itemId: p.id } });
    await prisma.sectionRecord.deleteMany({ where: { itemId: p.id } });
    await prisma.auditEntry.deleteMany({ where: { itemId: p.id } });
    await prisma.reviewDecision.deleteMany({ where: { itemId: p.id } });
    await prisma.ownershipClaim.deleteMany({ where: { itemId: p.id } });
    await prisma.removalRecord.deleteMany({ where: { itemId: p.id } });
    await prisma.supersedingAssertion.deleteMany({ where: { targetItemId: p.id } });
    
    // Delete the gallery item
    await prisma.galleryItem.delete({ where: { id: p.id } });
    
    console.log(`Removed: ${p.title}`);
  }

  console.log(`\nDone! Removed ${portfolios.length} portfolios.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
