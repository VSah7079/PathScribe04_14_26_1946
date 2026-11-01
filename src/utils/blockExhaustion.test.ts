// Batch 610 (#16): "Block exhausted" on the Microtome workstation. The flag remembers the block's
// status, Cancel or Modify puts it back, Approve leaves it Exhausted, and cutting waits until then.
import { describe, it, expect } from 'vitest';
import type { Specimen } from '@/types/case/Specimen';
import { flagBlockExhaustion, resolvePathologistException } from './addOnOrderOperations';
import { cuttingBlockedByExhaustion } from './blockExceptionStates';
import { markStainPrinting } from './microtomyOperations';

const actor = { id: 'u1', name: 'Tech One' };
const spec = (status: string = 'Embedded'): Specimen => ({
  id: 'SP', label: 'A',
  blocks: [{ id: 'B1', label: '1', status, stains: [{ id: 'S1', stainName: 'H&E', status: 'Pending Cut' }, { id: 'S2', stainName: 'CK7', status: 'Pending Cut' }] }],
} as unknown as Specimen);
const block = (s: Specimen) => s.blocks![0];
const flagged = (status?: string) => { const r = flagBlockExhaustion(spec(status), 'B1', 'S1', 'Block exhausted', 'no tissue left', actor); if (!r.ok) throw new Error(r.error); return r.specimen; };

describe('flagging a block as exhausted', () => {
  it('marks the block Exhausted, remembers the status it had, and blocks cutting', () => {
    const s = flagged('Embedded');
    expect(block(s).status).toBe('Exhausted');
    expect(block(s).stains[0].exception).toMatchObject({ reason: 'Block exhausted', status: 'pending_pathologist_review', blockStatusBefore: 'Embedded' });
    expect(cuttingBlockedByExhaustion(block(s))).toBe(true);
  });
  it('does not remember a status for other reasons, and does not touch the block', () => {
    const r = flagBlockExhaustion(spec(), 'B1', 'S1', 'Requires re-grossing', undefined, actor);
    if (!r.ok) throw new Error(r.error);
    expect(block(r.specimen).stains[0].exception?.blockStatusBefore).toBeUndefined();
  });
  it('a block that is Exhausted from grossing, with no flag, is not held up', () => {
    expect(cuttingBlockedByExhaustion(block(spec('Exhausted')))).toBe(false);
  });
});

describe('the pathologist answers', () => {
  const answer = (s: Specimen, action: 'approve_destructive_cut' | 'cancel' | 'modify') => {
    const r = resolvePathologistException(s, 'B1', 'S1', action, 'ok', action === 'modify' ? { levelDepthMicrons: 20 } : undefined, { id: 'p1', name: 'Dr P' });
    if (!r.ok) throw new Error(r.error);
    return r.specimen;
  };
  it('Cancel puts the block status back and lets cutting go on', () => {
    const s = answer(flagged('Embedded'), 'cancel');
    expect(block(s).status).toBe('Embedded');
    expect(cuttingBlockedByExhaustion(block(s))).toBe(false);
  });
  it('Modify puts the block status back', () => {
    const s = answer(flagged('Grossed'), 'modify');
    expect(block(s).status).toBe('Grossed');
    expect(cuttingBlockedByExhaustion(block(s))).toBe(false);
  });
  it('Approve destructive cutting keeps the block Exhausted but unblocks cutting', () => {
    const s = answer(flagged('Embedded'), 'approve_destructive_cut');
    expect(block(s).status).toBe('Exhausted');
    expect(cuttingBlockedByExhaustion(block(s))).toBe(false);
  });
  it('keeps the block Exhausted while another exhaustion flag on it is still open', () => {
    const first = flagged('Embedded');
    const second = flagBlockExhaustion(first, 'B1', 'S2', 'Block exhausted', undefined, actor);
    if (!second.ok) throw new Error(second.error);
    const s = answer(second.specimen, 'cancel');
    expect(block(s).status).toBe('Exhausted');
    expect(cuttingBlockedByExhaustion(block(s))).toBe(true);
  });
});

describe('the Microtome workstation will not cut a flagged block', () => {
  it('refuses to start a slide while the flag is open, and allows it after Approve', () => {
    const s = flagged('Embedded');
    expect(markStainPrinting(s, 'B1', 'S2')).toMatchObject({ ok: false });
    const approved = resolvePathologistException(s, 'B1', 'S1', 'approve_destructive_cut', 'ok', undefined, { id: 'p', name: 'P' });
    if (!approved.ok) throw new Error(approved.error);
    expect(markStainPrinting(approved.specimen, 'B1', 'S2').ok).toBe(true);
  });
  it('an ordinary block prints', () => {
    expect(markStainPrinting(spec(), 'B1', 'S1').ok).toBe(true);
  });
});
