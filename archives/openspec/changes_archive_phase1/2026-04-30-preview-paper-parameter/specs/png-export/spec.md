## MODIFIED Requirements

### Requirement: Paper aspect ratio preservation
The exported PNG SHALL preserve the same bounded surface ratio shown in the local preview.

#### Scenario: MVP OrganicTree export
- **WHEN** the current preview uses the fixed MVP `sqrt2-landscape` surface
- **THEN** the PNG dimensions preserve width/height approximately `1.414`

#### Scenario: Future ratio preset export
- **WHEN** a later preview uses another supported bounded ratio preset
- **THEN** the PNG dimensions preserve that current preview ratio
