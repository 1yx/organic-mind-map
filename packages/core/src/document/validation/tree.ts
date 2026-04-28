import type { OmmValidationIssue } from "./types";
import type { MindNode } from "../types";

type TreeContext = {
  seenIds: Map<string, string>;
  nodeIds: Map<string, true>;
  issues: OmmValidationIssue[];
};

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

  issues.push(...checkFlatNodes(map));

  const children = map.children;
  if (!children || !Array.isArray(children)) {
    issues.push({
      path: "rootMap.children",
      message: "rootMap.children must be an array",
      code: "tree.missing_children",
    });
    return { issues, nodeIds };
  }

  const ctx: TreeContext = {
    seenIds: new Map<string, string>(),
    nodeIds,
    issues,
  };
  const childNodes = children as unknown[];
  for (let i = 0; i < childNodes.length; i++) {
    validateNodeEntry(childNodes[i], `rootMap.children[${i}]`, ctx);
  }

  return { issues, nodeIds };
}

function checkFlatNodes(map: Record<string, unknown>): OmmValidationIssue[] {
  if (map.nodes && typeof map.nodes === "object" && !Array.isArray(map.nodes)) {
    return [
      {
        path: "rootMap.nodes",
        message:
          "Flat nodes dictionary (runtime topology) is not allowed in .omm format",
        code: "tree.flat_nodes",
      },
    ];
  }
  return [];
}

function validateNodeEntry(
  node: unknown,
  parentPath: string,
  ctx: TreeContext,
): void {
  if (!node || typeof node !== "object") {
    ctx.issues.push({
      path: parentPath,
      message: "Node must be an object",
      code: "tree.invalid_node",
    });
    return;
  }

  const n = node as Record<string, unknown>;

  ctx.issues.push(...checkConcept(n, parentPath));
  ctx.issues.push(...checkRuntimeFields(n, parentPath));
  ctx.issues.push(...checkNodeId(n, parentPath, ctx));
  checkNodeChildren(n, parentPath, ctx);
}

function checkConcept(
  n: Record<string, unknown>,
  path: string,
): OmmValidationIssue[] {
  if (typeof n.concept !== "string" || (n.concept as string).length === 0) {
    return [
      {
        path: `${path}.concept`,
        message: "Node must have a non-empty concept",
        code: "tree.empty_concept",
      },
    ];
  }
  return [];
}

function checkRuntimeFields(
  n: Record<string, unknown>,
  path: string,
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if ("parentId" in n) {
    issues.push({
      path: `${path}.parentId`,
      message:
        "Persisted runtime field 'parentId' is not allowed in .omm format",
      code: "tree.stale_parentId",
    });
  }

  if ("childIds" in n) {
    issues.push({
      path: `${path}.childIds`,
      message:
        "Persisted runtime field 'childIds' is not allowed in .omm format",
      code: "tree.stale_childIds",
    });
  }

  return issues;
}

function checkNodeId(
  n: Record<string, unknown>,
  path: string,
  ctx: TreeContext,
): OmmValidationIssue[] {
  const nodeId = n.id;
  if (typeof nodeId !== "string" || (nodeId as string).length === 0) {
    return [
      {
        path: `${path}.id`,
        message: "Node must have a non-empty string id",
        code: "tree.empty_id",
      },
    ];
  }

  if (ctx.seenIds.has(nodeId as string)) {
    return [
      {
        path: `${path}.id`,
        message: `Duplicate node id "${nodeId}" (first seen at ${ctx.seenIds.get(nodeId as string)})`,
        code: "tree.duplicate_id",
      },
    ];
  }

  ctx.seenIds.set(nodeId as string, path);
  ctx.nodeIds.set(nodeId as string, true);
  return [];
}

function checkNodeChildren(
  n: Record<string, unknown>,
  parentPath: string,
  ctx: TreeContext,
): void {
  const childNodes = n.children;
  if (childNodes === undefined) return;

  if (!Array.isArray(childNodes)) {
    ctx.issues.push({
      path: `${parentPath}.children`,
      message: "children must be an array",
      code: "tree.invalid_children",
    });
    return;
  }

  for (let i = 0; i < childNodes.length; i++) {
    validateNodeEntry(childNodes[i], `${parentPath}.children[${i}]`, ctx);
  }
}
