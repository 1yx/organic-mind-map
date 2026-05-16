## ADDED Requirements

### Requirement: Paper.js canvas initialization
The canvas viewport SHALL initialize a Paper.js instance on mount, attached to a `<canvas>` element that fills the available space.

#### Scenario: Canvas initializes on app load
- **WHEN** the app loads
- **THEN** Paper.js is initialized with a canvas element sized to fill the viewport area to the right of the sidebar and below the toolbar

### Requirement: Canvas resizes with viewport
The Paper.js canvas SHALL resize when the browser window or sidebar changes size.

#### Scenario: Window resize updates canvas
- **WHEN** the browser window is resized
- **THEN** the Paper.js canvas dimensions update to match the new available space without distortion or offset

### Requirement: Empty canvas state
The canvas viewport SHALL display an empty canvas by default during the wireframe phase.

#### Scenario: Initial canvas state
- **WHEN** the app loads with no document
- **THEN** the canvas shows an empty white or light background with no drawn content
