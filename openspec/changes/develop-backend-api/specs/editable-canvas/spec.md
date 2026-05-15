## ADDED Requirements

### Requirement: Current editable source loading
The frontend SHALL load editable map state through the product document's `currentEditableSource`.

#### Scenario: Generated document has no user save
- **WHEN** the frontend opens a document whose `currentEditableSource.kind` is `prediction_omm`
- **THEN** it initializes the editable canvas from the referenced `prediction_omm`

#### Scenario: User saved document exists
- **WHEN** the frontend opens a document whose `currentEditableSource.kind` is `user_saved_omm`
- **THEN** it loads the saved editable map state instead of reinitializing from `prediction_omm`

### Requirement: Browser-owned unsaved edits
The frontend SHALL keep unsaved canvas edits in browser memory and optional browser local draft storage.

#### Scenario: User edits canvas objects
- **WHEN** the user edits branches, subbranches, text, assets, groups, association lines, or cloud boundaries
- **THEN** the frontend updates browser-owned editor state
- **AND** the backend does not receive per-object edit patches in Phase 2

#### Scenario: User saves
- **WHEN** the user explicitly saves the map
- **THEN** the frontend sends a complete user-saved-omm (`user_saved_omm`) snapshot to `PUT /api/documents/:documentId/current-omm`

#### Scenario: Browser reloads
- **WHEN** a local draft exists for the current document
- **THEN** the frontend may offer draft recovery without treating the draft as `.omm` history or a backend document revision

### Requirement: No Phase 2 collaboration protocol
The editable canvas SHALL NOT introduce real-time collaboration protocols in Phase 2.

#### Scenario: Collaboration is considered
- **WHEN** Phase 2 canvas work begins
- **THEN** the implementation avoids WebSocket scene sync, remote cursors, shared-room presence, and collaborative merge behavior
