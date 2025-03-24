import { NodeData, Neo4jNode } from "./types.js";
import { TikTokenizer } from "@microsoft/tiktokenizer";

export function getNodeLabel(node: any, tokenizer?: TikTokenizer) {
  if (!node.labels) {
    console.log("Node has no labels:", node);
    throw new Error("Node has no labels");
  }
  let label = node.labels[0];
  if (node.labels.length > 1 && node.labels[0] === "Data_Bank") {
    label = node.labels[1];
  }
  const props = node.properties;
  let name = props.name;
  if (tokenizer) {
    const tokens = tokenizer.encode(props.body, []);
    name = `${name} (${tokens.length})`;
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

export function create_node_key(node_data: NodeData) {
  const { name, file, verb } = node_data;
  const parts = [name, file];
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
