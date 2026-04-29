## MODIFIED Requirements

### Requirement: Preview handoff command
The system SHALL provide an `omm preview <input>` CLI command that reads OrganicTree JSON and hands validated OrganicTree to the local preview server module.

#### Scenario: Valid file input
- **WHEN** a user or Agent workflow runs `omm preview input.json` with a readable OrganicTree JSON file
- **THEN** the CLI parses the file and continues to OrganicTree validation

#### Scenario: Missing input path
- **WHEN** a user runs `omm preview` without an input path
- **THEN** the CLI exits non-zero with a concise usage error

#### Scenario: ConciseListJSON flag is unsupported
- **WHEN** a user runs `omm preview --concise-list-json '<json string>'`
- **THEN** the CLI rejects the unsupported option and does not attempt an intermediate transform

#### Scenario: Paper flag is unsupported
- **WHEN** a user runs `omm preview --paper <value>`
- **THEN** the CLI rejects the unsupported option because paper proportions are browser-owned

### Requirement: OrganicTree validation
The system SHALL validate the input against the `organic-tree-contract` before calling the local preview server module.

#### Scenario: Valid OrganicTree
- **WHEN** the parsed input satisfies the OrganicTree contract
- **THEN** the CLI proceeds to capacity checks

#### Scenario: Invalid OrganicTree
- **WHEN** the parsed input violates the OrganicTree contract
- **THEN** the CLI exits with code `1` and includes path-specific validation errors suitable for Agent reflection

### Requirement: OrganicTree handoff
The system SHALL expose validated OrganicTree to the browser preview flow instead of `PreviewPayload` or a partial `OmmDocument`.

#### Scenario: OrganicTree is exposed
- **WHEN** input passes OrganicTree validation and capacity checks
- **THEN** the CLI exposes the validated OrganicTree to the local Web preview via `/api/document`

#### Scenario: Partial OmmDocument attempted
- **WHEN** the CLI attempts to expose an object typed or shaped as `OmmDocument` without browser-computed layout
- **THEN** the handoff is invalid because only the browser creates valid `OmmDocument` exports

#### Scenario: PreviewPayload attempted
- **WHEN** the CLI attempts to wrap validated OrganicTree into `PreviewPayload`
- **THEN** the handoff is invalid because the Web preview should receive OrganicTree directly

### Requirement: CLI semantic preservation
The system SHALL validate only mechanical contract and capacity concerns without silently changing user meaning.

#### Scenario: Safe normalization
- **WHEN** input concepts contain leading or repeated whitespace
- **THEN** the CLI may trim or normalize whitespace without changing concept meaning

#### Scenario: Semantic rewrite would be needed
- **WHEN** a concept requires splitting, merging, removing negation, changing dates, changing numbers, or rewriting names to become valid
- **THEN** the CLI reports validation feedback instead of rewriting the concept

#### Scenario: Malformed semantic tree
- **WHEN** model-produced OrganicTree JSON has incorrect shape, excessive depth, or invalid concepts
- **THEN** the CLI reports errors instead of repairing or transforming the semantic tree

### Requirement: No CLI-side svgUrl allowlist
The system SHALL NOT perform svgUrl allowlist filtering inside the CLI.

#### Scenario: OrganicTree contains center.svgUrl
- **WHEN** an OrganicTree includes `center.svgUrl`
- **THEN** the CLI preserves it as-is and passes it to the browser; the browser/renderer performs allowlist filtering

#### Scenario: Invalid svgUrl is present
- **WHEN** an OrganicTree contains a non-allowlisted `center.svgUrl`
- **THEN** the CLI does not reject it; the browser/renderer handles the fallback

### Requirement: center.svgUrl as sole center visual channel
The system SHALL use `OrganicTree.center.svgUrl` as the single handoff channel for external center visual content. `PreviewPayload.centerVisual.inlineSvg` and `centerVisual.svgUrl` are removed.

#### Scenario: Agent provides center SVG URL
- **WHEN** an Agent populates `center.svgUrl` with an HTTPS URL
- **THEN** the CLI passes it through without filtering; the renderer loads and renders the SVG after allowlist and safety checks

#### Scenario: center SVG URL loading fails
- **WHEN** the renderer cannot load the center SVG (non-allowlisted host, network failure, safety violation)
- **THEN** the renderer falls back to a deterministic built-in center visual without blocking the preview

#### Scenario: No center SVG URL provided
- **WHEN** the OrganicTree includes no `center.svgUrl`
- **THEN** the renderer selects a deterministic built-in center visual from the content hash

### Requirement: Renderer unified entry point
The renderer SHALL expose `render(input: RenderInput, options?)` as the unified public entry point, with `RenderInput` updated to replace `preview-payload` with `organic-tree`.

#### Scenario: Render from OrganicTree
- **WHEN** a caller invokes `render({ kind: "organic-tree", tree })`
- **THEN** the renderer computes layout and produces SVG from the OrganicTree

#### Scenario: Render from OmmDocument
- **WHEN** a caller invokes `render({ kind: "omm-document", document })`
- **THEN** the renderer extracts the tree and paper spec from the document and produces SVG

#### Scenario: Legacy preview-payload kind is rejected
- **WHEN** a caller passes `RenderInput` with `kind: "preview-payload"`
- **THEN** TypeScript compilation fails because the discriminator is removed

## ADDED Requirements

### Requirement: Root Agent skill
The repository SHALL include a root `SKILL.md` that instructs Agent CLIs to produce OrganicTree JSON from long text.

#### Scenario: Skill exists
- **WHEN** an Agent CLI inspects the repository root
- **THEN** it can find `SKILL.md`

#### Scenario: Skill targets OrganicTree
- **WHEN** an Agent CLI reads `SKILL.md`
- **THEN** it is instructed to output OrganicTree JSON, not `ConciseListJSON`, `PreviewPayload`, `OmmDocument`, or layout coordinates

#### Scenario: Skill includes valid example
- **WHEN** an Agent CLI reads `SKILL.md`
- **THEN** it sees a valid OrganicTree JSON example that can be passed to `omm preview`

#### Scenario: Skill describes the reflection loop
- **WHEN** an Agent CLI reads `SKILL.md`
- **THEN** it is instructed to run `omm preview`, capture exit codes 1/2, parse the path-specific JSON errors, and regenerate corrected OrganicTree JSON

### Requirement: Agent reflection loop
The Agent workflow SHALL use CLI validation errors as feedback for regenerating invalid OrganicTree JSON. CLI errors SHALL use a standardized JSON structure with `path`, `message`, and actionable repair suggestions.

#### Scenario: CLI reports structural error
- **WHEN** `omm preview` reports a path-specific structural error
- **THEN** the error includes `path` (JSON pointer to the failing field) and `message` (concise reason)

#### Scenario: CLI reports quality error
- **WHEN** `omm preview` reports sentence-like or overlong concepts
- **THEN** the error includes an actionable repair suggestion or truncated preview (e.g., "suggested: '...'") to help the Agent shorten concepts in one iteration

#### Scenario: CLI reports capacity error
- **WHEN** `omm preview` reports capacity limits were exceeded
- **THEN** the error states the exceeded limit and asks the calling Agent to regenerate a smaller OrganicTree with fewer or shorter concepts

### Requirement: No intermediate ConciseListJSON
The Agent skill workflow SHALL NOT introduce `ConciseListJSON` as a separate semantic input contract.

#### Scenario: Skill output is checked
- **WHEN** `SKILL.md` describes the expected output
- **THEN** it names OrganicTree JSON as the output contract

#### Scenario: CLI options are documented
- **WHEN** `SKILL.md` describes how to invoke the preview command
- **THEN** it uses existing OrganicTree input forms and does not mention `--concise-list-json`

### Requirement: Spatial intelligence remains browser-owned
The Agent skill SHALL NOT ask the model to compute spatial or rendering details.

#### Scenario: Layout fields are avoided
- **WHEN** an Agent follows `SKILL.md`
- **THEN** it does not add node IDs, colors, organic seeds, coordinates, path geometry, layout snapshots, or PNG export data

#### Scenario: Browser computes final visual state
- **WHEN** valid OrganicTree reaches the preview pipeline
- **THEN** browser-side code remains responsible for spatial layout, svgUrl allowlist filtering, and export artifacts

### Requirement: No PreviewPayload in Agent preview handoff
The Agent preview workflow SHALL pass validated OrganicTree from CLI to Web without wrapping it in `PreviewPayload`.

#### Scenario: CLI validation succeeds
- **WHEN** `omm preview` validates OrganicTree successfully
- **THEN** the local Web preview receives the validated OrganicTree as the semantic input via `/api/document`

#### Scenario: Web instantiates domain state
- **WHEN** the Web app receives OrganicTree
- **THEN** it derives IDs, colors, organic seed, center fallback, layout, and export state in browser memory

### Requirement: No paper in OrganicTree
The Agent skill SHALL NOT include a `paper` field in the generated OrganicTree.

#### Scenario: OrganicTree is generated
- **WHEN** an Agent produces OrganicTree JSON
- **THEN** it does not contain a `paper` field; paper proportions are determined by the browser (default A3 landscape; paper selection will be addressed in a follow-up change)
