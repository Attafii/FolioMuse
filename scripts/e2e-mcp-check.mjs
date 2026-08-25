// E2E check: spawn the FolioMuse MCP server and drive it like a real client.
// Proves: initialize handshake → tools/list → live tools/call against Neon.
import { spawn } from "node:child_process";

const CHILD = ["npx", ["tsx", "src/mcp/server.ts"]];

const proc = spawn(CHILD[0], CHILD[1], {
  cwd: process.cwd(),
  stdio: ["pipe", "pipe", "pipe"],
  env: process.env,
  shell: process.platform === "win32",
});

let buf = "";
const pending = new Map();
let nextId = 1;

proc.stdout.on("data", (d) => {
  buf += d.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    } catch {
      /* non-JSON line — ignore */
    }
  }
});

proc.stderr.on("data", (d) => process.stderr.write(`[srv] ${d}`));

function request(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, resolve);
    proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`timeout waiting for ${method}`));
      }
    }, 60000);
  });
}

function notify(method, params) {
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

const fail = (msg) => {
  console.error("E2E_FAIL:", msg);
  proc.kill();
  process.exit(1);
};

try {
  // 1. initialize
  const init = await request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "foliomuse-e2e", version: "0.0.1" },
  });
  if (!init.result?.serverInfo?.name) fail(`initialize: ${JSON.stringify(init).slice(0, 200)}`);
  console.log("INITIALIZE_OK server=", init.result.serverInfo.name, init.result.serverInfo.version);

  notify("notifications/initialized", {});

  // 2. tools/list
  const list = await request("tools/list", {});
  const names = (list.result?.tools ?? []).map((t) => t.name).sort();
  console.log("TOOLS_LIST_OK:", names.join(", "));
  const expected = ["get_portfolio_reference", "list_section_patterns", "recommend_portfolios_for_resume", "search_portfolios"];
  if (JSON.stringify(names) !== JSON.stringify(expected)) fail(`tools mismatch: ${names}`);
  for (const bad of ["clone", "contentBlob", "structureJSON"]) {
    if (JSON.stringify(list.result.tools).toLowerCase().includes(bad.toLowerCase())) fail(`forbidden token in surface: ${bad}`);
  }

  // 3. tools/call search_portfolios
  const search = await request("tools/call", {
    name: "search_portfolios",
    arguments: { q: "frontend", limit: 3 },
  });
  const sPayload = JSON.parse(search.result.content[0].text);
  console.log("SEARCH_OK total=", sPayload.totalInGallery, "matches=", sPayload.matches, "first=", sPayload.results[0]?.title);

  // 4. tools/call get_portfolio_reference on first hit
  const refId = sPayload.results[0]?.id;
  const ref = await request("tools/call", { name: "get_portfolio_reference", arguments: { id: refId } });
  const rPayload = JSON.parse(ref.result.content[0].text);
  if (!rPayload.title || !rPayload.doNotCopy) fail("reference payload missing title/doNotCopy");
  for (const forbidden of ["contentBlob", "structureJSON"]) {
    if (JSON.stringify(rPayload).includes(forbidden)) fail(`leak: ${forbidden}`);
  }
  console.log("REFERENCE_OK title=", rPayload.title, "| sections:", (rPayload.sectionsPresence ?? []).length);

  // 5. tools/call list_section_patterns
  const pats = await request("tools/call", { name: "list_section_patterns", arguments: {} });
  const pPayload = JSON.parse(pats.result.content[0].text);
  console.log("PATTERNS_OK count=", pPayload.patterns.length, "met=", pPayload.patterns.filter((p) => p.r2FloorMet).length);

  // 6. tools/call recommend_portfolios_for_resume
  const rec = await request("tools/call", {
    name: "recommend_portfolios_for_resume",
    arguments: {
      resumeText:
        "Frontend developer skilled in React, TypeScript and Tailwind CSS. Built dark-mode marketing sites and design systems. Interested in animations and minimal portfolios.",
      limit: 3,
    },
  });
  const recPayload = JSON.parse(rec.result.content[0].text);
  console.log("RECOMMEND_OK top=", recPayload.recommendations[0]?.title, "score=", recPayload.recommendations[0]?.score, "reasons=", (recPayload.recommendations[0]?.reasons ?? []).slice(0, 3).join("|"));

  console.log("E2E_PASS");
  proc.kill();
  process.exit(0);
} catch (e) {
  fail(e.message);
}
