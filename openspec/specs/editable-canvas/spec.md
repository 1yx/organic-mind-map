## ADDED Requirements

### Requirement: App-first editable canvas
The product SHALL present the Phase 2 web experience as an app-first editable canvas rather than a marketing-only landing page.

#### Scenario: Frontend stack is selected
- **WHEN** Phase 2 web implementation work begins
- **THEN** it uses the existing `@omm/web` Vue 3 + Vite package with TypeScript and Composition API rather than introducing a separate React/Next.js frontend

#### Scenario: User opens the home route
- **WHEN** a user visits the website homepage
- **THEN** the first screen is the functional canvas loaded with an onboarding organic mind map explaining the product

#### Scenario: User has not generated a map
- **WHEN** no user-generated artifact is selected
- **THEN** the canvas still supports inspection and editing of the onboarding map artifact where allowed

### Requirement: prediction_omm rendering
The canvas SHALL render `prediction_omm` into a user-editable map view and save user-facing work as `.omm`.

#### Scenario: prediction_omm is loaded
- **WHEN** the frontend receives a `prediction_omm`
- **THEN** it displays the reference image, extracted branches, text layers, doodle groups, masks, and debug overlays through user-selectable visibility controls

#### Scenario: Corrections exist
- **WHEN** a `correction_omm` is loaded with the `prediction_omm`
- **THEN** the internal correction view displays the admin-corrected state while preserving access to original prediction evidence

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

### Requirement: Association-line tool
The canvas SHALL provide an independent tool for Buzan-style nonlinear association lines.

#### Scenario: User creates cross-branch association
- **WHEN** the user selects two existing map objects and creates an association
- **THEN** the canvas creates an association line object rather than adding a branch/subbranch child relationship

#### Scenario: User edits association style
- **WHEN** the user changes direction or visual style of an association line
- **THEN** the canvas updates association-line properties such as direction, arrowhead, dash pattern, stroke width, and color without applying organic branch taper rules

### Requirement: Organic mind map constraints
The canvas SHALL preserve strict organic mind map behavior and SHALL NOT become a generic whiteboard.

#### Scenario: User edits map content
- **WHEN** a user edits branches, text, doodles, or groups
- **THEN** the UI preserves Buzan constraints such as curved tapered branches, image-rich map structure, concise branch concepts, distinct top-level branch colors, and readable whitespace

#### Scenario: Boxed branch keyword is attempted
- **WHEN** an edit would turn branch keywords into generic boxed nodes
- **THEN** the editor rejects or avoids that representation in strict organic mode
