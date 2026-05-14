## ADDED Requirements

### Requirement: Product document lifecycle container
The backend SHALL represent user-visible map lifecycle with a product `document` record rather than treating a single OMM artifact as the document.

#### Scenario: Generated document is created
- **WHEN** generation completes with a valid `prediction_omm`
- **THEN** the backend creates a product document with lifecycle `generated`
- **AND** `currentEditableSource` points to `prediction_omm`

#### Scenario: User saves editor state
- **WHEN** the user saves a complete user-saved-omm (`user_saved_omm`)
- **THEN** the backend stores it as an artifact linked to the product document
- **AND** the document lifecycle becomes `saved`
- **AND** `currentEditableSource` points to `user_saved_omm`

#### Scenario: Document is archived
- **WHEN** a user archives a document
- **THEN** the backend sets lifecycle `archived` without deleting linked artifacts by default

### Requirement: Correction does not mutate user document state
Admin correction data SHALL remain internal and SHALL NOT change the user-visible document lifecycle or current user-saved-omm.

#### Scenario: Admin correction is saved
- **WHEN** an admin creates or updates `correction_omm`
- **THEN** the backend links it to the product document for internal use
- **AND** the document lifecycle remains unchanged
- **AND** the user's current user-saved-omm remains unchanged

### Requirement: Shared OMM format with producer distinction
The system SHALL use one JSON-backed OMM format for `prediction_omm`, user-saved-omm (`user_saved_omm`), and `correction_omm`.

#### Scenario: OMM instance is stored
- **WHEN** the backend stores an OMM artifact
- **THEN** it records producer/provenance metadata that distinguishes prediction, user editor, and admin correction instances without treating them as separate file formats
