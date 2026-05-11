## Why

Phase 1 allows an untrusted `center.svgUrl` hint, but Web must gate, load, sanitize, fallback, and export safely. This change implements that flow without moving network or SVG safety work into the CLI.

## What Changes

- Add Web-side HTTPS host/path allowlist checking before fetch.
- Add bounded SVG fetch with timeout/size checks and DOMParser whitelist validation.
- Use deterministic built-in center fallback on any rejection or failure.
- Ensure PNG and `.omm` export use safe inline SVG content or fallback, never uncontrolled external image drawing.

## Capabilities

### New Capabilities

### Modified Capabilities
- `ai-svg-center-visual`: Implement safe browser loading and fallback for controlled center SVG URLs.
- `png-export`: Ensure PNG export uses export-safe center visual content.

## Impact

- Affects Web center visual loading, renderer center visual input, export preprocessing, PNG export tests, and poison fixtures.
- No CLI fetching, caching, sanitization, or URL filtering.
