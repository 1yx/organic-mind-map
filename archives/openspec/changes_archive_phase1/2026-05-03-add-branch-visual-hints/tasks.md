## 1. Hint Mapping

- [x] 1.1 Add a small local mapping from supported visual hint strings to built-in marker render data.
- [x] 1.2 Preserve unsupported hints without validation failure or rendering errors.

## 2. Rendering

- [x] 2.1 Render supported branch visual hints as small built-in markers near concept text.
- [x] 2.2 Include marker bounds in branch spacing and collision checks.
- [x] 2.3 Ensure PNG export includes rendered markers as part of the SVG clone.

## 3. Fixtures And Tests

- [x] 3.1 Add an OrganicTree fixture with supported branch visual hints.
- [x] 3.2 Add renderer smoke tests for marker output and unsupported hint fallback.
- [x] 3.3 Run focused OrganicTree validation and renderer tests.
