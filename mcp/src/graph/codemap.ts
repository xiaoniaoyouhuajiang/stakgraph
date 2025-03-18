import { Record } from "neo4j-driver";
import { getNodeLabel } from "./utils.js";
import { createByModelName } from "@microsoft/tiktokenizer";

interface TreeNode {
  label: string;
  nodes: TreeNode[];
}

export async function buildTree(record: Record): Promise<TreeNode> {
  const tokenizer = await createByModelName("gpt-4");

  // Extract data from the record
  const startFunction = record.get("function");
  const paths = record.get("paths");

  // Create maps to store nodes and relationships
  const nodeMap = new Map<string, any>(); // Neo4j node by ID
  const treeNodeMap = new Map<string, TreeNode>(); // TreeNode by ID
  const childRelationships = new Map<string, Set<string>>(); // parent -> Set of children

  // Add the root node
  const rootId = startFunction.identity.toString();
  nodeMap.set(rootId, startFunction);

  // Process each path
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    if (!path) continue;

    // Process path segments
    if (path.segments && path.segments.length > 0) {
      // Collect nodes first
      const nodesInPath = new Set<string>();

      for (let j = 0; j < path.segments.length; j++) {
        const segment = path.segments[j];

        // Add start and end nodes to the nodeMap
        if (segment.start) {
          const startId = segment.start.identity.toString();
          nodeMap.set(startId, segment.start);
          nodesInPath.add(startId);
        }

        if (segment.end) {
          const endId = segment.end.identity.toString();
          nodeMap.set(endId, segment.end);
          nodesInPath.add(endId);
        }

        // Process the relationship (one-way, parent to child)
        if (segment.relationship) {
          const startId = segment.start.identity.toString();
          const endId = segment.end.identity.toString();

          // Add relationship (from start to end)
          if (!childRelationships.has(startId)) {
            childRelationships.set(startId, new Set<string>());
          }
          childRelationships.get(startId)!.add(endId);
        }
      }
    }
  }

  // Create TreeNodes for all Neo4j nodes
  for (const [id, node] of nodeMap.entries()) {
    const label = getNodeLabel(node, tokenizer);

    treeNodeMap.set(id, {
      label,
      nodes: [],
    });
  }

  // Build tree using breadth-first approach to avoid recursion issues
  const processQueue = [rootId];
  const processedNodes = new Set<string>(); // Track processed nodes to avoid cycles
  const nodePlacement = new Map<string, boolean>(); // Track if node has been placed in tree

  while (processQueue.length > 0) {
    const currentId = processQueue.shift()!;

    if (processedNodes.has(currentId)) continue;
    processedNodes.add(currentId);

    const children = childRelationships.get(currentId);
    if (!children) continue;

    const parentNode = treeNodeMap.get(currentId);
    if (!parentNode) continue;

    // Add all child nodes to the parent
    for (const childId of children) {
      // Skip if this would create a cycle back to root
      if (childId === rootId) continue;

      const childNode = treeNodeMap.get(childId);
      if (!childNode) continue;

      // Check if we already added this child to this parent
      if (!parentNode.nodes.some((n) => n.label === childNode.label)) {
        parentNode.nodes.push(childNode);
        nodePlacement.set(childId, true);

        // Add child to processing queue if we haven't processed it yet
        if (!processedNodes.has(childId)) {
          processQueue.push(childId);
        }
      }
    }
  }

  // Second pass - make sure all nodes are included somewhere in the tree
  // For any nodes not yet placed, add them as direct children of the root
  const rootNode = treeNodeMap.get(rootId)!;

  for (const [id, node] of treeNodeMap.entries()) {
    if (id !== rootId && !nodePlacement.get(id)) {
      rootNode.nodes.push(node);
      nodePlacement.set(id, true);
    }
  }

  return rootNode || { label: "Root not found", nodes: [] };
}
