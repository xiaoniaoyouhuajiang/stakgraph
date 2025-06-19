import { Stagehand } from "@browserbasehq/stagehand";
import { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { sanitize } from "./utils.js";

function createStagehand(browser_url?: string) {
  return new Stagehand({
    env: "LOCAL",
    domSettleTimeoutMs: 30000,
    localBrowserLaunchOptions: {
      // docker default
      cdpUrl: browser_url || "http://chrome.sphinx:9222",
    },
    enableCaching: true,
    modelName: "gpt-4o",
    modelClientOptions: {
      apiKey: process.env.OPENAI_API_KEY,
    },
  });
}

export const TOOLS: Tool[] = [
  {
    name: "stagehand_navigate",
    description:
      "Navigate to a URL in the browser. Only use this tool with URLs you're confident will work and stay up to date. Otherwise use https://google.com as the starting point",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to navigate to" },
      },
      required: ["url"],
    },
  },
  {
    name: "stagehand_act",
    description:
      "Performs an action on a web page element. Act actions should be as atomic and specific as possible, i.e. 'Click the sign in button' or 'Type hello into the search input'. AVOID actions that are more than one step.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description:
            "The action to perform. Should be atomic and specific, i.e. 'Click the sign in button'. If unsure, use observe before using act.",
        },
        variables: {
          type: "object",
          additionalProperties: true,
          description:
            "Variables for sensitive data or dynamic content. ONLY use if needed, e.g. passwords.",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "stagehand_extract",
    description: "Extracts all text from the current page.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "stagehand_observe",
    description:
      "Observes elements on the web page. Use this to find actionable elements rather than extracting text. More often use extract instead when scraping structured text.",
    inputSchema: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description:
            "Specific observation instruction (e.g., 'find the login button')",
        },
      },
      required: ["instruction"],
    },
  },
  {
    name: "screenshot",
    description:
      "Takes a screenshot of the current page. Use when other tools are insufficient.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "stagehand_agent",
    description:
      "Execute complex multi-step actions using AI agent. Use for larger workflows that require multiple steps.",
    inputSchema: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description: "The high-level instruction for the agent to execute",
        },
      },
      required: ["instruction"],
    },
  },
];

export async function stagehandToolCall(
  name: string,
  args: Record<string, any>
): Promise<CallToolResult> {
  const stagehand = createStagehand(process.env.BROWSER_URL);
  const toolName = name; // Fix for TS error
  const error = (msg: string): CallToolResult => ({
    content: [{ type: "text" as const, text: msg }],
    isError: true,
  });

  const success = (text: string, extra?: any): CallToolResult => ({
    content: [{ type: "text" as const, text }, ...(extra ? [extra] : [])],
    isError: false,
  });

  try {
    switch (toolName) {
      case "stagehand_navigate":
        await stagehand.page.goto(args.url);
        return success(`Navigated to: ${args.url}`, {
          type: "text" as const,
          text: `View session: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`,
        });

      case "stagehand_act":
        await stagehand.page.act({
          action: args.action,
          variables: args.variables,
        });
        return success(`Action performed: ${args.action}`);

      case "stagehand_extract":
        const bodyText = await stagehand.page.evaluate(
          () => document.body.innerText
        );
        const content = sanitize(bodyText);
        return success(`Extracted content:\n${content.join("\n")}`);

      case "stagehand_observe":
        const observations = await stagehand.page.observe({
          instruction: args.instruction,
          returnAction: false,
        });
        return success(`Observations: ${JSON.stringify(observations)}`);

      case "screenshot":
        const buffer = await stagehand.page.screenshot({ fullPage: false });
        const base64 = buffer.toString("base64");
        const name = `screenshot-${new Date()
          .toISOString()
          .replace(/:/g, "-")}`;
        return success(`Screenshot taken: ${name}`, {
          type: "image" as const,
          data: base64,
          mimeType: "image/png",
        });

      case "agent":
        const agent = stagehand.agent({
          provider: "openai",
          model: "computer-use-preview",
        });
        await agent.execute(args.instruction);
        return success(`Agent executed: ${args.instruction}`);

      default:
        return error(`Unknown tool: ${toolName}`);
    }
  } catch (e) {
    return error(`Failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
