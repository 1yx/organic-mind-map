# Organic Mind Map

Open-source Buzan-style organic mind map tool.

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
  core/     @omm/core     — Document types, validation, assets, paper specs
  renderer/ @omm/renderer — SVG layout, rendering, measurement
  cli/      @omm/cli      — Command parsing, file I/O, server, orchestration
  web/      @omm/web      — Vue 3 read-only preview app
fixtures/
  agent-list/             — Agent list JSON examples
  omm/                    — .omm document examples
```

### Dependency Direction

```
@omm/core → (no app dependencies)
@omm/renderer → @omm/core
@omm/cli → @omm/core
@omm/web → @omm/core, @omm/renderer
```
