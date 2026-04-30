# Organic Mind Map

Open-source Buzan-style organic mind map tool.

Organic Mind Map focuses on strict organic mind maps, not generic whiteboards or infinite canvas editing. The Phase 1 MVP is a read-only preview pipeline:

```text
Agent CLI + agent skill
  -> OrganicTree JSON
  -> CLI validation and capacity checks
  -> local Web preview server
  -> browser-side layout and SVG preview
  -> browser-side .omm (OmmDocument) and PNG export
```

For project-specific terminology, see [docs/TERMS.md](docs/TERMS.md).

## Core Terms

- `OrganicTree`: Agent/LLM-produced semantic tree and the CLI preview input contract.
- `OmmDocument`: final `.omm` document exported by the browser with a layout snapshot.
- `organicSeed`: document-level stable seed stored in `OmmDocument`.
- `sqrt2-landscape`: fixed Phase 1 bounded surface ratio for OrganicTree preview.

## Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Install

```bash
pnpm install
```

### Commands

| Script | Description |
|--------|-------------|
| `pnpm typecheck` | Run TypeScript type checking across all packages |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests across all packages |
| `pnpm dev:web` | Start the Web preview dev server (Vite) |
| `pnpm dev:cli` | Run the CLI in development mode |

### Package Structure

```
packages/
  core/     @omm/core     — Document types, validation, assets, surface specs
  renderer/ @omm/renderer — SVG layout, rendering, measurement
  cli/      @omm/cli      — Command parsing, file I/O, server, orchestration
  web/      @omm/web      — Vue 3 read-only preview app
fixtures/
  organic-tree/          — OrganicTree JSON examples
  omm/                   — .omm document examples
```

### Dependency Direction

```
@omm/core → (no app dependencies)
@omm/renderer → @omm/core
@omm/cli → @omm/core
@omm/web → @omm/core, @omm/renderer
```
