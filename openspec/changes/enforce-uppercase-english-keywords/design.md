## Context

OrganicTree concepts are semantic input from an Agent. The CLI must preserve meaning and avoid rewriting. Uppercase is a strict-mode display rule, so Phase 1 can apply it during browser/renderer instantiation.

## Goals / Non-Goals

**Goals:**
- Render English-only branch concepts in uppercase by default.
- Measure and export the same transformed label shown in preview.
- Preserve the original semantic concept in OrganicTree and `.omm` semantic nodes.

**Non-Goals:**
- No UI toggle.
- No LLM keyword compression.
- No language detector beyond a conservative English-only check.

## Decisions

- Apply uppercase in renderer/Web display label preparation, not CLI validation.
  - Rationale: avoids semantic mutation and keeps Agent retry errors about structure/capacity only.
- Restrict to English-only labels.
  - Rationale: mixed-language casing rules are ambiguous and should not be guessed in MVP.

## Risks / Trade-offs

- Conservative detection may leave some English-like mixed labels unchanged -> acceptable to avoid corrupting names or mixed concepts.
- Text measurement changes because uppercase can be wider -> tests should measure the transformed label.
