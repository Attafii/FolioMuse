import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const VALID_LICENSES = ["CC_BY", "EXPLICIT_PERMISSION", "LICENSED"];

async function main() {
  const items = await prisma.galleryItem.findMany({
    where: { status: "ACCEPTED" },
    include: { attribution: true, consent: true },
  });

  const creators = new Set(items.map((i) => i.attribution?.creatorName));
  const roles = [...new Set(items.map((i) => i.creatorRole))];

  const badLicense = await prisma.attribution.count({
    where: { licenseType: { notIn: VALID_LICENSES } },
  });
  const picsumItems = items.filter((i) => (i.mediaUrl ?? "").includes("picsum.photos")).length;
  const mshotsItems = items.filter((i) =>
    (i.mediaUrl ?? "").startsWith("https://s0.wp.com/mshots/v1/"),
  ).length;
  const fictionalLeftovers = await prisma.creator.count({
    where: { name: { in: ["Elena Vasquez", "Marcus Chen", "Aisha Patel", "Jordan Okonkwo"] } },
  });
  const sectionRecords = await prisma.sectionRecord.count();

  const report = {
    acceptedItems: items.length,
    distinctCreators: creators.size,
    distinctRoles: roles,
    badLicenseAttributions: badLicense,
    picsumItems,
    mshotsItems,
    fictionalLeftovers,
    sectionRecords,
    r2FloorMet: items.length >= 20 && creators.size >= 20 && roles.length >= 2,
    allChecksPass:
      badLicense === 0 &&
      picsumItems === 0 &&
      fictionalLeftovers === 0 &&
      mshotsItems === items.length &&
      items.length >= 20 &&
      sectionRecords >= 3,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.allChecksPass) process.exit(1);
  await prisma.$disconnect();
}
main();
