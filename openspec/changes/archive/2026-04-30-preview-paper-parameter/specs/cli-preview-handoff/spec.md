## MODIFIED Requirements

### Requirement: Preview handoff command
The system SHALL provide an `omm preview <input>` CLI command that reads OrganicTree JSON and hands validated OrganicTree to the local preview server module without accepting paper or surface selection input.

#### Scenario: Valid file input
- **WHEN** a user or Agent workflow runs `omm preview input.json` with a readable OrganicTree JSON file
- **THEN** the CLI parses the file and continues to OrganicTree validation

#### Scenario: Missing input path
- **WHEN** a user runs `omm preview` without an input path
- **THEN** the CLI exits non-zero with a concise usage error

#### Scenario: ConciseListJSON flag is unsupported
- **WHEN** a user runs `omm preview --concise-list-json '<json string>'`
- **THEN** the CLI rejects the unsupported option and does not attempt an intermediate transform

#### Scenario: Paper flag is unsupported
- **WHEN** a user runs `omm preview --paper <value>`
- **THEN** the CLI rejects the unsupported option because MVP preview uses one fixed bounded landscape surface ratio

### Requirement: No paper in OrganicTree
The Agent skill SHALL NOT include a `paper`, `PaperSpec`, `surface`, `aspectRatio`, `widthMm`, or `heightMm` field in generated OrganicTree JSON.

#### Scenario: OrganicTree is generated
- **WHEN** an Agent produces OrganicTree JSON
- **THEN** it does not contain paper, surface, physical size, or aspect-ratio fields because the browser/renderer owns the MVP preview surface

#### Scenario: Paper field is present
- **WHEN** OrganicTree input includes a paper or physical-size field
- **THEN** validation rejects or reports the field as unsupported for the semantic contract
