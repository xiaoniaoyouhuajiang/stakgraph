import { Stagehand } from "@browserbasehq/stagehand";
import { promises as dns } from "dns";

let STAGEHAND: Stagehand | null = null;

export async function getOrCreateStagehand(browser_url?: string) {
  if (STAGEHAND) {
    return STAGEHAND;
  }
  const url =
    browser_url || process.env.BROWSER_URL || "http://chrome.sphinx:9222";
  let modelName = "gpt-4o";
  let modelClientOptions = {
    apiKey: process.env.OPENAI_API_KEY,
  };
  if (process.env.LLM_PROVIDER === "anthropic") {
    modelName = "claude-3-7-sonnet-20250219";
    modelClientOptions = {
      apiKey: process.env.ANTHROPIC_API_KEY,
    };
  }
  const cdpUrl = await resolve_browser_url(url);
  const sh = new Stagehand({
    env: "LOCAL",
    domSettleTimeoutMs: 30000,
    localBrowserLaunchOptions: {
      cdpUrl,
    },
    enableCaching: true,
    modelName,
    modelClientOptions,
  });
  await sh.init();
  STAGEHAND = sh;
  return sh;
}

export async function resolve_browser_url(
  browser_url: string
): Promise<string> {
  let resolvedUrl = browser_url;
  // If using hostname, resolve to IP
  if (browser_url.includes("chrome.sphinx")) {
    try {
      const { address } = await dns.lookup("chrome.sphinx");
      resolvedUrl = browser_url.replace("chrome.sphinx", address);
      console.log(`Resolved ${browser_url} to ${resolvedUrl}`);
    } catch (error) {
      console.error("DNS resolution failed:", error);
    }
  }
  return resolvedUrl;
}

export function sanitize(bodyText: string) {
  const content = bodyText
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !(
          (line.includes("{") && line.includes("}")) ||
          line.includes("@keyframes") ||
          line.match(/^\.[a-zA-Z0-9_-]+\s*{/) ||
          line.match(/^[a-zA-Z-]+:[a-zA-Z0-9%\s\(\)\.,-]+;$/)
        )
    )
    .map((line) =>
      line.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
    );
  return content;
}
