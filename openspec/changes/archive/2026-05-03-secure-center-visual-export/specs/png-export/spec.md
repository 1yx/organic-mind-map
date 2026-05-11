## ADDED Requirements

### Requirement: PNG export uses resolved safe center visual
PNG export SHALL use the already resolved safe center visual content or deterministic built-in fallback and SHALL NOT draw uncontrolled external center image references.

#### Scenario: Safe center SVG was resolved
- **WHEN** PNG export runs after a controlled center SVG passed browser safety checks
- **THEN** the exported PNG uses the safe inline SVG content without issuing a new external image draw

#### Scenario: Center SVG is unresolved or unsafe
- **WHEN** PNG export runs and the controlled center SVG is missing, still loading, rejected, or failed
- **THEN** export uses the deterministic built-in fallback or reports a local readiness error without drawing the external URL
