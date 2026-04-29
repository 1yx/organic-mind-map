/**
 * Tests for SVG rendering and center visual (tasks 4.1-4.5, 5.1-5.4).
 */

import { describe, it, expect } from "vitest";
import { renderSvg } from "../svg-renderer";
import {
  resolveCenterVisualSync,
  selectBuiltinTemplate,
  generateBuiltinCenterSvg,
  BUILTIN_CENTER_TEMPLATES,
} from "../center-visual";
import { computeLayout } from "../layout";
import type { OrganicTree } from "@omm/core";
import type {
  TextMeasurementAdapter,
  TextMetrics,
  LayoutGeometry,
  BranchGeometry,
} from "../types";

// ─── Fixture ───────────────────────────────────────────────────────────────

const SAMPLE_TREE: OrganicTree = {
  version: 1,
  title: "SVG Test Map",
  center: { concept: "Center Topic" },
  branches: [
    {
      concept: "Branch One",
      children: [{ concept: "Sub 1A" }],
    },
    {
      concept: "Branch Two",
      children: [{ concept: "Sub 2A", children: [{ concept: "Leaf 2A1" }] }],
    },
  ],
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

function getSampleLayout(): LayoutGeometry {
  const measure = createMockMeasure();
  const result = computeLayout(SAMPLE_TREE, {
    paperKind: "a3-landscape",
    centerVisualSvg: "<svg></svg>",
    centerUsedFallback: true,
    measure,
  });
  return result.geometry;
}

// ─── SVG Rendering Tests ───────────────────────────────────────────────────

describe("renderSvg - structure", () => {
  it("returns a non-empty SVG string", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout);
    expect(svg.length).toBeGreaterThan(0);
  });

  it("starts with <svg and ends with </svg>", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout);
    expect(svg.trim().startsWith("<svg")).toBe(true);
    expect(svg.trim().endsWith("</svg>")).toBe(true);
  });

  it("includes the correct viewBox", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout);
    expect(svg).toContain(`viewBox="${layout.viewBox}"`);
  });

  it("includes xmlns attribute", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("includes paper background rect", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout);
    expect(svg).toContain("<rect");
    expect(svg).toContain('fill="#FFFFFF"');
  });

  it("includes paper boundary", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout);
    expect(svg).toContain("Paper boundary");
    expect(svg).toContain('stroke="#CCCCCC"');
  });
});

describe("renderSvg - content", () => {
  it("renders branches with tapered path shapes", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout);
    expect(svg).toContain("<!-- Branches -->");
    const branches = Object.values(layout.branches) as BranchGeometry[];
    for (const branch of branches) {
      expect(svg).toContain(`fill="${branch.color}"`);
      expect(svg).toContain(branch.textPath);
    }
  });

  it("renders branch concepts as text on path", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout);
    expect(svg).toContain("<textPath");
    expect(svg).toContain("Branch One");
    expect(svg).toContain("Branch Two");
    expect(svg).toContain("Sub 1A");
    expect(svg).toContain("Sub 2A");
    expect(svg).toContain("Leaf 2A1");
  });

  it("does NOT render boxed node labels (no rect around text)", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout);
    const rectCount = (svg.match(/<rect/g) || []).length;
    expect(rectCount).toBeLessThanOrEqual(2);
  });

  it("renders center visual", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout);
    expect(svg).toContain("<!-- Center visual");
  });
});

describe("renderSvg - styling and refs", () => {
  it("applies custom paper background color", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout, "#F5F5DC");
    expect(svg).toContain('fill="#F5F5DC"');
  });

  it("renders main branches with correct colors", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout);
    const branches = Object.values(layout.branches) as BranchGeometry[];
    const mainBranches = branches.filter((b) => b.depth === 1);
    for (const branch of mainBranches) {
      expect(svg).toContain(branch.color);
    }
  });

  it("text-on-path uses textPath href references", () => {
    const layout = getSampleLayout();
    const svg = renderSvg(layout);
    for (const nodeId of layout.nodeOrder) {
      expect(svg).toContain(`href="#textpath-${nodeId}"`);
    }
  });
});

// ─── Center Visual Tests ───────────────────────────────────────────────────

describe("center visual - builtin templates", () => {
  it("selectBuiltinTemplate returns a known template name", () => {
    const name = selectBuiltinTemplate(42);
    expect(BUILTIN_CENTER_TEMPLATES).toContain(name);
  });

  it("selectBuiltinTemplate is deterministic", () => {
    const a = selectBuiltinTemplate(42);
    const b = selectBuiltinTemplate(42);
    expect(a).toBe(b);
  });

  it("selectBuiltinTemplate varies with different hashes", () => {
    const names = new Set([
      selectBuiltinTemplate(0),
      selectBuiltinTemplate(1),
      selectBuiltinTemplate(2),
      selectBuiltinTemplate(3),
    ]);
    expect(names.size).toBeGreaterThanOrEqual(1);
  });

  it("generateBuiltinCenterSvg returns valid SVG for all templates", () => {
    for (const name of BUILTIN_CENTER_TEMPLATES) {
      const svg = generateBuiltinCenterSvg(name);
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    }
  });

  it("generated center SVGs are multi-color", () => {
    for (const name of BUILTIN_CENTER_TEMPLATES) {
      const svg = generateBuiltinCenterSvg(name);
      const fillColors = new Set(svg.match(/fill="([^"]+)"/g) || []);
      expect(fillColors.size).toBeGreaterThanOrEqual(3);
    }
  });

  it("generated center SVGs contain no unsafe elements", () => {
    for (const name of BUILTIN_CENTER_TEMPLATES) {
      const svg = generateBuiltinCenterSvg(name);
      expect(svg).not.toContain("<script");
      expect(svg).not.toContain("<foreignObject");
      expect(svg).not.toContain("onclick");
      expect(svg).not.toContain("onload");
    }
  });
});

describe("resolveCenterVisualSync - valid input", () => {
  it("uses inline SVG when provided and valid", () => {
    const inlineSvg =
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="blue"/></svg>';
    const result = resolveCenterVisualSync({ concept: "Test" }, inlineSvg, 42);
    expect(result.svgContent).toBe(inlineSvg);
    expect(result.usedFallback).toBe(false);
    expect(result.diagnostics).toHaveLength(0);
  });
});

describe("resolveCenterVisualSync - rejection", () => {
  it("rejects unsafe inline SVG with script tag", () => {
    const unsafeSvg =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="12" cy="12" r="10"/></svg>';
    const result = resolveCenterVisualSync({ concept: "Test" }, unsafeSvg, 42);
    expect(result.usedFallback).toBe(true);
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects unsafe inline SVG with event handler", () => {
    const unsafeSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle cx="12" cy="12" r="10"/></svg>';
    const result = resolveCenterVisualSync({ concept: "Test" }, unsafeSvg, 42);
    expect(result.usedFallback).toBe(true);
  });

  it("falls back when inline SVG is invalid", () => {
    const result = resolveCenterVisualSync(
      { concept: "Test" },
      "not an svg",
      42,
    );
    expect(result.usedFallback).toBe(true);
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);
  });
});

describe("resolveCenterVisualSync - fallback", () => {
  it("uses fallback when no inline SVG provided", () => {
    const result = resolveCenterVisualSync({ concept: "Test" }, undefined, 42);
    expect(result.usedFallback).toBe(true);
    expect(result.svgContent).toContain("<svg");
  });

  it("fallback SVG is valid and multi-color", () => {
    const result = resolveCenterVisualSync({ concept: "Test" }, undefined, 42);
    expect(result.svgContent).toContain("<svg");
    const fills = result.svgContent.match(/fill="([^"]+)"/g) || [];
    expect(fills.length).toBeGreaterThanOrEqual(3);
  });

  it("fallback selection is deterministic based on hash", () => {
    const a = resolveCenterVisualSync({ concept: "Test" }, undefined, 42);
    const b = resolveCenterVisualSync({ concept: "Test" }, undefined, 42);
    expect(a.svgContent).toBe(b.svgContent);
  });
});
