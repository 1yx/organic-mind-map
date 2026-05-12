## MODIFIED Requirements

### Requirement: Paper-proportional viewport
The Web preview SHALL render OrganicTree previews on one fixed MVP bounded landscape surface ratio rather than selected A3 or A4 paper proportions.

#### Scenario: OrganicTree preview uses fixed MVP surface
- **WHEN** the server serves an `OrganicTree`
- **THEN** the Web preview uses the fixed `sqrt2-landscape` surface ratio with width/height approximately `1.414`

#### Scenario: Paper preset is absent
- **WHEN** the server exposes OrganicTree through `GET /api/document`
- **THEN** the response does not include paper selection metadata for OrganicTree preview

#### Scenario: OMM document includes saved surface
- **WHEN** the server serves a browser-exported `.omm` document
- **THEN** the Web preview uses the saved document surface and layout snapshot to reproduce that document
