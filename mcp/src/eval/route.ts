import express, { Express } from "express";
import { evaluate } from "./stagehand.js";
import { promises as dns } from "dns";

const DEFAULT_BROWSER_URL =
  process.env.BROWSER_URL || "http://chrome.sphinx:9222";

export async function evalRoutes(app: Express) {
  app.post("/evaluate", async (req: express.Request, res: express.Response) => {
    const browser_url = await resolve_browser_url(
      req.body.browser_url || DEFAULT_BROWSER_URL
    );
    console.log("browser_url", browser_url);
    const test_url = req.body.test_url || req.body.base_url;
    const instruction = req.body.instruction;
    if (!test_url) {
      res.status(400).json({ error: "Missing test_url" });
      return;
    }
    await evaluate(browser_url, test_url, instruction);
    res.json({ success: true });
  });
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
