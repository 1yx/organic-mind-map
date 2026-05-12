## ADDED Requirements

### Requirement: Standalone editable handdraw canvas demo
The project SHALL provide a standalone demo that reconstructs `fixtures/handdraw/mindmap-6` as editable SVG canvas objects without changing production preview behavior.

#### Scenario: Demo opens independently
- **WHEN** the demo page is opened directly or served locally
- **THEN** it renders an editable mind map composition without requiring the production Web preview app

#### Scenario: Production behavior is unchanged
- **WHEN** the demo is added
- **THEN** `@omm/renderer`, `@omm/web`, CLI preview, `.omm` export, and OrganicTree validation behavior remain unchanged

### Requirement: YAML-backed structure
The demo SHALL use the mindmap-6 YAML fixture as the semantic structure source for title, center, main branches, and child labels.

#### Scenario: Fixture content renders
- **WHEN** the demo loads the mindmap-6 fixture
- **THEN** the center, six main branches, and their child labels are represented as editable objects

#### Scenario: YAML fixture is loadable
- **WHEN** the demo or verification reads `fixtures/handdraw/mindmap-6.yaml`
- **THEN** the YAML parses into the expected title, center, branches, and children structure

### Requirement: Reference image overlay
The demo SHALL allow the generated PNG reference to be displayed as an optional overlay behind editable objects.

#### Scenario: Overlay can be toggled
- **WHEN** the user toggles the reference overlay control
- **THEN** the generated reference image visibility changes without deleting editable objects

### Requirement: Basic object editing
The demo SHALL support selecting, dragging, and editing text for reconstructed map objects.

#### Scenario: Object can be selected
- **WHEN** the user clicks an editable branch, label, doodle, or center object
- **THEN** the demo marks that object as selected

#### Scenario: Object can be dragged
- **WHEN** the user drags a selected editable object
- **THEN** the object position updates on the canvas

#### Scenario: Label text can be edited
- **WHEN** the user edits a selected text label
- **THEN** the visible label updates while remaining associated with the same editable object

### Requirement: Prototype state export and import
The demo SHALL support exporting and importing its editable canvas state as demo-local JSON.

#### Scenario: JSON export contains editable objects
- **WHEN** the user exports demo state
- **THEN** the exported JSON contains center, branch, label, and doodle object records with positions and editable text

#### Scenario: JSON import restores state
- **WHEN** the user imports a previously exported demo state
- **THEN** the demo restores the editable objects from that state

### Requirement: Browser verification
The demo SHALL include a browser verification script that confirms visible editable content and captures a screenshot under `.tmp/`.

#### Scenario: Verification captures screenshot
- **WHEN** the verification script runs
- **THEN** it writes a screenshot artifact under `.tmp/`

#### Scenario: Verification confirms editable content
- **WHEN** the verification script inspects the demo page
- **THEN** it confirms the page contains visible editable center, branch, label, and doodle objects
