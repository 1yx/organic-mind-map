## MODIFIED Requirements

### Requirement: Center concept and visual hint
The system SHALL require the `OrganicTree` to include a center concept and SHALL allow optional center visual hints for later center visual selection.

#### Scenario: Center concept is missing
- **WHEN** an input JSON omits `center.concept` or provides an empty `center.concept`
- **THEN** validation fails with an error pointing to `center.concept`

#### Scenario: Center visual hint is provided
- **WHEN** an input JSON includes `center.visualHint`
- **THEN** validation preserves the hint for downstream rendering

#### Scenario: Center SVG URL is provided as string
- **WHEN** an input JSON includes `center.svgUrl` as a string
- **THEN** validation preserves the URL string for downstream preview handling without allowlist filtering, fetching, or rewriting

#### Scenario: Center SVG URL is non-string
- **WHEN** an input JSON includes `center.svgUrl` with a non-string value
- **THEN** validation fails with an error pointing to `center.svgUrl`
