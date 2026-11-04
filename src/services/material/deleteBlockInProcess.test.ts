// Batch 588: deleting a block in process, and the billing deficiency it raises.
import { describe, it, expect } from 'vitest';
import type { Case } from '@/types/case/Case';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';
import { deleteBlockInProcess, type DeleteBlockDeps } from './deleteBlockInProcess';
import { blockDeletionRefusal, blockDeletionInputMissing, caseBlockDeletionRefusal, deleteBlockChange, BLOCK_DELETION_REASON_CODES } from './blockDeletion';
import type { BillingDeficiencyRecord } from '@/types/billing/BillingDeficiencyRecord';

const caseOf = (over: Partial<Case> = {}): Case => ({
  id: 'C1', version: 3, status: 'in-progress',
  accession: { fullAccession: 'S26-1' }, order: { facilityId: 'F1' },
  specimens: [{ id: 'SP-A', label: 'A', blocks: [
    { id: 'B1', label: '1', status: 'Grossed', sharedCassetteId: 'cas-1', positionInBlock: 2,
      coding: { cpt: [{ code: '88305' }, { code: '88305', stainOrderId: 'S3' }, { code: '88342' }] },
      stains: [
        { id: 'S1', stainName: 'H&E', status: 'Coverslipped' },
        { id: 'S3', stainName: 'CK7', status: 'Pending Cut' },
      ] },
    { id: 'B2', label: '2', status: 'Pending', stains: [] },
  ] }],
  ...over,
} as unknown as Case);

function setup(initial: Case, allowed = true) {
  let saved = initial;
  const audit: Array<{ event: string; detail: string }> = [];
  const raised: Array<Record<string, any>> = [];
  const deficiencies: DeleteBlockDeps['deficiencies'] = { raise: async d => { raised.push(d); return { ok: true, data: { ...d, id: 'bd-1', status: 'OPEN', createdAt: 'T' } as unknown as BillingDeficiencyRecord }; } };
  const deps: DeleteBlockDeps = {
    getCase: async () => saved,
    updateCase: async (_id, updates, v) => { if ((saved.version ?? 0) !== v) throw Object.assign(new Error('conflict'), { actualVersion: saved.version }); saved = { ...saved, ...updates, version: v + 1 } as Case; },
    enforce: async () => ({ allowed }),
    deficiencies, auditService: { logEvent: async e => { audit.push({ event: e.event, detail: e.detail }); return { ok: true, data: {} as never }; } },
    now: () => new Date('2026-10-16T15:00:00Z'),
  };
  return { deps, get: () => saved, audit, raised };
}
const input = { caseId: 'C1', specimenId: 'SP-A', blockId: 'B1', reasonCode: 'duplicate', actor: { userId: 'u1', userName: 'Tech One' } };

describe('the pure change', () => {
  it('soft-deletes: status Deleted, unfinished stains cancelled, finished ones kept, cassette released, codes cleared and recorded', () => {
    const out = deleteBlockChange({ specimenId: 'SP-A', blockId: 'B1', reasonCode: 'duplicate', deletedBy: 'u1', deletedByName: 'Tech One', deletedAt: 'T' })(caseOf())!;
    const b = out.specimens![0].blocks![0];
    expect(b.status).toBe('Deleted');
    expect(b.stains.map(s => s.status)).toEqual(['Coverslipped', 'Cancelled']);
    expect(b.sharedCassetteId).toBeUndefined();
    expect(b.coding?.cpt).toEqual([]);
    expect(b.deletion).toMatchObject({ reasonCode: 'duplicate', deletedByName: 'Tech One', tier: 'in_process', releasedCodes: ['88305', '88342'] });
    expect(out.specimens![0].blocks![1].status).toBe('Pending'); // the other block is untouched
  });
  it('returns null for a block that is gone or already deleted', () => {
    const c = caseOf();
    expect(deleteBlockChange({ specimenId: 'SP-A', blockId: 'nope', reasonCode: 'duplicate', deletedBy: 'u', deletedByName: 'n', deletedAt: 'T' })(c)).toBeNull();
    const once = deleteBlockChange({ specimenId: 'SP-A', blockId: 'B1', reasonCode: 'duplicate', deletedBy: 'u', deletedByName: 'n', deletedAt: 'T' })(c)!;
    expect(deleteBlockChange({ specimenId: 'SP-A', blockId: 'B1', reasonCode: 'duplicate', deletedBy: 'u', deletedByName: 'n', deletedAt: 'T' })({ ...c, ...once } as Case)).toBeNull();
  });
  it('refuses: no reason, a note-less "other", a signed-out case', () => {
    expect(blockDeletionRefusal(caseOf(), 'SP-A', 'B1', '', undefined)).toBe('reasonMissing');
    expect(blockDeletionRefusal(caseOf(), 'SP-A', 'B1', 'other', '  ')).toBe('noteRequired');
    expect(blockDeletionRefusal(caseOf(), 'SP-A', 'B1', 'other', 'because')).toBeNull();
    expect(blockDeletionRefusal(caseOf({ status: 'finalized' } as Partial<Case>), 'SP-A', 'B1', 'duplicate', undefined)).toBe('caseSignedOut');
    expect(blockDeletionRefusal(caseOf({ finalizedAt: '2026-10-01' } as Partial<Case>), 'SP-A', 'B1', 'duplicate', undefined)).toBe('caseSignedOut');
    expect(BLOCK_DELETION_REASON_CODES).toContain('enteredInError');
  });
});

describe('the shared checks the screen uses', () => {
  it('blockDeletionInputMissing: a reason from the list; "other" needs a note', () => {
    expect(blockDeletionInputMissing('', undefined)).toBe('reasonMissing');
    expect(blockDeletionInputMissing('made-up', 'x')).toBe('reasonMissing');
    expect(blockDeletionInputMissing('other', ' ')).toBe('noteRequired');
    expect(blockDeletionInputMissing('other', 'because')).toBeNull();
    expect(blockDeletionInputMissing('duplicate', undefined)).toBeNull();
  });
  it('caseBlockDeletionRefusal: in-process statuses pass, signed-out ones do not', () => {
    for (const status of ['draft', 'accessioned', 'gross-complete', 'in-progress', 'pathologist-review']) expect(caseBlockDeletionRefusal({ status } as never)).toBeNull();
    for (const status of ['finalized', 'closed', 'finalizing', 'pending-release', 'pending-countersign']) expect(caseBlockDeletionRefusal({ status } as never)).toBe('caseSignedOut');
    expect(caseBlockDeletionRefusal({ status: 'in-progress', finalizedAt: '2026-10-01' } as never)).toBe('caseSignedOut');
  });
});

describe('deleteBlockInProcess', () => {
  it('deletes, raises one BLOCK_DELETED billing deficiency with the block, specimen and codes, and audits', async () => {
    const s = setup(caseOf());
    const r = await deleteBlockInProcess(input, s.deps);
    expect(r).toEqual({ ok: true, releasedCodes: ['88305', '88342'], billingFlagRaised: true });
    expect(s.get().specimens![0].blocks![0].status).toBe('Deleted');
    expect(s.raised).toHaveLength(1);
    expect(s.raised[0]).toMatchObject({
      caseId: 'C1', deficiencyType: 'BLOCK_DELETED', severity: 'COMPLIANCE_WARNING', raisedByTrigger: 'BLOCK_DELETION', createdBy: 'u1',
      blockDeleted: { blockId: 'B1', specimenId: 'SP-A', specimenLabel: 'A', blockLabel: '1', reasonCode: 'duplicate', releasedCodes: ['88305', '88342'], deletedByName: 'Tech One' },
    });
    expect(s.raised[0].auditorNotes).toContain('Billing codes released: 88305, 88342');
    expect(s.audit.map(a => a.event)).toEqual(['Block deleted']);
    expect(s.audit[0].detail).not.toMatch(/S26-1/); // names the block, not the patient or the accession
  });
  it('a block with no applied codes still raises the deficiency ("none")', async () => {
    const s = setup(caseOf());
    await deleteBlockInProcess({ ...input, blockId: 'B2' }, s.deps);
    expect(s.raised[0].blockDeleted.releasedCodes).toEqual([]);
    expect(s.raised[0].auditorNotes).toContain('Billing codes released: none');
  });
  it('is refused without the capability: nothing deleted, nothing raised', async () => {
    const s = setup(caseOf(), false);
    expect(await deleteBlockInProcess(input, s.deps)).toEqual({ ok: false, error: 'notPermitted' });
    expect(s.get().specimens![0].blocks![0].status).toBe('Grossed');
    expect(s.raised).toHaveLength(0);
  });
  it('refuses a signed-out case without raising', async () => {
    const s = setup(caseOf({ status: 'finalized' } as Partial<Case>));
    expect(await deleteBlockInProcess(input, s.deps)).toEqual({ ok: false, error: 'caseSignedOut' });
    expect(s.raised).toHaveLength(0);
  });
  it('raises nothing when the case cannot be saved', async () => {
    const s = setup(caseOf());
    s.deps.updateCase = async () => { throw new Error('disk full'); };
    expect(await deleteBlockInProcess(input, s.deps)).toEqual({ ok: false, error: 'saveFailed' });
    expect(s.raised).toHaveLength(0);
  });
  it('survives another person saving first (re-applied to the newest case)', async () => {
    const s = setup(caseOf());
    const real = s.deps.updateCase; let first = true;
    s.deps.updateCase = async (id, u, v) => { if (first) { first = false; throw new ConcurrencyConflictError('C1', 3, 4); } return real(id, u, v); };
    expect((await deleteBlockInProcess(input, s.deps)).ok).toBe(true);
    expect(s.raised).toHaveLength(1);
  });
  it('saves through the page when it passes its own save, and maps a refused save to conflict', async () => {
    const s = setup(caseOf());
    let changeSeen: unknown = null;
    s.deps.save = async change => { changeSeen = change(s.get()); return 'saved'; };
    expect((await deleteBlockInProcess(input, s.deps)).ok).toBe(true);
    expect(changeSeen).not.toBeNull();
    expect(s.get().specimens![0].blocks![0].status).toBe('Grossed'); // the page's save did the saving, not the default one
    const s2 = setup(caseOf());
    s2.deps.save = async () => 'notSaved';
    expect(await deleteBlockInProcess(input, s2.deps)).toEqual({ ok: false, error: 'conflict' });
    expect(s2.raised).toHaveLength(0);
  });
  it('keeps the delete when billing cannot be flagged, and says so (result and audit)', async () => {
    const s = setup(caseOf());
    s.deps.deficiencies = { raise: async () => { throw new Error('storage unavailable'); } };
    const r = await deleteBlockInProcess(input, s.deps);
    expect(r).toEqual({ ok: true, releasedCodes: ['88305', '88342'], billingFlagRaised: false });
    expect(s.get().specimens![0].blocks![0].status).toBe('Deleted');
    expect(s.audit[0].detail).toContain('could NOT be raised');
  });
});
