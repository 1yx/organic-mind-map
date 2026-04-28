## ADDED Requirements

### Requirement: Controlled center SVG URL
The system SHALL allow OrganicTree center input to include an optional controlled SVG URL for AI-selected center visuals.

#### Scenario: Controlled SVG URL is supplied
- **WHEN** OrganicTree input includes a center SVG URL from an allowed HTTPS vector source
- **THEN** validation preserves the URL for preview payload preparation

#### Scenario: Center SVG URL is omitted
- **WHEN** OrganicTree input omits the center SVG URL
- **THEN** validation accepts the input if all required OrganicTree fields are valid

### Requirement: External SVG source restriction
The system SHALL restrict center SVG fetching to configured controlled HTTPS sources.

#### Scenario: Non-HTTPS URL is supplied
- **WHEN** OrganicTree input includes a center SVG URL using a non-HTTPS scheme
- **THEN** the CLI does not fetch the URL and continues with deterministic browser fallback

#### Scenario: Uncontrolled host is supplied
- **WHEN** OrganicTree input includes a center SVG URL from a host outside the configured allowlist
- **THEN** the CLI does not fetch the URL and continues with deterministic browser fallback

### Requirement: CLI SVG fetch and limits
The CLI SHALL fetch allowed center SVG URLs before starting local preview and SHALL enforce timeout, response size, and SVG content checks.

#### Scenario: Allowed SVG fetch succeeds
- **WHEN** OrganicTree input includes an allowed SVG URL and the response is within limits
- **THEN** the CLI passes the SVG text to sanitization before building `PreviewPayload`

#### Scenario: SVG fetch fails
- **WHEN** fetching the allowed SVG URL fails, times out, or exceeds the configured size limit
- **THEN** the CLI still produces a valid `PreviewPayload` without `centerVisual.inlineSvg`

### Requirement: SVG sanitization
The system SHALL sanitize fetched SVG markup before it can be included in `PreviewPayload`.

#### Scenario: Safe SVG is fetched
- **WHEN** fetched SVG contains only allowed SVG elements and safe presentation attributes
- **THEN** the CLI includes sanitized markup in `PreviewPayload.centerVisual.inlineSvg`

#### Scenario: Unsafe SVG is fetched
- **WHEN** fetched SVG contains script, foreignObject, event handler attributes, external references, CSS URL references, or embedded raster data URLs
- **THEN** the CLI strips or rejects the unsafe content before preview handoff

#### Scenario: SVG cannot be made safe
- **WHEN** fetched SVG cannot be parsed or sanitized into allowed markup
- **THEN** the CLI omits `centerVisual.inlineSvg` and continues with deterministic browser fallback

### Requirement: Inline center SVG rendering
The browser renderer SHALL prioritize sanitized `PreviewPayload.centerVisual.inlineSvg` over built-in center visual fallback.

#### Scenario: Inline SVG is present
- **WHEN** the browser preview receives `PreviewPayload.centerVisual.inlineSvg`
- **THEN** the renderer displays that inline SVG as the map center visual

#### Scenario: Inline SVG is absent
- **WHEN** the browser preview receives no inline center SVG
- **THEN** the renderer selects a deterministic built-in center visual from the OrganicTree content hash

### Requirement: PNG export remains self-contained
PNG export SHALL NOT depend on external image loading when rendering AI-selected center SVGs.

#### Scenario: PNG export with inline SVG
- **WHEN** the preview renders an AI-selected center SVG from `centerVisual.inlineSvg`
- **THEN** PNG export completes without canvas taint caused by external image URLs

### Requirement: Phase 1 center color exception
Phase 1 SHALL accept single-color AI-selected SVG center visuals when they come from the controlled SVG flow.

#### Scenario: Single-color SVG is selected
- **WHEN** the fetched and sanitized center SVG uses only one color
- **THEN** the renderer accepts it as a valid Phase 1 center visual
