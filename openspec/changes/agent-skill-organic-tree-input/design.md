# agent-skill-organic-tree-input Design

## Context

`docs/MCP_RESEARCH.md` compares Mermaid and Excalidraw MCP patterns and reaches a useful product constraint: the model should own semantic structure, while deterministic code owns validation, layout, and rendering. For Organic Mind Map, the browser is the spatial intelligence layer.

The resulting MVP flow is:

```text
Long text
  -> Agent CLI + SKILL.md
  -> OrganicTree JSON
  -> omm preview <OrganicTree input>
  -> CLI validation and capacity checks
  -> Web receives validated OrganicTree via /api/document
  -> browser layout/export
```

`ConciseListJSON` is intentionally removed. It creates a second semantic contract and a transform layer without enough benefit now that `OrganicTree` itself is a concise 3-level concept tree.

`PreviewPayload` is removed from this handoff path. The CLI passes the validated `OrganicTree` directly to the local preview server. The browser owns all spatial intelligence: ID generation, colors, organic seed, center fallback, layout, `.omm` export, and PNG export. `paper` is also removed from `OrganicTree`; the browser uses its own default paper proportions.

## Goals / Non-Goals

**Goals:**

* Add root `SKILL.md` for Agent CLI workflows.
* Instruct agents to convert long text directly into valid `OrganicTree` JSON.
* Keep CLI preview input as OrganicTree file/stdin.
* Clarify CLI as `Validator + Service Starter`, not a semantic transform engine.
* Pass validated OrganicTree directly to Web via `/api/document` after CLI validation.
* Use CLI validation errors (path-specific, with actionable repair suggestions) as reflection feedback.
* Center visual handoff uses `OrganicTree.center.svgUrl` — no `PreviewPayload.centerVisual` wrapping.
* Preserve browser ownership of IDs, colors, seeds, center fallback, layout, `.omm`, PNG export, and svgUrl allowlist filtering.
* Keep `render()` as the unified public entry point with `RenderInput` updated to `{ kind: "organic-tree" }`.

**Non-Goals:**

* No `ConciseListJSON` type, parser, fixtures, or CLI flag.
* No `--concise-list-json` option.
* No LLM calls inside the CLI.
* No CLI attempt to repair malformed semantic structure beyond safe whitespace normalization.
* No CLI layout, `.omm` export, or PNG export.
* No `PreviewPayload` layer in the Agent/CLI/Web preview path.
* No `paper` field in `OrganicTree`; the browser determines paper proportions.
* No CLI-side svgUrl allowlist filtering.

## Decisions

### OrganicTree is the Agent skill output

The root skill should tell the Agent to emit the existing `OrganicTree` JSON contract:

```json
{
  "version": 1,
  "title": "项目复盘",
  "center": {
    "concept": "项目复盘"
  },
  "branches": [
    {
      "concept": "目标",
      "children": [
        { "concept": "用户增长" },
        {
          "concept": "收入验证",
          "children": [
            { "concept": "毛利润" },
            { "concept": "ROI" }
          ]
        }
      ]
    }
  ]
}
```

The skill may explain the shape and provide examples, but it must not ask the Agent to compute layout, node IDs, colors, seeds, paper coordinates, path geometry, or export artifacts. The skill may optionally include `meta.sourceTitle` and `meta.sourceSummary` when the Agent can infer them from the source text.

### CLI validates instead of transforms

The CLI should not introduce a second input contract or conversion layer. It should:

* parse OrganicTree JSON,
* run structural validation,
* run quality validation,
* run capacity validation,
* report path-specific errors using a **standardized JSON error structure** (e.g., compatible with JSON Schema error objects) to allow Agent CLIs to programmatically identify failing fields,
* include **actionable repair suggestions** or truncated previews in error messages (e.g., "Concept exceeds 25 units; suggested truncation: '...'") to help the Agent converge faster,
* start the local preview server with validated OrganicTree.

The CLI does **not** perform svgUrl allowlist filtering, paper assignment, or centerVisual wrapping. If the model output is malformed, the CLI reports precise errors. The calling Agent uses those errors to regenerate corrected OrganicTree JSON.

### Keep current preview input shape

`omm preview <input.json>` and OrganicTree stdin remain the supported input forms. This keeps fixtures and manual debugging aligned with the same contract used by Agent workflows.

No `--concise-list-json` flag should be added. No `--paper` flag should be added.

### Remove PreviewPayload and paper from the handoff

The local Web preview should receive validated OrganicTree directly. The CLI should not wrap it into a second object with the same semantic tree plus minimal metadata. The Web app is responsible for turning OrganicTree into in-memory view/domain state.

`paper` is removed from `OrganicTree`. The browser uses its own default paper proportions and does not depend on the CLI to choose a paper size. Paper selection can be added later through browser UI or `RenderOptions`, not through the semantic input contract.

### center.svgUrl is the sole center visual handoff channel

The `PreviewPayload.centerVisual` wrapper (with `inlineSvg` and `svgUrl`) is removed. The `OrganicTree.center.svgUrl` field is the single channel for external center visual content:

- The Agent may populate `center.svgUrl` with an allowlisted HTTPS URL to a controlled SVG source.
- The CLI passes `center.svgUrl` through unchanged — no filtering, fetching, or wrapping.
- The browser/renderer reads `center.svgUrl` directly from `OrganicTree.center`, performs allowlist filtering, loads the SVG asynchronously, and applies safety checks before rendering.
- If loading fails or the URL is not allowlisted, the renderer falls back to a deterministic built-in center visual.

`centerVisual.inlineSvg` is intentionally not carried forward — for MVP, inline SVG is replaced by URL-based loading via `center.svgUrl`. The AI SVG center visual tool provides a URL rather than inline content.

### Renderer uses unified `render()` entry point with `RenderInput`

The renderer keeps the existing `render(input: RenderInput, options?)` as the single public entry point. `RenderInput` is updated:

```typescript
export type RenderInput =
  | { kind: "omm-document"; document: OmmDocument }
  | { kind: "organic-tree"; tree: OrganicTree };
```

The existing private `renderFromTree()` is made public for callers that prefer a direct function, but `render()` remains the canonical unified API. `renderFromPreview()` and `renderFromPreviewAsync()` are removed — their callers use `render({ kind: "organic-tree", tree })` instead.

### Browser owns spatial intelligence

All spatial work stays in the browser:

* stable node IDs,
* color assignment,
* organic seed generation,
* center fallback selection,
* text measurement,
* branch layout,
* `.omm` layout snapshot,
* PNG export,
* svgUrl allowlist filtering.

This follows the Mermaid/Excalidraw lesson: do not make the model or CLI calculate visual space or perform security filtering that belongs in the rendering layer.

## Risks / Trade-offs

* **Risk: LLM emits invalid OrganicTree JSON.** -> Mitigate with a strict `SKILL.md` example and path-specific CLI errors that support Agent reflection.
* **Risk: Full OrganicTree is still more verbose than a bare list.** -> Mitigate by keeping the schema shallow, explicit, and limited to semantic fields.
* **Risk: Agents try to repair by adding non-contract fields.** -> Mitigate with strict structural validation and skill instructions that forbid extra layout or rendering fields.
* **Risk: CLI becomes a semantic fixer over time.** -> Mitigate by documenting CLI as Validator + Service Starter and keeping semantic rewriting out of scope.
* **Risk: Removing PreviewPayload removes the `centerVisual.inlineSvg` channel.** -> Mitigate by using `OrganicTree.center.svgUrl` as the sole center visual handoff. The AI SVG tool provides a URL instead of inline content. The renderer loads from `center.svgUrl` directly via `resolveCenterVisualAsync()`.
* **Risk: Removing PreviewPayload affects renderer, Web, and server code.** -> Mitigate by updating `RenderInput` to `{ kind: "organic-tree"; tree: OrganicTree }`, making the private `renderFromTree()` public, updating Web input detection to recognize `OrganicTree`, and updating the local preview server spec to serve `OrganicTree` over `/api/document`.
* **Risk: svgUrl allowlist filtering moves from CLI to browser, changing security posture (DNS/connection attempts happen client-side).** -> Mitigate by placing allowlist logic in `@omm/renderer` and accepting the slight shift in trust boundary — the browser is the rendering layer and the natural place for URL-level security decisions in a local-only MVP.
