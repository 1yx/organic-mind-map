## 1. Contract Cleanup

- [ ] 1.1 Remove `paper`, `PaperSpec`, `surface`, physical size, and aspect-ratio fields from active OrganicTree input examples and validation paths.
- [ ] 1.2 Remove `--paper` parsing, usage text, and paper override behavior from `omm preview`.
- [ ] 1.3 Add or update CLI tests proving `--paper` is unsupported and OrganicTree paper/surface fields are rejected or reported as unsupported.

## 2. Surface Model

- [ ] 2.1 Define the MVP bounded surface preset as `sqrt2-landscape` with width/height approximately `1.414`.
- [ ] 2.2 Replace renderer A3/A4 default preview constants with the fixed MVP surface for OrganicTree rendering.
- [ ] 2.3 Keep future ratio presets, such as `16:9`, out of OrganicTree and scoped to renderer/Web preview state.

## 3. Web Preview And Server

- [ ] 3.1 Ensure `/api/document` serves OrganicTree without paper or preview-surface metadata.
- [ ] 3.2 Update Web preview aspect-ratio logic to use the fixed MVP surface for OrganicTree previews.
- [ ] 3.3 Ensure `.omm` documents use their saved surface/layout snapshot when previewed.
- [ ] 3.4 Update local preview server and Web tests that currently assert A3/A4 paper ratio behavior.

## 4. Export And Document Format

- [ ] 4.1 Update PNG export sizing to preserve the current preview surface ratio instead of selected A3/A4 paper ratios.
- [ ] 4.2 Update `.omm` export/schema code to store `surface` with `preset: "sqrt2-landscape"` and `aspectRatio` instead of MVP A3/A4 paper specs.
- [ ] 4.3 Update `.omm` fixtures and validation tests that currently require `paper.kind`, `widthMm`, or `heightMm`.

## 5. Documentation Alignment

- [ ] 5.1 Update `docs/PRD.md`, `docs/TECH_DESIGN.md`, and `docs/GUIDELINES.md` MVP wording from A3/A4 paper selection to fixed bounded landscape surface ratio.
- [ ] 5.2 Update active OpenSpec docs to avoid `paper`, `PaperSpec`, A3/A4, or physical dimensions in the Agent/CLI/Web preview input path.
- [ ] 5.3 Keep any future A3/A4 or print-specific wording explicitly outside MVP preview scope.

## 6. Verification

- [ ] 6.1 Run typecheck.
- [ ] 6.2 Run core OrganicTree validation tests.
- [ ] 6.3 Run CLI preview tests.
- [ ] 6.4 Run renderer tests.
- [ ] 6.5 Run Web/export tests.
- [ ] 6.6 Run `openspec status --change preview-paper-parameter --json` and confirm artifacts are complete.
