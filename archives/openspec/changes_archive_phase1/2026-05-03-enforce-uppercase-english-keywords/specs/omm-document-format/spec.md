## ADDED Requirements

### Requirement: OMM export preserves semantic concept casing
The browser-exported `.omm` document SHALL preserve semantic concept text while storing layout geometry computed from the rendered display label.

#### Scenario: English concept is exported
- **WHEN** the preview exports an `.omm` document containing an English-only concept
- **THEN** the semantic node concept remains the original input text and the layout snapshot reflects the uppercase rendered label
