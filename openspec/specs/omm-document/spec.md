## ADDED Requirements

### Requirement: Unified OMM document format
The system SHALL use one JSON-backed `.omm` document format for user-saved, prediction-produced, and correction-produced Organic Mind Map documents.

#### Scenario: User-saved OMM is written
- **WHEN** the user saves or exports an editable map
- **THEN** the system writes a JSON-backed `.omm` document instance using the shared OMM document schema

#### Scenario: prediction_omm is written
- **WHEN** the CV worker writes `prediction_omm`
- **THEN** the output is a JSON-backed OMM document instance using the shared OMM document schema, not a separate file format

#### Scenario: correction_omm is written
- **WHEN** the internal correction workflow writes `correction_omm`
- **THEN** the output is a JSON-backed OMM document instance using the shared OMM document schema, not a separate file format

#### Scenario: OMM producer differs
- **WHEN** an OMM document is produced by the user editor, CV pipeline, or correction workflow
- **THEN** the document records producer/provenance metadata so downstream systems can distinguish user-facing, prediction, and correction instances without treating them as different formats

### Requirement: prediction_omm content
The system SHALL produce a stable `prediction_omm` OMM document for every CV extraction run.

#### Scenario: Extraction completes
- **WHEN** the CV worker finishes processing a reference image
- **THEN** it writes a `prediction_omm` containing source metadata, extractor metadata, detected objects, masks, groups, OCR boxes, and branch geometry references

#### Scenario: prediction_omm is loaded by the web app
- **WHEN** the web app loads a `prediction_omm`
- **THEN** it can reconstruct the reference image, extracted layers, editable branch curves, visual groups, and debug overlays without rerunning CV

### Requirement: Stable object identity
OMM documents SHALL assign stable IDs to all extracted or editable objects that may be referenced by groups, corrections, masks, exports, or training data.

#### Scenario: Object is emitted
- **WHEN** an OMM document includes a branch, subbranch, text box, doodle, group, mask, or crop
- **THEN** the object has a stable unique ID scoped to the document

#### Scenario: Objects are related
- **WHEN** a group, branch, text classification, or correction references another OMM object
- **THEN** it references the object's stable ID rather than duplicating ambiguous spatial descriptions

### Requirement: Branch as BOI
OMM documents SHALL treat each top-level `branch` as a BOI (Basic Ordering Idea).

#### Scenario: Top-level branch is stored
- **WHEN** an OMM document stores a top-level branch growing from the center
- **THEN** that `branch` is the BOI-level organizing concept and does not require a separate `boi: true` flag

#### Scenario: BOI ordering is displayed
- **WHEN** the map visually shows a number or marker for a top-level branch
- **THEN** the renderer derives that marker from the stable branch `id` instead of reading a separate `orderLabel` field

#### Scenario: Branch display order differs from stable ID marker
- **WHEN** an OMM document stores branch ordering
- **THEN** it keeps stable `id` and layout/read `displayOrder` as separate values

#### Scenario: Branch is reordered
- **WHEN** a user changes the visual or reading order of a branch
- **THEN** the OMM document updates `displayOrder` without changing the branch `id`

#### Scenario: OMM is rebuilt from reordered content-outline-text
- **WHEN** a new OMM document is created or rebuilt from reordered `content-outline-text`
- **THEN** top-level branch IDs may be reassigned from the `content-outline-text` list order, changing the ID-derived BOI marker in the rebuilt document

#### Scenario: content-outline-text is edited in Phase 2 source panel
- **WHEN** the user edits the `content-outline-text` order in the Phase 2 left-bottom source panel
- **THEN** the existing canvas does not immediately reflow, mutate branch IDs, or update `displayOrder`; live `content-outline-text`-to-canvas reflow is deferred to Phase 3

### Requirement: Blank branch support
OMM documents SHALL support blank organic branches and subbranches without requiring text.

#### Scenario: Blank branch is created
- **WHEN** the user or system creates a branch as a blank line for future association
- **THEN** the OMM document stores the branch with stable ID, parent relationship, centerline, width profile, color inheritance, and no required concept text

#### Scenario: Blank branch is rendered
- **WHEN** the renderer encounters a branch or subbranch without concept text
- **THEN** it still renders the organic tapered branch geometry without creating a boxed placeholder or forcing text

#### Scenario: Blank branch later receives text
- **WHEN** the user adds a concept to a blank branch
- **THEN** the OMM document updates the branch concept while preserving the existing branch identity and geometry

### Requirement: Cloud boundary support
OMM documents SHALL support cloud-like boundaries around complete branch chunks.

#### Scenario: Cloud boundary is attached to a branch chunk
- **WHEN** a user or system adds a cloud boundary around a branch system or subbranch group
- **THEN** the OMM document stores a stable boundary object referencing the branch/subbranch root and included member object IDs

#### Scenario: Cloud boundary is rendered
- **WHEN** the renderer encounters a cloud boundary object
- **THEN** it renders a cloud-like enclosure rather than a generic rectangular node or card

#### Scenario: Branch chunk moves or changes
- **WHEN** the enclosed branch chunk changes geometry or membership
- **THEN** the cloud boundary can be recomputed from its member references or explicit outline geometry without losing its stable identity

### Requirement: Nonlinear association lines
OMM documents SHALL support independent nonlinear association lines between existing map objects.

#### Scenario: Association line connects two objects
- **WHEN** the user or system creates a nonlinear association between two concepts, doodles, groups, branches, or subbranches
- **THEN** the OMM document stores an association line object with stable ID, source object ID, target object ID, direction, geometry, and style

#### Scenario: Association line is not tree hierarchy
- **WHEN** an association line connects objects from different branches or distant parts of the same branch
- **THEN** the connection does not change parent/child `branch` or `subbranch` relationships

#### Scenario: Association line is rendered
- **WHEN** the renderer encounters an association line object
- **THEN** it renders a visually distinct thin line, curve, dashed/dotted pattern, arrowhead, or other independent style rather than a tapered organic branch

#### Scenario: Association endpoint moves
- **WHEN** a referenced source or target object moves
- **THEN** the association line can update its endpoint anchors while preserving its stable identity and relationship metadata

### Requirement: Source and extractor metadata
`prediction_omm` SHALL record enough metadata to reproduce and compare extraction results.

#### Scenario: Source image is recorded
- **WHEN** `prediction_omm` is written
- **THEN** it includes source image path or URI, image width, image height, and content outline reference or embedded outline

#### Scenario: Extractor version is recorded
- **WHEN** `prediction_omm` is written
- **THEN** it includes extractor name, version, profile, and relevant parameter values used for the run

### Requirement: Mask and debug references
`prediction_omm` SHALL reference generated image artifacts by path or URI.

#### Scenario: Masks are produced
- **WHEN** extraction produces branch-system, branch-segment, asset, asset-group, text, or unassigned text masks
- **THEN** `prediction_omm` records their explicit mask classes, file references, and associated object IDs

#### Scenario: Debug overlays are produced
- **WHEN** extraction produces contact sheets, overlays, skeleton previews, group previews, or coverage diffs
- **THEN** `prediction_omm` records those debug references for inspection in the web UI

### Requirement: OCR box representation
`prediction_omm` SHALL store OCR detections with text content and geometry.

#### Scenario: OCR detects text
- **WHEN** PaddleOCR or another approved OCR engine detects text
- **THEN** `prediction_omm` stores `id`, `bbox`, recognized `text`, `score`, and text classification if available

#### Scenario: OCR is unavailable
- **WHEN** extraction runs without OCR
- **THEN** `prediction_omm` still remains valid and records that OCR results are unavailable

### Requirement: correction_omm content
The system SHALL record internal/admin corrections in a `correction_omm` OMM document, separately from the original `prediction_omm` instance.

#### Scenario: Admin corrects extraction output
- **WHEN** an operator or admin confirms, relabels, moves, reshapes, merges, splits, paints, erases, attaches, or detaches an extracted object
- **THEN** the system records the operation in `correction_omm` without mutating the original `prediction_omm`

#### Scenario: Corrected result is reconstructed
- **WHEN** the system loads a `prediction_omm` plus its `correction_omm`
- **THEN** it reconstructs the corrected internal truth state for review, benchmarking, or dataset export

### Requirement: Correction operations
`correction_omm` SHALL use explicit operation types for internal human edits.

#### Scenario: Supported operation is recorded
- **WHEN** an operator performs a correction
- **THEN** the operation type is one of `confirm`, `relabel`, `merge`, `split`, `erase`, `paint`, `attach`, `detach`, `move`, or `reshape_centerline`

#### Scenario: Operation targets an object
- **WHEN** an operation modifies an extracted object
- **THEN** the operation records the previous object ID, target object ID, final object ID where applicable, timestamp, and tool source

### Requirement: Training-ready correction data
`correction_omm` SHALL preserve enough information to become Phase 3 training or evaluation data.

#### Scenario: Mask is corrected
- **WHEN** an operator paints, erases, merges, or splits a mask
- **THEN** `correction_omm` records the final corrected mask reference and final class label

#### Scenario: Branch centerline is corrected
- **WHEN** an operator edits an editable branch curve
- **THEN** `correction_omm` records the corrected centerline and width-profile-relevant values

#### Scenario: Group membership is corrected
- **WHEN** an operator attaches or detaches text or doodles from a visual group
- **THEN** `correction_omm` records the final group membership by object ID

### Requirement: Confirmed-correct state
`correction_omm` SHALL distinguish unreviewed predictions from admin-confirmed objects.

#### Scenario: Admin confirms an object
- **WHEN** an operator explicitly marks an object as correct
- **THEN** `correction_omm` records `confirmed: true` for that final object state

#### Scenario: Object has not been reviewed
- **WHEN** no correction or confirmation exists for an object
- **THEN** downstream dataset export treats the object as prediction-only, not ground truth
