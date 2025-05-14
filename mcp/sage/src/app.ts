import express from "express";
import bodyParser from "body-parser";
import { StakworkService } from "./services/stakwork";
import { GitHubIssueAdapter } from "./adapters/github";
import { ChatAdapter, Adapter, EmptyAdapters } from "./adapters/adapter";
import { MessagesController } from "./controllers/messages";
import { WebhookController } from "./controllers/webhook";
import { Message } from "./types";
import { loadConfig, Config } from "./utils/config";

export class App {
  public app: express.Application;
  private stakworkService!: StakworkService;
  private adapters: Record<Adapter, ChatAdapter>;
  private messagesController!: MessagesController;
  private webhookController!: WebhookController;
  private config: Config;

  constructor(configPath: string = "config.json") {
    this.app = express();
    this.config = loadConfig(configPath);
    this.configureMiddleware();
    this.initializeServices();
    this.setupControllers();
    this.adapters = this.initializeAdapters();
    this.setupRoutes();
  }

  private configureMiddleware(): void {
    this.app.use(bodyParser.json());
  }

  private initializeServices(): void {
    // Initialize Stakwork service
    const STAKWORK_API_KEY = process.env.STAKWORK_API_KEY || "";
    const WORKFLOW_ID = parseInt(process.env.WORKFLOW_ID || "38842", 10);
    this.stakworkService = new StakworkService(
      STAKWORK_API_KEY,
      WORKFLOW_ID,
      this.config.codeSpaceURL,
      this.config["2b_base_url"],
      this.config.secret
    );
  }

  private initializeAdapters(): Record<Adapter, ChatAdapter> {
    const adapters = EmptyAdapters();
    // Initialize Stakwork service
    const STAKWORK_API_KEY = process.env.STAKWORK_API_KEY || "";
    const WORKFLOW_ID = parseInt(process.env.WORKFLOW_ID || "38842", 10);
    this.stakworkService = new StakworkService(
      STAKWORK_API_KEY,
      WORKFLOW_ID,
      this.config.codeSpaceURL,
      this.config["2b_base_url"],
      this.config.secret
    );

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
    const { owner, repo } = this.config.github;

    if (GITHUB_TOKEN && owner && repo) {
      const DATA_DIR = process.env.DATA_DIR || "./data";
      const githubAdapter = new GitHubIssueAdapter(
        GITHUB_TOKEN,
        owner,
        repo,
        DATA_DIR
      );
      adapters["github"] = githubAdapter;

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

    return adapters;
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
