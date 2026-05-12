## Context

The product roadmap allows unlimited hierarchy later, but Phase 1 specs cap OrganicTree depth at 3. The validator should be the single gate before browser preview startup.

## Goals / Non-Goals

**Goals:**
- Reject fourth-level content before server startup.
- Produce JSON Pointer paths to the offending branch.
- Keep the validation rule configurable only through existing `OrganicTreeLimits` internals.

**Non-Goals:**
- No Phase 2 unlimited hierarchy implementation.
- No browser-side warning panel.
- No automatic pruning or flattening.

## Decisions

- Validate actual input depth recursively.
  - Rationale: structural depth cannot be inferred safely from TypeScript names alone.
- Report an error rather than warning.
  - Rationale: over-depth input can produce layouts the MVP does not support.

## Risks / Trade-offs

- Some rich Agent outputs will fail initially -> retry guidance should instruct the Agent to regroup or summarize.
