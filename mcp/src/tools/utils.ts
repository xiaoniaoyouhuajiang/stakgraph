import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import { Json } from "./index.js";

export function parseSchema(schema: z.ZodSchema): Json {
  const s = zodToJsonSchema(schema);
  delete s["$schema"];
  return s;
}
