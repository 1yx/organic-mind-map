# project-scaffold

## Summary

Set up the Phase 1 MVP project scaffold for a TypeScript-based CLI and local read-only Web preview app.

## Why

The MVP is not a visual editor. It needs a reliable local toolchain that can later host the agent skill contract, `.omm` document model, CLI validation/startup flow, SVG rendering, local preview server, and PNG export. Starting with a clear scaffold prevents later changes from mixing CLI, rendering, and preview concerns.

## What Changes

* Create the TypeScript project structure for shared core code, CLI entrypoints, and Web preview code.
* Add build, typecheck, and development scripts.
* Establish source folders for:
  * `core` document types and utilities
  * `cli` command handlers
  * `web` read-only preview app
  * `renderer` SVG rendering modules
  * `fixtures` sample inputs and expected outputs
* Add baseline linting/formatting or equivalent code quality scripts if supported by the chosen tooling.

## Non-goals

* No `.omm` visual editing.
* No drag/drop, undo/redo, or text editing UI.
* No PNG export implementation yet.
* No AI calls or Plus services.

## Acceptance Criteria

* A developer can install dependencies and run a typecheck/build command.
* A placeholder CLI command can be invoked locally.
* A placeholder local Web preview app can be started.
* The scaffold clearly separates core, CLI, renderer, and Web preview responsibilities.

## Dependencies

None.
