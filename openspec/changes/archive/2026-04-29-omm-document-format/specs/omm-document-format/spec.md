## ADDED Requirements

### Requirement: JSON OMM document boundary
The system SHALL define `.omm` as a JSON document that represents exactly one organic mind map on one paper.

#### Scenario: Valid document envelope
- **WHEN** a document includes `id`, `version: 1`, `title`, `paper`, `organicSeed`, `rootMap`, `layout`, `assets`, and `meta`
- **THEN** the document is recognized as an `.omm` candidate for schema validation

#### Scenario: Multiple maps are provided
- **WHEN** a document attempts to store multiple root maps or a collection of maps
- **THEN** validation fails because one `.omm` represents one paper mind map

### Requirement: Landscape A3 or A4 paper
The system SHALL restrict MVP `.omm` paper specs to A3 landscape or A4 landscape.

#### Scenario: A3 landscape paper
- **WHEN** `paper.kind` is `a3-landscape` with canonical 420 x 297 mm dimensions
- **THEN** paper validation succeeds

#### Scenario: Unsupported paper kind
- **WHEN** `paper.kind` is not `a3-landscape` or `a4-landscape`
- **THEN** validation fails with an error pointing to `paper.kind`

### Requirement: Center visual object
The system SHALL require a center visual object instead of a plain center text string.

#### Scenario: Phase 1 compliant center visual
- **WHEN** `rootMap.center` includes a supported image or visual-symbol `mode` and `complianceState: "compliant"`
- **THEN** validation accepts the center visual when referenced built-in assets are valid, even if the SVG is single-color

#### Scenario: Missing center visual
- **WHEN** `rootMap.center` is missing or only represented as a plain string
- **THEN** validation fails with an error pointing to `rootMap.center`

### Requirement: One-way nested tree model
The system SHALL store semantic mind map structure as a one-way nested tree using `children` arrays and stable node IDs.

#### Scenario: Valid nested tree
- **WHEN** `rootMap.children` contains nodes and each node may contain an ordered `children` array
- **THEN** validation preserves the nested structure and sibling order

#### Scenario: Duplicate node ID
- **WHEN** the same node ID appears more than once anywhere in the nested tree
- **THEN** validation fails with an error pointing to the duplicated node ID

#### Scenario: Runtime pointer fields are persisted
- **WHEN** a persisted node contains `parentId`, `childIds`, or the document stores a flat `nodes` dictionary as the source of truth
- **THEN** validation rejects the redundant runtime topology fields for Phase 1 `.omm`

### Requirement: Node content fields
The system SHALL store renderable concept units as semantic content without persisting runtime display strings.

#### Scenario: Concept is present
- **WHEN** a node includes a non-empty `concept`
- **THEN** validation accepts the concept as the renderable semantic text

#### Scenario: Concept is missing
- **WHEN** a node omits `concept` or provides an empty `concept`
- **THEN** validation fails with an error pointing to the node concept

#### Scenario: Display text is persisted
- **WHEN** a node includes `displayText`, ellipsis text, truncation text, or another rendered display string
- **THEN** validation rejects that field because display text is a runtime ViewModel concern

### Requirement: Stable organic seed
The system SHALL store a document-level `organicSeed` so repeated rendering of the same `.omm` can produce stable organic variation.

#### Scenario: Organic seed exists
- **WHEN** `organicSeed` is present and non-empty
- **THEN** rendering can use it for deterministic branch variation

#### Scenario: Organic seed is missing
- **WHEN** `organicSeed` is missing or empty
- **THEN** validation fails with an error pointing to `organicSeed`

### Requirement: Browser-computed layout snapshot
The system SHALL persist browser-computed layout geometry in Phase 1 `.omm` exports.

#### Scenario: Layout snapshot exists
- **WHEN** a browser-exported `.omm` contains `layout` with viewport, center layout, node layouts, and branch layouts
- **THEN** the document can reproduce the exported paper without rerunning layout from raw logic alone

#### Scenario: Layout references unknown node
- **WHEN** `layout.nodes` or `layout.branches` references a node ID that is absent from the nested semantic tree
- **THEN** validation fails with an error pointing to the layout reference

#### Scenario: Branch path is missing
- **WHEN** a renderable branch layout omits its SVG branch path or text path
- **THEN** validation fails because the exported paper geometry is incomplete

### Requirement: Built-in asset references
The system SHALL store built-in templates and built-in visual assets by stable ID rather than embedding their binary data into every `.omm`.

#### Scenario: Built-in asset reference
- **WHEN** an image asset has `source: "builtin"` and a known `builtinId`
- **THEN** validation accepts the asset without requiring embedded `data`

#### Scenario: Unknown built-in asset reference
- **WHEN** an image asset has `source: "builtin"` and a `builtinId` that is not in the Phase 1 built-in asset registry
- **THEN** validation fails with a path-specific unknown built-in asset error

#### Scenario: Built-in asset embeds duplicated data
- **WHEN** an image asset has `source: "builtin"` and also stores unnecessary embedded payload data
- **THEN** validation rejects the asset as non-canonical for Phase 1 `.omm`

### Requirement: No uploaded asset embedding in Phase 1
The system SHALL NOT support uploaded custom image assets, generated image payloads, or Base64 image embedding in Phase 1 `.omm` files.

#### Scenario: Uploaded asset is present
- **WHEN** an image asset has `source: "uploaded"` or includes embedded image `data`
- **THEN** validation rejects the document for Phase 1

#### Scenario: Generated asset payload is present
- **WHEN** an image asset has `source: "generated"` or includes generated image payload data
- **THEN** validation rejects the document for Phase 1

### Requirement: External references are simple optional links
The system SHALL allow simple external file references without providing reference protection, automatic repair, or source traceability.

#### Scenario: Optional external reference exists
- **WHEN** a document or node includes a simple external reference path
- **THEN** validation preserves it as an optional link

#### Scenario: External reference is absent
- **WHEN** no external references are present
- **THEN** validation still accepts the document if required rendering data is valid

### Requirement: Plus and editor state exclusion
The system SHALL NOT store Plus service metadata, cloud state, editor interaction state, source snapshots, source object mappings, or product-internal submap navigation state in Phase 1 `.omm` files.

#### Scenario: Editor selection state is present
- **WHEN** a document includes editor selection, drag session, or undo stack state
- **THEN** validation rejects or strips that state before saving a Phase 1 `.omm`

#### Scenario: Plus metadata is present
- **WHEN** a document includes cloud permissions, RAG indexes, version history metadata, or Plus service metadata
- **THEN** validation rejects or strips that state before saving a Phase 1 `.omm`

### Requirement: Local actionable validation errors
The system SHALL validate `.omm` documents locally and return actionable errors for malformed documents.

#### Scenario: Missing required field
- **WHEN** validation finds a missing required field
- **THEN** the error includes the field path and concise reason

#### Scenario: Missing referenced asset
- **WHEN** a center visual or node references an asset ID that is absent from `assets`
- **THEN** validation fails with an error pointing to the missing asset reference
