## Context

The intended Agent preview input is `OrganicTree`. `PreviewPayload` was an intermediate shape that moved domain assembly into the CLI, which conflicts with browser-owned IDs, colors, seed, center fallback, layout, and export.

## Goals / Non-Goals

**Goals:**
- Remove active `PreviewPayload` usage from source, tests, and fixtures.
- Keep renderer entry points limited to `organic-tree` and `omm-document`.
- Keep CLI as validator and service starter only.

**Non-Goals:**
- No `.omm` model redesign.
- No renderer algorithm changes beyond input adaptation.
- No compatibility layer for old `PreviewPayload` fixtures.

## Decisions

- Fail at compile time for `kind: "preview-payload"`.
  - Rationale: a compatibility shim would preserve the wrong architecture.
- Convert tests to OrganicTree fixtures rather than wrapping them.
  - Rationale: fixtures should exercise the same contract as Agent CLIs.

## Risks / Trade-offs

- Some tests may need fixture rewrites -> keep fixture changes mechanical and scoped.
- Search may find historical mentions -> allow only migration notes, not active docs or code paths.
