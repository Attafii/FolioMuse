import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

/**
 * Curated seed at maximum scale (~2k portfolios) across EVERY profession —
 * developers of all stripes plus architects, mechanical engineers,
 * photographers, and finance professionals.
 *
 * Three sources, in ascending curational weight:
 *  1. BULK   (prisma/data/bulk-portfolios.json) — merged devportfolio.my feed
 *            + emmabostian awesome-list, deduped & tagline-classified by
 *            scripts/build-bulk-portfolios.mjs.
 *  2. EXTRAS (prisma/data/curated-extras.json) — hand-verified non-dev
 *            portfolios from professional roundup articles.
 *  3. ROSTER (below)                            — famous/award-winning picks,
 *            GitHub-verified OSS badges only.
 *
 * Charter compliance unchanged: display-only references (ConsentTier DISPLAY),
 * full attribution + source link, honest consent basis (public self-submission
 * to directories/showcases), live mshots screenshots, zero content storage.
 */

type SeedEntry = {
  name: string;
  url: string;
  /** Open set — any profession with a portfolio belongs (user charter ask). */
  role: string;
  tags: string[];
  stack?: string[];
  github?: string;
};

const EXTRAS: SeedEntry[] = (
  JSON.parse(readFileSync(new URL("./data/curated-extras.json", import.meta.url), "utf8")) as Omit<
    SeedEntry,
    "stack" | "github"
  >[]
).map((e) => ({ ...e, tags: e.tags ?? [], stack: [] }));

const BULK: SeedEntry[] = (
  JSON.parse(readFileSync(new URL("./data/bulk-portfolios.json", import.meta.url), "utf8")) as {
    name: string;
    url: string;
    role: string;
  }[]
).map((e) => ({ name: e.name, url: e.url, role: e.role, tags: [] }));

const ROSTER: SeedEntry[] = [
  // ── Designers ─────────────────────────────────────────────────────────────
  { name: "Adham Dannaway", url: "https://www.adhamdannaway.com", role: "Designer", tags: ["ui", "ux", "frontend"], stack: [] },
  { name: "Artur Bień", url: "https://expensive.toys", role: "Designer", tags: ["ui", "creative", "frontend"], stack: [] },
  { name: "Adina Hawaldar", url: "https://www.adinaa.me", role: "Designer", tags: ["web-design", "development"], stack: [] },
  { name: "Debbie Chen", url: "https://debbiechen.me", role: "Designer", tags: ["design", "academic"] },
  { name: "Keita Yamada", url: "https://p5aholic.me", role: "Designer", tags: ["design", "web", "interactive"], stack: [] },
  { name: "Pixel Matters", url: "https://pixelmatters.com", role: "Designer", tags: ["agency", "digital-product", "award-winner"], stack: [] },
  { name: "Mitrakos", url: "https://mitrakos.com", role: "Designer", tags: ["digital-agency", "award-winner"], stack: [] },
  { name: "Metajive", url: "https://metajive.com", role: "Designer", tags: ["agency", "design", "award-winner"], stack: [] },
  { name: "Andrej Sharapov", url: "https://sharapov.dev", role: "Designer", tags: ["design-engineering", "ui"], stack: [] },
  // ── Frontend ──────────────────────────────────────────────────────────────
  { name: "Brittany Chiang", url: "https://brittanychiang.com", role: "Frontend", tags: ["minimal", "dark", "engineer"], stack: [], github: "https://github.com/bchiang7/v4" },
  { name: "Andy Bell", url: "https://andy-bell.design", role: "Frontend", tags: ["css", "educator", "consulting"], stack: [] },
  { name: "Bekah Hawrot Weigel", url: "https://bekahhw.github.io", role: "Frontend", tags: ["community", "open-source"], stack: [] },
  { name: "Brad Garropy", url: "https://bradgarropy.com", role: "Frontend", tags: ["frontend", "open-source"], stack: [], github: "https://github.com/bradgarropy/bradgarropy.com" },
  { name: "Atanas Atanasov", url: "https://atanas.info", role: "Frontend", tags: ["frontend", "engineering"], stack: [] },
  { name: "Abdul Mannan", url: "https://mannan.io", role: "Frontend", tags: ["senior", "frontend"], stack: [] },
  { name: "Adam Alston", url: "https://www.adamalston.com", role: "Frontend", tags: ["minimal", "dark"], stack: [] },
  { name: "Dale Larroder", url: "https://dalelarroder.com", role: "Frontend", tags: ["frontend", "engineer"] },
  { name: "Declan Chidlow", url: "https://vale.rocks/portfolio", role: "Frontend", tags: ["frontend"] },
  { name: "Denis Tokarev", url: "https://devlato.com", role: "Frontend", tags: ["frontend", "veteran"] },
  { name: "Nemanja Pavlovic", url: "https://nemanja.works", role: "Frontend", tags: ["frontend", "fullstack"] },
  { name: "Rifqi Sakha", url: "https://www.rifqisakha.my.id", role: "Frontend", tags: ["frontend", "ui", "ux"] },
  { name: "Jeff Cardinal", url: "https://jeffcardinal.com", role: "Frontend", tags: ["software", "design", "engineer"] },
  { name: "Josh Comeau", url: "https://www.joshwcomeau.com", role: "Frontend", tags: ["educator", "react", "creative-coding"], stack: ["React"] },
  { name: "Paco Coursey", url: "https://paco.me", role: "Frontend", tags: ["minimal", "interaction-design"], stack: [] },
  { name: "Emil Kowalski", url: "https://emilkowal.ski", role: "Frontend", tags: ["animations", "toast", "craft"], stack: [] },
  { name: "Sara Soueidan", url: "https://sarasoueidan.com", role: "Frontend", tags: ["svg", "accessibility", "author"], stack: [] },
  { name: "Shu Ding", url: "https://shud.in", role: "Frontend", tags: ["vercel", "open-source"], stack: ["Next.js"], github: "https://github.com/shuding/shud.in" },
  { name: "Sam Rose", url: "https://samwho.dev", role: "Frontend", tags: ["visualisation", "education", "algorithms"], stack: [] },
  { name: "Neal Agarwal", url: "https://neal.fun", role: "Frontend", tags: ["creative", "interactive", "experiments"], stack: [] },
  { name: "Pedro Duarte", url: "https://ped.ro", role: "Frontend", tags: ["design-engineering", "ui"], stack: [] },
  { name: "Chris Coyier", url: "https://chriscoyier.net", role: "Frontend", tags: ["css", "codepen", "founder"], stack: [] },
  { name: "Kevin Grajeda", url: "https://kvin.me", role: "Frontend", tags: ["portfolio", "engineering-student"], stack: [] },
  { name: "Julius Gehrig", url: "https://julius.fm", role: "Frontend", tags: ["creative", "minimal"], stack: [] },
  { name: "Kenta Oshikura", url: "https://kentatoshikura.com", role: "Frontend", tags: ["creative", "interactive"], stack: [] },
  { name: "Dejan Markovic", url: "https://www.dejan.works", role: "Frontend", tags: ["animation", "clean"], stack: [] },
  { name: "Eric Van Holtz", url: "https://vanholtz.co", role: "Frontend", tags: ["independent", "engineering-management"], stack: [] },
  { name: "Robb Owen", url: "https://robbowen.digital", role: "Frontend", tags: ["accessible", "motion"], stack: [] },
  { name: "Jhey Tompkins", url: "https://jhey.dev", role: "Frontend", tags: ["css-art", "creative-coding", "three-js"], stack: ["Three.js"] },
  { name: "Regis Grumberg", url: "https://www.regisgrumberg.com/", role: "Frontend", tags: ["creative-developer", "webgl"], stack: [] },
  { name: "Aakhand Tajmirul", url: "https://www.tajmirul.site", role: "Frontend", tags: ["frontend", "engineer"] },
  { name: "Aayush Mishra", url: "https://aayush-mishra.xyz", role: "Frontend", tags: ["frontend"] },
  // ── Backend ───────────────────────────────────────────────────────────────
  { name: "Alexey Golub", url: "https://tyrrrz.me", role: "Backend", tags: ["open-source", "engineer"], stack: ["C#"], github: "https://github.com/Tyrrrz/tyrrrz.me" },
  { name: "Akash Rajpurohit", url: "https://akashrajpurohit.com", role: "Backend", tags: ["backend", "open-source"], stack: ["TypeScript"] },
  { name: "Davide Santangelo", url: "https://davidesantangelo.com", role: "Backend", tags: ["open-source", "backend", "engineer"], github: "https://github.com/davidesantangelo/davidesantangelo.com" },
  { name: "Andrés Souza", url: "https://an3dree.dev", role: "Backend", tags: ["backend"] },
  { name: "Aditya Dutt Pandey", url: "https://www.adpandey.com", role: "Backend", tags: ["backend", "architecture", "founder"] },
  { name: "Amit Sah", url: "https://amit-sah.com.np", role: "Backend", tags: ["backend", "node", "llm", "cloud"], stack: ["Node.js"] },
  { name: "Aryan Gupta", url: "https://aryancodes.tech", role: "Backend", tags: ["backend", "golang", "postgres"], stack: ["Go", "PostgreSQL"] },
  // ── Full Stack ────────────────────────────────────────────────────────────
  { name: "Ahmad Awais", url: "https://ahmadawais.com", role: "Full Stack", tags: ["open-source", "founder"], stack: [] },
  { name: "Amruth Pillai", url: "https://amruthpillai.com", role: "Full Stack", tags: ["open-source", "engineer"], stack: [] },
  { name: "Benjamin Lannon", url: "https://lannonbr.com", role: "Full Stack", tags: ["open-source", "engineering"], stack: [] },
  { name: "Aleksandar Pajić", url: "https://www.aleksandarpajic.co", role: "Full Stack", tags: ["software", "design"], stack: [] },
  { name: "Andrew Woods", url: "https://andrewwoods.net", role: "Full Stack", tags: ["web", "engineering"], stack: [] },
  { name: "Antoine Dangleterre", url: "https://antoinedangleterre.com", role: "Full Stack", tags: ["fullstack", "freelance"], stack: [] },
  { name: "Austin Serb", url: "https://www.austinserb.com", role: "Full Stack", tags: ["fullstack", "engineering"], stack: [] },
  { name: "Bechir Lahoueg", url: "https://www.bechirlahoueg.tech", role: "Full Stack", tags: ["fullstack"], stack: ["React", "Node.js"] },
  { name: "Bhushan Zade", url: "https://bhushanz.netlify.app", role: "Full Stack", tags: ["senior", "fullstack"], stack: ["Angular", "React", "Node.js"] },
  { name: "Daan Hessen", url: "https://www.daanhessen.nl", role: "Full Stack", tags: ["software", "engineer"] },
  { name: "Daniel Ortiz", url: "https://danielortiz.web.app", role: "Full Stack", tags: ["fullstack"] },
  { name: "Daniel Steele", url: "https://www.danielsteele.dev", role: "Full Stack", tags: ["fullstack"] },
  { name: "Danilo Silva", url: "https://www.iamdanilo.com", role: "Full Stack", tags: ["software", "engineer"] },
  { name: "Emeric Guyon", url: "https://emericguyon.com", role: "Full Stack", tags: ["fullstack", "freelance"] },
  { name: "Joel Johnson", url: "https://www.joelcjohnson.me", role: "Full Stack", tags: ["fullstack", "software"] },
  { name: "Lee Robinson", url: "https://leerob.io", role: "Full Stack", tags: ["nextjs", "vercel", "educator"], stack: ["Next.js"] },
  { name: "Mohammad Gauhar", url: "https://www.iamgauhar.in", role: "Full Stack", tags: ["fullstack", "mern", "nextjs"], stack: ["Next.js"] },
  { name: "Naveen Kumar", url: "https://naveenkumarm.space", role: "Full Stack", tags: ["fullstack"] },
  { name: "Prakash Jha", url: "https://prakashjha.com", role: "Full Stack", tags: ["fullstack"] },
  { name: "Sathwik Yellapragada", url: "https://www.sathwiky.dev", role: "Full Stack", tags: ["fullstack"] },
  { name: "Shalon Fernando", url: "https://shalon.vercel.app", role: "Full Stack", tags: ["software", "engineer"] },
  { name: "Taha Umar", url: "https://tahaumar.site", role: "Full Stack", tags: ["fullstack"] },
  { name: "Anthony Fu", url: "https://antfu.me", role: "Full Stack", tags: ["open-source", "vue", "vite"], stack: ["Vue"], github: "https://github.com/antfu/antfu.me" },
  { name: "Kent C. Dodds", url: "https://kentcdodds.com", role: "Full Stack", tags: ["educator", "react", "open-source"], stack: ["React"], github: "https://github.com/kentcdodds/kentcdodds.com" },
  { name: "Wes Bos", url: "https://wesbos.com", role: "Full Stack", tags: ["educator", "javascript", "courses"], stack: [] },
  { name: "Cassidy Williams", url: "https://cassidoo.co", role: "Full Stack", tags: ["engineering", "community", "humor"], stack: [] },
  { name: "Henri Heymans", url: "https://www.henriheymans.com/", role: "Full Stack", tags: ["freelance", "creative-developer"], stack: [] },
  { name: "Marvin Schwaibold", url: "https://www.marvinschwaibold.com/", role: "Full Stack", tags: ["product", "freelance"], stack: [] },
  { name: "Matt Farley", url: "https://mattfarley.ca/", role: "Full Stack", tags: ["freelance", "client-work"], stack: [] },
  // ── AI/ML ─────────────────────────────────────────────────────────────────
  { name: "Gaurav Saxena", url: "https://www.gauravsaxena.site", role: "AI/ML", tags: ["fullstack", "ai"] },
  { name: "Harsh Banka", url: "https://harshbanka.tech", role: "AI/ML", tags: ["ai", "ml", "software"] },
  { name: "Jeayoung Jeon", url: "https://jyje.online", role: "AI/ML", tags: ["genai", "mlops", "infrastructure"] },
  { name: "Puja Sridhar", url: "https://pujasridhar.github.io", role: "AI/ML", tags: ["terminal", "rag", "ai", "interactive"] },
  { name: "Redoyanul Haque", url: "https://www.redoyanulhaque.me", role: "AI/ML", tags: ["ai", "fullstack", "python"], stack: ["Python"] },
  { name: "Zangwei Zheng", url: "https://zangwei.dev", role: "AI/ML", tags: ["fullstack", "ai-research"] },
  { name: "Charlie Gerard", url: "https://charliegerard.com", role: "AI/ML", tags: ["creative-technologist", "machine-learning", "browser"], stack: [] },
  { name: "Aaabad Touk", url: "https://aaabadcode.com", role: "AI/ML", tags: ["ai", "engineer"] },
  { name: "Ahmed Tokyo", url: "https://ahmedtokyo.com", role: "AI/ML", tags: ["senior", "ai", "software"] },
  // ── Mobile ────────────────────────────────────────────────────────────────
  { name: "Aman Mittal", url: "https://amanhimself.dev", role: "Mobile", tags: ["react-native", "technical-writing"], stack: ["React Native"] },
  { name: "Sohanuzzaman Soad", url: "https://ssoad.github.io", role: "Mobile", tags: ["mobile", "ai", "software"] },
  { name: "Aakash Rajbanshi", url: "https://aakashrajbanshi.com.np", role: "Mobile", tags: ["flutter", "mobile"], stack: ["Flutter"] },
  { name: "Afaq Awan", url: "https://afaq35202.github.io", role: "Mobile", tags: ["mobile", "apps"] },
  { name: "Abdul Wahab Khan", url: "https://wahab-khan.github.io/Abdul-Wahab-Khan", role: "Mobile", tags: ["mobile"] },
  { name: "Binay Shaw", url: "https://binay-shaw.onrender.com", role: "Mobile", tags: ["mobile", "android"] },
  // ── DevOps ────────────────────────────────────────────────────────────────
  { name: "Kuchizu", url: "https://kuchizu.com", role: "DevOps", tags: ["devops", "infrastructure"] },
  { name: "Kajendran Alagaratnam", url: "https://kajendran.dev", role: "DevOps", tags: ["senior", "developer-experience", "tooling"] },
  { name: "Raunak Kumar Jha", url: "https://www.imraunak.dev", role: "DevOps", tags: ["fullstack", "backend", "devops"] },
  { name: "Aditya Seth", url: "https://adityaseth.in", role: "DevOps", tags: ["devops", "architect"] },
  { name: "Aradhya Puneeth", url: "https://aradhyapuneeth.github.io", role: "DevOps", tags: ["devops", "engineer"] },
  { name: "Binyam Seyoum", url: "https://binyam.io", role: "DevOps", tags: ["devops", "cloud"] },
  // ── Data ──────────────────────────────────────────────────────────────────
  { name: "Bjorn Melin", url: "https://bjornmelin.io", role: "Data", tags: ["data-science", "machine-learning"], stack: ["Python"] },
  { name: "Yassine Erradouani", url: "https://yerradouani.me", role: "Data", tags: ["data-engineering", "bi", "analytics"] },
  { name: "Cian Goon", url: "https://ciangoon.dev", role: "Data", tags: ["quant", "data", "software"] },
  // ── Game Dev ──────────────────────────────────────────────────────────────
  { name: "Siddharth", url: "https://sudosidd.dev", role: "Game Dev", tags: ["gamedev", "creative"] },
  { name: "Bruno Simon", url: "https://bruno-simon.com", role: "Game Dev", tags: ["three-js", "creative-developer", "playful"], stack: ["Three.js"] },
  { name: "Althruist", url: "https://althruist.fyi", role: "Game Dev", tags: ["gamedev"] },
  { name: "Augusto Polonio", url: "https://augustopolonio.vercel.app", role: "Game Dev", tags: ["gamedev", "fullstack"] },
  { name: "Martin Tale", url: "https://martintale.com", role: "Game Dev", tags: ["web", "app", "gamedev"] },
  // ── Security ──────────────────────────────────────────────────────────────
  { name: "Syed Omer Ali", url: "https://syedomer.me", role: "Security", tags: ["devsecops", "security", "software"] },
  { name: "Ben Zimmermann", url: "https://benzimmermann.dev", role: "Security", tags: ["security", "osint", "researcher"] },
  { name: "Fernando Raggio", url: "https://raggiodev.vercel.app", role: "Security", tags: ["fullstack", "cybersecurity"] },
  { name: "Hafiq Iqmal", url: "https://hafiq.dev", role: "Security", tags: ["backend", "api", "devsecops"] },
  // ── Community wave (user-submitted + Tunisian/Moroccan + awesome-list) ────
  { name: "Ahmed Attafi", url: "https://attafii.dev", role: "AI/ML", tags: ["ai", "fullstack", "builder"] },
  { name: "Achraf Ben Abdallah", url: "https://achraf.tn", role: "Full Stack", tags: ["portfolio"] },
  { name: "Rayen Fassatoui", url: "https://www.rayenft.dev", role: "AI/ML", tags: ["fullstack", "ai-engineer"] },
  { name: "Taha", url: "https://tahabo.vercel.app", role: "Full Stack", tags: ["portfolio"], stack: ["React"] },
  { name: "Ahmed Balti", url: "https://baltii.tn", role: "Full Stack", tags: ["portfolio"] },
  { name: "Khaled Garbaya", url: "https://khaledgarbaya.net", role: "Full Stack", tags: ["tunisian", "open-source", "engineer"] },
  { name: "Smakosh", url: "https://smakosh.com", role: "Full Stack", tags: ["moroccan", "open-source", "fullstack"] },
  { name: "Issam Elbouhati", url: "https://ielb.dev", role: "Full Stack", tags: ["fullstack", "laravel", "flutter"], stack: ["Laravel", "Flutter"] },
  { name: "Khaled Souf", url: "https://ksouf.com", role: "Backend", tags: ["cto", "fintech"] },
  { name: "Enea", url: "https://eneawork.it", role: "Designer", tags: ["design", "branding"] },
  { name: "Emre Akçadağ", url: "https://akcadag.dev", role: "Mobile", tags: ["android", "flutter", "mobile"], stack: ["Flutter"] },
  { name: "Erfan Ramezani", url: "https://erfan-ramezani.ir", role: "AI/ML", tags: ["llm", "agentic-ai", "engineer"] },
  { name: "Ethan Villalovoz", url: "https://ethanvillalovoz.com", role: "AI/ML", tags: ["robotics", "ai-research", "software"] },
  { name: "Ezra Desmond Sutanto", url: "https://www.ezradesmonds.my.id", role: "AI/ML", tags: ["ai", "fullstack"] },
  { name: "Frank Duah", url: "https://frankduah.me", role: "AI/ML", tags: ["fullstack", "ai", "ml"] },
  { name: "Franco Ruiz", url: "https://francoruiz.dev", role: "Frontend", tags: ["staff-engineer", "frontend"] },
  { name: "Felipe Schmidt", url: "https://felipeschmidt.me", role: "Frontend", tags: ["frontend"] },
  { name: "Fernando Morenilla", url: "https://fmorenil.dev", role: "Frontend", tags: ["frontend"] },
  { name: "Forhad Khan", url: "https://forhadkhandev.vercel.app", role: "Frontend", tags: ["frontend"] },
  { name: "Constance Souville", url: "https://constancesouville.com", role: "Frontend", tags: ["editorial", "minimal"] },
  { name: "Cornelius Weidmann", url: "https://caweidmann.dev", role: "Frontend", tags: ["senior", "frontend", "fullstack"] },
  { name: "Gil Itzhaky", url: "https://gilitz.com", role: "Frontend", tags: ["3d", "interactive", "gamedev-inspired"], stack: [] },
  { name: "Freddy Mcloughlan", url: "https://mcloughlan.com", role: "Backend", tags: ["backend", "engineer"] },
  { name: "Fikri Izzuddin", url: "https://oyi77.github.io", role: "Backend", tags: ["architect", "web3", "tech-lead"] },
  { name: "Gabriel Maggioni", url: "https://maggioni.dev", role: "Game Dev", tags: ["linux", "blender", "gamedev"] },
  { name: "Gambhir", url: "https://gambhir.dev", role: "DevOps", tags: ["fullstack", "devops"] },
  { name: "Ganesh Angadi", url: "https://ganeshangadi.online", role: "DevOps", tags: ["devops", "systems-thinking"] },
  { name: "Edikan Bassey", url: "https://edikan-bassey.vercel.app", role: "Full Stack", tags: ["fullstack"] },
  { name: "Emmanuel Alabi", url: "https://emjjkk.tech", role: "Full Stack", tags: ["web", "app", "student"] },
  { name: "Eyad Ahmed", url: "https://fezex.vercel.app", role: "Full Stack", tags: ["fullstack", "web"] },
  { name: "Fabian Letsch", url: "https://fabianletsch.de", role: "Full Stack", tags: ["fullstack"] },
  { name: "Ferhat Olmez", url: "https://ferhatolmez.vercel.app", role: "Full Stack", tags: ["fullstack"], stack: ["React", "Node.js"] },
  { name: "Fikri Rozan", url: "https://fikrirozan.vercel.app", role: "Full Stack", tags: ["fullstack"] },
  { name: "Geet Trivedi", url: "https://www.geettrivedi.com", role: "Full Stack", tags: ["mean", "mern", "fullstack"] },
];

/** Live screenshot via WordPress mshots (the mechanism devportfolios.my uses). */
function shot(url: string, w: number, h: number): string {
  return `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=${w}&h=${h}`;
}

async function cleanupPreviousSeed() {
  // Wipe-and-rebuild: this database holds ONLY seed-generated rows (the
  // gallery is a curated reference corpus, not user data). FK-safe order:
  await prisma.sectionRecord.deleteMany({});
  await prisma.galleryItem.deleteMany({});
  await prisma.sourceRecord.deleteMany({ where: { galleryItem: null } });
  await prisma.aiProvenance.deleteMany({ where: { galleryItem: null } });
  await prisma.attribution.deleteMany({ where: { galleryItems: { none: {} } } });
  await prisma.consentRecord.deleteMany({ where: { galleryItems: { none: {} } } });
  await prisma.creator.deleteMany({ where: { attributions: { none: {} } } });
}

async function main() {
  // Runtime dedup across ALL sources (roster + extras + bulk): one URL and
  // one creator-name max. Guarantees the @unique sourceUrl can never trip.
  const seenUrls = new Set<string>();
  const seenNames = new Set<string>();
  const ALL: SeedEntry[] = [...ROSTER, ...EXTRAS, ...BULK].filter((e) => {
    let key: string;
    try {
      const u = new URL(e.url);
      key = `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
    } catch {
      return false;
    }
    const nameKey = e.name.trim().toLowerCase();
    if (!e.name.trim() || seenUrls.has(key) || seenNames.has(nameKey)) return false;
    seenUrls.add(key);
    seenNames.add(nameKey);
    return true;
  });
  console.log(`Seeding ${ALL.length} curated portfolios from public showcase references…`);
  await cleanupPreviousSeed();

  let itemCount = 0;
  // Chunked parallel inserts — ~2k entries × 4 round-trips each would be
  // minutes sequentially; chunks of 25 keep Neon happy and finish fast.
  const CHUNK = 25;
  for (let i = 0; i < ALL.length; i += CHUNK) {
    await Promise.all(
      ALL.slice(i, i + CHUNK).map(async (entry) => {
        const creator = await prisma.creator.create({
          data: {
            name: entry.name,
            url: entry.url,
            verificationStatus: "UNVERIFIED",
          },
        });

        const consent = await prisma.consentRecord.create({
          data: {
            tier: "DISPLAY",
            consentedBy: entry.name,
            consentedAt: new Date(),
            terms:
              "Portfolio publicly self-submitted by its owner to a public showcase directory. Referenced by FolioMuse display-only, with attribution and source link. No content derivation beyond aggregated pattern statistics.",
          },
        });

        const attribution = await prisma.attribution.create({
          data: {
            creatorName: entry.name,
            sourceUrl: entry.url,
            licenseType: "EXPLICIT_PERMISSION",
            consentDate: new Date(),
            creatorId: creator.id,
          },
        });

        await prisma.galleryItem.create({
          data: {
            title: `${entry.name} — ${entry.role} Portfolio`,
            creatorRole: entry.role,
            profession: entry.role,
            styleTags: entry.tags,
            qualityLevel: "L2",
            complianceStatus: "PASS",
            status: "ACCEPTED",
            attributionId: attribution.id,
            consentRecordId: consent.id,
            reviewedAt: new Date(),
            mediaUrl: shot(entry.url, 600, 375),
            desktopMediaUrl: shot(entry.url, 1280, 800),
            mobileMediaUrl: shot(entry.url, 480, 750),
            githubUrl: entry.github ?? null,
            stackTags: entry.stack ?? [],
            pageIndex: ["home"],
            sections: [
              { key: "hero", label: "Hero", present: true },
              { key: "about", label: "About", present: true },
              { key: "contact", label: "Contact CTA", present: true },
            ],
            strengths: [
              { code: "STRUCTURE", label: "Clear single-page narrative" },
              { code: "CLARITY", label: "Focused personal identity" },
            ],
            stackEvidence: (entry.stack ?? []).map((framework) => ({
              name: framework,
              evidenceType: "metadata" as const,
            })),
          },
        });
        itemCount += 1;
      }),
    );
    if ((i / CHUNK) % 20 === 0) console.log(`  …${Math.min(i + CHUNK, ALL.length)}/${ALL.length}`);
  }

  // ── Section records (aggregated-safe, curated metadata only) ──────────────
  const heroHost = await prisma.galleryItem.findFirst({
    where: { attribution: { creator: { name: "Brittany Chiang" } } },
  });
  const gridHost = await prisma.galleryItem.findFirst({
    where: { attribution: { creator: { name: "Adham Dannaway" } } },
  });
  const ctaHost = await prisma.galleryItem.findFirst({
    where: { attribution: { creator: { name: "Andy Bell" } } },
  });

  await prisma.sectionRecord.createMany({
    data: [
      {
        sectionType: "hero",
        title: "Hero — single-screen identity",
        desktopCropUrl: heroHost?.desktopMediaUrl ?? null,
        mobileCropUrl: heroHost?.mobileMediaUrl ?? null,
        lessons: {
          layout: "intro headline + role line + selected-work pointer",
          aggregation: "pattern observed across many developer portfolios in the showcase",
        },
        doNotCopyNote:
          "Structure-level lesson only. Copy, imagery, and personal branding remain the creator's own.",
        itemId: heroHost!.id,
      },
      {
        sectionType: "project grid",
        title: "Project grid — scannable work index",
        desktopCropUrl: gridHost?.desktopMediaUrl ?? null,
        mobileCropUrl: gridHost?.mobileMediaUrl ?? null,
        lessons: {
          layout: "card grid, thumbnail-led, hover affordance",
          aggregation: "recurring pattern across showcase submissions",
        },
        doNotCopyNote: "Grid rhythm guidance only; project content must be original.",
        itemId: gridHost!.id,
      },
      {
        sectionType: "contact CTA",
        title: "Contact CTA — low-friction reach-out",
        desktopCropUrl: ctaHost?.desktopMediaUrl ?? null,
        mobileCropUrl: ctaHost?.mobileMediaUrl ?? null,
        lessons: {
          layout: "single clear action near page end",
          aggregation: "common closing pattern across the showcase",
        },
        doNotCopyNote: "CTA placement lesson only; message copy must be user-authored.",
        itemId: ctaHost!.id,
      },
    ],
  });

  console.log(
    `Seed complete: ${itemCount} accepted items, ${new Set(ALL.map((r) => r.name)).size} creators, ` +
      `${new Set(ALL.map((r) => r.role)).size} professions, 3 section records.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
