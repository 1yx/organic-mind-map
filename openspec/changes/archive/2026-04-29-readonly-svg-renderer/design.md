# readonly-svg-renderer Design

## Goal

Render validated preview data or a `.omm` document into a read-only SVG scene that visually represents an Organic Mind Map on fixed A3/A4 landscape paper. The browser-side renderer owns text measurement, seeded organic geometry, collision-aware layout, and final SVG rendering.

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

Final layout depends on text metrics, branch geometry, and paper constraints. Therefore:

* CLI does not compute final coordinates.
* Browser preview measures layout-time text width with an offscreen Canvas 2D `CanvasRenderingContext2D.measureText()` adapter.
* Layout solving must not mount hidden DOM/SVG text nodes or call SVG `getBBox()` in tight measurement loops.
* Browser preview computes branch lengths, text clipping, and layout geometry.
* Browser preview can produce the final downloadable `.omm` with computed layout if that artifact is needed.
* Browser preview derives deterministic domain state from `PreviewPayload`; CLI does not assign IDs, colors, organic seed, or center visual fallback.

SVG `textPath` remains the final rendering mechanism, but Canvas 2D measurement is the performance boundary for layout inference. Small sub-pixel differences are acceptable within the organic branch style.

The renderer must use a system font stack only, such as `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Do not introduce remote or local Web Fonts, `@font-face`, WOFF/WOFF2 assets, or font Base64 inlining. The same font stack must be used for Canvas 2D measurement and final SVG text rendering so PNG export remains visually aligned.

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
* derive node IDs, colors, and branch geometry parameters from the stable tree order and seed

The seed must be applied before layout legality is evaluated. Seed-derived curvature, initial branch angle, taper, and length preference feed into geometry generation first; then bounding boxes and collision checks are computed from those seeded shapes.

This keeps refreshes and fixture tests stable without adding a CLI `--seed` parameter.

## Layout Strategy

MVP layout is deterministic and collision-aware:

1. Compute paper bounds and safe margins.
2. Derive seeded geometry parameters: branch angle, curvature, taper, and length preference.
3. Measure concept text with Canvas 2D and determine ideal branch length.
4. Compute center visual box.
5. Split main branches left/right or radial by count.
6. Place first-level branches around the center.
7. Place child branches recursively within each branch sector.
8. Generate conservative bounding boxes for text, center visual, branch shapes, and branch path envelopes.
9. Run basic bounding-box collision detection and local spacing correction.
10. Check paper boundaries and mark hard failure when content cannot be legally contained.
11. Clamp visible text to available branch length only after legal geometry is established.

MVP layout must include bounding-box collision detection as a baseline. Simple sector assignment alone is not sufficient because branch curves and path text can otherwise cross or overlap.

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

* browser-loaded controlled SVG supplied by `PreviewPayload.centerVisual.svgUrl`
* built-in multi-color visual template selected deterministically from content hash
* hybrid title + simple shapes

Plain text center is not compliant.

If `svgUrl` is present and passes the hardcoded controlled-source rule, the browser may fetch it asynchronously, apply a lightweight guard for obvious unsafe SVG content, and render the result as the center visual. If loading fails, times out, or fails the guard, selection of a built-in center template must be deterministic from the same OrganicTree content hash used for organic seed derivation.

Phase 1 allows the controlled SVG to be single-color because many vector-library assets are monochrome. The renderer should not attempt automatic multi-color recoloring of arbitrary SVG paths in Phase 1.

## Organic Seed

Use browser-derived `organicSeed` to derive stable minor variation:

* initial branch angle preference
* branch curvature
* taper ratio
* length preference
* small control point offsets

Seed-derived geometry is generated before bounding boxes and collision checks. The layout solver must evaluate the final seeded geometry, not apply random perturbation after a legal layout has already been computed.

## Diagnostics

Diagnostics are for tests and development, not user-facing warnings:

* clipped text count
* missing asset fallback
* layout overflow
* bounding-box collision unresolved
* branch/text crossing detected
* invalid center fallback
* hard layout failure

The preview should stay lightweight. Capacity failures should primarily be prevented by CLI threshold checks that return feedback to the AI agent.

## Risks

* Spending too much time on perfect global optimization before the preview pipeline exists.
* Underbuilding collision checks and producing visually broken overlaps.
* Making renderer depend on browser-only APIs, which complicates testing.
* Rendering text in boxes by accident.
* Letting oversized inputs reach the renderer instead of being rejected earlier.

## Decisions

* SVG is the primary render target.
* MVP layout is deterministic and includes bounding-box collision protection.
* Text clipping is visible but not actively warned to users.
* Browser-side Canvas 2D `measureText()` is the layout-time text measurement source.
* Renderer text uses system fonts only; Web Fonts are out of scope for MVP and base rendering.
* Organic seed is derived from OrganicTree content using a synchronous stable hash such as `cyrb53`.
* Seed-derived geometry parameters are instantiated before collision detection and layout solving.
* Center visual selection prioritizes a successfully loaded controlled SVG URL and falls back to a deterministic hash-selected built-in template.
