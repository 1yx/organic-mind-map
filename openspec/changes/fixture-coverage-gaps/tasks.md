## 1. Fixture Additions

- [ ] 1.1 Add `fixtures/organic-tree/stress-extreme-siblings.json` with 10-15 dense sibling branches and long concept units near MVP capacity.
- [ ] 1.2 Add `fixtures/organic-tree/stress-unbalanced-tree.json` with strongly asymmetric branch distribution.
- [ ] 1.3 Add `fixtures/organic-tree/poison-xss-protocol.json` or equivalent cases for unsafe center visual URL protocols.
- [ ] 1.4 Add `fixtures/organic-tree/poison-unreachable-svg-url.json` with a center visual URL that reliably returns 404 or times out.
- [ ] 1.5 Add a text-injection poison fixture that includes script-like markup as concept text while preserving valid JSON shape.
- [ ] 1.6 Add an oversized mostly-whitespace or generated payload-size boundary fixture/test input without committing an unnecessary 10MB static file.
- [ ] 1.7 Add `fixtures/omm/invalid-web-fonts-declaration.json`.
- [ ] 1.8 Add `fixtures/omm/repair-missing-seed-with-layout.json`.
- [ ] 1.9 Add `fixtures/omm/invalid-missing-seed-without-layout.json`.

## 2. Validation Boundaries

- [ ] 2.1 Add tests proving valid stress OrganicTree fixtures pass structural, concept quality, and capacity validation.
- [ ] 2.2 Add tests proving unsafe center visual protocols are rejected or downgraded before unsafe rendering.
- [ ] 2.3 Add tests proving unreachable SVG URL fixtures fall back to the built-in hash template without white screen or JavaScript crash.
- [ ] 2.4 Add tests proving script-like concept text is escaped as inert renderer text.
- [ ] 2.5 Add CLI or core boundary tests for oversized payload byte-size rejection before renderer handoff.
- [ ] 2.6 Add `.omm` validation tests proving forbidden web font declarations fail fast with path-specific errors and are not normalized.
- [ ] 2.7 Add `.omm` repair tests proving missing `organicSeed` with a complete layout snapshot is backfilled via deterministic `cyrb53` without relayout.
- [ ] 2.8 Add `.omm` validation tests proving missing `organicSeed` without a complete layout snapshot does not silently repair.

## 3. Renderer Smoke Coverage

- [ ] 3.1 Render `stress-extreme-siblings.json` through the readonly SVG renderer smoke path.
- [ ] 3.2 Render `stress-unbalanced-tree.json` through the readonly SVG renderer smoke path.
- [ ] 3.3 Assert stress renderer output is non-empty and uses expected paper bounds.
- [ ] 3.4 Assert stress renderer output includes expected branch and text markers.
- [ ] 3.5 Use structural assertions or diagnostics only; do not add image-perfect snapshots.

## 4. Documentation And Terminology

- [ ] 4.1 Update `fixtures/organic-tree/README.md` to document `stress-*`, `poison-*`, `invalid-*`, and `valid-*` fixture categories.
- [ ] 4.2 Update `fixtures/omm/README.md` to document runtime artifact negative fixtures.
- [ ] 4.3 Verify new fixture docs and tests use `OrganicTree` terminology and do not reintroduce `agent-list`.
- [ ] 4.4 Document that heavyweight browser automation and CLI one-shot PNG export remain out of scope for this change.

## 5. Verification

- [ ] 5.1 Run fixture validation tests.
- [ ] 5.2 Run renderer smoke tests.
- [ ] 5.3 Run CLI preview boundary tests.
- [ ] 5.4 Run typecheck.
- [ ] 5.5 Run `openspec status --change fixture-coverage-gaps` and confirm all artifacts are complete.
