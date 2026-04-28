# fixture-coverage-gaps

## Why

The current MVP fixtures prove the normal long-text-to-preview flow, but they do not yet stress the failure modes most likely to break production preview: dense branch collisions, malicious center visual inputs, oversized payloads, forbidden web font declarations, and incomplete `.omm` runtime artifacts.

This change adds hostile and edge-case fixture coverage so Phase 1 validates not only that rendering works, but that the preview pipeline fails safely under pressure.

## What Changes

* Add collision stress fixtures for extreme sibling density and highly unbalanced trees.
* Add poison fixtures for unsafe URL protocols, text injection cases, and oversized whitespace or invalid nested payloads.
* Add `.omm` negative fixtures for forbidden web font declarations and missing `organicSeed`.
* Add validation and smoke coverage that proves:
  * dense fixtures remain renderable without obvious overlap failures,
  * unsafe center visual inputs fall back to built-in center templates,
  * oversized payloads fail before renderer handoff with retry-oriented errors,
  * `.omm` files reject or normalize forbidden runtime artifacts.
* Keep fixture terminology aligned with `OrganicTree`; no `agent-list` naming is reintroduced.

## Capabilities

### New Capabilities

* `fixture-coverage-gaps`: Defines stress, poison, and negative `.omm` fixture coverage for MVP preview hardening.

### Modified Capabilities

* None.

## Impact

* Affects fixture files under `fixtures/organic-tree/` and `fixtures/omm/`.
* Affects validation tests in core/CLI and renderer smoke tests.
* May require explicit payload byte-size limits before JSON parsing or before preview handoff.
* May require `.omm` validation to reject missing `organicSeed` and forbidden font declarations.
* Does not add CLI one-shot PNG export, browser automation dependencies, or visual pixel snapshot requirements.
