// One-shot bulk importer builder: merges devportfolio.my feed + emmabostian
// awesome-list, dedupes against the hand-curated seed roster, classifies
// roles from self-described taglines, and emits prisma/data/bulk-portfolios.json.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const seedSrc = readFileSync("prisma/seed.ts", "utf8");
// Existing curated entries: { name: "X", url: "Y" ...
const existing = new Set();
for (const m of seedSrc.matchAll(/\{\s*name:\s*"([^"]+)",\s*url:\s*"(https?:\/\/[^"]+)"/g)) {
  existing.add(norm(m[2]));
  existing.add(m[1].toLowerCase());
}
function norm(u) {
  try {
    const x = new URL(u);
    return `${x.hostname.replace(/^www\./, "")}${x.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

const CLASSIFIER = [
  ["Security", /\b(security|devsecops|osint|cyber\s?security|pentest)\b/i],
  ["Game Dev", /\b(game\s?(dev|development)|unity|unreal)\b/i],
  ["AI/ML", /\b(ai|a\.i\.|ml|machine learning|deep learning|data scien|llm|gen\s?ai|mlops)\b/i],
  ["Mobile", /\b(mobile|android|ios\b|flutter|react native)\b/i],
  ["DevOps", /\b(devops|sre|site reliability|cloud engineer|kubernetes|infrastructure)\b/i],
  ["Data", /\b(data engineer|data analyst|analytics|quant|bi\b|business intelligence)\b/i],
  ["Frontend", /\b(front[\s-]?end|ui developer|web designer)\b/i],
  ["Backend", /\b(back[\s-]?end|api engineer|system architect)\b/i],
  ["Full Stack", /\b(full[\s-]?stack|mern|mean\b|web developer|software (developer|engineer)|developer)\b/i],
  // Non-dev professions
  ["Embedded", /\b(embedded|firmware|rtos|iota?\b.*hardware|electronics)\b/i],
  ["Mechanical Engineer", /\bmechanical\b/i],
  ["Civil Engineer", /\bcivil engineer/i],
  ["Architect", /^(?!.*(software|data|solution|systems)).*\barchitect/i],
  ["Photographer", /\bphotograph/i],
  ["Finance", /\b(accountant|accounting|finance|financial|cpa\b|bookkeep)/i],
  ["Marketer", /\b(marketing|growth|seo specialist|digital marketer)\b/i],
  ["Writer", /\b(writer|author|journalist|content strateg)/i],
];
function classify(tagline) {
  if (!tagline) return "Developer"; // honest generic bucket when untagged
  for (const [role, re] of CLASSIFIER) if (re.test(tagline)) return role;
  return "Developer";
}

const out = new Map();
function add(name, url, tagline, source) {
  const key = norm(url);
  if (!key || out.has(key)) return;
  let u;
  try {
    u = new URL(url);
  } catch {
    return;
  }
  if (u.protocol !== "https:") return; // MediaUrlSchema is HTTPS-only
  const host = u.hostname.replace(/^www\./, "");
  if (/^(github\.com|twitter\.com|x\.com|linkedin\.com|dev\.to|medium\.com|facebook\.com|instagram\.com)$/.test(host)) return;
  if (u.toString().length > 200) return;
  const n = name.trim();
  if (!n || n.length > 80 || existing.has(n.toLowerCase())) return;
  out.set(key, { name: n, url: `https://${host}${u.pathname === "/" ? "" : u.pathname}`, role: classify(tagline), tags: [], source });
}

// Source 1: devportfolio.my master feed (strip PowerShell's UTF-8 BOM)
const feed = JSON.parse(readFileSync(".sisyphus/tmp-feed.json", "utf8").replace(/^\uFEFF/, ""));
let feedRows = 0;
for (const e of feed) {
  const before = out.size;
  add(e.name, e.url, e.tagline || "", "feed");
  if (out.size > before) feedRows++;
}

// Source 2: emmabostian awesome list markdown
const md = readFileSync(".sisyphus/tmp-awesome.md", "utf8");
let awesomeRows = 0;
for (const m of md.matchAll(/-\s\[([^\]]+)\]\((https?:\/\/[^\)\s]+)\)(?:\s+\[([^\]]+)\])?/g)) {
  const before = out.size;
  add(m[1].replace(/\\`/g, "").trim(), m[2].split("?utm")[0], m[3] || "", "awesome");
  if (out.size > before) awesomeRows++;
}

const entries = [...out.values()];
entries.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
mkdirSync("prisma/data", { recursive: true });
writeFileSync("prisma/data/bulk-portfolios.json", JSON.stringify(entries, null, 0));

const byRole = {};
for (const e of entries) byRole[e.role] = (byRole[e.role] ?? 0) + 1;
console.log("FEED_NEW=", feedRows, "AWESOME_NEW=", awesomeRows, "TOTAL_BULK=", entries.length);
console.log(
  Object.entries(byRole)
    .sort((a, b) => b[1] - a[1])
    .map(([r, c]) => `${r}:${c}`)
    .join(" | "),
);
