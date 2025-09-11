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

export async function ask_prompt(
  prompt: string,
  provider?: string,
  similarityThreshold: number = 0.85
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
  if (Array.isArray(existing) && existing.length > 0) {
    const top: any = existing[0];
    // THIS threshold is hardcoded to 0.95 because we want to reuse the answer if it's very similar to the prompt
    if (top.properties.score && top.properties.score >= 0.95) {
      return {
        answer: top.properties.body,
        sub_answers: [],
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

    for (const sub_answer of answer.sub_answers) {
      // Create edge from main prompt to sub answer hint
      await db.createEdgesDirectly(created.ref_id, [
        {
          ref_id: sub_answer.hint_ref_id,
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
