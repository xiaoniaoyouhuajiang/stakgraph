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
  const allNodes = record.get("allNodes");
  const allRels = record.get("allRels");

  if (!allNodes || allNodes.length === 0) {
    return { label: "No nodes found", nodes: [] };
  }

  // Create maps to store nodes and relationships
  const nodeMap = new Map<string, any>(); // Neo4j node by ID
  const treeNodeMap = new Map<string, TreeNode>(); // TreeNode by ID
  const childRelationships = new Map<string, Set<string>>(); // parent -> Set of children

  // Process each node to populate the maps
  for (const node of allNodes) {
    const nodeId = node.identity.toString();
    nodeMap.set(nodeId, node);

    const label = getNodeLabel(node, tokenizer);
    treeNodeMap.set(nodeId, {
      label,
      nodes: [],
    });
  }

  // Process relationships to build the hierarchy
  for (const rel of allRels) {
    const startId = rel.start.toString();
    const endId = rel.end.toString();

    // Make sure the nodes exist in our nodeMap
    if (nodeMap.has(startId) && nodeMap.has(endId)) {
      // Check relationship type and direction
      const relType = rel.type;

      // Handle relationship directions based on your data model
      // For regular "outgoing" relationships like RENDERS>, CALLS>, CONTAINS>, HANDLER>
      if (["RENDERS", "CALLS", "CONTAINS", "HANDLER"].includes(relType)) {
        // Add relationship (from start to end)
        if (!childRelationships.has(startId)) {
          childRelationships.set(startId, new Set<string>());
        }
        childRelationships.get(startId)!.add(endId);
      }
      // For "incoming" relationships like <OPERAND
      else if (relType === "OPERAND") {
        // Add relationship (from end to start, as it's an incoming relationship)
        if (!childRelationships.has(endId)) {
          childRelationships.set(endId, new Set<string>());
        }
        childRelationships.get(endId)!.add(startId);
      }
    }
  }

  // Find the root node
  // First, try to find a node that has no incoming relationships
  const nodesWithIncomingRelationships = new Set<string>();
  for (const [sourceId, targetIds] of childRelationships.entries()) {
    for (const targetId of targetIds) {
      nodesWithIncomingRelationships.add(targetId);
    }
  }

  let rootId: string | null = null;

  for (const nodeId of nodeMap.keys()) {
    if (!nodesWithIncomingRelationships.has(nodeId)) {
      rootId = nodeId;
      break;
    }
  }

  // If no obvious root, fall back to the first node
  if (!rootId && allNodes.length > 0) {
    rootId = allNodes[0].identity.toString();
  }

  if (!rootId) {
    return { label: "No root node found", nodes: [] };
  }

  // Build the tree using breadth-first traversal
  const processQueue = [rootId];
  const processedNodes = new Set<string>();
  const nodePlacement = new Map<string, boolean>();

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

  return rootNode;
}
