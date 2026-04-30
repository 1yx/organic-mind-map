/**
 * Main renderer entry points: renderFromTree() and renderFromOmm().
 *
 * These are the public API functions that accept either an OrganicTree
 * or an OmmDocument and return a complete SVG render result.
 */

import type { OmmDocument, OrganicTree } from "@omm/core";
import type { RenderInput, RenderResult, RenderOptions } from "./types.js";
import { stableSerializeTree, deriveOrganicSeed } from "./seed.js";
import { computeLayout, createDefaultMeasurementAdapter } from "./layout.js";
import { renderSvg } from "./svg-renderer.js";
import { resolveCenterVisualSync } from "./center-visual.js";

/** Build the final RenderResult from center and layout results. */
function buildRenderResult(
  centerResult: ReturnType<typeof resolveCenterVisualSync>,
  layoutResult: ReturnType<typeof computeLayout>,
  surfaceBackground: string | undefined,
): RenderResult {
  return {
    svg: renderSvg(layoutResult.geometry, surfaceBackground),
    viewBox: layoutResult.geometry.viewBox,
    diagnostics: [...centerResult.diagnostics, ...layoutResult.diagnostics],
    layout: layoutResult.geometry,
  };
}

/** Resolve render options with defaults for measurement and margin. */
function resolveMeasureAndMargin(renderOptions?: RenderOptions) {
  return {
    measure: renderOptions?.measure ?? createDefaultMeasurementAdapter(),
    marginRatio: renderOptions?.marginRatio ?? 0.05,
  };
}

/**
 * Core rendering function that works with an OrganicTree directly.
 *
 * @param tree - OrganicTree to render
 * @param options - Optional surface preset and rendering configuration
 * @returns RenderResult with SVG string, viewBox, diagnostics, and layout
 */
export function renderFromTree(
  tree: OrganicTree,
  options?: {
    surfacePreset?: string;
    renderOptions?: RenderOptions;
  },
): RenderResult {
  const surfacePreset = options?.surfacePreset ?? "sqrt2-landscape";
  const { measure, marginRatio } = resolveMeasureAndMargin(
    options?.renderOptions,
  );

  // Derive seed
  const serialized = stableSerializeTree(tree);
  const contentHash = deriveOrganicSeed(serialized);

  // Resolve center visual (sync)
  const centerResult = resolveCenterVisualSync(
    tree.center,
    options?.renderOptions?.centerVisualSvg,
    contentHash,
  );

  // Compute layout
  const layoutResult = computeLayout(tree, {
    surfacePreset,
    centerVisualSvg: centerResult.svgContent,
    centerUsedFallback: centerResult.usedFallback,
    measure,
    marginRatio,
  });

  return buildRenderResult(
    centerResult,
    layoutResult,
    options?.renderOptions?.paperBackground,
  );
}

/**
 * Render a mind map from an OmmDocument (.omm file format).
 *
 * Extracts the tree structure and surface spec from the document
 * and delegates to the layout engine.
 */
export function renderFromOmm(
  document: OmmDocument,
  options?: RenderOptions,
): RenderResult {
  // Convert OmmDocument's MindMap tree to OrganicTree format
  const tree = convertMindMapToTree(document.rootMap);

  // Use surface preset from the document
  const surfacePreset = document.surface.preset;

  return renderFromTree(tree, { surfacePreset, renderOptions: options });
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
    case "organic-tree":
      return renderFromTree(input.tree, { renderOptions: options });
    case "omm-document":
      return renderFromOmm(input.document, options);
  }
}
