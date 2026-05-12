# cli-error-schema

## Why

Agent CLIs need a stable machine-readable result from `omm preview` so validation failures, capacity failures, server startup failures, warnings, and successful preview readiness can be handled as structured feedback rather than brittle terminal text.

## What Changes

* Add `omm preview --json` machine mode.
* In machine mode, emit one single-line JSON result envelope to stdout for expected outcomes, including blocking errors.
* Keep human mode as the default with existing human-readable stdout/stderr behavior and ready marker.
* Model expected failures as structured results with `ok: false`, non-zero exit code, `content`, `structuredContent`, `agentAction`, and `findings`.
* Add `severity: "error" | "warning"` to findings so soft warnings can continue preview.
* Use `content` plus `structuredContent` dual-channel output inspired by MCP tool responses.
* Include successful preview readiness in `structuredContent.ready` instead of printing `[OMM_SERVER_READY]` in JSON mode.
* Keep stderr empty for expected JSON-mode outcomes; reserve stderr for uncaught/program failures.

## Capabilities

### Modified Capabilities

* `cli-preview-handoff`: Define the JSON result envelope, finding schema, JSON mode output channels, severity handling, and Agent action values.
* `organic-tree-contract`: Clarify that contract, quality, and capacity validation findings can be mapped into CLI structured findings without adding semantic rewrite suggestions.

## Impact

* Agent skill instructions should use `omm preview --json` when they need machine-readable retry feedback.
* CLI tests need both human mode coverage and JSON mode contract coverage.
* Existing exit codes remain meaningful: `0` success or warning-only preview, `1` parse/usage/contract/quality errors, `2` capacity errors, `3` server startup errors.
