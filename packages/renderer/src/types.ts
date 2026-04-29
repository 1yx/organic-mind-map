/**
 * Renderer contract types for the read-only SVG renderer.
 *
 * Defines input/output shapes, diagnostics, and layout geometry types.
 * Environment-neutral — no DOM or Canvas dependencies.
 */

import type { OmmDocument, OrganicTree, LayoutBox, Point } from "@omm/core";

// ─── Render Input ──────────────────────────────────────────────────────────

export type RenderInput =
  | { kind: "omm-document"; document: OmmDocument }
  | { kind: "organic-tree"; tree: OrganicTree };

// ─── Render Result ─────────────────────────────────────────────────────────

export type RenderResult = {
  svg: string;
  viewBox: string;
  diagnostics: RenderDiagnostic[];
  layout: LayoutGeometry;
};

// ─── Render Options ────────────────────────────────────────────────────────

export type RenderOptions = {
  /** Measurement adapter for text width computation. If omitted, uses a default heuristic. */
  measure?: TextMeasurementAdapter;
  /** Background color for the paper (CSS color string). Default: "#FFFFFF". */
  paperBackground?: string;
  /** Margin ratio applied to each side of the paper. Default: 0.05 (5%). */
  marginRatio?: number;
};

// ─── Text Measurement Adapter ─────────────────────────────────────────────

export type TextMetrics = {
  width: number;
  height: number;
  ascent: number;
  descent: number;
};

export type TextMeasurementAdapter = {
  /**
   * Measure a text string with the given font parameters.
   * All sizes are in the SVG coordinate system (10 units = 1mm).
   */
  measureText(
    text: string,
    options: {
      fontSize: number;
      fontFamily?: string;
      fontWeight?: string;
    },
  ): TextMetrics;
};

// ─── Diagnostics ───────────────────────────────────────────────────────────

export type RenderDiagnosticKind =
  | "clipped-text"
  | "missing-asset-fallback"
  | "layout-overflow"
  | "unresolved-collision"
  | "branch-text-crossing"
  | "hard-layout-failure";

export type RenderDiagnostic = {
  kind: RenderDiagnosticKind;
  nodeId?: string;
  message: string;
  severity: "info" | "warning" | "error";
};

// ─── Layout Geometry ───────────────────────────────────────────────────────

export type BranchGeometry = {
  nodeId: string;
  concept: string;
  depth: number;
  parentNodeId?: string;
  color: string;
  /** The SVG path data for the branch curve. */
  branchPath: string;
  /** The SVG path data for the text path (may differ from branchPath for offset). */
  textPath: string;
  /** Stroke width at the branch start (thick, near center). */
  strokeWidthStart: number;
  /** Stroke width at the branch end (thin, away from center). */
  strokeWidthEnd: number;
  /** Bounding box of the branch shape. */
  boundingBox: LayoutBox;
  /** Bounding box of the text label along the path. */
  textBoundingBox: LayoutBox;
  /** True if the text was clipped due to insufficient branch length. */
  textClipped: boolean;
  /** Start point of the branch. */
  startPoint: Point;
  /** End point of the branch. */
  endPoint: Point;
};

export type CenterGeometry = {
  /** Bounding box of the center visual (including padding). */
  boundingBox: LayoutBox;
  /** The center point of the paper. */
  centerPoint: Point;
  /** The SVG content for the center visual (inline SVG string). */
  svgContent: string;
  /** Whether a fallback was used instead of a loaded/custom SVG. */
  usedFallback: boolean;
};

export type LayoutGeometry = {
  /** Paper kind used for this layout. */
  paperKind: "a3-landscape" | "a4-landscape";
  /** ViewBox string for the SVG. */
  viewBox: string;
  /** Paper bounds in SVG units. */
  paperBounds: LayoutBox;
  /** Usable area after margins. */
  safeArea: LayoutBox;
  /** Center visual geometry. */
  center: CenterGeometry;
  /** All branch geometries keyed by node ID. */
  branches: Record<string, BranchGeometry>;
  /** All computed bounding boxes for collision reference. */
  boundingBoxes: LayoutBox[];
  /** Ordered list of node IDs in tree traversal order. */
  nodeOrder: string[];
};

// ─── Color Palette ─────────────────────────────────────────────────────────

export type BranchColorPalette = readonly string[];

// ─── Seeded Geometry ───────────────────────────────────────────────────────

export type SeededGeometry = {
  /** Angle offset in radians for the branch start direction. */
  angle: number;
  /** Curvature factor (0 = straight, 1 = maximum curve). */
  curvature: number;
  /** Taper factor (0 = uniform width, 1 = full taper from start to end). */
  taper: number;
  /** Length preference factor (0.6–1.4 multiplier on default length). */
  lengthPreference: number;
};

// ─── Internal Layout Types ─────────────────────────────────────────────────

/** A resolved node during layout computation. */
export type LayoutNode = {
  id: string;
  concept: string;
  depth: number;
  parentId?: string;
  color: string;
  geometry: SeededGeometry;
  children: LayoutNode[];
};

/** Sector assigned to a main branch for child placement. */
export type BranchSector = {
  angleStart: number; // radians
  angleEnd: number; // radians
  side: "left" | "right";
};
