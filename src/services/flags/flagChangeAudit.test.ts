// Batch 669 (everyday-17): audit entries come from the saved difference, never from draft clicks.
import { describe, expect, it, vi } from 'vitest';
import { diffFlagChanges, hasFlagChanges, saveFlagChanges, type FlagAuditEntry } from './flagChangeAudit';
import type { CaseWithFlags, FlagInstance } from '@/types/flagsRuntime';

const inst = (id: string, def: string, deletedAt: string | null = null): FlagInstance =>
  ({ id, flagDefinitionId: def, appliedAt: 't', appliedBy: 'u', source: 'product', deletedAt, deletedBy: deletedAt ? 'u' : null });
const mk = (flags: FlagInstance[], sp1: FlagInstance[] = []): CaseWithFlags =>
  ({ id: 'C1', accession: 'A', flags, specimens: [{ id: 'S1', label: 'A', flags: sp1 }] });
const defs = [{ id: 'f1', name: 'STAT — Rush Processing' }, { id: 'f2', name: 'Malignant' }];

describe('flagChangeAudit', () => {
  it('an untouched draft has no changes (Cancel has nothing to audit)', () => {
    const c = mk([inst('a', 'f1')]);
    expect(diffFlagChanges(c, structuredClone(c))).toEqual([]);
    expect(hasFlagChanges(c, structuredClone(c))).toBe(false);
  });

  it('a flag added then removed inside the draft is no change', () => {
    expect(diffFlagChanges(mk([]), mk([inst('local-1', 'f2', 'now')]))).toEqual([]);
  });

  it('finds applied and removed flags at case and specimen level', () => {
    const initial = mk([inst('a', 'f1')]);
    const draft = mk([inst('a', 'f1', 'now'), inst('local-1', 'f2')], [inst('local-2', 'f2')]);
    expect(diffFlagChanges(initial, draft)).toEqual([
      { kind: 'remove', flagDefinitionId: 'f1', flagInstanceId: 'a', specimenId: undefined },
      { kind: 'apply', flagDefinitionId: 'f2', flagInstanceId: 'local-1', specimenId: undefined },
      { kind: 'apply', flagDefinitionId: 'f2', flagInstanceId: 'local-2', specimenId: 'S1' },
    ]);
  });

  it('Save stores each change and audits it after it was stored', async () => {
    const order: string[] = [];
    const audit = vi.fn((e: FlagAuditEntry) => { order.push(`audit:${e.action}:${e.flagName}`); });
    const r = await saveFlagChanges(
      { caseId: 'C1', initial: mk([inst('a', 'f1')]), draft: mk([inst('a', 'f1', 'now'), inst('l', 'f2')]), definitions: defs },
      { applyFlag: async () => { order.push('apply'); }, removeFlag: async () => { order.push('remove'); }, audit },
    );
    expect(r).toEqual({ saved: 2 });
    expect(order).toEqual(['remove', 'audit:flag_removed:STAT — Rush Processing', 'apply', 'audit:flag_applied:Malignant']);
  });

  it('a failure stops the save and audits only what was stored', async () => {
    const audit = vi.fn();
    const r = await saveFlagChanges(
      { caseId: 'C1', initial: mk([]), draft: mk([inst('l1', 'f1'), inst('l2', 'f2')]), definitions: defs },
      { applyFlag: async (p) => { if (p.flagDefinitionId === 'f2') throw new Error('boom'); }, removeFlag: async () => {}, audit },
    );
    expect(r.saved).toBe(1);
    expect(r.error?.message).toBe('boom');
    expect(audit).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith({ action: 'flag_applied', caseId: 'C1', flagName: 'STAT — Rush Processing' });
  });

  it('nothing is stored and nothing audited when no change was made', async () => {
    const audit = vi.fn(); const applyFlag = vi.fn();
    const c = mk([inst('a', 'f1')]);
    expect(await saveFlagChanges({ caseId: 'C1', initial: c, draft: structuredClone(c), definitions: defs }, { applyFlag, removeFlag: applyFlag, audit })).toEqual({ saved: 0 });
    expect(audit).not.toHaveBeenCalled(); expect(applyFlag).not.toHaveBeenCalled();
  });
});
