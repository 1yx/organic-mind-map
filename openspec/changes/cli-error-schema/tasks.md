## 1. Result Types And Formatting

- [ ] 1.1 Define CLI JSON result envelope types in `@omm/cli`.
- [ ] 1.2 Define finding severity as `"error" | "warning"`.
- [ ] 1.3 Define finding fields: `severity`, `code`, `path`, `message`, optional `repair`, `limit`, and `actual`.
- [ ] 1.4 Define `agentAction` enum values: `open-preview`, `fix-command`, `fix-json-syntax`, `regenerate-organic-tree`, `retry-later-or-change-port`, and `none`.
- [ ] 1.5 Add JSON Pointer path conversion for existing validation and capacity paths.

## 2. CLI JSON Mode

- [ ] 2.1 Add `--json` parsing to `omm preview`.
- [ ] 2.2 In JSON mode, emit expected command results as exactly one single-line JSON object to stdout.
- [ ] 2.3 In JSON mode, keep stderr empty for expected usage, file-read, parse, contract, quality, capacity, and server-startup outcomes.
- [ ] 2.4 In human mode, preserve existing human-readable output and success ready marker behavior.

## 3. Error Mapping

- [ ] 3.1 Map usage and missing input errors to `structuredContent.kind: "usage"` and `agentAction: "fix-command"`.
- [ ] 3.2 Map file read errors to `structuredContent.kind: "file-read"` and `agentAction: "fix-command"`.
- [ ] 3.3 Map malformed JSON to `structuredContent.kind: "json-parse"` and `agentAction: "fix-json-syntax"`.
- [ ] 3.4 Map structural validation errors to `structuredContent.kind: "contract"` and `agentAction: "regenerate-organic-tree"`.
- [ ] 3.5 Map quality validation errors to `structuredContent.kind: "quality"` and `agentAction: "regenerate-organic-tree"`.
- [ ] 3.6 Map capacity errors to `structuredContent.kind: "capacity"`, exit code `2`, and `agentAction: "regenerate-organic-tree"`.
- [ ] 3.7 Map preview server startup failures to `structuredContent.kind: "server-startup"`, exit code `3`, and `agentAction: "retry-later-or-change-port"`.

## 4. Success And Warning Results

- [ ] 4.1 On successful server startup in JSON mode, output `ok: true`, exit code `0`, `agentAction: "open-preview"`, and `structuredContent.ready` with PID and URL.
- [ ] 4.2 Support warning findings that do not block preview, returning `ok: true` and exit code `0`.
- [ ] 4.3 Avoid adding broad new warning heuristics beyond minimal schema support unless needed by existing validation.

## 5. Repair Guidance

- [ ] 5.1 Ensure repair guidance is constraint-oriented and does not propose concrete semantic replacements.
- [ ] 5.2 Include limits and actual values for capacity and width-related findings where available.
- [ ] 5.3 Keep `content` human-readable but non-authoritative; keep `structuredContent` as the stable machine contract.

## 6. Agent Skill And Docs

- [ ] 6.1 Update root `SKILL.md` or planned skill docs to instruct Agent workflows to call `omm preview --json`.
- [ ] 6.2 Document stdout/stderr behavior for JSON mode and human mode.
- [ ] 6.3 Document the JSON result envelope and finding schema in CLI docs.

## 7. Tests

- [ ] 7.1 Add JSON mode success test proving stdout contains one parseable result with `ready.pid` and `ready.url`.
- [ ] 7.2 Add JSON mode usage, malformed JSON, contract, quality, capacity, and server-startup tests.
- [ ] 7.3 Add tests proving expected JSON mode outcomes do not write stderr.
- [ ] 7.4 Add warning-only JSON result test.
- [ ] 7.5 Add JSON Pointer path conversion tests for nested branch paths.
- [ ] 7.6 Preserve representative human mode output tests.

## 8. Verification

- [ ] 8.1 Run typecheck.
- [ ] 8.2 Run core OrganicTree validation tests.
- [ ] 8.3 Run CLI preview tests.
- [ ] 8.4 Run `openspec status --change cli-error-schema --json` and confirm artifacts are complete.
