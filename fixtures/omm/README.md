# .omm Document Fixtures

Test fixtures for the `.omm` document format (OmmDocument), used by the document validation and renderer pipeline.

## Fixture Categories

### `valid-*`
Correctly formed `.omm` documents that pass all validation passes.

### `invalid-*`
Documents that fail validation with specific error codes:
- `invalid-display-text.json` — render artifact fields on nodes
- `invalid-duplicate-node-ids.json` — non-unique node IDs
- `invalid-missing-asset-refs.json` — unresolved asset references
- `invalid-missing-center-visual.json` — plain string instead of CenterVisual object
- `invalid-missing-layout.json` — incomplete layout snapshot
- `invalid-stale-parent-child-ids.json` — persisted parentId/childIds on nodes
- `invalid-unsupported-paper.json` — unknown surface preset
- `invalid-uploaded-base64-assets.json` — non-builtin asset sources
- `invalid-web-fonts-declaration.json` — URL-based fontFamily in theme (fail-fast rejection)
- `invalid-missing-seed-without-layout.json` — missing organicSeed with incomplete layout
- `invalid-flat-nodes.json` — flat runtime `nodes` dictionary rejected in favor of nested `children`

### `repair-*`
Documents that are intentionally broken but repairable:
- `repair-missing-seed-with-layout.json` — missing organicSeed with complete layout snapshot (seed can be backfilled via deterministic cyrb53 hash without relayout)

## Document Model

Each `.omm` fixture follows the OmmDocument schema:
- `id`, `version` (1), `title` — envelope fields
- `surface` — surface specification with preset and aspectRatio
- `organicSeed` — deterministic seed for layout
- `rootMap` — mind map tree with center visual and branches
- `layout` — layout snapshot with geometry, paths, and viewport
- `assets` — built-in image asset manifest
- `meta` — creation metadata

## Font Safety

Web font declarations (URL-based `fontFamily`, `@font-face`, WOFF/WOFF2 references) are rejected at the schema validation boundary. Only system-safe font families are allowed: `sans-serif`, `serif`, `system-ui`, `monospace`, `cursive`, `fantasy`.
