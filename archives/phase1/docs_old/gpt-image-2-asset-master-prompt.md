# GPT-Image-2 Asset Master Prompt

> Updated: 2026-05-04

This prompt is for generating a hand-drawn organic mind map asset master that can be processed into editable canvas layers.

It follows the conclusion in `docs/gpt-image-2-hex-color-fidelity.md`: GPT-Image-2 should not be treated as a pixel-exact HEX mask generator. The prompt still uses marker colors as strong visual anchors, but the downstream pipeline must extract them by tolerant color ranges and normalize them with Canvas post-processing.

## Prompt

```text
Create a transparent-background asset extraction master image for an editable canvas reconstruction pipeline.

This is NOT final user-facing artwork.
This is a clean layer-separation master for later Canvas post-processing.
Prioritize separable visual layers over beauty.

Use the attached reference image only for:
- organic mind map composition
- hand-drawn branch rhythm
- spacious Buzan-style layout
- simple doodle illustration style

Do not copy the reference image exactly.

CONTENT STRUCTURE

Title:
How Anthropic's Product Team Moves

Center:
Anthropic 产品之道

Branches:
1. 极速交付
   - 研究预览
   - 跨职能
2. PM 角色
   - 产品品味
   - 角色融合
3. 产品矩阵
   - CLI·Desktop
   - Mobile
4. 使命聚焦
   - 安全AGI
   - 组织优先
5. 团队文化
   - 偏向行动
   - 移除旧功能
6. AI 实践
   - 自动化
   - EVALS

CANVAS

- Landscape composition.
- Transparent background.
- No paper texture.
- No checkerboard background.
- No shadows.
- No gradients.
- No glow.
- No blur.
- No background decorations.
- Keep generous whitespace around every element.

LAYER MARKING STRATEGY

The exact HEX values below are target marker colors for later extraction.
They do not need to be pixel-perfect, but they must be visually extreme, flat, saturated, and clearly separated from all illustration colors.

Branches:
- Draw all branch strokes as bright saturated hot magenta, target color #FF00FF.
- Use a flat marker-like fill.
- Do not add black outlines to branches.
- Do not add grey outlines to branches.
- Do not add shadows to branches.
- Do not add texture to branches.
- Do not add gradients to branches.
- Optional branch edge accents may use bright saturated cyan, target color #00FFFF.
- Use cyan only for branch edge accents, never for illustrations.

Text:
- Draw all text as bright saturated pure green, target color #00FF00.
- This includes the title, center text, main branch labels, and child labels.
- Use a clean handwritten marker style.
- Do not add black outlines to text.
- Do not add grey outlines to text.
- Do not add shadows to text.
- Do not add texture to text.
- Do not add gradients to text.
- Do not make text look like normal black handwriting.

Illustrations:
- Never use magenta, cyan, or bright pure green in illustrations.
- Avoid any color close to the branch/text marker colors.
- Do not use neon green, lime green, turquoise, cyan, bright blue-green, hot pink, purple-magenta, or fluorescent pink inside illustrations.
- Use natural muted illustration colors only, such as yellow, orange, red, brown, beige, grey, black, navy, muted blue, and muted pastel colors.
- Black outlines are allowed only inside illustrations and center card drawing.
- Keep illustration colors visually far away from branch/text marker colors so tolerant color thresholding can separate them.

CENTER

- Draw a yellow hand-drawn card in the center.
- Put the exact center text inside the card:
  Anthropic 产品之道
- Center text must follow the same text marker rule: bright saturated green, target color #00FF00.
- The card may use yellow fill and a black sketch outline.
- The card must not use magenta or cyan.
- The card must not use bright pure green except for the center text.

COMPOSITION

- Six main branches radiate organically from the center.
- Main branches should be thick near the center and taper outward.
- Child branches should grow from positions along the parent branch, not all from the branch endpoint.
- Branch terminal directions should stay mostly horizontal for readability.
- Avoid steep vertical branch endings.
- Preserve readable spacing between branches, labels, and illustrations.
- Each main branch must have exactly two child concepts.
- Place one small semantic illustration near each child concept.
- Keep every illustration visually self-contained and crop-friendly.

ILLUSTRATION REQUIREMENTS

Create exactly one small illustration for each child concept:

研究预览:
- magnifying glass and preview window

跨职能:
- small cross-functional team with small neutral-colored icons

产品品味:
- person thinking about a gem or quality symbol

角色融合:
- overlapping circles / Venn diagram
- do not use green, cyan, or magenta for the circles

CLI·Desktop:
- terminal window and desktop window

Mobile:
- phone app screen

安全AGI:
- shield, robot, lock

组织优先:
- group of people and checklist
- checklist ticks must not be green

偏向行动:
- running person or action arrow

移除旧功能:
- trash bin, scissors, removed feature block

自动化:
- friendly robot and gear

EVALS:
- checklist and chart
- chart bars and checklist ticks must not be green, cyan, or magenta

TEXT RULES

- Text must be legible.
- Keep Chinese text exactly as provided.
- Keep English text exactly as provided.
- Do not invent extra labels.
- Do not omit any listed labels.
- Do not merge child labels.
- Do not add paragraphs.
- Do not add explanatory text.
- Do not add captions.

EXTRACTION-FRIENDLY RULES

- Keep illustrations separated from branches and text by visible transparent gaps.
- Do not draw branch strokes through illustrations.
- Do not overlap text with illustrations.
- Do not let branch strokes touch illustrations.
- Do not let text touch illustrations.
- Keep every illustration isolated enough to crop by bounding box.
- Keep branch and text layers visually simple, flat, and machine-maskable.
- Prefer clean color regions over painterly effects.

FINAL OUTPUT CHECK

Before finalizing, verify:
- Background is transparent.
- Branches are visually bright magenta, with optional cyan edge accents only.
- Text is visually bright green only.
- Text has no black outline, no shadow, and no texture.
- Branches have no black outline, no shadow, and no texture.
- Illustrations avoid magenta, cyan, bright green, neon green, turquoise, and hot pink.
- All six main branches are present.
- All twelve child concepts are present.
- Each child concept has one nearby illustration.
```

## Post-Processing Assumption

The generated image should be processed by Canvas with tolerant color extraction:

- branch mask: high-saturation magenta range, then normalize to exact branch color;
- branch accent mask: high-saturation cyan range, then normalize or merge as needed;
- text mask: high-saturation green range, then either remove, preserve as bitmap text, or replace with editable text from YAML;
- illustration layer: source image minus detected branch and text masks, with manual or vision-assisted cleanup for edge cases.

Do not rely on exact pixel equality against `#FF00FF`, `#00FFFF`, or `#00FF00`.
