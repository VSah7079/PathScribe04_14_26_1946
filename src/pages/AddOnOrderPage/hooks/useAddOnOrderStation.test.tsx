// @vitest-environment happy-dom
// Batch 669 (ws-8): the Add-On Order station runs each action through the shared retrying save; a save that fails
// comes back as `notSaved` (not as done), the case is reloaded from the store, and a conflict re-runs the action on
// the newer case.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }), initReactI18next: { type: '3rdParty', init: () => {} } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-9', name: 'Dr Lee' } }) }));
vi.mock('@/hooks/useFieldRequirements', () => ({ useFieldRequirements: () => [] }));
vi.mock('@/services/communications/notificationService', () => ({ sendEmail: (...a: unknown[]) => h.sendEmail(...a) }));
vi.mock('@/services/cases/casePoolAssignmentService', () => ({ resolveCasePerformingLab: async () => undefined }));
const h = vi.hoisted(() => ({ store: { current: null as any }, getCase: vi.fn(), updateCase: vi.fn(), enforce: vi.fn(), sendEmail: vi.fn(), users: [] as any[] }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase: (...a: unknown[]) => h.getCase(...a) } }));
vi.mock('@/services', () => ({
  caseWriteDeps: { getCase: (...a: unknown[]) => h.getCase(...a), updateCase: (...a: unknown[]) => h.updateCase(...a) },
  userService: { getById: async (id: string) => { const u = h.users.find((x: any) => x.id === id); return u ? { ok: true, data: u } : { ok: false }; }, getAll: async () => ({ ok: true, data: h.users }) },
  facilityService: {}, stainTypeService: {}, scanStationService: {},
  authorizationService: { enforce: (...a: unknown[]) => h.enforce(...a) },
  activeReferenceLabs: () => [], molecularOrderEngine: { ingest: async () => ({ refused: [] }) },
}));

import { useAddOnOrderStation } from './useAddOnOrderStation';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';

const makeCase = (version: number, retrieved = false) => ({
  id: 'c1', version, accession: { fullAccession: 'S26-0001' },
  specimens: [{ id: 'sp1', label: 'A', blocks: [{ id: 'b1', label: '1', status: 'Grossed', stains: [
    { id: 'o1', stainName: 'IHC', orderedByPathologistId: 'p1', ...(retrieved ? { blockRetrievedAt: 'x' } : {}) },
  ] }] }],
});

async function open() {
  h.store.current = makeCase(1);
  h.getCase.mockImplementation(async () => h.store.current);
  const hook = renderHook(() => useAddOnOrderStation());
  await act(async () => { await hook.result.current.openCase('S26-0001'); });
  return hook;
}
const retrievedAt = (hook: Awaited<ReturnType<typeof open>>) => hook.result.current.caseData!.specimens![0].blocks![0].stains[0].blockRetrievedAt;

beforeEach(() => {
  h.enforce.mockReset().mockResolvedValue({ allowed: true });
  h.sendEmail.mockReset().mockResolvedValue(true);
  h.users = [];
  h.updateCase.mockReset().mockImplementation(async (_id: string, u: any) => { h.store.current = { ...h.store.current, specimens: u.specimens, version: h.store.current.version + 1 }; });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('useAddOnOrderStation — saving (ws-8)', () => {
  it('a saved action shows the stored case', async () => {
    const hook = await open();
    let r: any;
    await act(async () => { r = await hook.result.current.handleMarkBlockRetrieved('o1'); });
    expect(r.ok).toBe(true);
    expect(r.notSaved).toBeUndefined();
    expect(retrievedAt(hook)).toBeTruthy();
    expect(h.updateCase.mock.calls[0][2]).toBe(1);
  });

  it('a save that fails is not reported as done, and the case is reloaded as stored', async () => {
    const hook = await open();
    h.updateCase.mockRejectedValue(new Error('down'));
    let r: any;
    await act(async () => { r = await hook.result.current.handleMarkBlockRetrieved('o1'); });
    expect(r).toEqual({ ok: false, notSaved: 'notApplied' });
    expect(retrievedAt(hook)).toBeUndefined();
  });

  it('a conflict re-runs the action on the newer case and saves it', async () => {
    const hook = await open();
    // Someone else saves first: the first write is refused, and the newer case is what the retry reads.
    h.updateCase.mockImplementationOnce(async () => { h.store.current = makeCase(2); throw new ConcurrencyConflictError('c1', 1, 2); });
    let r: any;
    await act(async () => { r = await hook.result.current.handleMarkBlockRetrieved('o1'); });
    expect(r.ok).toBe(true);
    expect(h.updateCase.mock.calls.map(c => c[2])).toEqual([1, 2]);
    expect(retrievedAt(hook)).toBeTruthy();
  });

  it('three conflicts in a row come back as notSaved "conflict"', async () => {
    const hook = await open();
    h.updateCase.mockImplementation(async (_i: string, _u: unknown, v: number) => { throw new ConcurrencyConflictError('c1', v, v + 1); });
    let r: any;
    await act(async () => { r = await hook.result.current.handleMarkBlockRetrieved('o1'); });
    expect(r).toEqual({ ok: false, notSaved: 'conflict' });
    expect(h.updateCase).toHaveBeenCalledTimes(3);
  });

  it('an action refused before any save (no such order) saves nothing and is not "Not saved"', async () => {
    const hook = await open();
    let r: any;
    await act(async () => { r = await hook.result.current.handleMarkBlockRetrieved('nope'); });
    expect(r).toEqual({ ok: false, failed: true });
    expect(h.updateCase).not.toHaveBeenCalled();
  });
});

describe('useAddOnOrderStation — Batch 669 (ws-19, ws-20, ws-3)', () => {
  it('ws-19: Mark Block Retrieved and Flag Exception are refused without their capabilities, and nothing is saved', async () => {
    const hook = await open();
    h.enforce.mockResolvedValue({ allowed: false });
    let r: any;
    await act(async () => { r = await hook.result.current.handleMarkBlockRetrieved('o1'); });
    expect(r).toMatchObject({ ok: false, notPermitted: true });
    expect(h.enforce).toHaveBeenCalledWith('add-on:block:mark-retrieved', { caseId: 'c1' });
    await act(async () => { r = await hook.result.current.handleFlagException('o1', 'Block exhausted', 'x'); });
    expect(r).toMatchObject({ ok: false, notPermitted: true });
    expect(h.enforce).toHaveBeenCalledWith('add-on:exception:flag', { caseId: 'c1' });
    expect(h.updateCase).not.toHaveBeenCalled();
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it('ws-20: the primary pathologist is shown by name, not by the stored id', async () => {
    h.users = [{ id: 'PATH-001', firstName: 'Pat', lastName: 'Ho', email: 'pat@lab.org', status: 'Active', roles: [] }];
    h.store.current = { ...makeCase(1), order: { assignedTo: 'PATH-001' } };
    h.getCase.mockImplementation(async () => h.store.current);
    const hook = renderHook(() => useAddOnOrderStation());
    await act(async () => { await hook.result.current.openCase('S26-0001'); });
    await vi.waitFor(() => expect(hook.result.current.primaryPathologistName).toBe('Pat Ho'));
  });

  it('ws-20: a value that is not a known user is shown as stored (it may already be a name)', async () => {
    h.store.current = { ...makeCase(1), order: { assignedTo: 'Dr. Chen' } };
    h.getCase.mockImplementation(async () => h.store.current);
    const hook = renderHook(() => useAddOnOrderStation());
    await act(async () => { await hook.result.current.openCase('S26-0001'); });
    await vi.waitFor(() => expect(hook.result.current.primaryPathologistName).toBe('Dr. Chen'));
  });

  it('ws-3: a slide with an open exception is listed for answering even when it was not ordered here', async () => {
    h.store.current = makeCase(1);
    h.store.current.specimens[0].blocks[0].stains.push({ id: 'he1', stainName: 'H&E', exception: { reason: 'Block exhausted', status: 'pending_pathologist_review', flaggedBy: 't', flaggedByName: 'Tech', flaggedAt: 'T' } });
    h.store.current.specimens[0].blocks[0].stains.push({ id: 'he2', stainName: 'H&E' });
    h.getCase.mockImplementation(async () => h.store.current);
    const hook = renderHook(() => useAddOnOrderStation());
    await act(async () => { await hook.result.current.openCase('S26-0001'); });
    expect(hook.result.current.trackedOrders().map(o => o.order.id).sort()).toEqual(['he1', 'o1']);
  });

  it('ws-3: flagging an original slide e-mails the Supervisor / Accessioning Desk', async () => {
    h.users = [{ id: 'ac', firstName: 'Ann', lastName: 'Desk', email: 'desk@lab.org', status: 'Active', roles: ['accessioner'] }];
    h.store.current = makeCase(1);
    h.store.current.specimens[0].blocks[0].stains.push({ id: 'he2', stainName: 'H&E' });
    h.getCase.mockImplementation(async () => h.store.current);
    const hook = renderHook(() => useAddOnOrderStation());
    await act(async () => { await hook.result.current.openCase('S26-0001'); });
    let r: any;
    await act(async () => { r = await hook.result.current.handleFlagException('he2', 'Block exhausted', 'nothing left'); });
    expect(r).toMatchObject({ ok: true, noticeToDesk: true });
    expect(h.sendEmail.mock.calls[0][0].to).toEqual(['desk@lab.org']);
  });
});
