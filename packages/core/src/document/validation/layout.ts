import type { OmmValidationIssue } from "./types";

/**
 * Validates the layout snapshot.
 *
 * - Checks required top-level fields: engineVersion, measuredAt, viewport, center, nodes, branches.
 * - Validates required geometry fields in node layouts (nodeId, textAnchor, textBox).
 * - Validates required geometry fields in branch layouts (nodeId, branchPath, textPath, strokeWidthStart, strokeWidthEnd).
 * - Validates every layout node/branch reference points to an existing semantic node ID.
 */
export function validateLayout(
  layout: unknown,
  nodeIds: ReadonlyMap<string, true>,
  path = "layout",
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (!layout || typeof layout !== "object") {
    issues.push({ path, message: "Layout must be an object", code: "layout.missing" });
    return issues;
  }

  const l = layout as Record<string, unknown>;

  // Required top-level fields
  for (const field of ["engineVersion", "measuredAt"] as const) {
    if (typeof l[field] !== "string" || (l[field] as string).length === 0) {
      issues.push({
        path: `${path}.${field}`,
        message: `"${field}" must be a non-empty string`,
        code: `layout.missing_${field}`,
      });
    }
  }

  // Viewport validation
  const viewport = l.viewport;
  if (!viewport || typeof viewport !== "object") {
    issues.push({ path: `${path}.viewport`, message: "viewport must be an object", code: "layout.missing_viewport" });
  } else {
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

  // Center layout
  const center = l.center;
  if (!center || typeof center !== "object") {
    issues.push({ path: `${path}.center`, message: "center layout must be an object", code: "layout.missing_center" });
  } else {
    const c = center as Record<string, unknown>;
    if (!c.box || typeof c.box !== "object") {
      issues.push({ path: `${path}.center.box`, message: "center.box must be an object", code: "layout.missing_center_box" });
    }
  }

  // Nodes layout
  const nodes = l.nodes;
  if (!nodes || typeof nodes !== "object" || Array.isArray(nodes)) {
    issues.push({ path: `${path}.nodes`, message: "nodes must be a record", code: "layout.missing_nodes" });
  } else {
    const nodesMap = nodes as Record<string, unknown>;
    for (const nodeId of Object.keys(nodesMap)) {
      if (!nodeIds.has(nodeId)) {
        issues.push({
          path: `${path}.nodes.${nodeId}`,
          message: `Layout references unknown node id "${nodeId}"`,
          code: "layout.unknown_node_ref",
        });
      }
      const nodeLayout = nodesMap[nodeId];
      if (!nodeLayout || typeof nodeLayout !== "object") {
        issues.push({
          path: `${path}.nodes.${nodeId}`,
          message: `Node layout for "${nodeId}" must be an object`,
          code: "layout.invalid_node_layout",
        });
        continue;
      }
      const nl = nodeLayout as Record<string, unknown>;

      // Check required nodeId matches key
      if (nl.nodeId !== nodeId) {
        issues.push({
          path: `${path}.nodes.${nodeId}.nodeId`,
          message: `nodeId "${String(nl.nodeId)}" does not match key "${nodeId}"`,
          code: "layout.node_id_mismatch",
        });
      }

      // textAnchor
      if (!nl.textAnchor || typeof nl.textAnchor !== "object") {
        issues.push({
          path: `${path}.nodes.${nodeId}.textAnchor`,
          message: "textAnchor must be an object with x, y",
          code: "layout.missing_textAnchor",
        });
      } else {
        const ta = nl.textAnchor as Record<string, unknown>;
        if (typeof ta.x !== "number" || typeof ta.y !== "number") {
          issues.push({
            path: `${path}.nodes.${nodeId}.textAnchor`,
            message: "textAnchor must have numeric x and y",
            code: "layout.invalid_textAnchor",
          });
        }
      }

      // textBox
      if (!nl.textBox || typeof nl.textBox !== "object") {
        issues.push({
          path: `${path}.nodes.${nodeId}.textBox`,
          message: "textBox must be an object",
          code: "layout.missing_textBox",
        });
      } else {
        const tb = nl.textBox as Record<string, unknown>;
        for (const field of ["x", "y", "width", "height"] as const) {
          if (typeof tb[field] !== "number") {
            issues.push({
              path: `${path}.nodes.${nodeId}.textBox.${field}`,
              message: `textBox.${field} must be a number`,
              code: `layout.invalid_textBox_${field}`,
            });
          }
        }
      }
    }
  }

  // Branches layout
  const branches = l.branches;
  if (!branches || typeof branches !== "object" || Array.isArray(branches)) {
    issues.push({ path: `${path}.branches`, message: "branches must be a record", code: "layout.missing_branches" });
  } else {
    const branchesMap = branches as Record<string, unknown>;
    for (const nodeId of Object.keys(branchesMap)) {
      if (!nodeIds.has(nodeId)) {
        issues.push({
          path: `${path}.branches.${nodeId}`,
          message: `Branch layout references unknown node id "${nodeId}"`,
          code: "layout.unknown_branch_ref",
        });
      }
      const branchLayout = branchesMap[nodeId];
      if (!branchLayout || typeof branchLayout !== "object") {
        issues.push({
          path: `${path}.branches.${nodeId}`,
          message: `Branch layout for "${nodeId}" must be an object`,
          code: "layout.invalid_branch_layout",
        });
        continue;
      }
      const bl = branchLayout as Record<string, unknown>;

      if (bl.nodeId !== nodeId) {
        issues.push({
          path: `${path}.branches.${nodeId}.nodeId`,
          message: `nodeId "${String(bl.nodeId)}" does not match key "${nodeId}"`,
          code: "layout.branch_id_mismatch",
        });
      }

      for (const field of ["branchPath", "textPath", "strokeWidthStart", "strokeWidthEnd"] as const) {
        if (field === "strokeWidthStart" || field === "strokeWidthEnd") {
          if (typeof bl[field] !== "number") {
            issues.push({
              path: `${path}.branches.${nodeId}.${field}`,
              message: `${field} must be a number`,
              code: `layout.invalid_branch_${field}`,
            });
          }
        } else {
          if (typeof bl[field] !== "string" || (bl[field] as string).length === 0) {
            issues.push({
              path: `${path}.branches.${nodeId}.${field}`,
              message: `${field} must be a non-empty string`,
              code: `layout.invalid_branch_${field}`,
            });
          }
        }
      }
    }
  }

  return issues;
}
