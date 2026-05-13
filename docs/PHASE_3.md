# Organic Mind Map Phase 3

## Direction

Phase 3 should build an OMM-specific segmentation capability instead of depending on a generic hosted SAM service as the long-term answer.

The product direction is:

```text
Phase 2 corrected artifacts
  -> OMM-specific training dataset
  -> fine-tuned SAM/SAM-style segmentation model
  -> higher quality branch/text/doodle extraction
  -> inspectable editable mind map reconstruction
```

This does not replace the Phase 2 local CV pipeline. Phase 2 remains the practical baseline:

```text
OpenCV + PaddleOCR + local mask repair + source-structure grouping + Paper.js branch editing
```

Phase 3 turns repeated Phase 2 corrections into proprietary model quality.

## Why This Is A Moat

Generic segmentation models can segment visible objects, but Organic Mind Map needs product-specific intent:

- branches should be understood as organic, tapered cognitive anchors
- doodles and doodle-local text should often remain visually grouped
- map text must be separated from doodle text and unassigned text
- center visuals are semantic roots, not ordinary image regions
- branch families should preserve color/category identity
- extracted assets must be editable, not just masked

This is not a generic image segmentation problem. It is a domain-specific reconstruction problem for Buzan-style organic mind maps.

The moat is not merely "using SAM". The moat is:

- an OMM-specific labeled dataset
- correction data from real extraction failures
- product-specific labels and grouping rules
- model ranking/post-processing tuned to editable mind map reconstruction
- a tight feedback loop between editor corrections and future extraction quality

## Model Target

The Phase 3 model should optimize for the layers and relationships the editor actually needs.

Primary segmentation targets:

- `branch_system_mask`
- `branch_segment_mask`
- `center_asset_mask`
- `doodle_asset_mask`
- `asset_group_mask`
- `map_title_mask`
- `center_text_mask`
- `branch_text_mask`
- `subbranch_text_mask`
- `doodle_text_mask`
- `unassigned_text_mask`

Relationship targets:

- branch -> branch children
- doodle text -> doodle group
- child map text -> nearest child branch
- branch label -> branch
- center text/visual -> center group

The output should remain inspectable and correctable. A model prediction is not final truth.

## Recommended Technical Path

Phase 3 should not start by training a large model from scratch.

Recommended path:

1. Keep Phase 2 extraction as the baseline.
2. Save every correction made in the inspect-and-correct UI.
3. Convert corrected masks and groups into a training dataset.
4. Evaluate SAM/SAM2-style fine-tuning or adapter approaches.
5. Add an OMM-specific proposal ranker/classifier before attempting deeper model changes.
6. Use the model as a refinement layer, not as the only extractor.

Practical model options:

- fine-tune a SAM/SAM2-style model with OMM masks
- train lightweight adapters/LoRA where supported
- use SAM proposals plus an OMM-specific classifier/ranker
- train a smaller segmentation head for known OMM layer classes
- combine model output with existing OCR/source-structure alignment

The most valuable early version may be a proposal ranker rather than a full fine-tuned segmentation model.

## Training Data Requirements

Phase 2 artifacts should be made training-data-friendly.

Every corrected project should be able to export:

```text
source image
source structure
original CV masks
corrected masks
OCR boxes and recognized text
group assignments
branch centerlines
branch colors
editor correction history
```

Minimum labels:

- branch masks
- branch centerlines
- center group
- map text boxes
- doodle text boxes
- doodle group masks
- unassigned text boxes
- group relationships

Important metadata:

- image size
- source model or generation path, if known
- correction timestamp
- confidence before correction
- correction type, such as split, merge, erase, add, relabel, attach, detach

## Product Integration

Phase 3 should improve the user flow like this:

```text
import reference image
  -> Phase 2 extractor produces initial layers
  -> OMM model refines masks/groups
  -> editor shows confidence and uncertain regions
  -> user corrects only the remaining errors
  -> corrections become future training examples
```

The UI should make uncertainty visible. Low-confidence regions should be easy to inspect, split, merge, relabel, or attach to a group.

The model should never hide uncertainty behind a single irreversible output.

## Difficulty

Prototype difficulty: medium.

A useful prototype can be built if Phase 2 exports clean correction data. The first target can be narrow, for example improving doodle-group masks or separating branch masks from doodles.

Production difficulty: medium-high to high.

The hard part is not simply running SAM. The hard parts are:

- collecting enough high-quality corrected examples
- defining stable OMM-specific labels
- handling many drawing styles from AI image models and human sketches
- preserving editable structure, not just pixel masks
- measuring quality with product-level metrics
- integrating model confidence into the editor workflow

The dataset and correction loop are likely more important than the first model choice.

## Phase 3 Milestones

### P3.1 Dataset Capture

The Phase 2 editor must export corrected masks and groups in a stable format.

Success criteria:

- every correction can be replayed
- every final mask has a class label
- group relationships are exported
- original predictions and final corrections are both preserved

### P3.2 Baseline Evaluation Set

Create a small benchmark set of reference images.

Success criteria:

- at least several different visual styles
- ground-truth masks for branches, doodles, text, center
- per-layer quality metrics
- visual diff reports

### P3.3 OMM Proposal Ranker

Use SAM/SAM2-style proposals, then rank/filter them with OMM-specific rules or a small learned model.

Success criteria:

- fewer fragmented doodle masks
- better branch/doodle separation
- lower manual correction time than Phase 2 baseline

### P3.4 Fine-Tuned Segmentation Model

Train or adapt a segmentation model for OMM layer classes.

Success criteria:

- improves over OpenCV/PaddleOCR/local repair on the benchmark
- preserves editable object boundaries
- produces confidence values usable in the editor

### P3.5 Continuous Improvement Loop

Turn internal/admin corrections into future training data.

Success criteria:

- corrections are stored with provenance
- low-confidence failures can be sampled for labeling
- model versions can be compared on the benchmark set

## Non-Goals

- Do not make a hosted model mandatory for local extraction.
- Do not replace source-structure alignment with pure image recognition.
- Do not train from scratch before proving value with adapters/rankers.
- Do not optimize only IoU if the result is not editable.
- Do not let model output turn Organic Mind Map into a generic image editor.

## Phase 2 Requirements For Phase 3

Phase 2 should prepare for Phase 3 by adding:

- stable `prediction_omm` schema for masks, groups, and branch curves
- correction export from the inspect-and-correct UI
- confidence fields for extractor outputs
- explicit labels for `doodle_text` and `unassigned_text`
- stable IDs for masks and groups
- provenance linking predictions to final corrected assets

This keeps Phase 3 grounded in real product corrections rather than speculative model work.
