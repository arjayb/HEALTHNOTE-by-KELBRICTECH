import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(projectRoot, "public/ocr");

const assets = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "lang/eng.traineddata.gz"],
  ["node_modules/tesseract.js-core/tesseract-core.wasm.js", "core/tesseract-core.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core.wasm", "core/tesseract-core.wasm"],
  ["node_modules/tesseract.js-core/tesseract-core-simd.wasm.js", "core/tesseract-core-simd.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd.wasm", "core/tesseract-core-simd.wasm"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "core/tesseract-core-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm", "core/tesseract-core-lstm.wasm"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "core/tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm", "core/tesseract-core-simd-lstm.wasm"],
];

for (const [source, destination] of assets) {
  const output = resolve(outputRoot, destination);
  await mkdir(dirname(output), { recursive: true });
  await copyFile(resolve(projectRoot, source), output);
}

console.log(`Prepared ${assets.length} local OCR assets.`);
