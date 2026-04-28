import type { OmmValidationIssue } from "./types";

/**
 * Excluded state fields that must not appear in .omm documents.
 *
 * These fields represent editor state, render artifacts, Plus platform
 * state, and source/submap data that should never be persisted in the
 * .omm format.
 */

/** Editor state fields to reject */
const EDITOR_STATE_FIELDS = ["selection", "dragSession", "undoStack"] as const;

/** Render artifact fields to reject on nodes */
const RENDER_ARTIFACT_FIELDS = [
  "displayText",
  "ellipsisText",
  "truncationText",
] as const;

/** Plus platform state fields to reject */
const PLUS_STATE_FIELDS = [
  "cloudPermissions",
  "ragIndex",
  "versionHistory",
] as const;

/** Source/submap state fields to reject */
const SOURCE_STATE_FIELDS = [
  "sourceSnapshots",
  "sourceObjectMappings",
  "submapNavigation",
] as const;

const ALL_EXCLUDED_NODE_FIELDS: readonly string[] = [
  ...EDITOR_STATE_FIELDS,
  ...RENDER_ARTIFACT_FIELDS,
  ...PLUS_STATE_FIELDS,
  ...SOURCE_STATE_FIELDS,
] as const;

const ALL_EXCLUDED_ROOTMAP_FIELDS: readonly string[] = [
  ...EDITOR_STATE_FIELDS,
  ...PLUS_STATE_FIELDS,
  ...SOURCE_STATE_FIELDS,
] as const;

const ALL_EXCLUDED_DOC_FIELDS: readonly string[] = [
  ...EDITOR_STATE_FIELDS,
  ...PLUS_STATE_FIELDS,
  ...SOURCE_STATE_FIELDS,
] as const;

/**
 * Checks an object for excluded fields and returns validation issues.
 */
function checkObjectExcludedFields(
  obj: Record<string, unknown>,
  excludedFields: readonly string[],
  path: string,
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];
  for (const field of excludedFields) {
    if (field in obj) {
      issues.push({
        path: `${path}.${field}`,
        message: `Excluded field "${field}" is not allowed in .omm format`,
        code: `excluded_state.${field}`,
      });
    }
  }
  return issues;
}

/**
 * Checks a node for excluded state fields (editor state + render artifacts + Plus + source).
 */
export function checkNodeExcludedState(
  node: Record<string, unknown>,
  path: string,
): OmmValidationIssue[] {
  return checkObjectExcludedFields(node, ALL_EXCLUDED_NODE_FIELDS, path);
}

/**
 * Checks the rootMap for excluded state fields (editor state + Plus + source).
 */
export function checkRootMapExcludedState(
  rootMap: Record<string, unknown>,
  path = "rootMap",
): OmmValidationIssue[] {
  return checkObjectExcludedFields(rootMap, ALL_EXCLUDED_ROOTMAP_FIELDS, path);
}

/**
 * Checks the document for excluded state fields (editor state + Plus + source).
 */
export function checkDocExcludedState(
  doc: Record<string, unknown>,
  path = "",
): OmmValidationIssue[] {
  return checkObjectExcludedFields(doc, ALL_EXCLUDED_DOC_FIELDS, path);
}

/**
 * Recursively walks the tree and checks every node for excluded state.
 */
export function checkTreeExcludedState(
  children: unknown[],
  basePath = "rootMap.children",
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (!Array.isArray(children)) return issues;

  children.forEach((node, i) => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    const nodePath = `${basePath}[${i}]`;
    issues.push(...checkNodeExcludedState(n, nodePath));

    const childNodes = n.children;
    if (childNodes !== undefined && Array.isArray(childNodes)) {
      issues.push(
        ...checkTreeExcludedState(childNodes, `${nodePath}.children`),
      );
    }
  });

  return issues;
}

/**
 * Runs all excluded-state checks: document level, rootMap level, and tree level.
 */
export function checkExcludedState(doc: unknown): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (!doc || typeof doc !== "object") return issues;

  const d = doc as Record<string, unknown>;

  // Document-level checks
  issues.push(...checkDocExcludedState(d));

  // rootMap-level checks
  const rootMap = d.rootMap;
  if (rootMap && typeof rootMap === "object" && !Array.isArray(rootMap)) {
    const rm = rootMap as Record<string, unknown>;
    issues.push(...checkRootMapExcludedState(rm));

    // Tree-level checks
    const children = rm.children;
    if (children !== undefined && Array.isArray(children)) {
      issues.push(...checkTreeExcludedState(children));
    }
  }

  return issues;
}
