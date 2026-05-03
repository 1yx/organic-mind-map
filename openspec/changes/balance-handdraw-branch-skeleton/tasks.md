## 1. Shared Skeleton Model

- [ ] 1.1 Replace hard-coded side/level demo specs with semantic branch data that includes child counts and leaf counts.
- [ ] 1.2 Compute a single branch skeleton used by Baseline, Organic, and Jittered modes.
- [ ] 1.3 Keep rendering-mode code limited to style differences over the shared skeleton.

## 2. Main Branch Balancing

- [ ] 2.1 Implement leaf-weight calculation for main branch visual mass.
- [ ] 2.2 Implement deterministic left/right partitioning that minimizes leaf-weight imbalance.
- [ ] 2.3 Preserve semantic branch order in data and side-local vertical order in the skeleton.
- [ ] 2.4 Add a demo case where one heavy branch balances multiple lighter branches on the opposite side.

## 3. Child Branch Placement

- [ ] 3.1 Place child anchors along the parent curve rather than at the parent endpoint.
- [ ] 3.2 Implement parent-relative sibling offsets so two children split above and below the parent.
- [ ] 3.3 Implement symmetric sibling offsets for one, three, and four-or-more child cases.

## 4. Horizontal Readability Constraints

- [ ] 4.1 Clamp branch terminal tangents to approximately 30 degrees from horizontal.
- [ ] 4.2 Keep branch interiors organic while preserving horizontal terminal directions.
- [ ] 4.3 Ensure Baseline remains smooth traditional strokes with no ribbon body or jitter.

## 5. Verification

- [ ] 5.1 Update Playwright verification to confirm all modes render visible branches from the same skeleton.
- [ ] 5.2 Capture a fresh screenshot under `.tmp/`.
- [ ] 5.3 Run `node handdraw-branch-demo/verify.mjs`.
- [ ] 5.4 Run `pnpm -w run lint`.
- [ ] 5.5 Manually review the demo in a browser and confirm left/right balance, sibling splitting, and horizontal branch tendency.
