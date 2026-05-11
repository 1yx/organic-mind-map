## 1. Collision Filtering

- [x] 1.1 Add the minimum branch ownership/root-side data needed to identify radial shared-origin collision pairs.
- [x] 1.2 Update collision detection to skip only AABB overlaps explained by valid shared-origin radial divergence.
- [x] 1.3 Keep existing parent-child, sibling, text, marker, and center collision behavior intact.

## 2. Fixture Coverage

- [x] 2.1 Add or keep `fixtures/organic-tree/anthropic-product-team.json` as a valid OrganicTree fixture.
- [x] 2.2 Add renderer smoke coverage asserting the fixture renders with zero diagnostics.
- [x] 2.3 Ensure existing branch visual hint and stress fixture tests still pass.

## 3. Verification

- [x] 3.1 Run `pnpm -w run lint`.
- [x] 3.2 Run `pnpm -w run test`.
- [x] 3.3 Manually verify the Web preview for `anthropic-product-team.json` shows no Diagnostics section.
- [x] 3.4 Use Playwright to monitor the Web preview and verify it renders non-empty content.
- [x] 3.5 Use Playwright to verify the SVG scales to the visible `.svg-container` dimensions.
- [x] 3.6 Use Playwright screenshot review to verify the center visual renders at the intended size.
- [x] 3.7 Use Playwright screenshot review to verify secondary branch labels are not anchored at the branch origin.
