## ADDED Requirements

### Requirement: Radial branch origin overlaps do not create false collision diagnostics
The renderer SHALL avoid reporting unresolved collision diagnostics for branch path envelope AABB overlaps that are explained by valid radial branches diverging from a shared or near-shared origin.

#### Scenario: Adjacent main branches diverge from center
- **WHEN** two main branches start from the center region and diverge into separate radial sectors without visually crossing
- **THEN** the renderer does not report an `unresolved-collision` diagnostic solely because their axis-aligned path bounding boxes overlap near the center

#### Scenario: Same-side child branches diverge from adjacent parents
- **WHEN** child branches from adjacent same-side main branches have AABB overlap near their inherited branch origins but do not visually cross or crowd at their endpoints
- **THEN** the renderer does not report an `unresolved-collision` diagnostic solely from that origin-region overlap

#### Scenario: Genuine overlap remains diagnostic
- **WHEN** branch text, markers, center visual, or path envelopes overlap outside the shared-origin allowance
- **THEN** the renderer still reports a collision diagnostic
