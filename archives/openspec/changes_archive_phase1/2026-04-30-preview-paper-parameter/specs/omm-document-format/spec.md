## MODIFIED Requirements

### Requirement: JSON OMM document boundary
The system SHALL define `.omm` as a JSON document that represents exactly one organic mind map on one bounded surface.

#### Scenario: Valid document envelope
- **WHEN** a document includes `id`, `version: 1`, `title`, `surface`, `organicSeed`, `rootMap`, `layout`, `assets`, and `meta`
- **THEN** the document is recognized as an `.omm` candidate for schema validation

#### Scenario: Multiple maps are provided
- **WHEN** a document attempts to store multiple root maps or a collection of maps
- **THEN** validation fails because one `.omm` represents one bounded-surface mind map

### Requirement: Landscape A3 or A4 paper
The system SHALL NOT require MVP `.omm` documents to use A3 or A4 paper specs; MVP documents SHALL store a bounded surface ratio.

#### Scenario: MVP surface ratio
- **WHEN** `surface.preset` is `sqrt2-landscape` with width/height approximately `1.414`
- **THEN** surface validation succeeds

#### Scenario: Unsupported physical paper kind
- **WHEN** a Phase 1 `.omm` document relies on `paper.kind`, `widthMm`, or `heightMm` as the canonical preview surface
- **THEN** validation rejects it as non-canonical for MVP surface storage

#### Scenario: Unsupported surface preset
- **WHEN** `surface.preset` is not supported by the current document schema
- **THEN** validation fails with an error pointing to `surface.preset`

### Requirement: Browser-computed layout snapshot
The system SHALL persist browser-computed layout geometry in Phase 1 `.omm` exports.

#### Scenario: Layout snapshot exists
- **WHEN** a browser-exported `.omm` contains `layout` with surface viewport, center layout, node layouts, and branch layouts
- **THEN** the document can reproduce the exported bounded surface without rerunning layout from raw logic alone

#### Scenario: Layout references unknown node
- **WHEN** `layout.nodes` or `layout.branches` references a node ID that is absent from the nested semantic tree
- **THEN** validation fails with an error pointing to the layout reference

#### Scenario: Branch path is missing
- **WHEN** a renderable branch layout omits its SVG branch path or text path
- **THEN** validation fails because the exported surface geometry is incomplete
