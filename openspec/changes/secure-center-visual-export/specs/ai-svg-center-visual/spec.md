## ADDED Requirements

### Requirement: Browser resolves center SVG hints safely
The Web preview SHALL resolve `OrganicTree.center.svgUrl` through URL allowlist, bounded fetch, SVG safety checks, and deterministic fallback.

#### Scenario: URL is not allowlisted
- **WHEN** `center.svgUrl` does not match the HTTPS host and path allowlist
- **THEN** Web does not fetch it and uses the deterministic built-in center fallback

#### Scenario: SVG fails safety checks
- **WHEN** fetched SVG text contains non-allowlisted elements, non-allowlisted attributes, script, event handlers, external references, CSS URL references, or embedded raster data
- **THEN** Web rejects the SVG and uses the deterministic built-in center fallback

#### Scenario: SVG is safe
- **WHEN** an allowlisted SVG response passes size, timeout, content-type, parse, and whitelist checks
- **THEN** Web passes the resolved safe inline SVG content to the renderer
