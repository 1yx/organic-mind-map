## Why

Phase 1 should not become a full visual asset system, but OrganicTree already preserves branch `visualHint` fields. This change adds a minimal, deterministic branch visual hint rendering path so maps are not limited to center visuals only.

## What Changes

- Render optional branch `visualHint` values as small built-in symbolic markers near branch text.
- Keep hints inert and deterministic; do not fetch images or embed uploaded/generated assets.
- Preserve `visualHint` through validation and use it only when present.
- Do not add asset libraries, uploads, AI generation, or editor controls.

## Capabilities

### New Capabilities

### Modified Capabilities
- `organic-tree-contract`: Clarify branch visual hints remain optional semantic hints.
- `readonly-svg-renderer`: Render a lightweight built-in visual marker for supported branch visual hints.

## Impact

- Affects renderer branch label/model generation, built-in marker mapping, SVG tests, and OrganicTree fixtures.
- No new dependency and no network image loading.
