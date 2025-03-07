import { z } from "zod";
import { Tool, Json } from "./index.js";
import { parseSchema } from "./utils.js";

const schema = z.object({
  query: z
    .string()
    .min(1, "Query is required.")
    .describe("The search query to match against node names and content."),
});

export const StackgraphTool: Tool = {
  name: "stackgraph",
  description:
    "Provides source code snippets matching a given query, to use for LLM context.",
  inputSchema: parseSchema(schema),
};

export async function runStackgraphTool(ja: Json) {
  const args = schema.parse(ja);
  console.log("=> Running stackgraph tool with args:", args);
  return {
    content: [
      {
        type: "text",
        text: singular,
      },
    ],
  };
}

const singular = `
// Helper function to convert plural to singular
fn to_singular(plural: &str) -> String {
    // This is a very basic implementation
    // In a real app, you'd want to use a proper inflector library
    if plural.ends_with("ies") {
        return format!("{}y", &plural[..plural.len() - 3]);
    }
    if plural.ends_with('s') {
        return plural[..plural.len() - 1].to_string();
    }
    plural.to_string()
}
`;
