import { z } from "zod";
import { Tool } from "./index.js";
import { parseSchema } from "./utils.js";
import { relevant_node_types, NodeType } from "../graph/types.js";
import * as G from "../graph/graph.js";

export const FulltextSearchSchema = z.object({
  query: z
    .string()
    .min(1, "Query is required.")
    .describe("Search query to match against snippet names and content."),
  concise: z
    .boolean()
    .optional()
    .describe(
      "Whether to return a concise response (only the name and filename)."
    ),
  node_types: z
    .array(z.enum(relevant_node_types() as [string, ...string[]]))
    .optional()
    .describe("Filter by only these node types."),
  limit: z.number().optional().describe("Limit the number of results."),
});

export const FulltextSearchTool: Tool = {
  name: "fulltext_search",
  description: "Search for exact matches.",
  inputSchema: parseSchema(FulltextSearchSchema),
};

export async function fulltextSearch(
  args: z.infer<typeof FulltextSearchSchema>
) {
  console.log("=> Running fulltext search tool with args:", args);
  const result = await G.search(
    args.query,
    args.limit ?? 25,
    (args.node_types as NodeType[]) ?? [],
    args.concise ?? false
  );
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result),
      },
    ],
  };
}
