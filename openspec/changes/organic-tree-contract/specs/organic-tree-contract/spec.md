## ADDED Requirements

### Requirement: Agent list JSON contract
The system SHALL define a stable JSON contract named `AgentMindMapList` for agent skill output consumed by the project CLI.

#### Scenario: Valid minimal list
- **WHEN** an input JSON contains `version: 1`, a non-empty `title`, a `center` object with a non-empty `concept`, and a non-empty `branches` array
- **THEN** the input is recognized as an agent list candidate for CLI validation

#### Scenario: Unsupported contract version
- **WHEN** an input JSON contains a `version` other than `1`
- **THEN** validation fails with an error pointing to `version`

### Requirement: Center concept and visual hint
The system SHALL require the agent list to include a center concept and SHALL allow optional center visual hints for later center visual selection.

#### Scenario: Center concept is missing
- **WHEN** an input JSON omits `center.concept` or provides an empty `center.concept`
- **THEN** validation fails with an error pointing to `center.concept`

#### Scenario: Center visual hint is provided
- **WHEN** an input JSON includes `center.visualHint`
- **THEN** validation preserves the hint for downstream preview payload generation

#### Scenario: Center SVG URL is provided
- **WHEN** an input JSON includes `center.svgUrl`
- **THEN** validation preserves the URL for downstream preview payload generation

### Requirement: Hierarchical branch structure
The system SHALL represent map content as ordered hierarchical branches using explicit 3-level types: `MainBranch`, `SubBranch`, and `LeafNode`. No recursive types are used.

#### Scenario: Ordered siblings
- **WHEN** an input JSON provides multiple items in `branches` or `children`
- **THEN** validation preserves their array order as the semantic sibling order

#### Scenario: Invalid child shape
- **WHEN** a branch contains `children` that is not an array
- **THEN** validation fails with an error pointing to that branch's `children` path

#### Scenario: Nesting exceeds 3 levels
- **WHEN** an input JSON contains nesting deeper than MainBranch -> SubBranch -> LeafNode
- **THEN** validation fails with a structural error indicating the maximum depth is 3

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

### Requirement: Capacity threshold validation
The system SHALL define configurable MVP capacity limits for total nodes, depth (fixed at 3), siblings per node, main branches, and concept unit-width (fixed at 25).

### Requirement: Optional semantic hints
The system SHALL allow optional `visualHint` and `colorHint` fields on branches for downstream rendering guidance.

#### Scenario: Optional hints are supplied
- **WHEN** a branch includes `visualHint` or `colorHint`
- **THEN** validation preserves those fields for downstream preview payload generation

#### Scenario: Optional hints are omitted
- **WHEN** a branch omits `visualHint` and `colorHint`
- **THEN** validation accepts the branch if required fields are valid

### Requirement: Capacity threshold validation
The system SHALL define configurable MVP capacity limits for total nodes, depth (fixed at 3), siblings per node, main branches, and concept unit-width (fixed at 25).

#### Scenario: Input is within capacity
- **WHEN** an agent list stays within configured capacity limits
- **THEN** validation succeeds and the CLI can continue toward local preview startup

#### Scenario: Input exceeds capacity
- **WHEN** an agent list exceeds any configured capacity limit
- **THEN** validation fails before browser preview startup with a regeneration-oriented capacity error

### Requirement: Agent retry-friendly errors
The system SHALL produce path-specific and retry-friendly validation errors suitable for Gemini CLI, Codex CLI, Claude Code, or another calling Agent CLI.

#### Scenario: Structural error
- **WHEN** validation fails because a required field is missing or malformed
- **THEN** the error includes the failing field path and a concise reason

#### Scenario: Capacity error
- **WHEN** validation fails because the input exceeds capacity limits
- **THEN** the error states the exceeded limit and asks the calling agent to regenerate a shorter concept list

### Requirement: No CLI semantic rewriting
The system SHALL NOT silently rewrite, merge, split, or semantically compress concepts inside the CLI validation step.

#### Scenario: Valid concept needs no rewrite
- **WHEN** a valid concept passes validation
- **THEN** the CLI preserves the concept text as provided

#### Scenario: Invalid concept is too verbose
- **WHEN** a concept is too verbose or sentence-like
- **THEN** the CLI reports a validation error instead of rewriting the concept
