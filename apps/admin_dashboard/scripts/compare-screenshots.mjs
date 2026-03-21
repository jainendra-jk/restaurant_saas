import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const baselineDir = argValue('--baseline') ?? 'ui-baseline';
const afterDir = argValue('--after') ?? 'ui-after';
const diffDir = argValue('--diff') ?? 'ui-diff';
const threshold = Number(argValue('--threshold') ?? '0.1');

function listPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.localeCompare(b));
}

function readPng(filePath) {
  const buf = fs.readFileSync(filePath);
  return PNG.sync.read(buf);
}

function writePng(filePath, png) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

const baselineFiles = listPngs(baselineDir);
const afterFiles = listPngs(afterDir);
const common = baselineFiles.filter((f) => afterFiles.includes(f));

if (!common.length) {
  console.error(
    `No matching PNG filenames found between "${baselineDir}" and "${afterDir}".`
  );
  process.exit(2);
}

let totalDiffPixels = 0;
let filesWithDiffs = 0;

for (const file of common) {
  const basePath = path.join(baselineDir, file);
  const afterPath = path.join(afterDir, file);

  const img1 = readPng(basePath);
  const img2 = readPng(afterPath);

  if (img1.width !== img2.width || img1.height !== img2.height) {
    filesWithDiffs++;
    console.log(`${file}: size changed (${img1.width}x${img1.height} -> ${img2.width}x${img2.height})`);
    continue;
  }

  const diff = new PNG({ width: img1.width, height: img1.height });
  const diffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {
    threshold,
  });

  if (diffPixels > 0) {
    filesWithDiffs++;
    totalDiffPixels += diffPixels;
    const diffPath = path.join(diffDir, file);
    writePng(diffPath, diff);
    console.log(`${file}: ${diffPixels} pixels differ (diff: ${diffPath})`);
  } else {
    console.log(`${file}: OK (no pixel diffs)`);
  }
}

if (filesWithDiffs) {
  console.error(
    `\nUI differs: ${filesWithDiffs}/${common.length} files differ; total differing pixels: ${totalDiffPixels}.`
  );
  process.exit(1);
}

console.log(`\nUI match: ${common.length}/${common.length} screenshots identical.`);
