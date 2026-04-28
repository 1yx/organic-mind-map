## ADDED Requirements

### Requirement: Preview handoff command
The system SHALL provide an `omm preview <input>` CLI command that reads OrganicTree JSON and hands a `PreviewPayload` to the local preview server module.

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
The system SHALL validate the input against the `organic-tree-contract` before creating any `PreviewPayload` or calling the local preview server module.

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
- **THEN** the CLI proceeds to `PreviewPayload` handoff

#### Scenario: Input exceeds capacity
- **WHEN** any configured MVP capacity limit is exceeded
- **THEN** the CLI exits with code `2` and returns regeneration-oriented feedback for the calling Agent CLI

### Requirement: PreviewPayload handoff
The system SHALL expose a `PreviewPayload` to the browser preview flow instead of a partial `OmmDocument`.

#### Scenario: PreviewPayload is produced
- **WHEN** input passes OrganicTree validation and capacity checks
- **THEN** the CLI exposes a `PreviewPayload` containing validated semantic tree data and minimal preview options

#### Scenario: Partial OmmDocument attempted
- **WHEN** the CLI attempts to expose an object typed or shaped as `OmmDocument` without browser-computed layout
- **THEN** the handoff is invalid because only the browser creates valid `OmmDocument` exports

### Requirement: Paper option handling
The system SHALL support selecting A3 landscape or A4 landscape paper as preview metadata.

#### Scenario: Paper omitted
- **WHEN** neither the input contract nor CLI flags specify paper
- **THEN** the CLI includes `a3-landscape` in the `PreviewPayload`

#### Scenario: Unsupported paper option
- **WHEN** the user passes an unsupported paper value
- **THEN** the CLI exits with code `1` and reports the invalid option

### Requirement: No domain assembly in CLI
The system SHALL NOT assign node IDs, organic seeds, colors, center visual fallbacks, branch styles, final layout coordinates, `.omm` layout snapshots, PNG export, or network image fetching inside the CLI.

#### Scenario: Valid payload handoff
- **WHEN** the CLI successfully validates and capacity-checks input
- **THEN** it hands off semantic data without generated node IDs, branch colors, organic seed, fallback center visual IDs, final layout coordinates, or fetched image content

#### Scenario: PNG export requested from CLI
- **WHEN** a user requests one-shot PNG export from the CLI
- **THEN** the CLI rejects the request because PNG export is browser-side in Phase 1

### Requirement: Local preview server handoff
The system SHALL call the local preview server module after successful validation and capacity checks, while the server module owns HTTP startup details.

#### Scenario: Preview handoff succeeds
- **WHEN** the local preview server module accepts the `PreviewPayload`
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
