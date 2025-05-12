import axios from "axios";
import { Message, StakworkChatPayload, StakworkResponse } from "../types";

export class StakworkService {
  private apiKey: string;
  private baseUrl: string = "https://api.stakwork.com/api/v1/projects";
  private workflowId: number;

  constructor(apiKey: string, workflowId: number = 38842) {
    this.apiKey = apiKey;
    this.workflowId = workflowId;
  }

  async sendToStakwork(payload: StakworkChatPayload): Promise<number> {
    try {
      console.log("Sending payload to Stakwork");

      const response = await axios.post<StakworkResponse>(
        this.baseUrl,
        payload,
        {
          headers: {
            Authorization: `Token token=${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status !== 200) {
        throw new Error(`Stakwork API error: ${JSON.stringify(response.data)}`);
      }

      console.log("Stakwork response received");
      return response.data.data.project_id;
    } catch (error) {
      console.error("Error sending request to Stakwork:", error);
      throw new Error(`Error sending request to Stakwork: ${error}`);
    }
  }

  buildStakworkPayload(
    chatId: string,
    messages: Message[],
    webhookUrl: string
  ): StakworkChatPayload {
    return {
      name: "Hive Chat Processor",
      workflow_id: this.workflowId,
      workflow_params: {
        set_var: {
          attributes: {
            vars: {
              chatId,
              messages,
              query: messages[messages.length - 1].content, // Assuming last message is the query
            },
          },
        },
      },
      webhook_url: webhookUrl,
    };
  }
}
