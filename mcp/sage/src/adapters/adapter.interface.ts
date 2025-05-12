import { Message } from "../types";

export interface ChatAdapter {
  initialize(): Promise<void>;
  sendMessage(chatId: string, message: Message): Promise<void>;
  onMessageReceived(
    callback: (chatId: string, message: Message) => Promise<void>
  ): void;
}

export abstract class BaseAdapter implements ChatAdapter {
  // Initialize with a no-op async function
  protected messageCallback: (
    chatId: string,
    message: Message
  ) => Promise<void> = async () => {
    /* default no-op implementation */
  };

  abstract initialize(): Promise<void>;
  abstract sendMessage(chatId: string, message: Message): Promise<void>;

  onMessageReceived(
    callback: (chatId: string, message: Message) => Promise<void>
  ): void {
    this.messageCallback = callback;
  }
}
