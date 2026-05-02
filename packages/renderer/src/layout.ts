/**
 * Measurement adapter and layout computation engine.
 *
 * Computes branch positions, bounding boxes, and collision corrections.
 * Uses a pluggable TextMeasurementAdapter so tests can mock Canvas.
 * NEVER mounts hidden DOM/SVG elements or calls getBBox().
 *
 * Coordinate system: SVG units. MVP sqrt2-landscape surface viewBox: "0 0 4200 2970"
 */
/* eslint-disable max-lines */

import type { OrganicTree, LayoutBox, Point } from "@omm/core";
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
  computeSurfaceLayout,
  boxesOverlap,
  buildParentMap,
  isParentChildPair,
  areSiblings,
  reportCollision,
  clippedTextDiagnostic,
  layoutOverflowDiagnostic,
} from "./diagnostics.js";
import {
  resolveBranchMarker,
  markerBoundingBox as computeMarkerBBox,
} from "./branch-markers.js";
import { toDisplayLabel } from "./display-label.js";

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
  boxOwners: (string | null)[];
  boxKinds: Array<"center" | "branch-path" | "marker">;
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
  surfacePreset?: string;
  centerVisualSvg: string;
  centerUsedFallback: boolean;
  measure: TextMeasurementAdapter;
  marginRatio?: number;
};

type CtxParams = {
  layoutNodes: LayoutNode[];
  center: CenterGeometry;
  surfaceBounds: LayoutBox;
  safeArea: LayoutBox;
  measure: TextMeasurementAdapter;
  diag: RenderDiagnostic[];
};

function buildLayoutCtx(p: CtxParams): Ctx {
  return {
    nodes: p.layoutNodes,
    branches: {},
    boxes: [p.center.boundingBox],
    boxOwners: [null],
    boxKinds: ["center"],
    order: [],
    paper: p.surfaceBounds,
    safe: p.safeArea,
    measure: p.measure,
    diag: p.diag,
  };
}

export function computeLayout(
  tree: OrganicTree,
  opts: LayoutOptions,
): LayoutResult {
  const diag: RenderDiagnostic[] = [];
  const serialized = stableSerializeTree(tree);
  const contentHash = deriveOrganicSeed(serialized);
  const { surfaceBounds, safeArea, viewBox, centerPoint } =
    computeSurfaceLayout(
      opts.surfacePreset ?? "sqrt2-landscape",
      opts.marginRatio ?? 0.05,
    );
  const center = buildCenter(centerPoint, surfaceBounds, opts);
  const layoutNodes = buildLayoutTree(tree, contentHash);
  const ctx = buildLayoutCtx({
    layoutNodes,
    center,
    surfaceBounds,
    safeArea,
    measure: opts.measure,
    diag,
  });
  placeOrganicMainBranches(
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
      surfacePreset: opts.surfacePreset ?? "sqrt2-landscape",
      viewBox,
      surfaceBounds,
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

function placeOrganicMainBranches(
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
  rootNodeId?: string;
  rootSide?: "left" | "right";
};

function placeBranch(node: LayoutNode, params: BranchParams, ctx: Ctx): void {
  const { sector, depth } = params;
  ctx.order.push(node.id);
  const curve = computeBranchCurve(node, params, ctx);

  const geom = buildBranchGeom(
    node,
    {
      sp: curve.startPoint,
      ep: curve.endPoint,
      pathData: curve.pathData,
      branchLen: curve.length,
      angle: curve.angle,
      side: sector.side,
      rootNodeId: params.rootNodeId ?? node.id,
      rootSide:
        params.rootSide ??
        inferSideFromPoints(curve.startPoint, curve.endPoint),
    },
    ctx,
  );
  registerBranchBoxes(ctx, geom);

  for (let c = 0; c < node.children.length; c++) {
    const span = (sector.angleEnd - sector.angleStart) / node.children.length;
    const childSector: BranchSector = {
      angleStart: sector.angleStart + span * c,
      angleEnd: sector.angleStart + span * (c + 1),
      side: sector.side,
    };
    placeBranch(
      node.children[c]!,
      {
        origin: curve.endPoint,
        radius: 0,
        sector: childSector,
        depth: depth + 1,
        rootNodeId: geom.rootNodeId,
        rootSide: geom.side,
      },
      ctx,
    );
  }
}

function computeBranchCurve(
  node: LayoutNode,
  params: BranchParams,
  ctx: Ctx,
): {
  angle: number;
  length: number;
  startPoint: Point;
  endPoint: Point;
  pathData: string;
} {
  const angle = branchAngle(node, params.sector, ctx);
  const length =
    getDefaultBranchLength(node.depth, ctx.paper.width, node.children.length) *
    node.geometry.lengthPreference;
  const startPoint = pointOnRay(params.origin, angle, params.radius);
  const endPoint = pointOnRay(params.origin, angle, params.radius + length);
  const pathData = branchPathData({
    node,
    sector: params.sector,
    startPoint,
    endPoint,
  });
  return { angle, length, startPoint, endPoint, pathData };
}

function pointOnRay(origin: Point, angle: number, radius: number): Point {
  return {
    x: origin.x + Math.cos(angle) * radius,
    y: origin.y + Math.sin(angle) * radius,
  };
}

function branchPathData(opts: {
  node: LayoutNode;
  sector: BranchSector;
  startPoint: Point;
  endPoint: Point;
}): string {
  if (opts.node.depth === 1) {
    return generateCubicBezier(
      { start: opts.startPoint, end: opts.endPoint },
      { curvature: opts.node.geometry.curvature, side: opts.sector.side },
    );
  }
  return generateQuadraticBezier(
    opts.startPoint,
    opts.endPoint,
    opts.node.geometry.curvature,
  );
}

function registerBranchBoxes(ctx: Ctx, geom: BranchGeometry): void {
  ctx.branches[geom.nodeId] = geom;
  ctx.boxes.push(geom.boundingBox);
  ctx.boxOwners.push(geom.nodeId);
  ctx.boxKinds.push("branch-path");
  if (geom.markerBoundingBox) {
    ctx.boxes.push(geom.markerBoundingBox);
    ctx.boxOwners.push(geom.nodeId);
    ctx.boxKinds.push("marker");
  }
}

function branchAngle(node: LayoutNode, sector: BranchSector, ctx: Ctx): number {
  const depth = node.depth;
  if (depth === 1) return mainBranchAngle(node, sector);
  const idx = getSiblingIndex(ctx.nodes, node);
  const cnt = getSiblingCount(ctx.nodes, node);
  return (
    sector.angleStart +
    ((sector.angleEnd - sector.angleStart) / (cnt + 1)) * (idx + 1)
  );
}

function mainBranchAngle(node: LayoutNode, sector: BranchSector): number {
  const mid = (sector.angleStart + sector.angleEnd) / 2;
  const halfSpan = (sector.angleEnd - sector.angleStart) / 2;
  const jitter = node.geometry.angle / (Math.PI * 2) - 0.5;
  return mid + jitter * halfSpan * 0.5;
}

type BranchGeomInput = {
  sp: Point;
  ep: Point;
  pathData: string;
  branchLen: number;
  angle: number;
  side: "left" | "right";
  rootNodeId: string;
  rootSide: "left" | "right";
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

  // Resolve visual hint marker
  const marker = resolveBranchMarker(node.visualHint);
  let markerBBox: import("@omm/core").LayoutBox | undefined;
  if (marker) {
    // Position marker near the end of the branch (text area)
    const mx = bi.ep.x;
    const my = bi.ep.y;
    const mb = computeMarkerBBox(marker, { x: mx, y: my, depth: node.depth });
    markerBBox = { x: mb.x, y: mb.y, width: mb.width, height: mb.height };
  }

  return {
    nodeId: node.id,
    concept: displayText,
    depth: node.depth,
    parentNodeId: node.parentId,
    rootNodeId: bi.rootNodeId,
    side: bi.rootSide,
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
    visualHint: node.visualHint,
    markerBoundingBox: markerBBox,
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
  const label = toDisplayLabel(node.concept);
  const tm = ctx.measure.measureText(label, { fontSize });
  const textClipped = tm.width > branchLen * 0.95;
  const displayText = textClipped
    ? clampText(label, branchLen * 0.95, tm.width)
    : label;
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
  const minPad = 40;
  const seen = new Set<string>();
  const parentOf = buildParentMap(ctx.branches);

  for (let i = 0; i < ctx.boxes.length; i++) {
    if (i === 0) continue;
    const id1 = ctx.boxOwners[i];
    for (let j = i + 1; j < ctx.boxes.length; j++) {
      const id2 = ctx.boxOwners[j];
      if (isParentChildPair(id1, id2, parentOf)) continue;
      if (areSiblings(id1, id2, parentOf)) continue;
      if (boxesOverlap(ctx.boxes[i]!, ctx.boxes[j]!, minPad)) {
        if (
          isRadialOriginFalsePositive(
            {
              id1,
              id2,
              kind1: ctx.boxKinds[i]!,
              kind2: ctx.boxKinds[j]!,
            },
            ctx,
          )
        ) {
          continue;
        }
        reportCollision({
          id1,
          id2,
          fallbackI: i,
          fallbackJ: j,
          seen,
          diag: ctx.diag,
        });
      }
    }
  }
}

function isRadialOriginFalsePositive(
  pair: {
    id1: string | null;
    id2: string | null;
    kind1: "center" | "branch-path" | "marker";
    kind2: "center" | "branch-path" | "marker";
  },
  ctx: Ctx,
): boolean {
  if (!hasDistinctBranchPathOwners(pair)) return false;

  const a = ctx.branches[pair.id1];
  const b = ctx.branches[pair.id2];
  if (!a || !b) return false;
  if (!hasDifferentRootsOnSameSide(a, b)) return false;

  const rootA = ctx.branches[a.rootNodeId];
  const rootB = ctx.branches[b.rootNodeId];
  if (!rootA || !rootB) return false;

  const sharedOriginRadius =
    Math.max(rootA.strokeWidthStart, rootB.strokeWidthStart) * 8;
  return (
    distance(rootA.startPoint, rootB.startPoint) <= sharedOriginRadius &&
    distance(a.endPoint, b.endPoint) > sharedOriginRadius * 2
  );
}

function hasDistinctBranchPathOwners(pair: {
  id1: string | null;
  id2: string | null;
  kind1: "center" | "branch-path" | "marker";
  kind2: "center" | "branch-path" | "marker";
}): pair is {
  id1: string;
  id2: string;
  kind1: "branch-path";
  kind2: "branch-path";
} {
  return (
    pair.kind1 === "branch-path" &&
    pair.kind2 === "branch-path" &&
    Boolean(pair.id1) &&
    Boolean(pair.id2) &&
    pair.id1 !== pair.id2
  );
}

function hasDifferentRootsOnSameSide(
  a: BranchGeometry,
  b: BranchGeometry,
): boolean {
  return a.rootNodeId !== b.rootNodeId && a.side === b.side;
}

function inferSideFromPoints(start: Point, end: Point): "left" | "right" {
  return end.x < start.x ? "left" : "right";
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
