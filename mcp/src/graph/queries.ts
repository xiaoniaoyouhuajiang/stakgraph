export const PKGS_QUERY = `
MATCH (file:File)
WHERE file.name ENDS WITH 'Cargo.toml'
   OR file.name ENDS WITH 'go.mod'
   OR file.name ENDS WITH 'package.json'
   OR file.name ENDS WITH 'requirements.txt'
   OR file.name ENDS WITH 'Gemfile'
RETURN file
`;

export const PAGES_QUERY = `
MATCH (page:Page)
RETURN DISTINCT page
`;

export const COMPONENTS_QUERY = `
MATCH (f:Function)
WHERE
  // Check if first character is uppercase (ASCII A-Z range)
  f.name =~ '^[A-Z].*'
  // Check if file ends with tsx or jsx
  AND (f.file ENDS WITH '.tsx' OR f.file ENDS WITH '.jsx')
RETURN f as component
`;

export const SUBTREE_QUERY = `
WITH $node_label AS nodeLabel,
     $node_name as nodeName
MATCH (f {name: nodeName})
WHERE any(label IN labels(f) WHERE label = nodeLabel)
CALL apoc.path.expandConfig(f, {
    relationshipFilter: "RENDERS>|CALLS>|CONTAINS>|HANDLER>|<OPERAND",
    uniqueness: "NODE_PATH",
    minLevel: 1,
    maxLevel: 10
})
YIELD path
WITH path, nodes(path) AS pathNodes
UNWIND pathNodes AS node
WITH DISTINCT path, node.file AS fileName
WHERE fileName IS NOT NULL
WITH path, COLLECT(fileName) AS fileNames
MATCH (file:File)-[:CONTAINS]->(import:Import)
WHERE file.file IN fileNames
RETURN path, COLLECT(DISTINCT import) AS imports
`;

export const PATH_QUERY = `
WITH $include_tests as include_tests,
     $function_name as function_name,
     $page_name as page_name,
     $depth as depth

// Decide which node to use based on parameters
OPTIONAL MATCH (start_page:Page)
WHERE page_name IS NOT NULL AND start_page.name = page_name

OPTIONAL MATCH (start_func:Function)
WHERE page_name IS NULL AND function_name IS NOT NULL AND start_func.name = function_name

// Combine into a single starting node
WITH include_tests, depth,
     CASE WHEN start_page IS NOT NULL THEN start_page ELSE start_func END as start_node

// Ensure we found a valid starting node
WHERE start_node IS NOT NULL

// Start directly with the chosen node and collect paths
CALL apoc.path.expandConfig(start_node, {
    relationshipFilter: "CALLS>|CONTAINS>|HANDLER>|RENDERS>",
    minLevel: 0,
    maxLevel: depth,
    uniqueness: "NODE_GLOBAL"
}) YIELD path
WITH include_tests, start_node, collect(path) as expanded_paths

// Ensure we always have at least one path with the starting node
WITH include_tests, start_node,
     CASE WHEN size(expanded_paths) > 0
          THEN expanded_paths
          ELSE [apoc.path.create(start_node, [])]
     END as function_paths

// Extract all function nodes from the paths
UNWIND function_paths as path
UNWIND nodes(path) as node
WITH include_tests, start_node, function_paths, collect(DISTINCT node) as all_nodes

// Find additional nodes: classes, traits, and tests
OPTIONAL MATCH (n)-[r]-(related)
WHERE n IN all_nodes
  AND (
    (n:Function AND related:Class) OR
    (n:Function AND related:Trait) OR
    (include_tests AND n:Function AND related:Test) OR
    (include_tests AND n:Function AND related:E2etest) OR
    (n:Function AND related:Page)
  )
WITH include_tests, start_node, function_paths, all_nodes,
     collect(DISTINCT r) as additional_rels

// Create paths for these additional relationships
WITH include_tests, start_node, function_paths, all_nodes,
     [rel IN additional_rels | apoc.path.create(startNode(rel), [rel])] as additional_paths

// Find Files that contain these functions and other nodes
OPTIONAL MATCH (file:File)-[contains:CONTAINS]->(node)
WHERE node IN all_nodes
WITH include_tests, start_node, function_paths, additional_paths, collect(DISTINCT file) as files

// OPTIONAL MATCH for Imports in the same files
OPTIONAL MATCH (file:File)-[imp_rel:CONTAINS]->(import:Import)
WHERE file IN files
WITH include_tests, start_node, function_paths, additional_paths,
     collect(DISTINCT import) as imports

// Create simple paths for imports (if any)
WITH start_node, function_paths, additional_paths, imports
WITH start_node, function_paths, additional_paths,
     [import IN imports | apoc.path.create(import, [])] as import_paths

// Combine all paths
WITH start_node, function_paths + additional_paths + import_paths as all_paths

RETURN
    start_node as function,
    all_paths as paths
`;

export const SHORTEST_PATH_QUERY = `
MATCH (start {node_key: $start_node_key}),
      (end {node_key: $end_node_key})
MATCH path = shortestPath((start)-[*]-(end))
WHERE ALL(node IN nodes(path) WHERE
    node:Page OR
    node:Function OR
    node:Request OR
    node:Endpoint OR
    node:Datamodel)
RETURN path
`;

// export const SHORTEST_PATH_QUERY = `
// MATCH (start {node_key: $start_node_key}), (end {node_key: $end_node_key})
// MATCH path = shortestPath((start)-[*]-(end))
// RETURN path
// `;

export const SHORTEST_PATH_QUERY_REF_ID = `
MATCH (start {ref_id: $start_ref_id}), (end {ref_id: $end_ref_id})
MATCH path = shortestPath((start)-[*]-(end))
WHERE ALL(node IN nodes(path) WHERE
    node:Page OR
    node:Function OR
    node:Request OR
    node:Endpoint OR
    node:Datamodel)
RETURN path
`;

/*
MATCH (start {node_key: 'p-stakworksphinxtribesfrontendsrcpagesindextsx'}), (end {node_key: 'person-stakworksphinxtribesdbstructsgo'})
CALL apoc.algo.shortestPath(start, end, '')
YIELD path
RETURN path

MATCH (start {node_key: 'p-stakworksphinxtribesfrontendsrcpagesindextsx'}), (end {node_key: 'person-stakworksphinxtribesdbstructsgo'})
MATCH path = shortestPath((start)-[*]-(end))
RETURN path

MATCH (start {ref_id: 'bb6bab51-018b-41ad-948e-d7bb53179e57'}), (end {ref_id: '426dd007-e2e9-475a-b3a7-36928042bf7b'})
MATCH path = shortestPath((start)-[*]-(end))
RETURN path

*/
