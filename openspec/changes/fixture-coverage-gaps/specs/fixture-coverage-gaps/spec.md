## ADDED Requirements

### Requirement: Collision stress fixtures
The project SHALL include valid OrganicTree stress fixtures that exercise dense branch layout and unbalanced tree layout.

#### Scenario: Extreme sibling fixture exists
- **WHEN** fixture validation runs
- **THEN** a valid `stress-extreme-siblings.json` OrganicTree fixture is available with a dense sibling set and long concept units near the MVP capacity boundary

#### Scenario: Unbalanced tree fixture exists
- **WHEN** fixture validation runs
- **THEN** a valid `stress-unbalanced-tree.json` OrganicTree fixture is available with strongly asymmetric branch distribution

#### Scenario: Stress fixtures render
- **WHEN** renderer smoke tests run against collision stress fixtures
- **THEN** the renderer returns a non-empty SVG or render model with expected paper bounds and branch/text elements

### Requirement: Poison fixture coverage
The project SHALL include hostile fixtures that verify unsafe inputs are rejected or safely downgraded before unsafe rendering.

#### Scenario: Unsafe protocol fixture fails safely
- **WHEN** validation or preview preparation receives a fixture containing `javascript:`, `data:text/html`, protocol-relative, or otherwise unsafe center visual URLs
- **THEN** the input is rejected with path-specific errors or the center visual is downgraded to the built-in fallback without script execution

#### Scenario: Text injection fixture stays inert
- **WHEN** validation or rendering receives concept text containing script-like markup or URL-like attack strings
- **THEN** the renderer escapes the text as inert content and does not create executable SVG or HTML

#### Scenario: Oversized whitespace payload fails before render
- **WHEN** CLI preview receives an oversized mostly-whitespace or invalid nested payload beyond the MVP byte-size limit
- **THEN** the command fails before renderer handoff with a structured, regeneration-oriented error

### Requirement: OMM runtime artifact negative fixtures
The project SHALL include `.omm` negative fixtures for runtime artifacts that must not persist in the document model.

#### Scenario: Web font declaration fixture is rejected or normalized
- **WHEN** `.omm` validation loads a document containing external web font declarations, `@font-face`, WOFF/WOFF2 references, or remote font metadata
- **THEN** validation rejects the document or normalizes it to the approved system font stack before rendering/export

#### Scenario: Missing organic seed fixture fails or repairs deterministically
- **WHEN** `.omm` validation loads a document without `organicSeed`
- **THEN** validation fails with a path-specific error or recomputes a deterministic replacement seed through an explicitly tested repair path

### Requirement: Fixture terminology remains OrganicTree aligned
Fixture names, directories, tests, and documentation SHALL use `OrganicTree` terminology for model inputs and SHALL NOT reintroduce `agent-list` naming.

#### Scenario: Fixture documentation uses OrganicTree naming
- **WHEN** fixture README or test documentation is updated
- **THEN** model input examples are described as `OrganicTree` fixtures under `fixtures/organic-tree/`

#### Scenario: New fixtures use category prefixes
- **WHEN** new fixtures are added for this change
- **THEN** their filenames use `stress-*`, `poison-*`, `invalid-*`, or `valid-*` prefixes to communicate test intent

### Requirement: Lightweight verification boundary
The fixture coverage gap tests SHALL remain lightweight and SHALL NOT introduce pixel-perfect visual regression or CLI browser automation for PNG export.

#### Scenario: Stress verification avoids image snapshots
- **WHEN** stress fixture tests assert renderer behavior
- **THEN** they use structural SVG/model assertions or diagnostics rather than image-perfect snapshots

#### Scenario: CLI export automation remains out of scope
- **WHEN** this fixture hardening work is implemented
- **THEN** it does not add Puppeteer or Playwright to the CLI for one-shot PNG export verification
