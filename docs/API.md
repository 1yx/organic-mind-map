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

## API Shape

Phase 2 should use JSON over HTTPS.

```text
Base path: /api
Auth: backend session cookie
Content-Type: application/json
```

Large files such as images, masks, `.omm`, PNG, and SVG should be referenced by stable artifact IDs and downloaded through artifact endpoints or signed URLs, not embedded in normal API responses.

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
user_omm
correction_omm
mask
debug_overlay
png_export
svg_export
debug_bundle
```

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
- `user_omm`
- `png_export`
- `svg_export`

Internal-only artifacts such as raw masks, debug overlays, and `correction_omm` require admin/operator authorization unless explicitly exposed through debug mode.

## OMM Documents

### POST /api/documents

Creates a user-owned `.omm` document from a `prediction_omm` or from an uploaded/imported OMM document.

Request:

```json
{
  "source": {
    "kind": "prediction_omm",
    "artifactId": "artifact_prediction_omm"
  },
  "name": "Anthropic 产品之道"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "documentId": "doc_01h...",
    "artifactId": "artifact_user_omm"
  }
}
```

### GET /api/documents/:documentId

Returns document metadata and the current user-facing OMM artifact reference.

### PUT /api/documents/:documentId/current-omm

Saves the current user-facing `.omm` state from the editor.

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
  "baseArtifactId": "artifact_user_omm"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "documentId": "doc_01h...",
    "artifactId": "artifact_user_omm_v2",
    "savedAt": "2026-05-13T10:10:00Z"
  }
}
```

The server should validate the OMM document schema before storing it. Validation failure should return actionable schema diagnostics.

For normal user saves, the backend should reject or strip `masks` when `omm.producer.kind` is `"user_editor"`. Mask-bearing documents belong to `prediction_omm`, `correction_omm`, debug bundles, or Phase 3 dataset exports, not default user-saved `.omm` artifacts.

## Corrections

### POST /api/admin/corrections

Creates or updates an internal/admin `correction_omm` for Phase 3 data preparation.

This endpoint is not part of the normal user editing flow.

Request:

```json
{
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
    "predictionArtifactId": "artifact_prediction_omm"
  }
}
```

## Export

### POST /api/exports

Creates an export job from a user-facing OMM document.

Request:

```json
{
  "documentId": "doc_01h...",
  "format": "png",
  "sourceArtifactId": "artifact_user_omm_v2",
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
- `debug_bundle` and `phase3_dataset_seed` require admin/operator authorization or paid/debug entitlement.
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

The browser must never call the worker directly. The TypeScript API dispatches worker jobs using an internal command or queue message.

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
- `prediction_omm` is user-readable for debugging and editor initialization.
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
