# agent-skill-organic-tree-input

## Why

MCP diagramming patterns show that successful AI drawing tools keep spatial intelligence out of the model: the model emits semantic structure, and deterministic code validates and renders it. Because `OrganicTree` has already been reduced to a concise 3-level semantic tree, adding a second `ConciseListJSON` contract would add maintenance cost without meaningfully reducing model burden.

## What Changes

* Delete the proposed `ConciseListJSON` input path and do not add `--concise-list-json`.
* Add root `SKILL.md` that instructs Agent CLIs to read long text and emit valid `OrganicTree` JSON directly.
* Keep `omm preview <input.json>` and OrganicTree stdin as the CLI input contract.
* Clarify CLI responsibility as `Validator + Service Starter`:
  * parse JSON,
  * run OrganicTree structural, quality, and capacity validation,
  * return path-specific errors for Agent reflection/self-correction,
  * pass validated OrganicTree directly to the local Web preview service after validation succeeds.
* Remove the `PreviewPayload` handoff layer from this path; Web receives validated OrganicTree directly via `/api/document`.
* Use `center.svgUrl` on `OrganicTree` as the sole center visual handoff channel (replaces `PreviewPayload.centerVisual.inlineSvg` and `centerVisual.svgUrl`).
* Remove `paper` from `OrganicTree`; the browser owns paper proportions (paper selection will be addressed in a follow-up change).
* Move `svgUrl` allowlist filtering from CLI to `@omm/renderer`.
* Update `RenderInput` to `{ kind: "organic-tree"; tree: OrganicTree }` and keep `render()` as the unified public entry point.
* Preserve browser ownership of IDs, colors, organic seed, center fallback, layout measurement, `.omm` export, and PNG export.

## Capabilities

### Modified Capabilities

* `cli-preview-handoff`: Clarify that the preview command accepts OrganicTree JSON directly and hands validated OrganicTree to Web without `ConciseListJSON`, `PreviewPayload`, or paper metadata. The Agent skill workflow (long text → OrganicTree via `SKILL.md`) and the reflection loop are documented within this spec — no separate capability is needed.
* `readonly-svg-renderer`: Update `RenderInput` to `{ kind: "organic-tree"; tree: OrganicTree }`, remove `PreviewPayload` type, make `renderFromTree()` public, and keep `render()` as the unified entry point. Center visual handoff uses `OrganicTree.center.svgUrl` directly.
* `local-preview-server`: Update server spec to serve `OrganicTree` over `/api/document` instead of `PreviewPayload`.

## Impact

* Adds root `SKILL.md` as the Agent skill prompt/instruction file (the skill is a single markdown file, not a separate OpenSpec capability).
* Updates OpenSpec/docs to describe `Long Text -> SKILL -> OrganicTree -> CLI -> Browser`.
* Removes `paper` from `OrganicTree` and deletes `--paper` CLI flag (paper selection deferred to a follow-up change).
* Moves `svgUrl` allowlist filtering from `@omm/cli` to `@omm/renderer`.
* `center.svgUrl` on `OrganicTree` replaces `PreviewPayload.centerVisual` as the sole center visual handoff channel.
* `RenderInput` discriminator updated from `"preview-payload"` to `"organic-tree"`; `render()` remains the unified public entry point.
* Avoids adding a new CLI transform layer or a new input flag.
* Does not change `OmmDocument` format, Web export behaviour, or browser-side layout ownership.
