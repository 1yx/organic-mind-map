# mvp-fixtures-validation

## Summary

Add MVP fixtures, validation coverage, and smoke checks for the full long-text-to-PNG workflow.

## Why

The Phase 1 MVP is a pipeline. It needs end-to-end confidence that an Agent CLI + skill can produce a structured OrganicTree, the project CLI can validate it, the browser can turn it into `.omm`, and the Web preview can export PNG without requiring a visual editor.

## What Changes

* Add representative fixtures:
  * short single-topic map
  * deeper hierarchy map
  * Chinese concept-unit map
  * English concept-phrase map
  * center visual template case
  * unreachable SVG URL case (browser fallback resilience)
* Add validation checks for OrganicTree contract, capacity thresholds, preview payloads, and `.omm` schema.
* Add smoke tests or scripts that exercise:
  * Agent CLI / skill fixture -> OrganicTree contract
  * OrganicTree fixture -> CLI validation / preview payload
  * preview payload -> browser SVG preview render
  * browser preview -> `.omm` download/export
  * preview render -> PNG export
* Document the MVP command sequence.

## Non-goals

* No exhaustive visual regression suite.
* No editing behavior tests.
* No cloud or Plus service tests.

## Acceptance Criteria

* A documented local command sequence can preview a fixture and produce PNG from the browser.
* Invalid fixtures fail before rendering.
* Oversized fixtures fail with regeneration-oriented errors suitable for Gemini CLI / Codex CLI / Claude Code retry loops.
* At least one Chinese and one English fixture render successfully.
* The workflow proves that Phase 1 can be used without `.omm` visual editing.
* Unreachable SVG URL fixture proves browser fallback to built-in template works without crash.

## Dependencies

* `cli-preview-handoff`
* `readonly-svg-renderer`
* `local-preview-server`
* `png-export`
