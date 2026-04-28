# project-scaffold Design

## Goal

Create a minimal TypeScript workspace that can support the Phase 1 MVP pipeline:

`Agent CLI + skill -> agent list -> CLI validation -> local Web preview -> browser layout -> .omm download/export -> PNG export`

The scaffold must avoid committing to a visual editor architecture too early. Editing modules can be added later, but Phase 1 should keep generation, rendering, and preview concerns separate.

## Architecture

Use a lightweight pnpm workspace monorepo from day one. CLI and Web run in fundamentally different environments, so the scaffold must provide physical package boundaries instead of relying on a single `src/` tree and convention-only imports.

```text
pnpm-workspace.yaml
package.json
tsconfig.base.json
packages/
  core/
    package.json
    tsconfig.json
    src/
      document/
      validation/
      assets/
      index.ts
  renderer/
    package.json
    tsconfig.json
    src/
      layout/
      svg/
      measurement/
      index.ts
  cli/
    package.json
    tsconfig.json
    src/
      commands/
      server/
      index.ts
  web/
    package.json
    tsconfig.json
    vite.config.ts
    src/
      app/
      preview/
      main.ts
fixtures/
  organic-tree/
  omm/
```

The logical dependency direction is:

```text
@omm/cli -> @omm/core
@omm/cli -> @omm/renderer only for optional non-browser utilities
@omm/web -> @omm/core
@omm/web -> @omm/renderer
@omm/renderer -> @omm/core
@omm/core -> no app-layer dependencies
```

`@omm/core` is the shared source of truth for `.omm` types, schema validation, asset handling, paper specs, and deterministic seeds. It must remain environment-neutral and avoid Node-only or browser-only APIs.

`@omm/renderer` consumes validated preview data or `.omm` data and returns SVG-oriented render models or SVG strings/components. It must not depend on CLI command parsing or local server code.

`@omm/cli` handles command parsing, file I/O, capacity validation, local HTTP server startup, and preview orchestration. It can use Node APIs, but those dependencies must not leak into Web packages.

`@omm/web` hosts the Vue 3 read-only preview and later export UI. It runs in the browser and must not import `@omm/cli` or Node-only modules.

## Tooling

Recommended baseline:

* TypeScript strict mode
* pnpm workspaces
* Vite for Web preview
* A CLI entrypoint that can run through `tsx` during development
* Vitest or equivalent for validation and pure renderer utilities
* Minimal formatting/linting if the project already standardizes on it

The scaffold should expose scripts for:

```text
dev:web
dev:cli
build
typecheck
test
```

The package manager is pnpm. The root scripts should delegate to workspace package scripts so each package can keep its own runtime-specific TypeScript configuration.

## Interfaces

The scaffold should define stable internal entrypoints:

```ts
// core
export type { OmmDocument } from "./document/types"
export { validateOmmDocument } from "./validation/omm"

// renderer
export { renderOmmToSvgModel } from "./svg/renderOmmToSvgModel"

// cli
export async function runCli(argv: string[]): Promise<number>
```

The first implementation can return placeholders, but modules should be in the final expected locations to avoid churn.

## Local Preview Communication

The CLI owns the local preview server lifecycle. Running:

```bash
omm preview path/to/input.json
```

starts a lightweight localhost HTTP server. In development, this can be wired through Vite middleware or a proxy. In production, the same CLI package can mount the built Web static assets through a minimal Node server.

The server must expose a read-only document endpoint:

```text
GET /api/document
```

The endpoint returns the current validated agent payload or `.omm` document selected by the CLI process. The Web app loads data with normal `fetch("/api/document")` on startup.

Do not pass large JSON through injected HTML globals, query strings, or environment variables. Do not introduce WebSocket communication in Phase 1; MVP has no live editing or collaborative state that requires a persistent channel.

## Data Flow

Phase 1 final data flow:

```text
Agent CLI + skill
  -> organic-tree.json
  -> cli validate capacity
  -> return retry feedback to Agent CLI if oversized
  -> start localhost HTTP server
  -> GET /api/document exposes preview payload
  -> Vue Web app fetches preview payload
  -> browser text measurement and layout
  -> renderer
  -> SVG preview
  -> .omm download/export
  -> PNG export
```

This change only prepares the places where those steps will live.

## Risks

* Overbuilding workspace tooling before the product has code.
* Mixing renderer and CLI code in a way that makes browser rendering depend on Node APIs.
* Letting the local server become an editing API before Phase 1 needs it.
* Introducing editor concepts into Phase 1.

## Decisions

* Use pnpm workspaces for physical package isolation.
* Keep the scaffold boring and small within that workspace structure.
* `@omm/core` remains environment-neutral.
* `@omm/web` is a Vue 3 browser app and communicates with the CLI server through `GET /api/document`.
* `@omm/cli` owns local HTTP server startup and read-only preview orchestration.
* Web preview is read-only.
* Editor-specific state and command stacks are not part of Phase 1 scaffold.
