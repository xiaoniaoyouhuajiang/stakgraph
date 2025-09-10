import { db } from "../../graph/neo4j.js";
import { getApiKeyForProvider, Provider } from "../../aieo/src/provider.js";
import { HintExtraction, Neo4jNode } from "../../graph/types.js";
import { z } from "zod";
import { callGenerateObject } from "../../aieo/src/index.js";

async function findNodesFromExtraction(
  extracted: HintExtraction
): Promise<{ node: Neo4jNode; relevancy: number }[]> {
  const foundNodes: { node: Neo4jNode; relevancy: number }[] = [];
  const typeMapping = {
    function_names: "Function",
    file_names: "File",
    datamodel_names: "Datamodel",
    endpoint_names: "Endpoint",
    page_names: "Page",
  };

  for (const [key, nodeType] of Object.entries(typeMapping)) {
    const weightedNodes = extracted[key as keyof HintExtraction] || [];
    for (const weightedNode of weightedNodes) {
      if (weightedNode.name && weightedNode.name.trim()) {
        const nodes = await db.findNodesByName(
          weightedNode.name.trim(),
          nodeType
        );
        for (const node of nodes) {
          foundNodes.push({ node, relevancy: weightedNode.relevancy });
        }
      }
    }
  }

  return foundNodes;
}

export async function create_hint_edges_llm(
  hint_ref_id: string,
  answer: string,
  llm_provider?: Provider | string
): Promise<{ edges_added: number; linked_ref_ids: string[] }> {
  if (!answer) return { edges_added: 0, linked_ref_ids: [] };
  const provider = llm_provider ? llm_provider : "anthropic";
  const apiKey = getApiKeyForProvider(provider);
  if (!apiKey) return { edges_added: 0, linked_ref_ids: [] };

  const extracted = await extractHintReferences(
    answer,
    provider as Provider,
    apiKey
  );

  const foundNodes = await findNodesFromExtraction(extracted);
  const weightedRefIds = foundNodes
    .map((item) => ({
      ref_id: item.node.ref_id || item.node.properties.ref_id,
      relevancy: item.relevancy,
    }))
    .filter((item) => item.ref_id);

  if (weightedRefIds.length === 0)
    return { edges_added: 0, linked_ref_ids: [] };

  return await db.createEdgesDirectly(hint_ref_id, weightedRefIds);
}

export async function extractHintReferences(
  answer: string,
  provider: Provider,
  apiKey: string
): Promise<HintExtraction> {
  const truncated = answer.slice(0, 8000);
  const schema = z.object({
    function_names: z
      .array(
        z.object({
          name: z.string(),
          relevancy: z.number().min(0).max(1),
        })
      )
      .describe(
        "functions or react components with relevancy scores (0.0-1.0). e.g [{name: 'getUser', relevancy: 0.9}, {name: 'handleClick', relevancy: 0.6}]"
      ),
    file_names: z
      .array(
        z.object({
          name: z.string(),
          relevancy: z.number().min(0).max(1),
        })
      )
      .describe(
        "complete file paths with relevancy scores (0.0-1.0). e.g [{name: 'src/app/page.tsx', relevancy: 0.8}]"
      ),
    datamodel_names: z
      .array(
        z.object({
          name: z.string(),
          relevancy: z.number().min(0).max(1),
        })
      )
      .describe(
        "database models, schemas, or data structures with relevancy scores (0.0-1.0). e.g [{name: 'User', relevancy: 0.9}]"
      ),
    endpoint_names: z
      .array(
        z.object({
          name: z.string(),
          relevancy: z.number().min(0).max(1),
        })
      )
      .describe(
        "API endpoints with relevancy scores (0.0-1.0). e.g [{name: '/api/person', relevancy: 0.7}]"
      ),
    page_names: z
      .array(
        z.object({
          name: z.string(),
          relevancy: z.number().min(0).max(1),
        })
      )
      .describe(
        "web pages, components, or views with relevancy scores (0.0-1.0). e.g [{name: 'HomePage', relevancy: 0.8}]"
      ),
  });
  try {
    return await callGenerateObject({
      provider,
      apiKey,
      prompt: `Extract exact code nodes referenced with relevancy scores (0.0-1.0). Higher scores for more central/important nodes. Return JSON only. Use empty arrays if none.\n\n${truncated}`,
      schema,
    });
  } catch (_) {
    return {
      function_names: [],
      file_names: [],
      datamodel_names: [],
      endpoint_names: [],
      page_names: [],
    };
  }
}
