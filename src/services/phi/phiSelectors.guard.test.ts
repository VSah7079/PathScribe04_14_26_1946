// src/services/phi/phiSelectors.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Every data-phi / data-pii kind used anywhere in src is redacted by the
// support-ticket screenshot (hooks/useScreenCapture.ts → PHI_SELECTORS).
// A per-kind selector list once left data-phi="diagnosis", "finding" and
// "case" unredacted while the static audit (phiTagging.guard.test.ts) counted
// them as tagged. No exception list.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHI_SELECTORS, isRedactedByPhiSelectors } from '../phiSelectors';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const IGNORED = /(\.test\.|\.d\.ts$)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx|ts|jsx|js)$/.test(name) && !IGNORED.test(path) ? [path] : [];
  });
}

type Attr = 'data-phi' | 'data-pii';
const KIND = /^[A-Za-z][\w-]*$/;

/** Every literal value given to data-phi / data-pii in a file, including string literals inside `{…}` expressions. */
function phiKindsIn(text: string): { attr: Attr; value: string }[] {
  const found: { attr: Attr; value: string }[] = [];
  const literal = /\b(data-phi|data-pii)="([^"]*)"/g;
  for (const m of text.matchAll(literal)) {
    if (KIND.test(m[2])) found.push({ attr: m[1] as Attr, value: m[2] });
  }
  const expr = /\b(data-phi|data-pii)=\{([^}]*)\}/g;
  for (const m of text.matchAll(expr)) {
    for (const s of m[2].matchAll(/['"`]([^'"`]*)['"`]/g)) {
      if (KIND.test(s[1])) found.push({ attr: m[1] as Attr, value: s[1] });
    }
  }
  return found;
}

describe('screenshot redaction covers every data-phi / data-pii kind (PS-72)', () => {
  const files = sourceFiles(SRC);
  const uses = files.flatMap(file =>
    phiKindsIn(readFileSync(file, 'utf8')).map(k => ({ ...k, where: relative(SRC, file) })));

  it('finds the kinds the app uses (the scan is live, not vacuous)', () => {
    const phiKinds = new Set(uses.filter(u => u.attr === 'data-phi').map(u => u.value));
    expect([...phiKinds]).toEqual(expect.arrayContaining(['accession', 'name', 'mrn', 'true', 'diagnosis', 'finding', 'case']));
  });

  it('every kind used in src is matched by PHI_SELECTORS', () => {
    const missed = uses
      .filter(u => !isRedactedByPhiSelectors(u.attr, u.value))
      .map(u => `${u.where}: ${u.attr}="${u.value}"`);
    expect(missed).toEqual([]);
  });

  it('kinds set at runtime (data-phi={kind}) are covered too: any value is redacted', () => {
    expect(isRedactedByPhiSelectors('data-phi', 'a-kind-nobody-has-used-yet')).toBe(true);
    expect(isRedactedByPhiSelectors('data-pii', 'a-kind-nobody-has-used-yet')).toBe(true);
  });

  it('the check itself fails on a per-kind list that misses a kind', () => {
    const perKind = ['[data-phi="name"]', '[data-phi="accession"]'];
    expect(isRedactedByPhiSelectors('data-phi', 'name', perKind)).toBe(true);
    expect(isRedactedByPhiSelectors('data-phi', 'diagnosis', perKind)).toBe(false);
  });

  it('extracts literal and expression values', () => {
    expect(phiKindsIn(`<td data-phi="case">x</td><b data-phi={ok ? 'accession' : undefined} />`))
      .toEqual([{ attr: 'data-phi', value: 'case' }, { attr: 'data-phi', value: 'accession' }]);
  });

  it('PHI_SELECTORS are valid, unique selectors', () => {
    expect(new Set(PHI_SELECTORS).size).toBe(PHI_SELECTORS.length);
  });
});
