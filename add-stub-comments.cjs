#!/usr/bin/env node
/**
 * add-stub-comments.cjs
 * ─────────────────────────────────────────────────────────────────────────
 * Prepends a standard documentation comment to every firestore*Service.ts
 * file in a service domain where the mock and/or interface is still alive
 * (per classify-firestore-stubs.cjs's KEEP list) — marking it as a
 * deliberate, forward-looking stub rather than an unexplained dead file.
 *
 * Idempotent: skips any file that already contains the marker text, so
 * it's safe to re-run after adding new services later.
 *
 * Usage: node add-stub-comments.cjs
 * Run from the project root (same folder as tsconfig.json).
 * ─────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const SERVICES_DIR = path.join(SRC_DIR, 'services');
const TSCONFIG_PATH = path.join(PROJECT_ROOT, 'tsconfig.json');

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const RESOLVABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];
const MARKER = 'Stub only — real implementation pending backend cutover.';

function readTsconfigPaths() {
  if (!fs.existsSync(TSCONFIG_PATH)) return {};
  const raw = fs.readFileSync(TSCONFIG_PATH, 'utf8');
  const stripped = raw.replace(/^\s*\/\/.*$/gm, '');
  try { return JSON.parse(stripped).compilerOptions?.paths || {}; } catch { return {}; }
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
  const allFiles = walkDir(SRC_DIR);
  const codeFiles = allFiles.filter(f => CODE_EXTENSIONS.includes(path.extname(f)));

  const importedBy = new Map();
  for (const file of codeFiles) {
    let content;
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const spec of extractImportSpecifiers(content)) {
      const resolved = resolveSpecifier(spec, file, aliases);
      if (!resolved) continue;
      if (!importedBy.has(resolved)) importedBy.set(resolved, new Set());
      importedBy.get(resolved).add(path.normalize(file));
    }
  }
  function isAlive(filePath, ignoreFiles) {
    const refs = importedBy.get(path.normalize(filePath));
    if (!refs) return false;
    for (const ref of refs) if (!ignoreFiles.has(ref)) return true;
    return false;
  }

  const serviceDomains = fs.readdirSync(SERVICES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => path.join(SERVICES_DIR, e.name));

  let commented = 0, skipped = 0, deletedDomainSkipped = 0;

  for (const domainDir of serviceDomains) {
    if (!fs.existsSync(domainDir)) { continue; } // in case narrative/specimens already deleted
    const filesInDomain = fs.readdirSync(domainDir).filter(f => CODE_EXTENSIONS.includes(path.extname(f)));
    const firestoreFiles = filesInDomain.filter(f => /^firestore.*Service\.ts$/i.test(f));
    if (firestoreFiles.length === 0) continue;

    const mockFiles = filesInDomain.filter(f => /^mock.*Service\.ts$/i.test(f));
    const interfaceFiles = filesInDomain.filter(f => /^I.*Service\.ts$/.test(f));
    const domainFilesFull = new Set(filesInDomain.map(f => path.normalize(path.join(domainDir, f))));

    const mockAlive = mockFiles.some(f => isAlive(path.join(domainDir, f), domainFilesFull));
    const interfaceAlive = interfaceFiles.some(f => isAlive(path.join(domainDir, f), domainFilesFull));

    if (!mockAlive && !interfaceAlive) { deletedDomainSkipped++; continue; } // DELETE-list domain, not our concern here

    const mockName = mockFiles[0] || '(mock service)';

    for (const ffile of firestoreFiles) {
      const fullPath = path.join(domainDir, ffile);
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(MARKER)) { skipped++; continue; }

      const comment = `// ${MARKER}\n// ${mockName} is the active implementation; this satisfies the\n// service interface's contract so the swap to a real backend is a\n// one-line change in services/index.ts when that backend exists.\n\n`;
      fs.writeFileSync(fullPath, comment + content, 'utf8');
      commented++;
      console.log(`Commented: ${path.relative(PROJECT_ROOT, fullPath)}`);
    }
  }

  console.log(`\nDone. ${commented} file(s) commented, ${skipped} already had the marker, ${deletedDomainSkipped} domain(s) skipped (in the delete list, not commented).`);
}

main();
