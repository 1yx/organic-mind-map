# Phase 2 Third Attempt: Editable Branch Curves

## Goal

Convert the colored organic branches from the GPT Image 2 visual reference into editable vector curves that can be modified with a pen tool while preserving the original branch rhythm and approximate stroke thickness.

The immediate output should be an SVG or canvas-state prototype where each branch is represented as a small number of editable paths:

```text
branch centerline path + stroke color + stroke width
```

This attempt is not about full mind map reconstruction. It focuses only on converting raster branch strokes into editable branch curves.

## Input

Use the successful visual reference image:

```text
PHASE_2_3rd_attampts/reference.png
```

If missing, copy it from:

```text
PHASE_2_2nd_attempts/input/reference.png
```

Useful prior output from the second attempt:

```text
PHASE_2_2nd_attempts/output/reference/branches_mask.png
PHASE_2_2nd_attempts/output/reference_ocr_v2/branches_mask.png
```

The branch mask is a good starting point, but agents may regenerate it if the current mask is too coarse.

## Desired Output

Create outputs under:

```text
PHASE_2_3rd_attampts/output/
```

Recommended files:

```text
editable_branches.svg
editable_branches.json
branch_skeleton_debug.png
branch_overlay_debug.png
```

Optional:

```text
editable_canvas.html
```

`editable_branches.svg` should contain editable SVG `<path>` elements, not baked raster images. The paths should be simple enough for pen-tool editing in Figma/Illustrator/Inkscape or a later canvas editor.

## Non-Goals

- Do not reconstruct doodles.
- Do not reconstruct text.
- Do not trace every anti-aliased edge into detailed outline polygons.
- Do not produce thousands of tiny vector segments.
- Do not create generic whiteboard or node-link boxes.
- Do not modify production packages.

## Core Technical Strategy

### 1. Extract Branch Mask

Start from an existing branch mask or regenerate it with OpenCV:

```text
source image
  -> HSV high saturation / non-background filtering
  -> remove yellow center card and small doodle color fills
  -> morphology close/open
  -> connected components
  -> keep branch-like long colored regions
```

The second attempt already has a useful branch extraction approach in:

```text
PHASE_2_2nd_attempts/extract_layers.py
```

Reusing that logic is preferred.

### 2. Skeletonize Branch Strokes

Convert the branch mask into one-pixel-wide centerlines.

Implementation options:

- Prefer `cv2.ximgproc.thinning` if `opencv-contrib-python` is installed.
- Otherwise implement Zhang-Suen thinning in pure NumPy/OpenCV.
- As a fallback, use distance transform ridge extraction, but thinning is preferred.

Output debug:

```text
branch_skeleton_debug.png
```

### 3. Split Skeleton Into Editable Segments

Build a graph from skeleton pixels:

```text
pixel -> neighbors in 8-connected skeleton
degree 1 -> endpoint
degree 2 -> normal path point
degree >= 3 -> junction
```

Trace paths between:

- endpoint to junction
- junction to junction
- endpoint to endpoint

This prevents one giant path from hiding branch topology. Each main branch and child branch should become one or a few editable curves.

### 4. Smooth And Simplify Centerlines

Raw skeleton points will be noisy. Convert each traced pixel path into a smaller editable point set.

Recommended:

```text
trace points
  -> remove tiny paths
  -> Ramer-Douglas-Peucker simplify
  -> optional Chaikin smoothing 1-2 passes
  -> preserve endpoints
```

Then convert simplified points into SVG paths:

- Use polyline-style `M/L` first for easy debugging.
- Upgrade to cubic Bezier `M/C` after the segmentation works.

For cubic Bezier conversion, fit Catmull-Rom through simplified points and convert to cubic Bezier segments.

### 5. Estimate Stroke Width

Use distance transform on the original branch mask:

```text
distance_transform(branch_mask)
stroke_width_at_skeleton_point = 2 * distance_value
```

For each editable segment:

- estimate median width
- optionally estimate start/middle/end width

Initial SVG can use one constant `stroke-width` per path. This gives pen-tool editable curves and approximate visual thickness.

Later improvement:

```text
variable-width branch = centerline + sampled width profile
```

But plain SVG strokes do not support variable width directly. If variable width is needed, use one of:

- keep centerline plus width profile in JSON for later custom renderer
- generate editable outline path separately
- split one branch into several constant-width path sections

For this attempt, constant-width per segment is acceptable.

### 6. Estimate Branch Color

Sample original image pixels under each segment's branch mask.

For each segment:

```text
median RGB or dominant color
```

Use that as SVG `stroke`.

This should recover colors close to:

- orange
- purple
- pink
- green
- blue
- cyan

### 7. Generate Editable SVG

Create:

```svg
<svg viewBox="0 0 1448 1086">
  <g id="editable-branches" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path id="branch_001" d="M ... C ..." stroke="#..." stroke-width="..." />
  </g>
</svg>
```

Keep debug metadata in `editable_branches.json`:

```json
{
  "source": "reference.png",
  "branches": [
    {
      "id": "branch_001",
      "path": "M ...",
      "stroke": "#...",
      "strokeWidth": 28,
      "bbox": [x, y, w, h],
      "points": [[x, y], ...],
      "widthSamples": [34, 32, 28, 20]
    }
  ]
}
```

## Implementation Plan

1. Copy/reference `reference.png`.
2. Reuse or regenerate `branches_mask.png`.
3. Implement `branch_skeletonize.py`.
4. Implement graph tracing from skeleton.
5. Implement simplification and smoothing.
6. Generate `editable_branches.svg`.
7. Generate `editable_branches.json`.
8. Generate debug overlay:

   ```text
   original image + editable SVG paths rendered/overlaid
   ```

9. Inspect whether each main/child branch is editable as a curve and visually aligned with the source.

## Suggested Scripts

Recommended files:

```text
extract_editable_branches.py
render_branch_overlay.py
```

Suggested command:

```bash
cd PHASE_2_3rd_attampts
UV_CACHE_DIR=../.tmp/uv-cache \
uv run --project ../PHASE_2_2nd_attempts --no-sync python extract_editable_branches.py \
  reference.png \
  --branches-mask ../PHASE_2_2nd_attempts/output/reference/branches_mask.png \
  --out output
```

If using the second attempt's `.venv`, keep dependencies there and avoid creating a new environment unless necessary.

## Quality Bar

The attempt is successful if:

- At least the six main colored branches become editable SVG paths.
- Most child branch curves are also represented as paths.
- The paths are visually aligned with the original branch rhythm.
- Stroke colors are close to the source.
- Stroke widths are close enough to preserve branch weight.
- The SVG can be opened in a vector editor and edited with pen/path tools.

It is acceptable if:

- Some branches are split into multiple segments.
- Some minor decorative colored strokes are ignored.
- Width is constant per segment instead of smoothly tapered.

It is not acceptable if:

- The output is an outline trace with hundreds/thousands of points.
- The branches are raster images embedded in SVG.
- The center card or doodles dominate the branch output.
- The curves become mechanical and lose the original organic rhythm.

## Known Risks

### Junction Complexity

The center area and branch forks can produce messy skeleton junctions. If graph tracing fails, start by manually masking out the center card and treating each connected branch component independently.

### Constant Width Limitation

Organic branches taper, but SVG centerline strokes are constant width. Constant width is acceptable for this attempt, but later work may need a width profile or editable outline path.

### Branch Mask Leakage

Colored doodle fills and green checkmarks may leak into the branch mask. Filter by connected component geometry and exclude yellow center/stars/checks where possible.

### Over-Smoothing

Too much smoothing can remove the hand-drawn rhythm. Prefer light smoothing and keep enough control points to preserve organic bends.

## Follow-Up

If centerline editable paths look good, the next step is to integrate them with the second attempt's grouped text/doodle layers:

```text
editable branches
  + semantic text masks/OCR groups
  + doodle visual groups
  -> editable reconstruction prototype
```

