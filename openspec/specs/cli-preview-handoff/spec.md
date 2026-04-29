## ADDED Requirements

### Requirement: Preview handoff command
The system SHALL provide an `omm preview <input>` CLI command that reads OrganicTree JSON and hands validated OrganicTree to the local preview server module.

#### Scenario: Valid file input
- **WHEN** a user runs `omm preview input.json` with a readable JSON file
- **THEN** the CLI parses the file and continues to OrganicTree validation

#### Scenario: Missing input path
- **WHEN** a user runs `omm preview` without an input path
- **THEN** the CLI exits non-zero with a concise usage error

### Requirement: Stdin input support
The system SHALL allow the preview command to read structured OrganicTree JSON from stdin when configured by the command shape.

#### Scenario: Valid stdin input
- **WHEN** a user pipes valid JSON into the CLI using the supported stdin form
- **THEN** the CLI parses stdin and continues to OrganicTree validation

#### Scenario: Invalid stdin JSON
- **WHEN** stdin contains malformed JSON
- **THEN** the CLI exits with parse error code `1` and a path-independent parse message

### Requirement: OrganicTree validation
The system SHALL validate the input against the `organic-tree-contract` before calling the local preview server module.

#### Scenario: Valid OrganicTree
- **WHEN** the parsed input satisfies the OrganicTree contract
- **THEN** the CLI proceeds to capacity checks

#### Scenario: Invalid OrganicTree
- **WHEN** the parsed input violates the OrganicTree contract
- **THEN** the CLI exits with code `1` and includes path-specific validation errors

### Requirement: Defensive capacity checks
The system SHALL reject inputs that exceed MVP capacity limits before handing data to the browser preview.

#### Scenario: Input is within capacity
- **WHEN** total nodes, depth, siblings, main branches, and concept width stay within configured limits
- **THEN** the CLI proceeds to hand off the validated OrganicTree directly

#### Scenario: Input exceeds capacity
- **WHEN** any configured MVP capacity limit is exceeded
- **THEN** the CLI exits with code `2` and returns regeneration-oriented feedback for the calling Agent CLI

### Requirement: OrganicTree direct handoff
The system SHALL expose the validated `OrganicTree` to the browser preview flow instead of a `PreviewPayload` or partial `OmmDocument`.

#### Scenario: OrganicTree is handed off
- **WHEN** input passes OrganicTree validation and capacity checks
- **THEN** the CLI exposes the validated OrganicTree directly to the local Web preview via `/api/document`

#### Scenario: Partial OmmDocument attempted
- **WHEN** the CLI attempts to expose an object typed or shaped as `OmmDocument` without browser-computed layout
- **THEN** the handoff is invalid because only the browser creates valid `OmmDocument` exports

### Requirement: No domain assembly in CLI
The system SHALL NOT assign node IDs, organic seeds, colors, center visual fallbacks, branch styles, final layout coordinates, `.omm` layout snapshots, PNG export, network image fetching, or svgUrl allowlist filtering inside the CLI.

#### Scenario: Valid OrganicTree handoff
- **WHEN** the CLI successfully validates and capacity-checks input
- **THEN** it hands off the raw OrganicTree without generated node IDs, branch colors, organic seed, fallback center visual IDs, final layout coordinates, fetched image content, or allowlist-filtered URLs

#### Scenario: PNG export requested from CLI
- **WHEN** a user requests one-shot PNG export from the CLI
- **THEN** the CLI rejects the request because PNG export is browser-side in Phase 1

### Requirement: No paper option in CLI
The system SHALL NOT support a `--paper` CLI flag or any CLI-side paper selection.

#### Scenario: Paper is omitted from input
- **WHEN** the input OrganicTree does not contain a `paper` field
- **THEN** the CLI does not add one; the browser determines default paper proportions

#### Scenario: Unsupported paper option is passed
- **WHEN** a legacy command attempts `--paper a3-landscape`
- **THEN** the CLI rejects the option because paper proportions are browser-owned

### Requirement: Local preview server handoff
The system SHALL call the local preview server module after successful validation and capacity checks, while the server module owns HTTP startup details.

#### Scenario: Preview handoff succeeds
- **WHEN** the local preview server module accepts the validated OrganicTree
- **THEN** the CLI delegates HTTP listener setup, `/api/document`, port handling, and URL output to that module

#### Scenario: Preview handoff fails
- **WHEN** the local preview server module reports a handoff failure
- **THEN** the CLI exits with code `3` and reports an actionable startup error

### Requirement: CLI semantic preservation
The system SHALL validate only mechanical contract and capacity concerns without silently changing user meaning.

#### Scenario: Safe normalization
- **WHEN** input concepts contain leading or repeated whitespace
- **THEN** the CLI may trim or normalize whitespace without changing concept meaning

#### Scenario: Semantic rewrite would be needed
- **WHEN** a concept requires splitting, merging, removing negation, changing dates, changing numbers, or rewriting names to become valid
- **THEN** the CLI reports validation feedback instead of rewriting the concept
