export interface Node {
  node_type: NodeType;
  node_data: NodeData;
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
