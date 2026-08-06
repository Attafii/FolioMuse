// ─── Product Policy Source-of-Truth Verification Script ──────────────────────
// Deterministic docs verifier. Checks that the repository's product documentation
// is internally consistent and complete:
//   - required product docs + ADRs exist
//   - decision-log numbering is append-only and sequential (D-1..D-5, no gaps)
//   - originality rules R1-R8 are all present
//   - provenance policy covers every mandatory topic
//   - D-5 is cross-referenced from policy and ADR-0003
//   - no charter/rubric conflict markers (TODO/FIXME/CONFLICT/...)
//   - takedown vocabulary is consistent (ARCHIVED, never REJECTED for takedowns)
//   - AGENTS.md commands match package.json scripts
//
// Usage: npx tsx scripts/verify-product-policy.ts [--root <dir>]
//   --root <dir> : repo root to verify (default: process.cwd()). Useful for
//                  negative fixtures that simulate missing headings.
//   Exit 0: all checks pass.
//   Exit 1: any check fails, or required files are missing.
// ────────────────────────────────────────────────────────────────────────────────

import * as fs from "node:fs";
import * as path from "node:path";

// ─── CLI ───────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { root: string } {
  let root = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1]) {
      root = path.resolve(argv[i + 1]);
      i++;
    }
  }
  return { root };
}

const { root } = parseArgs(process.argv.slice(2));

// ─── Helpers ───────────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function pass(description: string): void {
  passCount++;
  console.log(`[PASS] ${description}`);
}

function fail(description: string, detail?: string): void {
  failCount++;
  const detailStr = detail ? ` — ${detail}` : "";
  console.log(`[FAIL] ${description}${detailStr}`);
}

function assert(condition: boolean, description: string, detail?: string): void {
  if (condition) {
    pass(description);
  } else {
    fail(description, detail);
  }
}

function readText(relPath: string): string | null {
  const abs = path.join(root, relPath);
  try {
    return fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(root, relPath));
}

// ─── Required files ────────────────────────────────────────────────────────────

const REQUIRED_DOCS: Array<[string, string]> = [
  ["docs/product/charter.md", "product charter"],
  ["docs/product/personas.md", "personas"],
  ["docs/product/jobs-to-be-done.md", "jobs-to-be-done"],
  ["docs/product/success-metrics.md", "success metrics"],
  ["docs/product/originality-rules.md", "originality rules R1-R8"],
  ["docs/product/content-quality-principles.md", "content-quality principles"],
  ["docs/product/decision-log.md", "decision log (append-only)"],
  ["docs/product/provenance-and-originality-policy.md", "provenance policy"],
  ["docs/product/curation-rubric.md", "curation rubric"],
  ["docs/product/reviewer-runbook.md", "reviewer runbook"],
  ["docs/adr/0001-product-charter-and-anti-cloning-boundary.md", "ADR-0001"],
  ["docs/adr/0002-gallery-schema-design.md", "ADR-0002"],
  ["docs/adr/0003-provenance-and-originality-policy.md", "ADR-0003"],
];

// ─── Checks ────────────────────────────────────────────────────────────────────

function checkRequiredFiles(): void {
  console.log("── Required files ──");
  for (const [rel, label] of REQUIRED_DOCS) {
    assert(fileExists(rel), `${label} exists`, `missing ${rel}`);
  }
}

function checkDecisionLogAppendOnly(): void {
  console.log("── Decision log (append-only, sequential) ──");
  const log = readText("docs/product/decision-log.md");
  if (!log) {
    fail("decision-log.md readable");
    return;
  }
  assert(
    /append-only/i.test(log),
    "decision-log declares itself append-only",
    "expected 'append-only' text",
  );
  // Sequential D-1..D-5, no gaps, no duplicates
  const numbers = [...log.matchAll(/^## D-(\d+) /gm)].map((m) => Number(m[1]));
  assert(numbers.length > 0, "decision entries found", "no '## D-<n>' headings");
  const expected = Array.from({ length: numbers.length }, (_, i) => i + 1);
  const sorted = [...numbers].sort((a, b) => a - b);
  const sequential = sorted.every((n, i) => n === expected[i]);
  const noDuplicates = new Set(numbers).size === numbers.length;
  const contiguous =
    sequential && noDuplicates && numbers.length === Math.max(...numbers);
  assert(
    contiguous,
    `decision numbering sequential D-1..D-${Math.max(...numbers)} with no gaps or duplicates`,
    `found ${numbers.join(", ")}`,
  );
  assert(
    numbers.includes(5),
    "D-5 present (provenance decisions recorded)",
    `found D-${numbers.join(", D-")}`,
  );
}

function checkOriginalityRules(): void {
  console.log("── Originality rules R1-R8 ──");
  const rules = readText("docs/product/originality-rules.md");
  if (!rules) {
    fail("originality-rules.md readable");
    return;
  }
  for (let i = 1; i <= 8; i++) {
    const re = new RegExp(`^## R${i} `, "m");
    assert(re.test(rules), `R${i} heading present`);
  }
}

function checkProvenanceTopics(): void {
  console.log("── Provenance policy topics ──");
  const policy = readText("docs/product/provenance-and-originality-policy.md");
  if (!policy) {
    fail("provenance policy readable");
    return;
  }
  const topics: Array<[string, RegExp]> = [
    ["source discovery", /source discovery/i],
    ["consent", /^## 3\. Consent/m],
    ["capture policy", /^## 4\. Capture policy/m],
    ["licence", /^## 5\. Licence/m],
    ["AI provenance", /^## 6\. AI provenance/m],
    ["creator attribution (R3)", /^## 7\. Creator attribution/m],
    ["owner claim and removal", /^## 8\. Owner claim and removal/m],
    ["derivative deletion/rebuild", /^## 9\. Derivative deletion\/rebuild/m],
    [
      "allowed structural lessons / prohibited copying",
      /^## 10\. Allowed structural lessons/m,
    ],
    ["telemetry and privacy", /^## 12\. Telemetry and privacy/m],
  ];
  for (const [label, re] of topics) {
    assert(re.test(policy), `policy covers ${label}`);
  }
}

function checkD5CrossReferences(): void {
  console.log("── D-5 cross-references ──");
  const policy = readText("docs/product/provenance-and-originality-policy.md") ?? "";
  const adr3 = readText("docs/adr/0003-provenance-and-originality-policy.md") ?? "";
  const rubric = readText("docs/product/curation-rubric.md") ?? "";
  assert(
    /D-5/.test(policy),
    "provenance policy cross-references D-5",
    "expected 'D-5' mention",
  );
  assert(
    /D-5/.test(adr3),
    "ADR-0003 cross-references D-5",
    "expected 'D-5' mention",
  );
  assert(
    /ADR-0003/.test(rubric),
    "curation rubric references ADR-0003",
    "expected 'ADR-0003' mention",
  );
}

function checkConflictMarkers(): void {
  console.log("── Charter/rubric conflict markers ──");
  // Marker tokens only (TODO/FIXME/XXX/HACK). Bare words like "conflict" or
  // "TBD" appear in legitimate prose ("feature conflicts with a non-goal",
  // "reject placeholders like TBD") and must not trip the check.
  const markerRe = /\b(TODO|FIXME|XXX|HACK)\b/;
  const docs: Array<[string, string]> = [
    ["charter", "docs/product/charter.md"],
    ["provenance policy", "docs/product/provenance-and-originality-policy.md"],
    ["curation rubric", "docs/product/curation-rubric.md"],
    ["reviewer runbook", "docs/product/reviewer-runbook.md"],
  ];
  for (const [label, rel] of docs) {
    const text = readText(rel) ?? "";
    const match = text.match(markerRe);
    assert(!match, `${label} has no conflict markers`, match ? `found "${match[0]}"` : undefined);
  }
}

function checkTakedownVocabulary(): void {
  console.log("── Takedown vocabulary (ARCHIVED, never REJECTED) ──");
  const rubric = readText("docs/product/curation-rubric.md") ?? "";
  const runbook = readText("docs/product/reviewer-runbook.md") ?? "";
  // Confirmed takedowns must end in ARCHIVED, never REJECTED.
  assert(
    /takedown that is confirmed after review \*\*must\*\* end in `ARCHIVED`, never `REJECTED`/.test(
      rubric,
    ),
    "rubric: takedown → ARCHIVED, never REJECTED",
  );
  assert(
    /change status to `ARCHIVED`/.test(runbook),
    "runbook: confirmed takedown → ARCHIVED",
  );
  assert(
    !/Confirm the takedown: change status to `REJECTED`/.test(runbook),
    "runbook: no residual takedown→REJECTED instruction",
  );
  assert(
    /SUSPENDED/.test(rubric) && /ARCHIVED/.test(rubric) && /REJECTED/.test(rubric),
    "rubric: all three statuses (SUSPENDED/ARCHIVED/REJECTED) defined",
  );
}

function checkAgentsScriptsConsistency(): void {
  console.log("── AGENTS.md commands vs package.json scripts ──");
  const agents = readText("AGENTS.md");
  const pkgText = readText("package.json");
  if (!agents || !pkgText) {
    fail("AGENTS.md and package.json readable", "one or both missing");
    return;
  }
  let pkg: { scripts?: Record<string, string> };
  try {
    pkg = JSON.parse(pkgText);
  } catch {
    fail("package.json parses as JSON");
    return;
  }
  const scripts = pkg.scripts ?? {};
  // Extract every `npm run <name>` and `npm <name>` from AGENTS.md, ignoring
  // trailing `# comment` text on the same line.
  const referenced = new Set<string>();
  for (const m of agents.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)) {
    referenced.add(m[1]);
  }
  for (const m of agents.matchAll(/npm (test(?::[a-zA-Z0-9:_-]+)?|run [a-zA-Z0-9:_-]+)/g)) {
    const raw = m[1];
    if (raw.startsWith("run ")) {
      referenced.add(raw.slice(4));
    } else {
      referenced.add(raw);
    }
  }
  if (referenced.size === 0) {
    fail("no npm commands found in AGENTS.md");
    return;
  }
  for (const name of [...referenced].sort()) {
    assert(
      Object.prototype.hasOwnProperty.call(scripts, name),
      `AGENTS.md references npm script '${name}'`,
      `package.json has: ${Object.keys(scripts).join(", ")}`,
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`Verifying product policy source of truth at: ${root}\n`);

checkRequiredFiles();
checkDecisionLogAppendOnly();
checkOriginalityRules();
checkProvenanceTopics();
checkD5CrossReferences();
checkConflictMarkers();
checkTakedownVocabulary();
checkAgentsScriptsConsistency();

const total = passCount + failCount;
console.log(`\n───────────────────────────────────────`);
console.log(`  Passed: ${passCount}  /  Failed: ${failCount}  /  Total: ${total}`);
console.log(`───────────────────────────────────────`);

process.exit(failCount > 0 ? 1 : 0);
