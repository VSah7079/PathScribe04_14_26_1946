// src/services/deploymentReadiness/deploymentReadinessReview.guard.test.ts
// Batch 537 (PS-539, phase 2a): the deployment readiness review
// (docs/architecture/DEPLOYMENT_READINESS_REVIEW.md) names the code it rates.
// CLAUDE.md rule 6: docs lag the code. This keeps every file the review
// cites real, so a rename or deletion makes the review fail here instead of
// quietly pointing at nothing.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const REVIEW = join(ROOT, 'docs/architecture/DEPLOYMENT_READINESS_REVIEW.md');

/** Proposed, not yet built: named in the review as things to create. */
const PROPOSED = new Set(['/config.json']);

function allFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'venv', 'test-results', 'e2e-results'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) allFiles(p, out); else out.push(p.slice(ROOT.length + 1).replace(/\\/g, '/'));
  }
  return out;
}

describe('DEPLOYMENT_READINESS_REVIEW.md', () => {
  const text = readFileSync(REVIEW, 'utf8');
  const cited = [...new Set([...text.matchAll(/`([A-Za-z0-9_./-]+\.(?:ts|tsx|py|md|json|mjs))`/g)].map(m => m[1]))];
  const files = allFiles(ROOT);

  it('cites real code', () => {
    expect(cited.length).toBeGreaterThan(30);
  });

  it('every file it names exists (by path, or by its tail under the repo)', () => {
    const missing = cited.filter(c => !PROPOSED.has(c) && !files.some(f => f === c || f.endsWith(`/${c.replace(/^\//, '')}`)));
    expect(missing).toEqual([]);
  });

  it('records the decisions Pete owes (phase 2b) and the findings', () => {
    for (const d of ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']) expect(text).toContain(`| ${d}`);
    // Batch 541: Pete decided all seven (Oct 12-13); each row records the decision and his verification check.
    for (const d of ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']) {
      const row = text.split('\n').find(l => l.startsWith(`| ${d} `));
      expect(row, d).toMatch(/\*\*Decided \(Oct 1[23]\)/);
      expect(row!.split('|').filter(c => c.trim()).length, `${d} has its verification column`).toBe(5);
    }
    for (const f of ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']) expect(text).toContain(`**${f}.**`);
  });
});
