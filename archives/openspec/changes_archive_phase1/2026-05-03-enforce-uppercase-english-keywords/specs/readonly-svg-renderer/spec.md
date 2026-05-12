## ADDED Requirements

### Requirement: English concepts render uppercase by default
The renderer SHALL display English-only branch concept labels in uppercase while preserving the semantic concept text in input data.

#### Scenario: English concept renders
- **WHEN** an OrganicTree branch concept is English-only text
- **THEN** the branch text emitted in SVG is uppercase

#### Scenario: Measurement uses rendered label
- **WHEN** the renderer measures an English-only concept for branch length
- **THEN** it measures the uppercase display label that will be emitted in SVG

#### Scenario: Mixed concept renders
- **WHEN** an OrganicTree branch concept contains mixed-language text
- **THEN** the renderer preserves the concept casing rather than applying an English-only uppercase transform
