// Batch 611 (#189): the Smart Capture review flow end to end, with in-memory dependencies.
import { describe, it, expect, vi } from 'vitest';
import type { Specimen } from '@/types/case/Specimen';
import { createSmartCaptureService, createSmartCaptureSettingsService, type SmartCaptureDeps } from './smartCaptureService';
import { SMART_CAPTURE_CHECKLIST_IDS } from './smartCaptureSettings';

const specimens = (desc = 'Colon, sigmoid colectomy') => [{
  id: 'sp1', label: 'A', description: desc,
  blocks: [{ id: 'b1', stains: [{ stainName: 'PAS', status: 'Ordered' }, { stainName: 'CK7', status: 'Ordered' }] }],
}] as unknown as Specimen[];

function build(over: Partial<SmartCaptureDeps> & { role?: string; allow?: boolean; simulated?: boolean; cpt?: boolean; sp?: Specimen[] } = {}) {
  const store: Record<string, unknown> = {};
  const audit: { event: string; detail: string; caseId: string | null }[] = [];
  const dispatch = vi.fn(async () => ({ ok: true }));
  const state = { sp: over.sp ?? specimens() };
  const deps: SmartCaptureDeps = {
    load: <T,>(k: string, f: T) => (k in store ? (store[k] as T) : f),
    save: (k, v) => { store[k] = v; },
    audit: async e => { audit.push(e as never); },
    enforce: async () => ({ allowed: over.allow ?? true }),
    actor: () => ({ name: 'Dr Okafor', role: over.role ?? 'pathologist' }),
    facilityIdFor: async () => 'F1',
    specimensFor: async () => state.sp,
    cptActive: async () => over.cpt ?? true,
    financialClassFor: async () => undefined,
    dispatch: over.dispatch ?? dispatch,
    engineSimulated: () => over.simulated ?? true,
    now: () => '2026-10-18T10:00:00.000Z',
    ...over,
  };
  return { svc: createSmartCaptureService(deps), settings: createSmartCaptureSettingsService(deps), store, audit, dispatch, state };
}

async function reviewAll(svc: ReturnType<typeof build>['svc'], decision: 'accepted' | 'rejected' = 'accepted') {
  const v = await svc.suggest('C1');
  if (!v.ok) throw new Error(v.error);
  for (const l of v.data.record!.lines) await svc.review('C1', l.key, decision);
}

describe('Smart Capture service', () => {
  it('suggests lines, labels them suggested and audits without patient data', async () => {
    const { svc, audit } = build();
    const r = await svc.suggest('C1');
    expect(r.ok && r.data.state).toBe('suggested');
    expect(audit[0].event).toBe('Smart Capture Suggested');
    expect(audit[0].detail).toMatch(/SIMULATED, prototype/);
    expect(audit[0].detail).not.toMatch(/colon|sigmoid/i);
  });

  it('keeps the suggestions on a second open instead of starting over', async () => {
    const { svc, audit } = build();
    await svc.suggest('C1'); await svc.suggest('C1');
    expect(audit).toHaveLength(1);
  });

  it('suggests nothing when CPT is off for the case', async () => {
    const { svc } = build({ cpt: false });
    expect(await svc.suggest('C1')).toEqual({ ok: false, error: 'CPT_OFF' });
  });

  it('refuses every step without the capability', async () => {
    const { svc } = build({ allow: false });
    expect(await svc.suggest('C1')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await svc.approve('C1', { confirmed: true })).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await svc.exportLines('C1')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });

  it('goes suggested, reviewed, approved, exported, and never sends before approval', async () => {
    const { svc, dispatch, audit } = build();
    await reviewAll(svc);
    expect((await svc.exportLines('C1'))).toEqual({ ok: false, error: 'NOT_APPROVED' });
    expect(dispatch).not.toHaveBeenCalled();
    expect(await svc.approve('C1', { confirmed: false })).toEqual({ ok: false, error: 'NOT_CONFIRMED' });
    const a = await svc.approve('C1', { confirmed: true });
    expect(a.ok && a.data.state).toBe('approved');
    expect(dispatch).not.toHaveBeenCalled();
    const e = await svc.exportLines('C1');
    expect(e.ok && e.data.state).toBe('exported');
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(audit.map(x => x.event)).toEqual(expect.arrayContaining(['Smart Capture Suggested', 'Smart Capture Line Accepted', 'Smart Capture Approved', 'Simulated Smart Capture Exported']));
    expect(await svc.exportLines('C1')).toEqual({ ok: false, error: 'ALREADY_EXPORTED' });
  });

  it('refuses approval by anyone who is not a pathologist', async () => {
    const { svc } = build({ role: 'admin' });
    await reviewAll(svc);
    expect(await svc.approve('C1', { confirmed: true })).toEqual({ ok: false, error: 'NOT_A_PATHOLOGIST' });
  });

  it('keeps a rejected line out of the payload', async () => {
    const { svc, dispatch } = build();
    const v = await svc.suggest('C1');
    const lines = v.ok ? v.data.record!.lines : [];
    await svc.review('C1', lines[0].key, 'accepted');
    for (const l of lines.slice(1)) await svc.review('C1', l.key, 'rejected');
    await svc.approve('C1', { confirmed: true });
    await svc.exportLines('C1');
    const sent = (dispatch.mock.calls[0] as unknown as [string, { lines: { cpt: string }[]; prototype: boolean; complianceReviewed: boolean; simulated: boolean }])[1];
    expect(sent.lines).toHaveLength(1);
    expect(sent).toMatchObject({ prototype: true, complianceReviewed: false, simulated: true });
  });

  it('shows the payload preview before approval from the accepted lines', async () => {
    const { svc } = build();
    await reviewAll(svc);
    const p = await svc.preview('C1');
    expect(p.ok && p.data.lines.length).toBeGreaterThan(0);
  });

  it('turns the review stale when the case changes, and refuses to approve it', async () => {
    const { svc, state } = build();
    await reviewAll(svc);
    state.sp = specimens('Appendectomy');
    const g = await svc.get('C1');
    expect(g.ok && g.data.stale).toBe(true);
    expect(await svc.approve('C1', { confirmed: true })).toEqual({ ok: false, error: 'STALE' });
  });

  it('refuses export to a real engine while the production gate is closed, and allows it once the checklist is complete and activated', async () => {
    const { svc, settings, dispatch } = build({ simulated: false });
    await reviewAll(svc);
    await svc.approve('C1', { confirmed: true });
    expect(await svc.exportLines('C1')).toEqual({ ok: false, error: 'PRODUCTION_GATED' });
    expect(dispatch).not.toHaveBeenCalled();
    expect(await settings.setProductionActivated(true)).toEqual({ ok: false, error: 'CHECKLIST_INCOMPLETE' });
    for (const id of SMART_CAPTURE_CHECKLIST_IDS) await settings.setChecklistItem(id, true);
    expect((await settings.setProductionActivated(true)).ok).toBe(true);
    const e = await svc.exportLines('C1');
    expect(e.ok && e.data.record?.exportSimulated).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('keeps the approval when delivery fails, and reports it', async () => {
    const { svc } = build({ dispatch: async () => ({ ok: false, error: 'down' }) });
    await reviewAll(svc);
    await svc.approve('C1', { confirmed: true });
    expect(await svc.exportLines('C1')).toEqual({ ok: false, error: 'DISPATCH_FAILED' });
    const g = await svc.get('C1');
    expect(g.ok && g.data.state).toBe('approved');
  });

  it('restart throws away an approved record and suggests again, audited', async () => {
    const { svc, audit } = build();
    await reviewAll(svc);
    await svc.approve('C1', { confirmed: true });
    const r = await svc.restart('C1');
    expect(r.ok && r.data.state).toBe('suggested');
    expect(audit.some(a => a.event === 'Smart Capture Restarted')).toBe(true);
  });

  it('audits settings changes, and unticking closes production', async () => {
    const { settings, audit } = build();
    expect((await settings.setPrototypeEnabled(false)).ok).toBe(true);
    for (const id of SMART_CAPTURE_CHECKLIST_IDS) await settings.setChecklistItem(id, true);
    await settings.setProductionActivated(true);
    const u = await settings.setChecklistItem('legal', false);
    expect(u.ok && u.data.productionActivated).toBe(false);
    expect(await settings.setChecklistItem('bogus', true)).toEqual({ ok: false, error: 'UNKNOWN_ITEM' });
    expect(audit.map(a => a.event)).toEqual(expect.arrayContaining(['Smart Capture Prototype Switched', 'Smart Capture Checklist Changed', 'Smart Capture Production Gate Changed']));
  });
});
