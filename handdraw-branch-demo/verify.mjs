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
await page.waitForSelector("[data-branch-skeleton]", { timeout: 10_000 });

const result = await page.evaluate(() => {
  const svg = document.querySelector("#demo");
  const buttons = [...document.querySelectorAll("button[data-mode]")];
  const svgRect = svg?.getBoundingClientRect();
  const modes = Object.fromEntries(
    buttons.map((button) => {
      button.click();
      const paths = [...document.querySelectorAll("[data-branch-skeleton]")];
      const branchRects = paths.map((path) => {
        const rect = path.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
        };
      });
      return [
        button.dataset.mode,
        {
          ids: paths.map((path) => path.getAttribute("data-branch-skeleton")),
          branchCount: paths.length,
          visibleBranchCount: branchRects.filter(
            (rect) => rect.width > 2,
          ).length,
        },
      ];
    }),
  );
  buttons.find((button) => button.dataset.mode === "jittered")?.click();
  const debug = window.__handdrawDemoDebug;
  const mainBranches = debug.skeleton.filter((branch) => branch.depth === 1);
  const branchThreeChildren = debug.skeleton.filter(
    (branch) => branch.parentId === "branch-3",
  );
  const branchTwoChildren = debug.skeleton.filter(
    (branch) => branch.parentId === "branch-2",
  );
  return {
    modeCount: buttons.length,
    modes,
    debug,
    mainBranches,
    branchThreeChildren,
    branchTwoChildren,
    svgWidth: svgRect?.width ?? 0,
    svgHeight: svgRect?.height ?? 0,
  };
});

await page.screenshot({ path: screenshotPath, fullPage: true });
await browser.close();

console.log(JSON.stringify({ demoUrl, screenshotPath, result, events }, null, 2));

const modeEntries = Object.entries(result.modes);
const skeletonIdKey = modeEntries
  .map(([, mode]) => [...mode.ids].sort().join(","))
  .join("|");
const firstSkeletonIdKey = modeEntries[0]?.[1].ids.sort().join(",");
const allModesShareSkeleton = modeEntries.every(
  ([, mode]) => [...mode.ids].sort().join(",") === firstSkeletonIdKey,
);
const visibleModes = modeEntries.every(
  ([, mode]) => mode.branchCount >= 13 && mode.visibleBranchCount >= 13,
);
const leftMainIds = result.mainBranches
  .filter((branch) => branch.side === "left")
  .map((branch) => branch.id)
  .sort();
const rightMainIds = result.mainBranches
  .filter((branch) => branch.side === "right")
  .map((branch) => branch.id)
  .sort();
const balancedSides =
  leftMainIds.join(",") === "branch-1,branch-3" &&
  rightMainIds.join(",") === "branch-2" &&
  Math.abs(result.debug.sideWeights.left - result.debug.sideWeights.right) < 0.01;
const splitBranchThree =
  result.branchThreeChildren.length === 2 &&
  result.branchThreeChildren
    .map((branch) => Math.sign(branch.end.y - branch.start.y))
    .sort()
    .join(",") === "-1,1";
const branchTwoEndYs = result.branchTwoChildren
  .map((branch) => branch.end.y)
  .sort((a, b) => a - b);
const branchTwoGaps = branchTwoEndYs
  .slice(1)
  .map((endY, index) => endY - branchTwoEndYs[index]);
const evenlySpreadBranchTwo =
  result.branchTwoChildren.length === 5 &&
  branchTwoEndYs.at(-1) - branchTwoEndYs[0] >= 320 &&
  branchTwoGaps.every((gap) => gap >= 70 && gap <= 100) &&
  result.branchTwoChildren.every((branch) => branch.end.x <= 1120);
const horizontalTerminals = result.debug.skeleton.every(
  (branch) => Math.abs(branch.terminalAngle) <= 30.5,
);
const semanticOrderPreserved =
  result.debug.semanticOrder.join(",") === "branch-1,branch-2,branch-3";

if (events.length > 0) {
  process.exitCode = 1;
}
if (
  result.modeCount < 3 ||
  !allModesShareSkeleton ||
  !visibleModes ||
  skeletonIdKey.length === 0 ||
  !balancedSides ||
  !splitBranchThree ||
  !evenlySpreadBranchTwo ||
  !horizontalTerminals ||
  !semanticOrderPreserved ||
  result.svgWidth <= 0 ||
  result.svgHeight <= 0
) {
  process.exitCode = 1;
}
