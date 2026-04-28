# 05-readonly-svg-renderer

## Summary

Implement the browser-side read-only SVG renderer and layout engine for Phase 1 preview data.

## Why

The core MVP value is seeing an Organic Mind Map style output from agent-generated data. Browser-side rendering owns real text measurement, layout solving, and the visual baseline before any editing features are added.

## What Changes

* Render one preview payload or `.omm` as an A3/A4 horizontal SVG scene.
* Include:
  * paper background and boundary
  * center visual from sanitized inline SVG or deterministic built-in template fallback
  * ordered main branches with distinct colors
  * tapered organic branch shapes
  * path text for concept units
  * basic child branch layout
  * stable organic variation from browser-derived `organicSeed`
* Use read-only layout; no drag/drop or editable text.
* Apply visible text clipping when concept text exceeds available branch length.
* Use browser DOM/SVG text measurement for layout.
* Provide the computed layout needed for final `.omm` download/export.

## Non-goals

* No visual editor.
* No interactive node manipulation.
* No relationship link authoring UI.
* No advanced global layout optimization beyond MVP readability.

## Acceptance Criteria

* A valid preview payload or `.omm` fixture renders as non-empty SVG.
* Main branches are visibly color-distinct.
* Branches are curved, tapered, and not boxed nodes.
* Text appears along branch paths.
* Rendering is deterministic for the same `.omm`.
* Rendering a `PreviewPayload` is deterministic across refreshes for the same OrganicTree content.
* The renderer can report hard layout/capacity failure internally without adding complex user-facing warning UI.

## Dependencies

* `omm-document-format`
* `cli-preview-handoff`
