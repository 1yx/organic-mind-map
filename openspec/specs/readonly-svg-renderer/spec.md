## ADDED Requirements

### Requirement: Read-only SVG render output
The renderer SHALL render a valid `OrganicTree` or `.omm` document into a non-empty SVG scene on a bounded landscape surface.

#### Scenario: Valid OrganicTree renders via unified render() entry point
- **WHEN** the renderer receives `render({ kind: "organic-tree", tree })` with a valid `OrganicTree`
- **THEN** it returns a non-empty SVG result using the fixed MVP `sqrt2-landscape` surface ratio

#### Scenario: Valid OMM document renders via unified render() entry point
- **WHEN** the renderer receives `render({ kind: "omm-document", document })` with a valid `.omm` document
- **THEN** it returns a non-empty SVG result using the document's saved surface and layout information

### Requirement: Canvas text measurement
The renderer SHALL use browser Canvas 2D `CanvasRenderingContext2D.measureText()` as the layout-time text measurement source for concept text.

#### Scenario: Concept text is measured
- **WHEN** concept text is laid out on a branch
- **THEN** branch length and visible text are based on Canvas 2D measured text width

#### Scenario: Layout measurement loop runs
- **WHEN** the renderer is solving layout
- **THEN** it does not mount hidden DOM/SVG text nodes or call SVG `getBBox()` for iterative text measurement

### Requirement: System font stack
The renderer SHALL use system font stacks for Canvas measurement and SVG text rendering.

#### Scenario: Renderer measures and renders text
- **WHEN** the renderer measures concept text and emits SVG text
- **THEN** both use the same system font stack such as `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

#### Scenario: Web Font is requested
- **WHEN** renderer code attempts to depend on `@font-face`, remote fonts, local bundled Web Fonts, WOFF/WOFF2 assets, or font Base64 inlining
- **THEN** the implementation violates the renderer contract

### Requirement: Deterministic preview instantiation
The renderer SHALL deterministically instantiate domain state from `OrganicTree` content.

#### Scenario: Same OrganicTree renders twice
- **WHEN** the same `OrganicTree` is rendered twice
- **THEN** node IDs, colors, organic seed, branch styling, and layout are stable across renders

#### Scenario: OrganicTree content changes
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

#### Scenario: Adjacent main branches diverge from center
- **WHEN** two main branch path envelopes have overlapping AABBs because they originate near the same center point and diverge radially
- **THEN** the renderer suppresses the collision diagnostic because the overlap is explained by shared-origin radial divergence

#### Scenario: Same-side child branches diverge
- **WHEN** child branches on the same side of the center have overlapping AABBs near their shared origin region
- **THEN** the renderer suppresses the collision diagnostic because the overlap is explained by valid same-side radial divergence

#### Scenario: Genuine overlap remains diagnostic
- **WHEN** branch path envelopes or text boxes overlap outside the shared-origin radial divergence region
- **THEN** the renderer reports the collision or crossing diagnostic normally

### Requirement: Center visual rendering
The renderer SHALL render a compliant center visual before considering the map complete.

#### Scenario: Safe inline SVG is supplied
- **WHEN** Web supplies a loaded and safety-checked inline SVG center visual to the renderer
- **THEN** the renderer displays that SVG as the center visual

#### Scenario: Controlled SVG URL is unavailable
- **WHEN** no safe inline center SVG is supplied, loading fails, times out, is rejected, or is not available in the current render context
- **THEN** the renderer selects a deterministic built-in center visual from the OrganicTree content hash

#### Scenario: Plain text center only
- **WHEN** the center would otherwise be represented as plain text only
- **THEN** the renderer uses a visual fallback because plain text center is not compliant

### Requirement: svgUrl allowlist filtering
The renderer or Web layer SHALL provide an allowlist predicate for `OrganicTree.center.svgUrl`, and Web SHALL call it before loading external SVG content.

#### Scenario: Allowlisted URL is accepted
- **WHEN** `center.svgUrl` matches the allowed HTTPS host and path pattern list
- **THEN** Web may attempt to load the SVG

#### Scenario: Non-allowlisted URL is rejected
- **WHEN** `center.svgUrl` does not match the allowed HTTPS host and path pattern list
- **THEN** Web falls back to a built-in center visual without attempting to load the URL

### Requirement: Render entry points do not perform network I/O
The renderer SHALL keep pure render entry points free of external SVG network fetches.

#### Scenario: Render OrganicTree directly
- **WHEN** a caller invokes `render({ kind: "organic-tree", tree })`
- **THEN** the renderer does not fetch `tree.center.svgUrl` and uses deterministic fallback unless safe inline SVG content is provided by the caller

#### Scenario: Web resolves center visual asynchronously
- **WHEN** Web wants to use `center.svgUrl`
- **THEN** Web performs URL gate, browser fetch, and SVG safety checks before calling render with resolved safe content

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
- **THEN** the computed layout includes surface bounds, center visual bounds, branch paths, and text paths needed by the document format

### Requirement: MVP surface ratio
The renderer SHALL use a single fixed MVP OrganicTree preview surface ratio named `sqrt2-landscape`.

#### Scenario: OrganicTree has no surface option
- **WHEN** an OrganicTree preview is rendered without document layout
- **THEN** the renderer uses width/height approximately `1.414` and does not require A3/A4 paper metadata

#### Scenario: Future ratio preset is needed
- **WHEN** later phases add another bounded ratio such as `16:9`
- **THEN** it is introduced as a render/Web surface preset rather than as an OrganicTree semantic field

### Requirement: English concepts render uppercase by default
The renderer SHALL display English-only branch concept labels in uppercase while preserving the semantic concept text in input data.

#### Scenario: English concept renders
- **WHEN** an OrganicTree branch concept is English-only text
- **THEN** the branch text emitted in SVG is uppercase

#### Scenario: Measurement uses rendered label
- **WHEN** the renderer measures an English-only concept for branch length
- **THEN** it measures the uppercase display label that will be emitted in SVG

#### Scenario: Mixed concept renders
- **WHEN** an OrganicTree branch concept contains mixed-language text
- **THEN** the renderer preserves the concept casing rather than applying an English-only uppercase transform

### Requirement: Branch visual hints render as lightweight built-in markers
The renderer SHALL render supported branch `visualHint` values as deterministic built-in markers near the branch concept text without using external image assets.

#### Scenario: Supported visual hint renders
- **WHEN** a branch concept includes a supported `visualHint`
- **THEN** the rendered SVG includes a small built-in visual marker associated with that hint

#### Scenario: Unsupported visual hint is present
- **WHEN** a branch concept includes an unsupported `visualHint`
- **THEN** the renderer omits the marker and still renders the branch concept normally

#### Scenario: Marker participates in spacing
- **WHEN** a supported marker is rendered near branch text
- **THEN** renderer spacing and collision checks account for the marker bounds

### Requirement: Renderer rejects legacy preview payload input
The renderer SHALL expose active render inputs for `organic-tree` and `omm-document` only; the `preview-payload` discriminator SHALL NOT exist in `RenderInput`.

#### Scenario: OrganicTree input renders
- **WHEN** a caller invokes `render({ kind: "organic-tree", tree })`
- **THEN** the renderer computes preview layout and returns a render result

#### Scenario: Legacy input is attempted
- **WHEN** active TypeScript code attempts to pass `kind: "preview-payload"` to the renderer
- **THEN** TypeScript compilation fails because the discriminator is not part of `RenderInput`
