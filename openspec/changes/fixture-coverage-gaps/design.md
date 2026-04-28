# fixture-coverage-gaps Design

## Context

`mvp-fixtures-validation` established the baseline fixture suite for the Phase 1 pipeline:

`Agent CLI + skill -> OrganicTree -> CLI validation -> browser layout -> .omm download/export -> PNG export`

The current repository already contains fixtures for valid OrganicTree inputs, invalid contract cases, unreachable SVG URLs, and several invalid `.omm` documents. The remaining gap is adversarial coverage: cases that are structurally plausible but likely to expose collision failures, security regressions, memory pressure, and runtime artifact leakage.

## Goals / Non-Goals

**Goals:**

* Add stress fixtures that exercise bounding-box collision behavior under dense sibling and unbalanced-tree pressure.
* Add poison fixtures for unsafe protocols, text injection, and oversized mostly-empty payloads.
* Add `.omm` negative fixtures for forbidden web font declarations and missing `organicSeed`.
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

Unsafe URL protocols and malformed center visual data should be rejected before inline rendering or downgraded to the built-in center template. Oversized payloads should be rejected before expensive renderer handoff, ideally before or immediately after JSON parse with a clear byte-size or capacity error.

This keeps the browser preview from becoming the first line of defense for obviously hostile payloads.

### `.omm` runtime artifacts are contract violations

`.omm` documents must not persist external web font declarations or omit `organicSeed`. Tests should prove forbidden font metadata is rejected or normalized to the system font stack, and missing seed files fail validation or are explicitly repaired by a deterministic recompute path.

If implementation chooses repair for missing `organicSeed`, that behavior must be deterministic and covered by a test; silent non-determinism is not acceptable.

### Do not add heavyweight browser automation for this change

Renderer smoke and validation tests are enough for this layer. Browser export behavior remains covered through the Web preview path and existing export-specific changes.

## Risks / Trade-offs

* **Risk: Stress fixtures become too strict while layout is still evolving.** -> Mitigate by asserting structural renderability and diagnostic thresholds rather than exact geometry.
* **Risk: Oversized payload fixtures slow the test suite.** -> Mitigate by using generated test data or a compact fixture that simulates the size boundary without committing a huge file.
* **Risk: Font handling differs between `.omm` validation and Web rendering.** -> Mitigate by centralizing system font enforcement and testing both document validation and export serialization boundaries.
* **Risk: Poison fixtures duplicate existing allowlist tests.** -> Mitigate by separating CLI URL allowlist tests from browser/renderer fallback and text-injection tests.

## Migration Plan

1. Add the new fixtures under existing `fixtures/organic-tree/` and `fixtures/omm/` directories.
2. Add or extend validation tests for the new invalid and poison fixtures.
3. Add renderer smoke tests for dense valid stress fixtures.
4. Add payload size-limit tests without committing unnecessarily large fixture files.
5. Update fixture README files to document naming categories and the no-`agent-list` terminology rule.
