## 1. Shared Skeleton Model

- [x] 1.1 Replace hard-coded side/level demo specs with semantic branch data that includes child counts and leaf counts.
- [x] 1.2 Compute a single branch skeleton used by Baseline, Organic, and Jittered modes.
- [x] 1.3 Keep rendering-mode code limited to style differences over the shared skeleton.

## 2. Main Branch Balancing

- [x] 2.1 Implement leaf-weight calculation for main branch visual mass.
- [x] 2.2 Implement deterministic left/right partitioning that minimizes leaf-weight imbalance.
- [x] 2.3 Preserve semantic branch order in data and side-local vertical order in the skeleton.
- [x] 2.4 Add a demo case where one heavy branch balances multiple lighter branches on the opposite side.

## 3. Child Branch Placement

- [x] 3.1 Place child anchors along the parent curve rather than at the parent endpoint.
- [x] 3.2 Implement parent-relative sibling offsets so two children split above and below the parent.
- [x] 3.3 Implement symmetric sibling offsets for one, three, and four-or-more child cases.
- [x] 3.4 For four-or-more child cases, segment anchors along the parent trunk and spread terminal rows evenly.

## 4. Horizontal Readability Constraints

- [x] 4.1 Clamp branch terminal tangents to approximately 30 degrees from horizontal.
- [x] 4.2 Keep branch interiors organic while preserving horizontal terminal directions.
- [x] 4.3 Ensure Baseline remains smooth traditional strokes with no ribbon body or jitter.

## 5. Verification

- [x] 5.1 Update Playwright verification to confirm all modes render visible branches from the same skeleton.
- [x] 5.2 Capture a fresh screenshot under `.tmp/`.
- [x] 5.3 Run `node handdraw-branch-demo/verify.mjs`.
- [x] 5.4 Run `pnpm -w run lint`.
- [x] 5.5 Manually review the demo in a browser and confirm left/right balance, sibling splitting, and horizontal branch tendency.
- [x] 5.6 Verify dense child sets preserve page-height spread and text-bearing terminal room.
