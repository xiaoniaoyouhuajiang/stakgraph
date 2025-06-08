import { z } from "zod";
import { Tool } from "./index.js";
import { parseSchema } from "./utils.js";
import * as G from "../graph/graph.js";

export const RepoMapSchema = z.object({
  name: z
    .string()
    .optional()
    .describe("Name of the Repository node to map from."),
  ref_id: z
    .string()
    .optional()
    .describe("Reference ID of the Repository node."),
});

export const RepoMapTool: Tool = {
  name: "stakgraph_repo_map",
  description:
    "Generate a visual map/tree of the directories and files in the repo. If no name or ref_id is provided, it will return a repo map for all repositories.",
  inputSchema: parseSchema(RepoMapSchema),
};

export async function repoMap(args: z.infer<typeof RepoMapSchema>) {
  console.log("=> Running repo_map tool with args:", args);
  const result = await G.get_repo_map(args.name || "", args.ref_id || "");
  return {
    content: [
      {
        type: "text",
        text: result,
      },
    ],
  };
}
