// Standalone script to test outline -> LLM enrichment -> image generation.
//
// Usage:
//   pnpm --filter @omm/api exec tsx src/scripts/test-image-gen.ts
import "dotenv/config";
import { loadConfig } from "../config/index";
import { createReplicateProvider } from "../services/replicate-provider";
import type { ContentOutline } from "../services/content-outline";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const outline: ContentOutline = {
  schema: "omm.content_outline",
  version: 1,
  center: { id: "center", concept: "Water Cycle" },
  branches: [
    {
      id: "branch_001",
      class: "branch",
      concept: "Evaporation",
      children: [
        {
          id: "branch_001_001",
          class: "subbranch",
          concept: "Sun heats water",
          children: [],
        },
        {
          id: "branch_001_002",
          class: "subbranch",
          concept: "Water turns to vapor",
          children: [],
        },
      ],
    },
    {
      id: "branch_002",
      class: "branch",
      concept: "Condensation",
      children: [
        {
          id: "branch_002_001",
          class: "subbranch",
          concept: "Vapor rises and cools",
          children: [],
        },
        {
          id: "branch_002_002",
          class: "subbranch",
          concept: "Forms clouds",
          children: [],
        },
      ],
    },
    {
      id: "branch_003",
      class: "branch",
      concept: "Precipitation",
      children: [
        {
          id: "branch_003_001",
          class: "subbranch",
          concept: "Clouds release rain",
          children: [],
        },
        {
          id: "branch_003_002",
          class: "subbranch",
          concept: "Water returns to ground",
          children: [],
        },
      ],
    },
  ],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function retryOnRateLimit<T>(
  fn: () => Promise<T>,
  retries = 3,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("429") && i < retries - 1) {
        const wait = 10000 * (i + 1);
        console.warn(
          `Rate limited, waiting ${wait / 1000}s (attempt ${i + 1}/${retries})...`,
        );
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}

async function rawApiTest(config: ReturnType<typeof loadConfig>) {
  const prompt = `Organic hand-drawn mind map about "Water Cycle" with branches: Evaporation, Condensation, Precipitation. Style: handdrawn-organic. Colorful organic curved branches radiating from center, small doodle illustrations near branch tips. High quality illustration.`;
  console.log("\n--- Raw Replicate API call ---");
  console.log("Model:", config.models.imageModel);

  const createRes = await fetch(
    `https://api.replicate.com/v1/models/${config.models.imageModel}/predictions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.models.apiToken}`,
      },
      body: JSON.stringify({ input: { prompt } }),
    },
  );
  const prediction = (await createRes.json()) as {
    id?: string;
    status?: string;
    output?: unknown;
    error?: string;
    urls?: { get?: string };
  };
  console.log("Prediction:", JSON.stringify(prediction).slice(0, 500));

  if (prediction.urls?.get) {
    for (let i = 0; i < 30; i++) {
      await sleep(2000);
      const pollRes = await fetch(prediction.urls.get, {
        headers: { Authorization: `Bearer ${config.models.apiToken}` },
      });
      const polled = (await pollRes.json()) as {
        status?: string;
        output?: unknown;
        error?: string;
      };
      console.log(
        `Poll ${i + 1}: status=${polled.status}, output=${JSON.stringify(polled.output).slice(0, 200)}`,
      );
      if (polled.status === "succeeded" || polled.status === "failed") {
        console.log("Final output:", JSON.stringify(polled.output));
        break;
      }
    }
  }
}

async function main() {
  const config = loadConfig();
  const provider = createReplicateProvider(config.models);

  console.log("--- Image generation ---");
  console.log("Model:", config.models.imageModel);
  console.log("Center:", outline.center.concept);
  console.log("Branches:", outline.branches.map((b) => b.concept).join(", "));

  await rawApiTest(config);

  const { imageUrl } = await retryOnRateLimit(() =>
    provider.generateReferenceImage(outline, "handdrawn-organic"),
  );
  console.log("Image URL:", imageUrl);

  console.log("\n--- Download reference image ---");
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const outPath = join(process.cwd(), ".omm-storage", "test-reference.png");
  writeFileSync(outPath, buffer);
  console.log("Saved to:", outPath);
  console.log("Size:", buffer.length, "bytes");

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
