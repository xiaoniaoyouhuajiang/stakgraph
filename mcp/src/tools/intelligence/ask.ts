import { getApiKeyForProvider, Provider } from "../../aieo/src/provider.js";
import { callGenerateObject } from "../../aieo/src/index.js";
import { z } from "zod";
import { db } from "../../graph/neo4j.js";
import { get_context } from "../explore/tool.js";
import { vectorizeQuery } from "../../vector/index.js";
import { create_hint_edges_llm } from "./seed.js";
import * as G from "../../graph/graph.js";

/*
curl "http://localhost:3000/ask?question=how%20does%20auth%20work%20in%20the%20repo"
*/

export interface Answer {
  question: string;
  answer: string;
  hint_ref_id: string;
  reused: boolean;
  reused_question?: string;
  edges_added: number;
  linked_ref_ids: string[];
}

export async function ask_question(
  question: string,
  similarityThreshold: number,
  provider?: string
): Promise<Answer> {
  const existing = await G.search(
    question,
    5,
    ["Hint"],
    false,
    100000,
    "vector",
    "json"
  );
  let reused = false;
  if (Array.isArray(existing) && existing.length > 0) {
    const top: any = existing[0];
    if (top.properties.score && top.properties.score >= similarityThreshold) {
      console.log(
        ">> REUSED question:",
        question,
        ">>",
        top.properties.question
      );
      return {
        question,
        answer: top.properties.body,
        hint_ref_id: top.ref_id,
        reused: true,
        reused_question: top.properties.question,
        edges_added: 0,
        linked_ref_ids: [],
      };
    }
  }
  console.log(">> NEW question:", question);
  const ctx = await get_context(question);
  const answer = ctx;
  const embeddings = await vectorizeQuery(question);
  const created = await db.create_hint(question, answer, embeddings);
  let edges_added = 0;
  let linked_ref_ids: string[] = [];
  try {
    const r = await create_hint_edges_llm(created.ref_id, answer, provider);
    edges_added = r.edges_added;
    linked_ref_ids = r.linked_ref_ids;
  } catch (e) {
    console.error("Failed to create edges from hint", e);
  }
  return {
    question,
    answer,
    hint_ref_id: created.ref_id,
    reused,
    edges_added,
    linked_ref_ids,
  };
}

/*
DECOMPOSE QUESTION into business context and specific implementation questions
*/

function DECOMPOSE_PROMPT(user_query: string) {
  return `
You are bridging business requirements to technical implementation. Given a user request:

**User Request:** ${user_query}

## Step 1: Business Context Analysis
Identify the core business functionality and user workflows involved.

## Step 2: Implementation Questions
Generate 1-5 specific questions that developers would need to answer. Make each question:
- **Short and concise**
- **Specific enough** to match existing cached answers
- **Business-focused** but technically actionable  
- **Workflow-oriented** (following user journeys)
- **Entity-specific** (mention likely code components)

**Question Types to Consider:**
- **User Workflows**: "How does a user [specific action] in this system?"
- **Data Handling**: "How is [business entity] data stored/validated/retrieved?"
- **Business Logic**: "What happens when [business event] occurs?"
- **Integration Points**: "How does [business process] connect with [other system/feature]?"
- **Permissions**: "What user roles can [perform action] and how is this enforced?"
- **UI Patterns**: "What UI components handle [user interaction type]?"

**Format each question for optimal embedding:**
- Use business terminology first, technical second
- Include context: "In the context of [workflow], how does..."
- Be specific: Instead of "How to implement auth" → "How does user password reset workflow work with email verification?"

**IMPORTANT:**
MAKE YOUR QUESTIONS SHORT AND CONCISE. DO NOT ASSUME THINGS ABOUT THE CODEBASE THAT YOU DON'T KNOW.

**EXPECTED OUTPUT FORMAT:**
{
  "business_context": "Brief description of core functionality",
  "questions": [
    "How does user registration workflow handle email verification and account activation?",
    "What user permission system controls access to workspace creation features?",
    ...
  ]
}
`;
}

interface DecomposedQuestion {
  business_context: string;
  questions: string[];
}
export async function decomposeQuestion(
  question: string,
  llm_provider?: string
): Promise<DecomposedQuestion> {
  const provider = llm_provider ? llm_provider : "anthropic";
  const apiKey = getApiKeyForProvider(provider);
  const schema = z.object({
    business_context: z.string(),
    questions: z.array(z.string()),
  });
  return await callGenerateObject({
    provider: provider as Provider,
    apiKey,
    prompt: DECOMPOSE_PROMPT(question),
    schema,
  });
}
