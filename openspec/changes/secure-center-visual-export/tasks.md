## 1. Web SVG Resolution

- [ ] 1.1 Implement `center.svgUrl` HTTPS host/path allowlist checks in Web.
- [ ] 1.2 Implement bounded fetch with timeout, size, and response checks.
- [ ] 1.3 Implement DOMParser-based SVG element and attribute whitelist validation.
- [ ] 1.4 Store resolved safe inline SVG content or deterministic fallback in preview state.

## 2. Render And Export

- [ ] 2.1 Pass only resolved safe center content or fallback to the renderer.
- [ ] 2.2 Update PNG export preprocessing to avoid uncontrolled external center references.
- [ ] 2.3 Ensure `.omm` export does not persist external `svgUrl` as final visual truth.

## 3. Fixtures And Tests

- [ ] 3.1 Add tests for allowlisted safe SVG rendering.
- [ ] 3.2 Add poison tests for unsafe protocol, unsafe SVG contents, timeout, and 404 fallback.
- [ ] 3.3 Add PNG export readiness/fallback tests for center visual state.
