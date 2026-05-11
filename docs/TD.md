# Organic Mind Map Phase 2 Technical Design

## Scope

This technical design covers the Phase 2 experimental pipeline:

```text
AI visual reference image
  -> CV layer extraction
  -> OCR and source-structure text classification
  -> doodle/text visual groups
  -> editable branch curve extraction
  -> Paper.js correction prototype
```

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
```

Frontend prototype:

```text
Paper.js 0.12.18
HTML canvas
SVG import/export
```

Current root Python version:

```text
.python-version -> 3.11
```

## Pipeline Architecture

```text
reference.png
source_structure.json
  |
  v
extract_layers.py
  -> foreground_mask.png
  -> branches_mask.png
  -> text_mask.png
  -> doodles_mask.png
  -> segmentation.json
  |
  v
refine_doodles.py
  -> doodles_refined_mask.png
  -> doodles_refined_rgba.png
  -> refined doodle crops
  |
  v
build_groups.py
  -> groups.json
  -> title/center/branch/child/doodle/unassigned text masks
  -> group_preview.png
  |
  v
extract_editable_branches.py
  -> editable_branches.svg
  -> editable_branches.json
  -> branch_skeleton_debug.png
  -> branch_overlay_debug.png
  |
  v
editable_canvas.html
  -> Paper.js pen-tool correction
  -> edited_branches.svg
```

## Source Structure

The source structure is required for reliable text classification.

Path:

```text
PHASE_2_2nd_attempts/source_structure.json
```

It contains:

```text
title
center
branches[].concept
branches[].children[]
```

OCR text is matched against this structure before spatial heuristics are applied.

## Layer Extraction

Script:

```text
PHASE_2_2nd_attempts/extract_layers.py
```

### Foreground

Foreground is extracted from white/off-white background using grayscale darkness and HSV saturation.

### Branches

Branches are extracted using HSV saturation/value thresholds with yellow exclusion for center cards, stars, and smileys.

Connected components and geometry filters keep long branch-like regions.

Outputs:

```text
branches_mask.png
branches_rgba.png
```

### Text

PaddleOCR is the preferred mode:

```bash
--ocr paddle
```

The script configures PaddleOCR without document orientation, unwarping, or textline orientation models to reduce model downloads and runtime:

```text
use_doc_orientation_classify=False
use_doc_unwarping=False
use_textline_orientation=False
```

Text output includes:

```text
id
bbox
text
score
```

### Doodles

Doodles are extracted as residual foreground after removing branch and text masks.

This is intentionally coarse. Later grouping and local repair improve usability.

## Doodle Refinement

Script:

```text
PHASE_2_2nd_attempts/refine_doodles.py
```

Purpose:

- repair hollow faces and body interiors
- close small gaps
- fill enclosed holes
- regenerate transparent crops

This is the current preferred doodle refinement path.

## Visual Grouping

Script:

```text
PHASE_2_2nd_attempts/build_groups.py
```

Inputs:

```text
segmentation.json
text_mask.png
refined_doodles.json
source_structure.json
reference.png
```

Classification order:

1. match OCR text against source `title`
2. match against source `center`
3. match against branch concepts
4. match against child labels
5. assign remaining nearby text to doodle groups
6. place unresolved text in `unassigned_text`

Outputs:

```text
groups.json
title_text_mask.png
center_text_mask.png
branch_text_mask.png
child_text_mask.png
doodle_text_mask.png
unassigned_text_mask.png
map_text_mask.png
group_preview.png
```

Group semantics:

```text
visual_group
  -> doodle component(s)
  -> doodle_text OCR component(s)
```

This mirrors Figma group behavior while keeping masks separate.

## Editable Branch Extraction

Scripts:

```text
PHASE_2_3rd_attampts/extract_editable_branches.py
PHASE_2_3rd_attampts/render_branch_overlay.py
```

Input:

```text
reference.png
branches_mask.png
```

Design:

1. extract or reuse branch mask
2. skeletonize branch strokes
3. trace skeleton graph into segments
4. simplify and smooth centerline points
5. estimate stroke width with distance transform
6. sample branch color from source image
7. emit editable SVG paths and JSON metadata

Outputs:

```text
editable_branches.svg
editable_branches_outline.svg
editable_branches.json
branch_skeleton_debug.png
branch_overlay_debug.png
coverage_diff.png
editable_canvas.html
```

## Paper.js Selection

Paper.js is selected for the Phase 2 branch editing prototype because it provides:

- canvas-based vector editing
- SVG import/export
- path, segment, and handle primitives
- hit testing on strokes and handles
- interactive tools for selection and pen-like editing
- enough structure to prototype Figma-like curve correction without building a full editor

The current prototype:

```text
PHASE_2_3rd_attampts/output/editable_canvas.html
```

Capabilities:

- display source raster as a reference layer
- display variable-width outline as a non-editable reference
- display editable centerline paths
- select paths and segments
- move segment points and handles
- delete selected points
- extend paths or create new paths in pen mode
- toggle handles/source/outline
- adjust editable path opacity
- reset path edits
- export edited SVG

This is a prototype technology choice, not yet a production UI commitment.

## SAM2 Decision

Replicate `meta/sam-2` automatic mask generation was evaluated and rejected as the main doodle refinement path.

Reason:

- automatic masks split doodles into local pieces
- parameter tuning changes proposal density, not grouping intent
- no tested setting produced a whole doodle-group mask

Current preference:

```text
OpenCV + PaddleOCR + local doodle repair
```

Future candidate:

```text
promptable SAM2 with box/point prompts
```

See:

```text
PHASE_2_2nd_attempts/TECH_DECISIONS.md
```

## Artifact Schema Direction

Phase 2 should converge on a single artifact schema:

```json
{
  "sourceImage": "reference.png",
  "sourceStructure": {},
  "imageSize": { "width": 1448, "height": 1086 },
  "layers": {
    "branches": {},
    "text": {},
    "doodles": {}
  },
  "groups": [],
  "editableBranches": []
}
```

Important object types:

- `branch_curve`
- `title_text`
- `center_text`
- `branch_text`
- `child_text`
- `doodle_text`
- `doodle_asset`
- `visual_group`
- `unassigned_text`

## Integration Plan

### Stage 1: Stabilize Experiments

Keep code under `PHASE_2_*_attempts` until output schemas and quality gates settle.

### Stage 2: Package CLI

Create a local CLI:

```bash
omm-cv extract input.png --structure source_structure.json --out output/
omm-cv branches input.png --branches-mask branches_mask.png --out output/
```

### Stage 3: Review UI

Build a local review UI that can inspect:

- source image
- masks
- groups
- editable branch curves
- text classification

### Stage 4: Production Integration

Only after the CLI and schemas stabilize should Phase 2 integrate into the pnpm workspace packages.

Potential package boundaries:

- `@omm/cv` or scripts for local Python pipeline wrappers
- `@omm/web` for review/correction UI
- `@omm/core` for shared artifact schemas

## Engineering Constraints

- Keep Phase 2 local-first.
- Keep hosted APIs optional.
- Keep generated artifacts inspectable.
- Preserve source images and debug overlays.
- Do not require a CV service before the CLI is stable.
- Do not allow Phase 2 editing work to blur the product into a generic whiteboard.

## Verification

A Phase 2 run should be considered valid when:

- branch mask extracts the six main branches
- OCR detects source-structure text with acceptable confidence
- map text and doodle text are classified separately
- visual groups are generated and previewed
- editable branch curves align with the source image
- Paper.js editor can modify and export branch paths

