## Why

The current docs and specs disagree on whether Phase 1 `.omm` files persist a runtime flat graph or a browser-exported nested document with a layout snapshot. This change finalizes the Phase 1 document model so export, validation, fixtures, and renderer reload behavior use one contract.

## What Changes

- Implement the existing Phase 1 `.omm` direction as the canonical persisted model: nested `rootMap.children`, stable node IDs, required `layout`, required `organicSeed`, and no persisted runtime topology fields.
- Reject non-canonical persisted runtime fields such as `parentId`, `childIds`, flat `nodes`, and `displayText`.
- Keep browser-computed layout snapshots as the source for reopening exported `.omm` previews.
- Do not add visual editing, undo/redo state, Plus metadata, uploaded image embedding, or multi-map documents.

## Capabilities

### New Capabilities

### Modified Capabilities
- `omm-document-format`: Finalize the Phase 1 persisted `.omm` model and validation boundary.

## Impact

- Affects `@omm/core` document types, document validation, `.omm` export construction in Web, renderer input handling for `.omm`, and `.omm` fixtures/tests.
- No new external dependencies.
