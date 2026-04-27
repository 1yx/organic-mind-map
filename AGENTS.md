# AGENTS.md

This file gives working instructions for AI coding agents in this repository.

## Project Identity

Organic Mind Map is an open-source, Buzan-style organic mind map tool. The product must stay focused on strict organic mind maps, not generic whiteboards, tree diagrams, or infinite canvas editors.

The current MVP is not a visual editor. The Phase 1 flow is:

```text
Agent CLI + skill
  -> concise agent list
  -> project CLI validation and capacity checks
  -> local Web preview server
  -> browser-side DOM/SVG measurement and layout
  -> read-only SVG preview
  -> .omm and PNG export from the browser
```

Do not add `.omm` visual editing, drag/drop editing, undo/redo, path text editing, presentation playback, cloud sync, accounts, or Plus services to MVP changes unless a change document explicitly asks for it.

## Read First

Before making product or architecture changes, read the relevant files:

1. `docs/GUIDELINES.md` for non-negotiable Buzan product rules.
2. `docs/PRD.md` for product scope and roadmap.
3. `docs/TECH_DESIGN.md` for technical constraints.
4. `docs/BP.md` for Community vs Plus boundaries.
5. `docs/OPEN_QUESTIONS_*.md` for decisions already made.
6. Relevant `openspec/changes/<change>/proposal.md`, `design.md`, `tasks.md`, and `specs/**`.

When a docs decision conflicts with an older OpenSpec proposal, prefer the latest explicit decision in `docs/OPEN_QUESTIONS_*.md`, then update the affected OpenSpec artifacts instead of silently diverging.

## OpenSpec Workflow

This repository uses OpenSpec with `schema: spec-driven`.

For planned work:

- Create or update a change under `openspec/changes/<change-name>/`.
- Keep `proposal.md`, `design.md`, `tasks.md`, and `specs/**` aligned.
- Use concise, implementation-oriented tasks.
- Validate recognized changes with:

```bash
openspec status --change <change-name> --json
```

Current note: the scaffold change is named `project-scaffold` because the OpenSpec CLI does not accept digit-prefixed change names reliably. Some older numeric proposal folders may exist as planning documents.

## Architecture Rules

The intended scaffold is a lightweight pnpm workspace monorepo:

```text
packages/
  core/
  renderer/
  cli/
  web/
fixtures/
```

Package boundaries:

- `@omm/core`: environment-neutral document types, validation, assets, paper specs, seeds.
- `@omm/renderer`: consumes validated data and returns SVG-oriented render models or SVG output. It may depend on `@omm/core`.
- `@omm/cli`: Node-only command parsing, file I/O, capacity checks, local HTTP server startup, preview orchestration.
- `@omm/web`: Vue 3 browser app for read-only preview and browser-side export. It may depend on `@omm/core` and `@omm/renderer`.

Do not import `@omm/cli` from browser code. Do not leak Node-only APIs such as `fs` or `path` into `@omm/web` or environment-neutral `@omm/core`.

The local preview server must expose read-only data through:

```text
GET /api/document
```

The Web app should fetch this endpoint. Do not pass large payloads through injected HTML globals, query strings, or environment variables. Do not add WebSocket communication for Phase 1 unless a later approved change requires live editing.

## Product Invariants

Never break these rules in strict Buzan mode:

- Default paper is A3/A4 landscape with real paper boundaries.
- A map starts from a center visual, not plain center text.
- The center visual must be multi-color; free mode must still be able to produce a compliant center visual using templates, icon collage, multi-color composition, or local upload.
- AI-generated images are Plus efficiency/quality enhancements, not the only path to compliance.
- A branch carries one cognitive concept unit, not paragraphs or sentence-like prose.
- English keywords default to uppercase.
- Branches are organic, curved, tapered, and visually matched to text/image length.
- Main branches use distinct colors as memory/category anchors.
- Layout must preserve readable whitespace and avoid crowding.
- A `.omm` file represents one map on one paper.
- Built-in assets are referenced by stable IDs; user-uploaded custom assets are embedded so the `.omm` opens with images intact.

Important distinction:

- BOI is a content organization concept for main or key branches.
- Node ID is a stable invisible technical identifier.
- Presentation Sequence is a user-defined list of node IDs or steps. It is not BOI and not tree order.

## MVP Boundaries

MVP includes:

- Agent skill list contract.
- CLI contract validation.
- CLI capacity threshold checks with retry-friendly errors for Gemini CLI / Codex CLI / Claude Code.
- Local preview server.
- Browser-side text measurement and layout.
- Read-only SVG preview.
- Browser-side `.omm` and PNG export.

MVP excludes:

- CLI one-shot PNG export.
- Puppeteer, Playwright, or bundled browser dependency in the CLI just for export.
- `.omm` visual editing.
- Drag/drop editing, undo/redo, text editing overlays.
- WebSocket live updates.
- Cloud services, Plus services, accounts, or sync.
- Mobile app.
- Product-internal freeform mode.

If input is too large, the CLI should fail early with actionable capacity errors so the outer Agent CLI can regenerate a shorter concept list. Do not build a complex browser-side warning or scoring panel for this in MVP.

## UI And Frontend Standards

Use Vue 3 with Composition API and TypeScript for Web work. Use Vite for the Web package.

For MVP, the Web app is a read-only preview surface, not a landing page and not an editor. The first screen should show the paper-proportional map preview and practical export controls.

Do not create boxed keyword nodes in the strict organic map. Text belongs on branches, not inside rectangles, pills, or generic cards.

## Testing And Validation

Prefer focused tests that match the change:

- Contract validation tests for agent list input.
- Capacity threshold tests for oversized input.
- Schema validation for `.omm`.
- Deterministic seed/id tests.
- Renderer smoke tests for non-empty SVG, paper viewBox, center visual, and branch elements.

Browser export should remain browser-side. Do not add headless browser automation solely to make the CLI export PNG.

## Documentation Discipline

When a decision changes behavior, update all affected surfaces:

- `docs/PRD.md`
- `docs/TECH_DESIGN.md`
- `docs/BP.md`
- relevant `docs/OPEN_QUESTIONS_*.md`
- relevant `openspec/changes/**`

Keep docs consistent on these terms:

- Use "Agent CLI + agent skill" for orchestration.
- Use "CLI validation and local preview startup", not "CLI generates final layout".
- Use "browser-side layout and export" for final `.omm` and PNG output.

## Editing Guidelines

Keep changes scoped to the requested change. Do not refactor unrelated docs or proposals.

Preserve existing user edits. If the worktree is dirty, assume changes are intentional unless clearly generated by your own work.

Use ASCII unless the file already uses Chinese or another non-ASCII language. Chinese product docs may continue in Chinese.

Do not add speculative features just because they appear in the long-term roadmap. Phase 1 work should stay focused on the validated MVP path.
