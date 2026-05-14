# Organic Mind Map Schema

This document defines the Phase 2 schema direction for Organic Mind Map documents and source outlines.

The schema is intentionally product-specific. OMM is not a generic whiteboard format and should preserve Buzan-style organic mind map semantics.

## File Model

`.omm` is the single JSON-backed Organic Mind Map document format.

An OMM document is a current-state snapshot, similar to an `.excalidraw` file. It stores the current editable map state, not embedded edit history.

The root `version` field is the OMM schema version. It is not a user edit revision, file history counter, undo stack, or collaboration clock.

Do not store document history inside `.omm`:

```text
history: []
versions: []
undoStack: []
revisionLog: []
```

Server-side artifact storage may keep revisions, previous artifacts, audit records, or optimistic concurrency metadata. Those are storage/application concerns, not OMM document schema concerns.

These names describe producer or lifecycle stage, not different file formats:

```text
user-saved-omm = OMM document saved/exported by the user-facing editor
prediction_omm = OMM document produced by the CV/OCR extraction pipeline
correction_omm = OMM document produced by internal/admin correction workflow
```

All three use the same OMM document schema. They differ by `producer`, provenance, and included internal/debug data.

This schema defines OMM JSON content only. Product `document` records and `artifact` storage metadata are API/storage concepts around the OMM file; they should not be embedded as document history or storage records inside `.omm`.

Layering rule:

```text
document = product container / lifecycle record
artifact = stored file/blob/reference
OMM      = JSON-backed document content inside selected artifacts
```

## content_outline.json

`content_outline.json` is the normalized semantic and visual-intent source generated from `content-outline-text` or LLM output before GPT-Image-2 generation.

`content-outline-text` can stay field-less for users, but the normalized JSON should carry stable IDs and visual hints.

### content-outline-text

Phase 2 accepts `content-outline-text`, a constrained, field-less indentation-based plain text format for user editing. It is intentionally not YAML.

Example:

```text
Anthropic 产品之道
  极速交付
    研究预览
    跨职能
  PM 角色
    产品品味
    角色融合
```

Parsing rules:

- The first non-empty, non-comment line at indent 0 is the center concept.
- Indent 1 lines are top-level `branch` concepts / BOIs.
- Indent 2+ lines are recursive `subbranch` concepts under the nearest less-indented parent.
- Indentation uses spaces only. Tabs are invalid.
- One indentation level is two spaces in Phase 2.
- Blank lines are ignored.
- Lines starting with `#` after optional leading spaces are comments and ignored.
- Inline comments are not supported in Phase 2 because `#` can appear in natural text.
- A line's text is the whole trimmed line. Key/value syntax is not supported.
- Concepts should be concise concept units, not sentences or paragraphs.
- Empty branch lines are not part of `content-outline-text` generation input. Blank branches are represented in `.omm` after editing.

Invalid examples:

```text
# invalid: tabs
Anthropic 产品之道
	极速交付

# invalid: skipped indentation level
Anthropic 产品之道
    研究预览

# invalid: field syntax is not part of content-outline-text
center: Anthropic 产品之道
```

ID generation from `content-outline-text`:

- Top-level branch IDs are assigned from `content-outline-text` list order during create/rebuild: `branch_001`, `branch_002`, etc.
- Subbranch IDs append their sibling order under the parent: `subbranch_001_001`, `subbranch_001_002`, etc.
- Reordering `content-outline-text` changes generated IDs only on a new create/rebuild pass.
- In Phase 2, editing `content-outline-text` in the left-bottom source panel does not live-reflow the existing canvas.

Visual intent enrichment:

- `content-outline-text` does not carry `doodlePrompt`.
- The LLM / prompt builder may enrich the normalized `content_outline.json` with `doodlePrompt` values before GPT-Image-2 generation.
- Users may edit visual hints later in a structured UI, but not in `content-outline-text` for Phase 2.

```json
{
  "schema": "omm.content_outline",
  "version": 1,
  "center": {
    "id": "center",
    "concept": "Anthropic 产品之道",
    "doodlePrompt": "central hand-drawn product strategy card, friendly, no extra text"
  },
  "branches": [
    {
      "id": "branch_001",
      "class": "branch",
      "concept": "极速交付",
      "doodlePrompt": "rocket, stopwatch, preview window, fast delivery",
      "children": [
        {
          "id": "subbranch_001_001",
          "class": "subbranch",
          "concept": "研究预览",
          "doodlePrompt": "magnifying glass inspecting a preview window, no text",
          "children": []
        }
      ]
    }
  ]
}
```

Rules:

- Top-level `branch` is equivalent to BOI.
- `subbranch` may recurse without a fixed depth limit.
- `concept` may be empty/null in OMM documents for blank branches, but content outlines intended for generation should prefer explicit concepts.
- `doodlePrompt` is visual intent for image generation, not final asset geometry.

## OMM Document

Minimal shape:

```json
{
  "schema": "omm.document",
  "version": 1,
  "producer": {
    "kind": "user_editor",
    "name": "omm-web",
    "version": "phase2"
  },
  "surface": {
    "kind": "image-derived",
    "width": 1448,
    "height": 1086,
    "sourceImageId": "asset_reference"
  },
  "contentOutline": {},
  "centerAsset": "asset_center",
  "branches": [],
  "subbranches": [],
  "texts": [],
  "assets": [],
  "assetGroups": [],
  "cloudBoundaries": [],
  "associationLines": [],
  "masks": [],
  "diagnostics": [],
  "metadata": {}
}
```

## Producer

```json
{
  "kind": "prediction_cv",
  "name": "omm-cv",
  "version": "phase2-prototype",
  "createdAt": "2026-05-13T00:00:00Z"
}
```

Allowed `kind` values:

```text
user_editor
prediction_cv
admin_correction
import
```

Producer profile rules:

- `user_editor`: `user-saved-omm` (API artifact kind `user_saved_omm`). It should contain editable business objects and must not include `masks` by default.
- `prediction_cv`: machine extraction output. It may include prediction masks, OCR evidence, debug references, and extractor diagnostics.
- `admin_correction`: internal correction output. It may include corrected masks, correction operations, and Phase 3 training labels.
- `import`: imported external data. It should be normalized before becoming `user-saved-omm`.

If a user wants to export debugging or Phase 3 dataset material, that should be an explicit export profile such as `debug_bundle` or `phase3_dataset_seed`, not default `user-saved-omm` behavior.

## Surface

Phase 2 surface size primarily follows the GPT-Image-2 reference image size.

```json
{
  "kind": "image-derived",
  "width": 1448,
  "height": 1086,
  "sourceImageId": "asset_reference",
  "safeArea": { "x": 0, "y": 0, "width": 1448, "height": 1086 }
}
```

Later renderers may add presets such as `sqrt2-landscape`, but Phase 2 should preserve the source image dimensions first.

## Branch

A `branch` is a top-level BOI and same-color branch system.

```json
{
  "id": "branch_001",
  "class": "branch",
  "concept": "极速交付",
  "displayText": "极速交付",
  "tooltip": "00:03:12-00:08:40",
  "displayOrder": 10,
  "color": "#fc8b05",
  "thicknessScale": 1.0,
  "mainStroke": {
    "centerline": "M 620 500 C 540 420 460 310 330 250",
    "widthProfile": {
      "type": "root-to-tip-gradient",
      "rootWidth": 38,
      "tipWidth": 12
    }
  },
  "text": {
    "centerline": "M 410 265 C 455 250 505 258 552 278",
    "position": { "x": 408, "y": 258 },
    "font": {
      "family": "system-ui",
      "size": 42,
      "weight": 600,
      "style": "normal"
    }
  },
  "assetIds": ["asset_rocket", "asset_timer"],
  "children": ["subbranch_001_001", "subbranch_001_002"],
  "linkedMindMapId": null,
  "qualityFlags": []
}
```

Rules:

- No `orderLabel`. Visible BOI marker is derived from stable branch ID.
- `displayOrder` controls layout/read order and may change without changing `id`.
- `concept` is optional for blank branches.
- `displayText` stores the rendered text, for example English uppercase display text.
- Branch text belongs inside the branch object, so no `anchorBranchId` is needed.
- Branch text may have its own `centerline` and `position` to represent curved text placement.
- `tooltip` is hover/help text. For podcast maps it can store the audio time range.
- `linkedMindMapId` is reserved for main-map/submap linking.

## Subbranch

```json
{
  "id": "subbranch_001_001",
  "class": "subbranch",
  "parentId": "branch_001",
  "concept": "研究预览",
  "displayText": "研究预览",
  "tooltip": "00:03:12-00:05:20",
  "displayOrder": 10,
  "stroke": {
    "centerline": "M 330 250 C 250 210 190 170 120 140",
    "widthProfile": {
      "type": "root-to-tip-gradient",
      "rootWidth": 16,
      "tipWidth": 5
    }
  },
  "text": {
    "centerline": "M 90 110 C 125 96 165 100 210 118",
    "position": { "x": 88, "y": 108 },
    "font": {
      "family": "system-ui",
      "size": 30,
      "weight": 500,
      "style": "normal"
    }
  },
  "assetIds": ["asset_preview"],
  "children": []
}
```

Rules:

- `subbranch` may recursively have `children`.
- `subbranch` inherits color/category identity from its top-level `branch` unless explicitly overridden by an editor operation.
- `concept` can be null/empty for blank branches.

## Asset

`asset` is the unified concept for doodles, symbols, icons, illustrations, and imported visual material. Do not split these into separate top-level concepts.

```json
{
  "id": "asset_preview",
  "kind": "raster",
  "role": "branch_visual",
  "tooltip": "Preview feature discussed from 00:03:12 to 00:05:20",
  "source": {
    "type": "embedded",
    "mimeType": "image/png",
    "href": "assets/asset_preview.png"
  },
  "bbox": { "x": 72, "y": 92, "width": 180, "height": 130 },
  "transform": {
    "x": 72,
    "y": 92,
    "scaleX": 1,
    "scaleY": 1,
    "rotation": 0
  },
  "maskId": "mask_asset_preview"
}
```

Common `role` values:

```text
center
branch_visual
subbranch_visual
reference_image
debug_overlay
mask_preview
```

## centerAsset

`centerAsset` is the center visual asset ID. It must reference an `asset` with `role: "center"` or an equivalent center group.

The center cannot degrade to plain text only.

```json
{
  "centerAsset": "asset_center"
}
```

## Asset Group

An `assetGroup` binds visual assets and related text together, similar to a Figma group.

```json
{
  "id": "group_preview",
  "kind": "asset_group",
  "tooltip": "Research preview segment",
  "memberIds": ["asset_preview", "text_preview_label"],
  "bbox": { "x": 60, "y": 80, "width": 260, "height": 160 },
  "attachedTo": "subbranch_001_001"
}
```

## Text Object

Branch/subbranch concept text lives inside branch/subbranch objects. Standalone `texts` are for map title text, doodle-local text, unassigned OCR text, labels, or annotations.

```json
{
  "id": "text_title",
  "class": "map_title",
  "content": "How Anthropic's Product Team Moves",
  "displayText": "How Anthropic's Product Team Moves",
  "tooltip": null,
  "bbox": { "x": 460, "y": 24, "width": 540, "height": 60 },
  "centerline": "M 460 70 C 620 62 820 62 1000 70",
  "font": {
    "family": "system-ui",
    "size": 42,
    "weight": 600,
    "style": "normal"
  }
}
```

Text classes:

```text
map_title
center_text
doodle_text
unassigned_text
annotation
```

## Cloud Boundary

```json
{
  "id": "cloud_001",
  "kind": "cloud_boundary",
  "rootObjectId": "branch_001",
  "memberIds": ["branch_001", "subbranch_001_001", "subbranch_001_002", "asset_preview"],
  "outline": "M 80 100 C ... Z",
  "style": {
    "stroke": "#444444",
    "strokeWidth": 3,
    "fill": "transparent",
    "opacity": 1,
    "roughness": 0.6
  }
}
```

Cloud boundaries are Buzan memory chunks. They are not generic rectangles or cards.

## Association Line

```json
{
  "id": "assoc_001",
  "kind": "association_line",
  "sourceObjectId": "subbranch_001_001",
  "targetObjectId": "subbranch_003_002",
  "direction": "forward",
  "relationship": "causes",
  "tooltip": "This idea drives the later product matrix decision.",
  "path": "M 180 180 C 420 80 760 120 980 300",
  "style": {
    "stroke": "#333333",
    "strokeWidth": 2,
    "dash": [8, 6],
    "arrowStart": false,
    "arrowEnd": true
  }
}
```

Association lines do not mutate branch/subbranch hierarchy.

## Mask

Masks are internal extraction, correction, and training data. They are mostly present in `prediction_omm` and `correction_omm`.

`prediction_omm` may be read by the frontend as a complete extraction working document, including masks, debug references, OCR evidence, and provenance. The normal editor UI should treat those fields as internal evidence, not as user-facing canvas objects.

`user-saved-omm` documents with `producer.kind: "user_editor"` must not include `masks` by default. The user-facing editor should save editable business objects such as branches, subbranches, texts, assets, asset groups, cloud boundaries, and association lines. Mask data should stay in server-retained `prediction_omm`, internal `correction_omm`, debug bundles, or Phase 3 dataset exports.

```json
{
  "id": "mask_asset_preview",
  "class": "doodle_asset_mask",
  "objectId": "asset_preview",
  "source": {
    "type": "file",
    "href": "masks/asset_preview.png",
    "mimeType": "image/png"
  },
  "bbox": { "x": 72, "y": 92, "width": 180, "height": 130 },
  "confidence": 0.84
}
```

Mask classes:

```text
branch_system_mask
branch_segment_mask
center_asset_mask
doodle_asset_mask
asset_group_mask
map_title_mask
center_text_mask
branch_text_mask
subbranch_text_mask
doodle_text_mask
unassigned_text_mask
```

Mask class meanings:

- `branch_system_mask`: the complete same-color branch system rooted at one top-level `branch`.
- `branch_segment_mask`: one editable branch or subbranch stroke segment.
- `center_asset_mask`: the visual center asset.
- `doodle_asset_mask`: one doodle/icon/illustration/imported visual object inside the map.
- `asset_group_mask`: a grouped visual chunk, often one or more assets plus related doodle-local text.
- `map_title_mask`: text mask for the optional external map title.
- `center_text_mask`: text mask for center text inside or near the center visual.
- `branch_text_mask`: text mask for top-level branch concept text.
- `subbranch_text_mask`: text mask for descendant subbranch concept text.
- `doodle_text_mask`: text that belongs visually inside or next to a doodle/asset group.
- `unassigned_text_mask`: OCR text with no reliable semantic or visual owner.

Legacy aliases may appear in early Phase 2 outputs:

```text
branch_mask -> branch_system_mask
branch_instance_mask -> branch_segment_mask
center_visual_mask -> center_asset_mask
doodle_group_mask -> asset_group_mask
asset_mask -> doodle_asset_mask or center_asset_mask depending on object role
map_text_mask -> map_title_mask | center_text_mask | branch_text_mask | subbranch_text_mask
```

Stable OMM documents should prefer the explicit mask classes above so Phase 3 training data has unambiguous labels.

## Diagnostics

```json
{
  "id": "diag_001",
  "objectId": "branch_001",
  "severity": "warning",
  "code": "sentence_like",
  "message": "Branch concept looks sentence-like and may violate one-concept-per-branch guidance."
}
```

Common codes:

```text
sentence_like
too_long
text_overflow
line_text_mismatch
crowded_layout
missing_center_asset
missing_visual_asset
low_confidence_mask
```

## Correction Operations

Correction operations are stored in `correction_omm`.

```json
{
  "id": "op_001",
  "type": "reshape_centerline",
  "targetObjectId": "branch_001",
  "previousObjectId": "branch_001",
  "finalObjectId": "branch_001",
  "tool": "admin-correction-ui",
  "timestamp": "2026-05-13T00:00:00Z",
  "payload": {
    "centerline": "M 620 500 C 540 420 460 310 330 250"
  },
  "confirmed": true
}
```

Allowed operation types:

```text
confirm
relabel
merge
split
erase
paint
attach
detach
move
reshape_centerline
```

## Reserved For Phase 3

These fields are reserved but not required for Phase 2 implementation:

```json
{
  "expansionPrompt": {
    "type": "why",
    "label": "为什么？"
  },
  "review": {
    "lastReviewedAt": null,
    "nextReviewAt": null,
    "redrawSessions": []
  }
}
```

Rules:

- `tooltip` is not merged with `expansionPrompt`.
- `expansionPrompt` belongs with guided expansion and review/redraw workflows in Phase 3.
- `review` / `redraw` metadata is reserved for Phase 3.
