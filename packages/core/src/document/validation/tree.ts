import type { OmmValidationIssue } from "./types";
import type { MindNode } from "../types";

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

function validateRootMapObject(
  rootMap: unknown,
  issues: OmmValidationIssue[],
): Record<string, unknown> | null {
  if (!rootMap || typeof rootMap !== "object") {
    issues.push({
      path: "rootMap",
      message: "rootMap must be an object",
      code: "tree.missing",
    });
    return null;
  }
  return rootMap as Record<string, unknown>;
}

function rejectFlatNodes(
  map: Record<string, unknown>,
  issues: OmmValidationIssue[],
): void {
  if (map.nodes && typeof map.nodes === "object" && !Array.isArray(map.nodes)) {
    issues.push({
      path: "rootMap.nodes",
      message:
        "Flat nodes dictionary (runtime topology) is not allowed in .omm format",
      code: "tree.flat_nodes",
    });
  }
}

function checkChildrenArray(
  map: Record<string, unknown>,
  issues: OmmValidationIssue[],
): unknown[] | null {
  const children = map.children;
  if (!children || !Array.isArray(children)) {
    issues.push({
      path: "rootMap.children",
      message: "rootMap.children must be an array",
      code: "tree.missing_children",
    });
    return null;
  }
  return children;
}

function checkConcept(
  n: Record<string, unknown>,
  parentPath: string,
  issues: OmmValidationIssue[],
): void {
  if (typeof n.concept !== "string" || (n.concept as string).length === 0) {
    issues.push({
      path: `${parentPath}.concept`,
      message: "Node must have a non-empty concept",
      code: "tree.empty_concept",
    });
  }
}

function rejectStaleFields(
  n: Record<string, unknown>,
  parentPath: string,
  issues: OmmValidationIssue[],
): void {
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
}

function checkNodeId(
  n: Record<string, unknown>,
  parentPath: string,
  ctx: {
    seenIds: Map<string, string>;
    nodeIds: Map<string, true>;
    issues: OmmValidationIssue[];
  },
): boolean {
  const nodeId = n.id;
  if (typeof nodeId !== "string" || (nodeId as string).length === 0) {
    ctx.issues.push({
      path: `${parentPath}.id`,
      message: "Node must have a non-empty string id",
      code: "tree.empty_id",
    });
    return false;
  }
  if (ctx.seenIds.has(nodeId as string)) {
    ctx.issues.push({
      path: `${parentPath}.id`,
      message: `Duplicate node id "${nodeId}" (first seen at ${ctx.seenIds.get(nodeId as string)})`,
      code: "tree.duplicate_id",
    });
  } else {
    ctx.seenIds.set(nodeId as string, parentPath);
    ctx.nodeIds.set(nodeId as string, true);
  }
  return true;
}

function makeNodeValidator(ctx: {
  seenIds: Map<string, string>;
  nodeIds: Map<string, true>;
  issues: OmmValidationIssue[];
}): (node: unknown, parentPath: string) => void {
  return (node: unknown, parentPath: string): void => {
    if (!node || typeof node !== "object") {
      ctx.issues.push({
        path: parentPath,
        message: "Node must be an object",
        code: "tree.invalid_node",
      });
      return;
    }

    const n = node as Record<string, unknown>;

    checkConcept(n, parentPath, ctx.issues);
    rejectStaleFields(n, parentPath, ctx.issues);

    if (!checkNodeId(n, parentPath, ctx)) return;

    const childNodes = n.children;
    if (childNodes !== undefined) {
      if (!Array.isArray(childNodes)) {
        ctx.issues.push({
          path: `${parentPath}.children`,
          message: "children must be an array",
          code: "tree.invalid_children",
        });
      } else {
        const validateChild = makeNodeValidator(ctx);
        childNodes.forEach((child, i) =>
          validateChild(child, `${parentPath}.children[${i}]`),
        );
      }
    }
  };
}

export function validateTree(rootMap: unknown): {
  issues: OmmValidationIssue[];
  nodeIds: Map<string, true>;
} {
  const issues: OmmValidationIssue[] = [];
  const nodeIds = new Map<string, true>();

  const map = validateRootMapObject(rootMap, issues);
  if (!map) return { issues, nodeIds };

  rejectFlatNodes(map, issues);

  const children = checkChildrenArray(map, issues);
  if (!children) return { issues, nodeIds };

  const seenIds = new Map<string, string>();
  const ctx = { seenIds, nodeIds, issues };
  const validateNode = makeNodeValidator(ctx);

  children.forEach((child, i) => validateNode(child, `rootMap.children[${i}]`));

  return { issues, nodeIds };
}
