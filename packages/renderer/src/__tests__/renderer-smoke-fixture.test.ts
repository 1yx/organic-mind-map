/**
 * Renderer smoke tests using fixture files.
 *
 * Verifies structural SVG output (non-empty, correct viewBox, expected elements)
 * without pixel-perfect image matching. These tests ensure the renderer
 * pipeline works end-to-end with real fixture data.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { renderFromOmm, renderFromTree } from "../render.js";
import type { OmmDocument, OrganicTree } from "@omm/core";
import type { TextMeasurementAdapter, TextMetrics } from "../types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────

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

function loadOrganicTreeFixture(name: string): OrganicTree {
  const fixturePath = join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "fixtures",
    "organic-tree",
    `${name}.json`,
  );
  return JSON.parse(readFileSync(fixturePath, "utf-8")) as OrganicTree;
}

function loadOmmFixture(name: string): unknown {
  const fixturePath = join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "fixtures",
    "omm",
    `${name}.json`,
  );
  return JSON.parse(readFileSync(fixturePath, "utf-8")) as unknown;
}

// ─── 4.1: Deeper hierarchy fixture renders to non-empty SVG ───────────────

describe("renderer-smoke-fixture — deeper hierarchy", () => {
  it("valid-deeper-hierarchy.json renders to non-empty SVG containing <svg>", () => {
    const tree = loadOrganicTreeFixture("valid-deeper-hierarchy");
    const result = renderFromTree(tree, {
      renderOptions: { measure: createMockMeasure() },
    });

    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
  });
});

// ─── 4.2: OmmDocument fixture renders with concepts ───────────────────────

describe("renderer-smoke-fixture — OmmDocument rendering", () => {
  it("valid-a4-with-center-visual.json renders to non-empty SVG with concepts", () => {
    const ommData = loadOmmFixture(
      "valid-a4-with-center-visual",
    ) as OmmDocument;
    const result = renderFromOmm(ommData, {
      measure: createMockMeasure(),
    });

    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
    // Should contain concepts from the fixture (uppercase per display rules)
    expect(result.svg).toContain("PLANNING");
  });
});

// ─── 4.3: Surface viewBox is correct ──────────────────────────────────────

describe("renderer-smoke-fixture — surface viewBox", () => {
  it("default surface produces viewBox 0 0 4200 2970", () => {
    const tree = loadOrganicTreeFixture("valid-chinese");
    const result = renderFromTree(tree, {
      renderOptions: { measure: createMockMeasure() },
    });

    expect(result.viewBox).toBe("0 0 4200 2970");
    expect(result.layout.surfacePreset).toBe("sqrt2-landscape");
  });
});

// ─── 4.4: Output contains expected structural elements ────────────────────

describe("renderer-smoke-fixture — structural elements", () => {
  it("SVG contains center visual marker, branches, and textPath elements", () => {
    const tree = loadOrganicTreeFixture("valid-center-visual-hint");
    const result = renderFromTree(tree, {
      renderOptions: { measure: createMockMeasure() },
    });

    expect(result.svg.length).toBeGreaterThan(0);

    // Center visual comment
    expect(result.svg).toContain("Center visual");

    // Path elements for branches (SVG <path d="...">)
    expect(result.svg).toMatch(/<path\b/);

    // textPath elements for branch text labels
    expect(result.svg).toMatch(/textPath|<textPath/);
  });
});

// ─── 4.5: Unreachable SVG URL renders with fallback ───────────────────────

describe("renderer-smoke-fixture — unreachable SVG URL fallback", () => {
  it("valid-unreachable-svg-url.json renders without crash, usedFallback is true", () => {
    const tree = loadOrganicTreeFixture("valid-unreachable-svg-url");
    const result = renderFromTree(tree, {
      renderOptions: { measure: createMockMeasure() },
    });

    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
    expect(result.layout.center.usedFallback).toBe(true);
  });
});

// ─── 4.6: Structural testing philosophy (documentation) ───────────────────

describe("renderer-smoke-fixture — testing philosophy", () => {
  // These smoke tests verify structural properties of the renderer output:
  // - Non-empty SVG string
  // - Correct surface viewBox dimensions
  // - Presence of expected structural elements (center visual, branches, textPath)
  //
  // We intentionally do NOT test pixel-perfect image matching because:
  // - Layout coordinates depend on the measurement adapter and seed values
  // - Minor SVG formatting differences are not meaningful regressions
  // - Visual correctness is best validated by manual review or screenshot tests
  it("structural checks are intentional — not pixel-perfect matching", () => {
    // This is a documentation-only test to clarify the testing approach.
    // The assertion is trivially true; the value is the comment above.
    expect(true).toBe(true);
  });
});
