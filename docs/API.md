# Organic Mind Map Phase 2 API

This document defines the Phase 2 backend API contracts for the SaaS web app.

The TypeScript API backend is the product control plane. It owns authentication, sessions, quota, payments, generation jobs, artifact ownership, external model calls, and worker orchestration. Python CV workers are execution units behind the API and are not exposed directly to browser clients.

## Principles

- Browser clients talk only to the TypeScript API.
- Python CV workers receive explicit job inputs from the backend and return file/blob references plus `prediction_omm`.
- The browser never calls GPT-Image-2, LLM providers, PaddleOCR, OpenCV, or CV workers directly.
- `content-outline-text` is parsed or generated into `content_outline.json` before visual reference generation.
- `.omm`, `prediction_omm`, and `correction_omm` use the same JSON-backed OMM document schema.
- PNG and SVG are rendered from an OMM document; they are not separate source-of-truth artifacts.
- All user-facing artifact reads and writes are ownership-checked.

## Excalidraw-Inspired Boundaries

Excalidraw separates local scene editing, encrypted sharing, AI calls, file storage, and real-time collaboration into different surfaces. OMM Phase 2 should keep the same separation of concerns, but with a narrower backend API:

- **Scene editing:** Browser-owned. The backend receives complete OMM snapshots only on explicit save/export, not high-frequency object patches.
- **Generation:** Backend-owned. The browser never calls model or CV providers directly.
- **Artifacts:** Stored and permissioned by the backend. Large binary content is referenced by artifact IDs or signed URLs.
- **Collaboration:** Out of scope for Phase 2. No WebSocket scene sync, presence, cursor sync, or shared-room protocol.
- **Public encrypted share links:** Out of scope for Phase 2. OMM uses authenticated document/artifact access first; client-held encryption keys in URL hashes can be revisited later for public sharing.
- **AI streaming:** Optional later. Phase 2 keeps generation as asynchronous jobs with polling. If SSE is added later, it should stream job/stage events only, not mutate the editor scene directly.
- **External URL import:** Not part of the baseline flow. Any future URL import must use allowlists, size limits, content-type checks, and backend-side validation.

## API Shape

Phase 2 should use JSON over HTTPS.

```text
Base path: /api
Auth: backend session cookie
Content-Type: application/json
```

Large files such as images, masks, `.omm`, PNG, and SVG should be referenced by stable artifact IDs and downloaded through artifact endpoints or signed URLs, not embedded in normal API responses.

Binary artifact content should be cacheable when immutable. The backend may attach `cache-control`, content hash, byte size, and MIME type metadata to artifact records so the frontend can cache reference images, asset blobs, exports, and previews safely.

Common response envelope:

```json
{
  "ok": true,
  "data": {},
  "requestId": "req_01h..."
}
```

Common error envelope:

```json
{
  "ok": false,
  "error": {
    "code": "quota_exhausted",
    "message": "Generation quota exhausted.",
    "retryable": false,
    "details": {}
  },
  "requestId": "req_01h..."
}
```

Common error codes:

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

Recommended HTTP mappings:

```text
401 unauthorized
403 forbidden
404 not_found
409 stale_document
413 payload_too_large
422 validation_failed
429 quota_exhausted / rate_limited
499 job_canceled or client-aborted request
5xx provider_failed / worker_failed / artifact_unavailable
```

## Core Types

### Job Status

```text
queued
validating_input
outlining
generating_reference
extracting
assembling_artifacts
completed
failed
canceled
```

### Job Stage Event

```json
{
  "stage": "extracting",
  "status": "running",
  "startedAt": "2026-05-13T10:00:00Z",
  "finishedAt": null,
  "message": "Running OCR and branch extraction."
}
```

### Artifact Reference

```json
{
  "id": "artifact_01h...",
  "kind": "prediction_omm",
  "mimeType": "application/vnd.omm+json",
  "name": "prediction.omm",
  "byteSize": 123456,
  "createdAt": "2026-05-13T10:00:00Z"
}
```

Allowed artifact kinds:

```text
reference_image
content_outline
prediction_omm
user_saved_omm
correction_omm
mask
debug_overlay
png_export
svg_export
debug_bundle
```

### Product Document

A `document` is the product-layer container for one generated or saved mind map. It is not itself an OMM file and is not a storage artifact.

A document owns or references the artifacts created during the map lifecycle:

```json
{
  "id": "doc_01h...",
  "name": "Anthropic 产品之道",
  "ownerUserId": "user_01h...",
  "generationJobId": "job_01h...",
  "lifecycle": "generated",
  "artifacts": {
    "contentOutline": "artifact_content_outline",
    "referenceImage": "artifact_reference",
    "predictionOmm": "artifact_prediction_omm",
    "userSavedOmm": null,
    "correctionOmm": null
  },
  "currentEditableSource": {
    "kind": "prediction_omm",
    "artifactId": "artifact_prediction_omm"
  }
}
```

`currentEditableSource` resolves to the user-saved-omm artifact kind (`user_saved_omm`) when the user has saved editor state. Otherwise it resolves to `prediction_omm`, allowing the frontend to open a generated result before any user save exists.

Document lifecycle values for Phase 2:

```text
generated
saved
archived
```

`generated` means the document has a `prediction_omm` but may not have a user-saved-omm yet. `saved` means the user has explicitly saved editor state as user-saved-omm. `archived` means the document is hidden from normal document lists without deleting its artifacts.

Admin-only `correction_omm` operations must not change the user-visible document lifecycle. Corrections are internal data-preparation artifacts and should not affect the user's current OMM unless a separate explicit user-facing operation is introduced later.

## Auth And Session

### GET /api/session

Returns the current browser session.

Anonymous users may view the onboarding canvas, but generation and user-owned artifacts require authentication.

Response:

```json
{
  "ok": true,
  "data": {
    "authenticated": true,
    "user": {
      "id": "user_01h...",
      "email": "user@example.com",
      "name": "Example User"
    }
  }
}
```

### POST /api/auth/logout

Ends the current session.

SSO provider callback URLs are provider-specific and not part of the stable product API contract.

## Quota

### GET /api/quota

Returns the user's current generation and export entitlement state.

Response:

```json
{
  "ok": true,
  "data": {
    "plan": "trial",
    "generation": {
      "remaining": 3,
      "reserved": 0,
      "resetAt": null
    },
    "exports": {
      "png": true,
      "svg": false,
      "debugBundle": false
    },
    "upgradeRequired": false
  }
}
```

Quota should be reserved before external model calls begin and finalized when a job reaches a terminal state. Failed jobs may release or consume reserved quota according to the quota policy, but this must be explicit in backend logic.

## Generation Jobs

### POST /api/generation-jobs

Creates an asynchronous generation job.

Request for natural language input:

```json
{
  "title": "How Anthropic's Product Team Moves",
  "input": {
    "kind": "text_prompt",
    "text": "Create an organic mind map about Anthropic's product team principles."
  },
  "options": {
    "locale": "zh-CN",
    "stylePreset": "handdrawn-organic",
    "extractionProfile": "phase2-default"
  }
}
```

Request for `content-outline-text` input:

```json
{
  "title": "How Anthropic's Product Team Moves",
  "input": {
    "kind": "content_outline_text",
    "text": "Anthropic 产品之道\n  极速交付\n    研究预览\n    跨职能"
  },
  "options": {
    "locale": "zh-CN",
    "stylePreset": "handdrawn-organic",
    "extractionProfile": "phase2-default"
  }
}
```

Request fields:

- `title` is optional. When present, it initializes a top-level OMM text object with `class: "map_title"` and does not become part of the branch/subbranch hierarchy.
- `input.kind: "text_prompt"` sends natural language to the LLM outline stage.
- `input.kind: "content_outline_text"` sends indentation-based source structure directly to the parser.

Response:

```json
{
  "ok": true,
  "data": {
    "jobId": "job_01h...",
    "status": "queued",
    "quotaReservationId": "quota_res_01h..."
  }
}
```

Backend behavior:

- Verify authentication.
- Verify quota or paid entitlement.
- Reserve quota before LLM, GPT-Image-2, or CV work starts.
- Parse `content-outline-text` directly, or call an LLM for natural language input.
- Have the LLM identify key concepts and generate associated visual descriptions (`doodlePrompt` values) for the image generator.
- Enrich `content_outline.json` with those visual hints before calling GPT-Image-2.
- Generate `reference_image`.
- Dispatch the CV worker with `reference_image`, `content_outline.json`, extraction profile, and output location.
- Store `prediction_omm` and related artifacts when extraction completes.
- Create or attach a product `document` for the completed generation job and link the content outline, reference image, and `prediction_omm` artifacts.

If generation fails before a valid `prediction_omm` is assembled, the backend should not create a product `document`. Failed jobs may retain partial artifacts for admin/debug inspection, but those partial artifacts should not appear as ordinary user documents.

### GET /api/generation-jobs/:jobId

Returns job status and artifact references.

Response:

```json
{
  "ok": true,
  "data": {
    "id": "job_01h...",
    "status": "completed",
    "createdAt": "2026-05-13T10:00:00Z",
    "updatedAt": "2026-05-13T10:03:30Z",
    "stages": [
      {
        "stage": "generating_reference",
        "status": "completed",
        "startedAt": "2026-05-13T10:00:20Z",
        "finishedAt": "2026-05-13T10:01:05Z",
        "message": null
      }
    ],
    "artifacts": {
      "contentOutline": "artifact_content_outline",
      "referenceImage": "artifact_reference",
      "predictionOmm": "artifact_prediction_omm"
    },
    "documentId": "doc_01h...",
    "diagnostics": []
  }
}
```

### POST /api/generation-jobs/:jobId/cancel

Requests cancellation for a queued or running job.

Cancellation is best-effort. If an external provider or worker call has already started, the backend records the final provider/worker outcome and applies quota policy accordingly.

## Artifacts

### GET /api/artifacts/:artifactId

Returns artifact metadata after ownership checks.

Response:

```json
{
  "ok": true,
  "data": {
    "id": "artifact_prediction_omm",
    "kind": "prediction_omm",
    "mimeType": "application/vnd.omm+json",
    "name": "prediction.omm",
    "ownerUserId": "user_01h...",
    "jobId": "job_01h...",
    "createdAt": "2026-05-13T10:03:30Z"
  }
}
```

### GET /api/artifacts/:artifactId/content

Returns artifact content for JSON/text artifacts or redirects to a signed URL for binary artifacts.

Allowed browser-readable artifacts include:

- `content_outline`
- `reference_image`
- `prediction_omm`
- `user_saved_omm`
- `png_export`
- `svg_export`

`prediction_omm` is frontend-readable as a complete extraction working document and may include masks, debug references, OCR evidence, and provenance. Normal editor UI should not present masks as user-facing canvas objects, and saves/exports to user-saved-omm (`user_saved_omm`) must strip internal extraction evidence by default.

Internal-only artifact content such as standalone raw mask files, debug overlays, and `correction_omm` requires admin/operator authorization.

Mask references inside `prediction_omm` may be visible to the frontend as metadata, but raw mask artifact content is admin-only by default. Normal users should not be able to download raw mask images through `/api/artifacts/:artifactId/content`.

## Documents

### POST /api/documents

Creates a product `document` from a frontend-submitted user-saved-omm (`user_saved_omm`) document. This endpoint is for imported, manually created, or copied maps.

Generation jobs normally create the product `document` automatically when extraction completes. In that flow, the frontend opens `/api/documents/:documentId`, reads `currentEditableSource`, and saves the first edited user-saved-omm with `PUT /api/documents/:documentId/current-omm`.

Request:

```json
{
  "name": "Anthropic 产品之道",
  "omm": {
    "schema": "omm.document",
    "version": 1,
    "producer": {
      "kind": "user_editor",
      "name": "omm-web",
      "version": "phase2"
    }
  }
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "documentId": "doc_01h...",
    "artifactId": "artifact_user_saved_omm",
    "currentEditableSource": {
      "kind": "user_saved_omm",
      "artifactId": "artifact_user_saved_omm"
    }
  }
}
```

### GET /api/documents/:documentId

Returns product document metadata, artifact references, and the current editable source.

Response:

```json
{
  "ok": true,
  "data": {
    "id": "doc_01h...",
    "name": "Anthropic 产品之道",
    "lifecycle": "generated",
    "generationJobId": "job_01h...",
    "artifacts": {
      "contentOutline": "artifact_content_outline",
      "referenceImage": "artifact_reference",
      "predictionOmm": "artifact_prediction_omm",
      "userSavedOmm": null,
      "correctionOmm": null
    },
    "currentEditableSource": {
      "kind": "prediction_omm",
      "artifactId": "artifact_prediction_omm"
    }
  }
}
```

### PUT /api/documents/:documentId/current-omm

Saves the current editor state as the document's latest user-saved-omm (`user_saved_omm`) artifact.

If the document was created by a generation job and only has `prediction_omm`, this endpoint creates the first user-saved-omm. If a user-saved-omm already exists, it writes the next current-state snapshot.

Request:

```json
{
  "omm": {
    "schema": "omm.document",
    "version": 1,
    "producer": {
      "kind": "user_editor",
      "name": "omm-web",
      "version": "phase2"
    }
  },
  "baseArtifactId": "artifact_user_saved_omm"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "documentId": "doc_01h...",
    "artifactId": "artifact_user_saved_omm_v2",
    "currentEditableSource": {
      "kind": "user_saved_omm",
      "artifactId": "artifact_user_saved_omm_v2"
    },
    "savedAt": "2026-05-13T10:10:00Z"
  }
}
```

The server should validate the OMM document schema before storing it. Validation failure should return actionable schema diagnostics.

For normal user saves, the backend should reject or strip `masks`, debug references, raw OCR evidence, and other internal extraction fields when `omm.producer.kind` is `"user_editor"`. Mask-bearing documents belong to `prediction_omm`, `correction_omm`, debug bundles, or Phase 3 dataset exports, not default user-saved-omm artifacts.

User-saved-omm is a current-state snapshot. It must not contain embedded edit history, undo stacks, or document version history. The root `version` field is the OMM schema version only.

`baseArtifactId` is server-side optimistic concurrency metadata. It lets the backend detect whether the user is saving on top of the latest known artifact. It is not stored as `.omm` document history.

User document lifecycle:

```text
generation job
  -> document + prediction_omm artifact
  -> GET /api/documents/:documentId
  -> currentEditableSource = prediction_omm
  -> frontend edits in browser memory or local autosave
  -> PUT /api/documents/:documentId/current-omm
  -> currentEditableSource = user_saved_omm
```

Unsaved editor changes are browser-owned. The backend does not receive high-frequency canvas edits, branch drags, text moves, or per-object patches in Phase 2.

The browser may keep a local recovery draft, for example:

```text
local draft key: omm:draft:<documentId>
```

That local draft may include the current in-memory OMM state, `baseArtifactId`, dirty flag, local asset cache references, and `lastLocalSavedAt`. It is not part of the `.omm` schema and is not a backend document revision.

The backend receives editor state only on explicit save/export through `PUT /api/documents/:documentId/current-omm` or export endpoints.

## Corrections

### POST /api/admin/corrections

Creates or updates an internal/admin `correction_omm` for Phase 3 data preparation.

This endpoint is not part of the normal user editing flow.

Request:

```json
{
  "documentId": "doc_01h...",
  "predictionArtifactId": "artifact_prediction_omm",
  "correctionOmm": {
    "schema": "omm.document",
    "version": 1,
    "producer": {
      "kind": "admin_correction",
      "name": "omm-correction-ui",
      "version": "phase2"
    }
  },
  "notes": "Corrected text grouping and branch centerlines."
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "artifactId": "artifact_correction_omm",
    "documentId": "doc_01h...",
    "predictionArtifactId": "artifact_prediction_omm"
  }
}
```

## Export

### POST /api/exports

Creates an export job from a user-saved-omm (`user_saved_omm`) document.

Request:

```json
{
  "documentId": "doc_01h...",
  "format": "png",
  "sourceArtifactId": "artifact_user_saved_omm_v2",
  "options": {
    "scale": 2,
    "transparentBackground": false
  }
}
```

Allowed formats:

```text
omm
png
svg
debug_bundle
phase3_dataset_seed
```

Response:

```json
{
  "ok": true,
  "data": {
    "exportJobId": "export_01h...",
    "status": "queued"
  }
}
```

### GET /api/exports/:exportJobId

Returns export status and the exported artifact reference when complete.

Response:

```json
{
  "ok": true,
  "data": {
    "id": "export_01h...",
    "status": "completed",
    "artifactId": "artifact_png_export"
  }
}
```

Export rules:

- `.omm` export may return the current JSON-backed OMM document directly.
- PNG and SVG are rendered from the selected OMM artifact.
- `debug_bundle` and `phase3_dataset_seed` are admin-only.
- Export endpoints must verify document ownership and export entitlement.

## Payments

### POST /api/billing/checkout-session

Creates a payment provider checkout session for quota or plan purchase.

Request:

```json
{
  "priceId": "price_generation_pack",
  "returnUrl": "https://app.example.com/billing/return"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/..."
  }
}
```

### POST /api/billing/webhooks/stripe

Payment provider webhook endpoint.

Webhook handling must verify provider signatures before changing quota, entitlement, or billing state.

## Internal Worker Boundary

The browser must never call the worker directly. The TypeScript API dispatches worker jobs through a backend queue.

Phase 2 should use queue-based worker dispatch as the baseline architecture rather than a synchronous request/response worker call. Local development may run a worker process on the same machine, but the API-to-worker contract is still a queued job with explicit input and output artifact locations.

Target command shape:

```text
omm-cv extract reference.png --outline content_outline.json --out output/
```

Worker input:

```json
{
  "referenceImagePath": "input/reference.png",
  "contentOutlinePath": "input/content_outline.json",
  "outputDir": "output/",
  "profile": "phase2-default",
  "jobId": "job_01h..."
}
```

Worker output:

```json
{
  "ok": true,
  "predictionOmmPath": "output/prediction.omm",
  "artifacts": [
    { "kind": "mask", "path": "output/branches_mask.png" },
    { "kind": "debug_overlay", "path": "output/debug_overlay.png" }
  ],
  "diagnostics": []
}
```

The API backend imports worker output into managed artifacts, assigns artifact IDs, and stores ownership/provenance metadata.

## Security And Ownership

- Authenticated generation is required before model or CV costs are incurred.
- Artifact reads require owner access unless the artifact is explicitly public.
- `prediction_omm` is frontend-readable for debugging and editor initialization.
- User-saved-omm (`user_saved_omm`) must not include masks, debug evidence, or raw OCR evidence by default.
- `correction_omm` is internal/admin by default.
- Payment webhooks must be signature verified.
- Export requests must verify both ownership and entitlement.
- Admin endpoints must require explicit admin/operator authorization.

## Non-Goals

- No browser-to-worker direct calls.
- No WebSocket requirement for Phase 2.
- No live `content-outline-text` to canvas reflow in Phase 2.
- No generic whiteboard object API.
- No API contract that treats GPT-Image-2 output as final editable truth.
