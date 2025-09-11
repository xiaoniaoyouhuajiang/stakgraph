import { ask_question } from "./ask.js";
import { decomposeAndAsk, QUESTIONS } from "./questions.js";
import { recomposeAnswer, RecomposedAnswer } from "./answer.js";
import { LEARN_HTML } from "./learn.js";
import * as G from "../../graph/graph.js";
import { db } from "../../graph/neo4j.js";
import { vectorizeQuery } from "../../vector/index.js";

export {
  QUESTIONS,
  ask_question,
  decomposeAndAsk,
  recomposeAnswer,
  LEARN_HTML,
};

export const PROMPT_SIMILARITY_THRESHOLD = 0.9;
export const QUESTION_HIGHLY_RELEVANT_THRESHOLD = 0.95;
export const QUESTION_SIMILARITY_THRESHOLD = 0.75;

export async function ask_prompt(
  prompt: string,
  provider?: string,
  similarityThreshold: number = QUESTION_SIMILARITY_THRESHOLD
): Promise<RecomposedAnswer> {
  // first get a 0.95 match
  const existing = await G.search(
    prompt,
    5,
    ["Prompt", "Hint"],
    false,
    100000,
    "vector",
    "json"
  );
  if (Array.isArray(existing)) {
    console.log(">> existing prompts and hints::");
    existing.forEach((e: any) =>
      console.log(e.properties.question, e.properties.score, e.node_type)
    );
  }
  if (Array.isArray(existing) && existing.length > 0) {
    const top: any = existing[0];
    // THIS threshold is hardcoded because we want to reuse the answer if it's very similar to the prompt
    if (
      top.properties.score &&
      top.properties.score >= PROMPT_SIMILARITY_THRESHOLD
    ) {
      // Fetch connected hints (sub_answers) for this existing prompt
      const connected_hints = await db.get_connected_hints(top.ref_id);
      const hints = connected_hints.map((hint: any) => ({
        question: hint.properties.question || hint.properties.name,
        answer: hint.properties.body || "",
        hint_ref_id: hint.ref_id || hint.properties.ref_id,
        reused: true,
        reused_question: hint.properties.question || hint.properties.name,
        edges_added: 0,
        linked_ref_ids: [],
      }));

      return {
        answer: top.properties.body,
        hints,
      };
    }
  }

  // then decompose and ask
  try {
    const answers = await decomposeAndAsk(
      prompt,
      similarityThreshold,
      provider
    );
    const answer = await recomposeAnswer(prompt, answers, provider);

    const embeddings = await vectorizeQuery(prompt);
    const created = await db.create_prompt(prompt, answer.answer, embeddings);

    for (const hint of answer.hints) {
      // Create edge from main prompt to sub answer hint
      console.log(
        ">> creating edge from main prompt to hint",
        created.ref_id,
        hint.hint_ref_id
      );
      await db.createEdgesDirectly(created.ref_id, [
        {
          ref_id: hint.hint_ref_id,
          relevancy: 0.8, // Sub answers are highly relevant to the main prompt
        },
      ]);
    }

    return answer;
  } catch (error) {
    console.error("Ask Prompt Error:", error);
    throw error;
  }
}

/*

NOTES

- ask: decompose into questions
  - question: search for existing question match
    - if not found: explore, link edges
- answer: recompose

*/
