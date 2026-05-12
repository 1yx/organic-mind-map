# Organic Mind Map Phase 2 BP

## Positioning

Organic Mind Map is a SaaS product for turning text prompts or simple YAML outlines into editable, structured organic mind map assets.

Phase 1 proved the validated preview/export path. Phase 2 changes the product center of gravity to a full web application:

```text
user text or simple YAML input
  -> LLM structure generation (if text)
  -> GPT-Image-2 visual reference generation
  -> backend CV layer extraction
  -> semantic text alignment
  -> editable doodle/text/branch groups
  -> web-based human-correctable canvas
```

The goal is not a generic whiteboard. The product remains focused on Buzan-style organic mind maps: center visual, thick organic colored branches, concise keywords, doodle illustrations, and spatial memory anchors. The final product is an interactive web app, similar to Excalidraw, where the landing page itself is the functional canvas.

## Phase 1 Archive

The previous Phase 1 documentation has been moved to:

```text
archives/phase1/docs_old/
```

Treat it as the historical MVP backup. New documents under `docs/` describe Phase 2.

## Product Thesis

LLM and image models are good at holistic composition and hand-drawn visual style, but weak at editable structure, exact masks, text reliability, and deterministic exports.

Phase 2 should use each capability where it is strong:

- AI image model: full visual reference, organic rhythm, doodle style, composition.
- OpenCV/OCR/CV pipeline: layer extraction and asset segmentation.
- Source structure: semantic truth for title, center, branches, and children.
- Paper.js / vector tooling: editable branch curves and pen-tool correction.
- Human review: final quality control where automated grouping is uncertain.

## User

Primary users:

- creators who want beautiful organic mind maps but need editable outputs
- agent workflow users who can provide a structured outline and visual reference
- designers or technical creators who can inspect masks/groups and correct them

## SaaS Business Model & Auth

Because the generation pipeline requires LLM API calls and GPT-Image-2 inference, the product is fundamentally a paid SaaS service with hard compute costs.

Capabilities:

- **App-First Landing Page:** The website homepage is the fully functional canvas (similar to Excalidraw). The default canvas displays an editable mind map introducing the website's features.
- **SSO Authentication:** Google and OpenAI SSO integration.
- **Free Trial:** Logged-in users receive a limited quota/trial to experience the text-to-map generation and editing features.
- **Paid Tier:** Users must pay (e.g., via Stripe) to unlock full generation quota, advanced export, and continued use after the trial.

## Business Constraints

- The product is a hosted web application; the local CV pipeline serves as the backend worker architecture.
- Must provide a seamless transition from the landing page (app) to authentication to generation.
- Must handle payment gating gracefully when the trial quota is exhausted.
- Keep intermediate artifacts inspectable in the web UI for debugging and correction.
- Preserve the strict organic mind map identity.

## Phase 2 Success

Phase 2 succeeds when a user can start from:

```text
natural language text input OR simple YAML outline
```

and the system automatically coordinates LLMs, GPT-Image-2, and backend CV extraction to produce a fully rendered, editable map in the browser with:

```text
semantic structure
visual groups (doodles + text)
editable branch curves
```

ready for the user to correct, edit, or export.

## Current Technical Decisions

- Build a local CV pipeline before deploying any service.
- Use OpenCV for branch/foreground extraction.
- Use PaddleOCR for OCR and text boxes.
- Use source structure to classify map text before spatial grouping.
- Use local post-processing for doodle mask repair.
- Do not use Replicate `meta/sam-2` automatic masks as the main doodle refinement path.
- Evaluate promptable SAM2 only if local repair is insufficient.
- Use Paper.js as the Phase 2 editable-branch prototype technology.

## Near-Term Roadmap

1. Package the CV extraction prototypes into backend worker services.
2. Build the Excalidraw-like app frontend (`@omm/web`), integrating Paper.js branch editing and visual groups.
3. Create the text-to-map orchestration layer (LLM -> GPT-Image-2 -> CV extraction).
4. Implement Google/OpenAI SSO authentication and trial quotas.
5. Integrate payment gateway (e.g., Stripe) for paid quotas.
6. Design the onboarding map (app landing page) to introduce the tool's features.
