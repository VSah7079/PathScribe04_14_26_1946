// src/services/styleRules/fileSize.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 618 (PS-497, Pete, Oct 18, 2026): no big-bang refactor and no pilot deadline, so large files are split
// when a story touches them (CLAUDE.md rule 10). This guard makes that a ratchet:
//   • a source file over 1,000 lines (.ts, .tsx, .css; not tests, not data/locale JSON) is listed in
//     fileSizeBaseline.ts with the length it had when the guard went in;
//   • it may never grow;
//   • when it shrinks, the baseline is lowered to the new length (this test says the exact number), so it can
//     only go down; when it falls to 1,000 or below, its entry is removed;
//   • no new file may cross 1,000 lines.
// To record the lengths after a deliberate split: UPDATE_FILE_SIZE_BASELINE=1 npx vitest run <this file>.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILE_SIZE_BASELINE, FILE_SIZE_LIMIT } from './fileSizeBaseline';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = /\.(?:ts|tsx|css)$/;
const TEST = /\.(?:test|spec)\.(?:ts|tsx)$|(?:^|\/)__tests__\//;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (name !== 'node_modules') walk(full, out); continue; }
    const rel = relative(SRC, full).split('\\').join('/');
    if (SOURCE.test(name) && !TEST.test(rel)) out.push(rel);
  }
  return out;
}
const lineCount = (rel: string): number => readFileSync(resolve(SRC, rel), 'utf8').split('\n').length;

const sizes = (): Record<string, number> => {
  const big: Record<string, number> = {};
  for (const rel of walk(SRC)) { const n = lineCount(rel); if (n > FILE_SIZE_LIMIT) big[rel] = n; }
  return big;
};

describe(`no source file over ${FILE_SIZE_LIMIT} lines grows (Batch 618, PS-497)`, () => {
  if (process.env.UPDATE_FILE_SIZE_BASELINE) {
    it('writes the baseline', () => {
      const big = sizes();
      const body = Object.entries(big).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `  '${k}': ${v},`).join('\n');
      const file = resolve(dirname(fileURLToPath(import.meta.url)), 'fileSizeBaseline.ts');
      const head = readFileSync(file, 'utf8').split('export const FILE_SIZE_BASELINE')[0];
      writeFileSync(file, `${head}export const FILE_SIZE_BASELINE: Readonly<Record<string, number>> = {\n${body}\n};\n`);
      expect(Object.keys(big).length).toBeGreaterThan(0);
    });
    return;
  }
  const now = sizes();
  it('no file grows past its recorded length', () => {
    const grew = Object.entries(now).filter(([k, n]) => k in FILE_SIZE_BASELINE && n > FILE_SIZE_BASELINE[k]).map(([k, n]) => `${k}: ${FILE_SIZE_BASELINE[k]} -> ${n} lines (split the part you changed into its own module, CLAUDE.md rule 10)`);
    expect(grew).toEqual([]);
  });
  it(`no new file crosses ${FILE_SIZE_LIMIT} lines`, () => {
    const added = Object.entries(now).filter(([k]) => !(k in FILE_SIZE_BASELINE)).map(([k, n]) => `${k}: ${n} lines`);
    expect(added).toEqual([]);
  });
  it('a file that shrank has its baseline lowered (the ratchet only goes down)', () => {
    const lower = Object.entries(FILE_SIZE_BASELINE).filter(([k]) => k in now && now[k] < FILE_SIZE_BASELINE[k]).map(([k]) => `${k}: lower the baseline from ${FILE_SIZE_BASELINE[k]} to ${now[k]}`);
    expect(lower).toEqual([]);
  });
  it(`a file at or under ${FILE_SIZE_LIMIT} lines (or gone) is removed from the baseline`, () => {
    const stale = Object.keys(FILE_SIZE_BASELINE).filter(k => !(k in now)).map(k => `${k}: remove from fileSizeBaseline.ts`);
    expect(stale).toEqual([]);
  });
});
