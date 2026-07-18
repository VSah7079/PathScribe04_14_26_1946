#!/usr/bin/env node
/**
 * classify-firestore-stubs.cjs
 * ─────────────────────────────────────────────────────────────────────────
 * For every src/services/<domain>/firestore*Service.ts file, checks whether
 * its sibling mock*Service.ts and I*Service.ts (interface) files in the same
 * folder are still ALIVE (imported by something else in the project) or
 * ALSO orphaned.
 *
 *   - If the mock and/or interface is alive  -> the service domain is real
 *     and active, just not yet backed by a real Firestore implementation.
 *     Reported as KEEP — add a documentation comment marking it as a
 *     deliberate stub for a future backend cutover.
 *   - If mock and interface are BOTH also orphaned (or missing entirely)
 *     -> the whole domain is dead, not just the Firestore half. Reported
 *     as DELETE FOLDER.
 *
 * Uses the same import-resolution logic as find-orphans.cjs (relative
 * paths + tsconfig.json path aliases). Reports only — does not modify or
 * delete anything.
 *
 * Usage: node classify-firestore-stubs.cjs
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

function readTsconfigPaths() {
  if (!fs.existsSync(TSCONFIG_PATH)) return {};
  const raw = fs.readFileSync(TSCONFIG_PATH, 'utf8');
  const stripped = raw.replace(/^\s*\/\/.*$/gm, '');
  try {
    return JSON.parse(stripped).compilerOptions?.paths || {};
  } catch {
    return {};
  }
}

function buildAliasMap(tsPaths) {
  const aliases = [];
  for (const [key, targets] of Object.entries(tsPaths)) {
    if (!targets || targets.length === 0) continue;
    aliases.push({
      keyPrefix: key.replace(/\*$/, ''),
      targetPrefix: targets[0].replace(/^\.\//, '').replace(/\*$/, ''),
    });
  }
  aliases.sort((a, b) => b.keyPrefix.length - a.keyPrefix.length);
  return aliases;
}

function walkDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
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
  if (!fs.existsSync(SERVICES_DIR)) {
    console.error(`ERROR: ${SERVICES_DIR} not found. Run this from the project root.`);
    process.exit(1);
  }

  const aliases = buildAliasMap(readTsconfigPaths());
  const allFiles = walkDir(SRC_DIR);
  const codeFiles = allFiles.filter(f => CODE_EXTENSIONS.includes(path.extname(f)));

  // Build a map of file -> list of files that import it (excluding self-references)
  const importedBy = new Map(); // resolvedPath -> Set of importer paths

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
    for (const ref of refs) {
      if (!ignoreFiles.has(ref)) return true;
    }
    return false;
  }

  // Find every service domain folder containing a firestore*Service.ts file
  const serviceDomains = fs.readdirSync(SERVICES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => path.join(SERVICES_DIR, e.name));

  const keepList = [];
  const deleteList = [];

  for (const domainDir of serviceDomains) {
    const filesInDomain = fs.readdirSync(domainDir).filter(f => CODE_EXTENSIONS.includes(path.extname(f)));
    const firestoreFiles = filesInDomain.filter(f => /^firestore.*Service\.ts$/i.test(f));
    if (firestoreFiles.length === 0) continue;

    const mockFiles = filesInDomain.filter(f => /^mock.*Service\.ts$/i.test(f));
    const interfaceFiles = filesInDomain.filter(f => /^I.*Service\.ts$/.test(f));

    const domainFilesFull = new Set(
      filesInDomain.map(f => path.normalize(path.join(domainDir, f)))
    );

    const mockAlive = mockFiles.some(f =>
      isAlive(path.join(domainDir, f), domainFilesFull)
    );
    const interfaceAlive = interfaceFiles.some(f =>
      isAlive(path.join(domainDir, f), domainFilesFull)
    );

    const domainName = path.relative(SERVICES_DIR, domainDir);
    const record = {
      domain: domainName,
      firestoreFiles,
      mockFiles,
      interfaceFiles,
      mockAlive,
      interfaceAlive,
    };

    if (mockAlive || interfaceAlive) {
      keepList.push(record);
    } else {
      deleteList.push(record);
    }
  }

  console.log(`\nScanned ${serviceDomains.length} service domain folders.\n`);

  console.log(`═══ KEEP + ADD COMMENT (${keepList.length} domains) — mock and/or interface still alive ═══\n`);
  for (const r of keepList) {
    console.log(`  services/${r.domain}/`);
    console.log(`    firestore: ${r.firestoreFiles.join(', ')}`);
    console.log(`    mock:      ${r.mockFiles.join(', ') || '(none found)'} ${r.mockAlive ? '[ALIVE]' : '[orphaned]'}`);
    console.log(`    interface: ${r.interfaceFiles.join(', ') || '(none found)'} ${r.interfaceAlive ? '[ALIVE]' : '[orphaned]'}`);
    console.log('');
  }

  console.log(`\n═══ DELETE WHOLE FOLDER (${deleteList.length} domains) — mock and interface both dead/missing too ═══\n`);
  for (const r of deleteList) {
    console.log(`  services/${r.domain}/`);
    console.log(`    firestore: ${r.firestoreFiles.join(', ')}`);
    console.log(`    mock:      ${r.mockFiles.join(', ') || '(none found)'}`);
    console.log(`    interface: ${r.interfaceFiles.join(', ') || '(none found)'}`);
    console.log('');
  }

  console.log(`
NOTE: "alive" here means "imported by at least one other file in src/,
excluding files within this same domain folder." Same blind spots as
find-orphans.cjs apply (dynamic imports, index.html/config-only references,
etc.) — review before deleting, especially anything in the DELETE list
that surprises you.
`);
}

main();
