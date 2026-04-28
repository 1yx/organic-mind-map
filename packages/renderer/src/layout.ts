/**
 * Measurement adapter and layout computation engine.
 *
 * Computes branch positions, bounding boxes, and collision corrections.
 * Uses a pluggable TextMeasurementAdapter so tests can mock Canvas.
 * NEVER mounts hidden DOM/SVG elements or calls getBBox().
 *
 * Coordinate system: 10 SVG units = 1mm.
 * A3 landscape viewBox: "0 0 4200 2970"
 * A4 landscape viewBox: "0 0 2970 2100"
 */

import type { AgentMindMapList, LayoutBox, Point } from "@omm/core";
import type {
  TextMeasurementAdapter,
  TextMetrics,
  RenderDiagnostic,
  BranchGeometry,
  LayoutGeometry,
  CenterGeometry,
  LayoutNode,
  BranchSector,
} from "./types.js";
import {
  stableSerializeTree,
  deriveOrganicSeed,
  buildLayoutTree,
  assignBranchSectors,
} from "./seed.js";
import { computePaperLayout, boxesOverlap } from "./diagnostics.js";
import {
  clippedTextDiagnostic,
  layoutOverflowDiagnostic,
  unresolvedCollisionDiagnostic,
} from "./diagnostics.js";

// ─── Default Text Measurement (heuristic) ──────────────────────────────────

/**
 * Character-width heuristic when no Canvas adapter is available.
 * Approximate: each character is roughly 0.6 × fontSize wide for English.
 * This is intentionally conservative.
 */
const CHAR_WIDTH_RATIO = 0.6;

function defaultMeasure(text: string, fontSize: number): TextMetrics {
  const width = text.length * fontSize * CHAR_WIDTH_RATIO;
  const height = fontSize * 1.2;
  return {
    width,
    height,
    ascent: fontSize * 0.9,
    descent: fontSize * 0.3,
  };
}

/**
 * Create a default text measurement adapter using heuristic widths.
 */
export function createDefaultMeasurementAdapter(): TextMeasurementAdapter {
  return {
    measureText(text: string, options: { fontSize: number }): TextMetrics {
      return defaultMeasure(text, options.fontSize);
    },
  };
}

/**
 * Create a Canvas-based text measurement adapter.
 * Only works in environments with OffscreenCanvas or document.createElement.
 */
export function createCanvasMeasurementAdapter(
  fontFamily = "Arial, Helvetica, sans-serif",
): TextMeasurementAdapter | null {
  try {
    // Try OffscreenCanvas first (modern browsers)
    let ctx: {
      font: string;
      measureText(text: string): {
        width: number;
        actualBoundingBoxAscent?: number;
        actualBoundingBoxDescent?: number;
      };
    } | null = null;

    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(1, 1);
      ctx = canvas.getContext("2d");
    } else if (typeof document !== "undefined") {
      // Fallback to regular canvas
      const canvas = document.createElement("canvas");
      ctx = canvas.getContext("2d");
    }

    if (!ctx) return null;

    return {
      measureText(
        text: string,
        options: { fontSize: number; fontWeight?: string },
      ): TextMetrics {
        ctx.font = `${options.fontWeight ?? "normal"} ${options.fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText(text);
        return {
          width: metrics.width,
          height: options.fontSize * 1.2,
          ascent: metrics.actualBoundingBoxAscent ?? options.fontSize * 0.9,
          descent: metrics.actualBoundingBoxDescent ?? options.fontSize * 0.3,
        };
      },
    };
  } catch {
    return null;
  }
}

// ─── Font Size by Depth ────────────────────────────────────────────────────

const FONT_SIZES: Record<number, number> = {
  1: 80, // Main branch: large text
  2: 56, // Sub-branch: medium text
  3: 42, // Leaf: smaller text
};

function getFontSize(depth: number): number {
  return FONT_SIZES[depth] ?? 42;
}

// ─── Stroke Widths by Depth ────────────────────────────────────────────────

const STROKE_WIDTHS: Record<number, { start: number; end: number }> = {
  1: { start: 28, end: 8 }, // Main: thick taper
  2: { start: 16, end: 4 }, // Sub: medium taper
  3: { start: 10, end: 2 }, // Leaf: thin taper
};

function getStrokeWidths(depth: number): { start: number; end: number } {
  return STROKE_WIDTHS[depth] ?? { start: 10, end: 2 };
}

// ─── Branch Length Computation ─────────────────────────────────────────────

/**
 * Compute default branch length based on paper size and depth.
 */
function getDefaultBranchLength(
  depth: number,
  paperWidth: number,
  childCount: number,
): number {
  const baseLength = paperWidth * 0.14;
  const depthFactor = depth === 1 ? 1 : depth === 2 ? 0.7 : 0.5;
  // Slightly shorter if many children share the space
  const siblingFactor = childCount > 1 ? 1 / Math.cbrt(childCount) : 1;
  return baseLength * depthFactor * siblingFactor;
}

// ─── Path Generation ───────────────────────────────────────────────────────

/**
 * Generate a quadratic Bezier curve from start to end with a control point.
 * The control point is offset perpendicular to the direct line.
 */
function generateQuadraticBezier(
  start: Point,
  end: Point,
  curvature: number,
): string {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  // Perpendicular offset
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const offset = len * curvature * 0.3;
  const cpX = midX + nx * offset;
  const cpY = midY + ny * offset;

  return `M${start.x.toFixed(1)},${start.y.toFixed(1)} Q${cpX.toFixed(1)},${cpY.toFixed(1)} ${end.x.toFixed(1)},${end.y.toFixed(1)}`;
}

/**
 * Generate a cubic Bezier curve from start to end with two control points
 * for more organic-looking branches.
 */
function generateCubicBezier(
  start: Point,
  end: Point,
  curvature: number,
  side: "left" | "right",
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const offset1 = len * curvature * 0.15;
  const offset2 = len * curvature * 0.25;

  const sign = side === "left" ? -1 : 1;

  const cp1X = start.x + dx * 0.33 + nx * offset1 * sign;
  const cp1Y = start.y + dy * 0.33 + ny * offset1 * sign;
  const cp2X = start.x + dx * 0.66 + nx * offset2 * sign;
  const cp2Y = start.y + dy * 0.66 + ny * offset2 * sign;

  return `M${start.x.toFixed(1)},${start.y.toFixed(1)} C${cp1X.toFixed(1)},${cp1Y.toFixed(1)} ${cp2X.toFixed(1)},${cp2Y.toFixed(1)} ${end.x.toFixed(1)},${end.y.toFixed(1)}`;
}

// ─── Main Layout Function ──────────────────────────────────────────────────

export type LayoutResult = {
  geometry: LayoutGeometry;
  diagnostics: RenderDiagnostic[];
  contentHash: number;
  organicSeed: number;
};

/**
 * Compute the full layout for a mind map tree.
 *
 * This function:
 * 1. Derives the organic seed from the tree
 * 2. Builds the layout tree with seeded geometry
 * 3. Assigns sectors to main branches
 * 4. Places all branches recursively
 * 5. Computes bounding boxes
 * 6. Runs collision detection
 * 7. Clips text where needed
 */
export function computeLayout(
  tree: AgentMindMapList,
  paperKind: "a3-landscape" | "a4-landscape",
  centerVisualSvg: string,
  centerUsedFallback: boolean,
  measure: TextMeasurementAdapter,
  marginRatio: number = 0.05,
): LayoutResult {
  const diagnostics: RenderDiagnostic[] = [];

  // 1. Derive seed
  const serialized = stableSerializeTree(tree);
  const contentHash = deriveOrganicSeed(serialized);
  const organicSeed = contentHash;

  // 2. Paper layout
  const { paperBounds, safeArea, viewBox, centerPoint } = computePaperLayout(
    paperKind,
    marginRatio,
  );

  // 3. Center visual bounds
  const centerVisualSize =
    Math.min(paperBounds.width, paperBounds.height) * 0.12;
  const centerBounds: LayoutBox = {
    x: centerPoint.x - centerVisualSize / 2,
    y: centerPoint.y - centerVisualSize / 2,
    width: centerVisualSize,
    height: centerVisualSize,
  };

  const centerGeometry: CenterGeometry = {
    boundingBox: centerBounds,
    centerPoint,
    svgContent: centerVisualSvg,
    usedFallback: centerUsedFallback,
  };

  // 4. Build layout tree
  const layoutNodes = buildLayoutTree(tree, organicSeed);

  // 5. Assign sectors
  const mainBranchNodes = layoutNodes.filter((n) => n.depth === 1);
  const sectors = assignBranchSectors(mainBranchNodes.length, organicSeed);

  // 6. Place branches
  const branchGeometries: Record<string, BranchGeometry> = {};
  const allBoundingBoxes: LayoutBox[] = [centerBounds];
  const nodeOrder: string[] = [];

  for (let i = 0; i < mainBranchNodes.length; i++) {
    const node = mainBranchNodes[i]!;
    const sector = sectors[i];

    if (!sector) continue;

    placeBranch(
      node,
      centerPoint,
      centerVisualSize / 2,
      sector,
      layoutNodes,
      branchGeometries,
      allBoundingBoxes,
      nodeOrder,
      paperBounds,
      safeArea,
      measure,
      diagnostics,
      0,
    );
  }

  // 7. Collision detection pass
  detectCollisions(allBoundingBoxes, nodeOrder, branchGeometries, diagnostics);

  // 8. Build layout geometry
  const geometry: LayoutGeometry = {
    paperKind,
    viewBox,
    paperBounds,
    safeArea,
    center: centerGeometry,
    branches: branchGeometries,
    boundingBoxes: allBoundingBoxes,
    nodeOrder,
  };

  return { geometry, diagnostics, contentHash, organicSeed };
}

// ─── Branch Placement ──────────────────────────────────────────────────────

function placeBranch(
  node: LayoutNode,
  origin: Point,
  originRadius: number,
  sector: BranchSector,
  allNodes: LayoutNode[],
  branchGeometries: Record<string, BranchGeometry>,
  allBoundingBoxes: LayoutBox[],
  nodeOrder: string[],
  paperBounds: LayoutBox,
  safeArea: LayoutBox,
  measure: TextMeasurementAdapter,
  diagnostics: RenderDiagnostic[],
  recursionDepth: number,
): void {
  nodeOrder.push(node.id);

  // Compute branch angle within the sector
  const sectorMid = (sector.angleStart + sector.angleEnd) / 2;

  // Main branch uses seeded geometry angle blended with sector angle
  const angleBlend = recursionDepth === 0 ? 0.7 : 0.5;
  const baseAngle =
    sectorMid * angleBlend + node.geometry.angle * (1 - angleBlend);

  // Sub-branches spread within the parent sector
  let angle: number;
  if (recursionDepth === 0) {
    angle = baseAngle;
  } else {
    // Spread children within the sector
    const siblingIndex = getSiblingIndex(allNodes, node);
    const siblingCount = getSiblingCount(allNodes, node);
    const sectorSpan = sector.angleEnd - sector.angleStart;
    const childSpan = sectorSpan / (siblingCount + 1);
    angle = sector.angleStart + childSpan * (siblingIndex + 1);
  }

  // Branch length
  const childCount = node.children.length;
  const defaultLength = getDefaultBranchLength(
    node.depth,
    paperBounds.width,
    childCount,
  );
  const branchLength = defaultLength * node.geometry.lengthPreference;

  // Start and end points
  const startPoint: Point = {
    x: origin.x + Math.cos(angle) * originRadius,
    y: origin.y + Math.sin(angle) * originRadius,
  };

  const endPoint: Point = {
    x: origin.x + Math.cos(angle) * (originRadius + branchLength),
    y: origin.y + Math.sin(angle) * (originRadius + branchLength),
  };

  // Generate path
  const pathData =
    node.depth === 1
      ? generateCubicBezier(
          startPoint,
          endPoint,
          node.geometry.curvature,
          sector.side,
        )
      : generateQuadraticBezier(startPoint, endPoint, node.geometry.curvature);

  // Text path (offset perpendicular to the branch for readability)
  const textOffset =
    (getStrokeWidths(node.depth).start + getStrokeWidths(node.depth).end) / 2 +
    getFontSize(node.depth) * 0.3;
  const perpX = -(endPoint.y - startPoint.y);
  const perpY = endPoint.x - startPoint.x;
  const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;

  const tpStart: Point = {
    x: startPoint.x + (perpX / perpLen) * textOffset,
    y: startPoint.y + (perpY / perpLen) * textOffset,
  };
  const tpEnd: Point = {
    x: endPoint.x + (perpX / perpLen) * textOffset,
    y: endPoint.y + (perpY / perpLen) * textOffset,
  };

  // Left-side branches point backward — reverse text path so labels read left-to-right
  const isLeftSide = Math.abs(angle) > Math.PI / 2;
  const textPathData = isLeftSide
    ? generateQuadraticBezier(tpEnd, tpStart, node.geometry.curvature)
    : generateQuadraticBezier(tpStart, tpEnd, node.geometry.curvature);

  // Measure text
  const fontSize = getFontSize(node.depth);
  const textMetrics = measure.measureText(node.concept, { fontSize });
  const strokeWidths = getStrokeWidths(node.depth);

  // Check text clipping — use 95% of branch length as threshold
  const textClipped = textMetrics.width > branchLength * 0.95;
  let displayText = node.concept;
  if (textClipped) {
    // Clamp text to fit
    displayText = clampText(
      node.concept,
      branchLength * 0.95,
      textMetrics.width,
    );
    diagnostics.push(
      clippedTextDiagnostic(
        node.id,
        node.concept,
        branchLength * 0.95,
        textMetrics.width,
      ),
    );
  }

  // Bounding box of the branch shape
  const padding = strokeWidths.start;
  const branchBBox: LayoutBox = computePathBoundingBox(
    startPoint,
    endPoint,
    padding,
  );

  // Text bounding box (approximation)
  const textBBox: LayoutBox = {
    x: startPoint.x - textMetrics.width / 2,
    y: startPoint.y - textMetrics.height - textOffset,
    width: textMetrics.width,
    height: textMetrics.height,
  };

  // Check for paper overflow
  if (!isBoxContained(branchBBox, safeArea)) {
    diagnostics.push(layoutOverflowDiagnostic(node.id));
  }

  const branchGeometry: BranchGeometry = {
    nodeId: node.id,
    concept: displayText,
    depth: node.depth,
    parentNodeId: node.parentId,
    color: node.color,
    branchPath: pathData,
    textPath: textPathData,
    strokeWidthStart: strokeWidths.start,
    strokeWidthEnd: strokeWidths.end,
    boundingBox: branchBBox,
    textBoundingBox: textBBox,
    textClipped,
    startPoint,
    endPoint,
  };

  branchGeometries[node.id] = branchGeometry;
  allBoundingBoxes.push(branchBBox);

  // Recurse into children
  if (node.children.length > 0) {
    const childSectorSpan =
      (sector.angleEnd - sector.angleStart) / node.children.length;
    for (let c = 0; c < node.children.length; c++) {
      const child = node.children[c]!;
      const childSector: BranchSector = {
        angleStart: sector.angleStart + childSectorSpan * c,
        angleEnd: sector.angleStart + childSectorSpan * (c + 1),
        side: sector.side,
      };

      placeBranch(
        child,
        endPoint,
        0, // No extra radius for sub-branch start
        childSector,
        allNodes,
        branchGeometries,
        allBoundingBoxes,
        nodeOrder,
        paperBounds,
        safeArea,
        measure,
        diagnostics,
        recursionDepth + 1,
      );
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getSiblingIndex(allNodes: LayoutNode[], node: LayoutNode): number {
  const parent = allNodes.find((n) => n.id === node.parentId);
  if (!parent) return 0;
  return parent.children.findIndex((c) => c.id === node.id);
}

function getSiblingCount(allNodes: LayoutNode[], node: LayoutNode): number {
  const parent = allNodes.find((n) => n.id === node.parentId);
  if (!parent) return 1;
  return parent.children.length;
}

function computePathBoundingBox(
  start: Point,
  end: Point,
  padding: number,
): LayoutBox {
  return {
    x: Math.min(start.x, end.x) - padding,
    y: Math.min(start.y, end.y) - padding,
    width: Math.abs(end.x - start.x) + padding * 2,
    height: Math.abs(end.y - start.y) + padding * 2,
  };
}

function isBoxContained(inner: LayoutBox, outer: LayoutBox): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/**
 * Clamp text to fit within a maximum width by truncating with ellipsis.
 */
function clampText(
  text: string,
  maxWidth: number,
  measuredWidth: number,
): string {
  if (measuredWidth <= maxWidth) return text;
  if (text.length <= 3) return text;

  // Binary search for the right length
  let lo = 1;
  let hi = text.length - 3; // Reserve space for "..."
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const testText = text.slice(0, mid) + "...";
    // Estimate: width is proportional to character count
    const estimatedWidth = (testText.length / text.length) * measuredWidth;
    if (estimatedWidth <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return lo > 0 ? text.slice(0, lo) + "..." : text.slice(0, 1) + "...";
}

/**
 * Detect collisions between branch bounding boxes and emit diagnostics.
 */
function detectCollisions(
  boxes: LayoutBox[],
  nodeOrder: string[],
  _branchGeometries: Record<string, BranchGeometry>,
  diagnostics: RenderDiagnostic[],
): void {
  const minPadding = 20; // Minimum spacing between branches
  const collisionSet = new Set<string>();

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      // Skip center box (index 0) vs branch comparisons — those are expected
      if (i === 0) continue;

      if (boxesOverlap(boxes[i]!, boxes[j]!, minPadding)) {
        const nodeId1 = nodeOrder[i - 1] ?? `unknown-${i}`;
        const nodeId2 = nodeOrder[j - 1] ?? `unknown-${j}`;
        const key = [nodeId1, nodeId2].sort().join(":");
        if (!collisionSet.has(key)) {
          collisionSet.add(key);
          diagnostics.push(unresolvedCollisionDiagnostic(nodeId1, nodeId2));
        }
      }
    }
  }
}
