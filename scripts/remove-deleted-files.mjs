#!/usr/bin/env node
// scripts/remove-deleted-files.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Batch 507: a delta zip can't delete files, so retired files are listed in
// DELETED_FILES.txt at the repo root. This removes every listed path that is
// still present (a path ending in "/" is a whole folder). Safe to run any
// number of times; it prints what it removed.
//
//   npm run cleanup:deleted            remove them
//   npm run cleanup:deleted -- --dry   only list what would be removed
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The paths DELETED_FILES.txt lists: the first word of a line, when it looks like a path. */
export function listedPaths(text) {
  return text.split(/\r?\n/)
    .map(line => line.trim().split(/\s+/)[0] ?? '')
    .filter(p => /^[\w.-]+(\/[\w.-]+)*\/?$/.test(p) && (p.endsWith('/') || /\.[\w]+$/.test(p)) && !/^\d/.test(p));
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const dry = process.argv.includes('--dry');
  const paths = listedPaths(readFileSync(resolve(ROOT, 'DELETED_FILES.txt'), 'utf8'));
  let removed = 0;
  for (const p of paths) {
    const full = resolve(ROOT, p);
    if (!full.startsWith(ROOT + sep)) continue;
    if (!existsSync(full)) continue;
    if (!dry) rmSync(full, { recursive: true, force: true });
    console.log(`${dry ? 'would remove' : 'removed'}  ${relative(ROOT, full)}`);
    removed++;
  }
  console.log(removed ? `${removed} path(s) ${dry ? 'to remove' : 'removed'}.` : 'Nothing to remove: every listed file is already gone.');
}
