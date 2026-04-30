## MODIFIED Requirements

### Requirement: No domain assembly in CLI
The system SHALL NOT assign node IDs, organic seeds, colors, center visual fallbacks, branch styles, final layout coordinates, `.omm` layout snapshots, PNG export, network image fetching, svgUrl allowlist filtering, or SVG safety checks inside the CLI.

#### Scenario: Valid OrganicTree handoff
- **WHEN** the CLI successfully validates and capacity-checks input
- **THEN** it hands off the raw OrganicTree without generated node IDs, branch colors, organic seed, fallback center visual IDs, final layout coordinates, fetched image content, allowlist-filtered URLs, or center visual wrapper objects

#### Scenario: PNG export requested from CLI
- **WHEN** a user requests one-shot PNG export from the CLI
- **THEN** the CLI rejects the request because PNG export is browser-side in Phase 1

#### Scenario: String center SVG URL is present
- **WHEN** validated OrganicTree contains `center.svgUrl` as a string
- **THEN** the CLI preserves it as part of the raw OrganicTree handoff and does not reject it for HTTPS, allowlist, URL length, or URL parse failures
