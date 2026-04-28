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
import { renderFromPreview, renderFromOmm } from "../render";
import type {
  PreviewPayload,
  TextMeasurementAdapter,
  TextMetrics,
} from "../types";
import type { OmmDocument } from "@omm/core";

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

function loadAgentListFixture(name: string): unknown {
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
  return JSON.parse(readFileSync(fixturePath, "utf-8"));
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
  return JSON.parse(readFileSync(fixturePath, "utf-8"));
}

function wrapAsPreviewPayload(
  treeData: unknown,
  paper: "a3-landscape" | "a4-landscape" = "a3-landscape",
): PreviewPayload {
  return {
    version: 1,
    source: "organic-tree",
    paper,
    tree: treeData as PreviewPayload["tree"],
  };
}

// ─── 4.1: Deeper hierarchy fixture renders to non-empty SVG ───────────────

describe("renderer-smoke-fixture — deeper hierarchy", () => {
  it("valid-deeper-hierarchy.json renders to non-empty SVG containing <svg>", () => {
    const fixtureData = loadAgentListFixture("valid-deeper-hierarchy");
    const payload = wrapAsPreviewPayload(fixtureData, "a3-landscape");
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
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
    // Should contain concepts from the fixture
    expect(result.svg).toContain("Planning");
  });
});

// ─── 4.3: Paper viewBox is correct ────────────────────────────────────────

describe("renderer-smoke-fixture — paper viewBox", () => {
  it("a3-landscape payload produces viewBox 0 0 4200 2970", () => {
    const fixtureData = loadAgentListFixture("valid-chinese");
    const payload = wrapAsPreviewPayload(fixtureData, "a3-landscape");
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
    });

    expect(result.viewBox).toBe("0 0 4200 2970");
  });

  it("a4-landscape payload produces viewBox 0 0 2970 2100", () => {
    const fixtureData = loadAgentListFixture("valid-chinese");
    const payload = wrapAsPreviewPayload(fixtureData, "a4-landscape");
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
    });

    expect(result.viewBox).toBe("0 0 2970 2100");
  });
});

// ─── 4.4: Output contains expected structural elements ────────────────────

describe("renderer-smoke-fixture — structural elements", () => {
  it("SVG contains center visual marker, branches, and textPath elements", () => {
    const fixtureData = loadAgentListFixture("valid-center-visual-hint");
    const payload = wrapAsPreviewPayload(fixtureData, "a4-landscape");
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
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
    const fixtureData = loadAgentListFixture("valid-unreachable-svg-url");
    const payload = wrapAsPreviewPayload(fixtureData, "a4-landscape");
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
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
  // - Correct paper viewBox dimensions
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
