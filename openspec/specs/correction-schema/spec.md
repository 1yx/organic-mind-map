## ADDED Requirements

### Requirement: Correction artifact schema
The system SHALL record user corrections separately from prediction artifacts.

#### Scenario: User edits extraction output
- **WHEN** a user confirms, relabels, moves, reshapes, merges, splits, paints, erases, attaches, or detaches an extracted object
- **THEN** the system records the operation in a correction artifact without mutating the original prediction artifact

#### Scenario: Corrected result is reconstructed
- **WHEN** the system loads a prediction artifact plus its correction artifact
- **THEN** it reconstructs the current corrected editable document state

### Requirement: Correction operations
The correction artifact SHALL use explicit operation types for human edits.

#### Scenario: Supported operation is recorded
- **WHEN** the user performs a correction
- **THEN** the operation type is one of `confirm`, `relabel`, `merge`, `split`, `erase`, `paint`, `attach`, `detach`, `move`, or `reshape_centerline`

#### Scenario: Operation targets an object
- **WHEN** an operation modifies an extracted object
- **THEN** the operation records the previous object ID, target object ID, final object ID where applicable, timestamp, and tool source

### Requirement: Training-ready correction data
The correction artifact SHALL preserve enough information to become Phase 3 training or evaluation data.

#### Scenario: Mask is corrected
- **WHEN** a user paints, erases, merges, or splits a mask
- **THEN** the correction artifact records the final corrected mask reference and final class label

#### Scenario: Branch centerline is corrected
- **WHEN** a user edits an editable branch curve
- **THEN** the correction artifact records the corrected centerline and width-profile-relevant values

#### Scenario: Group membership is corrected
- **WHEN** a user attaches or detaches text or doodles from a visual group
- **THEN** the correction artifact records the final group membership by object ID

### Requirement: Confirmed-correct state
The correction artifact SHALL distinguish unreviewed predictions from user-confirmed objects.

#### Scenario: User confirms an object
- **WHEN** a user explicitly marks an object as correct
- **THEN** the correction artifact records `confirmed: true` for that final object state

#### Scenario: User has not reviewed an object
- **WHEN** no correction or confirmation exists for an object
- **THEN** downstream dataset export treats the object as prediction-only, not ground truth

