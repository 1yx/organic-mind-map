## ADDED Requirements

### Requirement: Editable document export
The system SHALL export an editable OMM document from prediction artifacts plus corrections.

#### Scenario: User exports editable document
- **WHEN** the user exports from the canvas
- **THEN** the system writes an editable document containing content outline, canonical branch data, visual groups, text objects, doodle references or embedded assets, and correction state needed to reload the map

#### Scenario: Export is reloaded
- **WHEN** the exported editable document is loaded again
- **THEN** the canvas reconstructs the corrected editable map without rerunning generation or CV extraction

### Requirement: Raster and vector export
The system SHALL support user-facing image export from the corrected editable state.

#### Scenario: User exports PNG
- **WHEN** the user requests PNG export
- **THEN** the system exports the corrected map appearance as a raster image

#### Scenario: User exports SVG
- **WHEN** the user requests SVG export
- **THEN** the system exports vector branch geometry, text, and embedded or referenced doodle assets according to the export policy

### Requirement: Dataset seed export
The system SHALL support exporting Phase 2 artifacts as Phase 3 dataset seeds.

#### Scenario: Dataset export runs
- **WHEN** prediction artifacts and correction artifacts are available
- **THEN** the exporter produces training or evaluation samples containing source image, prediction masks, corrected ground-truth masks, class labels, group relationships, branch centerlines, and metadata

#### Scenario: Object was not confirmed
- **WHEN** an object lacks correction or explicit confirmation
- **THEN** dataset export marks it as prediction-only and does not treat it as ground truth

### Requirement: Debug artifact export
The system SHALL keep debug artifacts accessible for review and regression analysis.

#### Scenario: User or operator exports debug bundle
- **WHEN** a debug export is requested
- **THEN** the bundle includes reference image, content outline, prediction artifact, correction artifact if present, masks, overlays, contact sheets, branch skeleton previews, and extraction logs where available

### Requirement: Ownership and quota-aware export
Export SHALL respect authentication, ownership, and paid entitlement rules.

#### Scenario: User exports own free artifact
- **WHEN** the user's plan permits the requested export type
- **THEN** the system allows export

#### Scenario: User requests gated export
- **WHEN** the requested export type requires a paid entitlement not held by the user
- **THEN** the system blocks the export and presents the upgrade path

