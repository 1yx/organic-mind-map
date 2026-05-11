# SAM2 Adapter Plan

SAM2 should be used as an optional refinement step after the local OpenCV + PaddleOCR pipeline, not as the primary extractor.

## Current Problem

OCR-based text subtraction can make doodle masks fragmented. Typical artifacts:

- Faces or skin fills become hollow.
- Doodle outlines remain but interiors disappear.
- One visual doodle can split into several connected components.

Local `refine_doodles.py` already repairs many of these issues by filling enclosed holes and re-exporting transparent crops.

## When To Use SAM2

Use SAM2 when local mask repair is not enough:

- A doodle is split into multiple disconnected parts.
- Interior fills are not enclosed, so hole filling cannot recover them.
- OCR removes meaningful black strokes from an icon.
- A crop contains both doodle and nearby branch/text remnants and needs object-level segmentation.

## Hosted SAM2 Strategy

Preferred first implementation:

```text
source image + doodle bbox/crop
  -> hosted SAM2 with box prompt
  -> returned object mask
  -> merge mask back into full-size doodles layer
```

Use hosted SAM2 first because local SAM2 requires PyTorch, checkpoints, and heavier runtime setup. Replicate's `meta/sam-2` is promptable for image segmentation and runs remotely; local SAM2 can be revisited after the workflow is proven.

## Required Credential

The hosted adapter requires:

```bash
export REPLICATE_API_TOKEN=...
```

Without this token, we can prepare the inputs and local fallback outputs, but cannot call Replicate.

## Integration Shape

Future CLI shape:

```bash
omm-cv refine-doodles \
  input/reference.png \
  output/reference_ocr \
  --method sam2-replicate \
  --out output/reference_sam2
```

The first SAM2 version should refine selected doodle components only, not the full image. That keeps cost and ambiguity down.

## Current Local Fallback

Run:

```bash
cd PHASE_2_2nd_attempts
UV_CACHE_DIR=../.tmp/uv-cache uv run --no-sync python refine_doodles.py \
  input/reference.png \
  output/reference_ocr \
  --out output/reference_ocr_refined_doodles
```

Outputs:

- `doodles_refined_mask.png`
- `doodles_refined_rgba.png`
- `doodles/*.png`
- `refined_doodles.json`

