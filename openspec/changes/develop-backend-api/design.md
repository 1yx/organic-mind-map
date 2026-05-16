## Context

Phase 2 moves Organic Mind Map from local prototypes and read-only preview toward a hosted SaaS generation and editing loop. The canonical text/article-to-editable-canvas flow is defined in `docs/PHASE_2.md`; this design records backend API decisions for that flow.

The backend must be the product control plane. It owns authentication, sessions, quota, payment gating, generation job state, artifact ownership, model calls, queue dispatch, document records, exports, and admin correction access. Python workers are execution units only; the browser never calls them directly.

The document model is layered:

```text
document = product container / lifecycle record
artifact = stored file/blob/reference
OMM      = JSON-backed document content inside selected artifacts
```

Product terminology keeps `user-saved-omm` for the lifecycle concept. Implementation-facing API enum values use snake_case, so artifact kinds and `currentEditableSource.kind` use `user_saved_omm`.

## Goals / Non-Goals

**Goals:**

- Implement a TypeScript backend API for Phase 2 generation, document, artifact, save, export, quota, and correction workflows.
- Create product `document` records only when a valid generated result exists or when the frontend submits a valid `user-saved-omm`.
- Use queue-based Python CV worker dispatch with explicit input/output artifact locations.
- Keep unsaved editor state browser-owned and save complete `user-saved-omm` snapshots only on explicit save/export.
- Make `prediction_omm` frontend-readable for editor initialization while keeping raw mask content and `correction_omm` admin-only.
- Normalize backend errors into stable codes that the frontend can handle predictably.

**Non-Goals:**

- No WebSocket collaboration, remote cursors, shared-room sync, or merge protocol.
- No public encrypted share links in Phase 2.
- No generic whiteboard object API.
- No per-object backend patch API for high-frequency editor operations.
- No external URL import baseline.
- No direct browser calls to LLM, GPT-Image-2, PaddleOCR, OpenCV, CV workers, or queue workers.
- No live `content-outline-text` to canvas reflow in Phase 2.

## Decisions

### Use Product Documents as Lifecycle Containers

The backend stores a product `document` record that references artifacts such as `content_outline`, `reference_image`, `prediction_omm`, optional `user-saved-omm`, optional internal `correction_omm`, and exports.

Document lifecycle is intentionally small in Phase 2:

```text
generated
saved
archived
```

Admin `correction_omm` must not change document lifecycle or mutate the user's `user-saved-omm`.

Alternative considered: treating `prediction_omm` or `user-saved-omm` as the document itself. This was rejected because product lifecycle, ownership, generated artifacts, admin corrections, and exports need a container above individual OMM instances.

### Use `currentEditableSource`

The document API returns:

```json
{
  "currentEditableSource": {
    "kind": "prediction_omm",
    "artifactId": "artifact_prediction_omm"
  }
}
```

If a `user-saved-omm` exists, `currentEditableSource` points to it. Otherwise it points to `prediction_omm`. This lets the frontend open generated output before the user has saved.

Alternative considered: separate `/jobs/:jobId/edit` and `/documents/:documentId` routes. This was rejected because generated results are still product documents once a valid `prediction_omm` exists.

### Queue CV Worker Jobs

The API enqueues CV extraction jobs instead of invoking workers synchronously from request handlers. Queue payloads include artifact/input locations, extraction profile, job ID, and output location.

Alternative considered: `child_process` as the baseline API-to-worker strategy. This was rejected for the product design because queue-based dispatch better matches SaaS execution, retries, cancellation, and later scaling. Local development may still run a queue worker process on the same machine.

### Failed Generation Does Not Create User Documents

If generation fails before a valid `prediction_omm` is assembled, the backend records the job failure and may retain partial artifacts for admin/debug inspection, but it does not create a user-visible product document.

Alternative considered: creating partial documents for failed jobs. This was rejected because it complicates document lifecycle and exposes incomplete states to users.

### Browser Owns Unsaved Editor State

The browser owns high-frequency editing state and optional local draft recovery. The backend receives editor state only through explicit save/export APIs that store full `user-saved-omm` snapshots.

Alternative considered: backend per-object patches. This was rejected for Phase 2 because collaboration and server-side edit logs are out of scope.

### Restrict Internal Artifacts

`prediction_omm` JSON is frontend-readable so the editor can initialize from extraction output. Raw mask artifact content, debug overlays outside ordinary display, dataset bundles, and `correction_omm` are admin-only by default.

Alternative considered: exposing raw masks to paid users. This was rejected for Phase 2 because masks are internal extraction/debug/training artifacts, not user product output.

### Stable Errors

The API normalizes errors into stable codes:

```text
unauthorized
forbidden
not_found
quota_exhausted
rate_limited
payload_too_large
validation_failed
stale_document
job_canceled
provider_failed
worker_failed
artifact_unavailable
```

This keeps frontend flows stable across provider and worker implementation changes.

## Risks / Trade-offs

- **Queue infrastructure adds setup cost** -> Keep the queue payload small and artifact-oriented, and allow local worker processes during development.
- **`prediction_omm` is frontend-readable but contains internal evidence** -> Keep raw mask content admin-only and hide masks from normal canvas object UI.
- **No partial documents on failure may hide useful user context** -> Preserve partial artifacts under failed jobs for admin/debug, and expose clear retry messages to users.
- **No backend per-object patches means no server-side autosave in Phase 2** -> Use browser local draft recovery keyed by `documentId`.
- **Export source semantics are not fully settled** -> Keep the implementation narrow and require ownership validation for any explicit `sourceArtifactId`; resolve default export source behavior before export implementation.
