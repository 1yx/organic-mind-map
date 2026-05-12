# project-scaffold Spec Delta

## ADDED Requirements

### Requirement: TypeScript MVP Workspace

The project SHALL provide a TypeScript workspace capable of hosting the Phase 1 MVP pipeline modules without requiring visual editing features.

#### Scenario: Developer installs and checks the project

Given a fresh checkout of the repository
When the developer installs dependencies and runs the typecheck command
Then TypeScript validation succeeds without requiring generated application artifacts.

#### Scenario: Developer builds the scaffold

Given the project scaffold exists
When the developer runs the build command
Then the core, CLI, renderer, and Web preview entrypoints compile successfully.

### Requirement: Module Boundaries

The project SHALL separate shared core logic, CLI commands, renderer code, and Web preview code into distinct source areas.

#### Scenario: Core remains environment-neutral

Given core code is imported by CLI, renderer, and Web preview modules
When the core module is compiled
Then it does not import Node-only CLI modules, browser-only Web modules, or renderer application modules.

#### Scenario: Renderer depends on core only

Given the renderer needs document types and shared utilities
When renderer modules import shared code
Then they import through core public entrypoints and do not depend on CLI command parsing.

### Requirement: Placeholder CLI

The project SHALL provide a placeholder CLI entrypoint that can be invoked locally.

#### Scenario: CLI command runs

Given dependencies are installed
When the developer invokes the placeholder CLI command
Then the command exits successfully and prints or returns a basic scaffold response.

### Requirement: Placeholder Web Preview

The project SHALL provide a placeholder local Web preview app that can be started during development.

#### Scenario: Web preview starts

Given dependencies are installed
When the developer runs the Web preview development command
Then a local Web server starts and serves a placeholder read-only preview page.

### Requirement: MVP Scope Guard

The scaffold SHALL avoid introducing visual editor state or interactions in Phase 1.

#### Scenario: Editor features are absent

Given the scaffold is implemented
When source modules are inspected
Then there are no drag/drop handlers, undo stacks, node editing UI, or path text editing UI required for the scaffold to run.

