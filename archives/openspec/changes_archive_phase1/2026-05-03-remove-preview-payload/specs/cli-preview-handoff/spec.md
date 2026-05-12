## ADDED Requirements

### Requirement: Active preview handoff has no PreviewPayload
The CLI and local preview server SHALL use validated `OrganicTree` as the active Agent preview handoff shape and SHALL NOT construct, expose, or require `PreviewPayload`.

#### Scenario: CLI starts preview
- **WHEN** `omm preview` validates an OrganicTree successfully
- **THEN** `/api/document` exposes that OrganicTree directly without wrapping it in `PreviewPayload`

#### Scenario: Repository usage is searched
- **WHEN** active source, tests, fixtures, and non-migration documentation are searched for `PreviewPayload` or `preview-payload`
- **THEN** no active usage remains
