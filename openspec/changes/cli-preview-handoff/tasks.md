# cli-preview-handoff Tasks

## 1. CLI Command Shape

- [ ] 1.1 Add the `omm preview <input>` command entrypoint in the CLI package.
- [ ] 1.2 Support reading input from a JSON file path.
- [ ] 1.3 Support the agreed stdin form for piping JSON into the preview command.
- [ ] 1.4 Add `--paper` and `--port` option parsing.
- [ ] 1.5 Return a non-zero usage error when required input is missing or options are invalid.

## 2. Input Parsing And Validation

- [ ] 2.1 Parse JSON input and report malformed JSON with exit code `1`.
- [ ] 2.2 Call the `organic-tree-contract` validator before any preview handoff.
- [ ] 2.3 Surface path-specific structural and concept validation errors with exit code `1`.
- [ ] 2.4 Preserve semantic concepts and hints without silently rewriting user meaning.

## 3. Capacity Checks

- [ ] 3.1 Apply MVP capacity thresholds for total nodes, depth, siblings, main branches, and concept width.
- [ ] 3.2 Return exit code `2` when any capacity threshold is exceeded.
- [ ] 3.3 Format capacity errors as regeneration-oriented feedback for Gemini CLI / Codex CLI / Claude Code.

## 4. PreviewPayload Handoff

- [ ] 4.1 Define the `PreviewPayload` type used by the CLI-backed local preview API.
- [ ] 4.2 Populate `PreviewPayload` with validated OrganicTree data and minimal preview metadata.
- [ ] 4.3 Resolve paper selection from CLI flags, input contract, or default `a3-landscape`.
- [ ] 4.4 Ensure `PreviewPayload` is not typed or validated as `OmmDocument`.
- [ ] 4.5 Ensure the CLI does not assign node IDs, organic seeds, colors, center visual IDs, or branch styles.

## 5. Local Preview Server Handoff

- [ ] 5.1 Call the `06-local-preview-server` module with the validated `PreviewPayload`.
- [ ] 5.2 Treat HTTP listener creation, route mounting, port conflict handling, and URL printing as responsibilities of `06-local-preview-server`.
- [ ] 5.3 Return exit code `3` only when the local preview server module reports a handoff failure.
- [ ] 5.4 Ensure the CLI does not compute DOM-dependent layout coordinates, `.omm` layout snapshots, or PNG export.

## 6. Fixtures

- [ ] 6.1 Add a valid OrganicTree fixture that can be handed off as `PreviewPayload`.
- [ ] 6.2 Add an invalid JSON fixture or test input.
- [ ] 6.3 Add invalid contract fixtures for missing fields and malformed hierarchy.
- [ ] 6.4 Add an oversized fixture that triggers capacity retry feedback.
- [ ] 6.5 Add a fixture proving the CLI handoff contains no generated IDs, colors, organic seed, or fallback center visual IDs.

## 7. Tests

- [ ] 7.1 Test `omm preview <input>` succeeds for a valid fixture and starts preview handoff.
- [ ] 7.2 Test missing input and unsupported options return usage errors.
- [ ] 7.3 Test malformed JSON exits with code `1`.
- [ ] 7.4 Test invalid OrganicTree input exits with code `1` and path-specific errors.
- [ ] 7.5 Test oversized input exits with code `2` and retry-friendly feedback.
- [ ] 7.6 Test the CLI passes `PreviewPayload` to the local preview server module, not a partial `OmmDocument`.
- [ ] 7.7 Test preview server handoff failures exit with code `3`.
- [ ] 7.8 Test that CLI ID generation, color assignment, center visual selection, PNG export, and final browser layout generation are not implemented in this command.

## 8. Documentation

- [ ] 8.1 Document `omm preview <input>` usage and supported flags.
- [ ] 8.2 Document `PreviewPayload` as the CLI-to-browser handoff type.
- [ ] 8.3 Document exit codes and error message shapes.
- [ ] 8.4 Document Agent CLI retry behavior for capacity failures.
- [ ] 8.5 Document that IDs, colors, organic seed derivation, center visual fallback, final `.omm` layout snapshots, and PNG export happen in the browser, not the CLI.
- [ ] 8.6 Document that HTTP listener setup, `/api/document`, port handling, and URL printing belong to `06-local-preview-server`.
