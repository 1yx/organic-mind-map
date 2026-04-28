## 1. Fixture Set

- [ ] 1.1 Add valid Chinese concept-unit OrganicTree fixture.
- [ ] 1.2 Add valid English concept-phrase OrganicTree fixture.
- [ ] 1.3 Add deeper hierarchy fixture within MVP capacity.
- [ ] 1.4 Add center visual hint or center SVG fixture.
- [ ] 1.5 Add unreachable SVG URL fixture to test browser fallback resilience.
- [ ] 1.6 Add sentence-like invalid fixture.
- [ ] 1.7 Add oversized invalid fixture that exceeds MVP capacity.
- [ ] 1.8 Add at least one valid `.omm` fixture.

## 2. Validation Tests

- [ ] 2.1 Test valid OrganicTree fixtures pass structural validation.
- [ ] 2.2 Test valid fixtures pass concept quality validation.
- [ ] 2.3 Test valid fixtures pass capacity validation.
- [ ] 2.4 Test sentence-like invalid fixture fails with path-specific errors.
- [ ] 2.5 Test oversized invalid fixture fails with regeneration-oriented feedback.
- [ ] 2.6 Test valid `.omm` fixture passes document validation.

## 3. Preview Payload Coverage

- [ ] 3.1 Test valid OrganicTree fixture can produce a valid `PreviewPayload`.
- [ ] 3.2 Test preview payload preserves paper selection and metadata.
- [ ] 3.3 Test preview payload preserves center visual hint or SVG fields where applicable.
- [ ] 3.4 Test unreachable SVG URL fixture produces a preview payload and browser degrades to built-in template.

## 4. Renderer Smoke Coverage

- [ ] 4.1 Render a valid preview payload fixture through `readonly-svg-renderer`.
- [ ] 4.2 Render a valid `.omm` fixture through `readonly-svg-renderer`.
- [ ] 4.3 Assert renderer output is non-empty and uses expected paper viewBox.
- [ ] 4.4 Assert output contains paper, center visual, branches, and path text markers.
- [ ] 4.5 Assert unreachable SVG URL fixture renders fallback template without crash.
- [ ] 4.6 Avoid image-perfect snapshot assertions in MVP smoke tests.

## 5. Local Preview Workflow

- [ ] 5.1 Add documented command sequence for previewing a fixture with `omm preview` (no `--seed` parameter).
- [ ] 5.2 Document that fixtures represent Agent CLI + skill output.
- [ ] 5.3 Document that browser computes layout and exports `.omm` and PNG.
- [ ] 5.4 Document that rendering determinism comes from content hash (cyrb53), not external seeds.
- [ ] 5.5 Document that `.omm` visual editing is not required in Phase 1.
- [ ] 5.6 Add local preview smoke test or manual smoke checklist for fixture preview.

## 6. Export Boundary

- [ ] 6.1 Document PNG export verification through the Web preview path.
- [ ] 6.2 Avoid adding Puppeteer or Playwright to CLI just to verify PNG export.
- [ ] 6.3 Add test or documentation check that CLI one-shot PNG export remains unavailable in Phase 1.
