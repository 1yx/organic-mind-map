# Organic Mind Map Phase 2 PRD

## Overview

Phase 2 builds a full SaaS web application that turns natural language text or simple YAML outlines into editable, structured organic mind map assets.

The user provides:

- natural language text prompt (for AI generation)
- OR a simple YAML outline (for manual structure)

The system automatically orchestrates:

- an LLM to generate/refine the semantic source structure (if text prompt is used)
- GPT-Image-2 to generate the visual reference image
- a backend CV pipeline to extract layers and assets

The web application outputs:

- an interactive, Figma/Excalidraw-like canvas
- editable branch curves
- Figma-like visual groups (doodles + text)
- semantic text layers
- an onboarding landing page that is itself an editable map explaining the features
- Google/OpenAI SSO and integrated payment flows

## Problem

AI image models can produce visually strong organic mind maps, but their outputs are flat raster images:

- branches are not editable
- text is not structured
- doodles and text are fused together
- exact masks are unavailable
- repeated prompt engineering can degrade organic quality into flowchart-like diagrams

Users need a workflow that preserves the quality of the generated visual reference while recovering enough structure to edit and rebuild it.

## Product Principle

Do not force the image model to produce engineering-perfect output.

Use the image model for:

- holistic composition
- organic layout rhythm
- doodle style
- visual inspiration

Use deterministic tooling for:

- layer extraction
- text recognition
- source-structure alignment
- grouping
- editable vector branch curves
- export and correction

## Phase 2 User Flow

```text
1. User lands on the website homepage, which is a fully functional Excalidraw-like canvas.
2. The default canvas displays an editable mind map introducing the product's features.
3. User clicks to generate a new map and is prompted to log in via Google/OpenAI SSO.
4. Logged-in user enters a natural language text prompt OR uploads/edits a simple YAML outline.
5. Backend LLM generates the source structure (if text prompt was provided).
6. Backend GPT-Image-2 generates the visual reference image.
7. Backend CV system extracts branches, text, and doodles, running OCR and grouping.
8. The frontend canvas loads the structured, editable artifacts.
9. User reviews, corrects branch paths, edits text, and manipulates groups.
10. User exhausts trial quota and upgrades via payment gateway (e.g., Stripe) to continue generation.
```

## Source Structure (Simple YAML)

The source structure is the semantic truth. Users can provide this directly using a simple, field-less YAML format based on indentation. Title is optional and not part of the main hierarchy.

Example:

```yaml
Anthropic 产品之道
  极速交付
    研究预览
    跨职能
  PM 角色
    产品品味
    角色融合
```

The system parses this as:
- Level 1 (indent 0): Center (Root)
- Level 2 (indent 1): Main Branches
- Level 3+ (indent 2+): Subbranches

OCR is used to locate and read visual text, but source structure decides whether recognized text is:

- center text
- branch text
- child text
- doodle text
- unassigned text
- title text (if provided separately or inferred)

## Requirements

### R1: Flexible Structure Input

The system shall accept either a natural language text input or a simple YAML outline from the user.

For text input, the backend shall orchestrate an LLM to produce the structured outline.

For YAML input, the system shall parse the indentation-based hierarchy directly.

### R2: Reference Image Generation

The system shall call GPT-Image-2 to generate a raster reference image based on the source structure and/or text prompt.

The system should preserve the original generated image for visual comparison, debugging, and extraction.

### R3: Branch Layer Extraction

The system shall extract colored organic branches into a branch mask.

The system should remove center-card and doodle-color leakage when possible.

The system should output:

```text
branches_mask.png
branches_rgba.png
debug_overlay.png
```

### R4: OCR Text Extraction

The system shall support PaddleOCR for text detection and recognition.

The system shall store OCR boxes with:

```text
id
bbox
text
score
```

The system should support a no-OCR fallback, but PaddleOCR is the preferred path.

### R5: Semantic Text Classification

The system shall classify OCR text against source structure before using spatial heuristics.

The system shall output separate masks for:

```text
title_text
center_text
branch_text
child_text
doodle_text
unassigned_text
map_text
```

### R6: Doodle Extraction

The system shall extract remaining non-branch, non-map-text visual material as doodle components.

The system should output transparent doodle crops and a doodle mask.

The system should repair common OCR-subtraction holes through local post-processing.

### R7: Visual Groups

The system shall group doodle components and doodle-internal text into Figma-like groups.

A group should include:

```text
group id
group bbox
doodle members
doodle_text members
export references
```

Mask separation and spatial binding are both required.

### R8: Editable Branch Curves

The system shall convert branch strokes into editable vector paths.

At minimum, each branch curve should include:

```text
SVG path
stroke color
stroke width
bbox
source points or control points
```

The output should be editable with a pen-tool-like interface.

### R9: Web Application UI & Architecture

The product shall be delivered as a SaaS web application.

The landing page must be the functional application canvas (similar to Excalidraw), populated with an onboarding mind map that acts as the feature tutorial.

### R10: Auth & Payments

The system shall support Google and OpenAI SSO for user authentication.

The system shall track generation quotas and gate features behind a payment provider (e.g., Stripe) once the free trial is exhausted.

### R11: Debuggability

Every extraction step shall produce inspectable artifacts.

Required debug artifacts include:

```text
contact sheet
mask previews
group preview
branch skeleton debug
branch overlay debug
coverage diff where useful
```

## Non-Goals

- Do not turn Organic Mind Map into a generic whiteboard (keep it Buzan-style focused).
- Do not depend on AI image model masks as final truth.
- Do not require hosted SAM2 for baseline doodle extraction (rely on the Phase 2 CV pipeline on the backend).
- Do not require exact automatic semantic reconstruction from image alone.

## Acceptance Criteria

For the current Anthropic reference image:

- six major branch components are extracted
- source-structure map text is classified into title/center/branch/child categories
- doodle text is separated from map text when not in the source structure
- visual groups are generated with doodle/text membership
- editable branch curves are exported to SVG and Paper.js canvas
- debug previews make errors obvious
