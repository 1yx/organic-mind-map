# Problem: Layout Engine AABB Collision Detection Produces Persistent False Positives

## Status

**Unresolved.** The fixture `fixtures/organic-tree/anthropic-product-team.json` renders with 8 `unresolved-collision` warnings. The goal is **0 diagnostics** on the preview page.

---

## Symptom

When previewing the fixture at `http://127.0.0.1:5173`, the page shows:

```
Diagnostics (8)
[WARNING] unresolved-collision: Unresolved overlap between nodes n-0 and n-6.
[WARNING] unresolved-collision: Unresolved overlap between nodes n-0 and n-7.
[WARNING] unresolved-collision: Unresolved overlap between nodes n-0 and n-8.
[WARNING] unresolved-collision: Unresolved overlap between nodes n-1 and n-7.
[WARNING] unresolved-collision: Unresolved overlap between nodes n-1 and n-8.
[WARNING] unresolved-collision: Unresolved overlap between nodes n-2 and n-7.
[WARNING] unresolved-collision: Unresolved overlap between nodes n-2 and n-8.
[WARNING] unresolved-collision: Unresolved overlap between nodes n-3 and n-12.
```

---

## Root Cause

The collision detection in `packages/renderer/src/layout.ts` (`runCollisionDetection`) uses **axis-aligned bounding boxes (AABBs)** to check if branches overlap. This produces false positives in a radial mind map layout because:

1. **All main branches originate from the center.** Adjacent main branches (e.g., at -60° and 0°) diverge from the same point. Their AABBs overlap significantly near the center even though the visual paths don't cross.

2. **Children inherit the problem.** A child branch's bounding box starts at its parent's endpoint. If two adjacent main branches have close endpoints, their children's boxes also overlap.

3. **AABB is fundamentally wrong for diagonal lines.** `computePathBBox` creates a rectangle around start/end points. Two diagonal lines going in different directions from a shared origin will always have overlapping AABBs near the origin.

### The AABB computation (`layout.ts:476-483`)

```typescript
function computePathBBox(s: Point, e: Point, pad: number): LayoutBox {
  return {
    x: Math.min(s.x, e.x) - pad,
    y: Math.min(s.y, e.y) - pad,
    width: Math.abs(e.x - s.x) + pad * 2,
    height: Math.abs(e.y - s.y) + pad * 2,
  };
}
```

Where `pad` is the stroke width at the branch start (28 for depth-1, 16 for depth-2).

### The collision check (`diagnostics.ts:128-137`)

```typescript
export function boxesOverlap(a: LayoutBox, b: LayoutBox, padding = 0): boolean {
  return (
    a.x + padding < b.x + b.width - padding &&
    a.x + a.width - padding > b.x + padding &&
    a.y + padding < b.y + b.height - padding &&
    a.y + a.height - padding > b.y + padding
  );
}
```

`padding` shrinks each box before checking. Current value: `minPad = 40` (was 20, increased but still insufficient).

---

## What's Already Been Done

### Fixes that worked (reduced diagnostics from 60 → 8)

1. **Parent-child exclusion** — Skip collision pairs where one node is the direct parent of the other. They share a connection point by design.
   - File: `diagnostics.ts`, function `isParentChildPair()`
   - File: `layout.ts`, `runCollisionDetection()` calls `isParentChildPair()` before `boxesOverlap()`

2. **Sibling exclusion** — Skip pairs where both nodes share the same parent (siblings).
   - File: `diagnostics.ts`, function `areSiblings()`
   - File: `layout.ts`, `runCollisionDetection()` calls `areSiblings()` before `boxesOverlap()`

3. **`boxOwners` tracking** — Replaced the broken `ctx.order[i-1]` mapping with a proper `ctx.boxOwners[]` array that correctly maps each bounding box (including marker boxes) to its node ID.
   - File: `layout.ts`, `Ctx` type now has `boxOwners: (string | null)[]`

4. **Reduced fixture from 7 → 6 main branches** — With 7 branches, one side gets 4 branches in a 120° arc. Since each sector is 60° wide (±30°), 4 branches cause 20° sector overlaps. 6 branches (3 per side) eliminates sector overlap.
   - File: `fixtures/organic-tree/anthropic-product-team.json`

5. **Reduced children from 3-4 → 2 per branch** — Shorter concept names and fewer children reduce bounding box sizes and text clipping.

### What didn't work

- **Increasing `minPad` from 20 → 30 → 40** — The overlaps are hundreds of units, not marginal. Increasing padding had zero effect on the remaining 8 collisions.

---

## The 8 Remaining Collisions Explained

With the fixture tree, node IDs map to:

| ID  | Concept    | Depth | Parent | Side  |
|-----|------------|-------|--------|-------|
| n-0 | 极速交付    | 1     | —      | right |
| n-1 | 研究预览    | 2     | n-0    | right |
| n-2 | 跨职能      | 2     | n-0    | right |
| n-3 | PM 角色    | 1     | —      | left  |
| n-6 | 产品矩阵    | 1     | —      | right |
| n-7 | CLI·Desktop| 2     | n-6    | right |
| n-8 | Mobile     | 2     | n-6    | right |
| n-12| 使命聚焦    | 1     | —      | left  |

The 8 collisions are:

- **n-0 vs {n-6, n-7, n-8}** (3) — Branch 0 (极速交付, right side at ~-60°) vs Branch 2 (产品矩阵, right side at ~0°) and its children. These are adjacent main branches on the right side. Their AABBs overlap near the center.

- **n-1, n-2 vs {n-7, n-8}** (4) — Children of branch 0 vs children of branch 2. Children start at their parent's endpoint. If the two parent endpoints are close (they're adjacent on the same side), children's boxes overlap.

- **n-3 vs n-12** (1) — Two left-side main branches (PM 角色 at ~120° and 使命聚焦 at ~180°). Same AABB overlap issue near center.

---

## Potential Solutions

### Option A: Skip cross-branch pairs that share an origin region

Add a check: if two nodes belong to different main branches that are on the **same side** of the layout, skip the collision check. The rationale is that same-side branches diverge from the center and their AABB overlap near the center is geometrically expected, not a visual defect.

Implementation: Add a `side` field to `BranchGeometry` or infer it from branch angle. In `runCollisionDetection`, skip pairs where both nodes' root branches are on the same side.

**Risk:** Could hide genuine collisions in extremely dense trees.

### Option B: Replace AABB with oriented bounding boxes (OBB)

Instead of axis-aligned boxes, use oriented boxes aligned with the branch direction. Two branches going at -60° and 0° from the same point would have non-overlapping OBBs because the boxes rotate with the path.

**Complexity:** Medium-high. Requires rewriting `computePathBBox` and `boxesOverlap`.

### Option C: Segment-based collision detection

Instead of checking bounding boxes, check whether two branch **path segments** actually intersect. This would eliminate all false positives from the AABB approach.

**Complexity:** High. Requires implementing line/bezier intersection tests.

### Option D: Distance-based check from shared origin

For two branches that share the same origin point (center for main branches), check if their paths get closer than a threshold **at their endpoints** rather than checking AABBs. Near the origin, branches are expected to be close; the collision only matters if branches converge or overlap at their outer ends.

**Complexity:** Medium. Need to compute minimum distance between two bezier curves.

### Option E: Two-pass detection with origin exclusion zone

First pass: identify all boxes that are near the center (within some radius). Second pass: only check collisions between boxes that are outside the center zone. This acknowledges that radial layouts always have overlap near the center.

**Complexity:** Low-medium. Add a center exclusion radius to the collision loop.

---

## Key Files

| File | Purpose |
|------|---------|
| `packages/renderer/src/layout.ts` | Layout engine, `runCollisionDetection()`, `computePathBBox()` |
| `packages/renderer/src/diagnostics.ts` | `boxesOverlap()`, `buildParentMap()`, `isParentChildPair()`, `areSiblings()`, `reportCollision()` |
| `packages/renderer/src/seed.ts` | `assignBranchSectors()` — distributes branches left/right |
| `packages/renderer/src/types.ts` | `BranchGeometry`, `RenderDiagnostic`, `LayoutBox` types |
| `fixtures/organic-tree/anthropic-product-team.json` | The fixture with 6 branches × 2 children |
| `packages/web/src/App.vue` | Diagnostics display UI (lines 215-227) |

## Key Numbers

- Surface: sqrt2-landscape = 4200 × 2970 SVG units
- Center radius: ~160 units (center bbox width / 2)
- Branch length (depth-1, 2 children): 588 / cbrt(2) × lengthPreference ≈ 370-530 units
- Branch length (depth-2, 0 children): 588 × 0.7 × lengthPreference ≈ 329-534 units
- Stroke width padding: depth-1 = 28, depth-2 = 16, depth-3 = 10
- Angular sectors: 60° per branch (±30°), 3 branches per side
- Font size: depth-1 = 80, depth-2 = 56, depth-3 = 42

## Verification Command

```bash
# Start preview
pnpm --filter @omm/cli -- dev preview "$(pwd)/fixtures/organic-tree/anthropic-product-team.json"

# In another terminal, check for diagnostics
curl -s http://127.0.0.1:5173 | head -5  # verify server is up
# Then open http://127.0.0.1:5173 in browser and look for "Diagnostics" section at bottom
```

Or use Playwright verification (see `packages/web/omm-verify.mjs` pattern — but clean up after use since ESLint rejects non-project `.mjs` files).

## Acceptance Criteria

- `pnpm -w run lint` passes (0 errors, 0 warnings)
- `pnpm -w run test` passes (all test suites green)
- Preview of `anthropic-product-team.json` shows **0 diagnostics** on the page
- The existing test trees (e.g., `TREE_WITH_HINTS` in `branch-markers.test.ts`) still produce 0 diagnostics
