/**
 * \@omm/renderer - SVG layout, rendering, and measurement.
 *
 * Consumes validated data from \@omm/core and produces SVG render models.
 */

import type { OmmDocument } from "@omm/core";

// ─── Existing API (backward compatible) ────────────────────────────────────

export type SvgRenderModel = {
  svg: string;
  viewBox: string;
};

/**
 * Placeholder: renders an OmmDocument to an SVG render model.
 */
export function renderOmmToSvgModel(_doc: OmmDocument): SvgRenderModel {
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" text-anchor="middle">Placeholder Mind Map</text></svg>`,
    viewBox: "0 0 800 600",
  };
}

// --- SVG Loading & Safety Guard ---
export { loadControlledSvg, isSvgSafe, getUnsafeTags } from "./svg-loader.js";
export type { SvgLoadOptions } from "./svg-loader.js";

// ─── New Renderer API ─────────────────────────────────────────────────────

// --- Types ---
export type {
  RenderInput,
  RenderResult,
  RenderOptions,
  RenderDiagnostic,
  RenderDiagnosticKind,
  TextMeasurementAdapter,
  TextMetrics,
  LayoutGeometry,
  BranchGeometry,
  CenterGeometry,
  BranchColorPalette,
  SeededGeometry,
  LayoutNode,
  BranchSector,
} from "./types.js";

// --- Seed & Determinism ---
export {
  cyrb53,
  stableSerializeTree,
  deriveOrganicSeed,
  createSeededPRNG,
  generateNodeIds,
  assignMainBranchColors,
  generateSeededGeometry,
  buildLayoutTree,
  assignBranchSectors,
  MAIN_BRANCH_COLORS,
} from "./seed.js";

// --- Layout ---
export {
  computeLayout,
  createDefaultMeasurementAdapter,
  createCanvasMeasurementAdapter,
} from "./layout.js";

// --- SVG Rendering ---
export { renderSvg } from "./svg-renderer.js";

// --- Center Visual ---
export {
  resolveCenterVisualSync,
  resolveCenterVisualAsync,
  selectBuiltinTemplate,
  generateBuiltinCenterSvg,
  BUILTIN_CENTER_TEMPLATES,
} from "./center-visual.js";
export type { CenterVisualResult } from "./center-visual.js";

// --- SVG Allowlist ---
export { isAllowedSvgUrl, getAllowedHosts } from "./svg-allowlist.js";

// --- Diagnostics ---
export {
  createDiagnostic,
  clippedTextDiagnostic,
  missingAssetFallbackDiagnostic,
  layoutOverflowDiagnostic,
  unresolvedCollisionDiagnostic,
  branchTextCrossingDiagnostic,
  hardLayoutFailureDiagnostic,
  boxesOverlap,
  findOverlaps,
  buildLayoutSnapshot,
  computePaperLayout,
} from "./diagnostics.js";

// --- Main Entry Points ---
export { renderFromTree, renderFromOmm, render } from "./render.js";
