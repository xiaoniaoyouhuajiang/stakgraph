import { NodeData } from "./types.js";
import { TikTokenizer } from "@microsoft/tiktokenizer";

export function getNodeLabel(node: any, tokenizer?: TikTokenizer) {
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
  switch (label) {
    case "Function":
      return `Function: ${name}`;
    case "Datamodel":
      return `Datamodel: ${name}`;
    case "Request":
      return `Request: ${props.verb} ${name}`;
    case "Endpoint":
      return `Endpoint: ${props.verb} ${name}`;
    case "Class":
      return `Class: ${name}`;
    case "Test":
      return `Test: ${name}`;
    case "E2etest":
      return `E2ETest: ${name}`;
    default:
      return `${label}: ${name || JSON.stringify(props)}`;
  }
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
