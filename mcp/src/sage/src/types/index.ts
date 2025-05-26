export interface Message {
  role: string;
  content: string;
}

export interface ChatRequest {
  chat_id?: string;
  messages: Message[];
}

export interface ChatResponse {
  success: boolean;
  message: string;
  chat_id: string;
}

export interface WebhookPayload {
  value: {
    chatId: string;
    messageId: string;
    response: string;
    sourceWebsocketId: string;
    artifacts?: ChatMessageArtifact[];
  };
}

export interface ChatMessageArtifact {
  id: string;
  type: ArtifactType; // Assuming db.ArtifactType maps to this
  content: any; // or unknown, depending on your preference for type safety
}

// You'll need to define ArtifactType based on what db.ArtifactType contains
// For example:
export type ArtifactType = string; // or union of specific values like 'text' | 'image' | 'file'

// export interface WebhookPayload {
//   chat_id: string;
//   message: Message;
//   workflow_id: number;
//   project_id: number;
// }

export interface StakworkChatPayload {
  name: string;
  workflow_id: number;
  workflow_params: {
    set_var: {
      attributes: {
        vars: {
          chatId: string;
          messages: Message[];
          [key: string]: any;
        };
      };
    };
  };
  webhook_url: string;
}

export interface StakworkResponse {
  success: boolean;
  data: {
    project_id: number;
  };
}
