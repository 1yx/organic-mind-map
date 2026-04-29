/**
 * Preview payload fixture tests for the renderer.
 *
 * Loads organic-tree fixtures, wraps them in PreviewPayload, and verifies
 * that the renderer produces valid SVG output with correct paper/center properties.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { renderFromPreview } from "../render";
import type {
  PreviewPayload,
  TextMeasurementAdapter,
  TextMetrics,
} from "../types";

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

function loadOrganicTreeFixture(name: string): unknown {
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

function wrapAsPreviewPayload(
  treeData: unknown,
  paper: "a3-landscape" | "a4-landscape" = "a4-landscape",
): PreviewPayload {
  return {
    version: 1,
    source: "organic-tree",
    paper,
    tree: treeData as PreviewPayload["tree"],
  };
}

// ─── 3.1: Valid Chinese fixture renders to non-empty SVG ───────────────────

describe("preview-payload-fixture — basic rendering", () => {
  it("valid-chinese.json renders to non-empty SVG", () => {
    const fixtureData = loadOrganicTreeFixture("valid-chinese");
    const payload = wrapAsPreviewPayload(fixtureData);
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
    });
    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
  });
});

// ─── 3.2: Paper selection is preserved ────────────────────────────────────

describe("preview-payload-fixture — paper selection", () => {
  it("a3-landscape and a4-landscape produce different viewBoxes", () => {
    const fixtureData = loadOrganicTreeFixture("valid-chinese");

    const payloadA3 = wrapAsPreviewPayload(fixtureData, "a3-landscape");
    const payloadA4 = wrapAsPreviewPayload(fixtureData, "a4-landscape");

    const resultA3 = renderFromPreview(payloadA3, {
      measure: createMockMeasure(),
    });
    const resultA4 = renderFromPreview(payloadA4, {
      measure: createMockMeasure(),
    });

    expect(resultA3.viewBox).not.toBe(resultA4.viewBox);
    expect(resultA3.viewBox).toContain("4200");
    expect(resultA4.viewBox).toContain("2970");
  });
});

// ─── 3.3: Center visual hint is preserved in SVG ──────────────────────────

describe("preview-payload-fixture — center visual hint", () => {
  it("valid-center-visual-hint.json preserves center visual in SVG", () => {
    const fixtureData = loadOrganicTreeFixture("valid-center-visual-hint");
    const payload = wrapAsPreviewPayload(fixtureData);
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
    });

    expect(result.svg.length).toBeGreaterThan(0);
    // SVG should contain a center visual marker comment
    expect(result.svg).toContain("Center visual");
    // SVG should contain at least the branch concept text from the fixture
    expect(result.svg).toMatch(/SOLAR|WIND|RENEWABLE|CONSERVATION/);
  });
});

// ─── 3.4: Unreachable SVG URL renders via sync fallback ───────────────────

describe("preview-payload-fixture — unreachable SVG URL fallback", () => {
  it("valid-unreachable-svg-url.json renders via sync fallback", () => {
    const fixtureData = loadOrganicTreeFixture("valid-unreachable-svg-url");
    const payload = wrapAsPreviewPayload(fixtureData);
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
    });

    // Should not crash
    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
    // Sync rendering should fall back since no URL loading is attempted
    expect(result.layout.center.usedFallback).toBe(true);
  });
});
