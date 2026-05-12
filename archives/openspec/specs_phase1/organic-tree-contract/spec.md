## ADDED Requirements

### Requirement: OrganicTree JSON contract
The system SHALL define a stable JSON contract named `OrganicTree` for the semantic map tree consumed by the project CLI, renderer, and Web preview pipeline.

#### Scenario: Valid minimal tree
- **WHEN** an input JSON contains `version: 1`, a non-empty `title`, a `center` object with a non-empty `concept`, and a non-empty `branches` array
- **THEN** the input is recognized as an `OrganicTree` candidate for CLI validation

#### Scenario: Unsupported contract version
- **WHEN** an input JSON contains a `version` other than `1`
- **THEN** validation fails with an error pointing to `version`

### Requirement: Center concept and visual hint
The system SHALL require the `OrganicTree` to include a center concept and SHALL allow optional center visual hints for later center visual selection.

#### Scenario: Center concept is missing
- **WHEN** an input JSON omits `center.concept` or provides an empty `center.concept`
- **THEN** validation fails with an error pointing to `center.concept`

#### Scenario: Center visual hint is provided
- **WHEN** an input JSON includes `center.visualHint`
- **THEN** validation preserves the hint for downstream rendering

#### Scenario: Center SVG URL is provided as string
- **WHEN** an input JSON includes `center.svgUrl` as a string
- **THEN** validation preserves the URL string for downstream preview handling without allowlist filtering, fetching, or rewriting

#### Scenario: Center SVG URL is non-string
- **WHEN** an input JSON includes `center.svgUrl` with a non-string value
- **THEN** validation fails with an error pointing to `center.svgUrl`

### Requirement: Hierarchical branch structure
The system SHALL represent map content as ordered hierarchical branches using explicit types named `OrganicMainBranch`, `OrganicSubBranch`, and `OrganicLeafNode`.

#### Scenario: Ordered siblings
- **WHEN** an input JSON provides multiple items in `branches` or `children`
- **THEN** validation preserves their array order as the semantic sibling order

#### Scenario: Invalid child shape
- **WHEN** a branch contains `children` that is not an array
- **THEN** validation fails with an error pointing to that branch's `children` path

#### Scenario: Three-level tree is valid
- **WHEN** an OrganicTree uses `OrganicMainBranch -> OrganicSubBranch -> OrganicLeafNode`
- **THEN** validation accepts the depth if all other contract and capacity rules pass

#### Scenario: Nesting exceeds 3 levels
- **WHEN** an OrganicTree contains a child below an `OrganicLeafNode` (nesting deeper than `OrganicMainBranch -> OrganicSubBranch -> OrganicLeafNode`)
- **THEN** validation fails before the CLI starts the local preview server, with an error pointing to the offending `children` path

#### Scenario: OrganicLeafNode keeps optional children field
- **WHEN** TypeScript code references `OrganicLeafNode`
- **THEN** the type includes an optional `children` field for structural consistency, while validation still rejects input that exceeds the MVP depth limit

#### Scenario: CLI JSON mode receives over-depth input
- **WHEN** `omm preview --json` validates an over-depth OrganicTree
- **THEN** it exits non-zero with `agentAction: "regenerate-organic-tree"` and repair guidance to reduce or regroup depth

### Requirement: Concept unit validation
The system SHALL validate that each branch `concept` is a concise cognitive concept unit rather than a prose sentence or paragraph. Concept length is measured by unified unit-width: CJK/fullwidth characters count as 2, ASCII/halfwidth characters count as 1, maximum total unit-width is 25.

#### Scenario: Valid concept unit
- **WHEN** a branch concept is a Chinese compound term, English concept phrase, or mixed term that expresses one concept and has unit-width ≤ 25
- **THEN** validation accepts the concept

#### Scenario: Sentence-like concept
- **WHEN** a branch concept looks like a full sentence, explanatory clause, or paragraph
- **THEN** validation returns a concept quality **Error** (not Warning) pointing to the branch path

#### Scenario: Concept exceeds unit-width threshold
- **WHEN** a branch concept has unit-width > 25
- **THEN** validation returns a concept quality **Error** pointing to the branch path

### Requirement: Optional semantic hints
The system SHALL allow optional `visualHint` and `colorHint` fields on OrganicTree branches for downstream rendering guidance. Branch `visualHint` values SHALL NOT require the CLI to validate them against a visual asset registry.

#### Scenario: Optional hints are supplied
- **WHEN** a branch includes `visualHint` or `colorHint`
- **THEN** validation preserves those fields for downstream rendering

#### Scenario: Optional hints are omitted
- **WHEN** a branch omits `visualHint` and `colorHint`
- **THEN** validation accepts the branch if required fields are valid

#### Scenario: Visual hint is unsupported by renderer
- **WHEN** a branch includes a `visualHint` that has no built-in Phase 1 marker mapping
- **THEN** validation still accepts the branch if all required fields are valid

### Requirement: Optional meta fields
The system SHALL allow optional `meta.sourceTitle` and `meta.sourceSummary` fields on OrganicTree for Agent-generated source metadata.

#### Scenario: Meta is supplied
- **WHEN** an OrganicTree includes `meta.sourceTitle` or `meta.sourceSummary`
- **THEN** validation preserves those fields; they may be displayed by the Web preview or ignored by the renderer

#### Scenario: Meta is omitted
- **WHEN** an OrganicTree omits `meta`
- **THEN** validation accepts the input if all required fields are valid

### Requirement: Capacity threshold validation
The system SHALL define configurable MVP capacity limits for total nodes, depth (fixed at 3), siblings per node, main branches, and concept unit-width (fixed at 25) using `OrganicTreeLimits`. The depth limit SHALL be enforced before the CLI starts the local preview server.

#### Scenario: Input is within capacity
- **WHEN** an `OrganicTree` stays within configured capacity limits
- **THEN** validation succeeds and the CLI can continue toward local preview startup

#### Scenario: Input exceeds capacity
- **WHEN** an `OrganicTree` exceeds any configured capacity limit
- **THEN** validation fails before browser preview startup with a regeneration-oriented capacity error

### Requirement: Agent retry-friendly errors
The system SHALL produce path-specific and retry-friendly validation findings suitable for Gemini CLI, Codex CLI, Claude Code, or another calling Agent CLI.

#### Scenario: Structural error
- **WHEN** validation fails because a required field is missing or malformed
- **THEN** the finding includes the failing field path and a concise reason

#### Scenario: Capacity error
- **WHEN** validation fails because the input exceeds capacity limits
- **THEN** the finding states the exceeded limit and asks the calling agent to regenerate a shorter concept list

#### Scenario: Soft warning
- **WHEN** validation finds a non-blocking quality issue such as a concept near a recommended width limit
- **THEN** the finding can use `severity: "warning"` so preview may continue

#### Scenario: Repair guidance
- **WHEN** validation emits repair guidance
- **THEN** the guidance describes constraints and strategies without silently rewriting, merging, splitting, or semantically compressing concepts

### Requirement: No CLI semantic rewriting
The system SHALL NOT silently rewrite, merge, split, or semantically compress concepts inside the CLI validation step.

#### Scenario: Valid concept needs no rewrite
- **WHEN** a valid concept passes validation
- **THEN** the CLI preserves the concept text as provided

#### Scenario: Invalid concept is too verbose
- **WHEN** a concept is too verbose or sentence-like
- **THEN** the CLI reports a validation error instead of rewriting the concept

### Requirement: OrganicTree validation entrypoint
The system SHALL expose the public full-contract validation entrypoint as `validateOrganicTree` rather than `validateAgentList`.

#### Scenario: OrganicTree validation entrypoint is used
- **WHEN** code imports the full OrganicTree validation function from `@omm/core`
- **THEN** it imports `validateOrganicTree`

#### Scenario: Legacy validation entrypoint is removed from public usage
- **WHEN** repository code is searched for `validateAgentList`
- **THEN** no active source, test, or documentation file uses it except migration notes in this change

### Requirement: OrganicTree fixture directory
The system SHALL use `fixtures/organic-tree/` as the canonical physical fixture directory for OrganicTree inputs.

#### Scenario: OrganicTree fixtures are loaded
- **WHEN** tests or docs reference OrganicTree fixtures
- **THEN** they reference `fixtures/organic-tree/`

#### Scenario: Legacy fixture directory is absent
- **WHEN** the repository is searched for `fixtures/agent-list/`
- **THEN** no active fixture directory or active documentation reference remains except migration notes in this change
