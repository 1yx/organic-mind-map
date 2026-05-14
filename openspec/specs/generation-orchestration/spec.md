## ADDED Requirements

### Requirement: Generation job orchestration
The backend SHALL orchestrate the full text-or-outline to editable-artifact generation job.

#### Scenario: User submits content-outline-text
- **WHEN** an authenticated user submits `content-outline-text`
- **THEN** the backend parses and validates the content outline before visual reference generation

#### Scenario: User submits natural language
- **WHEN** an authenticated user submits natural language input
- **THEN** the backend calls an LLM to produce a content outline before visual reference generation

#### Scenario: Content outline is ready
- **WHEN** a valid content outline exists
- **THEN** the backend calls GPT-Image-2 to generate a raster reference image and preserves that original image

#### Scenario: Reference image is ready
- **WHEN** GPT-Image-2 returns a reference image
- **THEN** the backend enqueues a CV worker job with the reference image and content outline

### Requirement: Artifact-first job result
Generation jobs SHALL return artifacts and attach them to a product document rather than only returning a flat generated image.

#### Scenario: Job succeeds
- **WHEN** generation and extraction complete
- **THEN** the job result includes the product `documentId`, content outline, reference image, `prediction_omm`, and editable canvas artifact references
- **AND** the product document's `currentEditableSource` points to `prediction_omm` until a user-saved-omm (`user_saved_omm`) exists

#### Scenario: Job fails during extraction
- **WHEN** the CV worker fails or produces incomplete output
- **THEN** the job records a failure state with inspectable partial artifacts and error diagnostics where available
- **AND** the backend does not create a user-visible product document unless a valid `prediction_omm` is assembled

### Requirement: Stage status visibility
The backend SHALL expose job status at the orchestration stage level.

#### Scenario: Client polls job status
- **WHEN** the frontend asks for job status
- **THEN** the backend returns the current stage, such as outline parsing, LLM outlining, image generation, CV extraction, artifact assembly, completed, or failed

#### Scenario: Stage streaming is considered
- **WHEN** Phase 2 needs job progress visibility
- **THEN** polling `GET /api/generation-jobs/:jobId` remains the baseline API
- **AND** any future SSE stream should emit stage events only, not direct editor scene mutations

#### Scenario: External model call fails
- **WHEN** an LLM or GPT-Image-2 call fails
- **THEN** the backend marks the job failed with a retry-safe error and does not fabricate missing artifacts

### Requirement: No image model as engineering truth
The backend SHALL NOT treat GPT-Image-2 output as final editable truth.

#### Scenario: Reference image is generated
- **WHEN** GPT-Image-2 produces a visually strong mind map
- **THEN** the system still runs deterministic extraction, alignment, grouping, and branch reconstruction before showing editable output
