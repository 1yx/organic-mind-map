/**
 * Diagnostics and layout snapshot builder.
 *
 * Defines diagnostic types for renderer warnings/errors and builds
 * layout geometry snapshots for .omm export.
 *
 * Environment-neutral — no DOM dependencies.
 */

import type {
  LayoutSnapshot,
  CenterLayout,
  NodeLayout,
  BranchLayout,
  LayoutBox,
  Point,
} from "@omm/core";
import type {
  RenderDiagnostic,
  RenderDiagnosticKind,
  LayoutGeometry,
  BranchGeometry,
  CenterGeometry,
} from "./types.js";

// ─── Diagnostic Helpers ────────────────────────────────────────────────────

/**
 * Create a render diagnostic with the given parameters.
 */
export function createDiagnostic(
  kind: RenderDiagnosticKind,
  message: string,
  options?: {
    nodeId?: string;
    severity?: "info" | "warning" | "error";
  },
): RenderDiagnostic {
  return {
    kind,
    message,
    nodeId: options?.nodeId,
    severity: options?.severity ?? "warning",
  };
}

/**
 * Create a clipped-text diagnostic.
 */
export function clippedTextDiagnostic(
  nodeId: string,
  concept: string,
  maxWidth: number,
  measuredWidth: number,
): RenderDiagnostic {
  return createDiagnostic("clipped-text",
    `Text "${concept}" on node ${nodeId} was clipped: measured width ${measuredWidth.toFixed(1)} exceeds available width ${maxWidth.toFixed(1)}.`,
    { nodeId, severity: "info" },
  );
}

/**
 * Create a missing-asset-fallback diagnostic.
 */
export function missingAssetFallbackDiagnostic(
  reason: string,
): RenderDiagnostic {
  return createDiagnostic("missing-asset-fallback",
    `Center visual asset unavailable (${reason}); using deterministic built-in fallback.`,
    { severity: "info" },
  );
}

/**
 * Create a layout-overflow diagnostic.
 */
export function layoutOverflowDiagnostic(
  nodeId?: string,
): RenderDiagnostic {
  return createDiagnostic("layout-overflow",
    `Branch ${nodeId ?? "(unknown)"} extends beyond paper safe area.`,
    { nodeId, severity: "warning" },
  );
}

/**
 * Create an unresolved-collision diagnostic.
 */
export function unresolvedCollisionDiagnostic(
  nodeId1: string,
  nodeId2: string,
): RenderDiagnostic {
  return createDiagnostic("unresolved-collision",
    `Unresolved overlap between nodes ${nodeId1} and ${nodeId2}.`,
    { severity: "warning" },
  );
}

/**
 * Create a branch-text-crossing diagnostic.
 */
export function branchTextCrossingDiagnostic(
  branchId: string,
  textId: string,
): RenderDiagnostic {
  return createDiagnostic("branch-text-crossing",
    `Branch ${branchId} path crosses text area of node ${textId}.`,
    { severity: "warning" },
  );
}

/**
 * Create a hard-layout-failure diagnostic.
 */
export function hardLayoutFailureDiagnostic(
  reason: string,
): RenderDiagnostic {
  return createDiagnostic("hard-layout-failure",
    `Layout computation failed: ${reason}`,
    { severity: "error" },
  );
}

// ─── Collision Detection ───────────────────────────────────────────────────

/**
 * Check if two axis-aligned bounding boxes overlap.
 */
export function boxesOverlap(
  a: LayoutBox,
  b: LayoutBox,
  padding = 0,
): boolean {
  // Padding shrinks each box inward, so effective area is reduced.
  // Two boxes overlap if their shrunk areas still intersect.
  return (
    a.x + padding < b.x + b.width - padding &&
    a.x + a.width - padding > b.x + padding &&
    a.y + padding < b.y + b.height - padding &&
    a.y + a.height - padding > b.y + padding
  );
}

/**
 * Find all pairs of overlapping bounding boxes.
 * Returns array of [indexA, indexB] pairs (A < B).
 */
export function findOverlaps(
  boxes: LayoutBox[],
  padding = 0,
): Array<[number, number]> {
  const overlaps: Array<[number, number]> = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxesOverlap(boxes[i]!, boxes[j]!, padding)) {
        overlaps.push([i, j]);
      }
    }
  }
  return overlaps;
}

// ─── Layout Snapshot Builder ───────────────────────────────────────────────

/**
 * Build a LayoutSnapshot from computed layout geometry for .omm export.
 */
export function buildLayoutSnapshot(
  layout: LayoutGeometry,
  engineVersion: string = "0.1.0",
): LayoutSnapshot {
  const nodeIds = layout.nodeOrder;
  const centerLayout: CenterLayout = {
    box: layout.center.boundingBox,
  };

  const nodes: Record<string, NodeLayout> = {};
  const branches: Record<string, BranchLayout> = {};

  for (const nodeId of nodeIds) {
    const branch = layout.branches[nodeId];
    if (!branch) continue;

    nodes[nodeId] = {
      nodeId,
      textAnchor: branch.endPoint,
      textBox: branch.textBoundingBox,
    };

    branches[nodeId] = {
      nodeId,
      branchPath: branch.branchPath,
      textPath: branch.textPath,
      strokeWidthStart: branch.strokeWidthStart,
      strokeWidthEnd: branch.strokeWidthEnd,
    };
  }

  const vbParts = layout.viewBox.split(" ").map(Number);
  const vw = vbParts[2] ?? 0;
  const vh = vbParts[3] ?? 0;

  return {
    engineVersion,
    measuredAt: new Date().toISOString(),
    viewport: {
      widthPx: Math.round(vw ?? 0),
      heightPx: Math.round(vh ?? 0),
      viewBox: layout.viewBox,
    },
    center: centerLayout,
    nodes,
    branches,
  };
}

// ─── Paper Bounds Computation ──────────────────────────────────────────────

/**
 * Compute paper bounds and safe area in SVG units.
 * 10 SVG units = 1mm, so 420mm = 4200 SVG units for A3 landscape.
 */
export function computePaperLayout(
  paperKind: "a3-landscape" | "a4-landscape",
  marginRatio: number = 0.05,
): {
  paperBounds: LayoutBox;
  safeArea: LayoutBox;
  viewBox: string;
  centerPoint: Point;
} {
  const specs: Record<string, { width: number; height: number }> = {
    "a3-landscape": { width: 4200, height: 2970 },
    "a4-landscape": { width: 2970, height: 2100 },
  };

  const spec = specs[paperKind]!;
  const paperBounds: LayoutBox = { x: 0, y: 0, width: spec.width, height: spec.height };

  const mx = spec.width * marginRatio;
  const my = spec.height * marginRatio;
  const safeArea: LayoutBox = {
    x: mx,
    y: my,
    width: spec.width - 2 * mx,
    height: spec.height - 2 * my,
  };

  const centerPoint: Point = {
    x: spec.width / 2,
    y: spec.height / 2,
  };

  const viewBox = `0 0 ${spec.width} ${spec.height}`;

  return { paperBounds, safeArea, viewBox, centerPoint };
}
