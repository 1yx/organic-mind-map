import type { OmmValidationIssue } from "./types";

type LayoutContext = {
  nodeIds: ReadonlyMap<string, true>;
  path: string;
};

export function validateLayout(
  layout: unknown,
  nodeIds: ReadonlyMap<string, true>,
  path = "layout",
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (!layout || typeof layout !== "object") {
    issues.push({
      path,
      message: "Layout must be an object",
      code: "layout.missing",
    });
    return issues;
  }

  const l = layout as Record<string, unknown>;
  const ctx: LayoutContext = { nodeIds, path };

  issues.push(...validateLayoutMeta(l, path));
  issues.push(...validateViewport(l.viewport, path));
  issues.push(...validateCenterLayout(l.center, path));
  issues.push(...validateNodesLayout(l.nodes, ctx));
  issues.push(...validateBranchesLayout(l.branches, ctx));

  return issues;
}

function validateLayoutMeta(
  l: Record<string, unknown>,
  path: string,
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];
  for (const field of ["engineVersion", "measuredAt"] as const) {
    if (typeof l[field] !== "string" || (l[field] as string).length === 0) {
      issues.push({
        path: `${path}.${field}`,
        message: `"${field}" must be a non-empty string`,
        code: `layout.missing_${field}`,
      });
    }
  }
  return issues;
}

function validateViewport(
  viewport: unknown,
  path: string,
): OmmValidationIssue[] {
  if (!viewport || typeof viewport !== "object") {
    return [
      {
        path: `${path}.viewport`,
        message: "viewport must be an object",
        code: "layout.missing_viewport",
      },
    ];
  }

  const v = viewport as Record<string, unknown>;
  const issues: OmmValidationIssue[] = [];
  for (const field of ["widthPx", "heightPx", "viewBox"] as const) {
    if (v[field] === undefined) {
      issues.push({
        path: `${path}.viewport.${field}`,
        message: `viewport.${field} is required`,
        code: `layout.missing_viewport_${field}`,
      });
    }
  }
  return issues;
}

function validateCenterLayout(
  center: unknown,
  path: string,
): OmmValidationIssue[] {
  if (!center || typeof center !== "object") {
    return [
      {
        path: `${path}.center`,
        message: "center layout must be an object",
        code: "layout.missing_center",
      },
    ];
  }

  const c = center as Record<string, unknown>;
  if (!c.box || typeof c.box !== "object") {
    return [
      {
        path: `${path}.center.box`,
        message: "center.box must be an object",
        code: "layout.missing_center_box",
      },
    ];
  }
  return [];
}

function validateNodesLayout(
  nodes: unknown,
  ctx: LayoutContext,
): OmmValidationIssue[] {
  if (!nodes || typeof nodes !== "object" || Array.isArray(nodes)) {
    return [
      {
        path: `${ctx.path}.nodes`,
        message: "nodes must be a record",
        code: "layout.missing_nodes",
      },
    ];
  }

  const issues: OmmValidationIssue[] = [];
  const nodesMap = nodes as Record<string, unknown>;

  for (const nodeId of Object.keys(nodesMap)) {
    issues.push(...validateNodeEntry(nodesMap[nodeId], nodeId, ctx));
  }
  return issues;
}

function validateNodeEntry(
  nodeLayout: unknown,
  nodeId: string,
  ctx: LayoutContext,
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];
  const entryPath = `${ctx.path}.nodes.${nodeId}`;

  if (!ctx.nodeIds.has(nodeId)) {
    issues.push({
      path: entryPath,
      message: `Layout references unknown node id "${nodeId}"`,
      code: "layout.unknown_node_ref",
    });
  }

  if (!nodeLayout || typeof nodeLayout !== "object") {
    issues.push({
      path: entryPath,
      message: `Node layout for "${nodeId}" must be an object`,
      code: "layout.invalid_node_layout",
    });
    return issues;
  }

  const nl = nodeLayout as Record<string, unknown>;

  if (nl.nodeId !== nodeId) {
    issues.push({
      path: `${entryPath}.nodeId`,
      message: `nodeId "${String(nl.nodeId)}" does not match key "${nodeId}"`,
      code: "layout.node_id_mismatch",
    });
  }

  issues.push(...validateTextAnchor(nl.textAnchor, nodeId, ctx.path));
  issues.push(...validateTextBox(nl.textBox, nodeId, ctx.path));

  return issues;
}

function validateTextAnchor(
  textAnchor: unknown,
  nodeId: string,
  path: string,
): OmmValidationIssue[] {
  const anchorPath = `${path}.nodes.${nodeId}.textAnchor`;

  if (!textAnchor || typeof textAnchor !== "object") {
    return [
      {
        path: anchorPath,
        message: "textAnchor must be an object with x, y",
        code: "layout.missing_textAnchor",
      },
    ];
  }

  const ta = textAnchor as Record<string, unknown>;
  if (typeof ta.x !== "number" || typeof ta.y !== "number") {
    return [
      {
        path: anchorPath,
        message: "textAnchor must have numeric x and y",
        code: "layout.invalid_textAnchor",
      },
    ];
  }
  return [];
}

function validateTextBox(
  textBox: unknown,
  nodeId: string,
  path: string,
): OmmValidationIssue[] {
  const boxPath = `${path}.nodes.${nodeId}.textBox`;

  if (!textBox || typeof textBox !== "object") {
    return [
      {
        path: boxPath,
        message: "textBox must be an object",
        code: "layout.missing_textBox",
      },
    ];
  }

  const tb = textBox as Record<string, unknown>;
  const issues: OmmValidationIssue[] = [];
  for (const field of ["x", "y", "width", "height"] as const) {
    if (typeof tb[field] !== "number") {
      issues.push({
        path: `${boxPath}.${field}`,
        message: `textBox.${field} must be a number`,
        code: `layout.invalid_textBox_${field}`,
      });
    }
  }
  return issues;
}

function validateBranchesLayout(
  branches: unknown,
  ctx: LayoutContext,
): OmmValidationIssue[] {
  if (!branches || typeof branches !== "object" || Array.isArray(branches)) {
    return [
      {
        path: `${ctx.path}.branches`,
        message: "branches must be a record",
        code: "layout.missing_branches",
      },
    ];
  }

  const issues: OmmValidationIssue[] = [];
  const branchesMap = branches as Record<string, unknown>;

  for (const nodeId of Object.keys(branchesMap)) {
    issues.push(...validateBranchEntry(branchesMap[nodeId], nodeId, ctx));
  }
  return issues;
}

function validateBranchEntry(
  branchLayout: unknown,
  nodeId: string,
  ctx: LayoutContext,
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];
  const entryPath = `${ctx.path}.branches.${nodeId}`;

  if (!ctx.nodeIds.has(nodeId)) {
    issues.push({
      path: entryPath,
      message: `Branch layout references unknown node id "${nodeId}"`,
      code: "layout.unknown_branch_ref",
    });
  }

  if (!branchLayout || typeof branchLayout !== "object") {
    issues.push({
      path: entryPath,
      message: `Branch layout for "${nodeId}" must be an object`,
      code: "layout.invalid_branch_layout",
    });
    return issues;
  }

  const bl = branchLayout as Record<string, unknown>;

  if (bl.nodeId !== nodeId) {
    issues.push({
      path: `${entryPath}.nodeId`,
      message: `nodeId "${String(bl.nodeId)}" does not match key "${nodeId}"`,
      code: "layout.branch_id_mismatch",
    });
  }

  issues.push(...validateBranchFields(bl, nodeId, ctx.path));

  return issues;
}

function validateBranchFields(
  bl: Record<string, unknown>,
  nodeId: string,
  path: string,
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];
  const entryPath = `${path}.branches.${nodeId}`;

  for (const field of [
    "branchPath",
    "textPath",
    "strokeWidthStart",
    "strokeWidthEnd",
  ] as const) {
    if (field === "strokeWidthStart" || field === "strokeWidthEnd") {
      if (typeof bl[field] !== "number") {
        issues.push({
          path: `${entryPath}.${field}`,
          message: `${field} must be a number`,
          code: `layout.invalid_branch_${field}`,
        });
      }
    } else if (
      typeof bl[field] !== "string" ||
      (bl[field] as string).length === 0
    ) {
      issues.push({
        path: `${entryPath}.${field}`,
        message: `${field} must be a non-empty string`,
        code: `layout.invalid_branch_${field}`,
      });
    }
  }
  return issues;
}
