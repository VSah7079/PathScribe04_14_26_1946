// src/services/apiServer/directMockImports.guard.test.ts
// Batch 670 (Pete, Oct 25 2026): with an API address, a service must reach the
// server's version. Code that imports a mock service directly (instead of the
// `…Instance` that chooses) keeps using browser data in a server build.
//
//   • Audit: no exception. Every audit write goes through `auditService`.
//   • Everything else: a ratchet (directMockImportBaseline.ts). The list can
//     only shrink; a new direct mock import fails here.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { DIRECT_MOCK_IMPORT_BASELINE } from './directMockImportBaseline';

const SRC = join(__dirname, '..', '..');
const IMPORT = /(?:from\s+|import\(\s*)['"][^'"]*\/(mock\w*Service)['"]/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules') walk(p, out); continue; }
    if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** file (relative to src) → mock modules it imports as values, outside mocks and instances. */
function directImports(): Record<string, string[]> {
  const found: Record<string, string[]> = {};
  for (const file of walk(SRC)) {
    const rel = relative(SRC, file).split('\\').join('/');
    const base = rel.split('/').pop() ?? '';
    if (base.startsWith('mock') || base.endsWith('Instance.ts') || rel === 'services/index.ts') continue;
    const text = readFileSync(file, 'utf8');
    const mods = new Set<string>();
    for (const line of text.split('\n')) {
      if (/^\s*(\/\/|\*)/.test(line) || /^\s*import\s+type\b/.test(line)) continue;
      for (const m of line.matchAll(IMPORT)) mods.add(m[1]);
    }
    if (mods.size) found[rel] = [...mods].sort();
  }
  return found;
}

describe('direct mock imports (Batch 670)', () => {
  const found = directImports();
  it('nothing writes audit entries to the mock directly', () => {
    expect(Object.entries(found).filter(([, m]) => m.includes('mockAuditService')).map(([f]) => f)).toEqual([]);
  });
  it('no new direct mock import (the baseline only shrinks)', () => {
    const added = Object.entries(found).flatMap(([f, mods]) =>
      mods.filter(m => !(DIRECT_MOCK_IMPORT_BASELINE[f] ?? []).includes(m)).map(m => `${f}: ${m}`));
    expect(added).toEqual([]);
  });
  it('a file that stopped importing a mock is removed from the baseline', () => {
    const stale = Object.entries(DIRECT_MOCK_IMPORT_BASELINE).flatMap(([f, mods]) =>
      mods.filter(m => !(found[f] ?? []).includes(m)).map(m => `${f}: ${m}`));
    expect(stale).toEqual([]);
  });
});
