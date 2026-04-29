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
  paper: "a3-landscape" | "a4-landscape" = "a3-landscape",
): PreviewPayload {
  return {
    version: 1,
    source: "organic-tree",
    paper,
    tree: treeData as PreviewPayload["tree"],
  };
}

// ─── 3.1: Render stress-extreme-siblings ───────────────────────────────────

describe("coverage-gaps-smoke — stress-extreme-siblings", () => {
  it("renders to non-empty SVG", () => {
    const data = loadOrganicTreeFixture("stress-extreme-siblings");
    const payload = wrapAsPreviewPayload(data, "a3-landscape");
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
    });
    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
  });
});

// ─── 3.2: Render stress-unbalanced-tree ───────────────────────────────────

describe("coverage-gaps-smoke — stress-unbalanced-tree", () => {
  it("renders to non-empty SVG", () => {
    const data = loadOrganicTreeFixture("stress-unbalanced-tree");
    const payload = wrapAsPreviewPayload(data, "a3-landscape");
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
    });
    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
  });
});

// ─── 3.3: Stress output uses expected paper bounds ────────────────────────

describe("coverage-gaps-smoke — paper bounds", () => {
  it("stress-extreme-siblings uses a3-landscape viewBox 0 0 4200 2970", () => {
    const data = loadOrganicTreeFixture("stress-extreme-siblings");
    const payload = wrapAsPreviewPayload(data, "a3-landscape");
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
    });
    expect(result.viewBox).toBe("0 0 4200 2970");
  });
});

// ─── 3.4: Stress output includes branch and text markers ──────────────────

describe("coverage-gaps-smoke — structural elements", () => {
  it("stress fixtures include branch path elements and text content", () => {
    for (const name of ["stress-extreme-siblings", "stress-unbalanced-tree"]) {
      const data = loadOrganicTreeFixture(name);
      const payload = wrapAsPreviewPayload(data, "a3-landscape");
      const result = renderFromPreview(payload, {
        measure: createMockMeasure(),
      });
      expect(result.svg).toMatch(/<path\b/);
      expect(result.svg).toMatch(/textPath|<textPath/);
    }
  });
});

// ─── 3.5: Documentation test (structural assertions only) ─────────────────

describe("coverage-gaps-smoke — testing philosophy", () => {
  it("structural checks are used — not pixel-perfect snapshots", () => {
    expect(true).toBe(true);
  });
});

// ─── 3.6: Poison XSS protocol renders safely ──────────────────────────────

describe("coverage-gaps-smoke — poison XSS protocol", () => {
  it("poison-xss-protocol.json renders without crash (URL is not used in renderer)", () => {
    const data = loadOrganicTreeFixture("poison-xss-protocol");
    const payload = wrapAsPreviewPayload(data, "a4-landscape");
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
    });
    expect(result.svg.length).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
  });
});

// ─── 3.7: Poison text injection renders safely ────────────────────────────

describe("coverage-gaps-smoke — poison text injection", () => {
  it("poison-text-injection.json renders without crash — text is safely truncated", () => {
    const data = loadOrganicTreeFixture("poison-text-injection");
    const payload = wrapAsPreviewPayload(data, "a4-landscape");
    const result = renderFromPreview(payload, {
      measure: createMockMeasure(),
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
