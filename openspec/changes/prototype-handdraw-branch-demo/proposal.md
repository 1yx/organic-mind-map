## Why

The current preview branches still read as mechanically generated ribbons, while the hand-drawn references in `fixtures/handdraw/` use organic branches with mostly horizontal reading segments. Before rewriting the production renderer, we need a contained visual prototype to evaluate the branch algorithm and tune the aesthetic safely.

## What Changes

- Add a standalone static demo under `.tmp/` that renders hand-drawn organic branch examples without text.
- Demonstrate readability-biased branch geometry: curved growth from the center with near-horizontal terminal segments.
- Demonstrate sampled variable-width branch ribbons with deterministic edge jitter.
- Demonstrate child branches growing from different points along a parent branch instead of all children starting at the same endpoint.
- Add Playwright-based visual verification for the demo page, including screenshot capture and non-empty SVG checks.
- Do not modify the production renderer behavior in this change.

## Capabilities

### New Capabilities

- `handdraw-branch-demo`: Standalone prototype surface for evaluating hand-drawn organic branch algorithms before production renderer changes.

### Modified Capabilities

- None.

## Impact

- Adds demo-only files under `.tmp/`.
- May add small demo verification scripts or package commands if useful.
- Does not change `@omm/renderer`, `@omm/web`, `.omm` output, CLI behavior, or existing production specs.
