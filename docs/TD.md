# Organic Mind Map Phase 2 Technical Design

## Scope

This technical design covers the Phase 2 SaaS architecture, transitioning the experimental pipeline into a production web service:

```text
Vue Web Canvas <-> TypeScript API Backend <-> External Models (LLM, GPT-Image-2)
                                      |
                                      v
                                Python CV Workers
```

The pipeline covers:

- Text-to-structure (LLM) or content-outline-text parsing
- Structure-to-image (GPT-Image-2)
- CV layer extraction (Python backend)
- Excalidraw-like Web UI (Vue 3 / Vite / Paper.js)
- SSO (Google/OpenAI) and Payments (Stripe)

It does not replace Phase 1 production packages yet. Phase 2 work currently lives in:

```text
PHASE_2_2nd_attempts/
PHASE_2_3rd_attampts/
```

## Runtime Baseline

Python:

```text
Python 3.11
uv
OpenCV
NumPy
PaddleOCR
PaddlePaddle
Custom indentation parser for content-outline-text
```

Backend API:

```text
TypeScript
Node.js runtime
Auth/session layer for Google/OpenAI SSO
Stripe SDK
Job orchestration
JSON schema validation
Worker dispatch to Python CV
```

Frontend:

```text
Vue 3
Vite
TypeScript
Composition API with <script setup>
Paper.js 0.12.18
Stripe SDK
Backend-mediated Google/OpenAI SSO
```

Phase 2 uses the existing `@omm/web` Vue/Vite direction rather than introducing a separate React/Next.js application. This keeps the frontend aligned with the current monorepo package, existing tests, and repository-wide Vue standards.

## Platform Architecture

### 1. Web Application (`@omm/web`)

- **Landing Page/App:** The home route `/` serves the full Excalidraw-like canvas loaded with an onboarding mind map.
- **Input Interface:** Supports both natural language prompts and a code editor for `content-outline-text`.
- **Auth:** Google & OpenAI SSO integration through the backend API/session layer.
- **Payments:** Subscription/Quota gating via Stripe.
- **Canvas:** Paper.js integrated into Vue components/composables for pen-tool correction and visual group manipulation.

## Mind Map Creation Logic

Phase 2 creates an editable organic mind map through an artifact-first generation pipeline:

```text
User input
  |
  |-- content-outline-text ---------------------.
  |                                             |
  |-- natural language prompt                   |
        |                                      |
        v                                      |
  LLM outline generation                       |
        |                                      |
        '---------------> content_outline.json <'
                            |
                            v
      prompt builder / generation policy
      uses concept text + doodle prompts
                            |
                            v
                   GPT-Image-2 reference
                            |
                            v
                       reference.png
                            |
                            v
              Python CV worker extraction
                            |
        .-------------------+-------------------.
        |                   |                   |
        v                   v                   v
  branch extraction    OCR/text extraction   doodle extraction
        |                   |                   |
        v                   v                   v
  editable branches   text classification    visual groups
        |                   |                   |
        '-------------------+-------------------'
                            |
                            v
                     prediction_omm
                            |
                            v
                   Vue/Paper.js editable canvas
                            |
        .-------------------+-------------------.
        |                                       |
        v                                       v
 user edits / save                  admin correction workflow
        |                                       |
        v                                       v
        .omm                      correction_omm
         |                              |
         v                              v
   PNG / SVG export          Phase 3 dataset seeds
```

Key rules:

- `content_outline.json` is the semantic truth for title, center, branch, and subbranch text, and it also carries doodle prompts / visual hints for image generation.
- Doodle prompts disambiguate short concepts before GPT-Image-2 generation; they are visual intent, not final extracted doodle geometry.
- `reference.png` is visual evidence and style/layout input, not final editable truth.
- `.omm` is the single JSON-backed Organic Mind Map document format, similar in spirit to `.excalidraw`.
- `prediction_omm`, `correction_omm`, and user-saved `.omm` are OMM document instances from different producers/stages, not different file formats.
- PNG and SVG are rendered/exported from an OMM document; they are not sibling outputs of `correction_omm`.
- `prediction_omm` stores CV/OCR predictions, masks, groups, branch centerlines, and debug references inside the OMM format.
- `correction_omm` stores internal/admin correction truth for Phase 3 data inside the OMM format.
- The editable canvas should be able to reopen a user-saved OMM document without regenerating GPT-Image-2 or rerunning CV.
- Phase 3 training data comes from `reference.png + prediction_omm + correction_omm`.

### 2. Backend API Service (`@omm/api`)

Phase 2 uses a hybrid backend architecture:

```text
TypeScript API backend = SaaS/product control plane
Python CV workers = image extraction execution plane
```

The TypeScript API owns auth, session, quota, payments, generation jobs, artifact ownership, LLM calls, GPT-Image-2 calls, and worker orchestration. The Python worker owns CV extraction only. The boundary between them is stable JSON artifacts and file/blob references.

- **Orchestrator:** Receives text/content-outline input, validates auth and quotas.
- **Outline Handler:** 
  - If text: calls LLM to generate JSON structure.
  - If content-outline-text: parses the indentation-based plain text format into standard JSON structure.
- **Image Generation:** Calls GPT-Image-2 using the prompt and structure to get `reference.png`.
- **Worker Dispatch:** Sends `reference.png`, content outline, extraction profile, and output location to Python CV workers.
- **Artifact Ownership:** Stores job state and artifact references for authenticated users.

### 3. CV Extraction Pipeline (Python Workers)

Python CV workers are intentionally not the product backend. They should be callable locally during Phase 2 prototyping and later through a queue or worker service. They receive explicit inputs and return artifacts; they do not own auth, quotas, payments, user sessions, or model-generation policy.

```text
reference.png + source_structure.json
  |
  v
extract_layers.py (Foreground, Branches, Text, Doodles)
  |
  v
refine_doodles.py (Repair and crop)
  |
  v
build_groups.py (OCR text classification, Figma-like groups)
  |
  v
extract_editable_branches.py (Centerlines and width profiles)
  |
  v
JSON / SVG Artifacts returned to Web Frontend
```

## Source Structure (content-outline-text Parsing)

The system supports `content-outline-text`, a constrained field-less indentation-based plain text format.

Parser Logic:
- Level 1 (indent 0): `center`
- Level 2 (indent 1): `branches`
- Level 3+ (indent 2+): `subbranches`

Example Input:
```text
Project Center
  Phase 1
    Task A
    Task B
  Phase 2
```

Internal JSON representation:
```json
{
  "center": "Project Center",
  "branches": [
    {
      "concept": "Phase 1",
      "children": ["Task A", "Task B"]
    },
    {
      "concept": "Phase 2",
      "children": []
    }
  ]
}
```

## Layer Extraction

Script: `PHASE_2_2nd_attempts/extract_layers.py`
(Remains largely the same, but packaged for worker execution).

## Integration Plan

### Stage 1: Stabilize CV Workers
Migrate `PHASE_2_*_attempts` into a stable backend Python worker service (`@omm/cv-worker`).

### Stage 2: Frontend App Foundation
Build `@omm/web` as a Vue/Vite Excalidraw-like app. The homepage loads an onboarding map artifact.

### Stage 3: Generation Orchestration
Implement the TypeScript backend API to handle text/content-outline input, coordinate LLM and GPT-Image-2 calls, and dispatch extraction tasks to the Python CV workers.

### Stage 4: Payments and Production Integration
Implement Google/OpenAI SSO, integrate Stripe for quota management, and deploy the frontend, TypeScript API, and Python CV workers as a unified SaaS platform.

## Engineering Constraints

- Deliver a seamless SaaS web experience.
- The landing page must be the app itself.
- Keep SaaS control-plane logic in the TypeScript API backend.
- Keep CV/image-processing logic in Python workers.
- Communicate between backend and workers through stable schemas and artifact references, not ad hoc process output.
- Keep intermediate artifacts inspectable via the web UI.
- Do not allow Phase 2 editing work to blur the product into a generic whiteboard; keep strictly to the Buzan-style organic mind map identity.
