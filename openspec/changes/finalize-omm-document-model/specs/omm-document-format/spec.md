## ADDED Requirements

### Requirement: Phase 1 persisted document model is canonical
The system SHALL implement the Phase 1 `.omm` schema as a nested semantic tree with browser-computed layout snapshot and SHALL keep runtime topology helpers out of persisted documents.

#### Scenario: Browser exports canonical document
- **WHEN** the Web preview exports an `.omm` document from a rendered OrganicTree
- **THEN** the document contains `surface`, `organicSeed`, `rootMap.children`, `layout`, `assets`, and `meta` in the canonical Phase 1 shape

#### Scenario: Runtime topology fields are rejected
- **WHEN** `.omm` validation receives a node with `parentId`, `childIds`, a flat `nodes` source of truth, or `displayText`
- **THEN** validation fails with a path-specific error instead of accepting the runtime artifact

#### Scenario: Renderer reloads exported document
- **WHEN** the renderer receives a valid exported `.omm` document
- **THEN** it renders from the saved semantic tree and layout snapshot without requiring editor state
