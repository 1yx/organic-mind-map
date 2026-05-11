## ADDED Requirements

### Requirement: Standalone hand-drawn branch demo
The system SHALL provide a standalone demo page under `handdraw-branch-demo/` that renders branch-only SVG examples for the hand-drawn organic branch algorithm.

#### Scenario: Demo opens without production app
- **WHEN** the demo HTML file is opened directly or served from a simple local static server
- **THEN** it renders a visible SVG branch composition without requiring the production Web preview app

#### Scenario: Demo stays isolated from production renderer
- **WHEN** the demo is added
- **THEN** production renderer, CLI, `.omm`, and Web preview behavior remain unchanged

### Requirement: Shared skeleton across rendering modes
The hand-drawn branch demo SHALL compute one branch skeleton and render Baseline, Organic, and Jittered modes from that same skeleton.

#### Scenario: Mode switch preserves branch geometry
- **WHEN** the user switches between Baseline, Organic, and Jittered modes
- **THEN** main and child branch positions remain the same while only visual styling changes

### Requirement: Baseline remains traditional
The hand-drawn branch demo SHALL render Baseline as a traditional smooth mind-map branch style rather than as a hand-drawn or jittered variant.

#### Scenario: Baseline uses smooth strokes
- **WHEN** Baseline mode is selected
- **THEN** branches render as smooth colored strokes without variable-width ribbon bodies or edge jitter

### Requirement: Leaf-weight balanced side placement
The hand-drawn branch demo SHALL balance main branches across left and right sides by leaf-node visual weight rather than raw branch count or input order.

#### Scenario: Heavy branch can occupy one side alone
- **WHEN** one main branch has the same leaf weight as multiple lighter main branches combined
- **THEN** the demo may place the heavy branch on one side and the lighter branches on the other side

#### Scenario: Semantic order is preserved in data
- **WHEN** main branches are spatially assigned to left and right sides
- **THEN** the demo does not mutate their semantic input order

#### Scenario: Side-local order remains stable
- **WHEN** multiple semantic branches are assigned to the same side
- **THEN** their relative vertical ordering follows their original semantic order where possible

### Requirement: Horizontal-readable terminal angles
The hand-drawn branch demo SHALL keep branch terminal directions close to horizontal to support future branch text placement.

#### Scenario: Terminal tangent stays within horizontal limit
- **WHEN** a main or child branch is rendered
- **THEN** its terminal tangent is no more than approximately 30 degrees away from horizontal

#### Scenario: Curves remain organic before terminal segment
- **WHEN** a branch terminal tangent is constrained toward horizontal
- **THEN** the branch body can still curve organically between its anchor and terminal segment

### Requirement: Variable-width hand-drawn branch bodies
The demo SHALL render branch bodies as filled variable-width ribbons generated from sampled centerline normals with deterministic edge jitter.

#### Scenario: Branch tapers from root to tip
- **WHEN** a main branch is rendered
- **THEN** its root is visibly wider than its tip

#### Scenario: Branch edges are not perfectly mechanical
- **WHEN** a branch body is rendered
- **THEN** its edges include low-amplitude deterministic irregularity while remaining visually smooth

### Requirement: Child branches split around parent direction
The hand-drawn branch demo SHALL distribute sibling child branches around the parent branch direction using parent-relative normal offsets.

#### Scenario: Two children split above and below
- **WHEN** a parent branch has exactly two child branches
- **THEN** one child is placed on one side of the parent branch and the other child is placed on the opposite side

#### Scenario: Three children include a center continuation
- **WHEN** a parent branch has exactly three child branches
- **THEN** the children are distributed above, near the parent direction, and below

#### Scenario: Dense child set grows along the trunk
- **WHEN** a parent branch has four or more child branches
- **THEN** child anchors are distributed along the parent branch rather than all emerging from one terminal point

#### Scenario: Dense child terminals reserve text room
- **WHEN** a parent branch has four or more child branches
- **THEN** child terminal rows are evenly spread across the available page height and kept inside the paper bounds to reserve horizontal room for future branch text

### Requirement: Playwright visual verification
The demo SHALL include a Playwright-based verification step that opens the demo, captures a screenshot under `.tmp/`, and checks that visible SVG content is present.

#### Scenario: Screenshot is captured
- **WHEN** the verification step runs
- **THEN** it writes a screenshot artifact under `.tmp/`

#### Scenario: SVG is non-empty
- **WHEN** the verification step inspects the demo page
- **THEN** it confirms the page contains a non-empty SVG with visible branch paths
