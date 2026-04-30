## ADDED Requirements

### Requirement: Preview handoff command
The system SHALL provide an `omm preview <input>` CLI command that reads OrganicTree JSON and hands validated OrganicTree to the local preview server module without accepting paper or surface selection input, with optional `--json` machine-readable result output.

#### Scenario: Valid file input
- **WHEN** a user or Agent workflow runs `omm preview input.json` with a readable OrganicTree JSON file
- **THEN** the CLI parses the file and continues to OrganicTree validation

#### Scenario: Missing input path
- **WHEN** a user runs `omm preview` without an input path
- **THEN** the CLI exits non-zero with a concise usage error

#### Scenario: JSON mode is requested
- **WHEN** a user or Agent workflow runs `omm preview --json input.json`
- **THEN** expected command outcomes are emitted as a single-line JSON result envelope to stdout

#### Scenario: ConciseListJSON flag is unsupported
- **WHEN** a user runs `omm preview --concise-list-json '<json string>'`
- **THEN** the CLI rejects the unsupported option and does not attempt an intermediate transform

#### Scenario: Paper flag is unsupported
- **WHEN** a user runs `omm preview --paper <value>`
- **THEN** the CLI rejects the unsupported option because MVP preview uses one fixed bounded landscape surface ratio

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

### Requirement: No domain assembly in CLI
The system SHALL NOT assign node IDs, organic seeds, colors, center visual fallbacks, branch styles, final layout coordinates, `.omm` layout snapshots, PNG export, network image fetching, svgUrl allowlist filtering, or SVG safety checks inside the CLI.

#### Scenario: Valid OrganicTree handoff
- **WHEN** the CLI successfully validates and capacity-checks input
- **THEN** it hands off the raw OrganicTree without generated node IDs, branch colors, organic seed, fallback center visual IDs, final layout coordinates, fetched image content, allowlist-filtered URLs, or center visual wrapper objects

#### Scenario: PNG export requested from CLI
- **WHEN** a user requests one-shot PNG export from the CLI
- **THEN** the CLI rejects the request because PNG export is browser-side in Phase 1

#### Scenario: String center SVG URL is present
- **WHEN** validated OrganicTree contains `center.svgUrl` as a string
- **THEN** the CLI preserves it as part of the raw OrganicTree handoff and does not reject it for HTTPS, allowlist, URL length, or URL parse failures

### Requirement: No paper option in CLI
The system SHALL NOT support a `--paper` CLI flag, surface flag, physical-size option, or any CLI-side paper selection.

#### Scenario: Paper is omitted from input
- **WHEN** the input OrganicTree does not contain a `paper` field
- **THEN** the CLI does not add one; the browser/renderer determines the fixed MVP bounded surface ratio

#### Scenario: Unsupported paper option is passed
- **WHEN** a legacy command attempts `--paper a3-landscape`
- **THEN** the CLI rejects the option because MVP preview surface proportions are browser-owned

### Requirement: Local preview server handoff
The system SHALL call the local preview server module after successful validation and capacity checks, while the server module owns HTTP startup details.

#### Scenario: Preview handoff succeeds
- **WHEN** the local preview server module accepts the validated OrganicTree
- **THEN** the CLI delegates HTTP listener setup, `/api/document`, port handling, and URL output to that module

#### Scenario: Preview handoff fails
- **WHEN** the local preview server module reports a handoff failure
- **THEN** the CLI exits with code `3`; in JSON mode it emits an `ok: false` result with `structuredContent.kind: "server-startup"` and `agentAction: "retry-later-or-change-port"`

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
- **THEN** the CLI passes it through without filtering; the browser loads and renders the SVG after allowlist and safety checks

#### Scenario: center SVG URL loading fails
- **WHEN** the browser cannot load the center SVG because of a non-allowlisted host, network failure, or safety violation
- **THEN** the preview falls back to a deterministic built-in center visual without blocking

#### Scenario: No center SVG URL provided
- **WHEN** the OrganicTree includes no `center.svgUrl`
- **THEN** the preview selects a deterministic built-in center visual from the content hash

### Requirement: Renderer unified entry point
The renderer SHALL expose `render(input: RenderInput, options?)` as the unified public entry point, with `RenderInput` updated to replace `preview-payload` with `organic-tree`.

#### Scenario: Render from OrganicTree
- **WHEN** a caller invokes `render({ kind: "organic-tree", tree })`
- **THEN** the renderer computes layout and produces SVG from the OrganicTree

#### Scenario: Render from OmmDocument
- **WHEN** a caller invokes `render({ kind: "omm-document", document })`
- **THEN** the renderer extracts the tree and saved surface/layout data from the document and produces SVG

#### Scenario: Legacy preview-payload kind is rejected
- **WHEN** a caller passes `RenderInput` with `kind: "preview-payload"`
- **THEN** TypeScript compilation fails because the discriminator is removed

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
- **THEN** the error includes an actionable repair suggestion or truncated preview to help the Agent shorten concepts in one iteration

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
The Agent skill SHALL NOT include a `paper`, `PaperSpec`, `surface`, `aspectRatio`, `widthMm`, or `heightMm` field in generated OrganicTree JSON.

#### Scenario: OrganicTree is generated
- **WHEN** an Agent produces OrganicTree JSON
- **THEN** it does not contain paper, surface, physical size, or aspect-ratio fields because the browser/renderer owns the MVP preview surface

#### Scenario: Paper field is present
- **WHEN** OrganicTree input includes a paper or physical-size field
- **THEN** validation rejects or reports the field as unsupported for the semantic contract
