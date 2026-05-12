# center-svg-url-boundary Design

## Context

The old `ai-svg-center-visual` path filtered `center.svgUrl` in CLI, wrapped it in `PreviewPayload.centerVisual.svgUrl`, and relied on browser code to fetch and safety-check SVG content. The newer Agent/CLI/Web direction removes `PreviewPayload` and sends validated `OrganicTree` directly to the browser.

That makes `center.svgUrl` visible to Web as raw Agent output. It must be treated as untrusted input:

```text
Agent output
  -> OrganicTree.center.svgUrl
  -> CLI contract validation and capacity checks
  -> /api/document exposes OrganicTree
  -> Web URL gate before fetch
  -> browser fetch with limits
  -> SVG content safety guard
  -> renderer receives safe inline SVG or fallback
  -> .omm/PNG export remains self-contained
```

## Goals / Non-Goals

**Goals:**

* Preserve `center.svgUrl` as an optional untrusted visual hint.
* Keep CLI out of allowlist, network, sanitization, center visual wrapping, and export concerns.
* Gate URLs in Web before any network request.
* Keep pure render calls deterministic and network-free.
* Ensure PNG and `.omm` export never depend on uncontrolled external image elements.

**Non-Goals:**

* No inline SVG in Agent output.
* No CLI image fetching, caching, SVG sanitization, or URL allowlist filtering.
* No user-facing warning panel for center visual fallback in MVP.
* No automatic multi-color recoloring of controlled SVGs.
* No persistence of external `svgUrl` as final `.omm` visual truth.

## Decisions

### Core validation is shape-only for `center.svgUrl`

Core OrganicTree validation rejects non-string `center.svgUrl`, but string values are preserved even when empty, malformed, non-HTTPS, too long, or non-allowlisted. Those string cases are visual hint failures, not semantic contract failures.

### Web owns preview URL gate before fetch

The URL gate checks:

* string is non-empty after trim,
* URL length is within the configured maximum,
* URL parses as HTTPS,
* host and path match a hardcoded controlled-source allowlist pattern.

Rejected values do not trigger network requests and go straight to deterministic built-in fallback.

### Allowlist uses host + path pattern

Host-only allowlisting is too broad for shared CDNs. The MVP allowlist must be narrow enough to avoid arbitrary content paths, especially for hosts such as `cdn.jsdelivr.net`.

### Fetch belongs to Web or browser-only adapter

Browser fetch side effects live in Web or a browser-only adapter. The environment-neutral renderer may provide predicates and content safety helpers, but pure render entry points do not perform network I/O.

### `render()` does not network

`render({ kind: "organic-tree" })` uses deterministic built-in fallback unless Web has already resolved safe inline SVG content and passes it through render options/context. This keeps tests deterministic and prevents hidden network behavior.

### Loaded SVG content is safety-checked

After fetch, loaded SVG content must pass conservative checks before rendering:

* reject script and `foreignObject`,
* reject event handler attributes,
* reject external `href` / `xlink:href`,
* reject CSS `url(...)`,
* reject embedded raster/data image references,
* reject non-SVG and oversized responses.

MVP uses a 10 second timeout and 64KB max response size.

The primary safety algorithm should parse SVG text with `DOMParser` as SVG/XML, then traverse the parsed tree against an explicit allowlist of SVG elements and attributes. Regex checks are acceptable only as a coarse preflight or supplemental guard, not as the main sanitizer.

### Exports are self-contained

PNG export uses the already loaded safe inline SVG or fallback. Browser-exported `.omm` stores a self-contained approved center visual or deterministic built-in fallback; it does not depend on an external `svgUrl` to reopen correctly.

## Risks / Trade-offs

* **Risk: Web code accidentally fetches before allowlist gate.** -> Keep one tested URL-gate helper and require Web to call it before loader.
* **Risk: Allowlist patterns become too broad.** -> Use host + path patterns and tests for rejected CDN paths.
* **Risk: Renderer/Web boundary gets blurry.** -> Keep `render()` network-free and push browser fetch into Web or browser-only adapter.
* **Risk: Users do not know their chosen SVG failed.** -> MVP uses silent deterministic fallback plus diagnostics only.
* **Risk: Safe SVG checks reject some valid vector content.** -> Prefer false negatives over unsafe rendering in Phase 1.
* **Risk: Regex SVG checks miss bypasses.** -> Use `DOMParser` traversal with explicit element and attribute allowlists as the primary safety algorithm.

## Open Questions

No open questions remain for MVP. The decisions are recorded in `decisions.md`.
