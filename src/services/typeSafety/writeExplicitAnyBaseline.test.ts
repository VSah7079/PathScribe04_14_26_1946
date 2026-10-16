// Batch 504: run with WRITE_ANY_BASELINE=1 to regenerate explicitAnyBaseline.json
// (only ever to LOWER counts after removing `any`; the guard refuses increases).
import { it } from 'vitest';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { countExplicitAny } from './countExplicitAny';

it.runIf(process.env.WRITE_ANY_BASELINE === '1')('writes the explicit-any baseline', () => {
  const SRC = resolve(process.cwd(), 'src');
  const files: string[] = [];
  const walk = (d: string) => { for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) { if (n !== 'node_modules') walk(f); } else if (/\.(ts|tsx)$/.test(n) && !/\.(test|auditTest)\.tsx?$/.test(n) && !n.endsWith('.d.ts')) files.push(f); } };
  walk(SRC);
  const counts: Record<string, number> = {};
  for (const f of files.sort()) { const n = countExplicitAny(f, readFileSync(f, 'utf8')); if (n > 0) counts[relative(SRC, f).split(sep).join('/')] = n; }
  writeFileSync(resolve(SRC, 'services/typeSafety/explicitAnyBaseline.json'), `${JSON.stringify(counts, null, 2)}\n`);
});
