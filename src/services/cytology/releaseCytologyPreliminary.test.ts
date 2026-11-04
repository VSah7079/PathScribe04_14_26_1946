// src/services/cytology/releaseCytologyPreliminary.test.ts
// Batch 533 (Pete, Oct 12, 2026): an urgent per-specimen cytology preliminary.
import { describe, it, expect, vi } from 'vitest';
import {
  releaseCytologyPreliminary, cytologyPreliminaryBlock, cytologyPreliminariesFor, preliminarySignatureRequired,
  type CytologyPreliminaryDeps, type CytologyPreliminaryInput,
} from './releaseCytologyPreliminary';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';

const NOW = new Date('2026-10-12T15:00:00.000Z');
const content = { accessionNumber: 'S26-0200', patientName: 'Roe, Jane', primaryInterpretation: 'HSIL', specimenAdequacy: [], additionalInterpretations: [], recommendations: [],
  signedBy: { name: 'Dr Review', isPathologist: true }, signedAt: '2026-10-12T09:00:00.000Z' } as any;
const baseCase = { id: 'C1', status: 'in-progress', accession: { fullAccession: 'S26-0200' }, order: { facilityId: 'F1' }, specimens: [{ id: 'SP1' }, { id: 'SP2' }] } as any;

function makeDeps(over: Partial<CytologyPreliminaryDeps> = {}) {
  const store = new Map<string, any>([['C1', { ...baseCase, version: 0 }]]);
  const deps: CytologyPreliminaryDeps = {
    enforce: vi.fn(async () => ({ allowed: true })),
    signatureGate: { accept: vi.fn(async () => ({ ok: true as const })), commit: vi.fn(async () => undefined), release: vi.fn() },
    getCase: async id => (store.has(id) ? JSON.parse(JSON.stringify(store.get(id))) : undefined),
    updateCase: vi.fn(async (id: string, patch: Record<string, unknown>, expected: number) => {
      const cur = store.get(id);
      if ((cur.version ?? 0) !== expected) throw new ConcurrencyConflictError(id, expected, cur.version ?? 0);
      store.set(id, { ...cur, ...JSON.parse(JSON.stringify(patch)), version: (cur.version ?? 0) + 1 });
    }),
    getCaseSignOutRecords: async () => ({ ok: true, data: [] }),
    getComplianceSettings: async () => ({ enterprise: {}, facility: null }),
    logAudit: vi.fn(),
    publishReportReleased: vi.fn(async () => undefined),
    now: () => NOW,
    newId: () => 'n1',
    renderPdfSnapshot: vi.fn(async () => ({ pdfBase64: 'PRELIM' })),
    ...over,
  };
  return { deps, store };
}
const input = (over: Partial<CytologyPreliminaryInput> = {}): CytologyPreliminaryInput => ({
  caseData: baseCase, specimenId: 'SP1', reviewRecordId: 'rv-1', content, reason: 'criticalFinding', note: '  Call Dr Smith  ',
  user: { id: 'P1', name: 'Dr Path', isPathologist: true }, confirmation: { confirmationId: 'c1' } as any, ...over,
});

describe('releaseCytologyPreliminary', () => {
  it('is refused without cytology:preliminary:release, and nothing is written', async () => {
    const { deps } = makeDeps({ enforce: vi.fn(async () => ({ allowed: false })) });
    expect(await releaseCytologyPreliminary(input(), deps)).toEqual({ ok: false, error: 'notPermitted' });
    expect(deps.enforce).toHaveBeenCalledWith('cytology:preliminary:release', { caseId: 'C1' });
    expect(deps.updateCase).not.toHaveBeenCalled();
    expect(deps.publishReportReleased).not.toHaveBeenCalled();
  });

  it('needs one of the quick-pick reasons', async () => {
    const { deps } = makeDeps();
    expect(await releaseCytologyPreliminary(input({ reason: '' }), deps)).toEqual({ ok: false, error: 'reasonMissing' });
    expect(await releaseCytologyPreliminary(input({ reason: 'whatever' }), deps)).toEqual({ ok: false, error: 'reasonMissing' });
  });

  it('only before the specimen is signed out and the case released, and with a final diagnosis', async () => {
    const signed = makeDeps({ getCaseSignOutRecords: async () => ({ ok: true, data: [{ specimenId: 'SP1' } as any] }) });
    expect(await releaseCytologyPreliminary(input(), signed.deps)).toEqual({ ok: false, error: 'alreadySignedOut' });
    const { deps } = makeDeps();
    expect(await releaseCytologyPreliminary(input({ caseData: { ...baseCase, status: 'finalized' } }), deps)).toEqual({ ok: false, error: 'caseReleased' });
    expect(await releaseCytologyPreliminary(input({ reviewRecordId: undefined, content: null }), deps)).toEqual({ ok: false, error: 'noFinalDiagnosis' });
    // Another specimen's sign-out doesn't stop it.
    const other = makeDeps({ getCaseSignOutRecords: async () => ({ ok: true, data: [{ specimenId: 'SP2' } as any] }) });
    expect((await releaseCytologyPreliminary(input(), other.deps)).ok).toBe(true);
  });

  it('sends it: kept on the case as sent, signed, audited, and published as an urgent PRELIMINARY with its own PDF', async () => {
    const { deps, store } = makeDeps();
    const result = await releaseCytologyPreliminary(input(), deps);
    expect(result.ok).toBe(true);
    const saved = store.get('C1').cytologyPreliminaryReleases;
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      id: 'cyto-prelim-n1', specimenId: 'SP1', reviewRecordId: 'rv-1', reason: 'criticalFinding', note: 'Call Dr Smith', signed: true,
      releasedAt: NOW.toISOString(), releasedBy: { userId: 'P1', userName: 'Dr Path' },
    });
    // Released by the pathologist who sent it, now; the banner fields set.
    expect(saved[0].reportContent).toMatchObject({ signedBy: { name: 'Dr Path', isPathologist: true }, signedAt: NOW.toISOString(), preliminary: { reason: 'criticalFinding', note: 'Call Dr Smith' }, primaryInterpretation: 'HSIL' });
    expect(deps.signatureGate.accept).toHaveBeenCalledWith({ confirmationId: 'c1' }, { caseId: 'C1', caseRef: 'S26-0200', actions: ['cytology-preliminary'] });
    expect(deps.signatureGate.commit).toHaveBeenCalledWith('C1', 'signed', { kind: 'cytology-preliminary', id: 'cyto-prelim-n1' });
    expect((deps.logAudit as any).mock.calls[0][0]).toMatchObject({ event: 'CYTOLOGY_PRELIMINARY_RELEASED', caseId: 'C1' });
    const event = (deps.publishReportReleased as any).mock.calls[0][0];
    expect(event).toMatchObject({ caseId: 'C1', reportType: 'PRELIMINARY', instanceId: 'cyto-prelim-n1', priority: 'Urgent', source: 'CYTOLOGY', performingFacilityId: 'F1' });
    await expect(event.generatePdf()).resolves.toEqual({ pdfBase64: 'PRELIM' });
    expect((deps.renderPdfSnapshot as any).mock.calls[0][0].preliminary.reason).toBe('criticalFinding');
  });

  it('Pete ("configurable"): with the signature switched off, it goes without one', async () => {
    const { deps, store } = makeDeps({ getComplianceSettings: async () => ({ enterprise: { preliminarySignature: 'off' }, facility: null }) });
    const result = await releaseCytologyPreliminary(input({ confirmation: undefined }), deps);
    expect(result.ok).toBe(true);
    expect(deps.signatureGate.accept).not.toHaveBeenCalled();
    expect(deps.signatureGate.commit).not.toHaveBeenCalled();
    expect(store.get('C1').cytologyPreliminaryReleases[0].signed).toBe(false);
  });

  it('with the signature required: none given, or refused, sends nothing', async () => {
    const { deps } = makeDeps();
    expect(await releaseCytologyPreliminary(input({ confirmation: undefined }), deps)).toEqual({ ok: false, error: 'signatureRequired' });
    const refused = makeDeps({ signatureGate: { accept: vi.fn(async () => ({ ok: false as const, reason: 'wrongPin' })), commit: vi.fn(), release: vi.fn() } });
    expect(await releaseCytologyPreliminary(input(), refused.deps)).toEqual({ ok: false, error: 'signatureRefused', reason: 'wrongPin' });
    expect(refused.deps.publishReportReleased).not.toHaveBeenCalled();
  });

  it('a save that fails releases the signature and publishes nothing', async () => {
    const { deps } = makeDeps({ getCase: async () => undefined });
    expect(await releaseCytologyPreliminary(input(), deps)).toEqual({ ok: false, error: 'notSaved' });
    expect(deps.signatureGate.release).toHaveBeenCalledWith('C1');
    expect(deps.publishReportReleased).not.toHaveBeenCalled();
  });

  it('a second preliminary for the same specimen is kept alongside the first', async () => {
    const { deps, store } = makeDeps();
    await releaseCytologyPreliminary(input(), deps);
    await releaseCytologyPreliminary(input({ reason: 'clinicianRequest' }), { ...deps, newId: () => 'n2', now: () => new Date('2026-10-12T16:00:00.000Z') });
    expect(cytologyPreliminariesFor(store.get('C1'), 'SP1').map(r => r.id)).toEqual(['cyto-prelim-n2', 'cyto-prelim-n1']);
    expect(cytologyPreliminariesFor(store.get('C1'), 'SP2')).toEqual([]);
  });
});

describe('Batch 534: through the release delay', () => {
  it('goes through releaseReport as a recallable cytology preliminary, not published directly', async () => {
    const releaseReport = vi.fn(async () => ({ held: {} }));
    const { deps } = makeDeps({ releaseReport });
    await releaseCytologyPreliminary(input(), deps);
    expect(deps.publishReportReleased).not.toHaveBeenCalled();
    const [event, hold] = (releaseReport.mock.calls[0] as unknown) as [any, any];
    expect(event).toMatchObject({ reportType: 'PRELIMINARY', instanceId: 'cyto-prelim-n1', priority: 'Urgent', source: 'CYTOLOGY' });
    expect(hold).toEqual({ kind: 'cytology-preliminary', releasedBy: { userId: 'P1', userName: 'Dr Path' }, subject: { specimenId: 'SP1' } });
  });
});

describe('cytologyPreliminaryBlock and the signature rule', () => {
  it('what stops a preliminary', () => {
    expect(cytologyPreliminaryBlock({ status: 'in-progress' } as any, false, true)).toBeNull();
    expect(cytologyPreliminaryBlock({ status: 'in-progress', cytologyEarlyFinalization: { reason: 'x' } } as any, false, true)).toBe('caseReleased');
    expect(cytologyPreliminaryBlock({ status: 'in-progress' } as any, true, true)).toBe('alreadySignedOut');
    expect(cytologyPreliminaryBlock({ status: 'in-progress' } as any, false, false)).toBe('noFinalDiagnosis');
  });
  it('the signature is required unless the laboratory switches it off (a facility can switch it back on)', async () => {
    expect(await preliminarySignatureRequired(baseCase, { getComplianceSettings: async () => ({ enterprise: null, facility: null }) })).toBe(true);
    expect(await preliminarySignatureRequired(baseCase, { getComplianceSettings: async () => ({ enterprise: { preliminarySignature: 'off' }, facility: null }) })).toBe(false);
    expect(await preliminarySignatureRequired(baseCase, { getComplianceSettings: async () => ({ enterprise: { preliminarySignature: 'off' }, facility: { preliminarySignature: 'on' } }) })).toBe(true);
    expect(await preliminarySignatureRequired(baseCase, { getComplianceSettings: async () => { throw new Error('down'); } })).toBe(true);
  });
});
