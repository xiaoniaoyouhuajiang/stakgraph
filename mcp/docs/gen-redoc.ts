console.log("Hello, world!");

import * as fs from "fs";
import * as dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const SYSTEM_PROMPT = "You are an expert Nodejs dev named Claude";

const PROMPT = `Can you write a yaml swagger doc named repo2graph for those 6 endpoints?

node_type examples should include Page,Function,Class,Trait,Datamodel,Request,Endpoint

name examples can be like LeaderboardPage, TicketPage, etc.

Please make the "summary" of each endpoint just the endpoint path, like "nodes". That makes it easier to navigate

The "concise" param should say "only include name and file in returned data"`;

const anthropic = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"], // This is the default and can be omitted
});

async function go() {
  try {
    console.log("get prompt");
    const indexFile = fs.readFileSync(`src/index.ts`, "utf-8");
    const serverFile = fs.readFileSync(`src/graph/graph.ts`, "utf-8");
    let prompt = "Here is my index.ts file:\n\n" + indexFile + "\n\n";
    prompt += "Here is my server file:\n\n" + serverFile + "\n\n";
    prompt += PROMPT;
    console.log("call claude");
    const res = await callClaude(prompt);
    if (res.content[0].type === "text") {
      const text = res.content[0].text;
      fs.writeFileSync(`swagger.yaml`, text);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function callClaude(prompt: string) {
  return await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
}

go();
