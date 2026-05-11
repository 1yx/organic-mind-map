## Context

Organic mind maps are radial: main branches start near the center and diverge. Axis-aligned bounding boxes around diagonal branch paths overlap heavily near that origin, producing false positives even when paths do not visually collide.

The known failing fixture is `fixtures/organic-tree/anthropic-product-team.json`, which currently renders with eight unresolved collision warnings. The goal is zero diagnostics for that valid fixture.

## Goals / Non-Goals

**Goals:**
- Suppress false positives caused by expected same-origin or same-side radial divergence.
- Keep diagnostics for genuine visual overlaps outside the origin region.
- Add deterministic tests that assert zero diagnostics for the target fixture.

**Non-Goals:**
- Do not replace the renderer with oriented bounding boxes or segment/bezier intersection.
- Do not add browser automation solely for this verification.
- Do not make the Web UI hide diagnostics; fix renderer diagnostics instead.
- Do not further reduce fixture content to mask the issue.

## Decisions

- Use origin-aware collision filtering before reporting unresolved collisions.
  - Rationale: the false positives are localized to radial branches that share or nearly share an origin region. Filtering those cases is lower risk than replacing all collision geometry.
  - Alternative rejected: increasing AABB shrink padding, because the remaining overlaps are too large.
  - Alternative deferred: OBB or segment-based detection, because they are broader changes than this fixture-driven fix needs.

- Keep filtering conservative and data-driven.
  - Rationale: a broad "skip all same-side branches" rule can hide real dense-layout collisions. The implementation should consider branch ownership, root branch/side, and whether the overlap is explained by the shared-origin region.

- Verify with renderer-level tests.
  - Rationale: renderer diagnostics are produced before the Web page displays them, so structural render tests are sufficient for the acceptance target.

## Risks / Trade-offs

- [Risk] Filtering can hide a genuine collision in a dense same-side tree. -> Mitigation: only filter overlaps attributable to shared-origin radial divergence and keep existing stress fixture diagnostics checks.
- [Risk] The target fixture passes but a marker/text overlap remains possible. -> Mitigation: tests should assert branch/text/marker elements still render and diagnostics are empty for the target fixture.
