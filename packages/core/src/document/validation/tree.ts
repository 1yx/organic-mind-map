import type { OmmValidationIssue } from "./types";
import type { MindNode, NodeId } from "../types";

/**
 * Recursively collects all node IDs from the tree.
 * Returns a Map from NodeId → true for quick lookup.
 */
export function collectNodeIds(nodes: MindNode[]): Map<string, true> {
  const ids = new Map<string, true>();
  for (const node of nodes) {
    ids.set(node.id, true);
    if (node.children && node.children.length > 0) {
      const childIds = collectNodeIds(node.children);
      for (const [id] of childIds) {
        ids.set(id, true);
      }
    }
  }
  return ids;
}

/**
 * Validates the nested tree structure.
 *
 * - Every node must have a non-empty `concept`.
 * - Node IDs must be unique across the full tree.
 * - Rejects persisted runtime topology fields (parentId, childIds, flat nodes).
 * - Preserves sibling order (does not reorder).
 * - Collects valid node IDs for layout reference checking.
 */
export function validateTree(rootMap: unknown): {
  issues: OmmValidationIssue[];
  nodeIds: Map<string, true>;
} {
  const issues: OmmValidationIssue[] = [];
  const nodeIds = new Map<string, true>();

  if (!rootMap || typeof rootMap !== "object") {
    return {
      issues: [
        {
          path: "rootMap",
          message: "rootMap must be an object",
          code: "tree.missing",
        },
      ],
      nodeIds,
    };
  }

  const map = rootMap as Record<string, unknown>;

  // Reject flat nodes dictionary
  if (map.nodes && typeof map.nodes === "object" && !Array.isArray(map.nodes)) {
    issues.push({
      path: "rootMap.nodes",
      message:
        "Flat nodes dictionary (runtime topology) is not allowed in .omm format",
      code: "tree.flat_nodes",
    });
  }

  const children = map.children;
  if (!children || !Array.isArray(children)) {
    issues.push({
      path: "rootMap.children",
      message: "rootMap.children must be an array",
      code: "tree.missing_children",
    });
    return { issues, nodeIds };
  }

  const seenIds = new Map<string, string>(); // id → path

  function validateNode(node: unknown, parentPath: string): void {
    if (!node || typeof node !== "object") {
      issues.push({
        path: parentPath,
        message: "Node must be an object",
        code: "tree.invalid_node",
      });
      return;
    }

    const n = node as Record<string, unknown>;

    // Check for non-empty concept
    if (typeof n.concept !== "string" || (n.concept as string).length === 0) {
      issues.push({
        path: `${parentPath}.concept`,
        message: "Node must have a non-empty concept",
        code: "tree.empty_concept",
      });
    }

    // Check for runtime topology fields
    if ("parentId" in n) {
      issues.push({
        path: `${parentPath}.parentId`,
        message:
          "Persisted runtime field 'parentId' is not allowed in .omm format",
        code: "tree.stale_parentId",
      });
    }

    if ("childIds" in n) {
      issues.push({
        path: `${parentPath}.childIds`,
        message:
          "Persisted runtime field 'childIds' is not allowed in .omm format",
        code: "tree.stale_childIds",
      });
    }

    // Check node ID uniqueness
    const nodeId = n.id;
    if (typeof nodeId !== "string" || (nodeId as string).length === 0) {
      issues.push({
        path: `${parentPath}.id`,
        message: "Node must have a non-empty string id",
        code: "tree.empty_id",
      });
      return;
    }

    if (seenIds.has(nodeId as string)) {
      issues.push({
        path: `${parentPath}.id`,
        message: `Duplicate node id "${nodeId}" (first seen at ${seenIds.get(nodeId as string)})`,
        code: "tree.duplicate_id",
      });
    } else {
      seenIds.set(nodeId as string, parentPath);
      nodeIds.set(nodeId as string, true);
    }

    // Recurse into children
    const childNodes = n.children;
    if (childNodes !== undefined) {
      if (!Array.isArray(childNodes)) {
        issues.push({
          path: `${parentPath}.children`,
          message: "children must be an array",
          code: "tree.invalid_children",
        });
      } else {
        childNodes.forEach((child, i) =>
          validateNode(child, `${parentPath}.children[${i}]`),
        );
      }
    }
  }

  (children as unknown[]).forEach((child, i) =>
    validateNode(child, `rootMap.children[${i}]`),
  );

  return { issues, nodeIds };
}
