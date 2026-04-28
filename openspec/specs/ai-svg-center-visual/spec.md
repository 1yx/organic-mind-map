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
The system SHALL restrict center SVG URL pass-through to hardcoded controlled HTTPS sources.

#### Scenario: Non-HTTPS URL is supplied
- **WHEN** OrganicTree input includes a center SVG URL using a non-HTTPS scheme
- **THEN** the CLI omits the URL from `PreviewPayload` and continues with deterministic browser fallback

#### Scenario: Uncontrolled host is supplied
- **WHEN** OrganicTree input includes a center SVG URL from a host outside the hardcoded allowlist
- **THEN** the CLI omits the URL from `PreviewPayload` and continues with deterministic browser fallback

### Requirement: CLI does not fetch SVG
The CLI SHALL NOT fetch, sanitize, cache, or inline center SVG content.

#### Scenario: Allowed SVG URL is valid
- **WHEN** OrganicTree input includes an allowed SVG URL
- **THEN** the CLI includes the URL in `PreviewPayload.centerVisual.svgUrl`

#### Scenario: CLI preview starts without network image fetch
- **WHEN** the CLI builds a `PreviewPayload` for input with an allowed SVG URL
- **THEN** preview startup does not wait for a network image request

### Requirement: Browser SVG loading and guard
The browser renderer SHALL asynchronously load allowed center SVG URLs and SHALL apply lightweight safety checks before rendering.

#### Scenario: Safe SVG response is loaded
- **WHEN** the browser loads an allowed SVG response that passes lightweight safety checks
- **THEN** the renderer displays the SVG as the center visual

#### Scenario: Unsafe SVG response is loaded
- **WHEN** the SVG response contains script, foreignObject, event handler attributes, external references, CSS URL references, or embedded raster data URLs
- **THEN** the browser rejects the response and uses deterministic built-in fallback

#### Scenario: SVG request fails
- **WHEN** the browser SVG request fails, times out, or returns non-SVG content
- **THEN** the browser uses deterministic built-in fallback without blocking the preview page

### Requirement: Controlled SVG rendering priority
The browser renderer SHALL prioritize a successfully loaded controlled center SVG over built-in center visual fallback.

#### Scenario: Controlled SVG URL is present
- **WHEN** the browser preview receives `PreviewPayload.centerVisual.svgUrl` and loads it successfully
- **THEN** the renderer displays that SVG as the map center visual

#### Scenario: Controlled SVG URL is absent
- **WHEN** the browser preview receives no center SVG URL
- **THEN** the renderer selects a deterministic built-in center visual from the OrganicTree content hash

### Requirement: PNG export remains self-contained
PNG export SHALL NOT depend on drawing uncontrolled external image elements.

#### Scenario: PNG export after controlled SVG load
- **WHEN** the preview renders an AI-selected center SVG after browser loading and safety checks
- **THEN** PNG export uses browser-safe rendered SVG content or falls back to the built-in center visual

### Requirement: Phase 1 center color exception
Phase 1 SHALL accept single-color AI-selected SVG center visuals when they come from the controlled SVG flow.

#### Scenario: Single-color SVG is selected
- **WHEN** the loaded controlled center SVG uses only one color
- **THEN** the renderer accepts it as a valid Phase 1 center visual
