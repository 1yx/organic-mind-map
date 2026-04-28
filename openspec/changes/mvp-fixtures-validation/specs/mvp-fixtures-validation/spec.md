## ADDED Requirements

### Requirement: Representative MVP fixtures
The project SHALL include representative fixtures for the Phase 1 long-text-to-preview workflow.

#### Scenario: Chinese fixture exists
- **WHEN** fixture validation runs
- **THEN** at least one Chinese concept-unit fixture is available and valid

#### Scenario: English fixture exists
- **WHEN** fixture validation runs
- **THEN** at least one English concept-phrase fixture is available and valid

#### Scenario: Center visual fixture exists
- **WHEN** fixture validation runs
- **THEN** at least one fixture exercises center visual hint or center SVG behavior

#### Scenario: Unreachable SVG URL fixture exists
- **WHEN** a fixture contains a center visual URL that returns 404 or times out
- **THEN** the browser renderer degrades gracefully to the built-in hash template image without crashing or showing a white screen

### Requirement: Invalid fixture coverage
The project SHALL include invalid fixtures that fail before browser rendering.

#### Scenario: Sentence-like concept fixture
- **WHEN** validation runs against a fixture containing sentence-like concepts
- **THEN** validation fails with path-specific concept quality errors

#### Scenario: Oversized fixture
- **WHEN** validation runs against a fixture that exceeds MVP capacity
- **THEN** validation fails with regeneration-oriented feedback suitable for Agent CLI retry loops

### Requirement: Contract and document validation coverage
The project SHALL test the OrganicTree contract, preview payload shape, and `.omm` document validation with fixtures.

#### Scenario: OrganicTree fixture validates
- **WHEN** a valid OrganicTree fixture is tested
- **THEN** it passes structural, concept quality, and capacity validation

#### Scenario: OMM fixture validates
- **WHEN** a valid `.omm` fixture is tested
- **THEN** it passes document validation

### Requirement: Renderer smoke coverage
The project SHALL include lightweight smoke coverage that renders fixture data without requiring a visual editor.

#### Scenario: Preview payload renders
- **WHEN** a valid preview payload fixture is passed to the renderer
- **THEN** the renderer returns a non-empty SVG or render model with the expected paper viewBox

#### Scenario: OMM document renders
- **WHEN** a valid `.omm` fixture is passed to the renderer
- **THEN** the renderer returns a non-empty SVG or render model

#### Scenario: Unreachable SVG URL renders fallback
- **WHEN** a fixture with an unreachable SVG URL is rendered
- **THEN** the renderer displays the built-in template image as fallback without error

### Requirement: Determinism from content hash
Rendering determinism SHALL come exclusively from the content hash (cyrb53) of the OrganicTree JSON. No external `--seed` CLI parameter SHALL be used.

#### Scenario: Deterministic rendering without seed
- **WHEN** the same fixture is previewed multiple times
- **THEN** the rendered output is identical without any `--seed` parameter

### Requirement: Local preview workflow documentation
The project SHALL document the MVP command sequence from agent-produced fixture input to browser preview and export.

#### Scenario: User follows documented workflow
- **WHEN** a user follows the documented MVP fixture workflow
- **THEN** they can start local preview from a fixture and use the browser to export `.omm` and PNG

#### Scenario: No visual editing required
- **WHEN** the fixture workflow is documented
- **THEN** it explicitly states that Phase 1 does not require `.omm` visual editing

### Requirement: No heavyweight visual regression dependency
The MVP fixture validation SHALL avoid requiring exhaustive pixel-perfect visual regression or CLI-headless browser export.

#### Scenario: Smoke tests run
- **WHEN** MVP fixture smoke tests run
- **THEN** they assert deterministic structure and renderability rather than image-perfect snapshots

#### Scenario: PNG export is verified
- **WHEN** PNG export needs verification
- **THEN** it is verified through the Web preview path or documented manual smoke, not by adding Puppeteer or Playwright to CLI export
