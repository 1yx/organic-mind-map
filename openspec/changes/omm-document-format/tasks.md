# omm-document-format Tasks

## 1. Document Types

- [ ] 1.1 Define `OmmDocument`, `PaperSpec`, `MindMap`, `MindNode`, `CenterVisual`, `AssetManifest`, `LayoutSnapshot`, and metadata types in the core package.
- [ ] 1.2 Define stable ID aliases and reference types for nodes, assets, branch styles, BOI tags, layout records, and external file references.
- [ ] 1.3 Model semantic nodes as a one-way nested tree with `children?: MindNode[]`.
- [ ] 1.4 Export the `.omm` document model from the core public entrypoint.

## 2. Paper And Document Envelope

- [ ] 2.1 Implement validation for required document envelope fields: `id`, `version`, `title`, `paper`, `organicSeed`, `rootMap`, `layout`, `assets`, and `meta`.
- [ ] 2.2 Implement A3 landscape and A4 landscape paper validation with canonical millimeter dimensions.
- [ ] 2.3 Reject attempts to store multiple maps or map collections in a single `.omm` document.

## 3. Nested Tree Validation

- [ ] 3.1 Validate that `rootMap.children` is the source of truth for semantic node hierarchy.
- [ ] 3.2 Validate that node IDs are unique across the full nested tree.
- [ ] 3.3 Preserve stable sibling order from `children` arrays.
- [ ] 3.4 Validate that every node has a non-empty renderable `concept`.
- [ ] 3.5 Reject persisted runtime topology fields such as `parentId`, `childIds`, or a source-of-truth flat `nodes` dictionary.

## 4. Layout Snapshot Validation

- [ ] 4.1 Define layout snapshot records for viewport, center layout, node layout, and branch layout.
- [ ] 4.2 Validate that browser-exported `.omm` documents include a layout snapshot.
- [ ] 4.3 Validate that every layout node and branch reference points to an existing semantic node ID.
- [ ] 4.4 Validate required layout geometry fields such as boxes, points, branch paths, text paths, and taper widths.
- [ ] 4.5 Keep layout geometry separate from semantic node content so layout can be regenerated later.

## 5. Center Visual And Assets

- [ ] 5.1 Validate that every document has a center visual object rather than plain center text.
- [ ] 5.2 Validate center visual modes, minimum color count, compliance state, and referenced built-in assets.
- [ ] 5.3 Implement built-in asset validation using stable built-in IDs without embedded payload duplication.
- [ ] 5.4 Reject uploaded, generated, or Base64-embedded image assets in Phase 1 `.omm`.
- [ ] 5.5 Validate that every asset reference from the center or nodes resolves to a known built-in asset.

## 6. Excluded State Guards

- [ ] 6.1 Reject or strip editor interaction state such as selection, drag sessions, and undo stacks before saving Phase 1 `.omm`.
- [ ] 6.2 Reject or strip render artifacts such as `displayText`, ellipsis strings, and text truncation strings.
- [ ] 6.3 Reject or strip Plus service state such as cloud permissions, RAG indexes, and version history metadata.
- [ ] 6.4 Reject or strip source snapshots, source object mappings, and product-internal submap navigation state.
- [ ] 6.5 Preserve simple optional external references without adding reference protection or automatic repair behavior.

## 7. Fixtures

- [ ] 7.1 Add a valid minimal A3 landscape `.omm` fixture with nested semantic nodes and layout snapshot.
- [ ] 7.2 Add a valid A4 landscape `.omm` fixture with a built-in center visual asset reference.
- [ ] 7.3 Add invalid fixtures for unsupported paper kind, missing center visual, duplicate node IDs, stale `parentId` / `childIds`, missing layout, and missing asset references.
- [ ] 7.4 Add invalid fixtures for `displayText` and uploaded/Base64 image assets.

## 8. Tests

- [ ] 8.1 Test that valid `.omm` fixtures pass schema validation.
- [ ] 8.2 Test that unsupported paper kinds and wrong dimensions fail with path-specific errors.
- [ ] 8.3 Test that duplicate node IDs and persisted runtime topology fields fail validation.
- [ ] 8.4 Test that missing or inconsistent layout snapshot references fail validation.
- [ ] 8.5 Test that built-in assets require known IDs and do not require embedded data.
- [ ] 8.6 Test that uploaded custom assets, generated payloads, and Base64 data fail validation in Phase 1.
- [ ] 8.7 Test that excluded editor, render artifact, Plus, source snapshot, and submap state is rejected or stripped.

## 9. Documentation

- [ ] 9.1 Document the Phase 1 `.omm` JSON schema and one-file-one-map boundary.
- [ ] 9.2 Document nested semantic tree storage versus runtime-derived flat indexes and parent references.
- [ ] 9.3 Document the browser-computed layout snapshot and how it references semantic nodes.
- [ ] 9.4 Document built-in asset ID storage and the Phase 1 exclusion of uploaded/Base64 image assets.
- [ ] 9.5 Document non-stored state categories and why they stay outside `.omm`.
