import { Adapter } from "../adapters/adapter";

export function getAdapterFromChatId(chatId: string): Adapter {
  if (chatId.startsWith("github-")) {
    return "github";
  }
  return "none";
}
