/**
 * Tests for diagnostics (tasks 6.1-6.3).
 */

import { describe, it, expect } from "vitest";
import {
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
} from "../diagnostics";
import type { LayoutBox } from "@omm/core";

// ─── createDiagnostic ──────────────────────────────────────────────────────

describe("createDiagnostic", () => {
  it("creates a diagnostic with default severity", () => {
    const diag = createDiagnostic("clipped-text", "Text was clipped");
    expect(diag.kind).toBe("clipped-text");
    expect(diag.message).toBe("Text was clipped");
    expect(diag.severity).toBe("warning");
    expect(diag.nodeId).toBeUndefined();
  });

  it("creates a diagnostic with custom severity and nodeId", () => {
    const diag = createDiagnostic("layout-overflow", "Overflow detected", {
      nodeId: "n-5",
      severity: "error",
    });
    expect(diag.nodeId).toBe("n-5");
    expect(diag.severity).toBe("error");
  });
});

// ─── Specific Diagnostic Factories ─────────────────────────────────────────

describe("clippedTextDiagnostic", () => {
  it("creates a clipped-text diagnostic with info severity", () => {
    const diag = clippedTextDiagnostic("n-3", "Long Text", {
      maxWidth: 100,
      measuredWidth: 200,
    });
    expect(diag.kind).toBe("clipped-text");
    expect(diag.severity).toBe("info");
    expect(diag.nodeId).toBe("n-3");
    expect(diag.message).toContain("Long Text");
    expect(diag.message).toContain("n-3");
  });
});

describe("missingAssetFallbackDiagnostic", () => {
  it("creates a missing-asset-fallback diagnostic", () => {
    const diag = missingAssetFallbackDiagnostic("URL load failed");
    expect(diag.kind).toBe("missing-asset-fallback");
    expect(diag.message).toContain("URL load failed");
    expect(diag.severity).toBe("info");
  });
});

describe("layoutOverflowDiagnostic", () => {
  it("creates a layout-overflow diagnostic", () => {
    const diag = layoutOverflowDiagnostic("n-2");
    expect(diag.kind).toBe("layout-overflow");
    expect(diag.nodeId).toBe("n-2");
    expect(diag.severity).toBe("warning");
  });

  it("handles unknown node ID", () => {
    const diag = layoutOverflowDiagnostic();
    expect(diag.kind).toBe("layout-overflow");
    expect(diag.message).toContain("(unknown)");
  });
});

describe("unresolvedCollisionDiagnostic", () => {
  it("creates an unresolved-collision diagnostic", () => {
    const diag = unresolvedCollisionDiagnostic("n-1", "n-2");
    expect(diag.kind).toBe("unresolved-collision");
    expect(diag.message).toContain("n-1");
    expect(diag.message).toContain("n-2");
  });
});

describe("branchTextCrossingDiagnostic", () => {
  it("creates a branch-text-crossing diagnostic", () => {
    const diag = branchTextCrossingDiagnostic("n-5", "n-3");
    expect(diag.kind).toBe("branch-text-crossing");
    expect(diag.message).toContain("n-5");
    expect(diag.message).toContain("n-3");
  });
});

describe("hardLayoutFailureDiagnostic", () => {
  it("creates a hard-layout-failure diagnostic with error severity", () => {
    const diag = hardLayoutFailureDiagnostic("Cannot place branches");
    expect(diag.kind).toBe("hard-layout-failure");
    expect(diag.severity).toBe("error");
    expect(diag.message).toContain("Cannot place branches");
  });
});

// ─── Collision Detection ───────────────────────────────────────────────────

describe("boxesOverlap", () => {
  it("returns true for overlapping boxes", () => {
    const a: LayoutBox = { x: 0, y: 0, width: 100, height: 100 };
    const b: LayoutBox = { x: 50, y: 50, width: 100, height: 100 };
    expect(boxesOverlap(a, b)).toBe(true);
  });

  it("returns false for non-overlapping boxes", () => {
    const a: LayoutBox = { x: 0, y: 0, width: 100, height: 100 };
    const b: LayoutBox = { x: 200, y: 0, width: 100, height: 100 };
    expect(boxesOverlap(a, b)).toBe(false);
  });

  it("returns false for adjacent boxes (touching edges)", () => {
    const a: LayoutBox = { x: 0, y: 0, width: 100, height: 100 };
    const b: LayoutBox = { x: 100, y: 0, width: 100, height: 100 };
    expect(boxesOverlap(a, b)).toBe(false);
  });

  it("returns true for contained box", () => {
    const a: LayoutBox = { x: 0, y: 0, width: 200, height: 200 };
    const b: LayoutBox = { x: 50, y: 50, width: 50, height: 50 };
    expect(boxesOverlap(a, b)).toBe(true);
  });

  it("padding parameter adds separation", () => {
    const a: LayoutBox = { x: 0, y: 0, width: 100, height: 100 };
    const b: LayoutBox = { x: 99, y: 0, width: 100, height: 100 };
    expect(boxesOverlap(a, b, 0)).toBe(true);
    expect(boxesOverlap(a, b, 5)).toBe(false);
  });
});

describe("findOverlaps", () => {
  it("finds all overlapping pairs", () => {
    const boxes: LayoutBox[] = [
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 50, y: 0, width: 100, height: 100 },
      { x: 0, y: 50, width: 100, height: 100 },
      { x: 200, y: 200, width: 50, height: 50 },
    ];
    const overlaps = findOverlaps(boxes);
    expect(overlaps).toHaveLength(3);
  });

  it("returns empty for no overlaps", () => {
    const boxes: LayoutBox[] = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 20, width: 10, height: 10 },
      { x: 40, y: 40, width: 10, height: 10 },
    ];
    expect(findOverlaps(boxes)).toHaveLength(0);
  });

  it("returns empty for empty input", () => {
    expect(findOverlaps([])).toHaveLength(0);
  });

  it("returns empty for single box", () => {
    expect(
      findOverlaps([{ x: 0, y: 0, width: 100, height: 100 }]),
    ).toHaveLength(0);
  });
});

// ─── Layout Snapshot Builder ───────────────────────────────────────────────

describe("buildLayoutSnapshot", () => {
  it("creates a LayoutSnapshot from layout geometry", () => {
    const { safeArea, viewBox } = computePaperLayout("a3-landscape");
    const geometry = {
      paperKind: "a3-landscape" as const,
      viewBox,
      paperBounds: { x: 0, y: 0, width: 4200, height: 2970 },
      safeArea,
      center: {
        boundingBox: { x: 2050, y: 1435, width: 100, height: 100 },
        centerPoint: { x: 2100, y: 1485 },
        svgContent: "<svg></svg>",
        usedFallback: false,
      },
      branches: {
        "n-0": {
          nodeId: "n-0",
          concept: "Test",
          depth: 1,
          color: "#E74C3C",
          branchPath: "M0,0 Q100,50 200,0",
          textPath: "M0,-10 Q100,40 200,-10",
          strokeWidthStart: 28,
          strokeWidthEnd: 8,
          boundingBox: { x: -28, y: -28, width: 256, height: 78 },
          textBoundingBox: { x: 0, y: -20, width: 200, height: 80 },
          textClipped: false,
          startPoint: { x: 0, y: 0 },
          endPoint: { x: 200, y: 0 },
        },
      },
      boundingBoxes: [] as LayoutBox[],
      nodeOrder: ["n-0"],
    };

    const snapshot = buildLayoutSnapshot(geometry, "0.1.0");
    expect(snapshot.engineVersion).toBe("0.1.0");
    expect(snapshot.measuredAt).toBeDefined();
    expect(snapshot.viewport.viewBox).toBe("0 0 4200 2970");
    expect(snapshot.center.box).toEqual(geometry.center.boundingBox);
    expect(snapshot.nodes["n-0"]).toBeDefined();
    expect(snapshot.branches["n-0"]).toBeDefined();
    expect(snapshot.branches["n-0"]!.branchPath).toBe("M0,0 Q100,50 200,0");
  });
});

// ─── Compute Paper Layout ──────────────────────────────────────────────────

describe("computePaperLayout", () => {
  it("A3 has correct dimensions", () => {
    const result = computePaperLayout("a3-landscape", 0.05);
    expect(result.paperBounds).toEqual({
      x: 0,
      y: 0,
      width: 4200,
      height: 2970,
    });
    expect(result.viewBox).toBe("0 0 4200 2970");
  });

  it("A4 has correct dimensions", () => {
    const result = computePaperLayout("a4-landscape", 0.05);
    expect(result.paperBounds).toEqual({
      x: 0,
      y: 0,
      width: 2970,
      height: 2100,
    });
    expect(result.viewBox).toBe("0 0 2970 2100");
  });

  it("safe area has correct margins", () => {
    const result = computePaperLayout("a3-landscape", 0.1);
    expect(result.safeArea.x).toBe(420);
    expect(result.safeArea.y).toBe(297);
    expect(result.safeArea.width).toBe(4200 - 840);
    expect(result.safeArea.height).toBe(2970 - 594);
  });

  it("center point is at exact center", () => {
    const result = computePaperLayout("a4-landscape");
    expect(result.centerPoint.x).toBe(1485);
    expect(result.centerPoint.y).toBe(1050);
  });
});
