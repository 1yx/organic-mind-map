# ai-svg-center-visual

## Summary

Enhance the MVP pipeline to support AI-selected SVG center visuals without making the CLI heavy. The Agent CLI skill will query a controlled vector library (e.g., Iconify) for a relevant SVG URL, the project CLI (`cli-preview-handoff`) will preserve that allowed URL in the `PreviewPayload`, and the browser renderer will asynchronously load it or fall back to a deterministic built-in center visual.

## Why

The Buzan Organic Mind Map method demands a highly relevant central image to anchor memory. While the MVP provides fallback built-in templates selected deterministically in the browser from the OrganicTree content hash, an AI-selected SVG that semantically matches the map's topic significantly enhances the user experience.

Phase 1 deliberately relaxes the long-term "center image must contain at least three colors" rule for AI-selected SVGs, because most open vector-library icons are single-color. The center still must be an actual SVG image or visual symbol, not plain text.

However, allowing arbitrary external images would introduce three critical issues:
1. **Tainted Canvas (CORS)**: Drawing uncontrolled external images onto an HTML `<canvas>` for PNG export can fail due to browser security policies.
2. **Link Rot**: External URLs can break over time if they are persisted as document truth.
3. **XSS Risk**: Uncontrolled SVGs can contain malicious markup.

Phase 1 avoids a heavy Node.js sanitizer and preserves the lightweight CLI boundary. The CLI only accepts URLs from a small hardcoded allowlist and does not fetch, parse, sanitize, cache, or inline SVG. The browser owns asynchronous loading, a lightweight safety guard for controlled SVG responses, render fallback, and export readiness.

## What Changes

* **`organic-tree-contract` Update**: Add an optional `iconUrl` or `svgUrl` field to the `AgentCenter` interface, instructing the LLM to search a controlled open-source SVG library (e.g., Iconify API) for a relevant vector graphic.
* **`cli-preview-handoff` Enhancement**:
  * Check whether the optional center URL is syntactically valid HTTPS and belongs to the hardcoded controlled source allowlist.
  * If valid, pass the URL through in `PreviewPayload.centerVisual.svgUrl`.
  * If invalid or not allowlisted, omit the URL and let the browser use deterministic built-in template selection.
  * Do not fetch, sanitize, cache, or inline SVG in the CLI.
* **Browser Renderer Update**: Update center visual rendering to prioritize a controlled `svgUrl` when present. The browser fetches the SVG asynchronously, applies a lightweight guard for obvious unsafe content, renders it inline when safe, and falls back to the deterministic built-in template if loading fails.

## Non-goals

* No support for AI generation of complex, multi-megabyte bitmap images (e.g., Midjourney/DALL-E PNGs) in Phase 1, as this causes Base64 JSON bloat.
* No support for arbitrary, uncontrolled web image URLs.
* No strict Node.js SVG parsing or DOMPurify/jsdom-style sanitization in the CLI.
* The CLI will not fetch, sanitize, inline, or store images.

## Acceptance Criteria

* The `organic-tree-contract` accepts an optional external SVG URL.
* The `cli-preview-handoff` command preserves an allowlisted HTTPS SVG URL in `PreviewPayload.centerVisual.svgUrl` and omits non-allowlisted URLs.
* The browser renderer loads the controlled SVG URL asynchronously and displays it as the center visual when the response passes lightweight safety checks.
* Single-color SVG center visuals are accepted in Phase 1.
* The browser falls back to a deterministic hash-selected built-in template when the SVG request fails, times out, or fails safety checks.
* The CLI preview command remains responsive because it does not perform network image fetches.

## Dependencies

* `organic-tree-contract`
* `cli-preview-handoff`
* `readonly-svg-renderer`
