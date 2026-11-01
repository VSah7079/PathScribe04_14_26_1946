// Batch 452 (Pete, Oct 4 2026): decants and billing stay in step.
//   materialTree         the decant reducer (add / modify / delete, multi-level)
//   billableMaterial     billing derived from the material tree, decants included
//   caseMaterialService  one atomic save returning tree + affected billing lines
//   caseMaterialStore    optimistic update, MATERIAL_DECANTED, rollback
import { describe, expect, it, vi } from 'vitest';
import { applyDecantChange, nextDecantLabel } from './materialTree';
import { billableMaterialOf, billingLinesOf, billingSummaryForMaterial } from './billableMaterial';
import { applyDecantChangeAtomic, type CaseMaterialServiceDeps } from './caseMaterialService';
import { createCaseMaterialStore } from './caseMaterialStore';
import { createMaterialEventBus, type MaterialEvent } from './materialEvents';
import type { StainType } from '../stains/IStainService';

const NOW = new Date('2026-10-04T12:00:00.000Z');
const st = (id: string, name: string, category: string): StainType => ({ id, name, category, active: true, version: 1, updatedBy: 'admin', updatedAt: '2026-01-01T00:00:00.000Z' } as StainType);
const STAINS = [st('1', 'H&E', 'Routine'), st('2', 'PAS', 'Special Stain'), st('4', 'ER', 'IHC'), st('5', 'PR', 'IHC'), st('6', 'TTF-1', 'IHC')];
const decant = (id: string, label: string, over: object = {}): any => ({ id, label, decantType: 'residual_fluid' as const, stains: [] as any[], createdAt: NOW.toISOString(), ...over });
const tree = () => [{ id: 'SP-A', label: 'A', blocks: [{ id: 'A1', label: 'A1', stains: [{ id: 's1', stainName: 'ER' }] }], decants: [] as any[] }];

describe('materialTree.applyDecantChange', () => {
  it('adds a decant to its specimen and reports the standard DecantEvent', () => {
    const r = applyDecantChange(tree(), { kind: 'add', specimenId: 'SP-A', decant: decant('D1', 'D1', { totalVolumeMl: 12 }) }, NOW.toISOString());
    expect(r.ok && r.specimens[0].decants.map((d: any) => d.id)).toEqual(['D1']);
    expect(r.ok && r.event).toEqual({ parentId: 'SP-A', childId: 'D1', materialType: 'residual_fluid', volumeOrWeight: 12, timestamp: NOW.toISOString() });
    expect(r.ok && r.change).toBe('added');
  });

  it('multi-level: a cell block split from a decant names that decant as its parent', () => {
    const one = applyDecantChange(tree(), { kind: 'add', specimenId: 'SP-A', decant: decant('D1', 'D1') }, 't');
    const two = one.ok && applyDecantChange(one.specimens, { kind: 'add', specimenId: 'SP-A', decant: decant('D2', 'D2', { decantType: 'cell_block', parentDecantId: 'D1', yieldPelletSize: 'Moderate' }) }, 't');
    expect(two && two.ok && two.event).toMatchObject({ parentId: 'D1', childId: 'D2', materialType: 'cell_block', volumeOrWeight: 'Moderate' });
  });

  it('refuses what would corrupt the tree: unknown specimen, duplicate id, missing parent, deleting a parent', () => {
    expect(applyDecantChange(tree(), { kind: 'add', specimenId: 'NOPE', decant: decant('D1', 'D1') }, 't')).toEqual({ ok: false, refusal: 'specimenNotFound' });
    const withD1 = [{ ...tree()[0], decants: [decant('D1', 'D1'), decant('D2', 'D2', { parentDecantId: 'D1' })] }];
    expect(applyDecantChange(withD1, { kind: 'add', specimenId: 'SP-A', decant: decant('D1', 'D9') }, 't')).toEqual({ ok: false, refusal: 'duplicateId' });
    expect(applyDecantChange(withD1, { kind: 'add', specimenId: 'SP-A', decant: decant('D3', 'D3', { parentDecantId: 'ZZ' }) }, 't')).toEqual({ ok: false, refusal: 'parentNotFound' });
    expect(applyDecantChange(withD1, { kind: 'delete', decantId: 'D1' }, 't')).toEqual({ ok: false, refusal: 'hasChildren' });
    expect(applyDecantChange(withD1, { kind: 'delete', decantId: 'XX' }, 't')).toEqual({ ok: false, refusal: 'decantNotFound' });
  });

  it('modifies and deletes; an update cannot change the id or re-parent', () => {
    const start = [{ ...tree()[0], decants: [decant('D1', 'D1')] }];
    const m = applyDecantChange(start, { kind: 'update', decantId: 'D1', patch: { totalVolumeMl: 5, id: 'HIJACK', parentDecantId: 'X' } as any }, 't');
    expect(m.ok && m.specimens[0].decants[0]).toMatchObject({ id: 'D1', totalVolumeMl: 5 });
    expect(m.ok && m.specimens[0].decants[0].parentDecantId).toBeUndefined();
    const d = applyDecantChange(start, { kind: 'delete', decantId: 'D1' }, 't');
    expect(d.ok && d.specimens[0].decants).toEqual([]);
    expect(d.ok && d.change).toBe('deleted');
  });

  it('nextDecantLabel never reuses a label after a delete', () => {
    expect(nextDecantLabel([])).toBe('D1');
    expect(nextDecantLabel([{ label: 'D2' }])).toBe('D3');
  });
});

describe('billableMaterial: billing derives from the material tree', () => {
  it('a decant with stains is billed like a block, and IHC sequencing runs across blocks and decants', () => {
    const specimens = [{ ...tree()[0], decants: [decant('D1', 'D1', { decantType: 'cell_block', stains: [{ id: 's2', stainName: 'PR' }, { id: 's3', stainName: 'PAS' }] })] }];
    expect(billableMaterialOf(specimens)[0].blocks!.map(b => b.id)).toEqual(['A1', 'D1']);
    const lines = billingLinesOf(billingSummaryForMaterial(specimens, STAINS));
    expect(lines).toEqual([
      { specimenId: 'SP-A', materialId: 'A1', materialLabel: 'A1', appliedCodes: [], suggestedCodes: ['IHC-FIRST'] },
      { specimenId: 'SP-A', materialId: 'D1', materialLabel: 'D1', appliedCodes: [], suggestedCodes: ['IHC-ADDL', 'SPECIAL-STAIN'] },
    ]);
  });
  it('codes applied to a decant are read from the decant', () => {
    const specimens = [{ ...tree()[0], decants: [decant('D1', 'D1', { stains: [{ id: 's2', stainName: 'PR' }], coding: { cpt: [{ code: 'IHC-ADDL', stainOrderId: 's2' }] } })] }];
    expect(billingLinesOf(billingSummaryForMaterial(specimens, STAINS))[1]).toMatchObject({ appliedCodes: ['IHC-ADDL'], suggestedCodes: [] });
  });
});

function serverWith(initial: any[]) {
  const db = { id: 'C1', version: 4, specimens: initial };
  const deps: CaseMaterialServiceDeps = {
    getCase: async () => ({ ...db }),
    updateCase: vi.fn(async (_id, patch, v) => {
      if (v !== db.version) throw Object.assign(new Error('conflict'), { actualVersion: db.version });
      db.specimens = (patch as any).specimens; db.version += 1;
    }),
    getStainTypes: async () => STAINS,
    enforce: vi.fn(async () => ({ allowed: true })),
    now: () => NOW,
  };
  return { db, deps };
}

describe('caseMaterialService.applyDecantChangeAtomic', () => {
  it('returns the complete updated tree, the new version and the billing lines the change affected', async () => {
    const { db, deps } = serverWith(tree());
    const res = await applyDecantChangeAtomic('C1', { kind: 'add', specimenId: 'SP-A', decant: decant('D1', 'D1', { stains: [{ id: 's2', stainName: 'PR' }] }) }, 4, deps);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.version).toBe(5);
    expect(res.specimens).toEqual(db.specimens);
    expect(res.billing).toEqual({ changed: [{ specimenId: 'SP-A', materialId: 'D1', materialLabel: 'D1', appliedCodes: [], suggestedCodes: ['IHC-ADDL'] }], removedMaterialIds: [] });
  });

  it('a stale version is a conflict carrying the current version, and nothing is written', async () => {
    const { db, deps } = serverWith(tree());
    expect(await applyDecantChangeAtomic('C1', { kind: 'add', specimenId: 'SP-A', decant: decant('D1', 'D1') }, 3, deps)).toEqual({ ok: false, error: 'conflict', currentVersion: 4 });
    expect(db.version).toBe(4);
    expect(deps.updateCase).not.toHaveBeenCalled();
  });

  it('deleting needs case:decant:delete; refused, nothing changes', async () => {
    const { db, deps } = serverWith([{ ...tree()[0], decants: [decant('D1', 'D1')] }]);
    (deps.enforce as any).mockResolvedValueOnce({ allowed: false });
    expect(await applyDecantChangeAtomic('C1', { kind: 'delete', decantId: 'D1' }, 4, deps)).toEqual({ ok: false, error: 'notPermitted' });
    expect(deps.enforce).toHaveBeenCalledWith('case:decant:delete', { caseId: 'C1', decantId: 'D1' });
    expect(db.specimens[0].decants).toHaveLength(1);
    const ok = await applyDecantChangeAtomic('C1', { kind: 'delete', decantId: 'D1' }, 4, deps);
    expect(ok.ok && ok.billing.removedMaterialIds).toEqual(['D1']);
  });
});

describe('caseMaterialStore: optimistic update, events, rollback', () => {
  const setup = (save?: any) => {
    const server = serverWith(tree());
    const bus = createMaterialEventBus();
    const events: MaterialEvent[] = [];
    bus.subscribe('C1', e => events.push(e));
    const store = createCaseMaterialStore({ caseId: 'C1', specimens: tree(), version: 4 }, {
      save: save ?? ((id: string, change: any, v: number) => applyDecantChangeAtomic(id, change, v, server.deps)),
      bus, now: () => NOW,
    });
    return { store, bus, events, server };
  };

  it('shows the change at once and publishes MATERIAL_DECANTED before the save finishes', async () => {
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    const { store, events, server } = setup(async (id: string, change: any, v: number) => { await gate; return applyDecantChangeAtomic(id, change, v, serverWith(tree()).deps); });
    const done = store.dispatch({ kind: 'add', specimenId: 'SP-A', decant: decant('D1', 'D1') });
    expect(store.getState().specimens[0].decants.map((d: any) => d.id)).toEqual(['D1']);
    expect(store.getState().pending).toBe(1);
    expect(events).toEqual([{ type: 'MATERIAL_DECANTED', caseId: 'C1', change: 'added', decant: expect.objectContaining({ parentId: 'SP-A', childId: 'D1' }) }]);
    release();
    expect((await done).ok).toBe(true);
    expect(store.getState()).toMatchObject({ version: 5, pending: 0 });
    expect(server.db.version).toBe(4); // (that save went to its own server)
  });

  it('a failed save puts the tree back and publishes MATERIAL_ROLLED_BACK', async () => {
    const { store, events } = setup(async () => ({ ok: false, error: 'saveFailed' }));
    const seen: number[] = [];
    store.subscribe(s => seen.push(s.specimens[0].decants.length));
    const out = await store.dispatch({ kind: 'add', specimenId: 'SP-A', decant: decant('D1', 'D1') });
    expect(out).toEqual({ ok: false, error: 'saveFailed', rolledBack: true, currentVersion: undefined });
    expect(seen).toEqual([1, 0]);
    expect(store.getState()).toMatchObject({ version: 4, pending: 0 });
    expect(events.map(e => e.type)).toEqual(['MATERIAL_DECANTED', 'MATERIAL_ROLLED_BACK']);
  });

  it('a conflict rolls back and reports the server version', async () => {
    const { store } = setup(async () => ({ ok: false, error: 'conflict', currentVersion: 9 }));
    expect(await store.dispatch({ kind: 'add', specimenId: 'SP-A', decant: decant('D1', 'D1') })).toMatchObject({ ok: false, error: 'conflict', currentVersion: 9 });
  });

  it('a change the tree refuses is never shown or sent', async () => {
    const save = vi.fn();
    const { store, events } = setup(save);
    expect(await store.dispatch({ kind: 'delete', decantId: 'nope' })).toEqual({ ok: false, error: 'decantNotFound', rolledBack: false });
    expect(save).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('queued changes save in order, each on the previous version; when one fails, the ones built on it roll back too', async () => {
    const versions: number[] = [];
    let call = 0;
    const { store } = setup(async (_id: string, change: any, v: number) => {
      versions.push(v); call++;
      if (call === 2) return { ok: false, error: 'saveFailed' };
      return { ok: true, specimens: applyDecantChange(store.getState().specimens, change, 't').ok ? (applyDecantChange as any)(tree(), change, 't').specimens : [], version: v + 1, change: 'added', event: {} as any, billing: { changed: [], removedMaterialIds: [] } };
    });
    const a = store.dispatch({ kind: 'add', specimenId: 'SP-A', decant: decant('D1', 'D1') });
    const b = store.dispatch({ kind: 'add', specimenId: 'SP-A', decant: decant('D2', 'D2') });
    const c = store.dispatch({ kind: 'add', specimenId: 'SP-A', decant: decant('D3', 'D3') });
    expect(store.getState().specimens[0].decants.map((d: any) => d.id)).toEqual(['D1', 'D2', 'D3']);
    expect((await a).ok).toBe(true);
    expect(await b).toMatchObject({ ok: false, rolledBack: true });
    expect(await c).toMatchObject({ ok: false, error: 'superseded' });
    expect(versions).toEqual([4, 5]);
    expect(store.getState()).toMatchObject({ version: 5, pending: 0 });
  });

  it('replace() adopts a reloaded case, but not while changes are being saved', async () => {
    const { store } = setup(() => new Promise(() => {}));
    store.replace([{ id: 'SP-B', label: 'B' }], 7);
    expect(store.getState()).toMatchObject({ version: 7, specimens: [{ id: 'SP-B' }] });
    void store.dispatch({ kind: 'add', specimenId: 'SP-B', decant: decant('D1', 'D1') });
    store.replace([], 8);
    expect(store.getState().version).toBe(7);
  });
});

// Batch 453: a specimen edit that only touched decants becomes decant updates.
import { decantOnlyUpdates } from './materialTree';
describe('decantOnlyUpdates (Microtome decant slides, Batch 453)', () => {
  const sp = { id: 'SP', label: 'A', blocks: [], decants: [decant('D1', 'D1', { stains: [{ id: 's', stainName: 'PAP', printStatus: 'Pending' }] }), decant('D2', 'D2')] };
  it('returns the changed fields of each changed decant', () => {
    const after = { ...sp, decants: [{ ...sp.decants[0], stains: [{ id: 's', stainName: 'PAP', printStatus: 'Printed' }] }, sp.decants[1]] };
    expect(decantOnlyUpdates(sp as never, after as never)).toEqual([{ decantId: 'D1', patch: { stains: [{ id: 's', stainName: 'PAP', printStatus: 'Printed' }] } }]);
    expect(decantOnlyUpdates(sp as never, sp as never)).toEqual([]);
  });
  it('null when something else on the specimen changed, or decants were added or removed', () => {
    expect(decantOnlyUpdates(sp as never, { ...sp, label: 'B' } as never)).toBeNull();
    expect(decantOnlyUpdates(sp as never, { ...sp, decants: [sp.decants[0]] } as never)).toBeNull();
  });
});
