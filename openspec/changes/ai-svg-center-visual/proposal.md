# ai-svg-center-visual

## Summary

Enhance the MVP pipeline to support AI-selected, secure, and self-contained SVG center visuals. The Agent CLI skill will query a controlled vector library (e.g., Iconify) for a relevant SVG URL, and the project CLI (`cli-preview-handoff`) will fetch, sanitize, and inline the SVG string into the `PreviewPayload` before handing it to the browser.

## Why

The Buzan Organic Mind Map method demands a highly relevant central image to anchor memory. While the MVP provides fallback built-in templates selected deterministically in the browser from the OrganicTree content hash, an AI-selected SVG that semantically matches the map's topic significantly enhances the user experience.

Phase 1 deliberately relaxes the long-term "center image must contain at least three colors" rule for AI-selected SVGs, because most open vector-library icons are single-color. The center still must be an actual SVG image or visual symbol, not plain text.

However, directly passing an external image URL to the browser introduces three critical issues:
1. **Tainted Canvas (CORS)**: Drawing an external image onto an HTML `<canvas>` for PNG export fails due to strict browser security policies.
2. **Link Rot**: External URLs break over time, violating the `.omm` file's atomic, self-contained portability requirement.
3. **XSS Risk**: Unsanitized external SVGs can contain malicious `<script>` tags.

By having the CLI (Node.js) fetch the SVG server-side and inline the raw, sanitized `<svg>` markup into the payload, we bypass CORS, eliminate link rot, guarantee PNG exportability, and maintain the lightweight nature of `.omm` files (since SVG text is tiny compared to Base64 bitmaps).

## What Changes

* **`organic-tree-contract` Update**: Add an optional `iconUrl` or `svgUrl` field to the `AgentCenter` interface, instructing the LLM to search a controlled open-source SVG library (e.g., Iconify API) for a relevant vector graphic.
* **`cli-preview-handoff` Enhancement**:
  * Introduce an asynchronous step during validation to check if the `OrganicTree` center contains an `iconUrl`.
  * If present, use Node's `fetch` (which is not subject to browser CORS) to download the SVG content.
  * Implement a lightweight sanitization step to strip dangerous tags (like `<script>`) from the SVG string.
  * Inline the sanitized SVG string directly into the `PreviewPayload` (e.g., `centerVisual.inlineSvg`).
  * If the fetch fails or times out, omit `inlineSvg` and let the browser gracefully fallback to deterministic built-in template selection.
* **`omm-document-format` & Browser Renderer Update**: Update the center visual rendering logic to prioritize displaying the `inlineSvg` string natively in the DOM if provided, ensuring seamless PNG export. If no inline SVG is provided, the browser uses the same stable OrganicTree content hash used for `organicSeed` derivation to choose a built-in template.

## Non-goals

* No support for AI generation of complex, multi-megabyte bitmap images (e.g., Midjourney/DALL-E PNGs) in Phase 1, as this causes Base64 JSON bloat.
* No support for arbitrary, uncontrolled web image URLs (to mitigate quality and extreme XSS risks).
* The CLI will not store images to the local filesystem; it merely passes the inlined string to the browser payload in memory.

## Acceptance Criteria

* The `organic-tree-contract` accepts an optional external SVG URL.
* The `cli-preview-handoff` command successfully fetches the SVG from the provided URL, strips any malicious script tags, and places the raw `<svg>` string into the `PreviewPayload`.
* The browser renderer displays the inlined SVG at the center of the mind map when `PreviewPayload.centerVisual.inlineSvg` is present.
* Single-color SVG center visuals are accepted in Phase 1.
* The user can successfully export a PNG containing the AI-selected SVG without triggering Canvas CORS (Tainted Canvas) errors.
* If the SVG fetch fails, `cli-preview-handoff` still hands off a valid `PreviewPayload`, and the browser gracefully falls back to a deterministic hash-selected built-in template without crashing the preview.

## Dependencies

* `organic-tree-contract`
* `cli-preview-handoff`
* `05-readonly-svg-renderer`
