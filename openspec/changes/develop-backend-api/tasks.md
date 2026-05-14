## 1. Backend Package Foundation

- [x] 1.1 Create or wire the `@omm/api` package/service entrypoint in the workspace.
- [x] 1.2 Add backend configuration loading for auth/session, storage, queue, model providers, payment provider, and worker settings.
- [x] 1.3 Define shared API response envelopes, stable error codes, and HTTP error mapping utilities.
- [x] 1.4 Add request ID generation and structured logging for API requests, jobs, worker messages, and artifact operations.

## 2. Storage And Domain Models

- [x] 2.1 Define persistence models for users, sessions/accounts, quota balances, quota reservations, generation jobs, product documents, artifacts, export jobs, and admin corrections.
- [x] 2.2 Implement artifact metadata records with kind, MIME type, byte size, content hash, owner, job/document linkage, access policy, and cache policy.
- [x] 2.3 Implement product document records with lifecycle `generated`, `saved`, and `archived`.
- [x] 2.4 Implement `currentEditableSource` resolution: prefer `user_saved_omm`, otherwise use `prediction_omm`.
- [x] 2.5 Ensure `correction_omm` linkage does not mutate user-visible document lifecycle or current `user_saved_omm`.

## 3. Auth, Quota, And Payment Boundary

- [x] 3.1 Implement session endpoint and authentication guard for generation, document, artifact, export, and admin routes.
- [x] 3.2 Implement quota read endpoint and quota reservation/finalization flow for generation jobs.
- [x] 3.3 Implement payment checkout and webhook stubs or integration points for paid quota/plan updates.
- [x] 3.4 Enforce ownership checks for document and artifact reads/writes.
- [x] 3.5 Enforce admin-only access for raw mask content, `correction_omm`, debug bundles, and Phase 3 dataset seed exports.

## 4. Generation Orchestration

- [x] 4.1 Implement `POST /api/generation-jobs` with auth, quota reservation, input validation, and job creation.
- [x] 4.2 Implement `content-outline-text` parsing path and LLM outlining/enrichment path for natural language input.
- [x] 4.3 Add `doodlePrompt` enrichment before GPT-Image-2 reference generation.
- [x] 4.4 Integrate GPT-Image-2 reference image generation through the backend provider boundary.
- [x] 4.5 Store `content_outline` and `reference_image` artifacts for the generation job.
- [x] 4.6 Enqueue CV extraction jobs with explicit input artifact locations, extraction profile, job ID, and output location.
- [x] 4.7 Implement `GET /api/generation-jobs/:jobId` with stages, diagnostics, artifact references, and `documentId` after success.
- [x] 4.8 Implement cancellation behavior and `job_canceled` status/error handling.
- [x] 4.9 Ensure failed jobs do not create product documents unless a valid `prediction_omm` exists.

## 5. Queue And CV Worker Integration

- [x] 5.1 Define queue message schema for CV extraction jobs.
- [x] 5.2 Implement backend producer that enqueues CV extraction jobs.
- [x] 5.3 Implement worker consumer wrapper that invokes the Python 3.11 uv-based CV pipeline.
- [x] 5.4 Import worker outputs into managed artifacts, including `prediction_omm`, masks, overlays, crops, SVGs, and diagnostics.
- [x] 5.5 Update generation job stages and failure states from worker completion/failure results.
- [x] 5.6 Add retry-safe worker failure handling with stable `worker_failed` diagnostics.

## 6. Artifact APIs

- [x] 6.1 Implement `GET /api/artifacts/:artifactId` metadata reads with ownership checks.
- [x] 6.2 Implement `GET /api/artifacts/:artifactId/content` for browser-readable artifacts.
- [x] 6.3 Ensure `prediction_omm` JSON is frontend-readable for editor initialization.
- [x] 6.4 Ensure raw mask artifact content is admin-only even when referenced by `prediction_omm`.
- [x] 6.5 Add signed URL or streaming support for large immutable binary artifacts.
- [x] 6.6 Add payload size and content-type validation for artifact writes/imports.

## 7. Document APIs

- [x] 7.1 Implement `POST /api/documents` for imported, manual, copied, or new frontend-submitted `user_saved_omm` documents.
- [x] 7.2 Implement automatic document creation on successful generation completion.
- [x] 7.3 Implement `GET /api/documents/:documentId` with artifact references and `currentEditableSource`.
- [x] 7.4 Implement `PUT /api/documents/:documentId/current-omm` to store complete `user_saved_omm` snapshots.
- [x] 7.5 Validate OMM schema and strip/reject masks, raw OCR evidence, and debug internals from normal `user_saved_omm` saves.
- [x] 7.6 Implement stale save detection using `baseArtifactId` and return `stale_document`.
- [x] 7.7 Implement archive behavior without deleting linked artifacts by default.

## 8. Admin Corrections

- [x] 8.1 Implement `POST /api/admin/corrections` for creating or updating internal `correction_omm`.
- [x] 8.2 Link `correction_omm` to the product document and source `prediction_omm`.
- [x] 8.3 Verify correction writes do not mutate document lifecycle or current `user_saved_omm`.
- [x] 8.4 Restrict correction reads/writes to admin/operator authorization.

## 9. Export APIs

- [x] 9.1 Implement `POST /api/exports` and `GET /api/exports/:exportJobId`.
- [x] 9.2 Verify `sourceArtifactId` belongs to `documentId` when provided.
- [x] 9.3 Export `.omm`, PNG, and SVG from selected OMM artifacts according to entitlement.
- [x] 9.4 Keep `debug_bundle` and `phase3_dataset_seed` admin-only.
- [x] 9.5 Keep public encrypted share links out of Phase 2 export scope.
- [x] 9.6 Leave default export source behavior explicit and covered by tests before enabling user-facing export buttons.

## 10. Frontend Integration Hooks

- [ ] 10.1 Add frontend API client methods for generation jobs, documents, artifacts, saves, exports, quota, and session.
- [ ] 10.2 Load canvas state from document `currentEditableSource`.
- [ ] 10.3 Keep unsaved edits in browser memory and optional local draft storage keyed by `documentId`.
- [ ] 10.4 Save complete `user_saved_omm` snapshots only on explicit save/export.
- [ ] 10.5 Hide masks/debug evidence from normal canvas object UI while preserving admin/debug visibility where authorized.

## 11. Tests And Validation

- [x] 11.1 Add API contract tests for response envelope and stable error codes.
- [x] 11.2 Add generation job tests for success, provider failure, worker failure, cancellation, and no-document-on-failure behavior.
- [x] 11.3 Add artifact authorization tests for browser-readable artifacts and admin-only raw masks.
- [x] 11.4 Add document lifecycle tests for generated, saved, archived, and correction-does-not-mutate-user-state behavior.
- [x] 11.5 Add stale save tests for `baseArtifactId`.
- [x] 11.6 Add export authorization tests for user exports and admin-only debug/dataset exports.
- [x] 11.7 Add worker queue contract tests using fixture input/output artifacts.
