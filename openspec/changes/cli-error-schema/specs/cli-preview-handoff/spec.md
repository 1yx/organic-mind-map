## MODIFIED Requirements

### Requirement: Preview handoff command
The system SHALL provide an `omm preview <input>` CLI command that reads OrganicTree JSON and hands validated OrganicTree to the local preview server module, with optional `--json` machine-readable result output.

#### Scenario: Valid file input
- **WHEN** a user runs `omm preview input.json` with a readable JSON file
- **THEN** the CLI parses the file and continues to OrganicTree validation

#### Scenario: Missing input path
- **WHEN** a user runs `omm preview` without an input path
- **THEN** the CLI exits non-zero with a concise usage error in human mode

#### Scenario: JSON mode is requested
- **WHEN** a user or Agent workflow runs `omm preview --json input.json`
- **THEN** expected command outcomes are emitted as a single-line JSON result envelope to stdout

### Requirement: Stdin input support
The system SHALL allow the preview command to read structured OrganicTree JSON from stdin when configured by the command shape.

#### Scenario: Valid stdin input
- **WHEN** a user pipes valid JSON into the CLI using the supported stdin form
- **THEN** the CLI parses stdin and continues to OrganicTree validation

#### Scenario: Invalid stdin JSON
- **WHEN** stdin contains malformed JSON
- **THEN** the CLI exits with parse error code `1`; in JSON mode it emits an `ok: false` result with `structuredContent.kind: "json-parse"` and `agentAction: "fix-json-syntax"`

### Requirement: OrganicTree validation
The system SHALL validate the input against the `organic-tree-contract` before calling the local preview server module.

#### Scenario: Valid OrganicTree
- **WHEN** the parsed input satisfies the OrganicTree contract
- **THEN** the CLI proceeds to capacity checks

#### Scenario: Invalid OrganicTree
- **WHEN** the parsed input violates the OrganicTree contract
- **THEN** the CLI exits with code `1`; in JSON mode it emits an `ok: false` result with path-specific `findings` and `agentAction: "regenerate-organic-tree"`

### Requirement: Defensive capacity checks
The system SHALL reject inputs that exceed MVP capacity limits before handing data to the browser preview.

#### Scenario: Input is within capacity
- **WHEN** total nodes, depth, siblings, main branches, and concept width stay within configured limits
- **THEN** the CLI proceeds to hand off the validated OrganicTree directly

#### Scenario: Input exceeds capacity
- **WHEN** any configured MVP capacity limit is exceeded
- **THEN** the CLI exits with code `2`; in JSON mode it emits an `ok: false` result with `structuredContent.kind: "capacity"` and `agentAction: "regenerate-organic-tree"`

### Requirement: Local preview server handoff
The system SHALL call the local preview server module after successful validation and capacity checks, while the server module owns HTTP startup details.

#### Scenario: Preview handoff succeeds
- **WHEN** the local preview server module accepts the validated OrganicTree
- **THEN** the CLI delegates HTTP listener setup, `/api/document`, port handling, and URL output to that module

#### Scenario: Preview handoff fails
- **WHEN** the local preview server module reports a handoff failure
- **THEN** the CLI exits with code `3`; in JSON mode it emits an `ok: false` result with `structuredContent.kind: "server-startup"` and `agentAction: "retry-later-or-change-port"`

## ADDED Requirements

### Requirement: Machine-readable preview result
The preview command SHALL support `--json` mode that emits a stable single-line JSON result envelope for expected outcomes.

#### Scenario: JSON success output
- **WHEN** `omm preview --json input.json` starts the preview server successfully
- **THEN** stdout contains exactly one single-line JSON result with `schema: "omm.cli.result"`, `version: 1`, `command: "preview"`, `ok: true`, `exitCode: 0`, `agentAction: "open-preview"`, `content`, `structuredContent.ready.pid`, and `structuredContent.ready.url`

#### Scenario: JSON error output
- **WHEN** `omm preview --json input.json` encounters an expected blocking error
- **THEN** stdout contains exactly one single-line JSON result with `ok: false`, a non-zero `exitCode`, `content`, `structuredContent.kind`, and at least one `findings` item

#### Scenario: JSON mode stderr
- **WHEN** `omm preview --json input.json` encounters an expected command outcome
- **THEN** stderr is empty; stderr is reserved for uncaught exceptions or program-level crashes

#### Scenario: Human mode remains unchanged
- **WHEN** `omm preview input.json` runs without `--json`
- **THEN** the CLI uses human-readable stdout/stderr output and preserves the ready marker on success

### Requirement: CLI finding schema
The JSON result envelope SHALL represent validation, quality, capacity, usage, parse, and startup issues as structured findings.

#### Scenario: Finding shape
- **WHEN** a JSON result includes a finding
- **THEN** the finding includes `severity`, `code`, `path`, `message`, and optional `repair`, `limit`, and `actual` fields

#### Scenario: Error severity blocks preview
- **WHEN** any finding has `severity: "error"` before server startup
- **THEN** the result has `ok: false` and the CLI exits non-zero

#### Scenario: Warning severity allows preview
- **WHEN** findings only have `severity: "warning"`
- **THEN** the preview may continue, the result has `ok: true`, and the CLI exits with code `0`

#### Scenario: JSON Pointer paths
- **WHEN** a finding points to an OrganicTree field
- **THEN** `path` uses JSON Pointer format such as `/center/concept` or `/branches/0/children/1/concept`

#### Scenario: Repair guidance avoids semantic rewrite
- **WHEN** a finding includes `repair`
- **THEN** it provides constraint-oriented `strategy` and `instruction` values without proposing a concrete rewritten concept

### Requirement: Agent action values
The JSON result envelope SHALL include an `agentAction` enum that tells Agent CLIs the recommended next step.

#### Scenario: Command usage failure
- **WHEN** CLI arguments are invalid or required input is missing
- **THEN** JSON mode uses `agentAction: "fix-command"`

#### Scenario: JSON syntax failure
- **WHEN** input JSON cannot be parsed
- **THEN** JSON mode uses `agentAction: "fix-json-syntax"`

#### Scenario: OrganicTree regeneration needed
- **WHEN** contract, quality, or capacity findings block preview
- **THEN** JSON mode uses `agentAction: "regenerate-organic-tree"`

#### Scenario: Server startup failure
- **WHEN** local preview server startup fails
- **THEN** JSON mode uses `agentAction: "retry-later-or-change-port"`

#### Scenario: Preview starts
- **WHEN** local preview server startup succeeds
- **THEN** JSON mode uses `agentAction: "open-preview"`
