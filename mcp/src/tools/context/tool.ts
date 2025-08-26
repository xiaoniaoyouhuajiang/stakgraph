import { generateText, tool, hasToolCall } from "ai";
import { getModel } from "../../aieo/src/provider.js";
import { EXPLORER } from "./prompts.js";
import { z } from "zod";
import * as G from "../../graph/graph.js";

export async function get_context() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = await getModel("anthropic", apiKey as string);
  console.log("call claude:");
  const tools = {
    repo_map: tool({
      description:
        "Get a high-level view of the codebase architecture and structure. Use this to understand the project layout and identify where specific functionality might be located. Call this when you need to: 1) Orient yourself in an unfamiliar codebase, 2) Locate which directories/files might contain relevant code for a user's question, 3) Understand the overall project structure before diving deeper. Don't call this if you already know which specific files you need to examine.",
      inputSchema: z.object({}),
      execute: async () => {
        const map = await G.get_repo_map("", "", "Repository", false);
        return { map };
      },
    }),
    file_summary: {
      description:
        "Get a summary of what a specific file contains and its role in the codebase. Use this when you have identified a potentially relevant file and need to understand: 1) What functions/components it exports, 2) What its main responsibility is, 3) Whether it's worth exploring further for the user's question. Call this with a hypothesis like 'This file probably handles user authentication' or 'This looks like the main dashboard component'. Don't call this to browse random files.",
      inputSchema: z.object({
        file_path: z.string().describe("Path to the file to summarize"),
        hypothesis: z
          .string()
          .describe(
            "What you think this file might contain or handle, based on its name/location"
          ),
      }),
      execute: async () => {
        return "file contents:";
      },
    },
    function_interface: {
      desciption:
        "Examine the interface and immediate dependencies of a specific function/component. Use this when you've identified a key function and need to understand: 1) Its parameters and return type, 2) What it directly calls, 3) How it fits into the larger system. Call this when you have a specific question like 'How does this authentication function work?' or 'What data does this component need?'. Don't call this for functions that seem peripheral to the user's question.",
      inputSchema: z.object({
        function_name: z
          .string()
          .describe("Name of the function/component to examine"),
        file_path: z.string().describe("File containing the function"),
        question: z
          .string()
          .describe(
            "Specific question you're trying to answer about this function"
          ),
      }),
      execute: async () => {
        return "function interface:";
      },
    },
    finalAnswer: {
      // Define a tool that signals the end of the process
      description: "Provide the final answer to the user",
      inputSchema: z.object({ answer: z.string() }),
      execute: async ({ answer }: { answer: string }) => answer,
    },
  };
  const { steps, text } = await generateText({
    model,
    tools,
    prompt: "How does authentication work in this repo?",
    system: EXPLORER,
    stopWhen: hasToolCall("finalAnswer"),
  });
  for (const step of steps) {
    console.log("steps", JSON.stringify(step.content, null, 2));
  }
  console.log("final text", JSON.stringify(text, null, 2));
}
