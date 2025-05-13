import express from "express";
import bodyParser from "body-parser";
import { StakworkService } from "./services/stakwork.service";
import { GitHubIssueAdapter } from "./adapters/github.adapter";
import { ChatAdapter } from "./adapters/adapter.interface";
import { MessagesController } from "./controllers/messages.controller";
import { WebhookController, Adapter } from "./controllers/webhook.controller";
import { Message } from "./types";

export class App {
  public app: express.Application;
  private stakworkService!: StakworkService;
  private adapters: Record<Adapter, ChatAdapter>;
  private messagesController!: MessagesController;
  private webhookController!: WebhookController;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.adapters = this.initializeAdapters();
    this.setupControllers();
    this.setupRoutes();
  }

  private configureMiddleware(): void {
    this.app.use(bodyParser.json());
  }

  private initializeAdapters(): Record<Adapter, ChatAdapter> {
    // Initialize Stakwork service
    const STAKWORK_API_KEY = process.env.STAKWORK_API_KEY || "";
    const WORKFLOW_ID = parseInt(process.env.WORKFLOW_ID || "38842", 10);
    this.stakworkService = new StakworkService(STAKWORK_API_KEY, WORKFLOW_ID);

    // Initialize GitHub adapter
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
    const GITHUB_OWNER = process.env.GITHUB_OWNER || "";
    const GITHUB_REPO = process.env.GITHUB_REPO || "";

    if (GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO) {
      const DATA_DIR = process.env.DATA_DIR || "./data";
      const githubAdapter = new GitHubIssueAdapter(
        GITHUB_TOKEN,
        GITHUB_OWNER,
        GITHUB_REPO,
        DATA_DIR
      );
      this.adapters["github"] = githubAdapter;

      // Initialize adapter and set up callback
      githubAdapter.initialize().catch((error: any) => {
        console.error("Error initializing GitHub adapter:", error);
      });

      githubAdapter.onMessageReceived(
        async (chatId: string, message: Message) => {
          try {
            await this.messagesController.processMessages(chatId, [message]);
          } catch (error) {
            console.error(
              "Error processing message from GitHub adapter:",
              error
            );
          }
        }
      );
    } else {
      console.warn(
        "GitHub adapter not initialized due to missing configuration"
      );
    }
    return this.adapters;
  }

  private setupControllers(): void {
    const WEBHOOK_BASE_URL =
      process.env.WEBHOOK_BASE_URL || "http://localhost:3000/webhook";
    this.messagesController = new MessagesController(
      this.stakworkService,
      WEBHOOK_BASE_URL
    );
    this.webhookController = new WebhookController(this.adapters);
  }

  private setupRoutes(): void {
    this.app.post("/messages", (req, res) =>
      this.messagesController.handleMessage(req, res)
    );
    this.app.post("/webhook", (req, res) =>
      this.webhookController.handleWebhook(req, res)
    );
  }
}
