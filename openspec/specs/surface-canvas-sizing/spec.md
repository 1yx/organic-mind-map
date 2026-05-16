## ADDED Requirements

### Requirement: Canvas region matches surface aspect ratio

The editor canvas region SHALL have a width-to-height ratio equal to the loaded document's `surface.aspectRatio`. When no document is loaded, the default ratio SHALL be `√2 ≈ 1.414`.

#### Scenario: Landscape with default surface

- **WHEN** no document is loaded and viewport is 1280×800
- **THEN** the canvas region width divided by height equals √2 (within 1px rounding)

#### Scenario: Landscape with custom surface aspect

- **WHEN** a document with `surface.aspectRatio = 1.778` (16:9) is loaded and viewport is 2560×1080
- **THEN** the canvas region width divided by height equals 1.778 (within 1px rounding)

#### Scenario: Portrait with default surface

- **WHEN** no document is loaded and viewport is 800×1280
- **THEN** the canvas region width divided by height equals √2 (within 1px rounding)

### Requirement: Toolbar and sidebar minimums are enforced

The layout SHALL enforce `toolbarHeight ≥ TOOLBAR_MIN_H` and `sidebarWidth ≥ SIDEBAR_MIN_W` (landscape) or `sidebarHeight ≥ SIDEBAR_MIN_H` (portrait). When the surface aspect ratio cannot be satisfied while respecting both minimums, the layout SHALL clamp both to their minimums.

#### Scenario: Landscape viewport can fit surface ratio

- **WHEN** viewport is 1280×800 and surface aspect is √2
- **THEN** toolbar height equals TOOLBAR_MIN_H and sidebar width is dynamically computed to make canvas match √2

#### Scenario: Landscape viewport too narrow for surface ratio

- **WHEN** viewport is 600×800 and surface aspect is √2
- **THEN** sidebar width is clamped to SIDEBAR_MIN_W and toolbar height adjusts to get as close to √2 as possible

#### Scenario: Portrait viewport can fit surface ratio

- **WHEN** viewport is 800×1280 and surface aspect is √2
- **THEN** toolbar height equals TOOLBAR_MIN_H and bottom sidebar height is dynamically computed

#### Scenario: Portrait viewport too short for surface ratio

- **WHEN** viewport is 800×600 and surface aspect is √2
- **THEN** sidebar height is clamped to SIDEBAR_MIN_H and toolbar height adjusts

### Requirement: Layout switches between landscape and portrait

The layout SHALL use landscape mode (sidebar on the left) when viewport width ≥ height, and portrait mode (sidebar at the bottom) when viewport height > width.

#### Scenario: Resize from landscape to portrait

- **WHEN** viewport is resized from 1280×800 to 800×1280
- **THEN** sidebar moves from left to bottom and canvas dimensions recompute to match surface aspect

### Requirement: Surface aspect ratio updates reactively

When a document is loaded or changed, the canvas region SHALL immediately resize to match the new surface aspect ratio.

#### Scenario: Document loaded after initial render

- **WHEN** the editor is showing the default √2 surface and a document with aspect 1.778 loads
- **THEN** the canvas region resizes to match 1.778

### Requirement: Ultrawide viewport centers content horizontally

When the viewport is wider than needed for the surface-proportional layout with sidebar at maximum width, the entire editor content block (toolbar + sidebar + canvas) SHALL be horizontally centered. The content block height SHALL remain 100vh — no vertical centering or letterboxing.

#### Scenario: Ultrawide landscape viewport

- **WHEN** viewport is 2560×1080 and surface aspect is √2
- **THEN** the entire content block (toolbar, sidebar, canvas) is horizontally centered with equal whitespace on both sides
- **AND** toolbar width equals sidebarW + canvasW (not full viewport width)
- **AND** content block height fills the full viewport height

#### Scenario: Normal-width landscape viewport

- **WHEN** viewport is 1280×800 and surface aspect is √2
- **THEN** the content block fills the full viewport width (no horizontal centering needed)

#### Scenario: Portrait viewport

- **WHEN** viewport is 800×1280 and surface aspect is √2
- **THEN** the content block fills the full viewport width (no horizontal centering needed)
