import express, { Express } from "express";

export async function evalRoutes(app: Express) {
  app.post("/evaluate", async (req: express.Request, res: express.Response) => {
    res.json({ success: true });
  });
}
