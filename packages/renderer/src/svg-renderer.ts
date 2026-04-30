/**
 * SVG rendering engine.
 *
 * Assembles the final SVG output from layout geometry:
 * - Paper background and boundary
 * - Branch curves with tapered strokes
 * - Text-on-path labels
 * - Center visual
 *
 * Returns a complete SVG string with stable viewBox.
 */

import type { LayoutGeometry } from "./types.js";
import { resolveBranchMarker, renderMarkerSvg } from "./branch-markers.js";

// ─── SVG Assembly ──────────────────────────────────────────────────────────

/**
 * Render a complete SVG mind map from layout geometry.
 *
 * @param layout - Computed layout geometry from computeLayout()
 * @param surfaceBackground - CSS color string for surface background
 * @returns Complete SVG string
 */
export function renderSvg(
  layout: LayoutGeometry,
  surfaceBackground: string = "#FFFFFF",
): string {
  const parts: string[] = [];

  // SVG header
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${layout.viewBox}" width="${layout.surfaceBounds.width}" height="${layout.surfaceBounds.height}">`,
  );

  // Surface background
  parts.push(renderSurfaceBackground(layout, surfaceBackground));

  // Surface boundary (subtle border)
  parts.push(renderSurfaceBoundary(layout));

  // Branches (render depth-first, so deeper branches are behind main branches)
  parts.push(renderBranches(layout));

  // Center visual (rendered last so it's on top)
  parts.push(renderCenterVisual(layout));

  // SVG footer
  parts.push("</svg>");

  return parts.join("\n");
}

// ─── Surface Background ────────────────────────────────────────────────────

function renderSurfaceBackground(
  layout: LayoutGeometry,
  background: string,
): string {
  return `  <!-- Surface background -->
  <rect x="0" y="0" width="${layout.surfaceBounds.width}" height="${layout.surfaceBounds.height}" fill="${escapeAttr(background)}"/>`;
}

// ─── Surface Boundary ─────────────────────────────────────────────────────

function renderSurfaceBoundary(layout: LayoutGeometry): string {
  return `  <!-- Surface boundary -->
  <rect x="0.5" y="0.5" width="${layout.surfaceBounds.width - 1}" height="${layout.surfaceBounds.height - 1}" fill="none" stroke="#CCCCCC" stroke-width="1"/>`;
}

// ─── Branches ──────────────────────────────────────────────────────────────

function renderBranches(layout: LayoutGeometry): string {
  const parts: string[] = [];
  parts.push("  <!-- Branches -->");

  // Collect branches by depth for layer ordering
  const byDepth = new Map<number, string[]>();
  for (const nodeId of layout.nodeOrder) {
    const branch = layout.branches[nodeId];
    if (!branch) continue;

    if (!byDepth.has(branch.depth)) byDepth.set(branch.depth, []);
    byDepth.get(branch.depth)!.push(nodeId);
  }

  // Render deepest branches first (behind), then shallower
  const depths = Array.from(byDepth.keys()).sort((a, b) => b - a);

  for (const depth of depths) {
    const nodeIds = byDepth.get(depth);
    if (!nodeIds) continue;

    for (const nodeId of nodeIds) {
      const branch = layout.branches[nodeId];
      if (!branch) continue;

      parts.push(renderSingleBranch(branch, nodeId));
    }
  }

  return parts.join("\n");
}

function renderSingleBranch(
  branch: import("./types.js").BranchGeometry,
  nodeId: string,
): string {
  const pathId = `branch-${nodeId}`;
  const textPathId = `textpath-${nodeId}`;
  const fontSize = branch.depth === 1 ? 80 : branch.depth === 2 ? 56 : 42;
  const fontWeight = branch.depth === 1 ? "bold" : "normal";
  const startOffset = branch.depth === 1 ? "30%" : "25%";

  // Branch path with tapered stroke — using a single <path> with stroke-width
  // For true tapering, we use a filled shape instead of a stroked path
  const parts: string[] = [];
  parts.push(`  <!-- Branch: ${escapeComment(nodeId)} -->`);

  // Filled tapered shape: two offset outlines connected at ends
  const taperedPath = buildTaperedPath(
    { start: branch.startPoint, end: branch.endPoint },
    branch.strokeWidthStart,
    branch.strokeWidthEnd,
  );
  parts.push(
    `  <path id="${pathId}" d="${taperedPath}" fill="${escapeAttr(branch.color)}" stroke="none" stroke-linecap="round" opacity="0.9"/>`,
  );

  // Text on path
  const displayText = escapeXml(branch.concept);

  parts.push(
    `  <path id="${textPathId}" d="${branch.textPath}" fill="none" stroke="none"/>`,
  );
  parts.push(`  <text font-size="${fontSize}" font-family="Arial, Helvetica, sans-serif" font-weight="${fontWeight}" fill="${escapeAttr(branch.color)}" opacity="0.95">
    <textPath href="#${textPathId}" startOffset="${startOffset}" text-anchor="middle">
      ${displayText}
    </textPath>
  </text>`);

  // Render branch visual hint marker (if supported)
  if (branch.visualHint) {
    const marker = resolveBranchMarker(branch.visualHint);
    if (marker) {
      const mx = branch.endPoint.x;
      const my = branch.endPoint.y;
      parts.push(
        renderMarkerSvg(marker, {
          x: mx,
          y: my,
          color: branch.color,
          depth: branch.depth,
        }),
      );
    }
    // Unsupported hints are silently ignored — no marker rendered
  }

  return parts.join("\n");
}

// ─── Center Visual ─────────────────────────────────────────────────────────

function renderCenterVisual(layout: LayoutGeometry): string {
  const center = layout.center;
  const bbox = center.boundingBox;

  // Embed the center visual SVG content within a group
  // We scale and position it within the bounding box
  return `  <!-- Center visual${center.usedFallback ? " (fallback)" : ""} -->
  <g transform="translate(${bbox.x.toFixed(1)}, ${bbox.y.toFixed(1)}) scale(${(bbox.width / 200).toFixed(4)}, ${(bbox.height / 200).toFixed(4)})">
    ${center.svgContent}
  </g>`;
}

// ─── XML Escaping ──────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeComment(str: string): string {
  return str.replace(/--/g, "\\u002d\\u002d").replace(/-/g, "\\u002d");
}

type Vec2 = { x: number; y: number };

function buildTaperedPath(
  line: { start: Vec2; end: Vec2 },
  widthStart: number,
  widthEnd: number,
): string {
  const { start, end } = line;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const hs = widthStart / 2;
  const he = widthEnd / 2;

  const a = { x: start.x + nx * hs, y: start.y + ny * hs };
  const b = { x: end.x + nx * he, y: end.y + ny * he };
  const c = { x: end.x - nx * he, y: end.y - ny * he };
  const d = { x: start.x - nx * hs, y: start.y - ny * hs };

  const f = (v: Vec2) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`;
  return `M${f(a)} L${f(b)} Q${f(end)} ${f(c)} L${f(d)} Q${f(start)} Z`;
}
