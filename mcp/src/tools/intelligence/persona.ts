import { getApiKeyForProvider, Provider } from "../../aieo/src/provider.js";
import { callGenerateObject } from "../../aieo/src/index.js";
import { z } from "zod";
import { db } from "../../graph/neo4j.js";
import { vectorizeQuery } from "../../vector/index.js";

export type Persona = "PM" | "SeniorDev" | "JuniorDev" | "CEO" | "Agent";

export const TARGET_PERSONAS: Persona[] = [
  "SeniorDev",
  "JuniorDev",
  "CEO",
  "Agent",
];

function personaPrompt(persona: Persona, question: string, answer: string) {
  return `Rewrite the following question and answer for a ${persona} audience. Preserve intent and correctness. Do not add new facts. Keep it concise and practical.

Question:
${question}

Answer:
${answer}

Return JSON with fields: question, answer.`;
}

export async function rephraseHint(
  question: string,
  answer: string,
  persona: Persona,
  llm_provider?: string
): Promise<{ question: string; answer: string }> {
  const provider = (llm_provider || "anthropic") as Provider;
  const apiKey = getApiKeyForProvider(provider);
  const schema = z.object({ question: z.string(), answer: z.string() });
  return await callGenerateObject({
    provider,
    apiKey,
    prompt: personaPrompt(persona, question, answer),
    schema,
  });
}

export async function generate_persona_variants(llm_provider?: string) {
  const hints = await db.hints_without_siblings();
  for (const h of hints) {
    const origRef = h.ref_id || h.properties.ref_id;
    const question = h.properties.question || h.properties.name || "";
    const answer = h.properties.body || "";
    if (!origRef || !question || !answer) continue;
    const siblings = await db.get_hint_siblings(origRef);
    const existingPersonas = new Set<string>();
    for (const s of siblings) {
      const p = (s.properties.persona as string) || "PM";
      existingPersonas.add(p);
    }
    for (const persona of TARGET_PERSONAS) {
      if (existingPersonas.has(persona)) continue;
      const rephrased = await rephraseHint(
        question,
        answer,
        persona,
        llm_provider
      );
      const embeddings = await vectorizeQuery(rephrased.question);
      const created = await db.create_hint(
        rephrased.question,
        rephrased.answer,
        embeddings,
        persona
      );
      await db.create_sibling_edge(origRef, created.ref_id);
    }
  }
}
