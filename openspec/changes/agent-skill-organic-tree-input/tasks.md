## 1. Remove ConciseListJSON Path

- [ ] 1.1 Confirm `openspec/changes/concise-list-json-input/` is absent.
- [ ] 1.2 Verify no active spec or doc requires `ConciseListJSON`.
- [ ] 1.3 Verify no CLI task adds `--concise-list-json`.

## 2. Root SKILL.md

- [ ] 2.1 Create root `SKILL.md`.
- [ ] 2.2 Document the flow `Long Text -> SKILL -> OrganicTree -> CLI -> Browser`.
- [ ] 2.3 Instruct the Agent/LLM to output valid OrganicTree JSON directly.
- [ ] 2.4 Include a minimal valid OrganicTree example.
- [ ] 2.5 Include constraints for concept units, max depth, branch count, and semantic preservation.
- [ ] 2.6 Explicitly forbid layout coordinates, node IDs, colors, organic seeds, `PreviewPayload`, `OmmDocument`, and PNG/export data in Agent output.
- [ ] 2.7 Include instructions for the reflection loop: how the Agent should read CLI validation errors (path-specific, with actionable repair suggestions) and regenerate corrected OrganicTree JSON.

## 3. OrganicTree Contract Update

- [ ] 3.1 Remove `paper` field from `OrganicTree` type in `@omm/core`.
- [ ] 3.2 Remove `paper` validation from `validateStructural` in `@omm/core`.
- [ ] 3.3 Confirm `meta` (sourceTitle / sourceSummary) remains as optional OrganicTree fields.
- [ ] 3.4 Confirm `center.svgUrl` remains as the sole center visual handoff field on `OrganicTree` (replaces `PreviewPayload.centerVisual.inlineSvg` and `centerVisual.svgUrl`).
- [ ] 3.5 Update `organic-tree-contract` spec to remove `paper` scenarios and confirm `meta` / `svgUrl` scenarios.
- [ ] 3.6 Update `@omm/core` JSDoc and index exports to reflect the simplified OrganicTree shape.
- [ ] 3.7 Remove references to `PreviewPayload` and `CenterVisual` wrapping from `@omm/core` documentation.

## 4. CLI Guardrail Documentation

- [ ] 4.1 Document CLI responsibility as Validator + Service Starter.
- [ ] 4.2 Document that CLI validation errors should be fed back to the calling Agent for reflection/self-correction.
- [ ] 4.3 Document the **standardized JSON error structure** (path, message, suggestion) that CLI uses for reporting.
- [ ] 4.4 Add **actionable repair suggestions** (e.g. truncated concept previews) to validation error messages.
- [ ] 4.5 Document that CLI must not repair malformed semantic trees beyond safe whitespace normalization.
- [ ] 4.6 Ensure CLI usage examples use existing OrganicTree file/stdin input and not `--concise-list-json`.
- [ ] 4.7 Remove `PreviewPayload` from the CLI-to-Web handoff path so validated OrganicTree is served directly via `/api/document`.
- [ ] 4.8 Remove `--paper` CLI flag and delete `paper` override logic from `preview.ts`.
- [ ] 4.9 Remove `isAllowedSvgUrl` import and `centerVisual` wrapping from `preview.ts`; browser/renderer will handle allowlist filtering.
- [ ] 4.10 Update Web input handling to instantiate domain/view state directly from OrganicTree.

## 5. Renderer and Web Adaptation

- [ ] 5.1 Remove `PreviewPayload` type from `@omm/renderer/src/types.ts`.
- [ ] 5.2 Update `RenderInput` discriminator: `{ kind: "organic-tree"; tree: OrganicTree }` replaces `{ kind: "preview-payload"; payload: PreviewPayload }`. Keep `{ kind: "omm-document"; document: OmmDocument }`.
- [ ] 5.3 Make the private `renderFromTree()` public (it already exists at `packages/renderer/src/render.ts:124`). Remove `renderFromPreview()` and `renderFromPreviewAsync()`. The existing `render()` function remains the unified public entry point — update its `case "preview-payload"` to `case "organic-tree"`.
- [ ] 5.4 Update `resolveCenterVisualAsync()` to accept `OrganicTreeCenter` directly instead of `PreviewPayload`. The `center.svgUrl` field replaces `payload.centerVisual?.svgUrl` and `payload.centerVisual?.inlineSvg`. Remove the `inlineSvg` branch from `resolveCenterVisualAsync()`.
- [ ] 5.5 Move `svg-allowlist.ts` from `@omm/cli/src/` to `@omm/renderer/src/`. Update imports. Remove `isAllowedSvgUrl` from `@omm/cli`.
- [ ] 5.6 Update `packages/web/src/App.vue` format detection to recognize `OrganicTree` (version === 1 && "center" in data && "branches" in data).
- [ ] 5.7 Update `packages/web/src/App.vue` rendering call to use `render({ kind: "organic-tree", tree })` — the unified `render()` entry point.
- [ ] 5.8 Update paper aspect ratio logic in Web to use a hardcoded default (A3 landscape) instead of reading from `payload.paper`. Paper selection will be addressed in a follow-up change.
- [ ] 5.9 Update all renderer test files to remove `PreviewPayload` fixtures and pass `OrganicTree` fixtures to `render({ kind: "organic-tree", tree })`.

## 6. Local Preview Server Update

- [ ] 6.1 Update `local-preview-server` spec to describe serving `OrganicTree` via `/api/document` instead of `PreviewPayload`.
- [ ] 6.2 Update `packages/cli/src/preview-server.ts` type signatures to accept `OrganicTree | Record<string, unknown>`.
- [ ] 6.3 Update `packages/cli/src/preview-server.test.ts` to use `OrganicTree` fixtures instead of `PreviewPayload`.

## 7. Tests And Checks

- [ ] 7.1 Add or update tests that confirm unsupported options such as `--concise-list-json` fail with a usage error if such option parsing is present.
- [ ] 7.2 Add or update tests that prove invalid OrganicTree errors remain path-specific and suitable for Agent reflection.
- [ ] 7.3 Add documentation checks or search checks that `ConciseListJSON` is not present in active workflow docs except historical/rejection notes.
- [ ] 7.4 Add or update tests proving CLI serves validated OrganicTree directly, not PreviewPayload.
- [ ] 7.5 Verify existing OrganicTree file input still previews successfully.
- [ ] 7.6 Verify existing OrganicTree stdin input still previews successfully.
- [ ] 7.7 Add renderer tests proving `render({ kind: "organic-tree", tree })` produces valid SVG from OrganicTree fixtures.
- [ ] 7.8 Add tests for browser-side `svgUrl` allowlist filtering.

## 8. Documentation Alignment

- [ ] 8.1 Update `AGENTS.md` to remove `ConciseListJSON` and `PreviewPayload` from the active MVP flow.
- [ ] 8.2 Update `docs/PRD.md` and `docs/TECH_DESIGN.md` if they describe Agent output as anything other than OrganicTree.
- [ ] 8.3 Reference `docs/MCP_RESEARCH.md` as the rationale for keeping spatial intelligence out of the model and CLI.
- [ ] 8.4 Remove `PreviewPayload` from active Agent/CLI/Web flow docs and keep `OrganicTree` and `OmmDocument` terminology consistent.
- [ ] 8.5 Update `readonly-svg-renderer` spec to describe rendering from `OrganicTree` via the unified `render()` entry point with `RenderInput.kind: "organic-tree"`.
- [ ] 8.6 Update `local-preview-server` spec to describe serving `OrganicTree` over `/api/document`.
- [ ] 8.7 Remove the standalone `agent-skill-organic-tree-input/spec.md` — Agent skill requirements are covered in `cli-preview-handoff/spec.md`.

## 9. Verification

- [ ] 9.1 Run typecheck.
- [ ] 9.2 Run CLI preview tests.
- [ ] 9.3 Run core OrganicTree validation tests.
- [ ] 9.4 Run renderer tests.
- [ ] 9.5 Run `openspec status --change agent-skill-organic-tree-input` and confirm all artifacts are complete.
