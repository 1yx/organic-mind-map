## Context

The hand-drawn branch demo currently has three rendering modes, but the visual comparison is weakened by skeleton issues: the right side can carry more visual mass, 1-to-2 child structures can place both children on the same side of the parent, and some branches become too vertical for later text placement. The demo needs a stronger shared skeleton before the organic ribbon and jitter styles can be evaluated fairly.

The goal is still demo-only. The production renderer must not be changed by this change.

## Goals / Non-Goals

**Goals:**

- Make Baseline, Organic, and Jittered modes share the same branch skeleton.
- Balance left/right placement by leaf-node visual weight, not by raw main-branch count or input order.
- Allow main branches to be spatially reordered while preserving semantic order in the demo data.
- Place 1-to-2 child branches on opposite sides of the parent branch direction.
- Keep terminal branch tangents within roughly 30 degrees of horizontal.
- Keep Baseline visually traditional: smooth colored strokes, no ribbon body, no jitter.

**Non-Goals:**

- Do not integrate the skeleton into `@omm/renderer`.
- Do not add branch text yet.
- Do not change `OrganicTree`, `.omm`, CLI, Web preview, or export behavior.
- Do not make the demo a full layout engine.

## Decisions

### Use Leaf-Weight Partitioning for Left/Right Balance

Each main branch will receive a visual weight based primarily on leaf count. The demo will assign main branches to left/right sides by choosing the subset whose total weight is closest to half the total. This intentionally allows the spatial side assignment to differ from semantic input order.

For small MVP-scale branch counts, exhaustive subset search is simpler and more reliable than a greedy heuristic. With 3-7 main branches, the search space is tiny.

Tie-breakers should be deterministic:

1. Minimize left/right weight difference.
2. Prefer smaller branch-count difference.
3. Prefer stable placement for the first semantic branch.
4. Use the existing demo seed/order as final tie-break.

### Preserve Side-Local Semantic Order

After partitioning, each side will keep the relative semantic order of branches assigned to that side. This keeps the layout readable without forcing the global input order to dictate left/right mass distribution.

### Use Horizontal Reading Lanes

Main branch endpoints will be assigned side-local vertical lanes, but their terminal tangent will point left/right with at most about 30 degrees of vertical deviation. This makes the skeleton suitable for future text-on-branch placement.

### Split Children Around Parent Normals

Child placement will be relative to the parent tangent/normal at the child anchor point:

- 1 child: continue the parent direction with a small offset.
- 2 children: one normal-up, one normal-down.
- 3 children: up, center, down.
- 4+ children: distribute symmetrically across normal offsets.

This avoids placing both branches of a 1-to-2 structure on the same side.

### Use Trunk-Segmented Placement for Dense Child Sets

For 4+ children, the demo should look closer to a traditional Buzan branch structure than a random fan. Child anchors will be placed at multiple positions along the parent branch, so children appear to grow from the main trunk in sequence.

The terminal rows for dense child sets should be visually even and reserve room for future branch text. In the demo, the 5-child right-side branch uses fixed readable rows across the page height, with terminal x positions kept inside the paper bounds instead of pushed to the edge. Terminal tangents remain near horizontal, while the curve body may sweep organically into the row.

This rule is still demo-specific. It is a visual prototype for later renderer discussion, not a production layout algorithm.

### Separate Skeleton From Rendering Style

The demo will compute one skeleton and render it three ways:

- Baseline: traditional smooth stroke.
- Organic: variable-width ribbon without edge jitter.
- Jittered: same variable-width ribbon with deterministic edge jitter.

This makes mode comparison about style, not layout.

## Risks / Trade-offs

- Weight balancing can move a branch to the opposite side from previous screenshots -> acceptable because semantic order is preserved in data, and the demo is exploratory.
- Strict horizontal constraints can reduce organic variety -> allow the curve body to bend while clamping only terminal/readability direction.
- Exhaustive subset partitioning needs deterministic tie-breaks -> define tie-break order and keep inputs stable.
- Child normal splitting can still collide in dense cases -> acceptable for demo; future renderer integration will need collision-aware refinement.
- Dense child-set rows can look too regular if applied universally -> acceptable here because the demo is evaluating readable branch structure before text rendering exists.
