# 05-readonly-svg-renderer Design

## Goal

Render validated preview data or a `.omm` document into a read-only SVG scene that visually represents an Organic Mind Map on fixed A3/A4 landscape paper. The browser-side renderer owns real text measurement and final layout computation.

## Renderer Boundary

Renderer input:

```ts
interface RenderInput {
  document: OmmDocument | PreviewPayload
  viewport?: {
    widthPx: number
    heightPx: number
  }
}
```

Renderer output:

```ts
interface RenderResult {
  svg: string
  viewBox: string
  paper: PaperSpec
  diagnostics: RenderDiagnostic[]
}
```

For Web integration, the renderer may also expose a render model for Vue components, but the core rendering math should remain framework-light.

## Browser Measurement Responsibility

Final layout depends on actual font metrics and SVG/DOM behavior. Therefore:

* CLI does not compute final coordinates.
* Browser preview measures text using real DOM/SVG APIs.
* Browser preview computes branch lengths, text clipping, and layout geometry.
* Browser preview can produce the final downloadable `.omm` with computed layout if that artifact is needed.
* Browser preview derives deterministic domain state from `PreviewPayload`; CLI does not assign IDs, colors, organic seed, or center visual fallback.

## Coordinate System

Use document coordinates independent of screen pixels.

Recommended:

```text
A3 landscape viewBox: 0 0 4200 2970
A4 landscape viewBox: 0 0 2970 2100
```

This maps 10 units to 1 mm and keeps integer-friendly geometry.

## Deterministic Instantiation

When rendering a `PreviewPayload`, the browser must instantiate its in-memory domain model deterministically:

* derive `organicSeed` from a stable serialization of the `OrganicTree`
* use a lightweight synchronous non-cryptographic hash such as `cyrb53`
* avoid `Math.random()` for seed generation
* avoid async `window.crypto.subtle` in the first render path
* derive node IDs, colors, and branch styling from the stable tree order and seed

This keeps refreshes and fixture tests stable without adding a CLI `--seed` parameter.

## Layout Strategy

MVP layout can be deterministic and heuristic:

1. Compute paper bounds and safe margins.
2. Compute center visual box.
3. Split main branches left/right or radial by count.
4. Assign each main branch a color.
5. Place first-level branches around the center.
6. Place child branches recursively within each branch sector.
7. Measure concept text in the browser and determine ideal branch length.
8. Clamp visible text to available branch length.

The MVP does not need perfect global optimization. It must avoid obvious overlap for representative fixtures that pass CLI capacity checks.

## Organic Branch Shape

Each branch should maintain separate geometry:

* spine path for text
* filled tapered shape for visual branch
* optional hit path for future interaction

MVP can approximate tapering with a closed SVG path around a quadratic or cubic spine.

## Text-on-Path

Render concept units along branch spines using SVG text/path support.

Rules:

* no boxed text nodes
* no rectangular labels
* English concepts may be uppercase
* clipped text is acceptable and visible as the rendered result

## Center Visual

Render center visual after branches so it retains visual weight.

MVP center options:

* sanitized inline SVG supplied by `PreviewPayload.centerVisual.inlineSvg`
* built-in multi-color visual template selected deterministically from content hash
* hybrid title + simple shapes

Plain text center is not compliant.

If `inlineSvg` is present, the renderer should prioritize it so PNG export does not depend on external URLs and does not taint canvas. Phase 1 allows this SVG to be single-color because many controlled vector-library assets are monochrome. If no inline SVG is present, selection of a built-in center template must be deterministic from the same OrganicTree content hash used for organic seed derivation.

## Organic Seed

Use browser-derived `organicSeed` to derive stable minor variation:

* branch curvature
* taper ratio
* small control point offsets

The seed must not change layout legality or cause overlap.

## Diagnostics

Diagnostics are for tests and development, not user-facing warnings:

* clipped text count
* missing asset fallback
* layout overflow
* invalid center fallback
* hard layout failure

The preview should stay lightweight. Capacity failures should primarily be prevented by CLI threshold checks that return feedback to the AI agent.

## Risks

* Spending too much time on perfect layout before the preview pipeline exists.
* Making renderer depend on browser-only APIs, which complicates testing.
* Rendering text in boxes by accident.
* Letting oversized inputs reach the renderer instead of being rejected earlier.

## Decisions

* SVG is the primary render target.
* MVP layout is deterministic heuristic layout.
* Text clipping is visible but not actively warned to users.
* Browser-side DOM measurement is the source of truth for layout.
* Organic seed is derived from OrganicTree content using a synchronous stable hash such as `cyrb53`.
* Center visual selection prioritizes sanitized inline SVG and falls back to a deterministic hash-selected built-in template.
