# Organic Mind Map Phase 2 Technical Design

## Scope

This technical design covers the Phase 2 SaaS architecture, transitioning the experimental pipeline into a production web service:

```text
Frontend (Web Canvas) <-> API Backend <-> External Models (LLM, GPT-Image-2)
                                      <-> Python CV Workers
```

The pipeline covers:

- Text-to-structure (LLM) or Simple YAML Parsing
- Structure-to-image (GPT-Image-2)
- CV layer extraction (Python backend)
- Excalidraw-like Web UI (Paper.js / React / etc.)
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
PyYAML (for simple outline parsing)
```

Frontend:

```text
React / Next.js
Paper.js 0.12.18
Stripe SDK
NextAuth.js (for SSO)
```

## Platform Architecture

### 1. Web Application (`@omm/web`)

- **Landing Page/App:** The home route `/` serves the full Excalidraw-like canvas loaded with an onboarding mind map.
- **Input Interface:** Supports both natural language prompts and a code editor for simple YAML outlines.
- **Auth:** Google & OpenAI SSO integration via NextAuth.
- **Payments:** Subscription/Quota gating via Stripe.
- **Canvas:** Paper.js integrated into the React frontend for pen-tool correction and visual group manipulation.

### 2. Backend API Service (`@omm/api`)

- **Orchestrator:** Receives text/YAML, validates auth and quotas.
- **Outline Handler:** 
  - If text: calls LLM to generate JSON structure.
  - If YAML: parses simple indentation-based format into standard JSON structure.
- **Image Generation:** Calls GPT-Image-2 using the prompt and structure to get `reference.png`.

### 3. CV Extraction Pipeline (Python Workers)

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

## Source Structure (Simple YAML Parsing)

The system supports a field-less YAML format.

Parser Logic:
- Level 1 (indent 0): `center`
- Level 2 (indent 1): `branches`
- Level 3+ (indent 2+): `subbranches`

Example Input:
```yaml
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
Build `@omm/web` as an Excalidraw-like app. The homepage loads an onboarding map artifact. Implement Google/OpenAI SSO.

### Stage 3: Generation Orchestration
Implement the backend API to handle text/YAML input, coordinate LLM and GPT-Image-2 calls, and dispatch extraction tasks to the CV workers.

### Stage 4: Payments and Production Integration
Integrate Stripe for quota management. Deploy the frontend, API, and CV workers as a unified SaaS platform.

## Engineering Constraints

- Deliver a seamless SaaS web experience.
- The landing page must be the app itself.
- Keep intermediate artifacts inspectable via the web UI.
- Do not allow Phase 2 editing work to blur the product into a generic whiteboard; keep strictly to the Buzan-style organic mind map identity.
