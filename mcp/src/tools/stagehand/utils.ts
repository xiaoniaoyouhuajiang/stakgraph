import { Stagehand } from "@browserbasehq/stagehand";
import { getProvider } from "./providers.js";

let STAGEHANDS: { [sessionId: string]: Stagehand } = {};

export interface ConsoleLog {
  timestamp: string;
  type: string;
  text: string;
  location: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
}

let CONSOLE_LOGS: { [sessionId: string]: ConsoleLog[] } = {};
const MAX_LOGS = parseInt(process.env.STAGEHAND_MAX_CONSOLE_LOGS || "1000");

// TODO: remove old unused CONSOLE_LOGS after a while
const MAX_ACTIONS = 100; // LRU limit
const ACTION_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

export async function getOrCreateStagehand(sessionIdMaybe?: string) {
  const sessionId = sessionIdMaybe || "default-session-id";
  if (STAGEHANDS[sessionId]) {
    return STAGEHANDS[sessionId];
  }
  let provider = getProvider();
  console.log("initializing stagehand!", provider.model);
  const sh = new Stagehand({
    env: "LOCAL",
    domSettleTimeoutMs: 30000,
    localBrowserLaunchOptions: {
      headless: true,
      viewport: { width: 1024, height: 768 },
    },
    enableCaching: true,
    modelName: provider.model,
    modelClientOptions: {
      apiKey: process.env[provider.api_key_env_var_name],
    },
  });
  await sh.init();

  // Clear any existing logs when stagehand is recreated (only on new creation)
  clearConsoleLogs(sessionId);

  // Set up console log listener
  sh.page.on("console", (msg) => {
    addConsoleLog(sessionId, {
      timestamp: new Date().toISOString(),
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    });
  });

  STAGEHANDS[sessionId] = sh;
  return sh;
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

export function addConsoleLog(sessionId: string, log: ConsoleLog): void {
  // Add to global logs (backward compatibility)
  if (!CONSOLE_LOGS[sessionId]) {
    CONSOLE_LOGS[sessionId] = [];
  }
  CONSOLE_LOGS[sessionId].push(log);
  if (CONSOLE_LOGS[sessionId].length > MAX_LOGS) {
    CONSOLE_LOGS[sessionId].shift(); // FIFO rotation
  }
}

export function getConsoleLogs(sessionId: string): ConsoleLog[] {
  return [...(CONSOLE_LOGS[sessionId] || [])];
}

export function clearConsoleLogs(sessionId: string): void {
  CONSOLE_LOGS[sessionId] = [];
}
