## Why

The renderer currently reports persistent `unresolved-collision` diagnostics for valid radial layouts because branch path AABBs overlap near shared origins even when the visible branch paths diverge. The MVP preview should not show collision warnings for `fixtures/organic-tree/anthropic-product-team.json` when the layout is visually valid.

## What Changes

- Refine collision detection so expected overlaps around radial branch origins do not produce unresolved-collision diagnostics.
- Preserve real collision diagnostics for unrelated branch/text/marker overlaps outside the shared-origin region.
- Add fixture-backed verification for `anthropic-product-team.json` with zero render diagnostics.
- Keep the implementation lightweight; do not introduce OBBs, bezier intersection, Playwright-only verification, or a full layout solver rewrite.

## Capabilities

### New Capabilities

### Modified Capabilities
- `readonly-svg-renderer`: Add radial-origin-aware collision filtering for branch path envelopes.
- `fixture-coverage-gaps`: Add a valid radial fixture that must render without collision diagnostics.

## Impact

- Affects `packages/renderer/src/layout.ts`, collision diagnostics helpers, renderer tests, and OrganicTree fixture coverage.
- No new external dependencies.
