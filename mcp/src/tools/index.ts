import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import * as sg from "./fulltext.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

const server = new Server(
  {
    name: "Stakgraph",
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
    tools: [sg.FulltextSearchTool],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case sg.FulltextSearchTool.name: {
      const fa = sg.FulltextSearchSchema.parse(args);
      return await sg.fulltextSearch(fa);
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
