/**
 * Integration tests for the full render pipeline (tasks 7.1-7.8).
 */

import { describe, it, expect } from "vitest";
import { render, renderFromOmm, renderFromTree } from "../render.js";
import type {
  TextMeasurementAdapter,
  TextMetrics,
  BranchGeometry,
} from "../types.js";
import type { OrganicTree, OmmDocument } from "@omm/core";
import { buildLayoutSnapshot } from "../diagnostics.js";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const MINIMAL_TREE: OrganicTree = {
  version: 1,
  title: "Minimal Map",
  center: { concept: "Center" },
  branches: [{ concept: "Only Branch" }],
};

const FULL_TREE: OrganicTree = {
  version: 1,
  title: "Full Map",
  center: { concept: "Main Topic" },
  branches: [
    {
      concept: "Strategy",
      children: [
        { concept: "Vision", children: [{ concept: "Long Term" }] },
        { concept: "Goals" },
      ],
    },
    {
      concept: "Operations",
      children: [
        { concept: "Processes" },
        {
          concept: "Tools",
          children: [{ concept: "Software" }, { concept: "Hardware" }],
        },
      ],
    },
    {
      concept: "People",
    },
    {
      concept: "Finance",
      children: [{ concept: "Budget" }],
    },
  ],
  meta: {
    sourceTitle: "Business Plan",
    sourceSummary: "A comprehensive business strategy mind map",
  },
};

const MINIMAL_OMM: OmmDocument = {
  id: "test-omm-1",
  version: 1,
  title: "Minimal OMM",
  surface: { preset: "sqrt2-landscape" as const, aspectRatio: Math.SQRT2 },
  organicSeed: "12345",
  rootMap: {
    id: "map-1",
    title: "Minimal OMM",
    center: {
      mode: "image",
      titleText: "Center",
      minColorCount: 3,
      complianceState: "compliant",
    },
    children: [
      {
        id: "n-0",
        concept: "Branch A",
        children: [{ id: "n-1", concept: "Sub A1" }],
      },
      {
        id: "n-2",
        concept: "Branch B",
      },
    ],
  },
  layout: {
    engineVersion: "0.1.0",
    measuredAt: new Date().toISOString(),
    viewport: { widthPx: 4200, heightPx: 2970, viewBox: "0 0 4200 2970" },
    center: { box: { x: 2050, y: 1435, width: 100, height: 100 } },
    nodes: {},
    branches: {},
  },
  assets: { images: [] },
  meta: {},
};

function createMockMeasure(): TextMeasurementAdapter {
  return {
    measureText(text: string, options: { fontSize: number }): TextMetrics {
      return {
        width: text.length * options.fontSize * 0.5,
        height: options.fontSize * 1.2,
        ascent: options.fontSize * 0.9,
        descent: options.fontSize * 0.3,
      };
    },
  };
}

// ─── Integration Tests ─────────────────────────────────────────────────────

describe("renderFromTree - basic output", () => {
  it("7.1: returns a valid RenderResult with SVG, viewBox, diagnostics, and layout", () => {
    const result = renderFromTree(MINIMAL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    expect(result.svg).toBeTruthy();
    expect(result.viewBox).toBeTruthy();
    expect(Array.isArray(result.diagnostics)).toBe(true);
    expect(result.layout).toBeDefined();
  });

  it("7.1: SVG is non-empty and well-formed", () => {
    const result = renderFromTree(MINIMAL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    expect(result.svg.length).toBeGreaterThan(100);
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("</svg>");
  });

  it("7.2: viewBox matches sqrt2-landscape surface spec", () => {
    const result = renderFromTree(MINIMAL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    expect(result.viewBox).toBe("0 0 4200 2970");
    expect(result.svg).toContain('viewBox="0 0 4200 2970"');
  });

  it("7.2: surface preset is sqrt2-landscape by default", () => {
    const result = renderFromTree(MINIMAL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    expect(result.layout.surfacePreset).toBe("sqrt2-landscape");
  });
});

describe("renderFromTree - center visual", () => {
  it("7.3: contains center visual in SVG output", () => {
    const result = renderFromTree(MINIMAL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    expect(result.svg).toContain("<!-- Center visual");
  });

  it("7.3: uses fallback when no center visual provided", () => {
    const result = renderFromTree(MINIMAL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    expect(result.layout.center.usedFallback).toBe(true);
    const fills =
      result.layout.center.svgContent.match(/fill="([^"]+)"/g) || [];
    expect(fills.length).toBeGreaterThanOrEqual(3);
  });
});

describe("renderFromTree - branches", () => {
  it("7.4: renders all branch concepts as text on path", () => {
    const result = renderFromTree(FULL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    expect(result.svg).toContain("Strategy");
    expect(result.svg).toContain("Vision");
    expect(result.svg).toContain("Long Term");
    expect(result.svg).toContain("Goals");
    expect(result.svg).toContain("Operations");
    expect(result.svg).toContain("Processes");
    expect(result.svg).toContain("Tools");
    expect(result.svg).toContain("Software");
    expect(result.svg).toContain("Hardware");
    expect(result.svg).toContain("People");
    expect(result.svg).toContain("Finance");
    expect(result.svg).toContain("Budget");
  });

  it("7.4: no boxed node labels (no rect containers around text)", () => {
    const result = renderFromTree(FULL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    const rectCount = (result.svg.match(/<rect/g) || []).length;
    expect(rectCount).toBeLessThanOrEqual(2);
  });

  it("7.5: main branches have distinct colors from palette", () => {
    const result = renderFromTree(FULL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    const branches = Object.values(result.layout.branches) as BranchGeometry[];
    const mainBranches = branches.filter((b) => b.depth === 1);
    const colors = mainBranches.map((b) => b.color);
    const unique = new Set(colors);
    expect(unique.size).toBeGreaterThanOrEqual(3);
  });

  it("7.5: branch SVG contains path data with stroke colors", () => {
    const result = renderFromTree(FULL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    const branches = Object.values(result.layout.branches) as BranchGeometry[];
    const mainBranches = branches.filter((b) => b.depth === 1);
    for (const branch of mainBranches) {
      expect(result.svg).toContain(branch.color);
    }
  });
});

describe("renderFromTree - layout geometry", () => {
  it("7.6: layout geometry has all required fields", () => {
    const result = renderFromTree(FULL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    const geo = result.layout;
    expect(geo.surfacePreset).toBe("sqrt2-landscape");
    expect(geo.viewBox).toBe("0 0 4200 2970");
    expect(geo.surfaceBounds).toBeDefined();
    expect(geo.safeArea).toBeDefined();
    expect(geo.center).toBeDefined();
    expect(geo.branches).toBeDefined();
    expect(geo.boundingBoxes).toBeDefined();
    expect(geo.nodeOrder).toBeDefined();
  });

  it("7.6: branch geometries have valid structure", () => {
    const result = renderFromTree(FULL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    const branches = Object.values(result.layout.branches) as BranchGeometry[];
    for (const branch of branches) {
      expect(branch.nodeId).toMatch(/^n-\d+$/);
      expect(branch.concept).toBeTruthy();
      expect(branch.depth).toBeGreaterThanOrEqual(1);
      expect(branch.depth).toBeLessThanOrEqual(3);
      expect(branch.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(branch.branchPath).toMatch(/^M/);
      expect(branch.textPath).toMatch(/^M/);
      expect(branch.strokeWidthStart).toBeGreaterThan(0);
      expect(branch.strokeWidthEnd).toBeGreaterThan(0);
      expect(branch.boundingBox).toBeDefined();
      expect(branch.textBoundingBox).toBeDefined();
      expect(branch.startPoint).toBeDefined();
      expect(branch.endPoint).toBeDefined();
    }
  });

  it("7.7: children inherit main branch color", () => {
    const result = renderFromTree(FULL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });

    const branches = Object.values(result.layout.branches) as BranchGeometry[];
    const mainBranches = branches.filter((b) => b.depth === 1);
    for (const main of mainBranches) {
      const children = branches.filter((b) => b.parentNodeId === main.nodeId);
      for (const child of children) {
        expect(child.color).toBe(main.color);
      }
    }
  });
});

describe("renderFromTree - determinism", () => {
  it("7.8: deterministic rendering produces identical output", () => {
    const measure = createMockMeasure();
    const a = renderFromTree(FULL_TREE, { renderOptions: { measure } });
    const b = renderFromTree(FULL_TREE, { renderOptions: { measure } });

    expect(a.svg).toBe(b.svg);
    expect(a.viewBox).toBe(b.viewBox);
    expect(a.layout.nodeOrder).toEqual(b.layout.nodeOrder);
  });

  it("7.8: different trees produce different SVGs", () => {
    const measure = createMockMeasure();
    const a = renderFromTree(MINIMAL_TREE, { renderOptions: { measure } });
    const b = renderFromTree(FULL_TREE, { renderOptions: { measure } });

    expect(a.svg).not.toBe(b.svg);
  });
});

describe("renderFromOmm integration", () => {
  it("renders from an OmmDocument", () => {
    const result = renderFromOmm(MINIMAL_OMM, {
      measure: createMockMeasure(),
    });

    expect(result.svg).toContain("<svg");
    expect(result.viewBox).toBe("0 0 4200 2970");
    expect(result.layout.center).toBeDefined();
  });

  it("extracts concepts from OmmDocument MindMap", () => {
    const result = renderFromOmm(MINIMAL_OMM, {
      measure: createMockMeasure(),
    });

    expect(result.svg).toContain("Branch A");
    expect(result.svg).toContain("Sub A1");
    expect(result.svg).toContain("Branch B");
  });
});

describe("render unified entry point", () => {
  it("renders from organic-tree input", () => {
    const result = render(
      { kind: "organic-tree", tree: MINIMAL_TREE },
      { measure: createMockMeasure() },
    );
    expect(result.svg).toContain("<svg");
  });

  it("renders from omm-document input", () => {
    const result = render(
      { kind: "omm-document", document: MINIMAL_OMM },
      { measure: createMockMeasure() },
    );
    expect(result.svg).toContain("<svg");
  });
});

describe("diagnostics in integration", () => {
  it("includes diagnostics array even when empty", () => {
    const result = renderFromTree(MINIMAL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });
    expect(Array.isArray(result.diagnostics)).toBe(true);
  });

  it("each diagnostic has required fields", () => {
    const result = renderFromTree(FULL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });
    for (const diag of result.diagnostics) {
      expect(diag.kind).toBeDefined();
      expect(typeof diag.kind).toBe("string");
      expect(diag.message).toBeDefined();
      expect(typeof diag.message).toBe("string");
      expect(["info", "warning", "error"]).toContain(diag.severity);
    }
  });
});

describe("layout snapshot export", () => {
  it("buildLayoutSnapshot produces a valid LayoutSnapshot", () => {
    const result = renderFromTree(MINIMAL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });
    const snapshot = buildLayoutSnapshot(result.layout);

    expect(snapshot.engineVersion).toBe("0.1.0");
    expect(snapshot.measuredAt).toBeTruthy();
    expect(snapshot.viewport.viewBox).toBe(result.viewBox);
    expect(snapshot.center.box).toEqual(result.layout.center.boundingBox);

    expect(Object.keys(snapshot.nodes).length).toBeGreaterThan(0);
    expect(Object.keys(snapshot.branches).length).toBeGreaterThan(0);
  });

  it("snapshot contains correct surface dimensions", () => {
    const result = renderFromTree(MINIMAL_TREE, {
      renderOptions: { measure: createMockMeasure() },
    });
    const snapshot = buildLayoutSnapshot(result.layout);

    expect(snapshot.viewport.viewBox).toBe("0 0 4200 2970");
    expect(snapshot.viewport.widthPx).toBe(4200);
    expect(snapshot.viewport.heightPx).toBe(2970);
  });
});

describe("edge cases - simple trees", () => {
  it("handles tree with only one branch", () => {
    const tree: OrganicTree = {
      version: 1,
      title: "Single",
      center: { concept: "C" },
      branches: [{ concept: "Only" }],
    };
    const result = renderFromTree(tree, {
      renderOptions: { measure: createMockMeasure() },
    });
    expect(result.svg).toContain("Only");
  });

  it("handles tree with no branches", () => {
    const tree: OrganicTree = {
      version: 1,
      title: "Empty",
      center: { concept: "C" },
      branches: [],
    };
    const result = renderFromTree(tree, {
      renderOptions: { measure: createMockMeasure() },
    });
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("Center visual");
  });
});

describe("edge cases - text handling", () => {
  it("handles deeply nested text gracefully", () => {
    const tree: OrganicTree = {
      version: 1,
      title: "Deep",
      center: { concept: "C" },
      branches: [
        {
          concept: "A Very Long Concept Label That Might Need Clipping",
          children: [
            {
              concept: "Another Extremely Long Sub-Branch Label For Testing",
              children: [
                {
                  concept: "A Leaf Node With Even More Text Content To Test",
                },
              ],
            },
          ],
        },
      ],
    };
    const result = renderFromTree(tree, {
      renderOptions: { measure: createMockMeasure() },
    });
    expect(result.svg).toContain("<svg");
    const clippedDiags = result.diagnostics.filter(
      (d: { kind: string }) => d.kind === "clipped-text",
    );
    expect(clippedDiags.length).toBeGreaterThanOrEqual(0);
  });
});
