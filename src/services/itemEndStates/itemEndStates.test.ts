// Batch 731 (spec §10.5): item end states — a reason is required, a person needs material:end-state:record, the
// system records from another action without it, and the newest record is the item's current end state.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { endStateProblems, currentEndStateOf, endStatesFor } from './itemEndStateRules';
import type { NewItemEndState, ItemEndState } from './IItemEndStateService';

const { enforce } = vi.hoisted(() => ({ enforce: vi.fn(async (_key: string) => ({ allowed: true })) }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (k: string) => enforce(k) } }));

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; }, clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: () => null, length: 0,
  });
  enforce.mockImplementation(async () => ({ allowed: true }));
});

const base: NewItemEndState = {
  itemId: 'S26-4403-A1', materialType: 'block', caseAccession: 'S26-4403', state: 'returned_to_storage',
  reason: 'Work complete', userId: 'u1', userName: 'Tech A',
};

describe('item end state rules', () => {
  it('needs the item, a known end state, a reason and a user', () => {
    expect(endStateProblems(base)).toEqual([]);
    expect(endStateProblems({ ...base, reason: '  ' })).toEqual(['reasonMissing']);
    expect(endStateProblems({ ...base, state: 'lost' as never })).toEqual(['stateUnknown']);
    expect(endStateProblems({ ...base, itemId: '' })).toEqual(['itemMissing']);
  });
  it('the newest record is the current end state', () => {
    const rec = (id: string, at: string, state: ItemEndState['state']): ItemEndState => ({ ...base, id, at, state, source: 'manual' });
    const records = [rec('2', '2026-10-30T10:00:00Z', 'archived'), rec('1', '2026-10-29T10:00:00Z', 'returned_to_storage')];
    expect(currentEndStateOf(records, 's26-4403-a1')?.state).toBe('archived');
    expect(currentEndStateOf(records, 'S26-4403-A2')).toBeUndefined();
  });
  it('"exhausted" is never recorded by hand (Batch 732: it follows the block\'s status)', () => {
    expect(endStatesFor('slide')).not.toContain('exhausted');
    expect(endStatesFor('block')).not.toContain('exhausted');
    expect(endStatesFor('block')).toContain('archived');
  });
  it('a withdrawn end state (the block was re-embedded) means no current end state', () => {
    const rec = (id: string, at: string, extra: Partial<ItemEndState> = {}): ItemEndState => ({ ...base, id, at, state: 'exhausted', source: 'exhaustion_flag', ...extra });
    expect(currentEndStateOf([rec('1', '2026-10-29T10:00:00Z'), rec('2', '2026-10-30T10:00:00Z', { withdrawn: true, source: 'reembedded' })], 'S26-4403-A1')).toBeUndefined();
  });
});

describe('mockItemEndStateService', () => {
  it('a person needs material:end-state:record; a reason is required', async () => {
    const { mockItemEndStateService: svc } = await import('./mockItemEndStateService');
    enforce.mockImplementation(async () => ({ allowed: false }));
    expect(await svc.record(base)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(enforce).toHaveBeenCalledWith('material:end-state:record');
    enforce.mockImplementation(async () => ({ allowed: true }));
    expect(await svc.record({ ...base, reason: '' })).toEqual({ ok: false, error: 'INVALID' });
    const r = await svc.record(base);
    expect(r.ok && r.data.source).toBe('manual');
  });
  it('the system records from an action without the capability, never as manual, and history is kept', async () => {
    const { mockItemEndStateService: svc } = await import('./mockItemEndStateService');
    enforce.mockClear();
    enforce.mockImplementation(async () => ({ allowed: false }));
    expect(await svc.recordFromAction({ ...base, source: 'manual' as never })).toEqual({ ok: false, error: 'INVALID' });
    const r = await svc.recordFromAction({ ...base, state: 'discarded', reason: 'Disposed at retention end', source: 'disposal' });
    expect(r.ok && r.data.source).toBe('disposal');
    expect(enforce).not.toHaveBeenCalled();
    const list = await svc.listForItems(['s26-4403-a1']);
    expect(list.ok && list.data.map(x => x.state)).toEqual(['discarded']);
    const byCase = await svc.listForCase('S26-4403');
    expect(byCase.ok && byCase.data).toHaveLength(1);
  });
});
