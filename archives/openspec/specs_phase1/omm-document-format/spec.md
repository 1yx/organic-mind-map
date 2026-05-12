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

### Requirement: JSON OMM document boundary
The system SHALL define `.omm` as a JSON document that represents exactly one organic mind map on one bounded surface.

#### Scenario: Valid document envelope
- **WHEN** a document includes `id`, `version: 1`, `title`, `surface`, `organicSeed`, `rootMap`, `layout`, `assets`, and `meta`
- **THEN** the document is recognized as an `.omm` candidate for schema validation

#### Scenario: Multiple maps are provided
- **WHEN** a document attempts to store multiple root maps or a collection of maps
- **THEN** validation fails because one `.omm` represents one bounded-surface mind map

### Requirement: Bounded surface ratio
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

### Requirement: Center visual object
The system SHALL require a center visual object instead of a plain center text string.

#### Scenario: Phase 1 compliant center visual
- **WHEN** `rootMap.center` includes a supported image or visual-symbol `mode` and `complianceState: "compliant"`
- **THEN** validation accepts the center visual when referenced built-in or self-contained approved assets are valid, even if the controlled SVG source was single-color

#### Scenario: Missing center visual
- **WHEN** `rootMap.center` is missing or only represented as a plain string
- **THEN** validation fails with an error pointing to `rootMap.center`

#### Scenario: External svgUrl is used as final visual truth
- **WHEN** a browser-exported `.omm` stores only an external `svgUrl` as the center visual asset
- **THEN** validation rejects it because `.omm` must reopen with images intact without network dependency

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

#### Scenario: English concept is exported
- **WHEN** the preview exports an `.omm` document containing an English-only concept
- **THEN** the semantic node concept remains the original input text and the layout snapshot reflects the uppercase rendered label

### Requirement: Stable organic seed
The system SHALL store a document-level `organicSeed` so repeated rendering of the same `.omm` can produce stable organic variation. A missing or empty `organicSeed` is repairable only when a complete layout snapshot is present, because the validator can derive a deterministic seed without recomputing layout or changing saved geometry.

#### Scenario: Organic seed exists
- **WHEN** `organicSeed` is present and non-empty
- **THEN** rendering can use it for deterministic branch variation

#### Scenario: Organic seed is missing with layout snapshot
- **WHEN** `organicSeed` is missing or empty and the document contains a complete layout snapshot
- **THEN** validation or repair backfills a deterministic seed from document content without relayout and without changing saved coordinates or paths

#### Scenario: Organic seed is missing without layout snapshot
- **WHEN** `organicSeed` is missing or empty and the document does not contain a complete layout snapshot
- **THEN** validation fails with an error pointing to `organicSeed`

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

#### Scenario: Controlled SVG was loaded before export
- **WHEN** the browser exports a document after a controlled SVG was loaded and passed safety checks
- **THEN** the exported document stores an approved self-contained center visual asset or a deterministic built-in fallback rather than relying on the original external URL

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
