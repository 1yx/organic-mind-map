/**
 * Tests for layout computation (tasks 3.1-3.10).
 */

import { describe, it, expect } from "vitest";
import { computeLayout, createDefaultMeasurementAdapter } from "../layout";
import { computePaperLayout, boxesOverlap, findOverlaps } from "../diagnostics";
import type { AgentMindMapList } from "@omm/core";
import type {
  TextMeasurementAdapter,
  TextMetrics,
  BranchGeometry,
} from "../types";

// ─── Fixture ───────────────────────────────────────────────────────────────

const SIMPLE_TREE: AgentMindMapList = {
  version: 1,
  title: "Simple Map",
  center: { concept: "Center" },
  branches: [{ concept: "Branch A" }, { concept: "Branch B" }],
};

const NESTED_TREE: AgentMindMapList = {
  version: 1,
  title: "Nested Map",
  center: { concept: "Center" },
  branches: [
    {
      concept: "Main One",
      children: [
        {
          concept: "Sub 1A",
          children: [{ concept: "Leaf 1A1" }, { concept: "Leaf 1A2" }],
        },
        { concept: "Sub 1B" },
      ],
    },
    {
      concept: "Main Two",
      children: [{ concept: "Sub 2A" }],
    },
    {
      concept: "Main Three",
    },
  ],
};

const LONG_TEXT_TREE: AgentMindMapList = {
  version: 1,
  title: "Long Text Map",
  center: { concept: "Center" },
  branches: [
    { concept: "This Is A Very Long Branch Concept That Should Be Clipped" },
    { concept: "Short" },
  ],
};

// ─── Mock Measurement Adapter ──────────────────────────────────────────────

function createMockMeasure(): TextMeasurementAdapter {
  return {
    measureText(text: string, options: { fontSize: number }): TextMetrics {
      const width = text.length * options.fontSize * 0.6;
      return {
        width,
        height: options.fontSize * 1.2,
        ascent: options.fontSize * 0.9,
        descent: options.fontSize * 0.3,
      };
    },
  };
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function layout(
  tree: AgentMindMapList = SIMPLE_TREE,
  paper: "a3-landscape" | "a4-landscape" = "a3-landscape",
  svg = "<svg></svg>",
) {
  return computeLayout(tree, {
    paperKind: paper,
    centerVisualSvg: svg,
    centerUsedFallback: true,
    measure: createMockMeasure(),
  });
}

function layoutNoFallback(
  tree: AgentMindMapList,
  paper: "a3-landscape" | "a4-landscape",
  svg: string,
) {
  return computeLayout(tree, {
    paperKind: paper,
    centerVisualSvg: svg,
    centerUsedFallback: false,
    measure: createMockMeasure(),
  });
}

// ─── Paper Layout Tests ────────────────────────────────────────────────────

describe("computePaperLayout", () => {
  it("A3 landscape has correct viewBox", () => {
    const result = computePaperLayout("a3-landscape");
    expect(result.viewBox).toBe("0 0 4200 2970");
    expect(result.paperBounds.width).toBe(4200);
    expect(result.paperBounds.height).toBe(2970);
  });

  it("A4 landscape has correct viewBox", () => {
    const result = computePaperLayout("a4-landscape");
    expect(result.viewBox).toBe("0 0 2970 2100");
    expect(result.paperBounds.width).toBe(2970);
    expect(result.paperBounds.height).toBe(2100);
  });

  it("center point is at paper center", () => {
    const result = computePaperLayout("a3-landscape");
    expect(result.centerPoint.x).toBe(2100);
    expect(result.centerPoint.y).toBe(1485);
  });

  it("safe area is smaller than paper bounds", () => {
    const result = computePaperLayout("a3-landscape", 0.05);
    expect(result.safeArea.x).toBeGreaterThan(0);
    expect(result.safeArea.y).toBeGreaterThan(0);
    expect(result.safeArea.width).toBeLessThan(result.paperBounds.width);
    expect(result.safeArea.height).toBeLessThan(result.paperBounds.height);
  });

  it("default margin is 5%", () => {
    const result = computePaperLayout("a3-landscape", 0.05);
    const mx = result.paperBounds.width * 0.05;
    expect(result.safeArea.x).toBe(mx);
  });
});

// ─── Default Measurement Adapter ───────────────────────────────────────────

describe("createDefaultMeasurementAdapter", () => {
  it("returns an adapter with measureText", () => {
    const adapter = createDefaultMeasurementAdapter();
    expect(typeof adapter.measureText).toBe("function");
  });

  it("measures text width proportional to character count", () => {
    const adapter = createDefaultMeasurementAdapter();
    const short = adapter.measureText("Hi", { fontSize: 80 });
    const long = adapter.measureText("Hello World", { fontSize: 80 });
    expect(long.width).toBeGreaterThan(short.width);
  });

  it("measures wider text for larger font size", () => {
    const adapter = createDefaultMeasurementAdapter();
    const small = adapter.measureText("Test", { fontSize: 40 });
    const large = adapter.measureText("Test", { fontSize: 80 });
    expect(large.width).toBeGreaterThan(small.width);
  });
});

// ─── Layout Computation ────────────────────────────────────────────────────

describe("computeLayout - basic structure", () => {
  it("produces layout geometry with required fields", () => {
    const result = layout();
    expect(result.geometry).toBeDefined();
    expect(result.geometry.viewBox).toBe("0 0 4200 2970");
    expect(result.geometry.paperKind).toBe("a3-landscape");
    expect(result.geometry.center).toBeDefined();
    expect(result.geometry.branches).toBeDefined();
    expect(result.geometry.nodeOrder).toBeDefined();
  });

  it("places center at paper center", () => {
    const result = layout();
    expect(result.geometry.center.centerPoint.x).toBe(2100);
    expect(result.geometry.center.centerPoint.y).toBe(1485);
  });

  it("generates branch geometries for all tree nodes", () => {
    const result = layout();
    expect(Object.keys(result.geometry.branches)).toHaveLength(2);
    expect(result.geometry.nodeOrder).toHaveLength(2);
  });
});

describe("computeLayout - nested trees", () => {
  it("handles nested trees", () => {
    const result = layout(NESTED_TREE);
    expect(Object.keys(result.geometry.branches)).toHaveLength(8);
    expect(result.geometry.nodeOrder).toHaveLength(8);
  });
});

describe("computeLayout - branch paths", () => {
  it("branch geometries have valid path data", () => {
    const branches = Object.values(
      layout().geometry.branches,
    ) as BranchGeometry[];
    for (const branch of branches) {
      expect(branch.branchPath).toMatch(/^M/);
      expect(branch.textPath).toMatch(/^M/);
      expect(branch.startPoint).toBeDefined();
      expect(branch.endPoint).toBeDefined();
      expect(branch.boundingBox).toBeDefined();
    }
  });
});

describe("computeLayout - stroke widths", () => {
  it("branch stroke widths decrease with depth", () => {
    const branches = Object.values(
      layout(NESTED_TREE).geometry.branches,
    ) as BranchGeometry[];
    for (const branch of branches) {
      expect(branch.strokeWidthStart).toBeGreaterThanOrEqual(
        branch.strokeWidthEnd,
      );
      if (branch.depth === 1) {
        expect(branch.strokeWidthStart).toBe(28);
      } else if (branch.depth === 2) {
        expect(branch.strokeWidthStart).toBe(16);
      } else {
        expect(branch.strokeWidthStart).toBe(10);
      }
    }
  });
});

describe("computeLayout - branch colors", () => {
  it("main branches have distinct colors", () => {
    const branches = Object.values(
      layout().geometry.branches,
    ) as BranchGeometry[];
    const mainBranches = branches.filter((b) => b.depth === 1);
    const colors = mainBranches.map((b) => b.color);
    const unique = new Set(colors);
    expect(unique.size).toBe(colors.length);
  });

  it("children inherit parent branch color", () => {
    const branches = Object.values(
      layout(NESTED_TREE).geometry.branches,
    ) as BranchGeometry[];
    const mainBranch = branches.find((b) => b.depth === 1);
    if (mainBranch) {
      const children = branches.filter(
        (b) => b.parentNodeId === mainBranch.nodeId,
      );
      for (const child of children) {
        expect(child.color).toBe(mainBranch.color);
      }
    }
  });
});

describe("computeLayout - determinism and paper", () => {
  it("is deterministic for the same input", () => {
    const a = layout();
    const b = layout();
    expect(a.geometry.nodeOrder).toEqual(b.geometry.nodeOrder);
    expect(a.contentHash).toBe(b.contentHash);
  });

  it("uses correct viewBox for A4", () => {
    const result = layout(SIMPLE_TREE, "a4-landscape");
    expect(result.geometry.viewBox).toBe("0 0 2970 2100");
  });
});

describe("computeLayout - center and text clipping", () => {
  it("center visual SVG content is stored", () => {
    const testSvg =
      '<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="50" fill="blue"/></svg>';
    const result = layoutNoFallback(SIMPLE_TREE, "a3-landscape", testSvg);
    expect(result.geometry.center.svgContent).toBe(testSvg);
    expect(result.geometry.center.usedFallback).toBe(false);
  });

  it("clips text when it exceeds branch length", () => {
    const branches = Object.values(
      layout(LONG_TEXT_TREE).geometry.branches,
    ) as BranchGeometry[];
    const longBranch = branches.find(
      (b) => b.concept.includes("...") || b.textClipped,
    );
    expect(longBranch).toBeDefined();
    expect(longBranch!.textClipped).toBe(true);
  });
});

// ─── Bounding Box Collision ────────────────────────────────────────────────

describe("boxesOverlap", () => {
  it("detects overlapping boxes", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 50, y: 50, width: 100, height: 100 };
    expect(boxesOverlap(a, b)).toBe(true);
  });

  it("does not flag non-overlapping boxes", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 200, y: 200, width: 100, height: 100 };
    expect(boxesOverlap(a, b)).toBe(false);
  });

  it("respects padding parameter", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 95, y: 95, width: 100, height: 100 };
    expect(boxesOverlap(a, b, 0)).toBe(true);
    expect(boxesOverlap(a, b, 10)).toBe(false);
  });
});

describe("findOverlaps", () => {
  it("finds overlapping pairs", () => {
    const boxes = [
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 50, y: 50, width: 100, height: 100 },
      { x: 200, y: 200, width: 100, height: 100 },
    ];
    const overlaps = findOverlaps(boxes);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]).toEqual([0, 1]);
  });

  it("returns empty array for no overlaps", () => {
    const boxes = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 100, y: 100, width: 10, height: 10 },
    ];
    expect(findOverlaps(boxes)).toHaveLength(0);
  });
});

// ─── Diagnostics from Layout ───────────────────────────────────────────────

describe("layout diagnostics", () => {
  it("emits clipped-text diagnostics for long text", () => {
    const measure = createMockMeasure();
    const result = computeLayout(LONG_TEXT_TREE, {
      paperKind: "a3-landscape",
      centerVisualSvg: "<svg></svg>",
      centerUsedFallback: true,
      measure,
    });
    const clippedDiags = result.diagnostics.filter(
      (d: { kind: string }) => d.kind === "clipped-text",
    );
    expect(clippedDiags.length).toBeGreaterThanOrEqual(1);
  });
});
