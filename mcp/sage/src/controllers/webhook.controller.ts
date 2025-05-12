import { Request, Response } from "express";
import { ChatAdapter } from "../adapters/adapter.interface";
import { WebhookPayload } from "../types";

export class WebhookController {
  private adapters: Record<string, ChatAdapter>;

  constructor(adapters: Record<string, ChatAdapter>) {
    this.adapters = adapters;
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const chatId = req.query.chat_id as string;
      const payload = req.body as WebhookPayload;

      if (!chatId) {
        res.status(400).json({
          success: false,
          message: "Missing chat_id parameter",
        });
        return;
      }

      // Determine which adapter to use based on chatId prefix
      let adapterKey = "default";
      if (chatId.startsWith("github-")) {
        adapterKey = "github";
      }
      // Add more adapter key determinations as needed

      const adapter = this.adapters[adapterKey];
      if (!adapter) {
        res.status(500).json({
          success: false,
          message: `No adapter found for chat ${chatId}`,
        });
        return;
      }

      // Send message to the appropriate platform
      await adapter.sendMessage(chatId, payload.message);

      res.status(200).json({
        success: true,
        message: "Webhook processed successfully",
        chat_id: chatId,
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({
        success: false,
        message: `Error processing webhook: ${error}`,
      });
    }
  }
}
