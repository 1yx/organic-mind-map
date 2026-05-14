## ADDED Requirements

### Requirement: Editable document export
The system SHALL export user-saved-omm (`user_saved_omm`) as the final editable Organic Mind Map file.

#### Scenario: User exports editable document
- **WHEN** the user exports from the canvas
- **THEN** the system writes a JSON-backed `.omm` document containing content outline, canonical branch data, visual groups, text objects, doodle references or embedded assets, and the current editable map state needed to reload the map

#### Scenario: Export is reloaded
- **WHEN** the exported `.omm` document is loaded again
- **THEN** the canvas reconstructs the editable map without rerunning generation or CV extraction

#### Scenario: Public encrypted share link is requested
- **WHEN** Phase 2 export and sharing behavior is implemented
- **THEN** the system does not add Excalidraw-style client-encrypted public share links as part of the baseline scope
- **AND** document access remains authenticated through the backend API unless a later change explicitly adds public sharing

### Requirement: Raster and vector export
The system SHALL support user-facing image export by rendering from user-saved-omm (`user_saved_omm`).

#### Scenario: User exports PNG
- **WHEN** the user requests PNG export
- **THEN** the system renders the current `.omm` map state and exports it as a raster image

#### Scenario: User exports SVG
- **WHEN** the user requests SVG export
- **THEN** the system renders the current `.omm` map state and exports vector branch geometry, text, and embedded or referenced doodle assets according to the export policy

### Requirement: Dataset seed export
The system SHALL support admin-only exporting of Phase 2 artifacts as Phase 3 dataset seeds.

#### Scenario: Dataset export runs
- **WHEN** an admin requests dataset export and `prediction_omm` and `correction_omm` are available
- **THEN** the exporter produces training or evaluation samples containing source image, prediction masks, corrected ground-truth masks, class labels, group relationships, branch centerlines, and metadata

#### Scenario: Object was not confirmed
- **WHEN** an object lacks correction or explicit confirmation
- **THEN** dataset export marks it as prediction-only and does not treat it as ground truth

### Requirement: Debug artifact export
The system SHALL keep debug artifacts accessible to admins for review and regression analysis.

#### Scenario: Admin exports debug bundle
- **WHEN** an admin debug export is requested
- **THEN** the bundle includes reference image, content outline, `prediction_omm`, `correction_omm` if present, masks, overlays, contact sheets, branch skeleton previews, and extraction logs where available

### Requirement: Ownership and quota-aware export
Export SHALL respect authentication, ownership, paid entitlement, and admin-only export rules.

#### Scenario: User exports own free artifact
- **WHEN** the user's plan permits the requested export type
- **THEN** the system allows export

#### Scenario: User requests gated export
- **WHEN** the requested export type requires a paid entitlement not held by the user
- **THEN** the system blocks the export and presents the upgrade path

#### Scenario: Non-admin requests debug or dataset export
- **WHEN** a non-admin requests `debug_bundle` or `phase3_dataset_seed`
- **THEN** the system rejects the export even if the user owns the document
