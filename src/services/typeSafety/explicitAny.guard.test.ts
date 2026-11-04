// src/services/typeSafety/explicitAny.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 504 (PS-470: "a rule against new explicit any"; PS-478 type safety):
// no new explicit `any` in app code (tests excluded). Switching ESLint's
// no-explicit-any on would fail on the ~1,700 that already exist, so it stays
// off and this ratchet does the job instead: each file may have at most the
// count recorded in explicitAnyBaseline.json, and a file not listed may have
// none. The baseline only ever goes down — after removing `any` from a file,
// lower its count (or regenerate: WRITE_ANY_BASELINE=1 npx vitest run
// src/services/typeSafety/writeExplicitAnyBaseline.test.ts). Same pattern as
// deploymentReadiness/deploymentBaseline.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { countExplicitAny } from './countExplicitAny';
import baseline from './explicitAnyBaseline.json';

const SRC = resolve(process.cwd(), 'src');
const BASE = baseline as Record<string, number>;

function appFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const f = join(d, n);
      if (statSync(f).isDirectory()) { if (n !== 'node_modules') walk(f); }
      else if (/\.(ts|tsx)$/.test(n) && !/\.(test|auditTest)\.tsx?$/.test(n) && !n.endsWith('.d.ts')) out.push(f);
    }
  };
  walk(SRC);
  return out;
}

describe('no new explicit any in app code (PS-470, PS-478)', () => {
  const counts = new Map(appFiles().map(f => [relative(SRC, f).split(sep).join('/'), countExplicitAny(f, readFileSync(f, 'utf8'))]));

  it('finds the source files (guards the guard)', () => {
    expect(counts.size).toBeGreaterThan(1000);
    expect(countExplicitAny('x.ts', 'let a: any; const b = c as any; // any')).toBe(2);
  });

  it('no file has more explicit any than its baseline', () => {
    const grown = [...counts].filter(([f, n]) => n > (BASE[f] ?? 0)).map(([f, n]) => `${f}: ${n} (baseline ${BASE[f] ?? 0})`);
    expect(grown).toEqual([]);
  });

  it('the baseline lists no file that is gone (keep it honest)', () => {
    expect(Object.keys(BASE).filter(f => !existsSync(resolve(SRC, f)))).toEqual([]);
  });
});
