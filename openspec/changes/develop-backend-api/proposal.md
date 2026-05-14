## Why

Phase 2 needs a real backend API contract before the web canvas, generation pipeline, quota system, and CV worker can be implemented coherently. The current docs have converged on a document/artifact/OMM model, queue-based worker execution, and browser-owned editing state; this change turns those decisions into an implementation-ready OpenSpec change.

## What Changes

- Implement the TypeScript API backend as the Phase 2 SaaS control plane for auth/session, quota, generation jobs, document records, artifacts, saves, exports, admin corrections, and worker orchestration.
- Store generated maps as product `document` records that reference artifact-backed OMM instances: `prediction_omm`, `user_saved_omm`, and optional internal `correction_omm`.
- Use queue-based dispatch for Python CV workers instead of browser-to-worker calls or synchronous request/response worker execution.
- Keep editor changes browser-owned until explicit save/export; the backend stores complete `user_saved_omm` snapshots, not high-frequency object patches.
- Keep `prediction_omm` frontend-readable for editor initialization while raw mask artifact content and `correction_omm` remain admin-only.
- Normalize API errors for quota, validation, stale saves, cancellation, provider failures, worker failures, and artifact access.
- Keep Phase 2 scope narrow: no WebSocket collaboration, no public encrypted share links, no external URL import baseline, and no live content-outline-to-canvas reflow.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `generation-orchestration`: Back generation jobs with document creation, artifact references, queue-based CV worker dispatch, and failure behavior that avoids creating user-visible documents without a valid `prediction_omm`.
- `auth-quota-payment`: Add stable backend error codes, admin-only raw mask access, and quota-safe generation semantics.
- `cv-worker-extraction`: Treat worker execution as queue-based backend processing with explicit artifact input/output contracts.
- `editable-canvas`: Load documents through `currentEditableSource`, keep unsaved editor changes in browser memory/local draft storage, and save explicit `user_saved_omm` snapshots.
- `export`: Export from OMM artifacts while keeping debug/dataset exports admin-only and public encrypted share links out of Phase 2.
- `omm-document`: Clarify one shared OMM format across `prediction_omm`, `user_saved_omm`, and `correction_omm`, with product `document` as the lifecycle container.

## Impact

- Affected packages: `@omm/api` backend service, `@omm/web` document loading/saving/export integration, Python CV worker packaging, shared OMM/artifact types in core packages.
- Affected APIs: `/api/session`, `/api/quota`, `/api/generation-jobs`, `/api/artifacts`, `/api/documents`, `/api/admin/corrections`, `/api/exports`, billing endpoints, and worker queue messages.
- Affected storage: product documents, artifact metadata/content, quota reservations, generation jobs, export jobs, admin correction artifacts, and browser local draft/cache behavior.
- External systems: LLM provider, GPT-Image-2 provider, payment provider, queue/worker runtime, and object/blob storage.
