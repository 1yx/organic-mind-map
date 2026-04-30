# preview-paper-parameter Design

## Context

The current MVP documents and implementation still mix two ideas:

```text
bounded preview surface
  = finite landscape area used by layout

physical paper preset
  = A3/A4, widthMm/heightMm, print semantics
```

For MVP, the product only needs the first idea. The preview should be a finite landscape surface with the familiar square-root-of-two ratio, approximately `1.414:1`. It should not expose A3/A4 as selectable paper sizes, because the project is not solving print setup or physical dimensions yet.

This also keeps `OrganicTree` pure: it remains the Agent-produced semantic tree, not a document, print preset, or layout instruction.

## Goals / Non-Goals

**Goals:**

* Define MVP preview as a single fixed bounded landscape surface ratio.
* Remove paper selection from `OrganicTree`, CLI preview flags, local server handoff, and renderer preview input.
* Keep `.omm` export responsible for recording the final browser-computed surface and layout snapshot.
* Leave a clean path for future ratio presets such as `16:9`.

**Non-Goals:**

* No A3/A4 selection in MVP preview.
* No `--paper` replacement flag.
* No physical millimeter sizing in Agent/CLI/Web preview input.
* No print setup, PDF export, or real-world paper calibration.
* No browser-side visual editing.

## Decisions

### Use a bounded surface, not paper, for MVP preview

MVP preview uses one fixed ratio:

```text
surfaceAspectRatio = sqrt(2) ~= 1.414
surfacePreset = "sqrt2-landscape"
```

The UI may still look like a sheet with a visible boundary, but implementation and docs should avoid saying that MVP preview chooses A3 or A4 paper.

Alternative considered: keep `--paper a3-landscape | a4-landscape`. Rejected because it suggests physical print semantics and puts a preview concern back into CLI input.

### Do not put ratio in OrganicTree

`OrganicTree` remains semantic:

```text
title
center
branches
meta
optional semantic/visual hints
```

It must not contain `paper`, `surface`, `aspectRatio`, coordinates, layout snapshots, or export settings.

Alternative considered: add `OrganicTree.surface`. Rejected because the Agent should not decide presentation surface during semantic extraction.

### Renderer owns default preview surface

When rendering an `OrganicTree`, the renderer/Web path uses the fixed MVP surface. Later phases can add a non-semantic render option such as:

```ts
type SurfacePreset = "sqrt2-landscape" | "16-9"
```

That option belongs to renderer/Web preview state, not `OrganicTree`.

### OmmDocument stores final surface, not MVP paper presets

A browser-exported `.omm` is a finished document with layout. It should store the surface used for that layout so the file can reproduce the same bounded output.

For MVP, this can be modeled as:

```ts
surface: {
  preset: "sqrt2-landscape",
  aspectRatio: number
}
```

The exact type can evolve, but it should not require `widthMm`, `heightMm`, `a3-landscape`, or `a4-landscape`.

## Risks / Trade-offs

* **Risk: Existing docs strongly say A3/A4.** -> Update MVP docs to say fixed bounded landscape surface, and move A3/A4 or print presets out of MVP wording.
* **Risk: Tests currently assert A3/A4 viewBoxes.** -> Replace those assertions with fixed-ratio surface assertions.
* **Risk: Future print export needs physical size.** -> Add print/export-specific physical sizing in a later change instead of polluting MVP preview input.
* **Risk: `paper` terminology remains in CSS/internal variables.** -> Allow UI class names like `paper-surface` temporarily only if behavior is correct, but prefer `surface` naming in public types/specs.
