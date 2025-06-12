export interface Node {
  node_type: NodeType;
  node_data: NodeData;
}

export type BoltInt = number | { low: number; hight: number };

export interface Neo4jNode {
  identity?: BoltInt; // built-in on some queries
  properties: NodeData;
  labels: string[];
  ref_id?: string;
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
  | "Trait"
  | "Library"
  | "Function"
  | "Test"
  | "E2etest"
  | "Endpoint"
  | "Request"
  | "Datamodel"
  | "Page"
  | "Var";

export type EdgeType =
  | "CALLS"
  | "USES"
  | "OPERAND"
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

export function relevant_node_types(): NodeType[] {
  return [
    "Page",
    "Function",
    "Class",
    "Trait",
    "Datamodel",
    "Request",
    "Endpoint",
    "Test",
    "E2etest",
    "Var",
  ];
}

export function all_node_types(): NodeType[] {
  return [
    "Repository",
    "Language",
    "Directory",
    "File",
    "Import",
    "Class",
    "Trait",
    "Library",
    "Function",
    "Test",
    "E2etest",
    "Endpoint",
    "Request",
    "Datamodel",
    "Page",
    "Var",
  ];
}

export function node_type_descriptions(): { [k in NodeType]: string } {
  return {
    Repository:
      "A code repository that contains source files, directories, and version history.",
    Language: "A programming language used in the repository.",
    Directory:
      "A folder within a repository that organizes files and subdirectories.",
    File: "A file within a repository, containing source code, configuration, or other project-related content.",
    Import:
      "A section at the top of a file that contains all imported modules, libraries, or dependencies used within the file.",
    Class:
      "A class definition in source code, representing an object-oriented structure with attributes and methods.",
    Trait:
      "A trait definition in source code, representing a collection of methods that can be implemented by other classes.",
    Library:
      "A reusable collection of code or modules providing functionality that can be imported and used in other projects.",
    Function:
      "A function or method definition in source code, representing executable logic within a program, including backend logic and frontend components.",
    Test: "A test case in source code, representing a specific scenario or condition that can be executed to verify the correctness of the code.",
    E2etest:
      "A end-to-end test in source code, representing a complete scenario of user interactions or system operations.",
    Endpoint:
      "A defined entry point for accessing functionality within an application or service, typically through an API.",
    Request: "A request to an specific endpoint",
    Datamodel:
      "A structured representation of data within a system, typically defining entities, relationships, attribute types, and corresponding SQL table definitions.",
    Page: "A webpage or route within an application, representing a specific view or section of the system. It can serve as the starting point for a codemap.",
    Var: "A variable in source code, representing a value that can be used in the code.",
  };
}
