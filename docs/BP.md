# Organic Mind Map Phase 2 BP

## Positioning

Organic Mind Map is a toolchain for turning AI-generated organic mind map reference images into editable, structured mind map assets.

Phase 1 proved the validated preview/export path. Phase 2 changes the product center of gravity:

```text
content structure + AI visual reference
  -> CV layer extraction
  -> semantic text alignment
  -> editable doodle/text/branch groups
  -> human-correctable editable reconstruction
```

The goal is not a generic whiteboard. The product remains focused on Buzan-style organic mind maps: center visual, thick organic colored branches, concise keywords, doodle illustrations, and spatial memory anchors.

## Phase 1 Archive

The previous Phase 1 documentation has been moved to:

```text
docs_old/
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

Secondary users:

- developers evaluating an image-to-editable-mind-map pipeline
- teams building custom mind map generation flows

## Value Proposition

Phase 2 is valuable if it reduces the gap between "great AI-generated image" and "editable structured design asset".

Users should be able to:

- keep the visual quality of the best GPT Image 2 reference
- split branches, text, and doodles into usable layers
- bind doodle text with doodles like a Figma group
- recover semantic map text from the original source structure
- edit branch curves with a pen-tool-like workflow
- export intermediate artifacts for later reconstruction

## Community vs Plus Boundary

Community/free capabilities should include:

- local reference image ingestion
- local OpenCV branch extraction
- local PaddleOCR text extraction when dependencies are installed
- local grouping against source structure
- local refined doodle masks
- local editable branch SVG/Paper.js prototype
- transparent artifact export

Potential Plus capabilities may include:

- hosted batch processing
- managed GPU/CV workers
- hosted promptable SAM2 or future segmentation services
- AI-generated doodle/icon variants
- cloud project storage and team collaboration
- high-quality design review or auto-correction workflows

Do not make Plus the only way to get a valid editable map. Plus should improve speed, convenience, or quality, not replace the local path.

## Business Constraints

- Keep the core pipeline local-first and reproducible.
- Do not depend on one hosted CV provider for the base workflow.
- Do not require a remote account for basic extraction.
- Keep intermediate artifacts inspectable: masks, JSON, SVG, debug overlays.
- Preserve the strict organic mind map identity.

## Phase 2 Success

Phase 2 succeeds when a user can start from:

```text
source structure + AI visual reference image
```

and produce:

```text
branches_mask
semantic text masks
doodle masks
visual groups
editable branch curves
debug previews
structured JSON
```

with enough quality that a designer/developer can correct the result rather than recreate it manually.

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

1. Stabilize `PHASE_2_2nd_attempts` into an `omm-cv extract` prototype.
2. Stabilize `PHASE_2_3rd_attampts` into an editable branch curve prototype.
3. Define a shared Phase 2 artifact schema.
4. Combine extracted doodle/text groups with editable branch curves.
5. Build an inspect-and-correct UI.
6. Decide whether the UI remains a standalone prototype or becomes part of `@omm/web`.

