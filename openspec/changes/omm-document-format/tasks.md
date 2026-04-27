# omm-document-format Tasks

## 1. Document Types

- [x] 1.1 Define `OmmDocument`, `PaperSpec`, `MindMap`, `MindNode`, `CenterVisual`, `AssetManifest`, `LayoutSnapshot`, and metadata types in the core package.
- [x] 1.2 Define stable ID aliases and reference types for nodes, assets, branch styles, BOI tags, layout records, and external file references.
- [x] 1.3 Model semantic nodes as a one-way nested tree with `children?: MindNode[]`.
- [x] 1.4 Export the `.omm` document model from the core public entrypoint.

## 2. Paper And Document Envelope

- [x] 2.1 Implement validation for required document envelope fields: `id`, `version`, `title`, `paper`, `organicSeed`, `rootMap`, `layout`, `assets`, and `meta`.
- [x] 2.2 Implement A3 landscape and A4 landscape paper validation with canonical millimeter dimensions.
- [x] 2.3 Reject attempts to store multiple maps or map collections in a single `.omm` document.

## 3. Nested Tree Validation

- [x] 3.1 Validate that `rootMap.children` is the source of truth for semantic node hierarchy.
- [x] 3.2 Validate that node IDs are unique across the full nested tree.
- [x] 3.3 Preserve stable sibling order from `children` arrays.
- [x] 3.4 Validate that every node has a non-empty renderable `concept`.
- [x] 3.5 Reject persisted runtime topology fields such as `parentId`, `childIds`, or a source-of-truth flat `nodes` dictionary.

## 4. Layout Snapshot Validation

- [x] 4.1 Define layout snapshot records for viewport, center layout, node layout, and branch layout.
- [x] 4.2 Validate that browser-exported `.omm` documents include a layout snapshot.
- [x] 4.3 Validate that every layout node and branch reference points to an existing semantic node ID.
- [x] 4.4 Validate required layout geometry fields such as boxes, points, branch paths, text paths, and taper widths.
- [x] 4.5 Keep layout geometry separate from semantic node content so layout can be regenerated later.

## 5. Center Visual And Assets

- [x] 5.1 Validate that every document has a center visual object rather than plain center text.
- [x] 5.2 Validate center visual modes, minimum color count, compliance state, and referenced built-in assets.
- [x] 5.3 Implement built-in asset validation using stable built-in IDs without embedded payload duplication.
- [x] 5.4 Reject uploaded, generated, or Base64-embedded image assets in Phase 1 `.omm`.
- [x] 5.5 Validate that every asset reference from the center or nodes resolves to a known built-in asset.

## 6. Excluded State Guards

- [x] 6.1 Reject or strip editor interaction state such as selection, drag sessions, and undo stacks before saving Phase 1 `.omm`.
- [x] 6.2 Reject or strip render artifacts such as `displayText`, ellipsis strings, and text truncation strings.
- [x] 6.3 Reject or strip Plus service state such as cloud permissions, RAG indexes, and version history metadata.
- [x] 6.4 Reject or strip source snapshots, source object mappings, and product-internal submap navigation state.
- [x] 6.5 Preserve simple optional external references without adding reference protection or automatic repair behavior.

## 7. Fixtures

- [x] 7.1 Add a valid minimal A3 landscape `.omm` fixture with nested semantic nodes and layout snapshot.
- [x] 7.2 Add a valid A4 landscape `.omm` fixture with a built-in center visual asset reference.
- [x] 7.3 Add invalid fixtures for unsupported paper kind, missing center visual, duplicate node IDs, stale `parentId` / `childIds`, missing layout, and missing asset references.
- [x] 7.4 Add invalid fixtures for `displayText` and uploaded/Base64 image assets.

## 8. Tests

- [x] 8.1 Test that valid `.omm` fixtures pass schema validation.
- [x] 8.2 Test that unsupported paper kinds and wrong dimensions fail with path-specific errors.
- [x] 8.3 Test that duplicate node IDs and persisted runtime topology fields fail validation.
- [x] 8.4 Test that missing or inconsistent layout snapshot references fail validation.
- [x] 8.5 Test that built-in assets require known IDs and do not require embedded data.
- [x] 8.6 Test that uploaded custom assets, generated payloads, and Base64 data fail validation in Phase 1.
- [x] 8.7 Test that excluded editor, render artifact, Plus, source snapshot, and submap state is rejected or stripped.

## 9. Documentation

- [x] 9.1 Document the Phase 1 `.omm` JSON schema and one-file-one-map boundary.
- [x] 9.2 Document nested semantic tree storage versus runtime-derived flat indexes and parent references.
- [x] 9.3 Document the browser-computed layout snapshot and how it references semantic nodes.
- [x] 9.4 Document built-in asset ID storage and the Phase 1 exclusion of uploaded/Base64 image assets.
- [x] 9.5 Document non-stored state categories and why they stay outside `.omm`.
