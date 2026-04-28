import type { OmmValidationIssue } from "./types";

/**
 * Validates the layout snapshot.
 *
 * - Checks required top-level fields: engineVersion, measuredAt, viewport, center, nodes, branches.
 * - Validates required geometry fields in node layouts (nodeId, textAnchor, textBox).
 * - Validates required geometry fields in branch layouts (nodeId, branchPath, textPath, strokeWidthStart, strokeWidthEnd).
 * - Validates every layout node/branch reference points to an existing semantic node ID.
 */

type LayoutContext = {
  nodeIds: ReadonlyMap<string, true>;
  issues: OmmValidationIssue[];
};

function checkLayoutRoot(
  layout: unknown,
  path: string,
  issues: OmmValidationIssue[],
): Record<string, unknown> | null {
  if (!layout || typeof layout !== "object") {
    issues.push({
      path,
      message: "Layout must be an object",
      code: "layout.missing",
    });
    return null;
  }
  return layout as Record<string, unknown>;
}

function validateTopLevelStrings(
  l: Record<string, unknown>,
  path: string,
  issues: OmmValidationIssue[],
): void {
  for (const field of ["engineVersion", "measuredAt"] as const) {
    if (typeof l[field] !== "string" || (l[field] as string).length === 0) {
      issues.push({
        path: `${path}.${field}`,
        message: `"${field}" must be a non-empty string`,
        code: `layout.missing_${field}`,
      });
    }
  }
}

function validateViewport(
  l: Record<string, unknown>,
  path: string,
  issues: OmmValidationIssue[],
): void {
  const viewport = l.viewport;
  if (!viewport || typeof viewport !== "object") {
    issues.push({
      path: `${path}.viewport`,
      message: "viewport must be an object",
      code: "layout.missing_viewport",
    });
    return;
  }
  const v = viewport as Record<string, unknown>;
  for (const field of ["widthPx", "heightPx", "viewBox"] as const) {
    if (v[field] === undefined) {
      issues.push({
        path: `${path}.viewport.${field}`,
        message: `viewport.${field} is required`,
        code: `layout.missing_viewport_${field}`,
      });
    }
  }
}

function validateCenterLayout(
  l: Record<string, unknown>,
  path: string,
  issues: OmmValidationIssue[],
): void {
  const center = l.center;
  if (!center || typeof center !== "object") {
    issues.push({
      path: `${path}.center`,
      message: "center layout must be an object",
      code: "layout.missing_center",
    });
    return;
  }
  const c = center as Record<string, unknown>;
  if (!c.box || typeof c.box !== "object") {
    issues.push({
      path: `${path}.center.box`,
      message: "center.box must be an object",
      code: "layout.missing_center_box",
    });
  }
}

function validateTextAnchor(
  nl: Record<string, unknown>,
  nodePath: string,
  issues: OmmValidationIssue[],
): void {
  if (!nl.textAnchor || typeof nl.textAnchor !== "object") {
    issues.push({
      path: `${nodePath}.textAnchor`,
      message: "textAnchor must be an object with x, y",
      code: "layout.missing_textAnchor",
    });
    return;
  }
  const ta = nl.textAnchor as Record<string, unknown>;
  if (typeof ta.x !== "number" || typeof ta.y !== "number") {
    issues.push({
      path: `${nodePath}.textAnchor`,
      message: "textAnchor must have numeric x and y",
      code: "layout.invalid_textAnchor",
    });
  }
}

function validateTextBox(
  nl: Record<string, unknown>,
  nodePath: string,
  issues: OmmValidationIssue[],
): void {
  if (!nl.textBox || typeof nl.textBox !== "object") {
    issues.push({
      path: `${nodePath}.textBox`,
      message: "textBox must be an object",
      code: "layout.missing_textBox",
    });
    return;
  }
  const tb = nl.textBox as Record<string, unknown>;
  for (const field of ["x", "y", "width", "height"] as const) {
    if (typeof tb[field] !== "number") {
      issues.push({
        path: `${nodePath}.textBox.${field}`,
        message: `textBox.${field} must be a number`,
        code: `layout.invalid_textBox_${field}`,
      });
    }
  }
}

function validateSingleNodeLayout(opts: {
  nodeId: string;
  nodeLayout: unknown;
  nodePath: string;
  ctx: LayoutContext;
}): void {
  const { nodeId, nodePath, ctx } = opts;
  const { issues } = ctx;
  const nodeLayout = opts.nodeLayout;
  if (!nodeLayout || typeof nodeLayout !== "object") {
    issues.push({
      path: nodePath,
      message: `Node layout for "${nodeId}" must be an object`,
      code: "layout.invalid_node_layout",
    });
    return;
  }
  const nl = nodeLayout as Record<string, unknown>;

  if (nl.nodeId !== nodeId) {
    issues.push({
      path: `${nodePath}.nodeId`,
      message: `nodeId "${String(nl.nodeId)}" does not match key "${nodeId}"`,
      code: "layout.node_id_mismatch",
    });
  }

  validateTextAnchor(nl, nodePath, issues);
  validateTextBox(nl, nodePath, issues);
}

function validateNodeLayouts(opts: {
  l: Record<string, unknown>;
  path: string;
  ctx: LayoutContext;
}): void {
  const { l, path, ctx } = opts;
  const { nodeIds, issues } = ctx;
  const nodes = l.nodes;
  if (!nodes || typeof nodes !== "object" || Array.isArray(nodes)) {
    issues.push({
      path: `${path}.nodes`,
      message: "nodes must be a record",
      code: "layout.missing_nodes",
    });
    return;
  }
  const nodesMap = nodes as Record<string, unknown>;
  for (const nodeId of Object.keys(nodesMap)) {
    const nodePath = `${path}.nodes.${nodeId}`;
    if (!nodeIds.has(nodeId)) {
      issues.push({
        path: nodePath,
        message: `Layout references unknown node id "${nodeId}"`,
        code: "layout.unknown_node_ref",
      });
    }
    validateSingleNodeLayout({
      nodeId,
      nodeLayout: nodesMap[nodeId],
      nodePath,
      ctx,
    });
  }
}

function validateBranchFields(
  bl: Record<string, unknown>,
  branchPath: string,
  issues: OmmValidationIssue[],
): void {
  for (const field of [
    "branchPath",
    "textPath",
    "strokeWidthStart",
    "strokeWidthEnd",
  ] as const) {
    if (field === "strokeWidthStart" || field === "strokeWidthEnd") {
      if (typeof bl[field] !== "number") {
        issues.push({
          path: `${branchPath}.${field}`,
          message: `${field} must be a number`,
          code: `layout.invalid_branch_${field}`,
        });
      }
    } else {
      if (typeof bl[field] !== "string" || (bl[field] as string).length === 0) {
        issues.push({
          path: `${branchPath}.${field}`,
          message: `${field} must be a non-empty string`,
          code: `layout.invalid_branch_${field}`,
        });
      }
    }
  }
}

function validateSingleBranchLayout(opts: {
  nodeId: string;
  branchLayout: unknown;
  branchPath: string;
  ctx: LayoutContext;
}): void {
  const { nodeId, branchPath, ctx } = opts;
  const { issues } = ctx;
  const branchLayout = opts.branchLayout;
  if (!branchLayout || typeof branchLayout !== "object") {
    issues.push({
      path: branchPath,
      message: `Branch layout for "${nodeId}" must be an object`,
      code: "layout.invalid_branch_layout",
    });
    return;
  }
  const bl = branchLayout as Record<string, unknown>;

  if (bl.nodeId !== nodeId) {
    issues.push({
      path: `${branchPath}.nodeId`,
      message: `nodeId "${String(bl.nodeId)}" does not match key "${nodeId}"`,
      code: "layout.branch_id_mismatch",
    });
  }

  validateBranchFields(bl, branchPath, issues);
}

function validateBranchLayouts(opts: {
  l: Record<string, unknown>;
  path: string;
  ctx: LayoutContext;
}): void {
  const { l, path, ctx } = opts;
  const { nodeIds, issues } = ctx;
  const branches = l.branches;
  if (!branches || typeof branches !== "object" || Array.isArray(branches)) {
    issues.push({
      path: `${path}.branches`,
      message: "branches must be a record",
      code: "layout.missing_branches",
    });
    return;
  }
  const branchesMap = branches as Record<string, unknown>;
  for (const nodeId of Object.keys(branchesMap)) {
    const branchPath = `${path}.branches.${nodeId}`;
    if (!nodeIds.has(nodeId)) {
      issues.push({
        path: branchPath,
        message: `Branch layout references unknown node id "${nodeId}"`,
        code: "layout.unknown_branch_ref",
      });
    }
    validateSingleBranchLayout({
      nodeId,
      branchLayout: branchesMap[nodeId],
      branchPath,
      ctx,
    });
  }
}

export function validateLayout(
  layout: unknown,
  nodeIds: ReadonlyMap<string, true>,
  path = "layout",
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  const l = checkLayoutRoot(layout, path, issues);
  if (!l) return issues;

  const ctx: LayoutContext = { nodeIds, issues };

  validateTopLevelStrings(l, path, issues);
  validateViewport(l, path, issues);
  validateCenterLayout(l, path, issues);
  validateNodeLayouts({ l, path, ctx });
  validateBranchLayouts({ l, path, ctx });

  return issues;
}
