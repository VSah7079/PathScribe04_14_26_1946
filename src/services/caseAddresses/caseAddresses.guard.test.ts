// src/services/caseAddresses/caseAddresses.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 446: no patient identifier in a page address. Case pages are opened
// through useOpenCase / caseAddresses.addressOf, which address them by the
// case's support reference. This fails if any other source file builds a
// case address by hand, or puts an MRN or patient id in an address.
// Code only (comments stripped), test files excluded.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
const walk = (d: string): string[] => readdirSync(d).flatMap(n => {
  const p = resolve(d, n);
  if (statSync(p).isDirectory()) return n === 'node_modules' || n === '__tests__' ? [] : walk(p);
  return /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) && !/\.d\.ts$/.test(n) ? [p] : [];
});
const FILES = walk(SRC).map(f => ({ rel: relative(SRC, f).split(sep).join('/'), text: code(readFileSync(f, 'utf8')) }));

/** The one place case addresses are built. */
const BUILDER = 'services/caseAddresses/caseAddresses.ts';

const RULES: { name: string; pattern: RegExp }[] = [
  { name: 'a case page address built by hand', pattern: /[`'"]\/(case|report|cytology-worklist)\/\$\{/ },
  { name: 'a case in the add-on orders address', pattern: /add-on-orders\?case=\$\{/ },
  { name: 'an MRN or patient id in an address', pattern: /[?&](mrn|patientId|patient|accession|dob)=\$\{/ },
];

describe('no patient identifier in a page address (Batch 446)', () => {
  it('finds the source (guards the guard)', () => {
    expect(FILES.some(f => f.rel === BUILDER)).toBe(true);
    expect(FILES.length).toBeGreaterThan(500);
  });
  for (const rule of RULES) {
    it(`nowhere but ${BUILDER}: ${rule.name}`, () => {
      expect(FILES.filter(f => f.rel !== BUILDER && rule.pattern.test(f.text)).map(f => f.rel)).toEqual([]);
    });
  }
});
