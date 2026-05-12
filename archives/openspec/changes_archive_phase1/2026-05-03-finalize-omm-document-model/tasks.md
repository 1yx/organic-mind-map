## 1. Core Model

- [x] 1.1 Align `@omm/core` Phase 1 `.omm` TypeScript types with the nested document schema.
- [x] 1.2 Update `.omm` validation to require `organicSeed`, `surface`, `rootMap.children`, `layout`, `assets`, and `meta`.
- [x] 1.3 Reject persisted runtime fields including `parentId`, `childIds`, flat `nodes`, and `displayText`.

## 2. Export And Render

- [x] 2.1 Update Web `.omm` export to emit the canonical nested document shape with layout snapshot.
- [x] 2.2 Update renderer `.omm` input handling to read the canonical semantic tree and saved layout.

## 3. Fixtures And Tests

- [x] 3.1 Update valid `.omm` fixtures to the canonical shape.
- [x] 3.2 Add negative validation fixtures for rejected runtime fields.
- [x] 3.3 Run focused core, renderer, and fixture validation tests.
