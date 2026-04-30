## ADDED Requirements

### Requirement: Renderer rejects legacy preview payload input
The renderer SHALL expose active render inputs for `organic-tree` and `omm-document` only.

#### Scenario: OrganicTree input renders
- **WHEN** a caller invokes `render({ kind: "organic-tree", tree })`
- **THEN** the renderer computes preview layout and returns a render result

#### Scenario: Legacy input is attempted
- **WHEN** active TypeScript code attempts to pass `kind: "preview-payload"` to the renderer
- **THEN** TypeScript compilation fails because the discriminator is not part of `RenderInput`
