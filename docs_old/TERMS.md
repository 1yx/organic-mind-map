# Terms: Organic Mind Map

This document defines project-specific terms. Use these names consistently in docs, specs, code comments, and user-facing workflow descriptions.

## Agent CLI + Agent Skill

External coding or LLM agent environments such as Gemini CLI, Codex CLI, or Claude Code plus this repository's root `SKILL.md`.

The Agent CLI + agent skill turns source text into `OrganicTree` JSON, runs `omm preview`, reads validation errors, and regenerates shorter or better-structured input when needed.

Do not call this flow "the editor" or "the app generating layout". The Agent produces semantic input; the browser owns layout and export.

## OrganicTree

The Agent/LLM-produced semantic tree consumed by the project CLI as the Phase 1 preview input contract.

`OrganicTree` contains the map title, center concept, ordered branches, optional semantic hints, and optional source metadata. It does not contain node IDs, final colors, organic seed, center fallback IDs, layout coordinates, path geometry, `.omm` layout snapshots, paper selection, or PNG export data.

The CLI validates `OrganicTree` structure, concept quality, and capacity, then hands the validated tree to the local preview service through `GET /api/document`.

Preferred spelling: `OrganicTree`.

Do not write: `Organic Tree`, `AgentList`, `ConciseListJSON`, `PreviewPayload`, or partial `OmmDocument` when referring to the CLI preview input contract.

## OmmDocument

The final `.omm` document exported by the browser after layout has been computed.

`OmmDocument` represents one organic mind map on one bounded surface. It stores semantic map content, a center visual object, document-level `organicSeed`, assets, metadata, and a browser-computed layout snapshot so the exported document can reopen with the same geometry.

The browser creates valid `OmmDocument` exports. The CLI must not fabricate partial `OmmDocument` payloads for preview handoff.

Preferred spelling: `OmmDocument` for the type and `.omm` for the file.

## organicSeed

The document-level stable seed stored in an `OmmDocument` and used to reproduce organic variation such as branch curvature, curve-taper proportions, and small hand-drawn variation.

For `OrganicTree` preview, the browser/renderer derives deterministic seed behavior from stable content serialization. The CLI must not assign or inject an organic seed.

If an `.omm` document is missing `organicSeed` but has a complete layout snapshot, validation may backfill a deterministic seed without relayout or coordinate changes. If no complete layout snapshot is available, missing `organicSeed` is a validation error.

Preferred spelling in prose: `organicSeed` when referring to the field; "organic seed" for general explanation.

## Bounded Surface

The finite drawing surface for one organic mind map.

Phase 1 uses a fixed `sqrt2-landscape` surface ratio of approximately `1.414:1`. This gives the map a paper-like boundary without exposing A3/A4 physical paper selection in the MVP.

Do not describe MVP preview as an infinite canvas, freeform whiteboard, or CLI-selected paper size.

## sqrt2-landscape

The fixed MVP bounded surface preset.

It uses a landscape width/height ratio close to `sqrt(2)`, matching the familiar A-series paper proportion while remaining a ratio preset rather than a physical A3/A4 paper spec.

Use "sqrt2-landscape surface viewBox" when describing renderer viewport assertions for MVP OrganicTree previews.

## Layout Snapshot

The browser-computed geometry persisted in an `OmmDocument`.

It includes surface viewport data, center visual bounds, node layout data, branch paths, and text paths needed to reproduce the exported map without rerunning layout from raw semantic input alone.

Layout snapshots belong in browser-exported `.omm` files, not in `OrganicTree`.

## Center Visual

The required visual center of the mind map.

A compliant map must start from a visual center, not plain center text. Phase 1 allows controlled single-color SVG centers as an exception, but the center must still be an image or clear visual symbol and must fall back to a deterministic built-in center visual when external SVG loading is unavailable or unsafe.

## center.svgUrl

An optional, untrusted visual hint in `OrganicTree.center`.

The CLI only type-checks that `center.svgUrl` is a string when present and preserves it. The browser performs HTTPS allowlist checks, fetch, SVG safety checks, and fallback. The exported `.omm` must not rely on the external URL as final visual truth.

## visualHint

An optional semantic hint for choosing or rendering visual treatment.

`visualHint` may appear on the center or branches in `OrganicTree`. It is preserved by validation for downstream rendering. In Phase 1, unsupported hints should not block validation.

## One Concept Unit Per Branch

The strict organic mind map rule that one branch carries one cognitive concept unit.

This is not a mechanical one-token rule. Chinese compound terms, English concept phrases, and mixed terms can be valid if they express one concept and stay within MVP capacity limits. Sentences, explanatory clauses, and paragraphs are invalid input for branch concepts.

Use "一个概念单元一分支" in Chinese docs.

## Curved Tapered Branch

The organic branch shape that naturally curves and tapers from thicker near the center to thinner near the tip.

Use "曲线渐细分支" in Chinese docs. Avoid "锥形曲线" or "锥形分支" unless directly explaining older wording.

## Main Branch

A first-level branch from the center visual.

Main branches should use distinct colors as category and memory anchors. Although organic mind maps do not impose a hard theoretical limit on hierarchy depth, main branch count is recommended to stay around 3 to 7 for human memory chunking.

## BOI

Basic Ordering Idea.

BOI is a content organization concept for main or key branches. It is not a technical node ID, tree order, or presentation sequence.

## Node ID

A stable invisible technical identifier used in persisted/rendered document structures where IDs are required.

Node IDs are browser/domain-generated for final documents and render state. They are not supplied by the Agent in `OrganicTree` and must not be treated as BOI or presentation order.

## Presentation Sequence

A user-defined ordered sequence of node IDs or presentation steps.

Presentation Sequence is distinct from BOI and tree order. It is not part of the Phase 1 MVP preview flow.

## PreviewPayload

Deprecated legacy intermediate preview wrapper.

Active Phase 1 preview handoff must use validated `OrganicTree` directly. Do not introduce new code, fixtures, or docs that depend on `PreviewPayload`.
