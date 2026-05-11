# Phase 2 CV Technical Decisions

## Decision: Replicate SAM2 Automatic Mask Is Not The Main Doodle Refinement Path

Date: 2026-05-11

### Context

The CV pipeline separates a GPT Image 2 reference image into:

- `branches`
- `text`
- `doodles`

After adding PaddleOCR, the text layer became cleaner, but the doodle residual layer can still fragment icons or remove interiors. A clear example is a team/person doodle where face and body interiors can become hollow after OCR/text subtraction.

SAM2 was evaluated as a potential doodle mask refinement step.

### Candidate

Replicate model:

```text
meta/sam-2
```

This model provides hosted SAM2 automatic mask generation and returns:

- `combined_mask`
- `individual_masks`

### Experiment

Input crop:

```text
output/reference_ocr/doodles/doodle_017.png
```

Probe output:

```text
output/sam2_probe/doodle_017/
```

Parameter sweep output:

```text
output/sam2_sweep/
```

Tested parameter sets:

| Name | `points_per_side` | `pred_iou_thresh` | `stability_score_thresh` | Result |
| --- | ---: | ---: | ---: | --- |
| baseline | 32 | 0.88 | 0.95 | 14 masks |
| coarse | 16 | 0.88 | 0.95 | 14 masks |
| loose | 32 | 0.75 | 0.85 | 41 masks |
| strict | 32 | 0.92 | 0.97 | 5 masks |

### Findings

- The Replicate SAM2 model ran successfully after API credit was available.
- The automatic mask interface segmented the crop into local parts such as speech bubbles, laptop, and small regions.
- Lower thresholds (`loose`) increased the number of fragmented masks.
- Higher thresholds (`strict`) kept fewer local masks, but did not produce a whole doodle-group mask.
- Lowering `points_per_side` from 32 to 16 did not change the output for this crop.
- No tested setting produced the desired mask for the whole doodle group, such as "three people + laptop + speech bubbles".

### Decision

Do not use Replicate `meta/sam-2` automatic mask generation as the main doodle refinement path.

It is useful for proving hosted SAM2 access and for inspecting local sub-object masks, but it does not expose the prompt control needed for this task.

### Rationale

The problem needs an object-level or group-level prompt:

```text
segment this doodle group inside this box
```

Automatic mask generation is not given that intent. It optimizes for generic object proposals, so it naturally splits doodles into multiple semantic/visual parts.

Tuning these parameters changes proposal density and filtering, not the intended object grouping:

- `points_per_side`: sampling density
- `pred_iou_thresh`: predicted quality filtering
- `stability_score_thresh`: mask stability filtering

### Current Preferred Path

Use local post-processing as the default:

```text
OpenCV + PaddleOCR extraction
  -> refine_doodles.py hole fill / close repair
```

This directly fixes many hollow/interior artifacts and is cheap, local, and deterministic.

### Next Candidate

Evaluate a SAM2 API that supports promptable segmentation:

```text
box prompt / point prompt -> mask
```

Preferred candidates:

- hosted SAM2 with `box_prompts` / point prompts, such as fal.ai SAM2 image API
- local SAM2 or Hugging Face Transformers SAM2 with `input_boxes`

Optional comparison:

- Replicate `ocg2347/sam-pointprompt` supports point prompts but uses older SAM, not SAM2. It may still be useful to validate whether promptable segmentation is materially better than automatic masks.

### Status

Rejected for main doodle refinement path.

Keep the probe script for future comparison:

```text
run_replicate_sam2.py
```

Keep outputs for audit:

```text
output/sam2_probe/
output/sam2_sweep/
```

