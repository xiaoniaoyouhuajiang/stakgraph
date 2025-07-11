import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  InitializeRequestSchema,
  JSONRPCError,
} from "@modelcontextprotocol/sdk/types.js";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { setCurrentPlaywrightSessionId } from "./stagehand/utils.js";

export class MCPServer {
  server: Server;

  // to support multiple simultaneous connections
  transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  constructor(server: Server) {
    this.server = server;
  }

  get_server(): Server {
    return this.server;
  }

  async handleGetRequest(req: Request, res: Response) {
    // if server does not offer an SSE stream at this endpoint.
    // res.status(405).set('Allow', 'POST').send('Method Not Allowed')

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const playwrightSessionId = req.headers["x-session-id"] as
      | string
      | undefined;
    setCurrentPlaywrightSessionId(playwrightSessionId);

    if (!sessionId || !this.transports[sessionId]) {
      res
        .status(400)
        .json(
          this.createErrorResponse("Bad Request: invalid session ID or method.")
        );
      return;
    }

    const transport = this.transports[sessionId];
    await transport.handleRequest(req, res);

    return;
  }

  async handlePostRequest(req: Request, res: Response) {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const playwrightSessionId = req.headers["x-session-id"] as
      | string
      | undefined;
    let transport: StreamableHTTPServerTransport;

    setCurrentPlaywrightSessionId(playwrightSessionId);

    try {
      // reuse existing transport
      if (sessionId && this.transports[sessionId]) {
        transport = this.transports[sessionId];
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // create new transport
      if (!sessionId && this.isInitializeRequest(req.body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        await this.server.connect(transport);
        await transport.handleRequest(req, res, req.body);

        // session ID will only be available (if in not Stateless-Mode)
        // after handling the first request
        const sessionId = transport.sessionId;
        if (sessionId) {
          this.transports[sessionId] = transport;
        }

        return;
      }

      res
        .status(400)
        .json(
          this.createErrorResponse("Bad Request: invalid session ID or method.")
        );
      return;
    } catch (error) {
      console.error("Error handling MCP request:", error);
      res.status(500).json(this.createErrorResponse("Internal server error."));
      return;
    }
  }

  private createErrorResponse(message: string): JSONRPCError {
    return {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: message,
      },
      id: randomUUID(),
    };
  }

  private isInitializeRequest(body: any): boolean {
    const isInitial = (data: any) => {
      const result = InitializeRequestSchema.safeParse(data);
      return result.success;
    };
    if (Array.isArray(body)) {
      return body.some((request) => isInitial(request));
    }
    return isInitial(body);
  }
}
