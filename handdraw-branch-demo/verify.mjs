import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(
  new URL("../packages/web/package.json", import.meta.url),
);
const { chromium } = require("playwright-core");

const demoDir = resolve(import.meta.dirname);
const demoUrl = pathToFileURL(resolve(demoDir, "index.html")).href;
const screenshotPath = resolve(demoDir, "../.tmp/handdraw-branch-demo-screenshot.png");

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 820, deviceScaleFactor: 1 },
});

const events = [];
page.on("console", (message) => {
  if (message.type() === "error") {
    events.push(`console:${message.text()}`);
  }
});
page.on("pageerror", (error) => events.push(`pageerror:${error.message}`));

await page.goto(demoUrl, { waitUntil: "networkidle", timeout: 15_000 });
await page.waitForSelector("[data-branch-body]", { timeout: 10_000 });

const result = await page.evaluate(() => {
  const svg = document.querySelector("#demo");
  const paths = [...document.querySelectorAll("[data-branch-body]")];
  const buttons = [...document.querySelectorAll("button[data-mode]")];
  const svgRect = svg?.getBoundingClientRect();
  const branchRects = paths.map((path) => {
    const rect = path.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  });
  return {
    modeCount: buttons.length,
    branchCount: paths.length,
    svgWidth: svgRect?.width ?? 0,
    svgHeight: svgRect?.height ?? 0,
    visibleBranchCount: branchRects.filter(
      (rect) => rect.width > 2 && rect.height > 2,
    ).length,
  };
});

await page.screenshot({ path: screenshotPath, fullPage: true });
await browser.close();

console.log(JSON.stringify({ demoUrl, screenshotPath, result, events }, null, 2));

if (events.length > 0) {
  process.exitCode = 1;
}
if (
  result.modeCount < 3 ||
  result.branchCount < 10 ||
  result.visibleBranchCount < 10 ||
  result.svgWidth <= 0 ||
  result.svgHeight <= 0
) {
  process.exitCode = 1;
}
