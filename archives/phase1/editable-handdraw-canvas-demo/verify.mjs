import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(
  new URL("../packages/web/package.json", import.meta.url),
);
const { chromium } = require("playwright-core");

const demoDir = resolve(import.meta.dirname);
const repoRoot = resolve(demoDir, "..");
const yamlPath = resolve(repoRoot, "fixtures/handdraw/mindmap-6.yaml");
const demoUrl = pathToFileURL(resolve(demoDir, "index.html")).href;
const screenshotPath = resolve(
  repoRoot,
  ".tmp/editable-handdraw-canvas-demo-screenshot.png",
);

function parseMindmapYaml(source) {
  const lines = source.split(/\r?\n/);
  const result = { title: "", center: "", branches: [] };
  let currentBranch = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const value = trimmed.match(/^[^:]+:\s*"?(.*?)"?$/)?.[1] ?? "";
    if (trimmed.startsWith("title:")) {
      result.title = value;
      continue;
    }
    if (trimmed.startsWith("center:")) {
      result.center = value;
      continue;
    }
    if (trimmed.startsWith("- concept:")) {
      currentBranch = { concept: value, children: [] };
      result.branches.push(currentBranch);
      continue;
    }
    if (/^-\s+/.test(trimmed) && currentBranch) {
      currentBranch.children.push(trimmed.replace(/^-\s+/, "").replace(/^"|"$/g, ""));
    }
  }
  return result;
}

const fixture = parseMindmapYaml(readFileSync(yamlPath, "utf8"));
mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1360, height: 980, deviceScaleFactor: 1 },
});

const events = [];
page.on("console", (message) => {
  if (message.type() === "error") {
    events.push(`console:${message.text()}`);
  }
});
page.on("pageerror", (error) => events.push(`pageerror:${error.message}`));

await page.goto(demoUrl, { waitUntil: "networkidle", timeout: 15_000 });
await page.waitForSelector("[data-editable-object]", { timeout: 10_000 });

const result = await page.evaluate(() => {
  const objectCount = document.querySelectorAll("[data-editable-object]").length;
  const branchCount = document.querySelectorAll('[data-object-type="branch"]').length;
  const labelCount = document.querySelectorAll('[data-object-type="label"]').length;
  const doodleCount = document.querySelectorAll('[data-object-type="doodle"]').length;
  const centerCount = document.querySelectorAll('[data-object-type="card"]').length;
  const reference = document.querySelector("[data-reference]");
  const fixture = window.__editableHanddrawCanvasDemo.getFixture();
  const state = window.__editableHanddrawCanvasDemo.getState();
  return {
    objectCount,
    branchCount,
    labelCount,
    doodleCount,
    centerCount,
    referenceVisible: reference?.getAttribute("visibility") === "visible",
    fixtureBranchCount: fixture.branches.length,
    stateObjectCount: state.length,
    hasTitle: state.some((object) => object.id === "title"),
    hasCenter: state.some((object) => object.id === "center-card"),
  };
});

await page.locator('[data-object-id="b1-label"]').click();
await page.locator("#label-editor").fill("1. 极速交付 EDIT");
const editedText = await page.locator('[data-object-id="b1-label"] text').textContent();

const beforeDrag = await page.evaluate(() =>
  window.__editableHanddrawCanvasDemo
    .getState()
    .find((object) => object.id === "b3-label"),
);
const box = await page.locator('[data-object-id="b3-label"]').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20);
await page.mouse.up();
const afterDrag = await page.evaluate(() =>
  window.__editableHanddrawCanvasDemo
    .getState()
    .find((object) => object.id === "b3-label"),
);

await page.locator("#toggle-reference").click();
const referenceHidden = await page
  .locator("[data-reference]")
  .evaluate((element) => element.getAttribute("visibility") === "hidden");

await page.locator("#export-state").click();
const exportedState = await page.locator("#state-json").inputValue();
const parsedExport = JSON.parse(exportedState);
await page.locator("#import-state").click();

await page.screenshot({ path: screenshotPath, fullPage: true });
await browser.close();

console.log(
  JSON.stringify(
    {
      demoUrl,
      yamlPath,
      screenshotPath,
      fixture,
      result,
      editedText,
      referenceHidden,
      exportedObjectCount: parsedExport.objects?.length ?? 0,
      events,
    },
    null,
    2,
  ),
);

if (
  events.length > 0 ||
  fixture.title !== "How Anthropic's Product Team Moves" ||
  fixture.center !== "Anthropic 产品之道" ||
  fixture.branches.length !== 6 ||
  fixture.branches.some((branch) => branch.children.length !== 2) ||
  result.objectCount < 20 ||
  result.branchCount !== 6 ||
  result.labelCount < 7 ||
  result.doodleCount !== 12 ||
  result.centerCount !== 1 ||
  !result.referenceVisible ||
  result.fixtureBranchCount !== 6 ||
  !result.hasTitle ||
  !result.hasCenter ||
  !editedText?.includes("EDIT") ||
  Math.abs(afterDrag.x - beforeDrag.x) < 20 ||
  Math.abs(afterDrag.y - beforeDrag.y) < 10 ||
  !referenceHidden ||
  parsedExport.objects?.length !== result.stateObjectCount
) {
  process.exitCode = 1;
}
