/**
 * Tests for deterministic seed, hash, serialization, and PRNG (tasks 2.1-2.6).
 */

import { describe, it, expect } from "vitest";
import {
  cyrb53,
  stableSerializeTree,
  deriveOrganicSeed,
  createSeededPRNG,
  generateNodeIds,
  assignMainBranchColors,
  generateSeededGeometry,
  buildLayoutTree,
  assignBranchSectors,
  MAIN_BRANCH_COLORS,
} from "../seed";
import type { OrganicTree } from "@omm/core";

// ─── Fixture ───────────────────────────────────────────────────────────────

const SAMPLE_TREE: OrganicTree = {
  version: 1,
  title: "Mind Map Test",
  center: { concept: "Center Topic" },
  branches: [
    {
      concept: "Branch One",
      children: [
        { concept: "Sub 1A", children: [{ concept: "Leaf 1A1" }] },
        { concept: "Sub 1B" },
      ],
    },
    {
      concept: "Branch Two",
      children: [{ concept: "Sub 2A" }],
    },
    {
      concept: "Branch Three",
    },
  ],
};

const DIFFERENT_TREE: OrganicTree = {
  version: 1,
  title: "Different Map",
  center: { concept: "Other Center" },
  branches: [
    { concept: "Alpha" },
    { concept: "Beta", children: [{ concept: "Gamma" }] },
  ],
};

// ─── cyrb53 Hash ───────────────────────────────────────────────────────────

describe("cyrb53", () => {
  it("returns a number", () => {
    expect(typeof cyrb53("hello")).toBe("number");
  });

  it("is deterministic: same input always produces same output", () => {
    const a = cyrb53("deterministic test");
    const b = cyrb53("deterministic test");
    expect(a).toBe(b);
  });

  it("produces different outputs for different inputs", () => {
    const a = cyrb53("input A");
    const b = cyrb53("input B");
    expect(a).not.toBe(b);
  });

  it("respects the seed parameter", () => {
    const a = cyrb53("test", 0);
    const b = cyrb53("test", 42);
    expect(a).not.toBe(b);
  });

  it("handles empty string", () => {
    expect(typeof cyrb53("")).toBe("number");
  });

  it("handles unicode strings", () => {
    expect(typeof cyrb53("你好世界")).toBe("number");
  });

  it("produces positive integers", () => {
    const hash = cyrb53("some test value");
    expect(hash).toBeGreaterThan(0);
    expect(Number.isInteger(hash)).toBe(true);
  });
});

// ─── Stable Serialization ──────────────────────────────────────────────────

describe("stableSerializeTree", () => {
  it("produces deterministic JSON for the same tree", () => {
    const a = stableSerializeTree(SAMPLE_TREE);
    const b = stableSerializeTree(SAMPLE_TREE);
    expect(a).toBe(b);
  });

  it("produces different JSON for different trees", () => {
    const a = stableSerializeTree(SAMPLE_TREE);
    const b = stableSerializeTree(DIFFERENT_TREE);
    expect(a).not.toBe(b);
  });

  it("produces valid JSON that parses", () => {
    const json = stableSerializeTree(SAMPLE_TREE);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed).toBeDefined();
  });

  it("includes the title and center concept", () => {
    const json = stableSerializeTree(SAMPLE_TREE);
    expect(json).toContain("Mind Map Test");
    expect(json).toContain("Center Topic");
  });

  it("includes branch concepts", () => {
    const json = stableSerializeTree(SAMPLE_TREE);
    expect(json).toContain("Branch One");
    expect(json).toContain("Sub 1A");
    expect(json).toContain("Leaf 1A1");
  });

  it("is independent of key order in input (sorted keys)", () => {
    const tree1: OrganicTree = {
      version: 1,
      title: "Test",
      center: { concept: "C" },
      branches: [{ concept: "B1" }, { concept: "B2" }],
    };
    const tree2: OrganicTree = {
      branches: [{ concept: "B1" }, { concept: "B2" }],
      version: 1,
      title: "Test",
      center: { concept: "C" },
    };
    expect(stableSerializeTree(tree1)).toBe(stableSerializeTree(tree2));
  });
});

// ─── Organic Seed Derivation ───────────────────────────────────────────────

describe("deriveOrganicSeed", () => {
  it("returns a number from a serialized tree string", () => {
    const serialized = stableSerializeTree(SAMPLE_TREE);
    const seed = deriveOrganicSeed(serialized);
    expect(typeof seed).toBe("number");
  });

  it("is deterministic for the same tree", () => {
    const a = deriveOrganicSeed(stableSerializeTree(SAMPLE_TREE));
    const b = deriveOrganicSeed(stableSerializeTree(SAMPLE_TREE));
    expect(a).toBe(b);
  });

  it("differs between different trees", () => {
    const a = deriveOrganicSeed(stableSerializeTree(SAMPLE_TREE));
    const b = deriveOrganicSeed(stableSerializeTree(DIFFERENT_TREE));
    expect(a).not.toBe(b);
  });
});

// ─── Seeded PRNG ───────────────────────────────────────────────────────────

describe("createSeededPRNG", () => {
  it("returns a function", () => {
    const rng = createSeededPRNG(42);
    expect(typeof rng).toBe("function");
  });

  it("produces values in [0, 1)", () => {
    const rng = createSeededPRNG(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic: same seed produces same sequence", () => {
    const rng1 = createSeededPRNG(123);
    const rng2 = createSeededPRNG(123);
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it("different seeds produce different sequences", () => {
    const rng1 = createSeededPRNG(1);
    const rng2 = createSeededPRNG(2);
    let same = true;
    for (let i = 0; i < 50; i++) {
      if (rng1() !== rng2()) {
        same = false;
        break;
      }
    }
    expect(same).toBe(false);
  });
});

// ─── Node ID Generation ────────────────────────────────────────────────────

describe("generateNodeIds - ID generation", () => {
  it("generates stable IDs in tree order", () => {
    const ids = generateNodeIds(SAMPLE_TREE);
    expect(ids.map((n) => n.id)).toEqual([
      "n-0",
      "n-1",
      "n-2",
      "n-3",
      "n-4",
      "n-5",
      "n-6",
    ]);
  });

  it("captures correct concepts", () => {
    const ids = generateNodeIds(SAMPLE_TREE);
    expect(ids[0]!.concept).toBe("Branch One");
    expect(ids[1]!.concept).toBe("Sub 1A");
    expect(ids[2]!.concept).toBe("Leaf 1A1");
    expect(ids[3]!.concept).toBe("Sub 1B");
    expect(ids[4]!.concept).toBe("Branch Two");
  });

  it("captures correct depths", () => {
    const ids = generateNodeIds(SAMPLE_TREE);
    expect(ids[0]!.depth).toBe(1);
    expect(ids[1]!.depth).toBe(2);
    expect(ids[2]!.depth).toBe(3);
    expect(ids[3]!.depth).toBe(2);
    expect(ids[4]!.depth).toBe(1);
  });
});

describe("generateNodeIds - edge cases", () => {
  it("is deterministic", () => {
    const a = generateNodeIds(SAMPLE_TREE);
    const b = generateNodeIds(SAMPLE_TREE);
    expect(a).toEqual(b);
  });

  it("handles a tree with only main branches", () => {
    const tree: OrganicTree = {
      version: 1,
      title: "T",
      center: { concept: "C" },
      branches: [{ concept: "A" }, { concept: "B" }],
    };
    const ids = generateNodeIds(tree);
    expect(ids).toHaveLength(2);
    expect(ids[0]!.id).toBe("n-0");
    expect(ids[1]!.id).toBe("n-1");
  });

  it("handles an empty tree", () => {
    const tree: OrganicTree = {
      version: 1,
      title: "T",
      center: { concept: "C" },
      branches: [],
    };
    const ids = generateNodeIds(tree);
    expect(ids).toHaveLength(0);
  });
});

// ─── Main Branch Color Assignment ──────────────────────────────────────────

describe("assignMainBranchColors", () => {
  it("returns the same number of colors as branches", () => {
    const colors = assignMainBranchColors(5, 42);
    expect(colors).toHaveLength(5);
  });

  it("uses colors from the palette", () => {
    const colors = assignMainBranchColors(3, 42);
    for (const c of colors) {
      expect(MAIN_BRANCH_COLORS.includes(c)).toBe(true);
    }
  });

  it("is deterministic for the same seed", () => {
    const a = assignMainBranchColors(5, 42);
    const b = assignMainBranchColors(5, 42);
    expect(a).toEqual(b);
  });

  it("wraps around the palette if more branches than colors", () => {
    const colors = assignMainBranchColors(10, 42);
    expect(colors).toHaveLength(10);
    for (const c of colors) {
      expect(MAIN_BRANCH_COLORS.includes(c)).toBe(true);
    }
  });

  it("assigns distinct colors when possible", () => {
    const colors = assignMainBranchColors(8, 42);
    const unique = new Set(colors);
    expect(unique.size).toBeGreaterThanOrEqual(6);
  });
});

// ─── Seeded Geometry Generation ────────────────────────────────────────────

describe("generateSeededGeometry", () => {
  it("returns geometry with all required fields", () => {
    const rng = createSeededPRNG(42);
    const geo = generateSeededGeometry(rng);
    expect(geo).toHaveProperty("angle");
    expect(geo).toHaveProperty("curvature");
    expect(geo).toHaveProperty("taper");
    expect(geo).toHaveProperty("lengthPreference");
  });

  it("curvature is within expected range [0.2, 0.8]", () => {
    const rng = createSeededPRNG(42);
    for (let i = 0; i < 100; i++) {
      const geo = generateSeededGeometry(rng);
      expect(geo.curvature).toBeGreaterThanOrEqual(0.2);
      expect(geo.curvature).toBeLessThanOrEqual(0.8);
    }
  });

  it("taper is within expected range [0.3, 0.8]", () => {
    const rng = createSeededPRNG(42);
    for (let i = 0; i < 100; i++) {
      const geo = generateSeededGeometry(rng);
      expect(geo.taper).toBeGreaterThanOrEqual(0.3);
      expect(geo.taper).toBeLessThanOrEqual(0.8);
    }
  });

  it("lengthPreference is within expected range [0.8, 1.3]", () => {
    const rng = createSeededPRNG(42);
    for (let i = 0; i < 100; i++) {
      const geo = generateSeededGeometry(rng);
      expect(geo.lengthPreference).toBeGreaterThanOrEqual(0.8);
      expect(geo.lengthPreference).toBeLessThanOrEqual(1.3);
    }
  });
});

// ─── Build Layout Tree ─────────────────────────────────────────────────────

describe("buildLayoutTree", () => {
  it("builds a tree with correct number of nodes", () => {
    const seed = deriveOrganicSeed(stableSerializeTree(SAMPLE_TREE));
    const tree = buildLayoutTree(SAMPLE_TREE, seed);
    expect(tree).toHaveLength(7);
  });

  it("is deterministic", () => {
    const seed = deriveOrganicSeed(stableSerializeTree(SAMPLE_TREE));
    const a = buildLayoutTree(SAMPLE_TREE, seed);
    const b = buildLayoutTree(SAMPLE_TREE, seed);
    expect(a).toEqual(b);
  });

  it("assigns correct parent IDs", () => {
    const seed = deriveOrganicSeed(stableSerializeTree(SAMPLE_TREE));
    const tree = buildLayoutTree(SAMPLE_TREE, seed);
    const sub1a = tree.find((n: { concept: string }) => n.concept === "Sub 1A");
    expect(sub1a?.parentId).toBe("n-0");
  });

  it("children inherit main branch color", () => {
    const seed = deriveOrganicSeed(stableSerializeTree(SAMPLE_TREE));
    const tree = buildLayoutTree(SAMPLE_TREE, seed);
    const main1 = tree.find(
      (n: { concept: string }) => n.concept === "Branch One",
    );
    const sub1a = tree.find((n: { concept: string }) => n.concept === "Sub 1A");
    expect(sub1a?.color).toBe(main1?.color);
  });
});

// ─── Branch Sector Assignment ──────────────────────────────────────────────

describe("assignBranchSectors", () => {
  it("returns correct number of sectors", () => {
    const sectors = assignBranchSectors(4, 42);
    expect(sectors).toHaveLength(4);
  });

  it("is deterministic for same seed", () => {
    const a = assignBranchSectors(4, 42);
    const b = assignBranchSectors(4, 42);
    expect(a).toEqual(b);
  });

  it("distributes branches between left and right", () => {
    const sectors = assignBranchSectors(6, 42);
    const sides = sectors.map((s) => s.side);
    expect(sides).toContain("left");
    expect(sides).toContain("right");
  });

  it("handles single branch", () => {
    const sectors = assignBranchSectors(1, 42);
    expect(sectors).toHaveLength(1);
  });

  it("sectors have valid angle ranges", () => {
    const sectors = assignBranchSectors(8, 42);
    for (const s of sectors) {
      expect(s.angleStart).toBeLessThan(s.angleEnd);
    }
  });
});
