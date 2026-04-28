# ai-svg-center-visual Design

## Context

The MVP pipeline starts from an Agent CLI skill that produces an OrganicTree JSON document, then the project CLI validates the input and hands a `PreviewPayload` to the local browser preview. The browser owns deterministic domain instantiation, layout, `.omm` export, and PNG export.

Buzan-style maps need a meaningful center image. Phase 1 already supports deterministic built-in center visual fallback in the browser, but an AI-selected SVG can make the center more semantically relevant without adding bitmap payload bloat. Direct browser loading of external image URLs is not acceptable because it can taint canvas export, break portability, and expose SVG script risks.

Phase 1 also relaxes the long-term "center image must contain at least three colors" principle for controlled or AI-selected SVG assets. A single-color SVG is acceptable as long as the center remains a real visual symbol, not plain text.

## Goals / Non-Goals

**Goals:**

* Allow the agent contract to carry an optional controlled SVG URL for the center concept.
* Fetch the SVG in the CLI handoff layer before preview startup.
* Sanitize SVG markup before passing it to the browser.
* Inline sanitized SVG in `PreviewPayload.centerVisual.inlineSvg`.
* Prefer inline SVG in the renderer, then fall back to deterministic built-in center visuals.
* Keep PNG export free of external image and CORS dependencies.
* Treat fetch or sanitization failure as non-fatal and keep preview startup working with fallback.

**Non-Goals:**

* No arbitrary web image URLs in Phase 1.
* No AI bitmap generation or Base64 bitmap embedding.
* No CLI-side PNG export.
* No filesystem image cache.
* No full icon search UI in the Web preview.
* No strict three-color enforcement for Phase 1 AI-selected SVGs.

## Decisions

### Use controlled SVG URLs, not arbitrary images

`organic-tree-contract` will accept an optional center SVG URL field such as `center.svgUrl` or `center.iconUrl`. The accepted source set is intentionally narrow: HTTPS URLs from a configured controlled vector source, initially Iconify-compatible endpoints or another explicit allowlist.

Alternative considered: allow any image URL. This was rejected because arbitrary URLs make quality, CORS, portability, and security unpredictable.

### Fetch in CLI, render inline in browser

The CLI handoff layer will fetch SVG text with Node `fetch`, sanitize it, and attach the sanitized string to `PreviewPayload.centerVisual.inlineSvg`.

This keeps the browser renderer self-contained: it renders inline SVG markup instead of loading external resources. The CLI still does not create final node IDs, colors, layout coordinates, `.omm` layout snapshots, or PNG output.

Alternative considered: let the browser fetch the SVG. This was rejected because browser fetch and image drawing can break PNG export through CORS and leaves preview behavior dependent on external availability.

### Fail closed into deterministic fallback

Malformed URLs, non-allowlisted hosts, fetch timeouts, oversized responses, non-SVG content, and sanitizer rejection will not abort the preview command after OrganicTree validation has succeeded. The CLI will omit `inlineSvg`, attach a diagnostic where the current payload/error model supports it, and the browser will use its deterministic built-in fallback selected from the OrganicTree content hash.

Alternative considered: fail the command when the SVG cannot be fetched. This was rejected because the center SVG is a quality enhancement, while local preview remains useful with built-in fallback.

### Keep sanitizer small and strict

The sanitizer should parse and serialize SVG, preserving safe structural and shape elements while removing active or external behavior. It must reject or strip at least:

* `<script>`, `<foreignObject>`, and unknown executable content.
* Event handler attributes such as `onclick`.
* External `href` / `xlink:href` references.
* CSS `url(...)` references.
* Embedded raster or data URL images.

It should preserve safe SVG primitives such as `svg`, `g`, `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon`, `title`, `desc`, `defs`, `linearGradient`, `radialGradient`, `stop`, and safe presentation attributes.

Alternative considered: regex-only stripping. This was rejected because SVG is XML-like markup and regex-only handling is too fragile for security-sensitive cleanup.

### Store inline SVG as center visual content, not as general uploaded asset support

`PreviewPayload.centerVisual.inlineSvg` is a specialized Phase 1 center visual path. If the browser exports an `.omm` document from this preview, the sanitized inline SVG may be persisted as the document's center visual payload or equivalent center-only asset reference.

This does not introduce general uploaded image support, Base64 bitmap support, or arbitrary embedded asset support.

## Risks / Trade-offs

* Sanitizer incompleteness -> Use a strict allowlist, reject uncertain markup, and cover unsafe SVG fixtures in tests.
* Controlled source API drift -> Keep the contract generic (`svgUrl`/`iconUrl`) while making the CLI allowlist configurable and testable.
* SVG payload bloat -> Enforce a response size cap before sanitization.
* Visual mismatch from single-color icons -> Accept as a Phase 1 compromise; long-term visual quality can be improved by AI-generated or template-composed multi-color center visuals.
* Fetch latency -> Apply a short timeout and fallback without blocking preview indefinitely.
* Hidden external dependencies inside sanitized SVG -> Strip external references and CSS URL references before rendering or export.

## Migration Plan

1. Extend the OrganicTree center validation to accept an optional controlled SVG URL field.
2. Add CLI fetch, timeout, size limit, source allowlist, and sanitizer utilities.
3. Add `PreviewPayload.centerVisual.inlineSvg` population when sanitization succeeds.
4. Update renderer center visual priority so inline SVG wins over built-in fallback.
5. Add fixture coverage for success, unsafe SVG rejection, unknown source fallback, fetch failure fallback, and PNG-export-safe rendering.
6. Keep existing inputs without SVG URLs working unchanged.

Rollback is straightforward: ignore the optional URL field and rely entirely on built-in center fallback.

## Open Questions

No blocking open questions for Phase 1. The exact controlled source allowlist can start with Iconify-compatible HTTPS endpoints and remain configurable in code.
