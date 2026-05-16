## ADDED Requirements

### Requirement: Three-panel shell layout
The app SHALL render a three-panel layout: a top toolbar, a left sidebar, and a canvas viewport filling the remaining space. The toolbar and sidebar SHALL have minimum sizes (toolbar: 48px height, sidebar: 240px width) and scale proportionally based on the canvas area's aspect ratio.

#### Scenario: Initial page load
- **WHEN** the app loads in a desktop browser viewport (1280x800 or larger)
- **THEN** the toolbar spans the full width at the top, the sidebar occupies the left area, and the canvas fills the remaining space, with toolbar height and sidebar width computed from the viewport aspect ratio (clamped at their minimums)

#### Scenario: Window resize
- **WHEN** the browser window is resized
- **THEN** the toolbar height and sidebar width recalculate proportionally based on the new canvas area aspect ratio, never shrinking below their minimums (48px toolbar, 240px sidebar)

#### Scenario: Wide viewport
- **WHEN** the browser viewport is significantly wider than tall (e.g. ultrawide monitor)
- **THEN** the sidebar width scales up proportionally, and the toolbar height stays at or near its minimum

#### Scenario: Tall viewport
- **WHEN** the browser viewport is significantly taller than wide (e.g. portrait monitor)
- **THEN** the toolbar height scales up proportionally, and the sidebar width stays at or near its minimum

### Requirement: Toolbar placeholder tools
The toolbar SHALL display icon buttons for the following tools as visual placeholders: Select, Hand, Rectangle, Diamond, Ellipse, Arrow, Line, Freedraw, Text, Image, Eraser.

#### Scenario: Toolbar icon display
- **WHEN** the app loads
- **THEN** the toolbar shows icon buttons arranged horizontally from left to right, matching the excalidraw `.shapes-section` tool order

#### Scenario: Toolbar button click (wireframe phase)
- **WHEN** a user clicks any toolbar button
- **THEN** no action is performed (buttons are disabled/placeholders during wireframe phase)

### Requirement: Sidebar sizing and background
The left sidebar SHALL have a dark gray background (#1e1e1e) and a minimum width of 240px, scaling proportionally with the canvas area aspect ratio.

#### Scenario: Sidebar visual appearance
- **WHEN** the app loads
- **THEN** the sidebar renders with dark gray background (#1e1e1e), at least 240px wide, and no horizontal scrollbar

### Requirement: Toolbar and sidebar separation
The toolbar and sidebar SHALL be visually distinct with a border or subtle separator between panels.

#### Scenario: Panel boundaries visible
- **WHEN** the app loads
- **THEN** a visible border or divider separates the toolbar from the content below, and separates the sidebar from the canvas viewport
