## 1. Result Types And Formatting

- [x] 1.1 Define CLI JSON result envelope types in `@omm/cli`.
- [x] 1.2 Define finding severity as `"error" | "warning"`.
- [x] 1.3 Define finding fields: `severity`, `code`, `path`, `message`, optional `repair`, `limit`, and `actual`.
- [x] 1.4 Define `agentAction` enum values: `open-preview`, `fix-command`, `fix-json-syntax`, `regenerate-organic-tree`, `retry-later-or-change-port`, and `none`.
- [x] 1.5 Add JSON Pointer path conversion for existing validation and capacity paths.

## 2. CLI JSON Mode

- [x] 2.1 Add `--json` parsing to `omm preview`.
- [x] 2.2 In JSON mode, emit expected command results as exactly one single-line JSON object to stdout.
- [x] 2.3 In JSON mode, keep stderr empty for expected usage, file-read, parse, contract, quality, capacity, and server-startup outcomes.
- [x] 2.4 In human mode, preserve existing human-readable output and success ready marker behavior.

## 3. Error Mapping

- [x] 3.1 Map usage and missing input errors to `structuredContent.kind: "usage"` and `agentAction: "fix-command"`.
- [x] 3.2 Map file read errors to `structuredContent.kind: "file-read"` and `agentAction: "fix-command"`.
- [x] 3.3 Map malformed JSON to `structuredContent.kind: "json-parse"` and `agentAction: "fix-json-syntax"`.
- [x] 3.4 Map structural validation errors to `structuredContent.kind: "contract"` and `agentAction: "regenerate-organic-tree"`.
- [x] 3.5 Map quality validation errors to `structuredContent.kind: "quality"` and `agentAction: "regenerate-organic-tree"`.
- [x] 3.6 Map capacity errors to `structuredContent.kind: "capacity"`, exit code `2`, and `agentAction: "regenerate-organic-tree"`.
- [x] 3.7 Map preview server startup failures to `structuredContent.kind: "server-startup"`, exit code `3`, and `agentAction: "retry-later-or-change-port"`.

## 4. Success And Warning Results

- [x] 4.1 On successful server startup in JSON mode, output `ok: true`, exit code `0`, `agentAction: "open-preview"`, and `structuredContent.ready` with PID and URL.
- [x] 4.2 Support warning findings that do not block preview, returning `ok: true` and exit code `0`.
- [x] 4.3 Avoid adding broad new warning heuristics beyond minimal schema support unless needed by existing validation.

## 5. Repair Guidance

- [x] 5.1 Ensure repair guidance is constraint-oriented and does not propose concrete semantic replacements.
- [x] 5.2 Include limits and actual values for capacity and width-related findings where available.
- [x] 5.3 Keep `content` human-readable but non-authoritative; keep `structuredContent` as the stable machine contract.

## 6. Agent Skill And Docs

- [x] 6.1 Update root `SKILL.md` or planned skill docs to instruct Agent workflows to call `omm preview --json`.
- [x] 6.2 Document stdout/stderr behavior for JSON mode and human mode.
- [x] 6.3 Document the JSON result envelope and finding schema in CLI docs.

## 7. Tests

- [x] 7.1 Add JSON mode success test proving stdout contains one parseable result with `ready.pid` and `ready.url`.
- [x] 7.2 Add JSON mode usage, malformed JSON, contract, quality, capacity, and server-startup tests.
- [x] 7.3 Add tests proving expected JSON mode outcomes do not write stderr.
- [x] 7.4 Add warning-only JSON result test.
- [x] 7.5 Add JSON Pointer path conversion tests for nested branch paths.
- [x] 7.6 Preserve representative human mode output tests.

## 8. Verification

- [x] 8.1 Run typecheck.
- [x] 8.2 Run core OrganicTree validation tests.
- [x] 8.3 Run CLI preview tests.
- [x] 8.4 Run `openspec status --change cli-error-schema --json` and confirm artifacts are complete.
