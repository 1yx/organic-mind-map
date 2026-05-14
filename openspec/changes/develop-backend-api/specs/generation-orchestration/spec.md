## ADDED Requirements

### Requirement: Document-backed generation completion
The backend SHALL create a product document only after a generation job has assembled a valid `prediction_omm`.

#### Scenario: Generation succeeds
- **WHEN** generation and CV extraction complete with a valid `prediction_omm`
- **THEN** the backend creates or attaches a product `document`
- **AND** the document references the content outline, reference image, and `prediction_omm` artifacts
- **AND** the job response includes `documentId`

#### Scenario: Generation fails before prediction_omm
- **WHEN** generation or extraction fails before a valid `prediction_omm` is assembled
- **THEN** the backend records the generation job as failed
- **AND** the backend does not create a user-visible product document
- **AND** any partial artifacts remain admin/debug evidence rather than normal user documents

### Requirement: Queue-based CV dispatch
The backend SHALL dispatch Python CV extraction through a queue-based worker interface.

#### Scenario: Reference image is ready
- **WHEN** the backend has a reference image, content outline, extraction profile, job ID, and output location
- **THEN** it enqueues a CV extraction job with those inputs
- **AND** it does not call the CV worker directly from the browser or require a synchronous request/response worker call

#### Scenario: Worker completes
- **WHEN** the queued CV worker writes `prediction_omm` and artifact outputs
- **THEN** the backend imports those outputs into managed artifacts
- **AND** it advances the generation job to artifact assembly or completed state

### Requirement: Polling-first job visibility
The backend SHALL expose generation progress through polling-first job status APIs.

#### Scenario: Client polls job status
- **WHEN** the frontend calls `GET /api/generation-jobs/:jobId`
- **THEN** the backend returns the current job status, stage events, artifact references where available, diagnostics, and `documentId` after successful completion

#### Scenario: Streaming is added later
- **WHEN** a future implementation adds SSE for progress
- **THEN** the stream emits job/stage events only
- **AND** it does not mutate the editor scene directly
