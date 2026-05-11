import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, resolve } from "node:path";

const require = createRequire(new URL("../packages/web/package.json", import.meta.url));
const { chromium } = require("playwright-core");

const sourceArg = process.argv[2] ?? "fixtures/handdraw/mindmap-7.png";
const outputPrefixArg =
  process.argv[3] ?? sourceArg.slice(0, -extname(sourceArg).length);

const repoRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(repoRoot, sourceArg);
const outputPrefix = resolve(repoRoot, outputPrefixArg);
const outputs = {
  branchMask: `${outputPrefix}-branch-mask.png`,
  noText: `${outputPrefix}-no-text.png`,
  illustrationsOnly: `${outputPrefix}-illustrations-only.png`,
};

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage();
const sourceDataUrl = `data:image/png;base64,${readFileSync(sourcePath).toString("base64")}`;

const result = await page.evaluate(async ({ sourceUrl }) => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = sourceUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const source = context.getImageData(0, 0, canvas.width, canvas.height);

  const isBranch = (red, green, blue, alpha) =>
    alpha > 16 && red > 175 && blue > 150 && green < 90 && Math.abs(red - blue) < 95;
  const isText = (red, green, blue, alpha) =>
    alpha > 16 && green > 125 && red < 95 && blue < 110 && green > red * 1.35;

  const makeMask = (predicate) => {
    const mask = new Uint8Array(source.width * source.height);
    for (let index = 0, pixel = 0; index < source.data.length; index += 4, pixel += 1) {
      if (
        predicate(
          source.data[index],
          source.data[index + 1],
          source.data[index + 2],
          source.data[index + 3],
        )
      ) {
        mask[pixel] = 1;
      }
    }
    return mask;
  };

  const dilateMask = (mask, radius) => {
    const output = new Uint8Array(mask.length);
    for (let y = 0; y < source.height; y += 1) {
      for (let x = 0; x < source.width; x += 1) {
        const pixel = y * source.width + x;
        if (!mask[pixel]) continue;
        for (let dy = -radius; dy <= radius; dy += 1) {
          const ny = y + dy;
          if (ny < 0 || ny >= source.height) continue;
          for (let dx = -radius; dx <= radius; dx += 1) {
            const nx = x + dx;
            if (nx < 0 || nx >= source.width) continue;
            if (dx * dx + dy * dy > radius * radius) continue;
            output[ny * source.width + nx] = 1;
          }
        }
      }
    }
    return output;
  };

  const branchBaseMask = makeMask(isBranch);
  const textBaseMask = makeMask(isText);
  const branchMask = dilateMask(branchBaseMask, 4);
  const textMask = dilateMask(textBaseMask, 8);

  const transparent = (target, index) => {
    target.data[index + 3] = 0;
  };

  const makeImage = (mode) => {
    const imageData = new ImageData(
      new Uint8ClampedArray(source.data),
      source.width,
      source.height,
    );
    let branchPixels = 0;
    let textPixels = 0;
    for (let index = 0, pixel = 0; index < imageData.data.length; index += 4, pixel += 1) {
      const branch = Boolean(branchMask[pixel]);
      const text = Boolean(textMask[pixel]);
      if (branch) branchPixels += 1;
      if (text) textPixels += 1;

      if (mode === "branchMask" && !branch) {
        transparent(imageData, index);
      }
      if (mode === "noText" && text) {
        transparent(imageData, index);
      }
      if (mode === "illustrationsOnly" && (branch || text)) {
        transparent(imageData, index);
      }
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.putImageData(imageData, 0, 0);
    return {
      dataUrl: canvas.toDataURL("image/png"),
      branchPixels,
      textPixels,
    };
  };

  return {
    width: canvas.width,
    height: canvas.height,
    branchMask: makeImage("branchMask"),
    noText: makeImage("noText"),
    illustrationsOnly: makeImage("illustrationsOnly"),
  };
}, { sourceUrl: sourceDataUrl });

await browser.close();

for (const [key, outputPath] of Object.entries(outputs)) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const base64 = result[key].dataUrl.replace(/^data:image\/png;base64,/, "");
  writeFileSync(outputPath, Buffer.from(base64, "base64"));
}

console.log(
  JSON.stringify(
    {
      sourcePath,
      outputs,
      width: result.width,
      height: result.height,
      branchPixels: result.branchMask.branchPixels,
      textPixels: result.noText.textPixels,
    },
    null,
    2,
  ),
);
