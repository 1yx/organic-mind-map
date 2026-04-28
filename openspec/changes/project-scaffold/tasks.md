# project-scaffold Tasks

## 1. Project Tooling

- [x] 1.1 Initialize package metadata and select the package manager convention for the repository.
- [x] 1.2 Add TypeScript configuration with strict mode enabled.
- [x] 1.3 Add build, typecheck, and test scripts.
- [x] 1.4 Add a minimal test runner configuration for pure TypeScript modules.

## 2. Source Layout

- [x] 2.1 Create `src/core/` for document types, validation, assets, paper specs, and seed utilities.
- [x] 2.2 Create `src/renderer/` for layout, SVG, and measurement modules.
- [x] 2.3 Create `src/cli/` for command parsing and CLI entrypoints.
- [x] 2.4 Create `src/web/` for the read-only local preview app.
- [x] 2.5 Create `src/fixtures/` or top-level `fixtures/` for organic-tree and `.omm` examples.

## 3. Placeholder Entrypoints

- [x] 3.1 Add `src/core/index.ts` exporting placeholder core types/utilities.
- [x] 3.2 Add `src/renderer/index.ts` exporting a placeholder read-only render function.
- [x] 3.3 Add `src/cli/index.ts` with a placeholder CLI command.
- [x] 3.4 Add a minimal Web preview entrypoint that can render a placeholder page.

## 4. Dependency Boundaries

- [x] 4.1 Ensure `core` has no dependency on CLI, Web, or renderer app layers.
- [x] 4.2 Ensure `renderer` depends only on `core` and renderer-local utilities.
- [x] 4.3 Ensure CLI and Web import shared logic through public module entrypoints.

## 5. Verification

- [x] 5.1 Run typecheck successfully.
- [x] 5.2 Run build successfully.
- [x] 5.3 Run the placeholder CLI locally.
- [x] 5.4 Start the placeholder Web preview locally.
- [x] 5.5 Document the scaffold commands in a README or equivalent developer note.
