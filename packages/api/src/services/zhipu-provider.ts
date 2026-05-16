/**
 * Zhipu AI (智谱) LLM provider for outline enrichment.
 *
 * Uses the OpenAI-compatible chat completions API.
 * Only handles LLM tasks; image generation stays on Replicate.
 */
import type { ContentOutline } from "./content-outline";

const ZHIPU_ENDPOINT =
  "https://open.bigmodel.cn/api/coding/paas/v4/chat/completions";

export type ZhipuProvider = {
  enrichOutline(
    outline: ContentOutline,
    locale: string,
  ): Promise<ContentOutline>;
};

export function createZhipuProvider(
  apiKey: string,
  model: string,
): ZhipuProvider {
  return {
    async enrichOutline(outline, locale) {
      const prompt = buildEnrichmentPrompt(outline, locale);
      const response = await fetch(ZHIPU_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a mind map design assistant. Respond ONLY with valid JSON, no markdown fences.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Zhipu API error ${response.status}: ${body}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      return parseEnrichedOutline(text, outline);
    },
  };
}

function buildEnrichmentPrompt(
  outline: ContentOutline,
  locale: string,
): string {
  const branchList = outline.branches
    .map((b) => {
      const subs = b.children.map((c) => `    - ${c.concept}`).join("\n");
      return subs ? `  - ${b.concept}\n${subs}` : `  - ${b.concept}`;
    })
    .join("\n");

  return `Given this content outline in locale "${locale}":

Center: ${outline.center.concept}
Branches:
${branchList}

For each branch and subbranch concept, generate a short English doodlePrompt (3-8 words) describing a simple visual icon or illustration. Also generate a doodlePrompt for the center concept.

Respond ONLY with valid JSON matching this exact shape:
{
  "center": { "doodlePrompt": "..." },
  "branches": [
    { "id": "${outline.branches[0]?.id ?? "branch_001"}", "doodlePrompt": "...", "children": [{ "id": "...", "doodlePrompt": "..." }] }
  ]
}`;
}

function parseEnrichedOutline(
  text: string,
  original: ContentOutline,
): ContentOutline {
  try {
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as ParsedEnrichment;

    const enriched = structuredClone(original);
    if (parsed.center?.doodlePrompt) {
      enriched.center.doodlePrompt = parsed.center.doodlePrompt;
    }

    for (const branchUpdate of parsed.branches ?? []) {
      applyBranchUpdate(enriched, branchUpdate);
    }

    return enriched;
  } catch {
    return original;
  }
}

type BranchUpdate = {
  id?: string;
  doodlePrompt?: string;
  children?: Array<{ id?: string; doodlePrompt?: string }>;
};

type ParsedEnrichment = {
  center?: { doodlePrompt?: string };
  branches?: Array<BranchUpdate>;
};

function applyBranchUpdate(outline: ContentOutline, update: BranchUpdate) {
  const target = outline.branches.find((b) => b.id === update.id);
  if (!target) return;
  if (update.doodlePrompt) target.doodlePrompt = update.doodlePrompt;

  for (const childUpdate of update.children ?? []) {
    const child = target.children.find((c) => c.id === childUpdate.id);
    if (child && childUpdate.doodlePrompt) {
      child.doodlePrompt = childUpdate.doodlePrompt;
    }
  }
}
