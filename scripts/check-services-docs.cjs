#!/usr/bin/env node
/**
 * check-services-docs.cjs
 * ─────────────────────────────────────────────────────────────────────────
 * Keeps services/README.md (the master index) honest against reality.
 * Run this any time you're unsure whether the docs are in sync — don't
 * rely on remembering to update things by hand.
 *
 * Checks three things:
 *   1. Every subfolder of src/services/ has its own README.md
 *   2. Every subfolder of src/services/ is listed in the master
 *      src/services/README.md's index table
 *   3. Files elsewhere in src/ (outside services/) whose name matches a
 *      service-like pattern (*Service.ts, I*Service.ts, mock*Service.ts)
 *      — these may be misplaced and worth relocating into services/
 *
 * Usage: node check-services-docs.cjs
 * Run from the project root (same folder as tsconfig.json).
 * ─────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const SERVICES_DIR = path.join(SRC_DIR, 'services');
const MASTER_README = path.join(SERVICES_DIR, 'README.md');

function main() {
  if (!fs.existsSync(SERVICES_DIR)) {
    console.error(`ERROR: ${SERVICES_DIR} not found.`);
    process.exit(1);
  }

  // ── Check 1 & 2: per-folder READMEs + master index coverage ───────────
  const subfolders = fs.readdirSync(SERVICES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();

  const missingReadme = subfolders.filter(
    f => !fs.existsSync(path.join(SERVICES_DIR, f, 'README.md'))
  );

  let masterContent = '';
  if (fs.existsSync(MASTER_README)) {
    masterContent = fs.readFileSync(MASTER_README, 'utf8');
  } else {
    console.log('WARNING: services/README.md (master index) does not exist yet.\n');
  }

  const notInMasterIndex = subfolders.filter(f => !masterContent.includes(f));

  console.log(`=== Check 1: subfolders missing their own README.md (${missingReadme.length}) ===`);
  if (missingReadme.length === 0) console.log('  None — all good.');
  else missingReadme.forEach(f => console.log(`  services/${f}/`));

  console.log(`\n=== Check 2: subfolders not mentioned in services/README.md (${notInMasterIndex.length}) ===`);
  if (notInMasterIndex.length === 0) console.log('  None — all good.');
  else notInMasterIndex.forEach(f => console.log(`  services/${f}/`));

  // ── Check 3: service-pattern files living outside services/ ───────────
  const SERVICE_PATTERNS = [
    /Service\.ts$/,
    /^I[A-Z].*Service\.tsx?$/,
    /^mock[A-Z].*Service\.tsx?$/,
    /^firestore[A-Z].*Service\.tsx?$/,
  ];

  function walkDir(dir, fileList = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walkDir(fullPath, fileList);
      else fileList.push(fullPath);
    }
    return fileList;
  }

  const allSrcFiles = walkDir(SRC_DIR);
  const misplacedCandidates = allSrcFiles.filter(f => {
    if (f.startsWith(SERVICES_DIR + path.sep)) return false; // inside services/, fine
    const base = path.basename(f);
    return SERVICE_PATTERNS.some(re => re.test(base));
  });

  console.log(`\n=== Check 3: service-pattern files OUTSIDE services/ (${misplacedCandidates.length}) — review, may be misplaced ===`);
  if (misplacedCandidates.length === 0) console.log('  None found.');
  else misplacedCandidates.forEach(f => console.log(`  ${path.relative(PROJECT_ROOT, f)}`));

  console.log('\nNOTE: Check 3 is pattern-based and can have false positives (e.g. a');
  console.log('component genuinely named "...Service" for a good reason). Review');
  console.log('each hit before moving anything — this is a candidate list, not a');
  console.log('verdict.');
}

main();
