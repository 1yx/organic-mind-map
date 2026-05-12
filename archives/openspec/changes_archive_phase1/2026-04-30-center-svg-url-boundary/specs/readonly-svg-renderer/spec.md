## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Render entry points do not perform network I/O
The renderer SHALL keep pure render entry points free of external SVG network fetches.

#### Scenario: Render OrganicTree directly
- **WHEN** a caller invokes `render({ kind: "organic-tree", tree })`
- **THEN** the renderer does not fetch `tree.center.svgUrl` and uses deterministic fallback unless safe inline SVG content is provided by the caller

#### Scenario: Web resolves center visual asynchronously
- **WHEN** Web wants to use `center.svgUrl`
- **THEN** Web performs URL gate, browser fetch, and SVG safety checks before calling render with resolved safe content
