// Test Zhipu GLM API for outline enrichment.
//
// Usage: pnpm --filter @omm/api exec tsx src/scripts/test-zhipu.ts
import "dotenv/config";
import { loadConfig } from "../config/index";
import { createZhipuProvider } from "../services/zhipu-provider";
import type { ContentOutline } from "../services/content-outline";

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

async function main() {
  const config = loadConfig();
  const apiKey = config.models.zhipuApiKey;
  if (!apiKey) {
    console.error("GLM_API_KEY not set in .env");
    process.exit(1);
  }

  const provider = createZhipuProvider(apiKey, config.models.zhipuModel);

  console.log("--- Zhipu LLM Enrichment ---");
  console.log("Model:", config.models.zhipuModel);
  console.log("Center:", outline.center.concept);
  console.log("Branches:", outline.branches.map((b) => b.concept).join(", "));
  console.log();

  const enriched = await provider.enrichOutline(outline, "en");

  console.log("Enriched outline:");
  console.log(JSON.stringify(enriched, null, 2));
  console.log("\nDone!");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
