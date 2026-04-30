/**
 * Main renderer entry points: renderFromTree() and renderFromOmm().
 *
 * These are the public API functions that accept either an OrganicTree
 * or an OmmDocument and return a complete SVG render result.
 */

import type {
  OmmDocument,
  OrganicTree,
  LayoutBox,
  LayoutSnapshot,
  BranchLayout,
  Point,
  MindNode,
} from "@omm/core";
import type {
  RenderInput,
  RenderResult,
  RenderOptions,
  LayoutGeometry,
  BranchGeometry,
  CenterGeometry,
} from "./types.js";
import {
  stableSerializeTree,
  deriveOrganicSeed,
  assignMainBranchColors,
  MAIN_BRANCH_COLORS,
} from "./seed.js";
import { computeLayout, createDefaultMeasurementAdapter } from "./layout.js";
import { renderSvg } from "./svg-renderer.js";
import { resolveCenterVisualSync } from "./center-visual.js";
import { toDisplayLabel } from "./display-label.js";

// ─── Node Concept Metadata ──────────────────────────────────────────────

type NodeConceptInfo = {
  concept: string;
  depth: number;
  parentId?: string;
  color?: string;
};

// ─── Shared Helpers ─────────────────────────────────────────────────────

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

/** Check whether an OmmDocument's layout snapshot is usable for rendering. */
function hasUsableLayout(doc: OmmDocument): boolean {
  const s = doc.layout;
  return (
    s != null &&
    s.viewport?.viewBox != null &&
    s.center?.box != null &&
    Object.keys(s.branches ?? {}).length > 0
  );
}

// ─── renderFromTree ─────────────────────────────────────────────────────

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

  const serialized = stableSerializeTree(tree);
  const contentHash = deriveOrganicSeed(serialized);

  const centerResult = resolveCenterVisualSync(
    tree.center,
    options?.renderOptions?.centerVisualSvg,
    contentHash,
  );

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

// ─── renderFromOmm ──────────────────────────────────────────────────────

/**
 * Render a mind map from an OmmDocument (.omm file format).
 *
 * Extracts the tree structure and surface spec from the document.
 * If the document contains a valid layout snapshot, uses it directly
 * instead of re-running the layout engine.
 */
export function renderFromOmm(
  document: OmmDocument,
  options?: RenderOptions,
): RenderResult {
  const tree = convertMindMapToTree(document.rootMap);
  const serialized = stableSerializeTree(tree);
  const contentHash = deriveOrganicSeed(serialized);

  const centerResult = resolveCenterVisualSync(
    tree.center,
    options?.centerVisualSvg,
    contentHash,
  );

  if (hasUsableLayout(document)) {
    return renderFromSavedLayout(
      document,
      tree,
      centerResult,
      options?.paperBackground,
    );
  }

  return computeAndRender(tree, centerResult, document.surface.preset, options);
}

/** Render using the saved layout snapshot from the OmmDocument. */
// eslint-disable-next-line max-params
function renderFromSavedLayout(
  document: OmmDocument,
  tree: OrganicTree,
  centerResult: ReturnType<typeof resolveCenterVisualSync>,
  paperBackground: string | undefined,
): RenderResult {
  const mindMapConcepts = collectMindMapConcepts(
    document.rootMap.children ?? [],
  );
  const geometry = reconstructLayoutGeometry(
    document.layout,
    tree,
    document.surface.preset,
    centerResult,
    mindMapConcepts,
  );

  return {
    svg: renderSvg(geometry, paperBackground),
    viewBox: geometry.viewBox,
    diagnostics: [...centerResult.diagnostics],
    layout: geometry,
  };
}
/** Compute layout from scratch and return a full render result. */
// eslint-disable-next-line max-params
function computeAndRender(
  tree: OrganicTree,
  centerResult: ReturnType<typeof resolveCenterVisualSync>,
  surfacePreset: string,
  options?: RenderOptions,
): RenderResult {
  const { measure, marginRatio } = resolveMeasureAndMargin(options);

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
    options?.paperBackground,
  );
}

// ─── Layout Geometry Reconstruction ─────────────────────────────────────

/**
 * Reconstruct LayoutGeometry from a saved LayoutSnapshot.
 *
 * This is the inverse of buildLayoutSnapshot(): it takes persisted
 * layout data and converts it back into LayoutGeometry for renderSvg().
 */
// eslint-disable-next-line max-params
function reconstructLayoutGeometry(
  snapshot: LayoutSnapshot,
  tree: OrganicTree,
  surfacePreset: string,
  centerResult: ReturnType<typeof resolveCenterVisualSync>,
  mindMapConcepts: Map<
    string,
    { concept: string; depth: number; parentId?: string }
  >,
): LayoutGeometry {
  const { surfaceBounds, safeArea } = reconstructSurface(snapshot.viewport);
  const centerGeometry = reconstructCenter(snapshot.center.box, centerResult);
  const mergedConcepts = buildMergedConcepts(tree, mindMapConcepts);

  const branches: Record<string, BranchGeometry> = {};
  const boundingBoxes: LayoutBox[] = [snapshot.center.box];
  const nodeOrder: string[] = [];

  for (const nodeId of Object.keys(snapshot.branches)) {
    const branch = snapshot.branches[nodeId] as BranchLayout | undefined;
    if (!branch) continue;

    const bg = reconstructBranchGeometry(
      nodeId,
      branch,
      snapshot,
      mergedConcepts,
    );
    branches[nodeId] = bg;
    boundingBoxes.push(bg.boundingBox);
    nodeOrder.push(nodeId);
  }

  return {
    surfacePreset,
    viewBox: snapshot.viewport.viewBox,
    surfaceBounds,
    safeArea,
    center: centerGeometry,
    branches,
    boundingBoxes,
    nodeOrder,
  };
}

/** Reconstruct surface bounds and safe area from viewport. */
function reconstructSurface(viewport: LayoutSnapshot["viewport"]) {
  const vb = viewport.viewBox.split(" ").map(Number);
  const w = vb[2] ?? 4200;
  const h = vb[3] ?? 2970;
  const mx = w * 0.05;
  const my = h * 0.05;

  return {
    surfaceBounds: { x: 0, y: 0, width: w, height: h } satisfies LayoutBox,
    safeArea: {
      x: mx,
      y: my,
      width: w - 2 * mx,
      height: h - 2 * my,
    } satisfies LayoutBox,
  };
}

/** Reconstruct center geometry from snapshot box + resolved center visual. */
function reconstructCenter(
  centerBox: LayoutBox,
  centerResult: ReturnType<typeof resolveCenterVisualSync>,
): CenterGeometry {
  return {
    boundingBox: centerBox,
    centerPoint: {
      x: centerBox.x + centerBox.width / 2,
      y: centerBox.y + centerBox.height / 2,
    },
    svgContent: centerResult.svgContent,
    usedFallback: centerResult.usedFallback,
  };
}

/**
 * Build a unified concept map merging renderer-scheme IDs and MindMap IDs.
 */
function buildMergedConcepts(
  tree: OrganicTree,
  mindMapConcepts: Map<
    string,
    { concept: string; depth: number; parentId?: string }
  >,
): Map<string, NodeConceptInfo> {
  const treeConcepts = collectNodeConcepts(tree);
  const merged = new Map(treeConcepts);

  for (const [id, info] of mindMapConcepts) {
    if (!merged.has(id)) {
      merged.set(id, {
        concept: info.concept,
        depth: info.depth,
        parentId: info.parentId,
        color: "#34495E",
      });
    }
  }

  return merged;
}

/** Reconstruct a single BranchGeometry from snapshot data. */
// eslint-disable-next-line max-params, complexity
function reconstructBranchGeometry(
  nodeId: string,
  branchLayout: BranchLayout,
  snapshot: LayoutSnapshot,
  concepts: Map<string, NodeConceptInfo>,
): BranchGeometry {
  const info = concepts.get(nodeId);
  const depth = info?.depth ?? inferDepthFromBranchLayout(branchLayout);
  const color = info?.color ?? "#34495E";
  const concept = toDisplayLabel(
    info?.concept ?? inferConceptFromSnapshot(nodeId),
  );

  const { startPoint, endPoint } = approximatePathEndpoints(
    branchLayout.branchPath,
  );
  const bbox = computePathBBoxFromLayout(
    startPoint,
    endPoint,
    branchLayout.strokeWidthStart,
  );
  const nodeLayout = snapshot.nodes?.[nodeId];
  const textBBox: LayoutBox = nodeLayout?.textBox ?? {
    x: startPoint.x,
    y: startPoint.y,
    width: 0,
    height: 0,
  };

  return {
    nodeId,
    concept,
    depth,
    parentNodeId: info?.parentId,
    color,
    branchPath: branchLayout.branchPath,
    textPath: branchLayout.textPath,
    strokeWidthStart: branchLayout.strokeWidthStart,
    strokeWidthEnd: branchLayout.strokeWidthEnd,
    boundingBox: bbox,
    textBoundingBox: textBBox,
    textClipped: false,
    startPoint,
    endPoint,
  };
}

// ─── Node Concept Collection ────────────────────────────────────────────

/**
 * Collect node concept and depth from MindNode children (from MindMap).
 */
function collectMindMapConcepts(
  children: MindNode[],
): Map<string, { concept: string; depth: number; parentId?: string }> {
  const map = new Map<
    string,
    { concept: string; depth: number; parentId?: string }
  >();

  for (const node of children) {
    map.set(node.id, { concept: node.concept, depth: 1 });
    collectMindMapSubNodes(node, map);
  }

  return map;
}

/** Recursively collect sub-node and leaf concepts from a MindNode. */
function collectMindMapSubNodes(
  node: MindNode,
  map: Map<string, { concept: string; depth: number; parentId?: string }>,
): void {
  if (!node.children) return;

  for (const child of node.children) {
    map.set(child.id, {
      concept: child.concept,
      depth: 2,
      parentId: node.id,
    });
    collectMindMapLeafNodes(child, map);
  }
}

/** Collect leaf-level concepts from a sub-node. */
function collectMindMapLeafNodes(
  child: MindNode,
  map: Map<string, { concept: string; depth: number; parentId?: string }>,
): void {
  if (!child.children) return;

  for (const leaf of child.children) {
    map.set(leaf.id, {
      concept: leaf.concept,
      depth: 3,
      parentId: child.id,
    });
  }
}

/**
 * Collect node concept, depth, parentId, and color from an OrganicTree.
 * Maps flat node IDs (matching the renderer's scheme) to their metadata.
 */
function collectNodeConcepts(tree: OrganicTree): Map<string, NodeConceptInfo> {
  const map = new Map<string, NodeConceptInfo>();
  const mainColors = assignMainBranchColors(
    tree.branches.length,
    deriveOrganicSeed(stableSerializeTree(tree)),
  );

  let index = 0;

  for (let i = 0; i < tree.branches.length; i++) {
    const branch = tree.branches[i]!;
    const mainId = `n-${index}`;
    const mainColor =
      mainColors[i] ?? MAIN_BRANCH_COLORS[i % MAIN_BRANCH_COLORS.length]!;
    map.set(mainId, { concept: branch.concept, depth: 1, color: mainColor });
    index++;

    if (branch.children) {
      index = collectSubTreeNodes(
        branch.children,
        mainId,
        mainColor,
        index,
        map,
      );
    }
  }

  return map;
}

/** Collect sub-branch and leaf node IDs for an OrganicTree branch's children. */
// eslint-disable-next-line max-params
function collectSubTreeNodes(
  children: OrganicTree["branches"][number]["children"],
  parentId: string,
  color: string,
  index: number,
  map: Map<string, NodeConceptInfo>,
): number {
  if (!children) return index;

  for (const sub of children) {
    const subId = `n-${index}`;
    map.set(subId, {
      concept: sub.concept,
      depth: 2,
      parentId,
      color,
    });
    index++;

    if (sub.children) {
      for (const leaf of sub.children) {
        const leafId = `n-${index}`;
        map.set(leafId, {
          concept: leaf.concept,
          depth: 3,
          parentId: subId,
          color,
        });
        index++;
      }
    }
  }

  return index;
}

// ─── Path Utilities ─────────────────────────────────────────────────────

/**
 * Approximate start and end points from an SVG path data string.
 */
function approximatePathEndpoints(pathData: string): {
  startPoint: Point;
  endPoint: Point;
} {
  const startMatch = pathData.match(/M\s*([-\d.]+)\s*,\s*([-\d.]+)/);
  const coords = pathData.match(/[-\d.]+/g);
  const lastX = parseFloat(coords?.[coords.length - 2] ?? "0");
  const lastY = parseFloat(coords?.[coords.length - 1] ?? "0");

  return {
    startPoint: {
      x: parseFloat(startMatch?.[1] ?? "0"),
      y: parseFloat(startMatch?.[2] ?? "0"),
    },
    endPoint: { x: lastX, y: lastY },
  };
}

/** Compute a bounding box from start/end points with padding. */
function computePathBBoxFromLayout(s: Point, e: Point, pad: number): LayoutBox {
  return {
    x: Math.min(s.x, e.x) - pad,
    y: Math.min(s.y, e.y) - pad,
    width: Math.abs(e.x - s.x) + pad * 2,
    height: Math.abs(e.y - s.y) + pad * 2,
  };
}

/** Infer branch depth from stroke widths. */
function inferDepthFromBranchLayout(branchLayout: BranchLayout): number {
  if (branchLayout.strokeWidthStart >= 5) return 1;
  if (branchLayout.strokeWidthStart >= 3) return 2;
  return 3;
}

/** Infer concept text as last resort — use node ID. */
function inferConceptFromSnapshot(nodeId: string): string {
  return nodeId;
}

// ─── MindMap → OrganicTree Conversion ───────────────────────────────────

/**
 * Convert a MindMap tree (from OmmDocument) to OrganicTree format.
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

// ─── Unified Entry Point ────────────────────────────────────────────────

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
