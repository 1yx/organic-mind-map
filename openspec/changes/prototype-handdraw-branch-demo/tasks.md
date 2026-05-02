## 1. Demo Surface

- [ ] 1.1 Create a standalone demo directory under `.tmp/handdraw-branch-demo/`.
- [ ] 1.2 Add an HTML entry page that renders SVG without depending on the production Web app.
- [ ] 1.3 Add simple controls or labeled examples to compare baseline, organic, and jittered branch variants.

## 2. Branch Algorithm Prototype

- [ ] 2.1 Implement deterministic seeded helpers for repeatable branch jitter.
- [ ] 2.2 Implement readability-biased cubic centerlines with near-horizontal terminal tangents.
- [ ] 2.3 Implement sampled variable-width ribbon outlines from centerline normals.
- [ ] 2.4 Implement depth-scaled deterministic edge jitter for hand-drawn contours.
- [ ] 2.5 Implement child branch anchors along parent curve positions instead of parent endpoints.
- [ ] 2.6 Render multiple branch-only examples inspired by `fixtures/handdraw/` without adding text.

## 3. Verification

- [ ] 3.1 Run a local static server or equivalent browser target for the demo.
- [ ] 3.2 Use Playwright to open the demo and assert non-empty SVG branch paths are visible.
- [ ] 3.3 Capture a Playwright screenshot under `.tmp/`.
- [ ] 3.4 Run `pnpm -w run lint`.
- [ ] 3.5 Run focused checks needed for any scripts added by the demo.
