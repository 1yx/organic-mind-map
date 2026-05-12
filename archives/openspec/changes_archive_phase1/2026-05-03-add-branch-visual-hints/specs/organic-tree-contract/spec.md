## ADDED Requirements

### Requirement: Branch visual hints remain optional semantic hints
OrganicTree branches SHALL allow optional `visualHint` values without requiring the CLI to validate them against a visual asset registry.

#### Scenario: Visual hint is present
- **WHEN** a branch includes `visualHint`
- **THEN** validation preserves the value for browser/renderer use

#### Scenario: Visual hint is unsupported by renderer
- **WHEN** a branch includes a `visualHint` that has no built-in Phase 1 marker mapping
- **THEN** validation still accepts the branch if all required fields are valid
