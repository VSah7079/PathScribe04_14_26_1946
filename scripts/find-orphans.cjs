#!/usr/bin/env node
/**
 * find-orphans.cjs
 * ─────────────────────────────────────────────────────────────────────────
 * Scans src/ for .ts/.tsx/.js/.jsx files and reports any file that is never
 * imported by anything else in the project — a candidate for deletion
 * before packaging the codebase (e.g. for a copyright deposit).
 *
 * This is intentionally conservative: it flags candidates for YOUR review,
 * it does not delete anything. A file showing up here means "nothing in
 * src/ imports this via a resolvable path" — always sanity-check before
 * deleting (e.g. files referenced only from index.html, vite.config.ts,
 * dynamically constructed import paths, or test-runner config won't be
 * caught by this and could show up as false positives).
 *
 * Usage:
 *   node find-orphans.cjs
 * Run from the project root (same folder as tsconfig.json).
 * No dependencies — uses only Node's built-in fs/path modules.
 * ─────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const TSCONFIG_PATH = path.join(PROJECT_ROOT, 'tsconfig.json');

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const RESOLVABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];

// Files that are legitimate "nothing imports them" entry points — never
// flag these even with zero incoming references.
const ENTRY_POINT_PATTERNS = [
  /^main\.(ts|tsx|js|jsx)$/,
  /^index\.html$/,
  /vite-env\.d\.ts$/,
  /\.d\.ts$/,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
];

function readTsconfigPaths() {
  if (!fs.existsSync(TSCONFIG_PATH)) {
    console.warn('WARNING: tsconfig.json not found at project root — path aliases (@/*, etc.) will not resolve. Run this script from the project root.');
    return {};
  }
  const raw = fs.readFileSync(TSCONFIG_PATH, 'utf8');
  // Strip // line comments (tsconfig.json in this project has them) —
  // naive but sufficient: doesn't strip // inside strings, which this
  // file's paths/comments don't contain.
  const stripped = raw.replace(/^\s*\/\/.*$/gm, '');
  let parsed;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    console.warn('WARNING: could not parse tsconfig.json — path aliases will not resolve.', e.message);
    return {};
  }
  return parsed.compilerOptions?.paths || {};
}

function buildAliasMap(tsPaths) {
  // tsconfig paths look like { "@/*": ["./src/*"], "@components/*": ["./src/components/*"] }
  // Convert to a simple prefix -> targetPrefix map, e.g. "@/" -> "src/"
  const aliases = [];
  for (const [key, targets] of Object.entries(tsPaths)) {
    if (!targets || targets.length === 0) continue;
    const keyPrefix = key.replace(/\*$/, '');
    const targetPrefix = targets[0].replace(/^\.\//, '').replace(/\*$/, '');
    aliases.push({ keyPrefix, targetPrefix });
  }
  // Longest prefix first, so more specific aliases match before generic ones
  aliases.sort((a, b) => b.keyPrefix.length - a.keyPrefix.length);
  return aliases;
}

function walkDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function extractImportSpecifiers(content) {
  const specifiers = [];
  // import ... from '...'  /  export ... from '...'
  const importRe = /(?:import|export)(?:[^'"]*?)from\s+['"]([^'"]+)['"]/g;
  // bare side-effect import: import '...'
  const bareImportRe = /import\s+['"]([^'"]+)['"]/g;
  // dynamic import('...')
  const dynamicImportRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  // require('...')
  const requireRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

  let m;
  while ((m = importRe.exec(content))) specifiers.push(m[1]);
  while ((m = bareImportRe.exec(content))) specifiers.push(m[1]);
  while ((m = dynamicImportRe.exec(content))) specifiers.push(m[1]);
  while ((m = requireRe.exec(content))) specifiers.push(m[1]);

  return specifiers;
}

function resolveSpecifier(specifier, fromFile, aliases) {
  let candidatePath = null;

  if (specifier.startsWith('.')) {
    // Relative import
    candidatePath = path.resolve(path.dirname(fromFile), specifier);
  } else {
    // Try alias resolution
    for (const { keyPrefix, targetPrefix } of aliases) {
      if (specifier.startsWith(keyPrefix)) {
        const rest = specifier.slice(keyPrefix.length);
        candidatePath = path.join(PROJECT_ROOT, targetPrefix, rest);
        break;
      }
    }
  }

  if (!candidatePath) return null; // external package (react, etc.) — not our concern

  // Try exact path, then with each resolvable extension, then as a directory index
  const attempts = [
    candidatePath,
    ...RESOLVABLE_EXTENSIONS.map(ext => candidatePath + ext),
    ...RESOLVABLE_EXTENSIONS.map(ext => path.join(candidatePath, 'index' + ext)),
  ];

  for (const attempt of attempts) {
    if (fs.existsSync(attempt) && fs.statSync(attempt).isFile()) {
      return path.normalize(attempt);
    }
  }
  return null; // couldn't resolve — likely external or a real problem, not this script's concern
}

function isEntryPoint(relPath) {
  const basename = path.basename(relPath);
  return ENTRY_POINT_PATTERNS.some(re => re.test(basename));
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`ERROR: ${SRC_DIR} not found. Run this script from the project root.`);
    process.exit(1);
  }

  const tsPaths = readTsconfigPaths();
  const aliases = buildAliasMap(tsPaths);

  const allFiles = walkDir(SRC_DIR);
  const codeFiles = allFiles.filter(f => CODE_EXTENSIONS.includes(path.extname(f)));

  const referencedFiles = new Set();

  for (const file of codeFiles) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (e) {
      console.warn(`Could not read ${file}: ${e.message}`);
      continue;
    }
    const specifiers = extractImportSpecifiers(content);
    for (const spec of specifiers) {
      const resolved = resolveSpecifier(spec, file, aliases);
      if (resolved) referencedFiles.add(resolved);
    }
  }

  const orphans = codeFiles.filter(f => {
    const normalized = path.normalize(f);
    if (referencedFiles.has(normalized)) return false;
    const relPath = path.relative(PROJECT_ROOT, f);
    if (isEntryPoint(relPath)) return false;
    return true;
  });

  console.log(`\nScanned ${codeFiles.length} files under src/.`);
  console.log(`${referencedFiles.size} distinct files are imported by something else.\n`);

  if (orphans.length === 0) {
    console.log('No orphaned files found. (Still worth a manual check on anything excluded in tsconfig.json — this script does not scan excluded paths any differently, but excluded files can still be imported by included ones and vice versa, so review those separately.)');
    return;
  }

  console.log(`${orphans.length} file(s) with no detected importer — review before deleting:\n`);
  for (const orphan of orphans.sort()) {
    console.log('  ' + path.relative(PROJECT_ROOT, orphan));
  }
  console.log(`
NOTE ON FALSE POSITIVES — this script cannot see:
  - Files only referenced from index.html or vite.config.ts (e.g. main.tsx should
    already be excluded by the entry-point patterns, but double-check).
  - Dynamically constructed import paths (e.g. import(\`./templates/\${id}\`)).
  - Files loaded by a test runner's own config rather than imported in code.
  - JSON files loaded via fetch()/raw string paths rather than ES import.
Cross-check anything surprising here before deleting it.
`);
}

main();
