## ADDED Requirements

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
