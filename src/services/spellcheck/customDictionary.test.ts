// src/services/spellcheck/customDictionary.test.ts — PS-342 (Batch 336), AC5.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeCustomWord } from './customDictionaryRules';

// Batch 432: the facility dictionary needs config:facilities:manage; a personal
// word can be removed only by its owner.
let canManageFacilities = false;
let sessionUserId: string | undefined = 'p1';
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: canManageFacilities }) },
}));
vi.mock('../auth/caseAccessControl', () => ({ getSessionUser: () => (sessionUserId ? { id: sessionUserId, firstName: 'Dee', lastName: 'Path' } : null) }));

import { mockCustomDictionaryService as svc } from './mockCustomDictionaryService';
import { mockAuditService } from '../auditlog/mockAuditService';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } };
});

const admin = { userId: 'a1', userName: 'Lab Admin', role: 'admin' };
const pathologist = { userId: 'p1', userName: 'Dr Path', role: 'pathologist' };

describe('custom dictionaries', () => {
  it('accepts single words only', () => {
    expect(normalizeCustomWord("  O’Brien ")).toEqual({ ok: true, word: "O'Brien" });
    expect(normalizeCustomWord('two words')).toEqual({ ok: false, code: 'NOT_A_WORD' });
    expect(normalizeCustomWord(' ')).toEqual({ ok: false, code: 'EMPTY' });
    expect(normalizeCustomWord('x'.repeat(65))).toEqual({ ok: false, code: 'TOO_LONG' });
  });

  it('personal words: only the owner removes one (Batch 432)', async () => {
    sessionUserId = 'p1';
    await svc.addPersonal('p1', 'pHx', pathologist);
    sessionUserId = 'p2';
    expect(await svc.removePersonal('p1', 'phx')).toMatchObject({ ok: false, code: 'NOT_PERMITTED' });
    sessionUserId = 'p1';
    expect(await svc.removePersonal('p1', 'phx')).toEqual({ ok: true, data: [] });
  });

  it('personal words: add once, remove', async () => {
    sessionUserId = 'p1';
    await svc.addPersonal('p1', 'pHx', pathologist);
    const again = await svc.addPersonal('p1', 'PHX', pathologist);
    expect(again.ok && again.data.map(e => e.word)).toEqual(['pHx']);
    expect(await svc.listPersonal('p2')).toEqual({ ok: true, data: [] });
    expect(await svc.removePersonal('p1', 'phx')).toEqual({ ok: true, data: [] });
    expect(await svc.removePersonal('p1', 'phx')).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });

  it('personal words are audited without the word (Batch 651); refused, duplicate and not-found writes leave no entry', async () => {
    sessionUserId = 'p1';
    await svc.addPersonal('p1', 'Zyxwvut', pathologist);
    await svc.addPersonal('p1', 'zyxwvut', pathologist); // duplicate
    sessionUserId = 'p2';
    await svc.removePersonal('p1', 'zyxwvut'); // refused: not the owner
    sessionUserId = 'p1';
    await svc.removePersonal('p1', 'zyxwvut');
    await svc.removePersonal('p1', 'zyxwvut'); // not found
    const logs = await mockAuditService.getAuditLogs({});
    const mine = (logs.ok ? logs.data : []).filter(l => /Personal spelling dictionary/.test(l.event)).slice(0, 2);
    expect(mine.map(l => [l.event, l.user])).toEqual([
      ['Personal spelling dictionary word removed', 'Dee Path'],
      ['Personal spelling dictionary word added', 'Dr Path'],
    ]);
    expect(JSON.stringify(mine)).not.toMatch(/zyxwvut/i);
    expect(mine[0].detail).toContain('7 characters');
    // Batch 655: a fingerprint lets an auditor confirm a suspected word; the word itself is still not logged.
    const { sha256Hex } = await import('../registrySubmission/sha256');
    expect(mine[0].detail).toContain(`fingerprint ${sha256Hex('p1:zyxwvut').slice(0, 16)}`);
    expect(mine[0].detail).toBe(mine[1].detail.replace('added to', 'removed from'));
  });

  it('facility words: config:facilities:manage only, immediate, audited in English', async () => {
    canManageFacilities = false;
    expect(await svc.addFacility('LAB1', 'megablock', pathologist)).toMatchObject({ ok: false, code: 'NOT_PERMITTED' });
    canManageFacilities = true;
    const added = await svc.addFacility('LAB1', 'megablock', admin, 'Fenwick Pathology Lab');
    expect(added.ok && added.data.map(e => [e.word, e.addedBy.userName])).toEqual([['megablock', 'Lab Admin']]);
    await svc.addFacility('LAB1', 'Megablock', admin, 'Fenwick Pathology Lab'); // duplicate: no second audit entry
    await svc.removeFacility('LAB1', 'megablock', admin, 'Fenwick Pathology Lab');
    const logs = await mockAuditService.getAuditLogs({});
    const mine = (logs.ok ? logs.data : []).filter(l => /^Facility spelling dictionary/.test(l.event));
    expect(mine.map(l => [l.event, l.detail, l.user])).toEqual([
      ['Facility spelling dictionary word removed', '"megablock" removed from the spelling dictionary of Fenwick Pathology Lab', 'Lab Admin'],
      ['Facility spelling dictionary word added', '"megablock" added to the spelling dictionary of Fenwick Pathology Lab', 'Lab Admin'],
    ]);
  });
});
