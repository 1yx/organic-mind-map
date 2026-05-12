## ADDED Requirements

### Requirement: Prediction artifact schema
The system SHALL produce a stable prediction artifact for every CV extraction run.

#### Scenario: Extraction completes
- **WHEN** the CV worker finishes processing a reference image
- **THEN** it writes a prediction artifact containing source metadata, extractor metadata, detected objects, masks, groups, OCR boxes, and branch geometry references

#### Scenario: Artifact is loaded by the web app
- **WHEN** the web app loads a prediction artifact
- **THEN** it can reconstruct the reference image, extracted layers, editable branch curves, visual groups, and debug overlays without rerunning CV

### Requirement: Stable object identity
The prediction artifact SHALL assign stable IDs to all extracted objects.

#### Scenario: Object is emitted
- **WHEN** the artifact includes a branch, subbranch, text box, doodle, group, mask, or crop
- **THEN** the object has a stable unique ID scoped to the artifact

#### Scenario: Objects are related
- **WHEN** a group, branch, or text classification references another artifact object
- **THEN** it references the object's stable ID rather than duplicating ambiguous spatial descriptions

### Requirement: Source and extractor metadata
The prediction artifact SHALL record enough metadata to reproduce and compare extraction results.

#### Scenario: Artifact records source image
- **WHEN** the artifact is written
- **THEN** it includes source image path or URI, image width, image height, and content outline reference or embedded outline

#### Scenario: Artifact records extractor version
- **WHEN** the artifact is written
- **THEN** it includes extractor name, version, profile, and relevant parameter values used for the run

### Requirement: Mask and debug references
The prediction artifact SHALL reference generated image artifacts by path or URI.

#### Scenario: Masks are produced
- **WHEN** extraction produces branch, text, doodle, or instance masks
- **THEN** the artifact records their file references and associated object IDs

#### Scenario: Debug overlays are produced
- **WHEN** extraction produces contact sheets, overlays, skeleton previews, group previews, or coverage diffs
- **THEN** the artifact records those debug references for inspection in the web UI

### Requirement: OCR box representation
The prediction artifact SHALL store OCR detections with text content and geometry.

#### Scenario: OCR detects text
- **WHEN** PaddleOCR or another approved OCR engine detects text
- **THEN** the artifact stores `id`, `bbox`, recognized `text`, `score`, and text classification if available

#### Scenario: OCR is unavailable
- **WHEN** the extraction runs without OCR
- **THEN** the artifact still remains valid and records that OCR results are unavailable

