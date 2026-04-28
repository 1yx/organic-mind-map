# mvp-fixtures-validation Design

## Goal

Validate the full Phase 1 MVP pipeline with fixtures and smoke checks:

`Agent CLI + skill -> OrganicTree -> CLI validation -> browser layout -> .omm download/export -> PNG export`

## Fixture Strategy

Add fixtures that represent realistic MVP use:

```text
fixtures/
  organic-tree/
    simple-zh.json
    concept-phrases-en.json
    deeper-hierarchy.json
    center-visual-hint.json
    unreachable-svg-url.json
    invalid-sentence-like.json
    invalid-too-large.json
  omm/
    expected-simple-zh.omm
```

Rendering determinism is guaranteed by content hash (cyrb53 on OrganicTree JSON text). No external seed parameter is used.

## Validation Coverage

Cover:

* OrganicTree structural validation
* concept unit quality validation
* capacity threshold validation
* `.omm` schema validation
* embedded asset presence
* stable node ordering
* required center visual state

## Smoke Workflow

Provide a documented command sequence:

```bash
omm preview fixtures/organic-tree/simple-zh.json
```

Then the browser computes layout, and the user exports `.omm` and PNG from the Web preview.

The documentation should state that the fixture represents the output of an Agent CLI + skill workflow. Oversized fixtures should assert that CLI errors are structured enough for Gemini CLI, Codex CLI, Claude Code, or another calling Agent CLI to retry with a shorter concept list.

The `unreachable-svg-url.json` fixture contains a center visual URL pointing to a guaranteed 404 or timeout address. This fixture verifies that the browser renderer degrades gracefully to the built-in hash template image without crashing or showing a white screen.

If automated browser tests are not yet introduced, the smoke can be manual but documented. Automated Playwright/Puppeteer export is not required for MVP and should not be introduced only for CLI PNG export.

## Test Levels

1. **Unit tests**
   * validate OrganicTree
   * reject oversized OrganicTree
   * validate `.omm`
   * deterministic content-hash behavior (no external seed)

2. **Renderer smoke tests**
   * render SVG string/model from preview payload or `.omm`
   * assert non-empty SVG
   * assert paper viewBox
   * assert center visual and branch elements exist
   * assert unreachable SVG URL fixture renders fallback template without error

3. **Manual preview smoke**
   * start local server
   * visually inspect preview
   * click Export PNG

## Documentation

Add an MVP usage doc:

```text
1. Invoke the agent skill from an Agent CLI to prepare OrganicTree JSON
2. Start preview with the project CLI
3. Let browser compute layout
4. Export `.omm` from Web preview
5. Export PNG from Web preview
```

The doc should explicitly state that visual editing is not in Phase 1.

## Risks

* Snapshot tests becoming brittle before layout stabilizes.
* Over-automating browser export and reintroducing unwanted browser dependencies.
* Fixtures that are too perfect and do not represent real long-text summaries.
* Missing oversized fixtures that prove agent-regeneration feedback works.

## Decisions

* Prefer deterministic fixtures (content hash) over image-perfect assertions. No `--seed` CLI parameter.
* Keep export verification mostly manual unless a lightweight browser test is already available.
* Use fixtures to protect the MVP pipeline, not to lock final design polish.
* Include a poison fixture (`unreachable-svg-url.json`) to stress-test browser error boundaries.
