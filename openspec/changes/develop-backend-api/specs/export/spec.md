## ADDED Requirements

### Requirement: OMM artifact export source
The export API SHALL export from an OMM artifact that belongs to the requested product document.

#### Scenario: Explicit source artifact is provided
- **WHEN** a user requests export with `documentId` and `sourceArtifactId`
- **THEN** the backend verifies that the source artifact belongs to that document
- **AND** it rejects mismatched artifact/document pairs

#### Scenario: User exports editable document
- **WHEN** the user exports an editable `.omm`
- **THEN** the backend exports user-saved-omm (`user_saved_omm`) as the normal user-saved editable artifact format

### Requirement: Admin-only debug and dataset exports
The export API SHALL keep debug bundles and Phase 3 dataset seed exports admin-only.

#### Scenario: Admin exports debug bundle
- **WHEN** an admin requests `debug_bundle`
- **THEN** the backend may include reference image, content outline, `prediction_omm`, `correction_omm`, raw masks, overlays, contact sheets, branch skeleton previews, and extraction logs where available

#### Scenario: Non-admin requests dataset seed
- **WHEN** a non-admin requests `phase3_dataset_seed`
- **THEN** the backend rejects the export even if the user owns the source document

### Requirement: No public encrypted share links
The export API SHALL NOT add Excalidraw-style client-encrypted public share links in Phase 2.

#### Scenario: User shares or exports
- **WHEN** Phase 2 export behavior is implemented
- **THEN** document access remains authenticated through backend document and artifact APIs unless a later change explicitly adds public sharing
