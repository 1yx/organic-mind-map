# ai-svg-center-visual Design

## Context

The MVP pipeline starts from an Agent CLI skill that produces an OrganicTree JSON document, then the project CLI validates the input and hands a `PreviewPayload` to the local browser preview. The browser owns deterministic domain instantiation, layout, `.omm` export, and PNG export.

Buzan-style maps need a meaningful center image. Phase 1 already supports deterministic built-in center visual fallback in the browser, but an AI-selected SVG can make the center more semantically relevant without adding bitmap payload bloat. Arbitrary external images are not acceptable because they make quality, CORS behavior, portability, and SVG security unpredictable.

Phase 1 also relaxes the long-term "center image must contain at least three colors" principle for controlled or AI-selected SVG assets. A single-color SVG is acceptable as long as the center remains a real visual symbol, not plain text.

## Goals / Non-Goals

**Goals:**

* Allow the agent contract to carry an optional controlled SVG URL for the center concept.
* Keep the CLI lightweight: validate and pass an allowlisted URL, but do not fetch or sanitize SVG.
* Use a small hardcoded source allowlist for Phase 1.
* Let the browser asynchronously load the controlled SVG URL and apply a lightweight safety guard.
* Fall back to deterministic built-in center visuals when the URL is absent, blocked, failed, or unsafe.
* Keep CLI preview startup free of network image latency.

**Non-Goals:**

* No arbitrary web image URLs in Phase 1.
* No AI bitmap generation or Base64 bitmap embedding.
* No CLI-side PNG export.
* No filesystem image cache.
* No full icon search UI in the Web preview.
* No strict three-color enforcement for Phase 1 AI-selected SVGs.
* No dynamic `.ommrc` or remote allowlist configuration in Phase 1.

## Decisions

### Use controlled SVG URLs, not arbitrary images

`organic-tree-contract` will accept an optional center SVG URL field such as `center.svgUrl` or `center.iconUrl`. The accepted source set is intentionally narrow: HTTPS URLs from an internal hardcoded allowlist, initially Iconify-compatible endpoints.

Alternative considered: allow any image URL. This was rejected because arbitrary URLs make quality, CORS, portability, and security unpredictable.

### Pass URL in CLI, load in browser

The CLI handoff layer will only validate URL shape and source membership, then attach the URL to `PreviewPayload.centerVisual.svgUrl`.

The browser renderer owns the asynchronous SVG request, lightweight safety guard, inline render model, load readiness, and fallback. The CLI still does not create final node IDs, colors, layout coordinates, `.omm` layout snapshots, PNG output, or image assets.

Alternative considered: fetch and sanitize in CLI. This was rejected for MVP because robust Node.js SVG sanitization would likely require heavy DOM dependencies, conflicting with the lightweight CLI boundary already chosen to avoid Puppeteer/Playwright-style bundling.

### Fail closed into deterministic fallback

Malformed URLs and non-allowlisted hosts will not trigger network work. The CLI omits `svgUrl`, attaches a diagnostic where the current payload/error model supports it, and the browser uses its deterministic built-in fallback selected from the OrganicTree content hash.

Browser fetch failure, timeout, invalid response, or safety-check failure is also non-fatal. The renderer swaps to the deterministic built-in fallback without requiring CLI retry or terminal blocking.

### Keep browser safety guard lightweight

Phase 1 does not implement a full SVG sanitizer. The browser trusts only the hardcoded controlled source and applies lightweight guards before inline rendering. The guard must reject at least:

* `<script>`, `<foreignObject>`, and unknown executable content.
* Event handler attributes such as `onclick`.
* External `href` / `xlink:href` references.
* CSS `url(...)` references.
* Embedded raster or data URL images.

The implementation can start with conservative text checks plus limited parsing available in the browser. If the guard is uncertain, it must reject and fall back.

Alternative considered: strict parse-and-serialize sanitizer in Node.js. This was rejected as over-engineering for MVP because the source allowlist already limits inputs to controlled libraries and because heavy sanitizer dependencies would bloat the CLI.

### Do not persist URL-only documents as final visual truth

`PreviewPayload.centerVisual.svgUrl` is a preview enhancement. If the browser exports an `.omm` document after successfully loading the SVG, the exported document must remain self-contained through an approved center visual representation. If that is not available in the document format implementation, the export should use the deterministic built-in fallback rather than persisting an external URL as final visual truth.

This does not introduce general uploaded image support, Base64 bitmap support, or arbitrary embedded asset support.

## Risks / Trade-offs

* Browser safety guard incompleteness -> Restrict sources with a hardcoded allowlist, reject uncertain responses, and cover unsafe SVG fixtures in tests.
* Controlled source API drift -> Keep the contract generic (`svgUrl`/`iconUrl`) while updating the internal allowlist through CLI releases.
* SVG payload bloat -> Enforce a browser response size cap before rendering.
* Visual mismatch from single-color icons -> Accept as a Phase 1 compromise; long-term visual quality can be improved by AI-generated or template-composed multi-color center visuals.
* Browser fetch latency -> Render fallback quickly and replace it only if the controlled SVG becomes ready.
* Hidden external dependencies inside SVG -> Reject responses that contain external references or CSS URL references.

## Migration Plan

1. Extend the OrganicTree center validation to accept an optional controlled SVG URL field.
2. Add CLI URL shape validation and hardcoded source allowlist checks without network fetch.
3. Add `PreviewPayload.centerVisual.svgUrl` population when the URL is allowed.
4. Update renderer center visual priority so browser-loaded controlled SVG wins over built-in fallback.
5. Add fixture coverage for allowed URL pass-through, unknown source fallback, browser load failure fallback, unsafe SVG guard rejection, and PNG-export-safe rendering.
6. Keep existing inputs without SVG URLs working unchanged.

Rollback is straightforward: ignore the optional URL field and rely entirely on built-in center fallback.

## Open Questions

No blocking open questions for Phase 1. The controlled source allowlist starts as a hardcoded internal list, initially Iconify-compatible HTTPS endpoints.
