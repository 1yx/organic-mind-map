# Phase 2 Second Attempt: CV Layer Extraction

## Goal

Use the best full visual reference image from GPT Image 2 as the source of artistic composition, then use a local CV pipeline to split the image into coarse asset layers:

- `branches`: thick organic colored branches.
- `text`: handwritten Chinese/English labels.
- `doodles`: remaining illustration assets.

The immediate goal is not full semantic reconstruction, not perfect SVG tracing, and not automatic tree understanding. The goal is a practical extraction stage that preserves GPT Image 2's visual coordination while giving the next reconstruction step usable masks and crops.

## Why This Attempt Exists

The first attempt tried to force GPT Image 2 to produce an engineering-grade master or a highly parseable blueprint. That reduced the organic mind map quality and pushed the output toward flowcharts.

This attempt keeps GPT Image 2 in its strongest role:

```text
GPT Image 2 -> complete visual reference image
CV pipeline -> coarse visual layer separation
program/manual tools -> later reconstruction
```

## Non-Goals

- Do not ask GPT Image 2 to generate final transparent masks.
- Do not require GPT Image 2 to use exact chroma-key colors.
- Do not require GPT Image 2 to produce label boxes, placeholder IDs, or parseable flowchart structure.
- Do not solve automatic semantic tree reconstruction in this attempt.
- Do not deploy a CV server before the extraction behavior is proven locally.

## Recommended Architecture

Start with a local CLI-style Python prototype:

```text
input.png
  -> preprocess white background
  -> extract branch mask with OpenCV color/shape rules
  -> detect text regions with OCR when available
  -> extract text mask from OCR boxes or black-ink fallback
  -> residual foreground becomes doodle candidates
  -> connected components produce doodle crops
  -> write debug overlays and segmentation metadata
```

Later, after validating several generated references:

```text
local CLI prototype
  -> optional SAM2 adapter for difficult doodle refinement
  -> omm-cv extract command
  -> optional local/remote CV service
```

The preferred future direction is to build our own CV pipeline first, but not deploy it as a service until the extraction behavior is proven:

```text
local prototype
  -> OpenCV branch/foreground extraction
  -> PaddleOCR text detection
  -> hosted SAM2 adapter for difficult mask refinement
```

After several GPT Image 2 reference images can be split into stable `branches`, `text`, and `doodles` layers, package the pipeline behind a CLI:

```bash
omm-cv extract input.png --out output/
```

Only after the CLI is reliable should we consider Web, Figma, or workflow integration:

```text
stable omm-cv CLI
  -> Web/Figma integration if needed
  -> CV service only if remote execution, sharing, batching, or UI integration requires it
```

This avoids prematurely operating a CV service while the extraction rules are still changing.

## Layer Strategy

### Branches

Branches in the successful reference image are large, saturated colored strokes. They can be extracted with HSV saturation/value thresholds, then filtered by connected-component area and morphology.

Expected issues:

- Small colored doodle fills may leak into the branch mask.
- Branches with yellow or low saturation may need per-image tuning.
- Anti-aliased edges will create soft boundary pixels.

The prototype intentionally extracts coarse masks first. Precision can be improved later with per-component width, skeleton length, or manual correction.

### Text

Text and doodle outlines are both black, so color alone is not enough.

Preferred path:

```text
OCR text detector -> text bounding boxes -> black pixels inside expanded boxes -> text mask
```

Fallback path:

```text
black-ink connected components -> small/thin components near horizontal text-like clusters
```

The fallback is weaker but allows the rest of the pipeline to run without OCR dependencies.

### Doodles

Doodles are extracted as residual foreground:

```text
doodles = foreground - branches - text
```

Then connected components are used to produce crop images and `segmentation.json` entries. This is intentionally coarse: doodles may contain multiple nearby icons until later grouping logic improves.

### Doodle Text And Visual Groups

Some recognized text is part of a doodle rather than a map label. Examples:

- text inside a browser/window illustration
- words inside speech bubbles
- labels embedded in Venn diagrams
- symbolic text like `</>` inside an icon

The target representation should keep masks separate while binding related pieces together like a Figma group:

```text
visual_group
  -> doodle image/mask layer
  -> doodle_text mask/OCR layer
```

This means OCR output must be classified into at least three buckets:

- `map_text`: semantic mind map labels and title text.
- `doodle_text`: text that belongs to a nearby doodle asset.
- `unassigned_text`: text that is ambiguous and needs manual review.

Initial grouping rules:

1. Build doodle components from the doodle mask.
2. Build OCR text boxes with recognized text and confidence scores.
3. If a source structure file is available, classify OCR text by matching against the original manuscript first:
   - `title`
   - `center`
   - branch `concept`
   - branch `children`
4. Only after source-structure matching, classify remaining OCR text by proximity:
   - near/inside doodle bbox -> `doodle_text`
   - otherwise -> `unassigned_text`
5. Keep ambiguous items explicit in `unassigned_text` instead of silently merging them.

With source structure, output text categories become:

```text
title_text
center_text
branch_text
child_text
doodle_text
unassigned_text
```

Expected outputs:

```text
groups.json
map_text_mask.png
doodle_text_mask.png
unassigned_text_mask.png
group_preview.png
```

This moves the pipeline from raw mask separation toward editable asset structure:

```text
branches
title / center / branch / child text
visual groups
  -> doodle layer
  -> internal doodle text layer
```

## Dependencies

Baseline local dependencies, installed and run through `uv`:

- `opencv-python`
- `numpy`

Optional OCR dependencies:

- `paddleocr`
- `paddlepaddle`

Optional later dependencies:

- hosted SAM2 adapter through Replicate/fal/Roboflow for mask refinement
- local SAM2 only if cost/privacy/latency require it

## Execution Plan

1. Create a local extraction script in this directory.
2. Run dependency checks.
3. Put the GPT Image 2 visual reference into `PHASE_2_2nd_attempts/input/reference.png`.
4. Run extraction:

   ```bash
   cd PHASE_2_2nd_attempts
   UV_CACHE_DIR=../.tmp/uv-cache uv run python extract_layers.py \
     input/reference.png \
     --out output/reference
   ```

   If dependencies are already installed and network access is unavailable, use:

   ```bash
   cd PHASE_2_2nd_attempts
   UV_CACHE_DIR=../.tmp/uv-cache uv run --no-sync python extract_layers.py \
     input/reference.png \
     --out output/reference
   ```

5. Inspect:

   - `branches_mask.png`
   - `text_mask.png`
   - `doodles_mask.png`
   - `foreground_mask.png`
   - `debug_overlay.png`
   - `doodles/*.png`
   - `segmentation.json`

6. Tune thresholds in the script or add a small config file once we see real failure modes.

## Success Criteria

The attempt is useful if, on the successful GPT Image 2 reference image:

- The six main colored branches are mostly captured in `branches_mask.png`.
- Most handwritten title/branch labels are captured in `text_mask.png`.
- Most illustration assets remain in `doodles_mask.png` and appear as crop candidates.
- The output is good enough for a human or later tooling to correct quickly.

## Decision Point

After testing on at least three GPT Image 2 references:

- If branch and text extraction are stable, keep improving the local pipeline.
- If doodle grouping is the main problem, add SAM2 as an optional refinement step.
- If OCR text boxes are unstable, evaluate stronger OCR/text detectors before custom training.
- Only deploy a CV service after the local CLI has predictable outputs.

## SAM2 Validation Path

SAM2 is a refinement candidate, not the primary layer separator. The current Replicate `meta/sam-2` model is useful for hosted validation because it can perform automatic mask generation and returns:

- `combined_mask`
- `individual_masks`

However, this Replicate model is not the ideal final adapter for our needs because it does not expose a direct box-prompt API in the same way as some SAM2 services. For now, use it to answer a narrower question:

```text
Given a doodle crop, does SAM2 produce a cleaner object mask than local fill/close repair?
```

Validation steps:

1. Pick a problematic doodle crop from `output/reference_ocr/doodles/` or `output/reference_ocr_refined_doodles/doodles/`.
2. Run hosted SAM2 on that crop.
3. Save the returned combined and individual masks under `output/sam2_probe/`.
4. Compare against:
   - original OCR residual crop
   - local `refine_doodles.py` crop
   - SAM2 masks

If Replicate SAM2 clearly improves crop-level masks, then evaluate a more promptable hosted SAM2 API, such as one with box prompts, before building a local SAM2 runtime.

If SAM2 does not materially improve over local repair for these doodles, keep the local OpenCV/PaddleOCR pipeline and focus on better post-processing.

Current decision: Replicate `meta/sam-2` automatic mask generation was tested and rejected as the main doodle refinement path. See `TECH_DECISIONS.md`.
