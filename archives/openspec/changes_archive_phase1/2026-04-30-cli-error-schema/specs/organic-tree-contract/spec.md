## MODIFIED Requirements

### Requirement: Agent retry-friendly errors
The system SHALL produce path-specific and retry-friendly validation findings suitable for Gemini CLI, Codex CLI, Claude Code, or another calling Agent CLI.

#### Scenario: Structural error
- **WHEN** validation fails because a required field is missing or malformed
- **THEN** the finding includes the failing field path and a concise reason

#### Scenario: Capacity error
- **WHEN** validation fails because the input exceeds capacity limits
- **THEN** the finding states the exceeded limit and asks the calling agent to regenerate a shorter concept list

#### Scenario: Soft warning
- **WHEN** validation finds a non-blocking quality issue such as a concept near a recommended width limit
- **THEN** the finding can use `severity: "warning"` so preview may continue

#### Scenario: Repair guidance
- **WHEN** validation emits repair guidance
- **THEN** the guidance describes constraints and strategies without silently rewriting, merging, splitting, or semantically compressing concepts
