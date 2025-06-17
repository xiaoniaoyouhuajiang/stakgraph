import express, { Express } from "express";
import { evaluate } from "./stagehand.js";

const DEFAULT_BROWSER_URL =
  process.env.BROWSER_URL || "http://chrome.sphinx:9222";

export async function evalRoutes(app: Express) {
  app.post("/evaluate", async (req: express.Request, res: express.Response) => {
    const browser_url = req.body.browser_url || DEFAULT_BROWSER_URL;
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
