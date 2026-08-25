// FolioMuse MCP server (pillar 3) — stdio transport.
//
// Dependency justification (AGENTS.md §11): `@modelcontextprotocol/sdk` is
// added to implement the charter's third pillar — a safe-projection agent
// surface. It is the official reference SDK; without it we would hand-roll
// JSON-RPC framing, capability negotiation, and schema validation.
//
// Run:  npm run mcp   (tsx src/mcp/server.ts)
// Connect (e.g. Claude Desktop / Cursor mcp config):
//   { "command": "npx", "args": ["tsx", "<repo>/src/mcp/server.ts"] }
//
// Safety: tools are read-only and attribution-safe by construction — see
// src/mcp/tools.ts header for the full contract.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { TOOLS } from "./tools";
import { closeDb } from "./data";
import type { ToolDef } from "./tools";

export const SERVER_INFO = { name: "foliomuse-mcp", version: "0.1.0" } as const;

export function createServer(): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions:
      "FolioMuse gives agents read-only access to 140+ real, attributed portfolio references. " +
      "Search with search_portfolios, inspect with get_portfolio_reference, aggregate with " +
      "list_section_patterns (respect r2FloorMet), and personalize with recommend_portfolios_for_resume. " +
      "Reference & derive only — never reproduce a creator's copy, code, or assets verbatim.",
  });

  for (const tool of TOOLS as ToolDef[]) {
    // registerTool validates args against the Zod (Standard Schema) inputSchema.
    server.registerTool(tool.name, { description: tool.description, inputSchema: tool.inputSchema }, tool.handler);
  }
  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stdio servers stay alive until the client closes the pipe.
  process.on("SIGINT", async () => {
    await closeDb();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await closeDb();
    process.exit(0);
  });
}

// Entry point guard: tests import createServer() without going live.
if (process.argv[1] && /server\.(ts|js)$/.test(process.argv[1].replace(/\\/g, "/"))) {
  main().catch(async (err) => {
    console.error("[foliomuse-mcp] fatal:", err);
    await closeDb();
    process.exit(1);
  });
}
