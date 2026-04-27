# project-scaffold Tasks

## 1. Project Tooling

- [ ] 1.1 Initialize package metadata and select the package manager convention for the repository.
- [ ] 1.2 Add TypeScript configuration with strict mode enabled.
- [ ] 1.3 Add build, typecheck, and test scripts.
- [ ] 1.4 Add a minimal test runner configuration for pure TypeScript modules.

## 2. Source Layout

- [ ] 2.1 Create `src/core/` for document types, validation, assets, paper specs, and seed utilities.
- [ ] 2.2 Create `src/renderer/` for layout, SVG, and measurement modules.
- [ ] 2.3 Create `src/cli/` for command parsing and CLI entrypoints.
- [ ] 2.4 Create `src/web/` for the read-only local preview app.
- [ ] 2.5 Create `src/fixtures/` or top-level `fixtures/` for agent-list and `.omm` examples.

## 3. Placeholder Entrypoints

- [ ] 3.1 Add `src/core/index.ts` exporting placeholder core types/utilities.
- [ ] 3.2 Add `src/renderer/index.ts` exporting a placeholder read-only render function.
- [ ] 3.3 Add `src/cli/index.ts` with a placeholder CLI command.
- [ ] 3.4 Add a minimal Web preview entrypoint that can render a placeholder page.

## 4. Dependency Boundaries

- [ ] 4.1 Ensure `core` has no dependency on CLI, Web, or renderer app layers.
- [ ] 4.2 Ensure `renderer` depends only on `core` and renderer-local utilities.
- [ ] 4.3 Ensure CLI and Web import shared logic through public module entrypoints.

## 5. Verification

- [ ] 5.1 Run typecheck successfully.
- [ ] 5.2 Run build successfully.
- [ ] 5.3 Run the placeholder CLI locally.
- [ ] 5.4 Start the placeholder Web preview locally.
- [ ] 5.5 Document the scaffold commands in a README or equivalent developer note.
