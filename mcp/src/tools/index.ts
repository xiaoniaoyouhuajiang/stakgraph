import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StackgraphTool, runStackgraphTool } from "./stackgraph.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

const server = new Server(
  {
    name: StackgraphTool.name,
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

export type Json = Record<string, unknown> | undefined;

export interface Tool {
  name: string;
  description: string;
  inputSchema: Json;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [StackgraphTool],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case StackgraphTool.name: {
      return await runStackgraphTool(args);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

export function mcp_routes(app: express.Express) {
  let transport: SSEServerTransport | null = null;

  app.get("/sse", (req, res) => {
    transport = new SSEServerTransport("/messages", res);
    server.connect(transport);
  });

  app.post("/messages", (req, res) => {
    if (transport) {
      transport.handlePostMessage(req, res);
    }
  });
}
