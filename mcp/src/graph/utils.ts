import { Node, Neo4jNode, ReturnNode, NodeType } from "./types.js";
import { TikTokenizer } from "@microsoft/tiktokenizer";
import { Data_Bank } from "./neo4j.js";

export function rightLabel(node: Neo4jNode): string {
  let label = node.labels[0];
  if (label === Data_Bank) {
    label = node.labels[1] || "";
  }
  return label;
}

export function toReturnNode(node: Neo4jNode): ReturnNode {
  const properties = node.properties;
  const ref_id = properties.ref_id || "";
  delete properties.ref_id;
  delete properties.text_embeddings;
  delete properties.embeddings;
  return {
    node_type: rightLabel(node) as NodeType,
    ref_id,
    properties,
  };
}

export function nameFileOnly(node: Neo4jNode): { name: string; file: string } {
  return {
    name: node.properties.name,
    file: node.properties.file,
  };
}

export function getNodeLabel(node: any, tokenizer?: TikTokenizer) {
  if (!node.labels) {
    console.log("Node has no labels:", node);
    throw new Error("Node has no labels");
  }
  let label = rightLabel(node);
  const props = node.properties;
  let name = props.name;
  if (tokenizer) {
    if (props.body) {
      const tokens = tokenizer.encode(props.body, []);
      name = `${name} (${tokens.length})`;
    } else {
      name = `${name} (0)`;
    }
  }
  if (props.verb) {
    return `${label}: ${props.verb} ${name}`;
  } else {
    return `${label}: ${name}`;
  }
}

// Helper function to format node
export function formatNode(node: Neo4jNode): string {
  if (node && node.properties) {
    // Regular format for other nodes
    return [
      `<snippet>`,
      `name: ${getNodeLabel(node)}`,
      `file: ${node.properties.file || "Not specified"}`,
      `start: ${node.properties.start || "N/A"}, end: ${
        node.properties.end || "N/A"
      }`,
      node.properties.body ? "```\n" + node.properties.body + "\n```" : "",
      "</snippet>",
      "", // Empty line for spacing
    ].join("\n");
  }
  return "";
}

export function create_node_key(node: Node) {
  const { node_type, node_data } = node;
  const { name, file, start, verb } = node_data;
  const parts = [node_type, name, file, (start || 0).toString()];
  if (verb) parts.push(verb);
  const sanitized_parts = parts.map((part) => {
    return part
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");
  });
  return sanitized_parts.join("-");
}
