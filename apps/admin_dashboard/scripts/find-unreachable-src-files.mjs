import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');

const entryFiles = [path.join(srcRoot, 'main.tsx')];

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

function isInSrc(absPath) {
  const rel = path.relative(srcRoot, absPath);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function resolveImport(fromFile, spec) {
  const isRelative = spec.startsWith('.');
  const isAlias = spec.startsWith('@/') || spec === '@';
  if (!isRelative && !isAlias) return null;

  const base = isAlias
    ? path.resolve(srcRoot, spec === '@' ? '.' : spec.slice(2))
    : path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function extractImports(filePath, contents) {
  const out = new Set();
  IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = IMPORT_RE.exec(contents))) {
    const spec = m[1] ?? m[2];
    if (spec) out.add(spec);
  }
  return [...out];
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

const allSrcFiles = walkFiles(srcRoot).filter((p) => {
  const ext = path.extname(p).toLowerCase();
  return ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext);
});

const reachable = new Set();
const queue = [...entryFiles];

while (queue.length) {
  const current = queue.pop();
  if (!current || reachable.has(current)) continue;
  if (!fs.existsSync(current)) continue;
  reachable.add(current);

  const contents = readFileSafe(current);
  if (!contents) continue;

  for (const spec of extractImports(current, contents)) {
    const resolved = resolveImport(current, spec);
    if (resolved && isInSrc(resolved) && !reachable.has(resolved)) {
      queue.push(resolved);
    }
  }
}

const unreachable = allSrcFiles
  .filter((f) => !reachable.has(f))
  .map((f) => path.relative(projectRoot, f).replaceAll('\\', '/'))
  .sort((a, b) => a.localeCompare(b));

process.stdout.write(unreachable.join('\n'));
