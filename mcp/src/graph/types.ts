export interface Node {
  node_type: NodeType;
  node_data: NodeData;
}

export interface Neo4jNode {
  properties: NodeData;
  labels: string[];
  score?: number;
}

export interface ReturnNode {
  node_type: NodeType;
  ref_id: string;
  properties: NodeData;
}

export interface NodeData {
  name: string;
  file: string;
  body: string;
  start: number;
  end: number;
  docs?: string;
  hash?: string;
  verb?: string;
  [key: string]: any; // Allow any other properties
}

export type NodeType =
  | "Repository"
  | "Language"
  | "Directory"
  | "File"
  | "Import"
  | "Class"
  | "Library"
  | "Instance"
  | "Function"
  | "Test"
  | "E2etest"
  | "Endpoint"
  | "Request"
  | "Datamodel"
  | "Arg"
  | "Module"
  | "Feature"
  | "Page";

export type EdgeType =
  | "CALLS"
  | "USES"
  | "OPERAND"
  | "ARG_OF"
  | "CONTAINS"
  | "IMPORTS"
  | "OF"
  | "HANDLER"
  | "RENDERS";

export interface EdgeTypeInterface {
  edge_type: EdgeType;
}
export interface Edge {
  edge: EdgeTypeInterface;
  source: Node;
  target: Node;
}
