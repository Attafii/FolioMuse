// MCP Server for FolioMuse — exposes tools for AI clients.
// ponytail: minimal implementation, extend as needed.

import { NextResponse } from "next/server";

/**
 * MCP Protocol handler — supports tools/list and tools/call.
 * 
 * Tools exposed:
 * - search_portfolios: Search the gallery by query, role, style
 * - get_portfolio: Get details for a specific portfolio
 * - get_section_advice: Get AI advice for a portfolio section
 */

interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const TOOLS: McpTool[] = [
  {
    name: "search_portfolios",
    description: "Search the FolioMuse portfolio gallery. Returns matching portfolios with titles, roles, and links.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (role, style, title)" },
        role: { type: "string", description: "Filter by role (Designer, Frontend, Full Stack, etc.)" },
        limit: { type: "number", description: "Max results (default 5)" },
      },
    },
  },
  {
    name: "get_portfolio",
    description: "Get details for a specific portfolio by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Portfolio ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "get_section_advice",
    description: "Get AI-powered advice for improving a portfolio section.",
    inputSchema: {
      type: "object",
      properties: {
        sectionType: { type: "string", description: "Section type (hero, about, projects, contact, etc.)" },
        content: { type: "string", description: "Current section content to improve" },
      },
      required: ["sectionType"],
    },
  },
];

async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "search_portfolios": {
      const query = (args.query as string) || "";
      const role = (args.role as string) || "";
      const limit = (args.limit as number) || 5;

      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (role) params.set("role", role);
      params.set("pageSize", String(limit));

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/gallery/summaries?${params}`);
      const data = await res.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data.items?.map((item: { id: string; title: string; creatorRole: string; attribution: { sourceUrl: string } }) => ({
              id: item.id,
              title: item.title,
              role: item.creatorRole,
              url: item.attribution.sourceUrl,
            })) || [], null, 2),
          },
        ],
      };
    }

    case "get_portfolio": {
      const id = args.id as string;
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/gallery/items/${id}`);
      const data = await res.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    case "get_section_advice": {
      const sectionType = args.sectionType as string;
      const content = (args.content as string) || "";

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Give me advice for improving a portfolio ${sectionType} section.${content ? `\n\nCurrent content:\n${content}` : ""}\n\nProvide 3-5 specific, actionable tips.`,
            },
          ],
        }),
      });

      const data = await res.json();

      return {
        content: [
          {
            type: "text",
            text: data.content || "No advice available.",
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { method, params } = body;

    // MCP Protocol methods
    switch (method) {
      case "initialize":
        return NextResponse.json({
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: "foliomuse",
            version: "1.0.0",
          },
        });

      case "tools/list":
        return NextResponse.json({ tools: TOOLS });

      case "tools/call": {
        const { name, arguments: args } = params;
        const result = await handleToolCall(name, args || {});
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: { code: -32601, message: `Method not found: ${method}` } },
          { status: 400 }
        );
    }
  } catch {
    return NextResponse.json(
      { error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }
}

export async function GET(): Promise<Response> {
  return NextResponse.json({
    name: "foliomuse",
    version: "1.0.0",
    description: "FolioMuse MCP Server — portfolio inspiration for AI tools",
    tools: TOOLS.map((t) => t.name),
  });
}
