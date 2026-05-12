## ADDED Requirements

### Requirement: CV worker extraction command
The system SHALL provide a backend-oriented CV worker interface for extracting editable map artifacts from a reference image and content outline.

#### Scenario: Worker receives image and outline
- **WHEN** the worker is invoked with `reference.png`, a content outline, and an output directory
- **THEN** it runs the Phase 2 extraction pipeline and writes the prediction artifact plus referenced masks, crops, SVGs, and debug previews

#### Scenario: Worker uses default profile
- **WHEN** the user-facing Phase 2 product runs extraction
- **THEN** it uses one default extraction profile unless an internal operator explicitly selects a tuning profile

### Requirement: Branch layer extraction
The CV worker SHALL extract colored organic branches as branch masks and editable branch geometry candidates.

#### Scenario: Branch extraction runs
- **WHEN** the source image contains colored organic branches
- **THEN** the worker outputs branch masks, branch RGBA previews where available, skeleton debug output, overlay debug output, and centerline geometry candidates

#### Scenario: Center card or doodle leaks into branch mask
- **WHEN** non-branch visual material is included in the initial branch mask
- **THEN** the worker applies post-processing or records debug evidence so the error can be corrected

### Requirement: Text extraction and classification
The CV worker SHALL use OCR and source structure alignment to classify map text.

#### Scenario: OCR is available
- **WHEN** PaddleOCR is installed and enabled
- **THEN** the worker records OCR boxes, recognized text, confidence scores, and derived text classes

#### Scenario: Source structure contains text
- **WHEN** OCR text matches or closely aligns with content outline concepts
- **THEN** the worker classifies the text as title, center, branch, or child text before relying on spatial heuristics

#### Scenario: Text is not part of the map outline
- **WHEN** recognized text does not belong to the source structure but is visually attached to doodles
- **THEN** the worker classifies it as doodle text or unassigned text rather than branch text

### Requirement: Doodle extraction and repair
The CV worker SHALL extract non-branch, non-map-text visual material as doodle components and groups.

#### Scenario: Doodle components remain after branch and map text subtraction
- **WHEN** the worker computes remaining foreground material
- **THEN** it outputs doodle masks, transparent crops, object bounding boxes, and group candidates

#### Scenario: OCR subtraction creates holes in doodles
- **WHEN** doodle-internal text or face details are removed from doodle masks
- **THEN** the worker applies local repair where possible and records unresolved artifacts for manual correction

### Requirement: Hosted SAM2 automatic masks are not baseline
The Phase 2 worker SHALL NOT depend on hosted automatic SAM2 masks as the baseline doodle extraction strategy.

#### Scenario: Baseline extraction runs
- **WHEN** Phase 2 extraction runs in production
- **THEN** it uses the local/backend CV pipeline as the required baseline

#### Scenario: Promptable segmentation is evaluated
- **WHEN** promptable SAM2 or a similar model is evaluated
- **THEN** it is treated as an optional adapter, not the canonical Phase 2 extraction dependency

