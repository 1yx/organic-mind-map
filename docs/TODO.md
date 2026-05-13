# Organic Mind Map TODO

## Phase 2 Execution Order

Current goal: turn the Phase 2 experiments into a SaaS web app while preserving the strict organic mind map identity.

Recommended execution order:

1. **Done: Unify frontend technical direction.**
   Phase 2 uses the existing `@omm/web` Vue 3 + Vite direction, with Paper.js integrated through Vue components/composables. React/Next.js is not the Phase 2 frontend path. Authentication remains Google/OpenAI SSO, but it is handled through the backend API/session layer rather than NextAuth.js.

2. **Done: Define stable product schemas.**
   Created `docs/SCHEMA.md` for:
   - `content_outline.json`
   - unified `.omm` schema, including user-saved OMM, `prediction_omm`, and `correction_omm` instances
   - canonical `branch` / `subbranch` data
   - blank branches with optional concept text
   - cloud boundary objects for branch chunks

3. **Define backend API contracts.**
   Create `docs/API.md` for:
   - generation job creation
   - job status
   - artifact fetch
   - correction save
   - quota checks
   - export endpoints

4. **Package CV prototypes into a worker interface.**
   Convert `PHASE_2_2nd_attempts` and `PHASE_2_3rd_attampts` into a stable worker command such as:

   ```text
   omm-cv extract reference.png --outline content_outline.json --out output/
   ```

   Phase 2 user-facing UI should use one default extraction profile. Internal tools may record and tune parameters.

5. **Build the web canvas against static artifacts first.**
   Before wiring model generation, make the frontend load existing artifacts and support:
   - source/reference visibility
   - left-bottom `content-outline-text` display/editing without live canvas reflow in Phase 2
   - editable branch centerlines
   - generated branch outlines
   - doodle/text groups
   - correction recording

6. **Add generation orchestration.**
   Wire the backend flow:

   ```text
   text or content-outline-text
     -> LLM structure generation if needed
     -> GPT-Image-2 visual reference
     -> CV worker extraction
     -> editable web artifact
   ```

7. **Add auth, quotas, and payments.**
   Implement SSO, trial quota, paid quota, and payment gating after the core generation/editing loop is functional.

8. **Export Phase 3 dataset seeds.**
   Add a dataset export command that turns `prediction_omm` plus `correction_omm` into training/evaluation samples for the future OMM-specific segmentation and reconstruction system.

## Phase 2 To Phase 3 Data Preparation

Goal: make every Phase 2 extraction and internal/admin correction reusable as future Phase 3 training data.

The important idea:

```text
prediction_omm = model/CV prediction
correction_omm = internal/admin correction and final training truth
prediction_omm + correction_omm = training sample
```

This is not only for model training. The same internal data also supports debugging, replay, quality comparison, and future benchmark evaluation. User-facing save/load should use `.omm`.

## OMM Schema TODO

Define a stable unified `.omm` schema that can represent user-saved OMM documents, `prediction_omm`, and `correction_omm` instances.

Before finalizing the schema, enforce these Buzan constraints from `docs/GUIDELINES.md`:

- Branch/subbranch concept text is optional so blank branches can exist.
- Cloud boundaries are first-class visual/grouping objects, not generic cards or boxed nodes.
- Nonlinear association lines are first-class objects and must not mutate the branch/subbranch hierarchy.

Each `prediction_omm` extraction should record:

- source image path and image size
- source structure path or embedded source structure
- extractor version
- OCR boxes and recognized text
- branch masks
- doodle masks
- text masks
- branch centerlines
- branch colors
- visual groups
- object IDs
- object classes
- bounding boxes
- confidence scores where available
- links to generated mask files and debug overlays

Target example:

```json
{
  "source_image": "input/reference.png",
  "image_size": { "width": 1448, "height": 1086 },
  "extractor": {
    "name": "omm-cv",
    "version": "phase2-prototype"
  },
  "objects": [
    {
      "id": "doodle_017",
      "class": "doodle_group",
      "bbox": [1040, 720, 170, 130],
      "mask": "masks/doodle_017_pred.png",
      "confidence": 0.72
    }
  ],
  "groups": [
    {
      "id": "group_017",
      "kind": "doodle_group",
      "members": ["doodle_017", "doodle_text_006"]
    }
  ]
}
```

## correction_omm Data TODO

Define a stable schema for what the user changes in the inspect-and-correct UI.

Each correction should record:

- corrected class
- corrected mask path
- corrected bbox
- changed group membership
- changed text category
- changed branch centerline
- correction operation type
- timestamp
- tool that made the correction
- previous object ID and final object ID
- whether the user explicitly confirmed the object as correct

Correction operation types should include:

- `confirm`
- `relabel`
- `merge`
- `split`
- `erase`
- `paint`
- `attach`
- `detach`
- `move`
- `reshape_centerline`

Target example:

```json
{
  "prediction": {
    "id": "doodle_017",
    "class": "doodle_group",
    "mask": "masks/doodle_017_pred.png",
    "confidence": 0.72
  },
  "correction": {
    "final_id": "doodle_017",
    "final_class": "doodle_group",
    "final_mask": "masks/doodle_017_corrected.png",
    "operations": [
      { "type": "paint", "target": "mask" },
      { "type": "merge", "source": "doodle_018" }
    ],
    "confirmed": true
  }
}
```

## Training Dataset TODO

Build a dataset exporter after the unified `.omm` schema can represent both `prediction_omm` and `correction_omm`.

The exporter should convert:

```text
raw source image
prediction_omm
correction_omm
```

into:

```text
training image
input prediction masks
ground-truth corrected masks
class labels
group relationships
branch centerline labels
metadata
```

Minimum training targets:

- `branch_mask`
- `branch_instance_mask`
- `center_visual_mask`
- `doodle_group_mask`
- `doodle_asset_mask`
- `map_text_mask`
- `doodle_text_mask`
- `unassigned_text_mask`

## Immediate Tasks

1. Add stable IDs to all masks, text boxes, groups, and branch curves.
2. Add extractor version and source image metadata to Phase 2 outputs.
3. Add confidence fields where the extractor can provide them.
4. Decide the canonical JSON file names for artifacts and corrections.
5. Make the future editor save both original predictions and final corrections.
6. Add a dataset export command after correction data exists.

## Design Principle

Do not wait until Phase 3 to think about training data.

Phase 2 should already save data in a way that answers:

```text
What did the algorithm predict?
What did the human change?
What is the final correct object?
Can this become a training sample later?
```
