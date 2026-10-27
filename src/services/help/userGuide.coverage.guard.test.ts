// src/services/help/userGuide.coverage.guard.test.ts
// Batch 667: every short on-screen label of a screen file is explained in the User Guide (or the English Administrator
// Guide), or is listed with a reason in docs/user-guide/coverage-ignore.json. Same rule as scripts/user-guide/coverage.py.
// A new screen or control that is not written up fails this test; add it to the right article, or list it with a reason.
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const norm = (s: string) => s.toLowerCase().replace(/\{\{[^}]*\}\}/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const files = (dir: string, ok: (f: string) => boolean, skip: (d: string) => boolean = () => false): string[] =>
  !existsSync(dir) ? [] : readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return skip(n) ? [] : files(p, ok, skip);
    return ok(n) ? [p] : [];
  });
const flatten = (o: Record<string, unknown>, p = '', out: Record<string, string> = {}): Record<string, string> => {
  for (const [k, v] of Object.entries(o)) {
    const q = p ? `${p}.${k}` : k;
    if (typeof v === 'string') out[q] = v; else if (v && typeof v === 'object') flatten(v as Record<string, unknown>, q, out);
  }
  return out;
};

describe('User Guide label coverage (Batch 667)', () => {
  const labels = flatten(JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/en.json'), 'utf8')));
  const guide = [
    ...files(resolve(root, 'docs/user-guide/src'), n => n.endsWith('.md')),
    ...files(resolve(root, 'docs/admin-guide/src'), n => n.endsWith('.md'), d => ['fr', 'de', 'nl', 'ko', 'es'].includes(d)),
  ].map(f => readFileSync(f, 'utf8')).join('\n');
  const hay = ` ${norm(guide)} `;
  const scope: string[] = JSON.parse(readFileSync(resolve(root, 'docs/user-guide/coverage-scope.json'), 'utf8')).adminGuideAreas;
  const ignore: Record<string, string> = JSON.parse(readFileSync(resolve(root, 'docs/user-guide/coverage-ignore.json'), 'utf8'));
  const keyRe = /\bt\(\s*['"`]([A-Za-z0-9_.-]+)['"`]/g;

  it('every short on-screen label is in the guide or listed in coverage-ignore.json with a reason', () => {
    const missing: string[] = [];
    const srcDir = resolve(root, 'src');
    for (const f of files(srcDir, n => n.endsWith('.tsx') && !n.includes('.test.'), d => d === 'node_modules')) {
      const rel = relative(srcDir, f).split('\\').join('/');
      if (scope.some(a => rel.startsWith(`${a}/`))) continue;
      for (const k of new Set([...readFileSync(f, 'utf8').matchAll(keyRe)].map(m => m[1]))) {
        const v = labels[k];
        if (!v || v.length < 3 || v.length > 40 || norm(v).length < 3) continue;
        if (`${rel}::${k}` in ignore) continue;
        if (!hay.includes(` ${norm(v)} `)) missing.push(`${rel}::${k}  "${v}"`);
      }
    }
    expect(missing, 'Explain each label in the User Guide, or list it in docs/user-guide/coverage-ignore.json with a reason').toEqual([]);
  });

  it('every ignore entry has a reason, and points at a label that still exists', () => {
    for (const [key, why] of Object.entries(ignore)) {
      expect(why.length, key).toBeGreaterThanOrEqual(10);
      const [file, k] = key.split('::');
      expect(existsSync(resolve(root, 'src', file)), `${key}: file missing`).toBe(true);
      expect(k in labels, `${key}: key missing`).toBe(true);
    }
  });
});
