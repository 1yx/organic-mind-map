/**
 * Deterministic instantiation: hash, serialization, seeded PRNG, and
 * stable node ID / color / geometry generation.
 *
 * Environment-neutral — no DOM, Canvas, or network dependencies.
 */

import type { OrganicTree, OrganicMainBranch } from "@omm/core";
import type {
  BranchColorPalette,
  SeededGeometry,
  LayoutNode,
  BranchSector,
} from "./types.js";

// ─── Color Palette ─────────────────────────────────────────────────────────

export const MAIN_BRANCH_COLORS: BranchColorPalette = [
  "#E74C3C", // red
  "#3498DB", // blue
  "#2ECC71", // green
  "#F39C12", // orange
  "#9B59B6", // purple
  "#1ABC9C", // teal
  "#E67E22", // dark orange
  "#34495E", // dark blue-gray
] as const;

// ─── cyrb53 Hash ───────────────────────────────────────────────────────────

/**
 * cyrb53 — a fast, non-cryptographic 53-bit hash function.
 * Produces a 53-bit integer from a string input.
 *
 * @see https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
 */
export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// ─── Stable Tree Serialization ─────────────────────────────────────────────

/**
 * Recursively sort an object's keys for deterministic JSON serialization.
 * Arrays are preserved in order; plain objects have keys sorted alphabetically.
 */
function stableSort(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stableSort);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = stableSort((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Deterministic serialization of an OrganicTree tree.
 * Only includes fields that affect visual output (title, center concept, branches).
 * Keys are sorted, arrays preserve order.
 */
export function stableSerializeTree(tree: OrganicTree): string {
  const minimal: Record<string, unknown> = {
    title: tree.title,
    center: {
      concept: tree.center.concept,
    },
    branches: tree.branches.map((b, _i) => ({
      concept: b.concept,
      children: b.children?.map((s) => ({
        concept: s.concept,
        children: s.children?.map((l) => ({ concept: l.concept })),
      })),
    })),
  };
  return JSON.stringify(stableSort(minimal));
}

/**
 * Derive an organic seed number from a serialized tree string.
 */
export function deriveOrganicSeed(serialized: string): number {
  return cyrb53(serialized);
}

// ─── Seeded PRNG (Mulberry32) ─────────────────────────────────────────────

/**
 * Mulberry32 — a fast 32-bit PRNG seeded with a 32-bit integer.
 * Returns a function that produces values in [0, 1).
 */
export function createSeededPRNG(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Node ID Generation ────────────────────────────────────────────────────

/**
 * Push leaf node entries and return the updated index counter.
 */
function pushLeafEntries(
  leaves: Array<{ concept: string }>,
  nodes: Array<{ id: string; concept: string; depth: number }>,
  index: number,
): number {
  for (const leaf of leaves) {
    nodes.push({ id: `n-${index}`, concept: leaf.concept, depth: 3 });
    index++;
  }
  return index;
}

/**
 * Generate stable node IDs "n-index" for a flat traversal of the tree.
 * Returns an ordered array of entries with id, concept, depth.
 */
export function generateNodeIds(tree: OrganicTree): Array<{
  id: string;
  concept: string;
  depth: number;
}> {
  const nodes: Array<{ id: string; concept: string; depth: number }> = [];
  let index = 0;

  // Center is not a numbered node; branches start at index 0
  for (const branch of tree.branches) {
    nodes.push({ id: `n-${index}`, concept: branch.concept, depth: 1 });
    index++;

    if (branch.children) {
      for (const sub of branch.children) {
        nodes.push({ id: `n-${index}`, concept: sub.concept, depth: 2 });
        index++;
        if (sub.children) {
          index = pushLeafEntries(sub.children, nodes, index);
        }
      }
    }
  }
  return nodes;
}

// ─── Main Branch Color Assignment ──────────────────────────────────────────

/**
 * Assign a color from the palette to each main branch, seeded deterministically.
 * If there are more main branches than palette colors, the palette wraps.
 */
export function assignMainBranchColors(
  mainBranchCount: number,
  seed: number,
): string[] {
  const rng = createSeededPRNG(seed);
  const colors: string[] = [];

  // Start with a seed-based offset into the palette
  const offset = Math.floor(rng() * MAIN_BRANCH_COLORS.length);

  for (let i = 0; i < mainBranchCount; i++) {
    colors.push(MAIN_BRANCH_COLORS[(offset + i) % MAIN_BRANCH_COLORS.length]!);
  }
  return colors;
}

// ─── Seeded Geometry Generation ────────────────────────────────────────────

/**
 * Generate seeded geometry parameters for a branch.
 * These are applied BEFORE collision checks.
 */
export function generateSeededGeometry(rng: () => number): SeededGeometry {
  return {
    angle: rng() * Math.PI * 2,
    curvature: 0.2 + rng() * 0.6, // 0.2–0.8
    taper: 0.3 + rng() * 0.5, // 0.3–0.8
    lengthPreference: 0.8 + rng() * 0.5, // 0.8–1.3
  };
}

// ─── Full Layout Tree Builder ──────────────────────────────────────────────

/**
 * Push leaf nodes for a sub-branch onto the parent and flat result list.
 */
function pushOrganicLeafNodes(
  branches: OrganicMainBranch[],
  context: {
    branchIdx: number;
    subIdx: number;
    subNode: LayoutNode;
    mainColor: string;
    rng: () => number;
    result: LayoutNode[];
  },
): void {
  const { branchIdx, subIdx, subNode, mainColor, rng, result } = context;
  const sub = branches[branchIdx]!.children![subIdx]!;
  if (!sub.children) return;
  for (let k = 0; k < sub.children.length; k++) {
    const leaf = sub.children[k]!;
    const leafNode: LayoutNode = {
      id: `n-${getNodeIndexWithLeaf(branches, { branchIdx, subIdx, leafIdx: k })}`,
      concept: leaf.concept,
      depth: 3,
      parentId: subNode.id,
      color: mainColor,
      geometry: generateSeededGeometry(rng),
      children: [],
    };
    subNode.children.push(leafNode);
    result.push(leafNode);
  }
}

/**
 * Build sub-branch and leaf LayoutNodes for a single main branch.
 */
function buildOrganicSubBranches(
  mainBranches: OrganicMainBranch[],
  context: {
    branchIdx: number;
    mainNode: LayoutNode;
    mainColor: string;
    rng: () => number;
    result: LayoutNode[];
  },
): void {
  const { branchIdx, mainNode, mainColor, rng, result } = context;
  const main = mainBranches[branchIdx]!;
  if (!main.children) return;
  for (let j = 0; j < main.children.length; j++) {
    const sub = main.children[j]!;
    const subNode: LayoutNode = {
      id: `n-${getNodeIndexWithSub(mainBranches, branchIdx, j)}`,
      concept: sub.concept,
      depth: 2,
      parentId: mainNode.id,
      color: mainColor,
      geometry: generateSeededGeometry(rng),
      children: [],
    };
    mainNode.children.push(subNode);
    result.push(subNode);
    pushOrganicLeafNodes(mainBranches, {
      branchIdx,
      subIdx: j,
      subNode,
      mainColor,
      rng,
      result,
    });
  }
}

/**
 * Build a complete LayoutNode tree from an OrganicTree,
 * assigning IDs, colors, and seeded geometry deterministically.
 */
export function buildLayoutTree(tree: OrganicTree, seed: number): LayoutNode[] {
  const rng = createSeededPRNG(seed);
  const mainColors = assignMainBranchColors(tree.branches.length, seed);
  const mainBranches = tree.branches;
  const result: LayoutNode[] = [];

  for (let i = 0; i < mainBranches.length; i++) {
    const main = mainBranches[i]!;
    const mainNode: LayoutNode = {
      id: `n-${getNodeIndex(mainBranches, i)}`,
      concept: main.concept,
      depth: 1,
      color: mainColors[i]!,
      geometry: generateSeededGeometry(rng),
      children: [],
    };
    result.push(mainNode);
    buildOrganicSubBranches(mainBranches, {
      branchIdx: i,
      mainNode,
      mainColor: mainColors[i]!,
      rng,
      result,
    });
  }

  return result;
}

// ─── Helper: Compute flat node index ───────────────────────────────────────

function getNodeIndex(
  branches: OrganicMainBranch[],
  branchIdx: number,
): number {
  let idx = 0;
  for (let i = 0; i < branchIdx; i++) {
    idx++; // main branch itself
    const b = branches[i]!;
    if (b.children) {
      for (const sub of b.children) {
        idx++;
        if (sub.children) idx += sub.children.length;
      }
    }
  }
  return idx;
}

function getNodeIndexWithSub(
  branches: OrganicMainBranch[],
  branchIdx: number,
  subIdx: number,
): number {
  let idx = getNodeIndex(branches, branchIdx);
  idx++; // skip the main branch itself
  const b = branches[branchIdx]!;
  if (b.children) {
    for (let j = 0; j < subIdx; j++) {
      idx++;
      const subChild = b.children[j];
      if (subChild?.children) idx += subChild.children.length;
    }
  }
  return idx;
}

function getNodeIndexWithLeaf(
  branches: OrganicMainBranch[],
  context: { branchIdx: number; subIdx: number; leafIdx: number },
): number {
  const { branchIdx, subIdx, leafIdx } = context;
  let idx = getNodeIndexWithSub(branches, branchIdx, subIdx);
  idx++;
  return idx + leafIdx;
}

// ─── Sector Assignment ─────────────────────────────────────────────────────

/**
 * Assign angular sectors to main branches.
 * Branches are distributed left/right, evenly within each half.
 * Right side: -π/2 to π/2 (in standard math coordinates, this is the right half)
 * Left side: π/2 to 3π/2
 *
 * In SVG coordinates (y-down), right side angles are -π/2..π/2, left is π/2..3π/2.
 * We use SVG convention: 0 = right, π/2 = down, π = left, 3π/2 = up.
 */
export function assignBranchSectors(
  branchCount: number,
  _seed: number,
): BranchSector[] {
  const sectors: BranchSector[] = [];
  const rightCount = Math.ceil(branchCount / 2);
  const leftCount = branchCount - rightCount;

  // Right side: angles from -π/3 to π/3 (spread around 0)
  const rightStart = -Math.PI / 3;
  const rightEnd = Math.PI / 3;
  const rightStep =
    rightCount > 1 ? (rightEnd - rightStart) / (rightCount - 1) : 0;

  // Left side: angles from 2π/3 to 4π/3 (spread around π)
  const leftStart = (2 * Math.PI) / 3;
  const leftEnd = (4 * Math.PI) / 3;
  const leftStep = leftCount > 1 ? (leftEnd - leftStart) / (leftCount - 1) : 0;

  let rightIdx = 0;
  let leftIdx = 0;

  for (let i = 0; i < branchCount; i++) {
    if (i % 2 === 0 && rightIdx < rightCount) {
      // Even-indexed branches go right
      const angle = rightCount > 1 ? rightStart + rightStep * rightIdx : 0;
      sectors.push({
        angleStart: angle - Math.PI / 6,
        angleEnd: angle + Math.PI / 6,
        side: "right",
      });
      rightIdx++;
    } else if (leftIdx < leftCount) {
      // Odd-indexed branches go left
      const angle = leftCount > 1 ? leftStart + leftStep * leftIdx : Math.PI;
      sectors.push({
        angleStart: angle - Math.PI / 6,
        angleEnd: angle + Math.PI / 6,
        side: "left",
      });
      leftIdx++;
    }
  }

  return sectors;
}
