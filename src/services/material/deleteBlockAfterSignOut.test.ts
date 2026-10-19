// Batch 610 (#11): deleting a block after sign-out (Invalidated) and flagging a block on an amended report.
import { describe, it, expect } from 'vitest';
import type { Case } from '@/types/case/Case';
import type { BillingDeficiencyRecord } from '@/types/billing/BillingDeficiencyRecord';
import type { DeleteBlockDeps } from './deleteBlockInProcess';
import { invalidateBlockAfterSignOut, flagBlockOnAmendedReport } from './deleteBlockAfterSignOut';
import { signedOutDeletionRefusal, amendmentFlagRefusal, invalidateBlockChange, flagBlockAmendmentChange } from './blockDeletion';

const caseOf = (over: Partial<Case> = {}): Case => ({
  id: 'C1', version: 3, status: 'finalized', finalizedAt: '2026-10-10T10:00:00Z', lastRevisionType: 'original',
  accession: { fullAccession: 'S26-1' }, order: { facilityId: 'F1' },
  specimens: [{ id: 'SP-A', label: 'A', blocks: [
    { id: 'B1', label: '1', status: 'Embedded', coding: { cpt: [{ code: '88305' }, { code: '88342' }] },
      stains: [{ id: 'S1', stainName: 'H&E', status: 'Coverslipped' }, { id: 'S2', stainName: 'CK7', status: 'Pending Cut' }] },
    { id: 'B2', label: '2', status: 'Embedded', stains: [] },
  ] }],
  ...over,
} as unknown as Case);

function setup(initial: Case, allowed = true) {
  let saved = initial;
  const audit: Array<{ event: string; detail: string }> = [];
  const raised: Array<Record<string, any>> = [];
  const asked: string[] = [];
  const deps: DeleteBlockDeps = {
    getCase: async () => saved,
    updateCase: async (_id, updates, v) => { saved = { ...saved, ...updates, version: v + 1 } as Case; },
    enforce: async cap => { asked.push(cap); return { allowed }; },
    deficiencies: { raise: async d => { raised.push(d); return { ok: true, data: { ...d, id: 'bd-1' } as unknown as BillingDeficiencyRecord }; } },
    auditService: { logEvent: async e => { audit.push({ event: e.event, detail: e.detail }); return { ok: true, data: {} as never }; } },
    now: () => new Date('2026-10-18T09:00:00Z'),
  };
  return { deps, get: () => saved, audit, raised, asked };
}
const input = { caseId: 'C1', specimenId: 'SP-A', blockId: 'B1', reasonCode: 'enteredInError', actor: { userId: 'u1', userName: 'Lab Director' } };

describe('tier 2: delete after sign-out', () => {
  it('refuses a case that is not signed out, and an unknown or already invalidated block', () => {
    expect(signedOutDeletionRefusal(caseOf({ status: 'in-progress', finalizedAt: undefined }), 'SP-A', 'B1', 'duplicate', undefined)).toBe('caseNotSignedOut');
    expect(signedOutDeletionRefusal(caseOf(), 'SP-A', 'nope', 'duplicate', undefined)).toBe('notFound');
    expect(signedOutDeletionRefusal(caseOf(), 'SP-A', 'B1', '', undefined)).toBe('reasonMissing');
    expect(signedOutDeletionRefusal(caseOf(), 'SP-A', 'B1', 'other', ' ')).toBe('noteRequired');
    expect(signedOutDeletionRefusal(caseOf(), 'SP-A', 'B1', 'duplicate', undefined)).toBeNull();
  });
  it('marks the block Invalidated, keeps it on the case, cancels unfinished stains and releases the codes', () => {
    const out = invalidateBlockChange({ specimenId: 'SP-A', blockId: 'B1', reasonCode: 'enteredInError', deletedBy: 'u', deletedByName: 'LD', deletedAt: 'T' })(caseOf())!;
    const b = out.specimens![0].blocks![0];
    expect(b.status).toBe('Invalidated');
    expect(b.deletion).toMatchObject({ tier: 'signed_out', reasonCode: 'enteredInError', deletedByName: 'LD', releasedCodes: ['88305', '88342'] });
    expect(b.stains.map(s => s.status)).toEqual(['Coverslipped', 'Cancelled']);
    expect(out.specimens![0].blocks).toHaveLength(2);
  });
  it('needs material:block:delete-signed-out and changes nothing without it', async () => {
    const s = setup(caseOf(), false);
    expect(await invalidateBlockAfterSignOut(input, s.deps)).toEqual({ ok: false, error: 'notPermitted' });
    expect(s.asked).toEqual(['material:block:delete-signed-out']);
    expect(s.get().version).toBe(3);
    expect(s.raised).toHaveLength(0);
  });
  it('saves, raises one billing deficiency and audits without naming the patient', async () => {
    const s = setup(caseOf());
    const r = await invalidateBlockAfterSignOut(input, s.deps);
    expect(r).toEqual({ ok: true, releasedCodes: ['88305', '88342'], billingFlagRaised: true });
    expect(s.get().specimens![0].blocks![0].status).toBe('Invalidated');
    expect(s.raised).toHaveLength(1);
    expect(s.raised[0]).toMatchObject({ deficiencyType: 'BLOCK_DELETED', blockDeleted: { blockId: 'B1', reasonCode: 'enteredInError' } });
    expect(s.audit).toHaveLength(1);
    expect(s.audit[0].event).toBe('Block invalidated after sign-out');
    expect(s.audit[0].detail).toContain('A1');
  });
  it('refuses a case still in process', async () => {
    const s = setup(caseOf({ status: 'in-progress', finalizedAt: undefined } as Partial<Case>));
    expect(await invalidateBlockAfterSignOut(input, s.deps)).toEqual({ ok: false, error: 'caseNotSignedOut' });
  });
});

describe('tier 3: Invalidated or Superseded flag on an amended report', () => {
  const amended = () => caseOf({ lastRevisionType: 'amendment' } as Partial<Case>);
  const flagInput = { caseId: 'C1', specimenId: 'SP-A', blockId: 'B1', kind: 'superseded' as const, reasonCode: 'replaced', supersededByBlockId: 'B2', actor: { userId: 'p1', userName: 'Dr P' } };
  it('only an amended, corrected or added-to report can carry it', () => {
    expect(amendmentFlagRefusal(caseOf(), 'SP-A', 'B1', 'replaced', undefined)).toBe('notAmendedReport');
    expect(amendmentFlagRefusal(amended(), 'SP-A', 'B1', 'replaced', undefined)).toBeNull();
    expect(amendmentFlagRefusal(caseOf({ lastRevisionType: 'addendum' } as Partial<Case>), 'SP-A', 'B1', 'replaced', undefined)).toBeNull();
    expect(amendmentFlagRefusal(amended(), 'SP-A', 'B1', 'bogus', undefined)).toBe('reasonMissing');
    expect(amendmentFlagRefusal(amended(), 'SP-A', 'B1', 'other', '')).toBe('noteRequired');
  });
  it('sets a flag only: the block is not deleted and its status is unchanged', () => {
    const out = flagBlockAmendmentChange({ specimenId: 'SP-A', blockId: 'B1', kind: 'invalidated', reasonCode: 'wrongPatient', flaggedBy: 'p', flaggedByName: 'Dr P', flaggedAt: 'T' })(amended())!;
    const b = out.specimens![0].blocks![0];
    expect(b.status).toBe('Embedded');
    expect(b.deletion).toBeUndefined();
    expect(b.amendmentFlag).toMatchObject({ kind: 'invalidated', reasonCode: 'wrongPatient', flaggedByName: 'Dr P' });
    expect(b.stains).toHaveLength(2);
  });
  it('needs material:block:flag-amended', async () => {
    const s = setup(amended(), false);
    expect(await flagBlockOnAmendedReport(flagInput, s.deps)).toEqual({ ok: false, error: 'notPermitted' });
    expect(s.asked).toEqual(['material:block:flag-amended']);
  });
  it('saves the flag with the superseding block, audits it, and raises no billing deficiency', async () => {
    const s = setup(amended());
    expect(await flagBlockOnAmendedReport(flagInput, s.deps)).toEqual({ ok: true });
    expect(s.get().specimens![0].blocks![0].amendmentFlag).toMatchObject({ kind: 'superseded', supersededByBlockId: 'B2' });
    expect(s.raised).toHaveLength(0);
    expect(s.audit.map(a => a.event)).toEqual(['Block flagged Superseded']);
  });
  it('refuses a report that was never amended, and a block already deleted', async () => {
    expect(await flagBlockOnAmendedReport(flagInput, setup(caseOf()).deps)).toEqual({ ok: false, error: 'notAmendedReport' });
  });
});
