import express, { Express } from "express";
import { evaluate } from "./stagehand.js";

export async function evalRoutes(app: Express) {
  app.post("/evaluate", async (req: express.Request, res: express.Response) => {
    const browser_url = req.body.browser_url;
    const test_url = req.body.test_url;
    const prompt = req.body.prompt;
    if (!test_url) {
      res.status(400).json({ error: "Missing test_url" });
      return;
    }
    await evaluate(browser_url, test_url, prompt);
    res.json({ success: true });
  });
}
