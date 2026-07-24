#!/usr/bin/env node
/**
 * check-organization.cjs
 * ─────────────────────────────────────────────────────────────────────────
 * Scans a directory tree for two specific, real risk patterns found
 * tonight -- NOT a general linter, deliberately narrow:
 *
 *   1. STALE HEADER PATH COMMENTS: a file's own header comment
 *      (e.g. "// src/pages/Foo/Bar.tsx") claiming a path different from
 *      where the file actually lives. Found repeatedly tonight
 *      (RoleDictionary.tsx claiming Config/Users/ while living in
 *      Config/Staff/, several others) -- usually harmless on its own,
 *      but it's exactly the kind of small inconsistency that erodes
 *      trust in a critical file's own self-documentation.
 *
 *   2. DUPLICATE FILENAMES ACROSS FOLDERS: the same filename existing
 *      in 2+ places. Sometimes legitimate (index.tsx repeats by
 *      convention), but this is exactly the shape of the real
 *      LogoutWarningModal.tsx bug -- two components with the same name,
 *      different behavior, real support-analyst confusion risk. Every
 *      hit needs a human look, not an assumption either way.
 *
 * This does NOT judge whether a file's FOLDER is conceptually correct
 * (e.g. "should this be in Config/Protocols/ or Config/Templates/?") --
 * that needs real judgment about dependency direction and purpose, the
 * same kind of call made for specimenTypes.ts earlier this session.
 *
 * Usage:
 *   node check-organization.cjs <directory>
 *   node check-organization.cjs ../../src/pages
 *
 * Read-only. Produces a report, changes nothing.
 * ─────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
if (!targetDir) {
  console.log('Usage: node check-organization.cjs <directory>');
  process.exit(1);
}

const IGNORE_DUPLICATES = new Set([
  'index.tsx', 'index.ts',           // real, repeated-by-convention pattern
  'types.ts', 'README.md',
]);

// Matches a leading header comment line referencing a src/ path, e.g.:
//   // src/pages/Foo/Bar.tsx
//   * src/pages/Foo/Bar.tsx
//   // components/Foo/Bar.tsx   (also accept without leading src/)
const PATH_COMMENT_RE = /^\s*(?:\/\/|\*)\s*(?:src\/)?((?:[\w.-]+\/)*[\w.-]+\.tsx?)\s*$/;

function walk(dir, fileList = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, fileList);
    } else if (/\.tsx?$/.test(entry.name)) {
      fileList.push(full);
    }
  }
  return fileList;
}

function checkStalePaths(files, rootDir) {
  const issues = [];
  for (const file of files) {
    const relPath = path.relative(path.dirname(rootDir), file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/).slice(0, 8); // only check the real header, first few lines

    for (const line of lines) {
      const m = line.match(PATH_COMMENT_RE);
      if (!m) continue;
      const claimedPath = m[1];
      // Compare just the tail -- claimed comments are often relative to src/
      if (!relPath.endsWith(claimedPath) && claimedPath !== path.basename(file)) {
        issues.push({ file: relPath, claimed: claimedPath });
      }
      break; // only check the first path-shaped comment line found
    }
  }
  return issues;
}

function checkDuplicateNames(files, rootDir) {
  const byName = {};
  for (const file of files) {
    const name = path.basename(file);
    if (IGNORE_DUPLICATES.has(name)) continue;
    const relPath = path.relative(path.dirname(rootDir), file).replace(/\\/g, '/');
    (byName[name] = byName[name] || []).push(relPath);
  }
  return Object.entries(byName).filter(([, paths]) => paths.length > 1);
}

function main() {
  const resolvedDir = path.resolve(targetDir);
  if (!fs.existsSync(resolvedDir)) {
    console.log(`ERROR: directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  console.log(`Scanning ${resolvedDir} ...\n`);
  const files = walk(resolvedDir);
  console.log(`${files.length} .ts/.tsx files found.\n`);

  console.log('═══ 1. STALE HEADER PATH COMMENTS ═══');
  const staleIssues = checkStalePaths(files, resolvedDir);
  if (staleIssues.length === 0) {
    console.log('None found.\n');
  } else {
    staleIssues.forEach(i => console.log(`  ${i.file}\n    header claims: ${i.claimed}`));
    console.log(`\n${staleIssues.length} file(s) with a header comment not matching their real location.\n`);
  }

  console.log('═══ 2. DUPLICATE FILENAMES ACROSS FOLDERS ═══');
  const dupes = checkDuplicateNames(files, resolvedDir);
  if (dupes.length === 0) {
    console.log('None found.\n');
  } else {
    dupes.forEach(([name, paths]) => {
      console.log(`  ${name}  (${paths.length} locations)`);
      paths.forEach(p => console.log(`    - ${p}`));
    });
    console.log(`\n${dupes.length} filename(s) appearing in more than one folder. Each needs a real look -- may be a genuine duplicate-component risk (like LogoutWarningModal.tsx was), or may be intentional/unrelated files that happen to share a name.\n`);
  }

  console.log('Done. This is a report only -- nothing was changed.');
}

main();
