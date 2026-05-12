## ADDED Requirements

### Requirement: App-first editable canvas
The product SHALL present the Phase 2 web experience as an app-first editable canvas rather than a marketing-only landing page.

#### Scenario: User opens the home route
- **WHEN** a user visits the website homepage
- **THEN** the first screen is the functional canvas loaded with an onboarding organic mind map explaining the product

#### Scenario: User has not generated a map
- **WHEN** no user-generated artifact is selected
- **THEN** the canvas still supports inspection and editing of the onboarding map artifact where allowed

### Requirement: Prediction artifact rendering
The canvas SHALL render prediction artifacts and correction artifacts into an editable map view.

#### Scenario: Prediction artifact is loaded
- **WHEN** the frontend receives a prediction artifact
- **THEN** it displays the reference image, extracted branches, text layers, doodle groups, masks, and debug overlays through user-selectable visibility controls

#### Scenario: Corrections exist
- **WHEN** a correction artifact is loaded with the prediction artifact
- **THEN** the canvas displays the corrected state while preserving access to original prediction evidence

### Requirement: Editable branch centerlines
The canvas SHALL edit branch centerlines while deriving visible branch outlines from width profiles.

#### Scenario: User edits a branch with pen-tool behavior
- **WHEN** the user adjusts a branch curve
- **THEN** the editor modifies the centerline control points and recomputes the visible tapered outline

#### Scenario: Branch width is adjusted
- **WHEN** the user changes a top-level branch thickness
- **THEN** the branch remains thicker near the center or parent side, thinner near the tip, and descendant subbranches remain visually thinner than the parent branch system

#### Scenario: Branch data is saved
- **WHEN** the user saves an edited branch
- **THEN** the canvas writes canonical branch data with centerline and width profile rather than saving Paper.js-only state

### Requirement: Visual grouping
The canvas SHALL support Figma-like grouping between doodles and related text.

#### Scenario: Doodle group is selected
- **WHEN** a user selects a visual group
- **THEN** the canvas highlights its doodle members, doodle-text members, bbox, and branch association where available

#### Scenario: Text is unassigned
- **WHEN** OCR text has no semantic or visual group assignment
- **THEN** the canvas treats it as `unassigned_text` so the user can attach, relabel, or leave it separate

### Requirement: Organic mind map constraints
The canvas SHALL preserve strict organic mind map behavior and SHALL NOT become a generic whiteboard.

#### Scenario: User edits map content
- **WHEN** a user edits branches, text, doodles, or groups
- **THEN** the UI preserves Buzan constraints such as curved tapered branches, image-rich map structure, concise branch concepts, distinct top-level branch colors, and readable whitespace

#### Scenario: Boxed branch keyword is attempted
- **WHEN** an edit would turn branch keywords into generic boxed nodes
- **THEN** the editor rejects or avoids that representation in strict organic mode

