import { NodeData } from "./types.js";

export function getNodeLabel(node: any) {
  let label = node.labels[0];
  if (node.labels.length > 1 && node.labels[0] === "Data_Bank") {
    label = node.labels[1];
  }
  const props = node.properties;
  switch (label) {
    case "Function":
      return `Function: ${props.name}`;
    case "Datamodel":
      return `Datamodel: ${props.name}`;
    case "Request":
      return `Request: ${props.verb} ${props.name}`;
    case "Endpoint":
      return `Endpoint: ${props.verb} ${props.name}`;
    case "Class":
      return `Class: ${props.name}`;
    case "Test":
      return `Test: ${props.name}`;
    case "E2etest":
      return `E2ETest: ${props.name}`;
    default:
      return `${label}: ${props.name || JSON.stringify(props)}`;
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
