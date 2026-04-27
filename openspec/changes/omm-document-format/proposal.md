# omm-document-format

## Summary

Define the minimal `.omm` document format that the browser can export after Phase 1 read-only layout and rendering.

## Why

The MVP needs a stable document boundary for saving the browser-computed result. CLI validates agent data and starts preview; the browser performs text measurement and layout, then can download/export a `.omm`. The `.omm` must represent one A3/A4 horizontal paper, a center visual, ordered semantic nodes, browser-computed layout coordinates, colors, built-in asset references, and metadata while remaining independent from Plus service state.

## What Changes

* Define the Phase 1 `.omm` schema.
* Include:
  * document id, version, title, paper spec, organic seed
  * center visual with compliance state
  * ordered nested tree nodes
  * node concept text
  * browser-computed layout snapshot with coordinates and SVG paths
  * branch color/style references
  * built-in asset references by ID
  * simple external references if present
* Exclude:
  * Plus service metadata
  * source file snapshots
  * source object mappings
  * product-internal submap state
  * visual editor state
  * uploaded image or Base64 asset data in Phase 1
  * render-side `displayText` strings
* Add schema validation utilities.

## Non-goals

* No visual editing state.
* No user-uploaded images or Base64 image embedding in Phase 1.
* No submap down-drill, breadcrumbs, color inheritance across files, or reference protection.
* No cloud sync metadata.
* No source import traceability.

## Acceptance Criteria

* A valid `.omm` can be exported by the browser from a validated structured list and computed layout.
* A valid `.omm` can be loaded by the renderer without external service dependencies.
* Required center visuals in Phase 1 resolve through built-in template IDs.
* Built-in templates are referenced by stable IDs instead of duplicated as Base64 payloads.
* The persisted tree uses one-way nested `children` arrays, not redundant `parentId` / `childIds` pointers.
* The persisted layout snapshot contains enough browser-computed geometry to reproduce the exported paper.
* Invalid documents fail validation with actionable local errors.

## Dependencies

* `project-scaffold`
* `agent-list-contract`
