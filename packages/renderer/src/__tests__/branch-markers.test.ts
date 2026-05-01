/**
 * Tests for branch visual hint markers (add-branch-visual-hints change).
 */

import { describe, it, expect } from "vitest";
import {
  resolveBranchMarker,
  isSupportedHint,
  renderMarkerSvg,
  markerBoundingBox,
  SUPPORTED_HINT_NAMES,
  MARKER_SIZE,
} from "../branch-markers";
import { renderSvg } from "../svg-renderer";
import { computeLayout } from "../layout";
import type { OrganicTree } from "@omm/core";
import type {
  TextMeasurementAdapter,
  TextMetrics,
  LayoutGeometry,
} from "../types";

// ─── Test Data ────────────────────────────────────────────────────────────

const TREE_WITH_HINTS: OrganicTree = {
  version: 1,
  title: "Branch Visual Hints Test",
  center: { concept: "PROJECT PLANNING" },
  branches: [
    {
      concept: "RESEARCH",
      visualHint: "lightbulb",
      children: [
        { concept: "MARKET ANALYSIS", visualHint: "earth" },
        { concept: "USER STUDIES", visualHint: "heart" },
      ],
    },
    {
      concept: "DEVELOPMENT",
      visualHint: "star",
      children: [
        { concept: "FRONTEND", visualHint: "check" },
        { concept: "BACKEND", visualHint: "arrow" },
      ],
    },
    {
      concept: "RISKS",
      visualHint: "warning",
      children: [
        { concept: "SECURITY", visualHint: "lock" },
        { concept: "SCALABILITY", visualHint: "unknown-hint-fallback" },
      ],
    },
  ],
};

const TREE_NO_HINTS: OrganicTree = {
  version: 1,
  title: "No Hints Test",
  center: { concept: "CENTER" },
  branches: [{ concept: "BRANCH ONE" }, { concept: "BRANCH TWO" }],
};

function createMockMeasure(): TextMeasurementAdapter {
  return {
    measureText(text: string, options: { fontSize: number }): TextMetrics {
      return {
        width: text.length * options.fontSize * 0.6,
        height: options.fontSize * 1.2,
        ascent: options.fontSize * 0.9,
        descent: options.fontSize * 0.3,
      };
    },
  };
}

function layoutForTree(tree: OrganicTree): LayoutGeometry {
  return computeLayout(tree, {
    surfacePreset: "sqrt2-landscape",
    centerVisualSvg: "<svg></svg>",
    centerUsedFallback: true,
    measure: createMockMeasure(),
  }).geometry;
}

// ─── Hint Resolution Tests ────────────────────────────────────────────────

describe("branch-markers - resolveBranchMarker", () => {
  it("returns a marker for all supported hint names", () => {
    for (const name of SUPPORTED_HINT_NAMES) {
      const marker = resolveBranchMarker(name);
      expect(marker).toBeDefined();
      expect(marker!.name).toBe(name);
    }
  });

  it("matches hints case-insensitively", () => {
    expect(resolveBranchMarker("Star")).toBeDefined();
    expect(resolveBranchMarker("HEART")).toBeDefined();
    expect(resolveBranchMarker("LightBulb")).toBeDefined();
  });

  it("trims whitespace before matching", () => {
    expect(resolveBranchMarker("  star  ")).toBeDefined();
    expect(resolveBranchMarker("\tcheck\n")).toBeDefined();
  });

  it("returns undefined for unsupported hints", () => {
    expect(resolveBranchMarker("unknown")).toBeUndefined();
    expect(resolveBranchMarker("emoji:fire")).toBeUndefined();
    expect(resolveBranchMarker("")).toBeUndefined();
  });

  it("returns undefined for null and undefined", () => {
    expect(resolveBranchMarker(null)).toBeUndefined();
    expect(resolveBranchMarker(undefined)).toBeUndefined();
  });
});

describe("branch-markers - isSupportedHint", () => {
  it("returns true for supported hints", () => {
    expect(isSupportedHint("star")).toBe(true);
    expect(isSupportedHint("heart")).toBe(true);
    expect(isSupportedHint("arrow")).toBe(true);
  });

  it("returns false for unsupported hints", () => {
    expect(isSupportedHint("unknown")).toBe(false);
    expect(isSupportedHint("")).toBe(false);
    expect(isSupportedHint(null)).toBe(false);
  });
});

// ─── Marker SVG Rendering Tests ──────────────────────────────────────────

describe("branch-markers - renderMarkerSvg - structure", () => {
  it("returns a string containing the marker class and data-hint attribute", () => {
    const marker = resolveBranchMarker("star")!;
    const svg = renderMarkerSvg(marker, {
      x: 100,
      y: 200,
      color: "#E74C3C",
      depth: 1,
    });
    expect(svg).toContain('class="branch-marker"');
    expect(svg).toContain('data-hint="star"');
  });

  it("includes a transform with translate and scale", () => {
    const marker = resolveBranchMarker("check")!;
    const svg = renderMarkerSvg(marker, {
      x: 100,
      y: 200,
      color: "#2ECC71",
      depth: 1,
    });
    expect(svg).toContain("translate(");
    expect(svg).toContain("scale(");
  });

  it("renders raw SVG elements inside the marker group", () => {
    const marker = resolveBranchMarker("warning")!;
    const svg = renderMarkerSvg(marker, {
      x: 100,
      y: 200,
      color: "#F39C12",
      depth: 3,
    });
    expect(svg).toMatch(/<path\b/);
  });

  it("renders polygon elements for star marker", () => {
    const marker = resolveBranchMarker("star")!;
    const svg = renderMarkerSvg(marker, {
      x: 100,
      y: 200,
      color: "#F39C12",
      depth: 1,
    });
    expect(svg).toMatch(/<polygon\b/);
  });
});

describe("branch-markers - renderMarkerSvg - styling", () => {
  it("includes the branch color", () => {
    const marker = resolveBranchMarker("heart")!;
    const svg = renderMarkerSvg(marker, {
      x: 100,
      y: 200,
      color: "#3498DB",
      depth: 2,
    });
    expect(svg).toContain("color:#3498DB");
  });

  it("scales markers smaller for deeper branches", () => {
    const marker = resolveBranchMarker("star")!;
    const svg1 = renderMarkerSvg(marker, {
      x: 0,
      y: 0,
      color: "#000",
      depth: 1,
    });
    const svg2 = renderMarkerSvg(marker, {
      x: 0,
      y: 0,
      color: "#000",
      depth: 2,
    });
    const svg3 = renderMarkerSvg(marker, {
      x: 0,
      y: 0,
      color: "#000",
      depth: 3,
    });
    const scaleMatch1 = svg1.match(/scale\(([^)]+)\)/);
    const scaleMatch2 = svg2.match(/scale\(([^)]+)\)/);
    const scaleMatch3 = svg3.match(/scale\(([^)]+)\)/);
    expect(scaleMatch1).toBeDefined();
    expect(scaleMatch2).toBeDefined();
    expect(scaleMatch3).toBeDefined();
    expect(parseFloat(scaleMatch1![1])).toBeGreaterThan(
      parseFloat(scaleMatch2![1]),
    );
    expect(parseFloat(scaleMatch2![1])).toBeGreaterThan(
      parseFloat(scaleMatch3![1]),
    );
  });
});

// ─── Marker Bounding Box Tests ───────────────────────────────────────────

describe("branch-markers - markerBoundingBox", () => {
  it("returns a valid bounding box", () => {
    const marker = resolveBranchMarker("star")!;
    const bbox = markerBoundingBox(marker, { x: 100, y: 200, depth: 1 });
    expect(bbox.x).toBeLessThan(100);
    expect(bbox.y).toBeLessThan(200);
    expect(bbox.x + bbox.width).toBeGreaterThan(100);
    expect(bbox.y + bbox.height).toBeGreaterThan(200);
  });

  it("returns smaller boxes for deeper branches", () => {
    const marker = resolveBranchMarker("star")!;
    const bbox1 = markerBoundingBox(marker, { x: 0, y: 0, depth: 1 });
    const bbox2 = markerBoundingBox(marker, { x: 0, y: 0, depth: 2 });
    const bbox3 = markerBoundingBox(marker, { x: 0, y: 0, depth: 3 });
    expect(bbox1.width).toBeGreaterThan(bbox2.width);
    expect(bbox2.width).toBeGreaterThan(bbox3.width);
  });

  it("uses MARKER_SIZE as the base size for depth 1", () => {
    const marker = resolveBranchMarker("star")!;
    const bbox = markerBoundingBox(marker, { x: 100, y: 100, depth: 1 });
    expect(bbox.width).toBe(MARKER_SIZE);
    expect(bbox.height).toBe(MARKER_SIZE);
  });
});

// ─── Integration: SVG Output with Markers ────────────────────────────────

describe("branch-markers - SVG integration", () => {
  it("renders markers for branches with supported visual hints", () => {
    const layout = layoutForTree(TREE_WITH_HINTS);
    const svg = renderSvg(layout);

    // Should contain branch-marker class for supported hints
    const markerCount = (svg.match(/class="branch-marker"/g) || []).length;
    // RESEARCH (lightbulb), DEVELOPMENT (star), RISKS (warning) = 3 main
    // MARKET ANALYSIS (earth), USER STUDIES (heart), FRONTEND (check),
    // BACKEND (arrow), SECURITY (lock) = 5 sub/leaf
    // SCALABILITY has unsupported hint → no marker
    expect(markerCount).toBe(8);
  });

  it("renders marker data-hint attributes for supported hints", () => {
    const layout = layoutForTree(TREE_WITH_HINTS);
    const svg = renderSvg(layout);

    expect(svg).toContain('data-hint="lightbulb"');
    expect(svg).toContain('data-hint="star"');
    expect(svg).toContain('data-hint="warning"');
    expect(svg).toContain('data-hint="earth"');
    expect(svg).toContain('data-hint="heart"');
    expect(svg).toContain('data-hint="check"');
    expect(svg).toContain('data-hint="arrow"');
    expect(svg).toContain('data-hint="lock"');
  });

  it("does not render markers for unsupported hints", () => {
    const layout = layoutForTree(TREE_WITH_HINTS);
    const svg = renderSvg(layout);
    expect(svg).not.toContain('data-hint="unknown-hint-fallback"');
  });

  it("does not render markers when no visual hints are present", () => {
    const layout = layoutForTree(TREE_NO_HINTS);
    const svg = renderSvg(layout);
    expect(svg).not.toContain("branch-marker");
  });

  it("still renders valid SVG structure with markers", () => {
    const layout = layoutForTree(TREE_WITH_HINTS);
    const svg = renderSvg(layout);
    expect(svg.trim().startsWith("<svg")).toBe(true);
    expect(svg.trim().endsWith("</svg>")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="');
  });
});

// ─── Integration: Layout Geometry with Markers ───────────────────────────

describe("branch-markers - layout geometry", () => {
  it("includes visualHint and markerBoundingBox on branches with supported hints", () => {
    const layout = layoutForTree(TREE_WITH_HINTS);
    const branches = Object.values(layout.branches);

    // Find a branch with a supported hint (e.g., "star" for DEVELOPMENT)
    const starBranch = branches.find((b) => b.visualHint === "star");
    expect(starBranch).toBeDefined();
    expect(starBranch!.markerBoundingBox).toBeDefined();
    expect(starBranch!.markerBoundingBox!.width).toBeGreaterThan(0);
    expect(starBranch!.markerBoundingBox!.height).toBeGreaterThan(0);
  });

  it("includes visualHint but no markerBoundingBox for unsupported hints", () => {
    const layout = layoutForTree(TREE_WITH_HINTS);
    const branches = Object.values(layout.branches);

    const fallbackBranch = branches.find(
      (b) => b.visualHint === "unknown-hint-fallback",
    );
    expect(fallbackBranch).toBeDefined();
    expect(fallbackBranch!.markerBoundingBox).toBeUndefined();
  });

  it("does not set visualHint on branches without hints", () => {
    const layout = layoutForTree(TREE_NO_HINTS);
    const branches = Object.values(layout.branches);
    for (const branch of branches) {
      expect(branch.visualHint).toBeUndefined();
      expect(branch.markerBoundingBox).toBeUndefined();
    }
  });
});
