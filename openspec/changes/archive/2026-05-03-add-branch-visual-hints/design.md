## Context

The product principle is image-first, but Phase 1 docs now limit that to center visual and basic visual hint links. A minimal marker system can exercise the contract without building a full asset workflow.

## Goals / Non-Goals

**Goals:**
- Show lightweight branch visual markers when `visualHint` is present.
- Keep rendering deterministic and local.
- Avoid changing OrganicTree required fields.

**Non-Goals:**
- No uploaded images.
- No AI-generated branch images.
- No editable marker picker.
- No broad icon library integration.

## Decisions

- Map a small set of normalized hint strings to built-in SVG/text-safe marker symbols.
  - Rationale: deterministic and local, enough for MVP visual hint coverage.
- Ignore unsupported hints visually while preserving them in data.
  - Rationale: avoids validation churn and avoids inventing a taxonomy too early.

## Risks / Trade-offs

- Marker coverage is limited -> acceptable because this is a Phase 1 hint path, not the final asset system.
- Markers can affect branch measurement -> include marker bounds in renderer spacing tests.
