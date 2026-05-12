## 1. Type And Handoff Cleanup

- [x] 1.1 Remove active `PreviewPayload` types and exports.
- [x] 1.2 Update CLI preview handoff and `/api/document` tests to use OrganicTree directly.
- [x] 1.3 Update Web document loading to treat Agent preview data as OrganicTree.

## 2. Renderer Cleanup

- [x] 2.1 Remove `preview-payload` from renderer input discriminators.
- [x] 2.2 Update renderer tests and fixtures to call `render({ kind: "organic-tree", tree })`.

## 3. Verification

- [x] 3.1 Search active source, tests, fixtures, and docs for stale `PreviewPayload` usage.
- [x] 3.2 Run focused typecheck and preview fixture tests.
