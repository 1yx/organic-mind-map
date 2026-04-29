/**
 * Fixture-coverage-gaps validation tests.
 *
 * Exercises boundary conditions that the main fixture-validation suite does not
 * cover: stress-size inputs, XSS / injection payloads, oversized whitespace,
 * .omm web-font edge-cases, and missing-seed repair scenarios.
 *
 * Fixtures are loaded from fixtures/organic-tree/ and fixtures/omm/.
 * They are created by a separate fixture-generation process.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import {
  validateAgentList,
  validateCapacity,
  DEFAULT_LIMITS,
  type AgentMindMapList,
} from "./index";
import { validateOmmDocument } from "../document/validation";

// ─── Fixture loaders ──────────────────────────────────────────────────────

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

// ─── 2.1: Stress fixtures — capacity boundary behaviour ───────────────────

describe("fixture-coverage-gaps — stress fixtures", () => {
  it("stress-extreme-siblings.json passes validateAgentList (45 nodes at maxNodes boundary)", () => {
    // 5 main branches × 8 sub-branches + center = 1 + 5 + 40 = 46 — but
    // the last branch has 7 children to stay within maxNodes 45.
    // This exercises the dense sibling boundary.
    const data = loadAgentListFixture("stress-extreme-siblings");
    const result = validateAgentList(data);
    expect(result.valid).toBe(true);
  });

  it("stress-unbalanced-tree.json passes validateAgentList", () => {
    const data = loadAgentListFixture("stress-unbalanced-tree");
    const result = validateAgentList(data);
    expect(result.valid).toBe(true);
  });

  it("stress fixtures are within DEFAULT_LIMITS capacity", () => {
    for (const name of ["stress-extreme-siblings", "stress-unbalanced-tree"]) {
      const data = loadAgentListFixture(name) as AgentMindMapList;
      const errors = validateCapacity(data, DEFAULT_LIMITS);
      expect(errors).toHaveLength(0);
    }
  });
});

// ─── 2.2: Unsafe center visual protocols — structural pass, URL preserved ─

describe("fixture-coverage-gaps — unsafe SVG URL protocols", () => {
  it("poison-xss-protocol.json passes structural validation (URL is a string)", () => {
    const data = loadAgentListFixture("poison-xss-protocol");
    const result = validateAgentList(data);
    // The javascript: URL should be caught at validation — but structural
    // validation only checks it's a string. The critical test is that it
    // doesn't crash and the URL is available for downstream rejection.
    expect(result.data).not.toBeNull();
    expect(result.data?.center.svgUrl).toContain("javascript:");
  });
});

// ─── 2.3: Unreachable SVG URL falls back ──────────────────────────────────

describe("fixture-coverage-gaps — unreachable SVG URL fallback", () => {
  it("valid-unreachable-svg-url.json is a valid OrganicTree", () => {
    const data = loadAgentListFixture("valid-unreachable-svg-url");
    const result = validateAgentList(data);
    expect(result.valid).toBe(true);
  });
});

// ─── 2.4: Script-like concept text — quality validation rejects ───────────

describe("fixture-coverage-gaps — text injection safety", () => {
  it("poison-text-injection.json fails validation (concepts exceed unit-width)", () => {
    const data = loadAgentListFixture("poison-text-injection");
    const result = validateAgentList(data);
    // Concepts like "<script>alert(1)</script>" have unit-width > 25
    // and are rejected by quality validation.  The fixture is preserved
    // as-is for the renderer smoke tests to verify safe output.
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some(
        (e) =>
          e.message.includes("unit-width") || e.message.includes("sentence"),
      ),
    ).toBe(true);
  });
});

// ─── 2.5: Oversized concept rejection ─────────────────────────────────────

describe("fixture-coverage-gaps — oversized concept rejection", () => {
  it("poison-oversized-whitespace.json fails quality validation", () => {
    const data = loadAgentListFixture("poison-oversized-whitespace");
    const result = validateAgentList(data);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some(
        (e) =>
          e.message.includes("unit-width") || e.message.includes("sentence"),
      ),
    ).toBe(true);
  });
});

// ─── 2.6: .omm web font declarations — gap coverage ──────────────────────

describe("fixture-coverage-gaps — .omm web font declarations", () => {
  it("invalid-web-fonts-declaration.json fails with font_safety.forbidden_font", () => {
    const data = loadOmmFixture("invalid-web-fonts-declaration");
    const result = validateOmmDocument(data);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some((e) => e.code === "font_safety.forbidden_font"),
    ).toBe(true);
    expect(result.errors.some((e) => e.path.includes("fontFamily"))).toBe(true);
  });
});

// ─── 2.7: .omm missing seed with layout (repair case) ─────────────────────

describe("fixture-coverage-gaps — .omm seed repair with layout", () => {
  it("repair-missing-seed-with-layout.json fails validation (missing organicSeed)", () => {
    const data = loadOmmFixture("repair-missing-seed-with-layout");
    const result = validateOmmDocument(data);
    // Currently the document fails because organicSeed is empty
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "envelope.missing_organicSeed"),
    ).toBe(true);
  });
});

// ─── 2.8: .omm missing seed without layout ────────────────────────────────

describe("fixture-coverage-gaps — .omm missing seed without layout", () => {
  it("invalid-missing-seed-without-layout.json fails validation", () => {
    const data = loadOmmFixture("invalid-missing-seed-without-layout");
    const result = validateOmmDocument(data);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "envelope.missing_organicSeed"),
    ).toBe(true);
  });
});
