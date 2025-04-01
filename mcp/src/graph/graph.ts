import { db, Direction } from "./neo4j.js";
import archy from "archy";
import { buildTree } from "./codemap2.js";
import { formatNode } from "./codebody.js";
import { extractNodesFromRecord } from "./codebody2.js";
import { Neo4jNode, NodeType } from "./types.js";
import { nameFileOnly, toReturnNode } from "./utils.js";

export async function get_nodes(node_type: NodeType, concise: boolean) {
  const result = await db.nodes_by_type(node_type);
  return result.map((f) => toNode(f, concise));
}

export async function search(
  query: string,
  limit: number,
  node_types: NodeType[],
  concise: boolean
) {
  const result = await db.search(query, limit, node_types);
  return result.map((f) => toNode(f, concise));
}

export function toNode(node: Neo4jNode, concise: boolean): any {
  return concise ? nameFileOnly(node) : toReturnNode(node);
}

export interface MapParams {
  node_type: string;
  name: string;
  ref_id: string;
  tests: boolean;
  depth: number;
  direction: Direction;
}

export async function get_subtree(p: MapParams) {
  const r = await db.get_subtree(
    p.node_type,
    p.name,
    p.ref_id,
    p.tests,
    p.depth,
    p.direction
  );
  return r.records[0];
}

export async function get_map(params: MapParams) {
  const record = await get_subtree(params);
  const pkg_files = await db.get_pkg_files();
  const tree = await buildTree(record, params.direction);
  const text = archy(tree);
  let html = `<pre>`;
  html += text;
  for (const file of pkg_files) {
    html += `File: ${toNode(file, true).file}\n`;
  }
  html += `<pre>`;
  return html;
}

export async function get_code(params: MapParams) {
  const record = await get_subtree(params);
  const pkg_files = await db.get_pkg_files();
  const text = extractNodesFromRecord(record, pkg_files);
  return text;
}

function toSnippets(path: any) {
  let r = "";
  for (const segment of path.segments) {
    const snip = formatNode(segment.start);
    r += snip;
  }
  const snip = formatNode(path.end);
  r += snip;
  return r;
}

export async function get_shortest_path(
  start_node_key: string,
  end_node_key: string,
  start_ref_id: string,
  end_ref_id: string
) {
  if (start_ref_id && end_ref_id) {
    const result = await db.get_shortest_path_ref_id(start_ref_id, end_ref_id);
    const path = result.records[0].get("path");
    return toSnippets(path);
  } else {
    const result = await db.get_shortest_path(start_node_key, end_node_key);
    const path = result.records[0].get("path");
    return toSnippets(path);
  }
}
