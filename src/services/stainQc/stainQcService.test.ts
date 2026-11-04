// Batch 763: the Post-Stain / Pre-Distribution QC gate's service: opening a run in each mode, a PathScribe sign-off
// (passed, failed with re-stain or re-cut), the instrument's own sign-off (Option A), the override, image QC, the
// audit trail, and refusals without the capability.
import { describe, it, expect, vi } from 'vitest';
import { createStainQcService, type StainQcDeps, type StainQcStore } from './stainQcService';
import type { ImageQcItem, QcMode, StainQcSettings, StainRunQc } from './stainQcTypes';

function memoryStore(settings: StainQcSettings | null = null): StainQcStore {
  let s = settings; let runs: StainRunQc[] = []; let images: ImageQcItem[] = [];
  return {
    settings: async () => s, saveSettings: async x => { s = x; },
    runs: async () => runs, saveRuns: async r => { runs = r; },
    images: async () => images, saveImages: async i => { images = i; },
  };
}

const EQUIPMENT: Record<string, { id: string; code: string; kind: string; qcMode?: QcMode }> = {
  VENDOR: { id: 'eq-v', code: 'VENDOR', kind: 'stainer', qcMode: 'vendorSignOff' },
  AUTO: { id: 'eq-a', code: 'AUTO', kind: 'stainer', qcMode: 'autoAccept' },
  PLAIN: { id: 'eq-p', code: 'PLAIN', kind: 'stainer' },
  SCAN: { id: 'eq-s', code: 'SCAN', kind: 'slide_scanner', qcMode: 'pathscribeSignOff' },
};

function setup(opts: { deny?: string[]; settings?: StainQcSettings } = {}) {
  const audit = vi.fn(async (_e: { event: string; detail: string; caseId: string | null }) => undefined);
  const setSlideStatuses = vi.fn(async (_u: { slideId: string; caseAccession: string; status: string }[]) => undefined);
  const setImageOutcome = vi.fn(async (_u: unknown) => undefined);
  const recordVisualRead = vi.fn(async () => undefined);
  const decide = async (k: string) => ({ allowed: !(opts.deny ?? []).includes(k) });
  const deps: StainQcDeps = {
    authorization: { enforce: vi.fn(decide), evaluate: vi.fn(decide) } as never,
    store: memoryStore(opts.settings ?? null),
    equipment: async k => EQUIPMENT[k.toUpperCase()] ?? Object.values(EQUIPMENT).find(e => e.id === k) ?? null,
    setSlideStatuses, setImageOutcome, recordVisualRead,
    now: () => new Date('2026-11-02T10:00:00Z'),
    actor: () => ({ userId: 'u1', userName: 'Tech A' }),
    audit,
  };
  return { svc: createStainQcService(deps), audit, setSlideStatuses, setImageOutcome, recordVisualRead };
}

const slides = [{ slideId: 'S26-4403-A1-H&E', caseAccession: 'S26-4403' }, { slideId: 'S26-4403-A2-H&E', caseAccession: 'S26-4403' }];
const run = (stainer: string | null) => ({ batchId: 'b1', masterBarcode: 'RACK-01', stainerIdOrCode: stainer, slides });
const events = (audit: ReturnType<typeof setup>['audit']) => audit.mock.calls.map(c => c[0].event);

describe('stain QC: opening a run', () => {
  it('holds the slides for a PathScribe sign-off by default, and audits it', async () => {
    const { svc, setSlideStatuses, audit } = setup();
    const r = await svc.openRun(run('PLAIN'));
    expect(r).toMatchObject({ mode: 'pathscribeSignOff', status: 'pending', stainerEquipmentId: 'eq-p' });
    expect(setSlideStatuses).toHaveBeenCalledWith(slides.map(s => ({ ...s, status: 'QC Pending' })));
    expect(events(audit)).toEqual(['Stain QC Pending']);
  });

  it('opens a run once', async () => {
    const { svc } = setup();
    const a = await svc.openRun(run('PLAIN'));
    const b = await svc.openRun({ ...run('AUTO') });
    expect(b).toEqual(a);
  });

  it('passes every slide of an auto-accept stainer at once', async () => {
    const { svc, setSlideStatuses, audit } = setup();
    const r = await svc.openRun(run('AUTO'));
    expect(r).toMatchObject({ status: 'passed', via: 'auto', decidedBy: 'System' });
    expect(setSlideStatuses.mock.calls[0][0].every(u => u.status === 'Ready for Review')).toBe(true);
    expect(audit.mock.calls[0][0].detail).toContain('auto-accepted');
  });

  it('uses the lab default when the stainer is unknown or has no mode', async () => {
    const { svc } = setup({ settings: { defaultStainerMode: 'autoAccept', defaultScannerMode: 'autoAccept' } });
    expect((await svc.openRun(run(null))).status).toBe('passed');
  });
});

describe('stain QC: signing off in PathScribe (Option B)', () => {
  it('passes the run and records the visual read', async () => {
    const { svc, recordVisualRead, audit } = setup();
    await svc.openRun(run('PLAIN'));
    const r = await svc.signOffRun('b1', slides.map(s => ({ ...s, outcome: 'pass' })));
    expect(r.ok && r.data).toMatchObject({ status: 'passed', via: 'pathscribe', decidedBy: 'Tech A' });
    expect(recordVisualRead).toHaveBeenCalledWith('b1', { userId: 'u1', userName: 'Tech A' });
    expect(events(audit)).toContain('Stain QC Passed');
    expect((await svc.getCheckpoint()).ok && (await svc.getCheckpoint())).toMatchObject({ data: { runs: [] } });
  });

  it('fails a slide with its follow-up: re-stain holds it as QC Failed, re-cut as Recut Requested', async () => {
    const { svc, setSlideStatuses, audit } = setup();
    await svc.openRun(run('PLAIN'));
    setSlideStatuses.mockClear();
    const r = await svc.signOffRun('b1', [
      { ...slides[0], outcome: 'fail', action: 'recut', reason: 'tissueFolded' },
      { ...slides[1], outcome: 'fail', action: 'restain', reason: 'weakStaining' },
    ]);
    expect(r.ok && r.data.status).toBe('failed');
    expect(setSlideStatuses.mock.calls[0][0].map(u => u.status)).toEqual(['Recut Requested', 'QC Failed']);
    const failed = audit.mock.calls.find(c => c[0].event === 'Stain QC Failed')![0];
    expect(failed.caseId).toBe('S26-4403');
    expect(failed.detail).toContain('re-cut requested');
  });

  it('refuses a sign-off missing a slide or a failed slide’s follow-up', async () => {
    const { svc } = setup();
    await svc.openRun(run('PLAIN'));
    expect(await svc.signOffRun('b1', [{ ...slides[0], outcome: 'pass' }])).toEqual({ ok: false, error: 'INVALID' });
    expect(await svc.signOffRun('b1', slides.map(s => ({ ...s, outcome: 'fail' as const })))).toEqual({ ok: false, error: 'INVALID' });
  });

  it('refuses without stain:qc:sign-off, and a second decision', async () => {
    const denied = setup({ deny: ['stain:qc:sign-off'] });
    await denied.svc.openRun(run('PLAIN'));
    expect(await denied.svc.signOffRun('b1', slides.map(s => ({ ...s, outcome: 'pass' })))).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    const { svc } = setup();
    await svc.openRun(run('PLAIN'));
    await svc.signOffRun('b1', slides.map(s => ({ ...s, outcome: 'pass' })));
    expect(await svc.signOffRun('b1', slides.map(s => ({ ...s, outcome: 'pass' })))).toEqual({ ok: false, error: 'ALREADY_DECIDED' });
  });
});

describe("stain QC: the stainer's own sign-off (Option A)", () => {
  it("is decided by the instrument's result; a failed slide is held for re-stain", async () => {
    const { svc, recordVisualRead } = setup();
    await svc.openRun(run('VENDOR'));
    const r = await svc.vendorRunResult({ batchId: 'b1', result: 'fail', failedSlideIds: [slides[1].slideId], vendorRef: 'V-77' });
    expect(r.ok && r.data).toMatchObject({ status: 'failed', via: 'vendor', vendorRef: 'V-77' });
    expect(r.ok && r.data.outcomes?.map(o => o.outcome)).toEqual(['pass', 'fail']);
    expect(recordVisualRead).not.toHaveBeenCalled();
  });

  it("ignores the instrument's result for a run signed off in PathScribe", async () => {
    const { svc, audit } = setup();
    await svc.openRun(run('PLAIN'));
    expect(await svc.vendorRunResult({ batchId: 'b1', result: 'pass' })).toEqual({ ok: false, error: 'NOT_VENDOR_MODE' });
    expect(events(audit)).toContain('Stain QC Instrument Result Ignored');
  });

  it('needs stain:qc:override to sign off instead of the stainer, and audits the override', async () => {
    const denied = setup({ deny: ['stain:qc:override'] });
    await denied.svc.openRun(run('VENDOR'));
    expect(await denied.svc.signOffRun('b1', slides.map(s => ({ ...s, outcome: 'pass' })))).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    const { svc, audit } = setup();
    await svc.openRun(run('VENDOR'));
    expect((await svc.signOffRun('b1', slides.map(s => ({ ...s, outcome: 'pass' })))).ok).toBe(true);
    expect(audit.mock.calls.find(c => c[0].event === 'Stain QC Passed')![0].detail).toContain('instead of the stainer (override)');
  });
});

describe('image QC', () => {
  const image = { stainId: 'st1', caseId: 'c1', blockId: 'bl1', slideLabel: 'A1 H&E', caseAccession: 'S26-4403', scanBatchId: 'sb1', scanBatchBarcode: 'SCAN-01', scannerInstrumentId: 'SCAN', mode: 'pathscribeSignOff' as const };

  it("a scanner's mode is its own, else the default", async () => {
    const { svc } = setup();
    expect(await svc.scannerMode('SCAN')).toBe('pathscribeSignOff');
    expect(await svc.scannerMode('UNKNOWN')).toBe('autoAccept');
  });

  it('queues held images, releases one and sends one back with a reason', async () => {
    const { svc, setImageOutcome, audit } = setup();
    await svc.queueImages([image, { ...image, stainId: 'st2' }]);
    const cp = await svc.getCheckpoint();
    expect(cp.ok && cp.data.images.map(i => i.stainId)).toEqual(['st1', 'st2']);
    expect((await svc.decideImage('st1', 'pass')).ok).toBe(true);
    expect(setImageOutcome).toHaveBeenCalledWith({ caseId: 'c1', stainId: 'st1', blockId: 'bl1', outcome: 'scanned' });
    expect(await svc.decideImage('st2', 'fail')).toEqual({ ok: false, error: 'INVALID' });
    expect((await svc.decideImage('st2', 'fail', 'outOfFocus')).ok).toBe(true);
    expect(setImageOutcome).toHaveBeenLastCalledWith({ caseId: 'c1', stainId: 'st2', blockId: 'bl1', outcome: 'imageQcFailed' });
    expect(events(audit)).toEqual(['Image QC Pending', 'Image QC Passed', 'Image QC Failed']);
  });

  it('refuses without scan:image-qc:sign-off, and hides images from the checkpoint', async () => {
    const { svc } = setup({ deny: ['scan:image-qc:sign-off'] });
    await svc.queueImages([image]);
    expect(await svc.decideImage('st1', 'pass')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    const cp = await svc.getCheckpoint();
    expect(cp.ok && cp.data.images).toEqual([]);
  });
});

describe('QC defaults', () => {
  it('saves valid defaults with config:stain-qc:manage, audited', async () => {
    const { svc, audit } = setup();
    const r = await svc.saveSettings({ defaultStainerMode: 'vendorSignOff', defaultScannerMode: 'pathscribeSignOff' });
    expect(r.ok && r.data).toMatchObject({ defaultStainerMode: 'vendorSignOff', updatedBy: 'Tech A' });
    expect(events(audit)).toEqual(['Stain QC Settings Saved']);
    expect(await svc.saveSettings({ defaultStainerMode: 'nope' as never, defaultScannerMode: 'autoAccept' })).toEqual({ ok: false, error: 'INVALID' });
  });

  it('refuses without the capability', async () => {
    const { svc } = setup({ deny: ['config:stain-qc:manage'] });
    expect(await svc.saveSettings({ defaultStainerMode: 'autoAccept', defaultScannerMode: 'autoAccept' })).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
});
