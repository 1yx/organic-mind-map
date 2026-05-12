## ADDED Requirements

### Requirement: Browser PNG export control
The Web preview SHALL provide a user-visible control for exporting the current read-only preview as a PNG.

#### Scenario: Export control is available
- **WHEN** a valid preview has rendered in the Web page
- **THEN** the page displays an Export PNG control

#### Scenario: Export control is not ready
- **WHEN** the preview has not rendered or required assets are not ready
- **THEN** the Export PNG control is disabled or reports a local readiness error

### Requirement: SVG to PNG conversion
The Web preview SHALL export PNG by cloning the currently rendered SVG, inlining export assets, serializing the clone, and drawing it into a browser canvas.

#### Scenario: User exports rendered preview
- **WHEN** the user activates Export PNG
- **THEN** the page clones the rendered SVG, prepares the clone for export, serializes it, draws it into a canvas, and downloads a PNG file

#### Scenario: Canvas conversion fails
- **WHEN** canvas conversion or `toBlob("image/png")` fails
- **THEN** the page displays a simple local export error

### Requirement: Paper aspect ratio preservation
The exported PNG SHALL preserve the same A3 or A4 landscape aspect ratio shown in the local preview.

#### Scenario: A3 export
- **WHEN** the current preview uses A3 landscape paper
- **THEN** the PNG dimensions preserve the A3 landscape ratio

#### Scenario: A4 export
- **WHEN** the current preview uses A4 landscape paper
- **THEN** the PNG dimensions preserve the A4 landscape ratio

### Requirement: Adaptive export resolution
The exported PNG SHALL use the current preview container size and a runtime-calculated safe scale factor while preserving paper aspect ratio.

#### Scenario: Device-aware export
- **WHEN** the user exports from a normal preview surface
- **THEN** the canvas dimensions are derived from the rendered preview container, `window.devicePixelRatio`, and browser memory safety limits

#### Scenario: Large logical viewBox
- **WHEN** the SVG viewBox is larger than the visible preview container
- **THEN** export does not require canvas physical dimensions to equal the full logical viewBox size

#### Scenario: Canvas would exceed memory limits
- **WHEN** the calculated canvas dimensions exceed safe browser limits
- **THEN** export reduces scale or reports a local canvas-size error

### Requirement: Preview fidelity
The exported PNG SHALL reflect the current rendered preview layout.

#### Scenario: Preview contains mind map content
- **WHEN** the preview includes paper background, center visual, branches, and text
- **THEN** the exported PNG includes the same visible content

#### Scenario: Layout changes before export
- **WHEN** the preview has re-rendered with new layout geometry before export
- **THEN** the PNG reflects the latest rendered SVG rather than stale geometry

### Requirement: Self-contained asset handling
PNG export SHALL use self-contained or browser-safe rendered assets and SHALL avoid uncontrolled external image drawing.

#### Scenario: Built-in assets are used
- **WHEN** the preview contains built-in center visuals or SVG shapes
- **THEN** the PNG export includes them without requiring network access at export time

#### Scenario: External visible asset is used
- **WHEN** the preview SVG clone contains a visible external asset reference
- **THEN** the export preprocessor fetches and replaces that reference with inline SVG content or a Data URL before serialization

#### Scenario: External asset cannot be inlined
- **WHEN** a visible external asset cannot be fetched, verified, or converted to an export-safe inline form
- **THEN** export uses a deterministic fallback or blocks with a local readiness error

#### Scenario: Controlled center SVG is not export-safe
- **WHEN** a controlled SVG center visual has not loaded, failed safety checks, or is not safe for canvas export
- **THEN** export uses the deterministic built-in fallback or blocks with a local readiness error

### Requirement: System font export consistency
The renderer and PNG export SHALL use system font stacks only and SHALL NOT depend on Web Fonts.

#### Scenario: Text is measured and rendered
- **WHEN** the renderer measures text and the Web preview exports PNG
- **THEN** both paths use the same system font stack such as `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

#### Scenario: Web Font is introduced
- **WHEN** CSS, SVG, or renderer code attempts to use `@font-face`, remote fonts, bundled WOFF/WOFF2 assets, or font Base64 inlining
- **THEN** the implementation violates the export contract

### Requirement: CLI remains out of PNG export
PNG export SHALL remain a browser-side Web preview action in Phase 1.

#### Scenario: CLI one-shot export is requested
- **WHEN** a user requests one-shot PNG export from the CLI
- **THEN** the CLI rejects or omits the feature because PNG export belongs to the Web preview in Phase 1

#### Scenario: Server-side rendering is considered
- **WHEN** implementation needs a PNG
- **THEN** it does not add Puppeteer, Playwright, cloud rendering, or a bundled browser dependency to the CLI
