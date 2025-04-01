import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import * as fulltext_search from "./fulltext_search.js";
import * as get_nodes from "./get_nodes.js";
import * as get_map from "./get_map.js";
import * as get_code from "./get_code.js";
import * as shortest_path from "./shortest_path.js";
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

function getTools(): Tool[] {
  return [
    fulltext_search.FulltextSearchTool,
    get_nodes.GetNodesTool,
    get_map.GetMapTool,
    get_code.GetCodeTool,
    shortest_path.ShortestPathTool,
  ];
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: getTools() };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case fulltext_search.FulltextSearchTool.name: {
      const fa = fulltext_search.FulltextSearchSchema.parse(args);
      return await fulltext_search.fulltextSearch(fa);
    }
    case get_nodes.GetNodesTool.name: {
      const fa = get_nodes.GetNodesSchema.parse(args);
      return await get_nodes.getNodes(fa);
    }
    case get_map.GetMapTool.name: {
      const fa = get_map.GetMapSchema.parse(args);
      return await get_map.getMap(fa);
    }
    case get_code.GetCodeTool.name: {
      const fa = get_code.GetCodeSchema.parse(args);
      return await get_code.getCode(fa);
    }
    case shortest_path.ShortestPathTool.name: {
      const fa = shortest_path.ShortestPathSchema.parse(args);
      return await shortest_path.shortestPath(fa);
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

  app.get("/tools", (_, res) => {
    res.send(getTools());
  });
}
