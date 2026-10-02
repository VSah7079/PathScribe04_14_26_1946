// src/services/authorization/capabilityDocs.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 406 (Pete: "Don't forget … System Capabilities"). The server contract,
// docs/architecture/AUTHORIZATION_API.md, lists every capability in its
// "Capability catalog (System Capabilities)" section, with its risk and
// default roles. This fails when the catalog and that list disagree, so the
// documentation can't fall behind the code again (it had missed everything
// added after Batch 380).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPABILITY_CATALOG } from './capabilityCatalog';

const DOC = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/architecture/AUTHORIZATION_API.md');

function catalogSection(): string {
  const text = readFileSync(DOC, 'utf8');
  const start = text.indexOf('<!-- capability-catalog:start -->');
  const end = text.indexOf('<!-- capability-catalog:end -->');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end);
}

/** Documented rows: key → risk. */
function documentedRows(): Map<string, string> {
  const rows = new Map<string, string>();
  for (const line of catalogSection().split('\n')) {
    const m = /^\| `([a-z0-9:-]+)` \|[^|]*\| (high|standard) \|/.exec(line);
    if (m) rows.set(m[1], m[2]);
  }
  return rows;
}

describe('AUTHORIZATION_API.md capability catalog', () => {
  it('lists every catalog capability once, with its risk, and nothing that is not in the catalog', () => {
    const rows = documentedRows();
    const keys = CAPABILITY_CATALOG.map(c => c.key);
    expect(keys.filter(k => !rows.has(k))).toEqual([]);
    expect([...rows.keys()].filter(k => !keys.includes(k as never))).toEqual([]);
    for (const c of CAPABILITY_CATALOG) expect(rows.get(c.key), c.key).toBe(c.risk);
  });
});
