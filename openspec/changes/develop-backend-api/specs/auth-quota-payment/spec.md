## ADDED Requirements

### Requirement: Stable backend error envelope
The backend SHALL return stable API error codes for auth, quota, validation, stale save, cancellation, provider, worker, and artifact failures.

#### Scenario: Quota is exhausted
- **WHEN** an authenticated user starts generation without available quota or entitlement
- **THEN** the backend rejects the request with `quota_exhausted` or `rate_limited`

#### Scenario: Save is stale
- **WHEN** a user saves user-saved-omm (`user_saved_omm`) with an outdated `baseArtifactId`
- **THEN** the backend rejects the save with `stale_document`

#### Scenario: Provider fails
- **WHEN** an LLM or GPT-Image-2 provider fails
- **THEN** the backend returns a stable `provider_failed` error without leaking provider-specific internals as product API contracts

#### Scenario: Worker fails
- **WHEN** a CV worker job fails
- **THEN** the backend returns or records a stable `worker_failed` error with retry-safe diagnostics where available

### Requirement: Admin-only internal extraction artifacts
The backend SHALL keep raw mask content, debug bundles, dataset seed exports, and `correction_omm` admin-only by default.

#### Scenario: Non-admin requests raw mask content
- **WHEN** a non-admin user requests raw mask artifact content
- **THEN** the backend denies access even if the user can read a `prediction_omm` that references the mask

#### Scenario: Frontend reads prediction_omm
- **WHEN** the frontend reads `prediction_omm` for editor initialization
- **THEN** the backend may return mask references and provenance metadata
- **AND** raw mask artifact content remains protected by admin-only authorization

#### Scenario: Non-admin requests debug bundle
- **WHEN** a non-admin user requests `debug_bundle` or `phase3_dataset_seed`
- **THEN** the backend rejects the request even if the user owns the document
