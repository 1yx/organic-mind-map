## 1. Demo Surface

- [x] 1.1 Create a standalone demo directory under `handdraw-branch-demo/`.
- [x] 1.2 Add an HTML entry page that renders SVG without depending on the production Web app.
- [x] 1.3 Add simple controls or labeled examples to compare baseline, organic, and jittered branch variants.

## 2. Branch Algorithm Prototype

- [x] 2.1 Implement deterministic seeded helpers for repeatable branch jitter.
- [x] 2.2 Implement readability-biased cubic centerlines with near-horizontal terminal tangents.
- [x] 2.3 Implement sampled variable-width ribbon outlines from centerline normals.
- [x] 2.4 Implement depth-scaled deterministic edge jitter for hand-drawn contours.
- [x] 2.5 Implement child branch anchors along parent curve positions instead of parent endpoints.
- [x] 2.6 Render multiple branch-only examples inspired by `fixtures/handdraw/` without adding text.

## 3. Verification

- [x] 3.1 Run a local static server or equivalent browser target for the demo.
- [x] 3.2 Use Playwright to open the demo and assert non-empty SVG branch paths are visible.
- [x] 3.3 Capture a Playwright screenshot under `.tmp/`.
- [x] 3.4 Run `pnpm -w run lint`.
- [x] 3.5 Run focused checks needed for any scripts added by the demo.
- [x] 3.6 Manually review the demo in a browser and confirm the branch style is acceptable before renderer integration.
