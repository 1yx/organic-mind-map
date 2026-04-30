/**
 * Organic tree fixture tests for the renderer.
 *
 * Loads organic-tree fixtures and verifies that the renderer produces
 * valid SVG output with correct paper/center properties.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { render, renderFromTree } from "../render.js";
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

// ─── 3.1: Valid Chinese fixture renders to non-empty SVG ───────────────────

describe("organic-tree-fixture — basic rendering", () => {
  it("valid-chinese.json renders to non-empty SVG", () => {
    const tree = loadOrganicTreeFixture("valid-chinese");
    const result = render(
      { kind: "organic-tree", tree },
      {
        measure: createMockMeasure(),
      },
    );
    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
  });
});

// ─── 3.2: Surface preset produces consistent viewBox ───────────────────

describe("organic-tree-fixture — surface preset", () => {
  it("default surface preset produces sqrt2-landscape viewBox", () => {
    const tree = loadOrganicTreeFixture("valid-chinese");

    const result = renderFromTree(tree, {
      renderOptions: { measure: createMockMeasure() },
    });

    expect(result.viewBox).toBe("0 0 4200 2970");
  });
});

// ─── 3.3: Center visual hint is preserved in SVG ──────────────────────────

describe("organic-tree-fixture — center visual hint", () => {
  it("valid-center-visual-hint.json preserves center visual in SVG", () => {
    const tree = loadOrganicTreeFixture("valid-center-visual-hint");
    const result = render(
      { kind: "organic-tree", tree },
      {
        measure: createMockMeasure(),
      },
    );

    expect(result.svg.length).toBeGreaterThan(0);
    // SVG should contain a center visual marker comment
    expect(result.svg).toContain("Center visual");
    // SVG should contain at least the branch concept text from the fixture
    expect(result.svg).toMatch(/SOLAR|WIND|RENEWABLE|CONSERVATION/);
  });
});

// ─── 3.4: Unreachable SVG URL renders via sync fallback ───────────────────

describe("organic-tree-fixture — unreachable SVG URL fallback", () => {
  it("valid-unreachable-svg-url.json renders via sync fallback", () => {
    const tree = loadOrganicTreeFixture("valid-unreachable-svg-url");
    const result = render(
      { kind: "organic-tree", tree },
      {
        measure: createMockMeasure(),
      },
    );

    // Should not crash
    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
    // Sync rendering should fall back since no URL loading is attempted
    expect(result.layout.center.usedFallback).toBe(true);
  });
});
