# fixture-coverage-gaps Design

## Context

`mvp-fixtures-validation` established the baseline fixture suite for the Phase 1 pipeline:

`Agent CLI + skill -> OrganicTree -> CLI validation -> browser layout -> .omm download/export -> PNG export`

The current repository already contains fixtures for valid OrganicTree inputs, invalid contract cases, unreachable SVG URLs, and several invalid `.omm` documents. The remaining gap is adversarial coverage: cases that are structurally plausible but likely to expose collision failures, security regressions, memory pressure, and runtime artifact leakage.

## Goals / Non-Goals

**Goals:**

* Add stress fixtures that exercise bounding-box collision behavior under dense sibling and unbalanced-tree pressure.
* Add poison fixtures for unsafe protocols, unreachable SVG URL fallback, text injection, and oversized mostly-empty payloads.
* Add `.omm` negative/repair fixtures for forbidden web font declarations and missing `organicSeed`.
* Extend tests so invalid or dangerous inputs fail before unsafe rendering, while safe fallback paths remain renderable.
* Preserve the `OrganicTree` terminology and `fixtures/organic-tree/` directory convention.

**Non-Goals:**

* No pixel-perfect visual regression suite.
* No CLI one-shot PNG export.
* No Puppeteer or Playwright dependency added to the CLI for export verification.
* No broad fixture directory migration unless real stale `agent-list` paths are found.
* No change to the product rule that Phase 1 preview is read-only and browser-driven.

## Decisions

### Keep fixture categories explicit

Use filename prefixes to communicate intent:

* `stress-*` for valid inputs that push layout capacity.
* `poison-*` for malicious or hostile inputs.
* `invalid-*` for schema or document contract failures.
* `valid-*` for normal happy-path examples.

This keeps test intent visible without reintroducing `agent-list` terminology.

### Stress tests assert diagnostics, not image snapshots

Collision stress tests should render through the existing renderer and assert machine-readable outcomes: non-empty SVG/model, expected paper viewBox, branch/text element counts, and bounded collision diagnostics if available.

They should not depend on image-perfect snapshots because the organic renderer is intentionally allowed to evolve visually.

### Poison fixtures fail at the earliest safe boundary

Unsafe URL protocols and malformed center visual data should be rejected before inline rendering or downgraded to the built-in center template. Unreachable SVG URLs should exercise the browser-owned loading failure path and prove the preview falls back to the built-in hash template without white screen or JavaScript crash. Oversized payloads should be rejected before expensive renderer handoff, ideally before or immediately after JSON parse with a clear byte-size or capacity error.

This keeps the browser preview from becoming the first line of defense for obviously hostile payloads.

### `.omm` runtime artifacts fail fast

`.omm` documents must not persist external web font declarations. Tests should prove forbidden font metadata is rejected by strict schema validation rather than parsed and normalized by custom repair logic.

This keeps font safety in the document contract: unsupported font fields, remote font URLs, `@font-face`, WOFF/WOFF2 references, and ad hoc font metadata are invalid input, not data to clean up after parsing.

### Missing `organicSeed` must not trigger relayout when layout exists

If an `.omm` document is missing `organicSeed` but has a complete layout snapshot, validation/repair may silently backfill the seed with a deterministic `cyrb53` hash over the current document content. This repair must not invoke the layout engine, recompute coordinates, overwrite paths, or otherwise mutate the saved layout snapshot.

The saved physical coordinates and paths are the source of truth for an exported `.omm`. Only when the layout snapshot is missing or invalid may the system reject the file or enter a full layout regeneration path.

### Do not add heavyweight browser automation for this change

Renderer smoke and validation tests are enough for this layer. Browser export behavior remains covered through the Web preview path and existing export-specific changes.

## Risks / Trade-offs

* **Risk: Stress fixtures become too strict while layout is still evolving.** -> Mitigate by asserting structural renderability and diagnostic thresholds rather than exact geometry.
* **Risk: Oversized payload fixtures slow the test suite.** -> Mitigate by using generated test data or a compact fixture that simulates the size boundary without committing a huge file.
* **Risk: Font handling differs between `.omm` validation and Web rendering.** -> Mitigate by failing fast in `.omm` schema validation and keeping renderer/export code on the approved system font stack.
* **Risk: Missing seed repair accidentally changes a saved map.** -> Mitigate by asserting that seed backfill never recomputes layout or changes saved coordinates/paths when a complete layout snapshot exists.
* **Risk: Poison fixtures duplicate existing allowlist tests.** -> Mitigate by separating CLI URL allowlist tests from browser/renderer fallback, network failure fallback, and text-injection tests.

## Migration Plan

1. Add the new fixtures under existing `fixtures/organic-tree/` and `fixtures/omm/` directories.
2. Add or extend validation tests for the new invalid and poison fixtures.
3. Add renderer smoke tests for dense valid stress fixtures.
4. Add payload size-limit tests without committing unnecessarily large fixture files.
5. Update fixture README files to document naming categories and the no-`agent-list` terminology rule.
