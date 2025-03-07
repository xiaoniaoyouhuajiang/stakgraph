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

export const PATH_QUERY = `
WITH $include_tests as include_tests, 
     $function_name as function_name,
     $page_name as page_name

// Decide which node to use based on parameters
OPTIONAL MATCH (start_page:Page)
WHERE page_name IS NOT NULL AND start_page.name = page_name

OPTIONAL MATCH (start_func:Function)
WHERE page_name IS NULL AND function_name IS NOT NULL AND start_func.name = function_name

// Combine into a single starting node
WITH include_tests, 
     CASE WHEN start_page IS NOT NULL THEN start_page ELSE start_func END as start_node

// Ensure we found a valid starting node
WHERE start_node IS NOT NULL

// Start directly with the chosen node and collect paths
CALL apoc.path.expandConfig(start_node, {
    relationshipFilter: "CALLS>|CONTAINS>|HANDLER>|RENDERS>",
    minLevel: 0,
    maxLevel: 7,
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
