#!/usr/bin/env node
/**
 * check-root-duplicates.cjs
 * ─────────────────────────────────────────────────────────────────────────
 * Checks whether anything in src/ imports the ROOT-level contexts/, hooks/,
 * or mock/ folders specifically (as opposed to the same-named folders
 * inside src/). Regex can't reliably answer this because the number of
 * '../' segments needed to escape src/ varies by how deep the importing
 * file is -- this resolves every import for real instead of guessing.
 *
 * Usage: node check-root-duplicates.cjs
 * Run from the project root (same folder as tsconfig.json).
 * ─────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const TSCONFIG_PATH = path.join(PROJECT_ROOT, 'tsconfig.json');
const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const RESOLVABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];

// The specific root-level files in question
const ROOT_CANDIDATES = [
  path.join(PROJECT_ROOT, 'contexts', 'MessagingContext.tsx'),
  path.join(PROJECT_ROOT, 'contexts', 'useSubspecialties.tsx'),
  path.join(PROJECT_ROOT, 'hooks', 'useScreenCapture.ts'),
  path.join(PROJECT_ROOT, 'mock', 'mockReports.ts'),
].map(p => path.normalize(p));

function readTsconfigPaths() {
  if (!fs.existsSync(TSCONFIG_PATH)) return {};
  const raw = fs.readFileSync(TSCONFIG_PATH, 'utf8').replace(/^\s*\/\/.*$/gm, '');
  try { return JSON.parse(raw).compilerOptions?.paths || {}; } catch { return {}; }
}
function buildAliasMap(tsPaths) {
  const aliases = [];
  for (const [key, targets] of Object.entries(tsPaths)) {
    if (!targets || targets.length === 0) continue;
    aliases.push({ keyPrefix: key.replace(/\*$/, ''), targetPrefix: targets[0].replace(/^\.\//, '').replace(/\*$/, '') });
  }
  aliases.sort((a, b) => b.keyPrefix.length - a.keyPrefix.length);
  return aliases;
}
function walkDir(dir, fileList = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(fullPath, fileList);
    else fileList.push(fullPath);
  }
  return fileList;
}
function extractImportSpecifiers(content) {
  const specifiers = [];
  const importRe = /(?:import|export)(?:[^'"]*?)from\s+['"]([^'"]+)['"]/g;
  const bareImportRe = /import\s+['"]([^'"]+)['"]/g;
  const dynamicImportRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
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
    candidatePath = path.resolve(path.dirname(fromFile), specifier);
  } else {
    for (const { keyPrefix, targetPrefix } of aliases) {
      if (specifier.startsWith(keyPrefix)) {
        candidatePath = path.join(PROJECT_ROOT, targetPrefix, specifier.slice(keyPrefix.length));
        break;
      }
    }
  }
  if (!candidatePath) return null;
  const attempts = [
    candidatePath,
    ...RESOLVABLE_EXTENSIONS.map(ext => candidatePath + ext),
    ...RESOLVABLE_EXTENSIONS.map(ext => path.join(candidatePath, 'index' + ext)),
  ];
  for (const attempt of attempts) {
    if (fs.existsSync(attempt) && fs.statSync(attempt).isFile()) return path.normalize(attempt);
  }
  return null;
}

function main() {
  const aliases = buildAliasMap(readTsconfigPaths());
  const codeFiles = walkDir(SRC_DIR).filter(f => CODE_EXTENSIONS.includes(path.extname(f)));

  const foundReferences = new Map(); // rootFile -> list of importers
  ROOT_CANDIDATES.forEach(f => foundReferences.set(f, []));

  for (const file of codeFiles) {
    let content;
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const spec of extractImportSpecifiers(content)) {
      const resolved = resolveSpecifier(spec, file, aliases);
      if (resolved && foundReferences.has(resolved)) {
        foundReferences.get(resolved).push(path.relative(PROJECT_ROOT, file));
      }
    }
  }

  console.log('Checking whether anything imports the TRUE root-level files specifically:\n');
  let anyReferenced = false;
  for (const [rootFile, importers] of foundReferences) {
    const rel = path.relative(PROJECT_ROOT, rootFile);
    if (importers.length === 0) {
      console.log(`  ${rel} -- NOT imported by anything in src/ (safe to delete)`);
    } else {
      anyReferenced = true;
      console.log(`  ${rel} -- IMPORTED BY:`);
      importers.forEach(imp => console.log(`      ${imp}`));
    }
  }
  console.log(`\n${anyReferenced ? 'At least one root file IS still referenced -- do not delete those.' : 'None of the root-level files are referenced anywhere in src/. All confirmed safe to delete.'}`);
}

main();
