## Context

Phase 1 exports `.omm` from the browser after layout is computed. The persisted file should be stable, reopenable, and free of runtime/editor state. Existing specs already favor a nested tree with layout snapshot, while older technical docs described a flat runtime model.

## Goals / Non-Goals

**Goals:**
- Make the browser-exported `.omm` schema the single persisted Phase 1 format.
- Keep runtime graph helpers in memory only.
- Validate exported fixtures locally with path-specific errors.

**Non-Goals:**
- No visual editor state, undo stack, selection state, or drag state.
- No uploaded/generated image payload support.
- No migration for legacy `.omm` files unless a fixture in this repo already requires it.

## Decisions

- Persist nested semantic nodes with stable IDs and ordered `children`.
  - Rationale: it avoids duplicated topology and matches the current Phase 1 spec.
  - Alternative rejected: flat `nodes` plus `childIds`, because it duplicates topology and was only useful for runtime editing.
- Persist browser-computed layout as a required top-level `layout`.
  - Rationale: Phase 1 export must reproduce what the browser showed without requiring a fresh layout solve.
- Keep `displayText` out of the document.
  - Rationale: display clipping and label transforms are render/view concerns.

## Risks / Trade-offs

- Existing exploratory fixtures may use older flat shapes -> update or replace them.
- Runtime code may need conversion helpers -> keep helpers internal and tested, not part of the persisted schema.
