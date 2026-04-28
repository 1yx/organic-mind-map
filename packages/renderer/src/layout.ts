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
import {
  computePaperLayout,
  boxesOverlap,
  clippedTextDiagnostic,
  layoutOverflowDiagnostic,
  unresolvedCollisionDiagnostic,
} from "./diagnostics.js";

// ─── Default Text Measurement (heuristic) ──────────────────────────────────

const CHAR_WIDTH_RATIO = 0.6;

function defaultMeasure(text: string, fontSize: number): TextMetrics {
  const width = text.length * fontSize * CHAR_WIDTH_RATIO;
  const height = fontSize * 1.2;
  return { width, height, ascent: fontSize * 0.9, descent: fontSize * 0.3 };
}

export function createDefaultMeasurementAdapter(): TextMeasurementAdapter {
  return {
    measureText(text: string, options: { fontSize: number }): TextMetrics {
      return defaultMeasure(text, options.fontSize);
    },
  };
}

export function createCanvasMeasurementAdapter(
  fontFamily = "Arial, Helvetica, sans-serif",
): TextMeasurementAdapter | null {
  try {
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

// ─── Depth-based Constants ──────────────────────────────────────────────────

const FONT_SIZES: Record<number, number> = { 1: 80, 2: 56, 3: 42 };
function getFontSize(depth: number): number {
  return FONT_SIZES[depth] ?? 42;
}

const STROKE_WIDTHS: Record<number, { start: number; end: number }> = {
  1: { start: 28, end: 8 },
  2: { start: 16, end: 4 },
  3: { start: 10, end: 2 },
};
function getStrokeWidths(depth: number): { start: number; end: number } {
  return STROKE_WIDTHS[depth] ?? { start: 10, end: 2 };
}

function getDefaultBranchLength(
  depth: number,
  paperWidth: number,
  childCount: number,
): number {
  const baseLength = paperWidth * 0.14;
  const depthFactor = depth === 1 ? 1 : depth === 2 ? 0.7 : 0.5;
  const siblingFactor = childCount > 1 ? 1 / Math.cbrt(childCount) : 1;
  return baseLength * depthFactor * siblingFactor;
}

// ─── Path Generation ───────────────────────────────────────────────────────

function fmt(v: number): string {
  return v.toFixed(1);
}

function generateQuadraticBezier(
  start: Point,
  end: Point,
  curvature: number,
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const offset = len * curvature * 0.3;
  const cpX = (start.x + end.x) / 2 + (-dy / len) * offset;
  const cpY = (start.y + end.y) / 2 + (dx / len) * offset;
  return `M${fmt(start.x)},${fmt(start.y)} Q${fmt(cpX)},${fmt(cpY)} ${fmt(end.x)},${fmt(end.y)}`;
}

function generateCubicBezier(
  line: { start: Point; end: Point },
  opts: { curvature: number; side: "left" | "right" },
): string {
  const { start, end } = line;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const sign = opts.side === "left" ? -1 : 1;
  const o1 = len * opts.curvature * 0.15 * sign;
  const o2 = len * opts.curvature * 0.25 * sign;
  return `M${fmt(start.x)},${fmt(start.y)} C${fmt(start.x + dx * 0.33 + nx * o1)},${fmt(start.y + dy * 0.33 + ny * o1)} ${fmt(start.x + dx * 0.66 + nx * o2)},${fmt(start.y + dy * 0.66 + ny * o2)} ${fmt(end.x)},${fmt(end.y)}`;
}

// ─── Layout Context ─────────────────────────────────────────────────────────

type Ctx = {
  nodes: LayoutNode[];
  branches: Record<string, BranchGeometry>;
  boxes: LayoutBox[];
  order: string[];
  paper: LayoutBox;
  safe: LayoutBox;
  measure: TextMeasurementAdapter;
  diag: RenderDiagnostic[];
};

// ─── Main Entry ─────────────────────────────────────────────────────────────

export type LayoutResult = {
  geometry: LayoutGeometry;
  diagnostics: RenderDiagnostic[];
  contentHash: number;
  organicSeed: number;
};

export type LayoutOptions = {
  paperKind: "a3-landscape" | "a4-landscape";
  centerVisualSvg: string;
  centerUsedFallback: boolean;
  measure: TextMeasurementAdapter;
  marginRatio?: number;
};

export function computeLayout(
  tree: AgentMindMapList,
  opts: LayoutOptions,
): LayoutResult {
  const diag: RenderDiagnostic[] = [];
  const serialized = stableSerializeTree(tree);
  const contentHash = deriveOrganicSeed(serialized);
  const { paperBounds, safeArea, viewBox, centerPoint } = computePaperLayout(
    opts.paperKind,
    opts.marginRatio ?? 0.05,
  );
  const center = buildCenter(centerPoint, paperBounds, opts);
  const layoutNodes = buildLayoutTree(tree, contentHash);
  const ctx: Ctx = {
    nodes: layoutNodes,
    branches: {},
    boxes: [center.boundingBox],
    order: [],
    paper: paperBounds,
    safe: safeArea,
    measure: opts.measure,
    diag,
  };
  placeMainBranches(
    layoutNodes,
    {
      seed: contentHash,
      center: centerPoint,
      radius: center.boundingBox.width / 2,
    },
    ctx,
  );
  runCollisionDetection(ctx);
  return {
    geometry: {
      paperKind: opts.paperKind,
      viewBox,
      paperBounds,
      safeArea,
      center,
      branches: ctx.branches,
      boundingBoxes: ctx.boxes,
      nodeOrder: ctx.order,
    },
    diagnostics: diag,
    contentHash,
    organicSeed: contentHash,
  };
}

function buildCenter(
  cp: Point,
  pb: LayoutBox,
  opts: { centerVisualSvg: string; centerUsedFallback: boolean },
): CenterGeometry {
  const size = Math.min(pb.width, pb.height) * 0.12;
  return {
    boundingBox: {
      x: cp.x - size / 2,
      y: cp.y - size / 2,
      width: size,
      height: size,
    },
    centerPoint: cp,
    svgContent: opts.centerVisualSvg,
    usedFallback: opts.centerUsedFallback,
  };
}

function placeMainBranches(
  nodes: LayoutNode[],
  opts: { seed: number; center: Point; radius: number },
  ctx: Ctx,
): void {
  const main = nodes.filter((n) => n.depth === 1);
  const sectors = assignBranchSectors(main.length, opts.seed);
  for (let i = 0; i < main.length; i++) {
    const s = sectors[i];
    if (s)
      placeBranch(
        main[i]!,
        { origin: opts.center, radius: opts.radius, sector: s, depth: 0 },
        ctx,
      );
  }
}

// ─── Branch Placement ──────────────────────────────────────────────────────

type BranchParams = {
  origin: Point;
  radius: number;
  sector: BranchSector;
  depth: number;
};

function placeBranch(node: LayoutNode, params: BranchParams, ctx: Ctx): void {
  const { origin, radius, sector, depth } = params;
  ctx.order.push(node.id);
  const angle = branchAngle(node, sector, ctx);
  const len =
    getDefaultBranchLength(node.depth, ctx.paper.width, node.children.length) *
    node.geometry.lengthPreference;
  const sp = {
    x: origin.x + Math.cos(angle) * radius,
    y: origin.y + Math.sin(angle) * radius,
  };
  const ep = {
    x: origin.x + Math.cos(angle) * (radius + len),
    y: origin.y + Math.sin(angle) * (radius + len),
  };
  const pathData =
    node.depth === 1
      ? generateCubicBezier(
          { start: sp, end: ep },
          { curvature: node.geometry.curvature, side: sector.side },
        )
      : generateQuadraticBezier(sp, ep, node.geometry.curvature);

  const geom = buildBranchGeom(
    node,
    { sp, ep, pathData, branchLen: len, angle },
    ctx,
  );
  ctx.branches[node.id] = geom;
  ctx.boxes.push(geom.boundingBox);

  for (let c = 0; c < node.children.length; c++) {
    const span = (sector.angleEnd - sector.angleStart) / node.children.length;
    const childSector: BranchSector = {
      angleStart: sector.angleStart + span * c,
      angleEnd: sector.angleStart + span * (c + 1),
      side: sector.side,
    };
    placeBranch(
      node.children[c]!,
      { origin: ep, radius: 0, sector: childSector, depth: depth + 1 },
      ctx,
    );
  }
}

function branchAngle(node: LayoutNode, sector: BranchSector, ctx: Ctx): number {
  const depth = node.depth;
  const mid = (sector.angleStart + sector.angleEnd) / 2;
  if (depth === 1) return mid * 0.7 + node.geometry.angle * 0.3;
  const idx = getSiblingIndex(ctx.nodes, node);
  const cnt = getSiblingCount(ctx.nodes, node);
  return (
    sector.angleStart +
    ((sector.angleEnd - sector.angleStart) / (cnt + 1)) * (idx + 1)
  );
}

type BranchGeomInput = {
  sp: Point;
  ep: Point;
  pathData: string;
  branchLen: number;
  angle: number;
};

function buildBranchGeom(
  node: LayoutNode,
  bi: BranchGeomInput,
  ctx: Ctx,
): BranchGeometry {
  const sw = getStrokeWidths(node.depth);
  const { displayText, textClipped, tm, textOff } = measureText(
    node,
    bi.branchLen,
    ctx,
  );
  const textPath = buildTextPath(bi, node.geometry.curvature, textOff);
  const bbox = computePathBBox(bi.sp, bi.ep, sw.start);
  const textBBox = {
    x: bi.sp.x - tm.width / 2,
    y: bi.sp.y - tm.height - textOff,
    width: tm.width,
    height: tm.height,
  };
  if (!boxIn(bbox, ctx.safe)) ctx.diag.push(layoutOverflowDiagnostic(node.id));
  return {
    nodeId: node.id,
    concept: displayText,
    depth: node.depth,
    parentNodeId: node.parentId,
    color: node.color,
    branchPath: bi.pathData,
    textPath,
    strokeWidthStart: sw.start,
    strokeWidthEnd: sw.end,
    boundingBox: bbox,
    textBoundingBox: textBBox,
    textClipped,
    startPoint: bi.sp,
    endPoint: bi.ep,
  };
}

function buildTextPath(
  bi: BranchGeomInput,
  curvature: number,
  textOff: number,
): string {
  const px = -(bi.ep.y - bi.sp.y);
  const py = bi.ep.x - bi.sp.x;
  const pl = Math.sqrt(px * px + py * py) || 1;
  const tps = {
    x: bi.sp.x + (px / pl) * textOff,
    y: bi.sp.y + (py / pl) * textOff,
  };
  const tpe = {
    x: bi.ep.x + (px / pl) * textOff,
    y: bi.ep.y + (py / pl) * textOff,
  };
  const isLeft = Math.abs(bi.angle) > Math.PI / 2;
  return isLeft
    ? generateQuadraticBezier(tpe, tps, curvature)
    : generateQuadraticBezier(tps, tpe, curvature);
}

function measureText(
  node: LayoutNode,
  branchLen: number,
  ctx: Ctx,
): {
  displayText: string;
  textClipped: boolean;
  tm: TextMetrics;
  textOff: number;
} {
  const sw = getStrokeWidths(node.depth);
  const textOff = (sw.start + sw.end) / 2 + getFontSize(node.depth) * 0.3;
  const fontSize = getFontSize(node.depth);
  const tm = ctx.measure.measureText(node.concept, { fontSize });
  const textClipped = tm.width > branchLen * 0.95;
  const displayText = textClipped
    ? clampText(node.concept, branchLen * 0.95, tm.width)
    : node.concept;
  if (textClipped)
    ctx.diag.push(
      clippedTextDiagnostic(node.id, node.concept, {
        maxWidth: branchLen * 0.95,
        measuredWidth: tm.width,
      }),
    );
  return { displayText, textClipped, tm, textOff };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getSiblingIndex(all: LayoutNode[], node: LayoutNode): number {
  const p = all.find((n) => n.id === node.parentId);
  return p ? p.children.findIndex((c) => c.id === node.id) : 0;
}

function getSiblingCount(all: LayoutNode[], node: LayoutNode): number {
  const p = all.find((n) => n.id === node.parentId);
  return p ? p.children.length : 1;
}

function computePathBBox(s: Point, e: Point, pad: number): LayoutBox {
  return {
    x: Math.min(s.x, e.x) - pad,
    y: Math.min(s.y, e.y) - pad,
    width: Math.abs(e.x - s.x) + pad * 2,
    height: Math.abs(e.y - s.y) + pad * 2,
  };
}

function boxIn(inner: LayoutBox, outer: LayoutBox): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function clampText(text: string, maxW: number, measuredW: number): string {
  if (measuredW <= maxW || text.length <= 3) return text;
  let lo = 1;
  let hi = text.length - 3;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const est = ((mid + 3) / text.length) * measuredW;
    if (est <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? `${text.slice(0, lo)}...` : `${text.slice(0, 1)}...`;
}

function runCollisionDetection(ctx: Ctx): void {
  const minPad = 20;
  const seen = new Set<string>();
  for (let i = 0; i < ctx.boxes.length; i++) {
    if (i === 0) continue;
    for (let j = i + 1; j < ctx.boxes.length; j++) {
      if (boxesOverlap(ctx.boxes[i]!, ctx.boxes[j]!, minPad)) {
        const id1 = ctx.order[i - 1] ?? `unknown-${i}`;
        const id2 = ctx.order[j - 1] ?? `unknown-${j}`;
        const key = [id1, id2].sort().join(":");
        if (!seen.has(key)) {
          seen.add(key);
          ctx.diag.push(unresolvedCollisionDiagnostic(id1, id2));
        }
      }
    }
  }
}
