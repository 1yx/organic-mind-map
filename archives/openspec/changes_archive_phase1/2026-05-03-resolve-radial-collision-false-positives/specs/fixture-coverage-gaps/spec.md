## ADDED Requirements

### Requirement: Anthropic product team fixture renders without false collision diagnostics
The project SHALL include the `anthropic-product-team` OrganicTree fixture as coverage for radial AABB false positives and SHALL require it to render without diagnostics.

#### Scenario: Anthropic fixture renders cleanly
- **WHEN** renderer smoke tests render `fixtures/organic-tree/anthropic-product-team.json`
- **THEN** the result contains a non-empty SVG or render model and zero diagnostics

#### Scenario: Web preview displays no diagnostics for fixture
- **WHEN** the local Web preview renders `anthropic-product-team.json`
- **THEN** the preview page does not show a Diagnostics section for unresolved collisions
