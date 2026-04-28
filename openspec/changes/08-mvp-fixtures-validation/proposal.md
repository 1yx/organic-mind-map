# 08-mvp-fixtures-validation

## Summary

Add MVP fixtures, validation coverage, and smoke checks for the full long-text-to-PNG workflow.

## Why

The Phase 1 MVP is a pipeline. It needs end-to-end confidence that an Agent CLI + skill can produce a structured list, the project CLI can validate it, the browser can turn it into `.omm`, and the Web preview can export PNG without requiring a visual editor.

## What Changes

* Add representative fixtures:
  * short single-topic map
  * deeper hierarchy map
  * Chinese concept-unit map
  * English concept-phrase map
  * center visual template case
* Add validation checks for list contract, capacity thresholds, preview payloads, and `.omm` schema.
* Add smoke tests or scripts that exercise:
  * Agent CLI / skill fixture -> agent list contract
  * list fixture -> CLI validation / preview payload
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

## Dependencies

* `cli-preview-handoff`
* `readonly-svg-renderer`
* `local-preview-server`
* `07-png-export`
