/**
 * Fixture-based validation tests for OrganicTree and OmmDocument contracts.
 *
 * Loads JSON fixtures from fixtures/organic-tree/ and fixtures/omm/ and runs
 * them through the full validation pipeline (structural, quality, capacity).
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import {
  validateOrganicTree,
  validateCapacity,
  formatCapacityFeedback,
  DEFAULT_LIMITS,
  type OrganicTree,
} from "./index";
import { validateOmmDocument } from "../document/validation";

// ─── Fixture loaders ──────────────────────────────────────────────────────

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

// ─── 2.1: Valid OrganicTree fixtures pass structural validation ────────────

describe("fixture-validation — structural validity", () => {
  const validFixtures = [
    "valid-chinese",
    "valid-english",
    "valid-mixed-cjk-ascii",
    "valid-center-visual-hint",
    "valid-deeper-hierarchy",
    "valid-unreachable-svg-url",
  ];

  for (const name of validFixtures) {
    it(`${name}.json passes validateOrganicTree`, () => {
      const data = loadOrganicTreeFixture(name);
      const result = validateOrganicTree(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).not.toBeNull();
    });
  }
});

// ─── 2.2: Valid fixtures pass concept quality validation ───────────────────

describe("fixture-validation — concept quality", () => {
  const validFixtures = [
    "valid-chinese",
    "valid-english",
    "valid-mixed-cjk-ascii",
    "valid-center-visual-hint",
    "valid-deeper-hierarchy",
    "valid-unreachable-svg-url",
  ];

  for (const name of validFixtures) {
    it(`${name}.json has no sentence-like or unit-width errors`, () => {
      const data = loadOrganicTreeFixture(name);
      const result = validateOrganicTree(data);
      expect(result.valid).toBe(true);
      // If valid, there are no errors at all (including quality errors)
      expect(
        result.errors.filter(
          (e) =>
            e.message.includes("sentence") || e.message.includes("unit-width"),
        ),
      ).toHaveLength(0);
    });
  }
});

// ─── 2.3: Valid fixtures pass capacity validation ─────────────────────────

describe("fixture-validation — capacity", () => {
  const validFixtures = [
    "valid-chinese",
    "valid-english",
    "valid-mixed-cjk-ascii",
    "valid-center-visual-hint",
    "valid-deeper-hierarchy",
    "valid-unreachable-svg-url",
  ];

  for (const name of validFixtures) {
    it(`${name}.json is within DEFAULT_LIMITS capacity`, () => {
      const data = loadOrganicTreeFixture(name) as OrganicTree;
      const errors = validateCapacity(data, DEFAULT_LIMITS);
      expect(errors).toHaveLength(0);
    });
  }

  it("invalid-oversized-capacity.json exceeds DEFAULT_LIMITS", () => {
    const data = loadOrganicTreeFixture(
      "invalid-oversized-capacity",
    ) as OrganicTree;
    const errors = validateCapacity(data, DEFAULT_LIMITS);
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── 2.4: Sentence-like invalid fixture fails with path-specific errors ────

describe("fixture-validation — sentence-like detection", () => {
  it("invalid-sentence-like.json fails with path-specific errors", () => {
    const data = loadOrganicTreeFixture("invalid-sentence-like");
    const result = validateOrganicTree(data);
    expect(result.valid).toBe(false);

    const paths = result.errors.map((e) => e.path);
    // Errors should point to specific branch paths, not just generic messages
    expect(paths.some((p) => p.includes("branches[0]"))).toBe(true);
    expect(paths.some((p) => p.includes("branches[1]"))).toBe(true);
  });
});

// ─── 2.5: Oversized invalid fixture fails with regeneration-oriented feedback

describe("fixture-validation — capacity feedback", () => {
  it("invalid-oversized-capacity.json produces actionable feedback", () => {
    const data = loadOrganicTreeFixture(
      "invalid-oversized-capacity",
    ) as OrganicTree;
    const errors = validateCapacity(data, DEFAULT_LIMITS);
    expect(errors.length).toBeGreaterThan(0);

    const feedback = formatCapacityFeedback(errors);
    expect(feedback.length).toBeGreaterThan(0);
    expect(feedback).toContain("exceeds");
    expect(feedback).toContain("regenerate a shorter concept list");
  });
});

// ─── 2.6: Valid OmmDocument fixtures pass document validation ─────────────

describe("fixture-validation — OmmDocument", () => {
  it("valid-a4-with-center-visual.json passes validateOmmDocument", () => {
    const data = loadOmmFixture("valid-a4-with-center-visual");
    const result = validateOmmDocument(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("valid-minimal-a3.json passes validateOmmDocument", () => {
    const data = loadOmmFixture("valid-minimal-a3");
    const result = validateOmmDocument(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
