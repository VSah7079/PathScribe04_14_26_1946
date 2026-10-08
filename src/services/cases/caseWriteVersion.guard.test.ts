// src/services/cases/caseWriteVersion.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 458 (PS-71): every case save carries the version it was built from.
// Fails on any `.updateCase(` call with fewer than three arguments (case id,
// changes, expected version), outside caseWrite.ts and the creation
// follow-ups listed below. System saves use updateCaseWithRetry
// (caseWrite.ts); a person's save passes the version the page loaded.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Saves allowed without a version, with the reason. Only a write to a case
 * this same function created moments before belongs here: nobody else can
 * have saved it yet. Counts are exact, so a new unversioned save fails.
 */
export const UNVERSIONED_CASE_WRITES: Record<string, { count: number; reason: string }> = {};

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = resolve(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules') files(p, out); }
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

/** Each `.updateCase(` call and how many top-level arguments it has. */
export function updateCaseCalls(source: string): { line: number; args: number }[] {
  const s = stripComments(source);
  const calls: { line: number; args: number }[] = [];
  for (const m of s.matchAll(/\.updateCase\(/g)) {
    let depth = 1; let commas = 0; let j = m.index! + m[0].length; let empty = true;
    for (; j < s.length && depth > 0; j++) {
      const c = s[j];
      if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) depth--;
      else if (c === ',' && depth === 1) commas++;
      if (depth > 0 && !/\s/.test(c)) empty = false;
    }
    calls.push({ line: s.slice(0, m.index).split('\n').length, args: empty ? 0 : commas + 1 });
  }
  return calls;
}

const rel = (p: string) => relative(SRC, p).split(sep).join('/');

describe('PS-71: no case save without a version', () => {
  const all = files(SRC).filter(p => rel(p) !== 'services/cases/caseWrite.ts');

  it('finds case saves (guards the guard)', () => {
    const n = all.reduce((sum, p) => sum + updateCaseCalls(readFileSync(p, 'utf8')).length, 0);
    expect(n).toBeGreaterThan(50);
    expect(updateCaseCalls('x.updateCase(id, { a: f(1, 2) }, v); y.updateCase(id, u)')).toEqual([{ line: 1, args: 3 }, { line: 1, args: 2 }]);
  });

  it('every save passes the expected version, apart from the listed creation follow-ups', () => {
    const found: Record<string, number[]> = {};
    for (const p of all) {
      const missing = updateCaseCalls(readFileSync(p, 'utf8')).filter(c => c.args < 3).map(c => c.line);
      if (missing.length) found[rel(p)] = missing;
    }
    const unexpected = Object.entries(found)
      .filter(([file, lines]) => UNVERSIONED_CASE_WRITES[file]?.count !== lines.length)
      .map(([file, lines]) => `${file}: lines ${lines.join(', ')}`);
    expect(unexpected).toEqual([]);
    // A listed file that no longer has unversioned saves must come off the list.
    expect(Object.keys(UNVERSIONED_CASE_WRITES).filter(f => !found[f])).toEqual([]);
  });
});
