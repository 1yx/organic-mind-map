## ADDED Requirements

### Requirement: Queued worker input contract
The CV worker SHALL consume queued extraction jobs with explicit artifact input and output locations.

#### Scenario: Worker job is received
- **WHEN** a queued extraction job is delivered to a Python CV worker
- **THEN** the job contains a reference image location, content outline location, output location, extraction profile, and generation job ID

#### Scenario: Worker writes outputs
- **WHEN** extraction completes
- **THEN** the worker writes `prediction_omm` plus referenced masks, crops, SVGs, overlays, diagnostics, and debug previews where available
- **AND** the backend imports those files as managed artifacts

### Requirement: Worker is not the product backend
The CV worker SHALL NOT own authentication, quota, payments, user sessions, document lifecycle, or model-generation policy.

#### Scenario: Worker needs input
- **WHEN** the CV worker starts extraction
- **THEN** it uses only the explicit queued job payload and referenced files provided by the TypeScript API backend

#### Scenario: Worker finishes
- **WHEN** the worker returns outputs
- **THEN** it does not directly create product documents or grant artifact access
