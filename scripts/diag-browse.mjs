// Headless diagnostic for /browse: console errors + post-hydration DOM truth.
import puppeteer from "puppeteer-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const URL = process.env.DIAG_URL ?? "http://localhost:3000/browse";

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[PAGEERROR] ${e.message}`));

await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500)); // let client fetch resolve

const truth = await page.evaluate(() => {
  const q = (sel) => document.querySelector(sel);
  const count = (sel) => document.querySelectorAll(sel).length;
  return {
    explorer: !!q('[data-testid="browse-explorer"]'),
    skeleton: !!q('[data-testid="browse-skeleton"]'),
    skeletonVisible: (() => {
      const el = q('[data-testid="browse-skeleton"]');
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })(),
    count: q('[data-testid="browse-count"]')?.textContent ?? null,
    cards: count("[data-testid='gallery-card']"),
    pagination: !!q("[data-testid='browse-pagination']"),
    empty: !!q("[data-testid='browse-empty']"),
    noResults: !!q("[data-testid='browse-no-results']"),
    errorBox: count("button") > 0 && document.body.innerText.includes("Try again"),
    bodySnippet: document.body.innerText.slice(0, 400),
    roleChips: count("[data-testid='role-facet']"),
  };
});

console.log("=== TRUTH ===");
console.log(JSON.stringify(truth, null, 2));
console.log("=== CONSOLE ===");
for (const l of logs.slice(0, 25)) console.log(l);
await page.screenshot({ path: ".sisyphus/evidence/browse-diag.png", fullPage: false });
await browser.close();
