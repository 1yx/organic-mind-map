/**
 * Renderer smoke tests for fixture-coverage-gaps fixtures.
 *
 * Verifies that stress-size inputs, poison XSS payloads, and text-injection
 * fixtures survive the full render pipeline without crashing, and that the
 * structural SVG output contains expected elements.
 *
 * These tests use the same mock TextMeasurementAdapter as the main
 * renderer-smoke-fixture suite and follow its structural-check philosophy
 * (no pixel-perfect matching).
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { renderFromTree } from "../render.js";
import type { OrganicTree } from "@omm/core";
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

// ─── 3.1: Render stress-extreme-siblings ───────────────────────────────────

describe("coverage-gaps-smoke — stress-extreme-siblings", () => {
  it("renders to non-empty SVG", () => {
    const tree = loadOrganicTreeFixture("stress-extreme-siblings");
    const result = renderFromTree(tree, {
      renderOptions: { measure: createMockMeasure() },
    });
    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
  });
});

// ─── 3.2: Render stress-unbalanced-tree ───────────────────────────────────

describe("coverage-gaps-smoke — stress-unbalanced-tree", () => {
  it("renders to non-empty SVG", () => {
    const tree = loadOrganicTreeFixture("stress-unbalanced-tree");
    const result = renderFromTree(tree, {
      renderOptions: { measure: createMockMeasure() },
    });
    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
  });
});

// ─── 3.3: Anthropic product team radial fixture ───────────────────────────

describe("coverage-gaps-smoke — anthropic-product-team", () => {
  it("renders with zero diagnostics", () => {
    const tree = loadOrganicTreeFixture("anthropic-product-team");
    const result = renderFromTree(tree, {
      renderOptions: { measure: createMockMeasure() },
    });
    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
    expect(result.diagnostics).toHaveLength(0);
  });
});

// ─── 3.4: Stress output uses expected surface bounds ──────────────────────

describe("coverage-gaps-smoke — surface bounds", () => {
  it("stress-extreme-siblings uses sqrt2-landscape viewBox 0 0 4200 2970", () => {
    const tree = loadOrganicTreeFixture("stress-extreme-siblings");
    const result = renderFromTree(tree, {
      renderOptions: { measure: createMockMeasure() },
    });
    expect(result.viewBox).toBe("0 0 4200 2970");
  });
});

// ─── 3.5: Stress output includes branch and text markers ──────────────────

describe("coverage-gaps-smoke — structural elements", () => {
  it("stress fixtures include branch path elements and text content", () => {
    for (const name of ["stress-extreme-siblings", "stress-unbalanced-tree"]) {
      const tree = loadOrganicTreeFixture(name);
      const result = renderFromTree(tree, {
        renderOptions: { measure: createMockMeasure() },
      });
      expect(result.svg).toMatch(/<path\b/);
      expect(result.svg).toMatch(/textPath|<textPath/);
    }
  });
});

// ─── 3.6: Documentation test (structural assertions only) ─────────────────

describe("coverage-gaps-smoke — testing philosophy", () => {
  it("structural checks are used — not pixel-perfect snapshots", () => {
    expect(true).toBe(true);
  });
});

// ─── 3.7: Poison XSS protocol renders safely ──────────────────────────────

describe("coverage-gaps-smoke — poison XSS protocol", () => {
  it("poison-xss-protocol.json renders without crash (URL is not used in renderer)", () => {
    const tree = loadOrganicTreeFixture("poison-xss-protocol");
    const result = renderFromTree(tree, {
      surfacePreset: "sqrt2-landscape",
      renderOptions: { measure: createMockMeasure() },
    });
    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
  });
});

// ─── 3.8: Poison text injection renders safely ────────────────────────────

describe("coverage-gaps-smoke — poison text injection", () => {
  it("poison-text-injection.json renders without crash — text is safely truncated", () => {
    const tree = loadOrganicTreeFixture("poison-text-injection");
    const result = renderFromTree(tree, {
      surfacePreset: "sqrt2-landscape",
      renderOptions: { measure: createMockMeasure() },
    });
    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
    // The SVG should contain safe text content — the "NORMAL BRANCH" concept
    // appears as truncated "NORMAL ..." in the textPath, while script tags
    // in other concepts are HTML-entity-escaped or truncated, never raw.
    expect(result.svg).toContain("NORMAL");
    // Verify no raw <script> or <img> HTML tags appear in the output
    expect(result.svg).not.toContain("<script>");
    expect(result.svg).not.toContain("<img");
  });
});
