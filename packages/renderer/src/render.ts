/**
 * Main renderer entry points: renderFromPreview() and renderFromOmm().
 *
 * These are the public API functions that accept either a PreviewPayload
 * or an OmmDocument and return a complete SVG render result.
 */

import type { OmmDocument, OrganicTree } from "@omm/core";
import type {
  PreviewPayload,
  RenderInput,
  RenderResult,
  RenderOptions,
} from "./types.js";
import { stableSerializeTree, deriveOrganicSeed } from "./seed.js";
import { computeLayout, createDefaultMeasurementAdapter } from "./layout.js";
import { renderSvg } from "./svg-renderer.js";
import {
  resolveCenterVisualSync,
  resolveCenterVisualAsync,
} from "./center-visual.js";

/**
 * Render a mind map from a PreviewPayload (CLI handoff format).
 *
 * This is the primary entry point for the Phase 1 flow:
 * Agent CLI -\> PreviewPayload -\> browser renderer -\> SVG preview.
 *
 * @param payload - Validated PreviewPayload from the CLI
 * @param options - Optional rendering configuration
 * @returns RenderResult with SVG string, viewBox, diagnostics, and layout
 */
export function renderFromPreview(
  payload: PreviewPayload,
  options?: RenderOptions,
): RenderResult {
  return renderFromTree(payload.tree, {
    paperKind: payload.paper,
    inlineSvg: payload.centerVisual?.inlineSvg,
    renderOptions: options,
  });
}

/**
 * Render a mind map from a PreviewPayload with async center visual loading.
 *
 * Attempts to load SVG from URL before falling back to built-in templates.
 */
export async function renderFromPreviewAsync(
  payload: PreviewPayload,
  loadSvg: (url: string) => Promise<string | null>,
  options?: RenderOptions,
): Promise<RenderResult> {
  const tree = payload.tree;
  const paperKind = payload.paper;
  const measure = options?.measure ?? createDefaultMeasurementAdapter();
  const marginRatio = options?.marginRatio ?? 0.05;

  // Derive seed
  const serialized = stableSerializeTree(tree);
  const contentHash = deriveOrganicSeed(serialized);

  // Resolve center visual (async)
  const centerResult = await resolveCenterVisualAsync(tree.center, payload, {
    contentHash,
    loadSvg,
  });

  // Compute layout
  const layoutResult = computeLayout(tree, {
    paperKind,
    centerVisualSvg: centerResult.svgContent,
    centerUsedFallback: centerResult.usedFallback,
    measure,
    marginRatio,
  });

  // Merge diagnostics
  const allDiagnostics = [
    ...centerResult.diagnostics,
    ...layoutResult.diagnostics,
  ];

  // Render SVG
  const svg = renderSvg(layoutResult.geometry, options?.paperBackground);

  return {
    svg,
    viewBox: layoutResult.geometry.viewBox,
    diagnostics: allDiagnostics,
    layout: layoutResult.geometry,
  };
}

/**
 * Render a mind map from an OmmDocument (.omm file format).
 *
 * Extracts the tree structure and paper spec from the document
 * and delegates to the layout engine.
 */
export function renderFromOmm(
  document: OmmDocument,
  options?: RenderOptions,
): RenderResult {
  // Convert OmmDocument's MindMap tree to OrganicTree format
  const tree = convertMindMapToTree(document.rootMap);

  // Determine paper kind
  const paperKind = document.paper.kind as "a3-landscape" | "a4-landscape";

  // Use center visual from document if available
  // In .omm format, center visuals are referenced by asset ID
  // For now, no inline SVG is extracted from OmmDocument
  const inlineSvg = undefined;

  return renderFromTree(tree, { paperKind, inlineSvg, renderOptions: options });
}

// ─── Internal ──────────────────────────────────────────────────────────────

/**
 * Core rendering function that works with an OrganicTree tree.
 */
function renderFromTree(
  tree: OrganicTree,
  options: {
    paperKind: "a3-landscape" | "a4-landscape";
    inlineSvg?: string;
    renderOptions?: RenderOptions;
  },
): RenderResult {
  const measure =
    options.renderOptions?.measure ?? createDefaultMeasurementAdapter();
  const marginRatio = options.renderOptions?.marginRatio ?? 0.05;

  // Derive seed
  const serialized = stableSerializeTree(tree);
  const contentHash = deriveOrganicSeed(serialized);

  // Resolve center visual (sync)
  const centerResult = resolveCenterVisualSync(
    tree.center,
    options.inlineSvg,
    contentHash,
  );

  // Compute layout
  const layoutResult = computeLayout(tree, {
    paperKind: options.paperKind,
    centerVisualSvg: centerResult.svgContent,
    centerUsedFallback: centerResult.usedFallback,
    measure,
    marginRatio,
  });

  // Merge diagnostics
  const allDiagnostics = [
    ...centerResult.diagnostics,
    ...layoutResult.diagnostics,
  ];

  // Render SVG
  const svg = renderSvg(
    layoutResult.geometry,
    options.renderOptions?.paperBackground,
  );

  return {
    svg,
    viewBox: layoutResult.geometry.viewBox,
    diagnostics: allDiagnostics,
    layout: layoutResult.geometry,
  };
}

/**
 * Convert a MindMap tree (from OmmDocument) to OrganicTree format.
 *
 * This extracts the hierarchical structure and concepts from a MindMap
 * and produces a flat OrganicTree suitable for the layout engine.
 */
function convertMindMapToTree(
  mindMap: import("@omm/core").MindMap,
): OrganicTree {
  return {
    version: 1,
    title: mindMap.title,
    paper: undefined,
    center: {
      concept: mindMap.center.titleText,
      visualHint: mindMap.center.visualHint,
    },
    branches: (mindMap.children ?? []).map((node) => ({
      concept: node.concept,
      visualHint: node.visualTokens?.[0]?.text,
      children: (node.children ?? []).map((child) => ({
        concept: child.concept,
        visualHint: child.visualTokens?.[0]?.text,
        children: (child.children ?? []).map((leaf) => ({
          concept: leaf.concept,
          visualHint: leaf.visualTokens?.[0]?.text,
        })),
      })),
    })),
  };
}

/**
 * Unified render entry point that accepts either input type.
 */
export function render(
  input: RenderInput,
  options?: RenderOptions,
): RenderResult {
  switch (input.kind) {
    case "preview-payload":
      return renderFromPreview(input.payload, options);
    case "omm-document":
      return renderFromOmm(input.document, options);
  }
}
