## 1. Web SVG Resolution

- [x] 1.1 Implement `center.svgUrl` HTTPS host/path allowlist checks in Web.
- [x] 1.2 Implement bounded fetch with timeout, size, and response checks.
- [x] 1.3 Implement DOMParser-based SVG element and attribute whitelist validation.
- [x] 1.4 Store resolved safe inline SVG content or deterministic fallback in preview state.

## 2. Render And Export

- [x] 2.1 Pass only resolved safe center content or fallback to the renderer.
- [x] 2.2 Update PNG export preprocessing to avoid uncontrolled external center references.
- [x] 2.3 Ensure `.omm` export does not persist external `svgUrl` as final visual truth.

## 3. Fixtures And Tests

- [x] 3.1 Add tests for allowlisted safe SVG rendering.
- [x] 3.2 Add poison tests for unsafe protocol, unsafe SVG contents, timeout, and 404 fallback.
- [x] 3.3 Add PNG export readiness/fallback tests for center visual state.
