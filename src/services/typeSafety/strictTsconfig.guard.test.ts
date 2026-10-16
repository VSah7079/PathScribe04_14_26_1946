// src/services/typeSafety/strictTsconfig.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 511 (PS-478): the app type-checks in full strict mode, and nothing is
// excluded from the check. This keeps it that way: a change that turns a
// strict flag back off, or excludes a file, fails here and has to be argued
// for instead of slipping through.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** tsconfig.json allows comments and trailing commas; strip them before parsing. */
function readJsonc(path: string): Record<string, unknown> {
  const text = readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'\\])\/\/.*$/gm, '$1')
    .replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(text) as Record<string, unknown>;
}

const TSCONFIG = readJsonc(join(process.cwd(), 'tsconfig.json'));
const OPTIONS = TSCONFIG.compilerOptions as Record<string, unknown>;

const STRICT_FAMILY = [
  'noImplicitAny', 'strictNullChecks', 'strictFunctionTypes', 'strictBindCallApply',
  'strictPropertyInitialization', 'noImplicitThis', 'alwaysStrict', 'useUnknownInCatchVariables',
];

describe('strict type-checking stays on (PS-478)', () => {
  it('tsconfig.json has "strict": true', () => {
    expect(OPTIONS.strict).toBe(true);
  });

  it('no strict flag is switched back off one by one', () => {
    expect(STRICT_FAMILY.filter(flag => OPTIONS[flag] === false)).toEqual([]);
  });

  it('nothing in the app is excluded from type-checking', () => {
    expect(TSCONFIG.exclude).toEqual(['node_modules']);
  });
});
