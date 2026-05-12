## Why

Phase 1 preview handoff now uses `OrganicTree` directly, but older code and fixtures may still reference `PreviewPayload`. Removing the legacy wrapper prevents two competing preview contracts.

## What Changes

- Remove active `PreviewPayload` types, fixtures, render discriminators, and CLI/Web handoff paths.
- Ensure `/api/document` serves validated `OrganicTree` for Agent preview.
- Ensure renderer public input uses `kind: "organic-tree"` or `kind: "omm-document"` only.
- Keep migration notes/docs references only where explicitly historical.

## Capabilities

### New Capabilities

### Modified Capabilities
- `cli-preview-handoff`: Complete the no-`PreviewPayload` handoff migration.
- `readonly-svg-renderer`: Complete the render input migration away from `preview-payload`.

## Impact

- Affects core/renderer types, CLI server handoff, Web fetch handling, fixtures, and tests.
- No new runtime feature or dependency.
