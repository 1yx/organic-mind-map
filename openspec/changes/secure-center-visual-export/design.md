## Context

`center.svgUrl` is an untrusted optional visual hint. The CLI preserves it as a string; the browser is responsible for deciding whether to load and render it.

## Goals / Non-Goals

**Goals:**
- Keep unsafe or unavailable center SVGs from crashing preview or export.
- Avoid canvas taint and uncontrolled external image drawing.
- Keep fallback deterministic from content hash.

**Non-Goals:**
- No general-purpose SVG sanitizer dependency unless already present.
- No CLI network access.
- No automatic recoloring of single-color SVGs.

## Decisions

- Gate URL before fetch using a hardcoded HTTPS host/path allowlist.
  - Rationale: avoids network requests to uncontrolled sources.
- Validate SVG text through explicit element/attribute allowlists.
  - Rationale: Phase 1 needs a small auditable subset, not full SVG support.
- Store resolved safe content in browser state for render/export.
  - Rationale: export should not re-fetch external assets.

## Risks / Trade-offs

- Some legitimate SVGs may be rejected -> deterministic fallback preserves preview availability.
- Strict whitelist limits visual variety -> acceptable for controlled Phase 1 sources.
