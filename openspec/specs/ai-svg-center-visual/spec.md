## ADDED Requirements

### Requirement: Controlled center SVG URL
The system SHALL allow OrganicTree center input to include an optional untrusted SVG URL hint for AI-selected center visuals.

#### Scenario: Center SVG URL string is supplied
- **WHEN** OrganicTree input includes `center.svgUrl` as a string
- **THEN** core contract validation preserves the URL string for preview-time handling

#### Scenario: Center SVG URL is omitted
- **WHEN** OrganicTree input omits the center SVG URL
- **THEN** validation accepts the input if all required OrganicTree fields are valid

### Requirement: External SVG source restriction
The Web preview SHALL restrict center SVG URL loading to hardcoded controlled HTTPS sources using host + path pattern matching before fetch.

#### Scenario: Non-HTTPS URL is supplied
- **WHEN** OrganicTree input includes a center SVG URL using a non-HTTPS scheme
- **THEN** Web rejects the URL before fetch and continues with deterministic built-in fallback

#### Scenario: Uncontrolled host is supplied
- **WHEN** OrganicTree input includes a center SVG URL from a host outside the hardcoded allowlist
- **THEN** Web rejects the URL before fetch and continues with deterministic built-in fallback

#### Scenario: Allowed host with disallowed path is supplied
- **WHEN** OrganicTree input includes a center SVG URL whose host is allowed but whose path does not match an allowed pattern
- **THEN** Web rejects the URL before fetch and continues with deterministic built-in fallback

### Requirement: CLI does not fetch SVG
The CLI SHALL NOT fetch, sanitize, cache, inline, allowlist-filter, or wrap center SVG content.

#### Scenario: Center SVG URL string is present
- **WHEN** OrganicTree input includes `center.svgUrl` as a string
- **THEN** the CLI preserves it in the raw OrganicTree handoff without building `PreviewPayload.centerVisual`

#### Scenario: CLI preview starts without network image fetch
- **WHEN** the CLI starts preview for input with any string center SVG URL
- **THEN** preview startup does not wait for a network image request and does not decide whether the URL is visually usable

### Requirement: Browser SVG loading and guard
The browser preview SHALL asynchronously load allowlisted center SVG URLs and SHALL apply lightweight safety checks before rendering.

#### Scenario: Safe SVG response is loaded
- **WHEN** the browser loads an allowlisted SVG response that passes lightweight safety checks
- **THEN** the renderer displays the SVG as the center visual

#### Scenario: Unsafe SVG response is loaded
- **WHEN** the SVG response contains script, foreignObject, event handler attributes, external references, CSS URL references, or embedded raster data URLs
- **THEN** the browser rejects the response and uses deterministic built-in fallback

#### Scenario: SVG request fails
- **WHEN** the browser SVG request fails, times out, exceeds 64KB, or returns non-SVG content
- **THEN** the browser uses deterministic built-in fallback without blocking the preview page

#### Scenario: SVG request exceeds timeout
- **WHEN** controlled SVG loading exceeds 10 seconds
- **THEN** the browser aborts the request and uses deterministic built-in fallback

#### Scenario: SVG safety is evaluated
- **WHEN** the browser receives SVG text from an allowlisted center SVG URL
- **THEN** it parses the SVG with `DOMParser` and accepts only an explicit allowlist of SVG elements and attributes before rendering

#### Scenario: SVG contains non-allowlisted element or attribute
- **WHEN** parsed SVG contains an element or attribute outside the allowlist
- **THEN** the browser rejects the SVG and uses deterministic built-in fallback

### Requirement: Controlled SVG rendering priority
The browser renderer SHALL prioritize a successfully loaded and safety-checked controlled center SVG over built-in center visual fallback.

#### Scenario: Controlled SVG URL is present and safe
- **WHEN** the browser preview receives `OrganicTree.center.svgUrl`, the URL passes the Web gate, and the loaded SVG passes safety checks
- **THEN** the renderer displays that SVG as the map center visual

#### Scenario: Controlled SVG URL is absent or unusable
- **WHEN** the browser preview has no usable center SVG content
- **THEN** the renderer selects a deterministic built-in center visual from the OrganicTree content hash

### Requirement: PNG export remains self-contained
PNG export SHALL NOT depend on drawing uncontrolled external image elements.

#### Scenario: PNG export after controlled SVG load
- **WHEN** the preview renders an AI-selected center SVG after browser loading and safety checks
- **THEN** PNG export uses the already loaded browser-safe SVG content or falls back to the built-in center visual

### Requirement: Phase 1 center color exception
Phase 1 SHALL accept single-color AI-selected SVG center visuals when they come from the controlled SVG flow.

#### Scenario: Single-color SVG is selected
- **WHEN** the loaded controlled center SVG uses only one color
- **THEN** the renderer accepts it as a valid Phase 1 center visual
