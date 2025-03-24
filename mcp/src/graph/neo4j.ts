import neo4j, { Driver, Session } from "neo4j-driver";
import fs from "fs";
import readline from "readline";
import { Node, Edge, Neo4jNode, NodeType } from "./types.js";
import { create_node_key } from "./utils.js";
import * as Q from "./queries.js";

export type Direction = "up" | "down";

class Db {
  private driver: Driver;

  constructor() {
    const uri = `neo4j://${process.env.NEO4J_HOST || "localhost"}`;
    const user = process.env.NEO4J_USER || "neo4j";
    const pswd = process.env.NEO4J_PASSWORD || "testtest";
    console.log("===> connecting to", uri, user, pswd);
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, pswd));
  }

  async get_pkg_files(): Promise<Neo4jNode[]> {
    const session = this.driver.session();
    try {
      const r = await session.run(Q.PKGS_QUERY);
      return r.records.map((record) => record.get("file"));
    } finally {
      await session.close();
    }
  }

  async nodes_by_type(label: NodeType): Promise<Neo4jNode[]> {
    const session = this.driver.session();
    try {
      const r = await session.run(Q.LIST_QUERY, { node_label: label });
      return r.records.map((record) => record.get("f"));
    } finally {
      await session.close();
    }
  }

  async get_function_path(
    page: string | null,
    func: string | null,
    include_tests: boolean,
    depth: number
  ) {
    const session = this.driver.session();
    let page_name = page || null;
    let function_name = func || null;
    try {
      return await session.run(Q.PATH_QUERY, {
        page_name,
        function_name,
        include_tests,
        depth: depth || 7,
      });
    } finally {
      await session.close();
    }
  }

  skip_string(skips: NodeType[]) {
    return skips.map((skip) => `-${skip}`).join("|");
  }

  async get_subtree(
    node_type: string,
    name: string,
    ref_id: string,
    include_tests: boolean,
    depth: number,
    direction: Direction
  ) {
    let label_filter = "";
    if (include_tests === false) {
      label_filter = this.skip_string(["Test", "E2etest"]);
    }
    const session = this.driver.session();
    try {
      return await session.run(Q.SUBTREE_QUERY, {
        node_label: node_type,
        node_name: name,
        ref_id: ref_id,
        include_tests,
        depth,
        direction,
        label_filter,
      });
    } finally {
      await session.close();
    }
  }

  async get_shortest_path(start_node_key: string, end_node_key: string) {
    const session = this.driver.session();
    try {
      return await session.run(Q.SHORTEST_PATH_QUERY, {
        start_node_key,
        end_node_key,
      });
    } finally {
      await session.close();
    }
  }

  async get_shortest_path_ref_id(start_ref_id: string, end_ref_id: string) {
    const session = this.driver.session();
    try {
      return await session.run(Q.SHORTEST_PATH_QUERY_REF_ID, {
        start_ref_id,
        end_ref_id,
      });
    } finally {
      await session.close();
    }
  }

  async get_pages() {
    const session = this.driver.session();
    try {
      return await session.run(Q.PAGES_QUERY);
    } finally {
      await session.close();
    }
  }

  async get_components() {
    const session = this.driver.session();
    try {
      return await session.run(Q.COMPONENTS_QUERY);
    } finally {
      await session.close();
    }
  }

  // Main function to process both nodes and edges
  async init_graph(node_file: string, edge_file: string) {
    const session = this.driver.session();
    try {
      console.log("Processing nodes...", node_file);
      await process_file(session, node_file, (data) =>
        construct_merge_node_query(data)
      );
      console.log("Processing edges...", edge_file);
      await process_file(session, edge_file, (data) =>
        construct_merge_edge_query(data)
      );
      console.log("Processing complete!");
    } catch (error) {
      console.error("Error:", error);
    } finally {
      await session.close();
    }
  }

  async search(
    query: string,
    limit: number,
    node_types: NodeType[]
  ): Promise<Neo4jNode[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(Q.SEARCH_QUERY_NODE_TYPES, {
        query,
        limit,
        node_types,
      });
      return result.records.map((record) => {
        const node = record.get("node");
        return {
          properties: node.properties,
          labels: node.labels,
          score: record.get("score"),
        };
      });
    } finally {
      await session.close();
    }
  }

  index_node_type_string(types: NodeType[]) {
    return types.join("|");
  }

  async createFulltextIndex(): Promise<void> {
    const indexName = Q.BODY_INDEX;
    const session = this.driver.session();
    const node_types = this.index_node_type_string([
      "Repository",
      "Directory",
      "File",
      "Import",
      "Class",
      "Library",
      "Function",
      "Test",
      "E2etest",
      "Endpoint",
      "Request",
      "Datamodel",
      "Page",
    ]);
    try {
      // First check if the index already exists
      const indexResult = await session.run(
        `SHOW INDEXES WHERE name = $indexName`,
        { indexName }
      );
      const exists = indexResult.records.length > 0;
      if (!exists) {
        console.log("Creating fulltext index...");
        await session.run(
          `CREATE FULLTEXT INDEX ${indexName} FOR (f:${node_types})
          ON EACH [f.body]
          OPTIONS {
            indexConfig: {
              \`fulltext.analyzer\`: 'english'
            }
          }
        `
        );
        console.log("Fulltext index created successfully");
      } else {
        console.log("Fulltext index already exists, skipping creation");
      }
    } catch (error) {
      console.error("Error creating fulltext index:", error);
      throw error;
    } finally {
      await session.close();
    }
  }
}

export const db = new Db();

db.createFulltextIndex();

interface MergeQuery {
  query: string;
  parameters: any;
}

// Function to construct node merge query
export function construct_merge_node_query(node: Node): MergeQuery {
  const { node_type, node_data } = node;
  const node_key = create_node_key(node_data);
  const query = `
      MERGE (node:${node_type} {node_key: $node_key})
      ON CREATE SET node += $properties
      ON MATCH SET node += $properties
      RETURN node
    `;
  return {
    query,
    parameters: {
      node_key,
      properties: { ...node_data, node_key },
    },
  };
}

// Function to construct edge merge query
function construct_merge_edge_query(edge_data: Edge): MergeQuery {
  const { edge, source, target } = edge_data;
  const source_key = create_node_key(source.node_data);
  const target_key = create_node_key(target.node_data);
  const query = `
      MATCH (source:${source.node_type} {node_key: $source_key})
      MATCH (target:${target.node_type} {node_key: $target_key})
      MERGE (source)-[r:${edge.edge_type}]->(target)
      RETURN r
    `;
  return {
    query,
    parameters: {
      source_key,
      target_key,
    },
  };
}

const BATCH_SIZE = 256;

async function process_file(
  session: Session,
  file_path: string,
  process_fn: (data: any) => any
) {
  const file_interface = readline.createInterface({
    input: fs.createReadStream(file_path),
    crlfDelay: Infinity,
  });
  let batch = [];
  let count = 0;
  for await (const line of file_interface) {
    try {
      const data = JSON.parse(line);
      // console.log(data);
      const query_data = process_fn(data);
      // console.log(query_data);
      batch.push(query_data);

      if (batch.length >= BATCH_SIZE) {
        await execute_batch(session, batch);
        console.log(`Processed ${(count += batch.length)} items`);
        batch = [];
      }
    } catch (error) {
      console.error(`Error processing line: ${line}`, error);
    }
  }
  // Process remaining items
  if (batch.length > 0) {
    await execute_batch(session, batch);
    console.log(`Processed ${(count += batch.length)} items`);
  }
}

async function execute_batch(session: Session, batch: any[]) {
  const tx = session.beginTransaction();
  try {
    for (const { query, parameters } of batch) {
      await tx.run(query, parameters);
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    console.error("Error executing batch:", error);
    throw error;
  }
}
