## 1. Fixture Additions

- [x] 1.1 Add `fixtures/organic-tree/stress-extreme-siblings.json` with 10-15 dense sibling branches and long concept units near MVP capacity.
- [x] 1.2 Add `fixtures/organic-tree/stress-unbalanced-tree.json` with strongly asymmetric branch distribution.
- [x] 1.3 Add `fixtures/organic-tree/poison-xss-protocol.json` or equivalent cases for unsafe center visual URL protocols.
- [x] 1.4 Add `fixtures/organic-tree/poison-unreachable-svg-url.json` with a center visual URL that reliably returns 404 or times out.
- [x] 1.5 Add a text-injection poison fixture that includes script-like markup as concept text while preserving valid JSON shape.
- [x] 1.6 Add an oversized mostly-whitespace or generated payload-size boundary fixture/test input without committing an unnecessary 10MB static file.
- [x] 1.7 Add `fixtures/omm/invalid-web-fonts-declaration.json`.
- [x] 1.8 Add `fixtures/omm/repair-missing-seed-with-layout.json`.
- [x] 1.9 Add `fixtures/omm/invalid-missing-seed-without-layout.json`.

## 2. Validation Boundaries

- [x] 2.1 Add tests proving valid stress OrganicTree fixtures pass structural, concept quality, and capacity validation.
- [x] 2.2 Add tests proving unsafe center visual protocols are rejected or downgraded before unsafe rendering.
- [x] 2.3 Add tests proving unreachable SVG URL fixtures fall back to the built-in hash template without white screen or JavaScript crash.
- [x] 2.4 Add tests proving script-like concept text is escaped as inert renderer text.
- [x] 2.5 Add CLI or core boundary tests for oversized payload byte-size rejection before renderer handoff.
- [x] 2.6 Add `.omm` validation tests proving forbidden web font declarations fail fast with path-specific errors and are not normalized.
- [x] 2.7 Add `.omm` repair tests proving missing `organicSeed` with a complete layout snapshot is backfilled via deterministic `cyrb53` without relayout.
- [x] 2.8 Add `.omm` validation tests proving missing `organicSeed` without a complete layout snapshot does not silently repair.

## 3. Renderer Smoke Coverage

- [x] 3.1 Render `stress-extreme-siblings.json` through the readonly SVG renderer smoke path.
- [x] 3.2 Render `stress-unbalanced-tree.json` through the readonly SVG renderer smoke path.
- [x] 3.3 Assert stress renderer output is non-empty and uses expected paper bounds.
- [x] 3.4 Assert stress renderer output includes expected branch and text markers.
- [x] 3.5 Use structural assertions or diagnostics only; do not add image-perfect snapshots.

## 4. Documentation And Terminology

- [x] 4.1 Update `fixtures/organic-tree/README.md` to document `stress-*`, `poison-*`, `invalid-*`, and `valid-*` fixture categories.
- [x] 4.2 Update `fixtures/omm/README.md` to document runtime artifact negative fixtures.
- [x] 4.3 Verify new fixture docs and tests use `OrganicTree` terminology and do not reintroduce `agent-list`.
- [x] 4.4 Document that heavyweight browser automation and CLI one-shot PNG export remain out of scope for this change.

## 5. Verification

- [x] 5.1 Run fixture validation tests.
- [x] 5.2 Run renderer smoke tests.
- [x] 5.3 Run CLI preview boundary tests.
- [x] 5.4 Run typecheck.
- [x] 5.5 Run `openspec status --change fixture-coverage-gaps` and confirm all artifacts are complete.
