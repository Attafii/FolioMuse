// Byte-level verification of em-dash integrity across DB -> API.
// Prints codepoints so mojibake in any layer is visible.
const DB_URL = process.env.DATABASE_URL;

async function checkDb() {
  // Direct Prisma check via the shared singleton (src/lib/prisma.ts uses @/ alias).
  const { prisma } = await import("@/lib/prisma");
  const item = await prisma.galleryItem.findFirst({
    where: { title: { contains: "Aurora" } },
    select: { title: true, attribution: { select: { creatorName: true } } },
  });
  if (!item) throw new Error("Aurora item not found");
  const { title, attribution } = item;
  console.log("DB title:", title);
  console.log(
    "DB title codepoints:",
    [...title].map((c) => `U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`).join(" "),
  );
  console.log("DB creatorName:", attribution.creatorName);
  console.log(
    "DB creatorName codepoints:",
    [...attribution.creatorName].map((c) => `U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`).join(" "),
  );
  await prisma.$disconnect();
}

async function checkApi() {
  const res = await fetch("http://localhost:3000/api/gallery/summaries");
  const text = await res.text(); // raw bytes -> string, UTF-8 preserved by Node
  const hasEmDash = text.includes("\u2014");
  const hasReplacement = text.includes("\uFFFD");
  const hasLatin1Split = text.includes("\u00E2\u0080\u0094");
  console.log("API status:", res.status);
  console.log("API raw em-dash U+2014 present:", hasEmDash);
  console.log("API U+FFFD replacement chars present:", hasReplacement);
  console.log("API Latin-1 split (E2 80 94 as chars) present:", hasLatin1Split);
  const json = JSON.parse(text) as { items: { title: string }[]; count: number };
  const aurora = json.items.find((i) => i.title.includes("Aurora"));
  if (!aurora) throw new Error("Aurora not found in API response");
  console.log("API Aurora title:", aurora.title);
  console.log(
    "API Aurora title codepoints:",
    [...aurora.title].map((c) => `U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`).join(" "),
  );
  console.log("API count:", json.count);
}

(async () => {
  await checkDb();
  await checkApi();
})().catch((e) => {
  console.error("CHECK ERROR:", e);
  process.exit(1);
});
