## ADDED Requirements

### Requirement: Read-only SVG render output
The renderer SHALL render a valid `PreviewPayload` or `.omm` document into a non-empty SVG scene on fixed A3 or A4 landscape paper.

#### Scenario: Valid preview payload renders
- **WHEN** the renderer receives a valid `PreviewPayload`
- **THEN** it returns a non-empty SVG result with the expected paper viewBox

#### Scenario: Valid OMM document renders
- **WHEN** the renderer receives a valid `.omm` document
- **THEN** it returns a non-empty SVG result using the document paper specification

### Requirement: Canvas text measurement
The renderer SHALL use browser Canvas 2D `CanvasRenderingContext2D.measureText()` as the layout-time text measurement source for concept text.

#### Scenario: Concept text is measured
- **WHEN** concept text is laid out on a branch
- **THEN** branch length and visible text are based on Canvas 2D measured text width

#### Scenario: Layout measurement loop runs
- **WHEN** the renderer is solving layout
- **THEN** it does not mount hidden DOM/SVG text nodes or call SVG `getBBox()` for iterative text measurement

### Requirement: Deterministic preview instantiation
The renderer SHALL deterministically instantiate domain state from `PreviewPayload` content.

#### Scenario: Same preview payload renders twice
- **WHEN** the same `PreviewPayload` is rendered twice
- **THEN** node IDs, colors, organic seed, branch styling, and layout are stable across renders

#### Scenario: Preview payload content changes
- **WHEN** the OrganicTree content changes
- **THEN** the renderer derives a different organic seed from the stable content serialization

#### Scenario: Seeded geometry is evaluated for legality
- **WHEN** the renderer derives branch curvature, angle, taper, and length preferences from the seed
- **THEN** those seeded parameters are applied before bounding boxes and collision checks are computed

### Requirement: Organic branch rendering
The renderer SHALL render organic mind map branches as curved tapered shapes with concept text along branch paths.

#### Scenario: Main branches render
- **WHEN** a map contains main branches
- **THEN** each main branch is rendered with a distinct color and tapered curved branch geometry

#### Scenario: Branch concept text renders
- **WHEN** a branch has a concept
- **THEN** the concept text appears along that branch path rather than inside a boxed node

#### Scenario: Child branches render
- **WHEN** a branch contains child concepts
- **THEN** the renderer places child branches recursively within the parent branch sector

### Requirement: Bounding-box collision protection
The renderer SHALL include basic bounding-box collision detection and local spacing correction for MVP layouts.

#### Scenario: Branch layout creates overlapping boxes
- **WHEN** text, branch shape, center visual, or path envelope bounding boxes overlap
- **THEN** the renderer attempts local spacing correction before accepting the layout

#### Scenario: Collision cannot be resolved
- **WHEN** bounding-box collisions remain after the allowed correction pass
- **THEN** the renderer returns an internal layout diagnostic instead of treating the layout as clean

#### Scenario: Branch or text crosses another occupied region
- **WHEN** a branch path envelope or text box crosses another occupied region
- **THEN** the renderer reports a collision or crossing diagnostic

### Requirement: Center visual rendering
The renderer SHALL render a compliant center visual before considering the map complete.

#### Scenario: Controlled SVG URL loads
- **WHEN** `PreviewPayload.centerVisual.svgUrl` is present and the browser loads a safe controlled SVG
- **THEN** the renderer displays that SVG as the center visual

#### Scenario: Controlled SVG URL is unavailable
- **WHEN** no center SVG URL is present, loading fails, times out, or fails the browser guard
- **THEN** the renderer selects a deterministic built-in center visual from the OrganicTree content hash

#### Scenario: Plain text center only
- **WHEN** the center would otherwise be represented as plain text only
- **THEN** the renderer uses a visual fallback because plain text center is not compliant

### Requirement: Layout clipping and diagnostics
The renderer SHALL keep preview rendering lightweight while reporting diagnostics for tests and development.

#### Scenario: Concept exceeds available branch length
- **WHEN** measured concept text exceeds available branch length
- **THEN** the renderer visibly clips the text without adding user-facing warning UI

#### Scenario: Hard layout failure occurs
- **WHEN** the renderer cannot produce a valid non-overlapping layout for accepted input
- **THEN** it returns an internal diagnostic that tests can assert

### Requirement: Layout snapshot support
The renderer SHALL expose the computed geometry needed for browser-side `.omm` export.

#### Scenario: Browser creates final document
- **WHEN** the browser exports `.omm` from a rendered preview
- **THEN** the computed layout includes paper bounds, center visual bounds, branch paths, and text paths needed by the document format
