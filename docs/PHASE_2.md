# Phase 2: Text To Editable Organic Mind Map

## Goal

Phase 2 turns natural language text, article content, or `content-outline-text` into a browser-editable Buzan-style organic mind map.

Canonical flow:

```text
text / article / content-outline-text
  -> content outline
  -> visual reference image
  -> CV/OCR extraction
  -> prediction_omm
  -> Vue/Paper.js editable canvas
  -> user-saved-omm save/export
```

The final user-facing output is not a flat generated image. It is an editable OMM document opened in the web app, with branch curves, text, doodle groups, and visual objects ready for correction, editing, save, and export.

## Product Positioning

Organic Mind Map is not a generic whiteboard, flowchart tool, or infinite-canvas editor. Phase 2 is a hosted web application where the main experience is the editable canvas.

The product remains focused on strict organic mind maps:

- center visual
- thick organic colored branches
- concise keywords
- doodle illustrations
- readable whitespace
- spatial memory anchors

## System Responsibilities

### LLM

- Convert article or freeform text into a content outline.
- Preserve semantic hierarchy and concise concept units.
- Enrich the outline with visual hints where useful.

### GPT-Image-2

- Generate the visual reference image.
- Provide organic rhythm, color, composition, branch feel, and doodle style.
- Never become the final editable engineering truth.

### CV/OCR Worker

- Extract branches, text, doodles, masks, overlays, and visual groups from the reference image.
- Align extracted text and structure back to the content outline.
- Produce `prediction_omm` plus inspectable artifacts.

### Backend API

- Own auth, sessions, quota, billing, jobs, documents, artifacts, exports, and admin corrections.
- Parse or generate the content outline.
- Call model providers and enqueue CV/OCR workers.
- Create a product document only after a valid `prediction_omm` exists.
- Expose `currentEditableSource` so the frontend can open the correct editable OMM source.

The browser must not call LLMs, GPT-Image-2, PaddleOCR, OpenCV, CV workers, or queue workers directly.

### Frontend

- Load a document through the backend API.
- Resolve and fetch the document's `currentEditableSource`.
- Initialize the Vue/Paper.js editable canvas from `prediction_omm` or `user-saved-omm`.
- Keep high-frequency unsaved edits in browser memory and optional local draft storage.
- Persist complete `user-saved-omm` snapshots only on explicit save/export.
- Hide masks, raw OCR evidence, and debug internals from normal canvas object UI.

## Core Data Model

```text
document = product lifecycle container
artifact = stored file/blob/reference
OMM      = JSON-backed editable map document inside selected artifacts
```

Important artifact kinds:

- `content_outline`
- `reference_image`
- `prediction_omm`
- `user_saved_omm`
- `correction_omm`
- `mask`
- `debug_overlay`
- export artifacts

`prediction_omm`, `user-saved-omm`, and `correction_omm` are not separate file formats. They are lifecycle/stage names for OMM documents.

## currentEditableSource

Generated documents can be opened before the user saves anything.

Before first user save:

```json
{
  "currentEditableSource": {
    "kind": "prediction_omm",
    "artifactId": "artifact_prediction_omm"
  }
}
```

After explicit save:

```json
{
  "currentEditableSource": {
    "kind": "user_saved_omm",
    "artifactId": "artifact_user_saved_omm"
  }
}
```

The frontend initializes the editable canvas from this source. It does not re-run generation or rebuild the canvas from `content-outline-text` on every edit.

## Generation Flow

1. User submits article text, natural language text, or `content-outline-text`.
2. Backend validates session, quota, and input shape.
3. Backend parses `content-outline-text` or asks an LLM to produce a content outline.
4. Backend generates a visual reference image.
5. Backend stores the content outline and reference image as artifacts.
6. Backend enqueues a CV/OCR worker job with artifact input locations.
7. Worker extracts visual structure and returns `prediction_omm` plus artifacts.
8. Backend creates or updates the product document.
9. Backend sets `currentEditableSource` to `prediction_omm`.
10. Frontend opens the document and initializes the Vue/Paper.js editable canvas.
11. User corrects or edits the map in the browser.
12. Explicit save/export creates `user-saved-omm` or export artifacts.

## Non-Goals

Phase 2 does not include:

- generic whiteboard APIs or generic shape editing as the product core
- live `content-outline-text` to canvas reflow
- browser calls directly to LLM/image/CV providers
- backend per-object patch APIs for high-frequency editing
- WebSocket collaboration, remote cursors, shared rooms, or merge protocols
- normal user-facing raw masks, OCR evidence, or debug overlays as canvas objects
- public encrypted share links

## Execution Order

1. Stable product schemas.
2. Backend API contracts.
3. CV/OCR worker interface.
4. Web canvas loading static artifacts.
5. Generation orchestration.
6. Auth, quota, and payment gates.
7. Export and Phase 3 dataset preparation.

## Phase 3 Data Preparation

Every Phase 2 extraction and correction should be reusable as future reconstruction data:

```text
prediction_omm = model/CV prediction
correction_omm = internal/admin correction and final training truth
prediction_omm + correction_omm = training sample
```

This supports future benchmark evaluation, debugging, replay, and OMM-specific segmentation/reconstruction training.
