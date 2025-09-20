import { Request, Response, NextFunction } from "express";
import {
  ContainerConfig,
  Neo4jNode,
  node_type_descriptions,
  NodeType,
  EdgeType,
  relevant_node_types,
} from "./types.js";
import {
  nameFileOnly,
  toReturnNode,
  isTrue,
  detectLanguagesAndPkgFiles,
  cloneRepoToTmp,
  extractEnvVarsFromRepo,
  findDockerComposeFiles,
  parseNodeTypes,
  parseRefIds,
  parseSince,
  parseLimit,
  parseLimitMode,
  buildGraphMeta,
} from "./utils.js";
import fs from "fs/promises";
import * as G from "./graph.js";
import { db } from "./neo4j.js";
import { parseServiceFile, extractContainersFromCompose } from "./service.js";
import * as path from "path";
import { get_context, GeneralContextResult } from "../tools/explore/tool.js";
import {
  ask_question,
  QUESTIONS,
  LEARN_HTML,
  ask_prompt,
  learnings,
} from "../tools/intelligence/index.js";
import { clone_and_explore_parse_files, clone_and_explore } from "gitsee-agent";
import { GitSeeHandler } from "gitsee/server";
import * as asyncReqs from "./reqs.js";

export function schema(_req: Request, res: Response) {
  const schema = node_type_descriptions();
  const schemaArray = Object.entries(schema).map(
    ([node_type, description]) => ({
      node_type,
      description,
    })
  );
  res.json(schemaArray);
}

export function logEndpoint(req: Request, res: Response, next: NextFunction) {
  if (req.headers["x-api-token"]) {
    console.log(`=> ${req.method} ${req.url} ${req.headers["x-api-token"]}`);
  } else {
    console.log(`=> ${req.method} ${req.url}`);
  }
  next();
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiToken = process.env.API_TOKEN;
  if (!apiToken) {
    return next();
  }

  // Check for x-api-token header
  const requestToken = req.header("x-api-token");
  if (requestToken && requestToken === apiToken) {
    return next();
  }

  // Check for Basic Auth header
  const authHeader = req.header("Authorization") || req.header("authorization");
  if (authHeader && authHeader.startsWith("Basic ")) {
    try {
      const base64Credentials = authHeader.substring(6);
      const credentials = Buffer.from(base64Credentials, "base64").toString(
        "ascii"
      );
      const [username, token] = credentials.split(":");
      if (token && token === apiToken) {
        return next();
      }
    } catch (error) {
      // Invalid base64 encoding
    }
  }

  res.status(401).json({ error: "Unauthorized: Invalid API token" });
  return;
}

export async function explore(req: Request, res: Response) {
  const prompt = req.query.prompt as string;
  if (!prompt) {
    res.status(400).json({ error: "Missing prompt" });
    return;
  }
  try {
    const result = await get_context(prompt);
    res.json({ result });
  } catch (error) {
    console.error("Explore Error:", error);
    res.status(500).send("Internal Server Error");
  }
}

export async function understand(req: Request, res: Response) {
  try {
    const question = req.query.question as string;
    const similarityThreshold =
      parseFloat(req.query.threshold as string) || 0.88;
    if (!question) {
      res.status(400).json({ error: "Missing question" });
      return;
    }
    const provider = req.query.provider as string | undefined;
    const answer = await ask_question(question, similarityThreshold, provider);
    res.json(answer);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
}

export async function seed_understanding(req: Request, res: Response) {
  try {
    const answers = [];

    // Sequential processing - one at a time
    for (const question of QUESTIONS) {
      const answer = await ask_question(question, 0.85);
      if (!answer.reused) {
        console.log("ANSWERED question:", question);
      }
      answers.push(answer);
    }

    res.json(answers);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
}

export async function ask(req: Request, res: Response) {
  const question = req.query.question as string;
  if (!question) {
    res.status(400).json({ error: "Missing question" });
    return;
  }
  const similarityThreshold =
    parseFloat(req.query.threshold as string) || undefined;
  const provider = req.query.provider as string | undefined;

  try {
    const answer = await ask_prompt(question, provider, similarityThreshold);
    res.json(answer);
  } catch (error) {
    console.error("Ask Error:", error);
    res.status(500).send("Internal Server Error");
  }
}

export async function get_learnings(req: Request, res: Response) {
  // curl "http://localhost:3355/learnings?question=how%20does%20auth%20work%20in%20the%20repo"
  const question =
    (req.query.question as string) ||
    "What are the core user stories in this project?";

  try {
    // Fetch top 25 Prompt nodes using vector search
    const { prompts, hints } = await learnings(question);

    res.json({
      prompts: Array.isArray(prompts) ? prompts : [],
      hints: Array.isArray(hints) ? hints : [],
    });
  } catch (error) {
    console.error("Learnings Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export function learn(req: Request, res: Response) {
  const apiToken = process.env.API_TOKEN;
  if (!apiToken) {
    res.setHeader("Content-Type", "text/html");
    res.send(LEARN_HTML);
    return;
  }

  // Check if user is already authenticated
  const authHeader = req.header("Authorization") || req.header("authorization");
  if (authHeader && authHeader.startsWith("Basic ")) {
    try {
      const base64Credentials = authHeader.substring(6);
      const credentials = Buffer.from(base64Credentials, "base64").toString(
        "ascii"
      );
      const [username, token] = credentials.split(":");

      if (token && token === apiToken) {
        res.setHeader("Content-Type", "text/html");
        res.send(LEARN_HTML);
        return;
      }
    } catch (error) {
      // Invalid base64 encoding, fall through to challenge
    }
  }

  // Send Basic Auth challenge
  res.setHeader("WWW-Authenticate", 'Basic realm="API Access"');
  res.status(401).send("Authentication required");
}

export async function seed_stories(req: Request, res: Response) {
  const default_prompt =
    "How does this repository work? Please provide a summary of the codebase, a few key files, and 50 core user stories.";
  const prompt = (req.query.prompt as string | undefined) || default_prompt;
  try {
    const gres = await get_context(prompt, false, true);
    const stories = JSON.parse(gres) as GeneralContextResult;
    let answers = [];
    for (const feature of stories.features) {
      console.log("+++++++++ feature:", feature);
      const answer = await ask_prompt(feature);
      answers.push(answer);
    }
    res.json(answers);
  } catch (error) {
    console.error("Seed Stories Error:", error);
    res.status(500).send("Internal Server Error");
  }
}

export async function get_nodes(req: Request, res: Response) {
  try {
    console.log("=> get_nodes", req.query);
    const node_type = req.query.node_type as NodeType;
    const concise = isTrue(req.query.concise as string);
    let ref_ids: string[] = [];
    if (req.query.ref_ids) {
      ref_ids = (req.query.ref_ids as string).split(",");
    }
    const output = req.query.output as G.OutputFormat;
    const language = req.query.language as string;

    const result = await G.get_nodes(
      node_type,
      concise,
      ref_ids,
      output,
      language
    );
    if (output === "snippet") {
      res.send(result);
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
}

export async function get_edges(req: Request, res: Response) {
  try {
    const edge_type = req.query.edge_type as EdgeType;
    const concise = isTrue(req.query.concise as string);
    let ref_ids: string[] = [];
    if (req.query.ref_ids) {
      ref_ids = (req.query.ref_ids as string).split(",");
    }
    const output = req.query.output as G.OutputFormat;
    const language = req.query.language as string;

    const result = await G.get_edges(
      edge_type,
      concise,
      ref_ids,
      output,
      language
    );
    if (output === "snippet") {
      res.send(result);
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
}

export async function search(req: Request, res: Response) {
  try {
    const query = req.query.query as string;
    const limit = parseInt(req.query.limit as string) || 25;
    const concise = isTrue(req.query.concise as string);
    let node_types: NodeType[] = [];
    if (req.query.node_types) {
      node_types = (req.query.node_types as string).split(",") as NodeType[];
    } else if (req.query.node_type) {
      node_types = [req.query.node_type as NodeType];
    }
    const method = req.query.method as G.SearchMethod;
    const output = req.query.output as G.OutputFormat;
    let tests = isTrue(req.query.tests as string);
    const maxTokens = parseInt(req.query.max_tokens as string);
    const language = req.query.language as string;

    if (maxTokens) {
      console.log("search with max tokens", maxTokens);
    }
    const result = await G.search(
      query,
      limit,
      node_types,
      concise,
      maxTokens || 100000,
      method,
      output || "snippet",
      tests,
      language
    );
    if (output === "snippet") {
      res.send(result);
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
}
export async function get_rules_files(req: Request, res: Response) {
  try {
    const snippets = await G.get_rules_files();
    res.json(snippets);
  } catch (error) {
    console.error("Error fetching rules files:", error);
    res.status(500).json({ error: "Failed to fetch rules files" });
  }
}

const gitSeeHandler = new GitSeeHandler({
  token: process.env.GITHUB_TOKEN,
});

// rm -rf node_modules/gitsee && yarn add file:../../../evanf/gitsee

export async function gitsee(req: Request, res: Response) {
  console.log("===> gitsee API request", req.url, req.method);
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    return await gitSeeHandler.handleJson(req.body, res);
  } catch (error) {
    console.error("gitsee API error:", error);
    res.status(500).json({ error: "Failed to handle gitsee request" });
  }
}

export async function gitseeEvents(req: Request, res: Response) {
  console.log("===> gitsee SSE request", req.url, req.method);
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  // Extract owner/repo from URL params
  const { owner, repo } = req.params;
  if (!owner || !repo) {
    res.status(400).json({ error: "Owner and repo are required" });
    return;
  }
  console.log(`📡 SSE connection for ${owner}/${repo}`);
  try {
    return await gitSeeHandler.handleEvents(
      req as any,
      res as any,
      owner,
      repo
    );
  } catch (error) {
    console.error("gitsee SSE error:", error);
    res.status(500).json({ error: "Failed to handle SSE connection" });
  }
}

export async function gitsee_services(req: Request, res: Response) {
  // curl "http://localhost:3355/services_agent?owner=stakwork&repo=hive"
  // curl "http://localhost:3355/progress?request_id=123"
  console.log("===> gitsee_services", req.url, req.method);
  const request_id = asyncReqs.startReq();
  try {
    const owner = req.query.owner as string;
    const repo = req.query.repo as string | undefined;
    if (!repo || !owner) {
      res.status(400).json({ error: "Missing repo" });
      return;
    }
    const username = req.query.username as string | undefined;
    const pat = req.query.pat as string | undefined;
    clone_and_explore_parse_files(
      owner,
      repo,
      "How do I set up this repo?",
      "services",
      {
        username,
        token: pat,
      }
    )
      .then((ctx) => {
        asyncReqs.finishReq(request_id, ctx);
      })
      .catch((error) => {
        asyncReqs.failReq(request_id, error);
      });
    res.json({ request_id, status: "pending" });
  } catch (error) {
    console.log("===> error", error);
    asyncReqs.failReq(request_id, error);
    console.error("Error getting services config:", error);
    res
      .status(500)
      .json({ error: "Failed to generate services configuration" });
  }
}

export async function gitsee_agent(req: Request, res: Response) {
  // curl "http://localhost:3355/agent?owner=stakwork&repo=hive&prompt=How%20do%20I%20set%20up%20this%20repo"
  // curl "http://localhost:3355/progress?request_id=51f5cce2-d5e8-4619-add3-c2f4cb37e1ba"
  console.log("===> gitsee agent", req.url, req.method, req.query.prompt);
  const request_id = asyncReqs.startReq();
  try {
    const owner = req.query.owner as string;
    const repo = req.query.repo as string | undefined;
    const prompt = req.query.prompt as string | undefined;
    const system = req.query.system as string | undefined;
    const final_answer = req.query.final_answer as string | undefined;
    if (!repo || !owner) {
      res.status(400).json({ error: "Missing repo" });
      return;
    }
    if (!prompt) {
      res.status(400).json({ error: "Missing prompt" });
      return;
    }
    const username = req.query.username as string | undefined;
    const pat = req.query.pat as string | undefined;
    clone_and_explore(
      owner,
      repo,
      prompt,
      "generic",
      {
        username,
        token: pat,
      },
      {
        system_prompt: system,
        final_answer_description: final_answer,
      }
    )
      .then((ctx) => {
        asyncReqs.finishReq(request_id, ctx);
      })
      .catch((error) => {
        asyncReqs.failReq(request_id, error);
      });
    res.json({ request_id, status: "pending" });
  } catch (error) {
    console.log("===> error", error);
    asyncReqs.failReq(request_id, error);
    console.error("Error getting services config:", error);
    res
      .status(500)
      .json({ error: "Failed to generate services configuration" });
  }
}

export async function get_services(req: Request, res: Response) {
  try {
    if (req.query.clone === "true" && req.query.repo_url) {
      const repoUrl = req.query.repo_url as string;
      const username = req.query.username as string | undefined;
      const pat = req.query.pat as string | undefined;
      const commit = req.query.commit as string | undefined;

      const repoDir = await cloneRepoToTmp(repoUrl, username, pat, commit);
      const detected = await detectLanguagesAndPkgFiles(repoDir);

      const envVarsByFile = await extractEnvVarsFromRepo(repoDir);

      const services = [];
      for (const { language, pkgFile } of detected) {
        const body = await fs.readFile(pkgFile, "utf8");
        const service = parseServiceFile(pkgFile, body, language);

        const serviceDir = path.dirname(pkgFile);
        const envVars = new Set<string>();
        for (const [file, vars] of Object.entries(envVarsByFile)) {
          if (file.startsWith(serviceDir)) {
            vars.forEach((v) => envVars.add(v));
          }
        }

        service.env = {};
        envVars.forEach((v) => (service.env[v] = process.env[v] || ""));

        const { pkgFile: _, ...cleanService } = service;
        services.push(cleanService);
      }
      const composeFiles = await findDockerComposeFiles(repoDir);
      let containers: ContainerConfig[] = [];
      for (const composeFile of composeFiles) {
        const found = await extractContainersFromCompose(composeFile);
        containers = containers.concat(found);
      }
      res.json({ services, containers });
      return;
    } else {
      const { services, containers } = await G.get_services();
      res.json({ services, containers });
    }
  } catch (error) {
    console.error("Error getting services config:", error);
    res
      .status(500)
      .json({ error: "Failed to generate services configuration" });
  }
}

export function toNode(node: Neo4jNode, concise: boolean): any {
  return concise ? nameFileOnly(node) : toReturnNode(node);
}

const DEFAULT_DEPTH = 7;

interface MapParams {
  node_type: string;
  name: string;
  ref_id: string;
  tests: boolean;
  depth: number;
  direction: G.Direction;
  trim: string[];
}

function mapParams(req: Request): MapParams {
  const node_type = req.query.node_type as string;
  const name = req.query.name as string;
  const ref_id = req.query.ref_id as string;
  const name_and_type = node_type && name;
  if (!name_and_type && !ref_id) {
    throw new Error("either node_type+name or ref_id required");
  }
  const direction = req.query.direction as G.Direction;
  const tests = !(req.query.tests === "false" || req.query.tests === "0");
  const depth = parseInt(req.query.depth as string) || DEFAULT_DEPTH;
  const default_direction = "both" as G.Direction;
  return {
    node_type: node_type || "",
    name: name || "",
    ref_id: ref_id || "",
    tests,
    depth,
    direction: direction || default_direction,
    trim: ((req.query.trim as string) || "").split(","),
  };
}

export async function get_map(req: Request, res: Response) {
  try {
    const html = await G.get_map(mapParams(req));
    res.send(`<pre>\n${html}\n</pre>`);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
}

export async function get_repo_map(req: Request, res: Response) {
  try {
    const name = req.query.name as string;
    const ref_id = req.query.ref_id as string;
    const node_type = req.query.node_type as NodeType;
    const include_functions_and_classes =
      req.query.include_functions_and_classes === "true" ||
      req.query.include_functions_and_classes === "1";
    const html = await G.get_repo_map(
      name || "",
      ref_id || "",
      node_type || "Repository",
      include_functions_and_classes
    );
    res.send(`<pre>\n${html}\n</pre>`);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
}

export async function get_code(req: Request, res: Response) {
  try {
    const text = await G.get_code(mapParams(req));
    res.send(text);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
}

export async function get_shortest_path(req: Request, res: Response) {
  try {
    const result = await G.get_shortest_path(
      req.query.start_node_key as string,
      req.query.end_node_key as string,
      req.query.start_ref_id as string,
      req.query.end_ref_id as string
    );
    res.send(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
}

export async function get_graph(req: Request, res: Response) {
  try {
    const edge_type =
      (req.query.edge_type as EdgeType) || ("CALLS" as EdgeType);
    const concise = isTrue(req.query.concise as string);
    const include_edges = isTrue(req.query.edges as string);
    const language = req.query.language as string | undefined;
    const since = parseSince(req.query);
    const limit_param = parseLimit(req.query);
    const limit_mode = parseLimitMode(req.query);
    let labels = parseNodeTypes(req.query);
    if (labels.length === 0) labels = relevant_node_types();

    const perTypeDefault = 100;
    let nodes: any[] = [];
    const ref_ids = parseRefIds(req.query);
    if (ref_ids.length > 0) {
      nodes = await db.nodes_by_ref_ids(ref_ids, language);
    } else {
      if (limit_mode === "total") {
        nodes = await db.nodes_by_types_total(
          labels,
          limit_param || perTypeDefault,
          since,
          language
        );
      } else {
        nodes = await db.nodes_by_types_per_type(
          labels,
          limit_param || perTypeDefault,
          since,
          language
        );
      }
    }

    let edges: any[] = [];
    if (include_edges) {
      const keys = nodes.map((n) => n.properties.node_key).filter(Boolean);
      edges = await db.edges_between_node_keys(keys);
    }

    res.json({
      nodes: concise
        ? nodes.map((n) => nameFileOnly(n))
        : nodes.map((n) => toReturnNode(n)),
      edges: include_edges
        ? concise
          ? edges.map((e) => ({
              edge_type: e.edge_type,
              source: e.source,
              target: e.target,
            }))
          : edges
        : [],
      status: "Success",
      meta: buildGraphMeta(labels, nodes, limit_param, limit_mode, since),
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
}

export async function get_script_progress(req: Request, res: Response) {
  console.log(`===> GET /script_progress`);
  try {
    const request_id = req.query.request_id as string;
    if (!request_id) {
      res.status(400).json({ error: "request_id is required" });
      return;
    }
    const progress = asyncReqs.checkReq(request_id);
    if (!progress) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    res.json(progress);
  } catch (error) {
    console.error("Error checking script progress:", error);
    res.status(500).send("Internal Server Error");
  }
}
