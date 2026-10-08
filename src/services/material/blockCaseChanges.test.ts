// PS-71 (Batch 458): block/stain/Biopsy Array changes re-applied to the newest
// case on a conflict, instead of a second save with no version.
import { describe, it, expect } from 'vitest';
import type { Case } from '@/types/case/Case';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';
import {
  saveScreenCaseChange, cancelBlockChange, orderRestainChange, appendBlockChange, setBlockLisStatusChange,
  releasePendingBlocksChange, removePendingBlockChange, createMatrixBlockChange,
  updateMatrixBlockParticipantsChange, dissolveMatrixBlockChange,
} from './blockCaseChanges';

/* eslint-disable @typescript-eslint/no-explicit-any */
const caseOf = (over: Partial<Case> = {}): Case => ({
  id: 'C1', version: 3,
  accession: { fullAccession: 'S26-1' },
  specimens: [
    { id: 'SP-A', label: 'A', blocks: [
      { id: 'B1', label: '1', status: 'Grossed', stains: [
        { id: 'S1', stainName: 'H&E', status: 'Coverslipped' },
        { id: 'S2', stainName: 'Unstained', status: 'Cut & Placed' },
        { id: 'S3', stainName: 'CK7', status: 'Pending Cut' },
      ] },
      { id: 'B2', label: '2', status: 'Pending', stains: [] },
    ] },
    { id: 'SP-B', label: 'B', blocks: [] },
    { id: 'SP-C', label: 'C', blocks: [] },
  ],
  ...over,
} as unknown as Case);

/** A store with optimistic versions, like the case services. */
function fakeStore(initial: Case) {
  let saved = initial;
  const writes: Array<{ updates: Partial<Case>; expectedVersion: number }> = [];
  return {
    get: () => saved,
    /** Someone else saves in between. */
    otherPersonSaves: (updates: Partial<Case>) => { saved = { ...saved, ...updates, version: (saved.version ?? 0) + 1 }; },
    writes,
    deps: {
      getCase: async () => saved,
      updateCase: async (_id: string, updates: Partial<Case>, expectedVersion: number) => {
        writes.push({ updates, expectedVersion });
        if ((saved.version ?? 0) !== expectedVersion) throw new ConcurrencyConflictError('C1', expectedVersion, saved.version ?? 0);
        saved = { ...saved, ...updates, version: expectedVersion + 1 };
      },
    },
  };
}

const blockOf = (c: Case, spId: string, blockId: string) => c.specimens!.find(s => s.id === spId)!.blocks!.find(b => b.id === blockId);

describe('saveScreenCaseChange', () => {
  it('saves on the screen\'s version when nobody else saved', async () => {
    const screen = caseOf();
    const store = fakeStore(screen);
    const change = cancelBlockChange({ specimenId: 'SP-A', blockId: 'B1', reason: ' wrong tissue ', cancelledBy: 'U1', cancelledAt: 't' });
    const r = await saveScreenCaseChange('C1', change(screen)!, change, 3, store.deps);
    expect(r).toMatchObject({ ok: true, version: 4, retried: false });
    expect(store.writes.map(w => w.expectedVersion)).toEqual([3]);
  });

  it('a stale save is not applied: the change is rebuilt from the newer case, and the other person\'s change survives', async () => {
    const screen = caseOf();
    const store = fakeStore(screen);
    // Someone else adds a block to specimen B after this screen loaded.
    store.otherPersonSaves({ specimens: screen.specimens!.map(s => s.id === 'SP-B' ? { ...s, blocks: [{ id: 'B9', label: '1', status: 'Grossed', stains: [] }] } : s) as any });

    const change = cancelBlockChange({ specimenId: 'SP-A', blockId: 'B1', reason: 'wrong tissue', cancelledBy: 'U1', cancelledAt: 't' });
    const r = await saveScreenCaseChange('C1', change(screen)!, change, 3, store.deps);

    expect(r).toMatchObject({ ok: true, version: 5, retried: true });
    expect(store.writes.map(w => w.expectedVersion)).toEqual([3, 4]); // never without a version
    const saved = store.get();
    expect(blockOf(saved, 'SP-B', 'B9')).toBeDefined();                // theirs survives
    expect(blockOf(saved, 'SP-A', 'B1')?.status).toBe('Cancelled');    // ours is recorded
    if (r.ok) expect(r.updates).toEqual({ specimens: saved.specimens }); // what the screen adopts
  });

  it('nothing is saved when, in the newer case, the change no longer applies', async () => {
    const screen = caseOf();
    const store = fakeStore(screen);
    store.otherPersonSaves({ specimens: screen.specimens!.map(s => s.id === 'SP-A' ? { ...s, blocks: s.blocks!.filter(b => b.id !== 'B2') } : s) as any });
    const change = removePendingBlockChange('SP-A', 'B2');
    const r = await saveScreenCaseChange('C1', change(screen)!, change, 3, store.deps);
    expect(r).toEqual({ ok: false, reason: 'noChange', retried: true });
    expect(store.writes).toHaveLength(1);
  });

  it('gives up after repeated conflicts without ever saving unversioned', async () => {
    const screen = caseOf();
    const store = fakeStore(screen);
    const deps = { ...store.deps, updateCase: async (_id: string, u: Partial<Case>, v: number) => { store.writes.push({ updates: u, expectedVersion: v }); throw new ConcurrencyConflictError('C1', v, v + 1); } };
    const change = releasePendingBlocksChange('SP-A', ['B2']);
    const r = await saveScreenCaseChange('C1', change(screen)!, change, 3, deps);
    expect(r).toEqual({ ok: false, reason: 'conflict', retried: true });
    expect(store.writes.every(w => typeof w.expectedVersion === 'number')).toBe(true);
  });
});

describe('the block changes', () => {
  it('cancel: block Cancelled with who/when/why, unfinished stains cancelled, finished ones kept', () => {
    const u = cancelBlockChange({ specimenId: 'SP-A', blockId: 'B1', reason: ' x ', cancelledBy: 'U1', cancelledAt: 't' })(caseOf())!;
    const b = blockOf(u as Case, 'SP-A', 'B1')!;
    expect(b).toMatchObject({ status: 'Cancelled', cancelReason: 'x', cancelledBy: 'U1', cancelledAt: 't' });
    expect(b.stains.map(s => s.status)).toEqual(['Coverslipped', 'Cancelled', 'Cancelled']);
  });

  it('restain: an Unstained spare converts in place; a stained slide is kept and a new linked slide is added', () => {
    const base = { specimenId: 'SP-A', blockId: 'B1', stainName: 'p16', reason: 'r', orderedBy: 'U1', orderedAt: 't', newSlideId: 'NEW', unstainedLabel: 'Unstained' };
    const spare = blockOf(orderRestainChange({ ...base, targetSlideId: 'S2' })(caseOf()) as Case, 'SP-A', 'B1')!;
    expect(spare.stains.find(s => s.id === 'S2')).toMatchObject({ stainName: 'p16', status: 'Staining' });
    expect(spare.stains).toHaveLength(3);
    const stained = blockOf(orderRestainChange({ ...base, targetSlideId: 'S1' })(caseOf()) as Case, 'SP-A', 'B1')!;
    expect(stained.stains.find(s => s.id === 'S1')).toMatchObject({ stainName: 'H&E', status: 'Coverslipped' });
    expect(stained.stains.find(s => s.id === 'NEW')).toMatchObject({ restainOfSlideId: 'S1', status: 'Pending Cut' });
    expect(orderRestainChange({ ...base, targetSlideId: 'GONE' })(caseOf())).toBeNull();
  });

  it('append block / LIS status: idempotent and null when the block is gone', () => {
    const nb = { id: 'B3', label: '3', status: 'Grossed', stains: [] } as any;
    const added = appendBlockChange('SP-A', nb)(caseOf()) as Case;
    expect(blockOf(added, 'SP-A', 'B3')).toBeDefined();
    expect(appendBlockChange('SP-A', nb)(added)).toBeNull();
    expect(blockOf(setBlockLisStatusChange('SP-A', 'B3', 'confirmed')(added) as Case, 'SP-A', 'B3')?.lisRequestStatus).toBe('confirmed');
    expect(setBlockLisStatusChange('SP-A', 'NOPE', 'confirmed')(added)).toBeNull();
  });

  it('release / remove only touch blocks that are still Pending', () => {
    expect(blockOf(releasePendingBlocksChange('SP-A', ['B1', 'B2'])(caseOf()) as Case, 'SP-A', 'B2')?.status).toBe('Grossed');
    expect(releasePendingBlocksChange('SP-A', ['B1'])(caseOf())).toBeNull();
    expect(blockOf(removePendingBlockChange('SP-A', 'B2')(caseOf()) as Case, 'SP-A', 'B2')).toBeUndefined();
    expect(removePendingBlockChange('SP-A', 'B1')(caseOf())).toBeNull();
  });

  it('Biopsy Array: create, change participants from the newest array, dissolve', () => {
    let ids = 0;
    const makeId = (p: string) => `${p}-${++ids}`;
    const mtx = { id: 'M1', label: 'M1', status: 'Grossed', participants: [{ specimenId: 'SP-A', positionInBlock: 1 }, { specimenId: 'SP-B', positionInBlock: 2 }], slides: [] } as any;
    const created = { ...caseOf(), ...createMatrixBlockChange(['SP-A', 'SP-B'], mtx)(caseOf()) } as Case;
    expect(created.matrixBlocks).toHaveLength(1);
    expect(created.specimens!.find(s => s.id === 'SP-B')!.matrixBlockIds).toEqual(['M1']);
    expect(createMatrixBlockChange(['SP-A', 'SP-B'], mtx)(created)).toBeNull();

    const updated = { ...created, ...updateMatrixBlockParticipantsChange({ matrixBlockId: 'M1', specimenIds: ['SP-C', 'SP-A'], fullAccession: 'S26-1', makeId })(created) } as Case;
    expect(updated.matrixBlocks![0].participants.map(p => [p.specimenId, p.positionInBlock])).toEqual([['SP-C', 1], ['SP-A', 2]]);
    const b = updated.specimens!.find(s => s.id === 'SP-B')!;
    expect(b.matrixBlockIds).toEqual([]);
    expect(b.blocks).toHaveLength(1); // got an ordinary block back
    expect(updated.specimens!.find(s => s.id === 'SP-C')!.matrixBlockIds).toEqual(['M1']);

    const dissolved = dissolveMatrixBlockChange({ matrixBlockId: 'M1', makeId })(updated) as Case;
    expect(dissolved.matrixBlocks).toEqual([]);
    expect(dissolveMatrixBlockChange({ matrixBlockId: 'M1' })({ ...updated, matrixBlocks: [] } as Case)).toBeNull();
  });
});
