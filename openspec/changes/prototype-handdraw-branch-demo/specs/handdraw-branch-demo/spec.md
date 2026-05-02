## ADDED Requirements

### Requirement: Standalone hand-drawn branch demo
The system SHALL provide a standalone demo page under `.tmp/` that renders branch-only SVG examples for the hand-drawn organic branch algorithm.

#### Scenario: Demo opens without production app
- **WHEN** the demo HTML file is opened directly or served from a simple local static server
- **THEN** it renders a visible SVG branch composition without requiring the production Web preview app

#### Scenario: Demo stays isolated from production renderer
- **WHEN** the demo is added
- **THEN** production renderer, CLI, `.omm`, and Web preview behavior remain unchanged

### Requirement: Readability-biased organic branches
The demo SHALL render branch centerlines that grow organically from the center while keeping terminal branch directions near-horizontal enough to support future readable text placement.

#### Scenario: Branches avoid mostly vertical terminal segments
- **WHEN** the demo renders left and right side branches
- **THEN** branch tips use leftward or rightward terminal tangents rather than mostly vertical downward tangents

#### Scenario: Branches remain organic
- **WHEN** the demo renders a main branch
- **THEN** the branch uses a curved centerline rather than a straight radial segment

### Requirement: Variable-width hand-drawn branch bodies
The demo SHALL render branch bodies as filled variable-width ribbons generated from sampled centerline normals with deterministic edge jitter.

#### Scenario: Branch tapers from root to tip
- **WHEN** a main branch is rendered
- **THEN** its root is visibly wider than its tip

#### Scenario: Branch edges are not perfectly mechanical
- **WHEN** a branch body is rendered
- **THEN** its edges include low-amplitude deterministic irregularity while remaining visually smooth

### Requirement: Child branches grow from parent branch bodies
The demo SHALL place child branch anchors along the parent branch curve instead of forcing all child branches to start at the parent endpoint.

#### Scenario: Multiple children use different parent anchors
- **WHEN** a parent branch has multiple child branches
- **THEN** the children originate from distinct positions along the parent branch's latter half

### Requirement: Playwright visual verification
The demo SHALL include a Playwright-based verification step that opens the demo, captures a screenshot under `.tmp/`, and checks that visible SVG content is present.

#### Scenario: Screenshot is captured
- **WHEN** the verification step runs
- **THEN** it writes a screenshot artifact under `.tmp/`

#### Scenario: SVG is non-empty
- **WHEN** the verification step inspects the demo page
- **THEN** it confirms the page contains a non-empty SVG with visible branch paths
