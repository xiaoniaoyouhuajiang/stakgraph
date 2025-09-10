import { QUESTIONS, ask_question } from "./questions.js";
import { decomposeAndAsk } from "./questions.js";
import { recomposeAnswer } from "./answer.js";
import { LEARN_HTML } from "./learn.js";

export {
  QUESTIONS,
  ask_question,
  decomposeAndAsk,
  recomposeAnswer,
  LEARN_HTML,
};

/*

NOTES

- ask: decompose into questions
  - question: search for existing question match
    - if not found: explore, link edges
- answer: recompose

*/
