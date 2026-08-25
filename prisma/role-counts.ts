import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const grouped = await prisma.galleryItem.groupBy({
    by: ["creatorRole"],
    _count: true,
    where: { status: "ACCEPTED" },
  });
  const rows = grouped
    .map((g) => ({ role: g.creatorRole, count: g._count }))
    .sort((a, b) => b.count - a.count);
  for (const r of rows) console.log(`${r.role.padEnd(12)} ${r.count}`);
  const oss = await prisma.galleryItem.count({ where: { githubUrl: { not: null } } });
  console.log(`OSS_BADGES   ${oss}`);
  await prisma.$disconnect();
}
main();
