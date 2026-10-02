// src/services/screeningRegistry/submitScreeningRegistryResult.test.ts
// Batch 419: the screening registry submission, for a sign-out and its later versions.
import { describe, it, expect, vi } from 'vitest';
import { submitScreeningRegistryResult, type ScreeningRegistrySubmitDeps } from './submitScreeningRegistryResult';
import { submitCytologyRevisionToRegistry } from './submitCytologyRevisionToRegistry';

function makeDeps(over: Partial<ScreeningRegistrySubmitDeps> = {}, environment?: 'test' | 'production') {
  const queue: any[] = [];
  const deps: ScreeningRegistrySubmitDeps = {
    getRegistrySettings: async () => ({ enterprise: { registryId: 'ncsr_australia' }, facility: null }),
    getRegistryConfig: async (registryId: any) => ({ registryId, requireMappedCodes: false, codeMappings: [], environment }),
    registryQueue: {
      enqueue: vi.fn(async (e: any) => { const entry = { ...e, id: `q${queue.length + 1}`, status: 'QUEUED' }; queue.push(entry); return { ok: true as const, data: entry }; }),
      markSent: vi.fn(async (id: string) => { queue.find(q => q.id === id).status = 'SENT'; }),
      markFailed: vi.fn(async (id: string, f: any) => { Object.assign(queue.find(q => q.id === id), { status: 'FAILED', errorCode: f.errorCode }); }),
      getByCaseId: async () => ({ ok: true as const, data: queue }),
    },
    dispatchInterfaceMessage: vi.fn(async () => ({ ok: true })),
    logAudit: vi.fn(),
    sendGate: async () => ({ action: 'send' as const, environment: environment ?? 'test' }),
    updateCase: vi.fn(async () => undefined),
    now: () => new Date('2026-09-30T00:00:00.000Z'),
    newId: () => 'id',
    ...over,
  };
  return { deps, queue };
}

const caseData = { id: 'C1', patient: { id: 'P1', firstName: 'A', lastName: 'B' }, order: { facilityId: 'F1' } };
const review = { primaryInterpretationId: 'nilm', adequacySelections: [], additionalInterpretations: [], recommendations: [] };
const record = (id: string, signedAt: string) => ({ id, caseId: 'C1', specimenId: 'SP1', reviewRecordId: 'rv1', signedAt, reportContent: { patientName: 'A B', accessionNumber: 'S1', specimenAdequacy: [], primaryInterpretation: 'NILM', additionalInterpretations: [], recommendations: [], requiresPathologistReview: false } } as any);

describe('submitScreeningRegistryResult (Batch 419)', () => {
  it('sign-out, then correction, then addendum: NEW → CORRECTION → AMENDMENT, one master id, versions 1-3', async () => {
    const { deps, queue } = makeDeps({}, 'production');
    const a = await submitScreeningRegistryResult({ caseData, record: record('so1', '2026-09-30T10:00:00Z'), review, categories: [], isGynCytology: true, kind: 'signOut' }, deps);
    const b = await submitScreeningRegistryResult({ caseData, record: record('so2', '2026-10-01T10:00:00Z'), review, categories: [], isGynCytology: true, kind: 'correction' }, deps);
    const c = await submitScreeningRegistryResult({ caseData, record: record('so3', '2026-10-02T10:00:00Z'), review, categories: [], isGynCytology: true, kind: 'addendum' }, deps);
    expect([a, b, c].map(o => o.outcome)).toEqual(['sent', 'sent', 'sent']);
    expect([a, b, c].map(o => `${o.submission!.submissionVersion}:${o.submission!.messageType}:${o.submission!.environment}`)).toEqual(['1:NEW:production', '2:CORRECTION:production', '3:AMENDMENT:production']);
    expect(new Set([a, b, c].map(o => o.submission!.masterTransactionId)).size).toBe(1);
    expect(c.submission!.previousSubmissionGuid).toBe(b.submission!.submissionGuid);
    expect(queue.every(q => q.submission)).toBe(true);
    expect((deps.dispatchInterfaceMessage as any).mock.calls[1][2].submission.messageType).toBe('CORRECTION');
  });

  it('Batch 423/424: a production instance without a current go-live approval holds the result (queued, never dispatched); the header carries the template version', async () => {
    const sendGate = vi.fn(async () => ({ action: 'hold' as const, environment: 'production' as const, code: 'REGISTRY_LIVE_NOT_APPROVED', message: 'Held, attestation required' }));
    const { deps, queue } = makeDeps({ sendGate });
    const r = await submitScreeningRegistryResult({ caseData, record: record('so1', '2026-09-30T10:00:00Z'), review, categories: [], isGynCytology: true, kind: 'signOut' }, deps);
    expect(r.outcome).toBe('held');
    expect(sendGate).toHaveBeenCalledWith('ncsr_australia');
    expect(r.submission!.environment).toBe('production');
    expect(queue[0]).toMatchObject({ status: 'FAILED', errorCode: 'REGISTRY_LIVE_NOT_APPROVED' });
    expect(r.submission!.templateVersion).toBe('v2026.4.1');
    expect(deps.dispatchInterfaceMessage).not.toHaveBeenCalled();
  });

  it('Batch 424: a validation instance never sends a real case: not queued, audited', async () => {
    const sendGate = async () => ({ action: 'skip' as const, skipReason: 'realCaseOnValidation' as const, message: 'Not sent: this is a validation instance' });
    const { deps, queue } = makeDeps({ sendGate });
    const r = await submitScreeningRegistryResult({ caseData, record: record('so1', 't'), review, categories: [], isGynCytology: true, kind: 'signOut' }, deps);
    expect(r.outcome).toBe('notSent');
    expect(queue).toEqual([]);
    expect(deps.dispatchInterfaceMessage).not.toHaveBeenCalled();
    expect(deps.logAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'Registry submission not sent' }));
  });

  it('a held first submission makes the correction NEW (the registry never had it)', async () => {
    const { deps } = makeDeps({ getRegistryConfig: async (registryId: any) => ({ registryId, requireMappedCodes: false, requirePatientIdentifier: true, codeMappings: [] }) });
    const held = await submitScreeningRegistryResult({ caseData, record: record('so1', 't1'), review, categories: [], isGynCytology: true, kind: 'signOut' }, deps);
    expect(held.outcome).toBe('held');
    const withId = { ...caseData, patient: { ...caseData.patient, nationalIdentifiers: [{ system: 'mrn_ihi', value: '8003601234567893', verificationStatus: 'verified' }] } };
    const next = await submitScreeningRegistryResult({ caseData: withId, record: record('so2', 't2'), review, categories: [], isGynCytology: true, kind: 'correction' }, deps);
    expect(next.outcome).toBe('sent');
    expect(next.submission).toMatchObject({ submissionVersion: 2, messageType: 'NEW' });
  });

  it('a Non-GYN revision and an opted-out patient send nothing', async () => {
    const { deps } = makeDeps();
    expect((await submitScreeningRegistryResult({ caseData, record: record('so1', 't'), review, categories: [], isGynCytology: false, kind: 'correction' }, deps)).outcome).toBe('notEligible');
    const optedOut = { ...caseData, patient: { ...caseData.patient, registryConsent: { screeningOptOut: true, cancerRegistryOptOut: false, recordedAt: 'x' } } };
    expect((await submitScreeningRegistryResult({ caseData: optedOut, record: record('so1', 't'), review, categories: [], isGynCytology: true, kind: 'addendum' }, deps)).outcome).toBe('excludedByConsent');
    expect(deps.dispatchInterfaceMessage).not.toHaveBeenCalled();
  });

  it('submitCytologyRevisionToRegistry finds the record and its review', async () => {
    const { deps } = makeDeps();
    const revisionDeps = {
      ...deps,
      getCaseSignOutRecords: async () => ({ ok: true as const, data: [record('so2', 't2')] }),
      getCaseReviews: async () => ({ ok: true as const, data: [{ id: 'rv1', ...review } as any] }),
    };
    expect((await submitCytologyRevisionToRegistry({ caseData, signOutRecordId: 'so2', kind: 'correction', isGynCytology: true, categories: [] }, revisionDeps)).outcome).toBe('sent');
    expect((await submitCytologyRevisionToRegistry({ caseData, signOutRecordId: 'missing', kind: 'correction', isGynCytology: true, categories: [] }, revisionDeps)).outcome).toBe('recordNotFound');
  });
});
