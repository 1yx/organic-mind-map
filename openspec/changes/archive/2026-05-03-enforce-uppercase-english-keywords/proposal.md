## Why

English keywords default to uppercase in strict organic mind maps, but the MVP behavior is not yet specified at the implementation level. This change makes uppercase display deterministic without letting the CLI rewrite semantic input.

## What Changes

- Add a small renderer/Web display transform for English-only concept labels.
- Preserve original `OrganicTree` concept text during CLI validation and handoff.
- Use the uppercase label for branch text measurement, SVG text, and PNG export fidelity.
- Do not uppercase mixed-language or non-English concepts in this change.

## Capabilities

### New Capabilities

### Modified Capabilities
- `readonly-svg-renderer`: English-only concept labels render uppercase by default.
- `omm-document-format`: Exported layout text geometry reflects the same uppercase label used in preview.

## Impact

- Affects renderer label preparation, text measurement tests, SVG smoke tests, and `.omm` export layout snapshots.
- No CLI semantic rewrite and no user-facing settings in MVP.
