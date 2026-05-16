/**
 * Replicate AI model provider for outline enrichment and image generation.
 *
 * Wraps the Replicate API client to provide doodlePrompt enrichment
 * and reference image generation through the backend provider boundary.
 */
import Replicate from "replicate";
import type { ModelProviderConfig } from "../config/index";
import type { ContentOutline } from "./content-outline";

/** Type guard that validates a model string has the `owner/name` format. */
function isModelId(value: string): value is `${string}/${string}` {
  return value.includes("/");
}

/** Provider interface for LLM and image generation calls. */
export type ReplicateProvider = {
  /** Enriches a content outline with doodlePrompt suggestions. */
  enrichOutline(
    outline: ContentOutline,
    locale: string,
  ): Promise<ContentOutline>;
  /** Generates a reference mind map image from an enriched outline. */
  generateReferenceImage(
    outline: ContentOutline,
    stylePreset: string,
  ): Promise<{ imageUrl: string }>;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Creates a Replicate provider from the given model configuration. */
export function createReplicateProvider(
  config: ModelProviderConfig,
): ReplicateProvider {
  const client = new Replicate({ auth: config.apiToken });

  async function runWithPolling(
    model: `${string}/${string}`,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    const prediction = await client.predictions.create({ model, input });
    if (!prediction.urls?.get) throw new Error("No polling URL returned");

    for (let i = 0; i < 60; i++) {
      await sleep(2000);
      const res = await fetch(prediction.urls.get, {
        headers: { Authorization: `Bearer ${config.apiToken}` },
      });
      const polled = (await res.json()) as {
        status?: string;
        output?: unknown;
        error?: string;
      };
      if (polled.status === "succeeded") return polled.output;
      if (polled.status === "failed") {
        throw new Error(`Replicate prediction failed: ${polled.error}`);
      }
    }
    throw new Error("Replicate prediction timed out");
  }

  return {
    async enrichOutline(outline, locale) {
      const prompt = buildEnrichmentPrompt(outline, locale);
      const model = config.llmModel;
      if (!isModelId(model)) throw new Error(`Invalid model: ${model}`);
      const output = await runWithPolling(model, { prompt });
      const text = extractTextOutput(output);
      return parseEnrichedOutline(text, outline);
    },

    async generateReferenceImage(outline, stylePreset) {
      const prompt = buildImagePrompt(outline, stylePreset);
      const model = config.imageModel;
      if (!isModelId(model)) throw new Error(`Invalid model: ${model}`);
      const output = await runWithPolling(model, { prompt });
      const urls = extractImageUrls(output);
      if (urls.length === 0) {
        throw new Error("Image model returned no output URLs");
      }
      return { imageUrl: urls[0] };
    },
  };
}

/** Builds an LLM prompt that asks for doodlePrompt enrichment. */
function buildEnrichmentPrompt(
  outline: ContentOutline,
  locale: string,
): string {
  const branchList = outline.branches.map((b) => `  - ${b.concept}`).join("\n");
  return `You are a mind map design assistant. Given this content outline in locale "${locale}":

Center: ${outline.center.concept}
Branches:
${branchList}

For each branch and subbranch concept, generate a short English doodlePrompt (3-8 words) describing a simple visual icon or illustration. Also generate a doodlePrompt for the center concept.

Respond ONLY with valid JSON matching this exact shape, no markdown fences:
{
  "center": { "doodlePrompt": "..." },
  "branches": [
    { "id": "${outline.branches[0]?.id ?? "branch_001"}", "doodlePrompt": "...", "children": [] }
  ]
}`;
}

/** Builds an image generation prompt from an enriched outline. */
function buildImagePrompt(
  outline: ContentOutline,
  stylePreset: string,
): string {
  const concepts = outline.branches.map((b) => b.concept).join(", ");
  return `Organic hand-drawn mind map about "${outline.center.concept}" with branches: ${concepts}. Style: ${stylePreset}. Colorful organic curved branches radiating from center, small doodle illustrations near branch tips. High quality illustration.`;
}

/** Extracts text from various Replicate output formats. */
function extractTextOutput(output: unknown): string {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output.join("");
  return JSON.stringify(output);
}

/** Extracts image URLs from various Replicate output formats. */
function extractImageUrls(output: unknown): string[] {
  if (!output) return [];
  // Single string URL
  if (typeof output === "string") return [output];
  if (!Array.isArray(output)) return [];

  const results: string[] = [];
  for (const item of output) {
    if (typeof item === "string") {
      results.push(item);
    } else if (item && typeof item === "object" && "url" in item) {
      const urlVal = (item as Record<string, unknown>).url;
      if (typeof urlVal === "string") results.push(urlVal);
    }
  }
  return results;
}

/** Merges enriched doodlePrompt data back into the original outline. */
function parseEnrichedOutline(
  text: string,
  original: ContentOutline,
): ContentOutline {
  try {
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as {
      center?: { doodlePrompt?: string };
      branches?: Array<{
        id?: string;
        doodlePrompt?: string;
        children?: unknown[];
      }>;
    };

    const enriched = structuredClone(original);
    if (parsed.center?.doodlePrompt) {
      enriched.center.doodlePrompt = parsed.center.doodlePrompt;
    }

    for (const branchUpdate of parsed.branches ?? []) {
      const target = enriched.branches.find((b) => b.id === branchUpdate.id);
      if (target && branchUpdate.doodlePrompt) {
        target.doodlePrompt = branchUpdate.doodlePrompt;
      }
    }

    return enriched;
  } catch {
    return original;
  }
}
