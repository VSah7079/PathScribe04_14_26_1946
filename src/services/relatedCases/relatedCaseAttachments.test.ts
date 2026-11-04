import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachedRelatedCases, freezeRelatedCases, getRelatedCaseAttachment, resetRelatedCaseAttachmentsForTests,
  setRelatedCases, type RelatedCaseDeps,
} from './relatedCaseAttachments';
import { MAX_RELATED_CASES } from './relatedCaseRules';
import type { RelatedCaseSnapshot } from './relatedCaseTypes';

const snap = (id: string): RelatedCaseSnapshot => ({
  sourceCaseId: id, accession: `S26-${id}`, releasedAt: '2026-01-01T00:00:00Z', sourceVersion: 1, specimens: [], diagnosis: 'Secret diagnosis', copyToPhysicians: [],
});

function deps(allowed = true) {
  const audit = vi.fn();
  const d: RelatedCaseDeps = { enforce: vi.fn(async () => ({ allowed })), audit, now: () => '2026-10-18T00:00:00Z' };
  return { d, audit };
}

describe('related case attachments', () => {
  beforeEach(() => resetRelatedCaseAttachmentsForTests());

  it('saves the signer\'s choice and audits counts only', async () => {
    const { d, audit } = deps();
    const r = await setRelatedCases({ caseId: 'cur', cases: [snap('a')], user: 'u1' }, d);
    expect(r.ok).toBe(true);
    expect(attachedRelatedCases('cur')).toHaveLength(1);
    const entry = audit.mock.calls[0][0];
    expect(entry.event).toBe('RELATED_CASES_ATTACHED');
    expect(entry.detail).not.toContain('S26-a');
    expect(entry.detail).not.toContain('Secret diagnosis');
  });

  it('refuses without the permission', async () => {
    const { d } = deps(false);
    const r = await setRelatedCases({ caseId: 'cur', cases: [snap('a')], user: 'u1' }, d);
    expect(r).toEqual({ ok: false, reason: 'notPermitted' });
    expect(attachedRelatedCases('cur')).toEqual([]);
  });

  it('refuses more than the limit', async () => {
    const { d } = deps();
    const many = Array.from({ length: MAX_RELATED_CASES + 1 }, (_, i) => snap(`c${i}`));
    expect(await setRelatedCases({ caseId: 'cur', cases: many, user: 'u1' }, d)).toEqual({ ok: false, reason: 'tooMany' });
  });

  it('clearing the choice removes the attachment', async () => {
    const { d, audit } = deps();
    await setRelatedCases({ caseId: 'cur', cases: [snap('a')], user: 'u1' }, d);
    await setRelatedCases({ caseId: 'cur', cases: [], user: 'u1' }, d);
    expect(attachedRelatedCases('cur')).toEqual([]);
    expect(audit.mock.calls.map(c => c[0].event)).toContain('RELATED_CASES_CLEARED');
  });

  it('freezes at sign-out: later changes are refused and the copy stays exactly as seen', async () => {
    const { d, audit } = deps();
    await setRelatedCases({ caseId: 'cur', cases: [snap('a')], user: 'u1' }, d);
    const frozen = freezeRelatedCases('cur', 'u1', d);
    expect(frozen?.frozenAt).toBe('2026-10-18T00:00:00Z');
    expect(await setRelatedCases({ caseId: 'cur', cases: [snap('b')], user: 'u1' }, d)).toEqual({ ok: false, reason: 'frozen' });
    expect(attachedRelatedCases('cur').map(c => c.sourceCaseId)).toEqual(['a']);
    freezeRelatedCases('cur', 'u2', d);
    expect(getRelatedCaseAttachment('cur')?.frozenBy).toBe('u1');
    expect(audit.mock.calls.filter(c => c[0].event === 'RELATED_CASES_FROZEN')).toHaveLength(1);
  });

  it('freezing a case with nothing attached does nothing', () => {
    const { d, audit } = deps();
    expect(freezeRelatedCases('none', 'u1', d)).toBeNull();
    expect(audit).not.toHaveBeenCalled();
  });
});
