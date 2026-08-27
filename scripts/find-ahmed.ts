import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const items = await prisma.galleryItem.findMany({
    where: {
      attribution: {
        creatorName: { contains: "ahmed", mode: "insensitive" },
      },
    },
    select: {
      id: true,
      title: true,
      creatorRole: true,
      qualityLevel: true,
      attribution: { select: { creatorName: true, sourceUrl: true } },
    },
  });
  console.log(JSON.stringify(items, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
