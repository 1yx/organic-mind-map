## ADDED Requirements

### Requirement: SSO authentication
The system SHALL support SSO authentication before user-specific generation.

#### Scenario: Anonymous user opens homepage
- **WHEN** an anonymous user visits the homepage
- **THEN** the user can view the app-first onboarding canvas without starting a paid generation job

#### Scenario: Anonymous user starts generation
- **WHEN** an anonymous user attempts to generate a new map
- **THEN** the system prompts for login through supported SSO providers

#### Scenario: Supported SSO provider is used
- **WHEN** a user authenticates through Google or OpenAI SSO
- **THEN** the system creates or resolves the user account for quota tracking and artifact ownership

### Requirement: Generation quota
The system SHALL track generation quota because model and CV execution have hard compute costs.

#### Scenario: Logged-in user has trial quota
- **WHEN** a logged-in user starts a generation job and has remaining trial quota
- **THEN** the system allows the job and decrements or reserves quota according to the quota policy

#### Scenario: Logged-in user has no remaining quota
- **WHEN** a logged-in user starts a generation job after exhausting quota
- **THEN** the system blocks the generation job and presents the payment or upgrade path

### Requirement: Payment gating
The system SHALL integrate a payment provider for paid quota or paid plan access.

#### Scenario: User purchases quota or plan
- **WHEN** the payment provider confirms a successful payment
- **THEN** the system updates the user's entitlement or quota before allowing further paid generation

#### Scenario: Payment is not confirmed
- **WHEN** payment is canceled, fails, or remains unconfirmed
- **THEN** the system does not grant paid quota

### Requirement: Quota-safe job creation
Generation job creation SHALL be authorization and quota aware.

#### Scenario: Backend receives generation request
- **WHEN** a request asks to create a generation job
- **THEN** the backend verifies authentication, quota or entitlement, and ownership before dispatching external model calls or CV work

#### Scenario: Artifact access is requested
- **WHEN** a user requests generated artifacts
- **THEN** the backend verifies that the user owns or is authorized to access those artifacts

#### Scenario: Raw mask content is requested
- **WHEN** a non-admin user requests raw mask artifact content
- **THEN** the backend denies access even if `prediction_omm` metadata references that mask

### Requirement: Stable API errors
The backend SHALL normalize auth, quota, validation, cancellation, stale-save, provider, worker, and artifact failures into stable API error codes.

#### Scenario: User exceeds quota
- **WHEN** a user starts generation without available quota or entitlement
- **THEN** the backend rejects the request with `quota_exhausted` or `rate_limited`

#### Scenario: Save is based on stale artifact
- **WHEN** a user saves user-saved-omm (`user_saved_omm`) with an outdated `baseArtifactId`
- **THEN** the backend rejects the save with `stale_document`

#### Scenario: User cancels generation
- **WHEN** a queued or running generation job is canceled
- **THEN** the backend records `job_canceled` without treating it as an internal provider or worker failure
