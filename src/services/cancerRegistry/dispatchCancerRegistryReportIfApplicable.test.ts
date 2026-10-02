// src/services/cancerRegistry/dispatchCancerRegistryReportIfApplicable.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Case } from '@/types/case/Case';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

const okDispatch = { dispatch: async () => ({ ok: true }), sendGate: async () => ({ action: 'send' as const, environment: 'production' as const }) };

const baseCase = (over: Partial<Case>): Case => ({
  id: 'S26-2000',
  accession: { accessionNumber: 'S26-2000', fullAccession: 'S26-2000-A' },
  patient: { id: 'p1', mrn: 'MRN-200', firstName: 'Jane', lastName: 'Roe', dateOfBirth: '1980-01-01' },
  diagnostic: { primaryDiagnosis: 'Infiltrating ductal carcinoma, breast', issuedDate: '2026-09-01T00:00:00.000Z' },
  specimens: [],
  ...over,
} as unknown as Case);

describe('dispatchCancerRegistryReportIfApplicable — real, per FHIR_DISPATCH_ARCHITECTURE_PLAN.md\'s own "never from cytology" rule (this is the surgical-path-only trigger)', () => {
  it('real, with no registry configured for the facility, nothing is dispatched', async () => {
    const { dispatchCancerRegistryReportIfApplicable } = await import('./dispatchCancerRegistryReportIfApplicable');
    const caseData = baseCase({ specimens: [{ id: 'sp1', coding: { icdO: [{ code: '8500/3', description: 'Duct carcinoma' }] } }] as any });
    const result = await dispatchCancerRegistryReportIfApplicable(caseData, 'fac-no-registry', 'Some Facility', okDispatch);
    expect(result.dispatched).toBe(false);
    expect(result.reason).toContain('No cancer registry configured');
  });

  it('real, a real, reportable ICD-O finding with a real registry configured is genuinely enqueued', async () => {
    const { mockCancerRegistrySettingsService } = await import('./mockCancerRegistrySettingsService');
    const { mockCancerRegistryOutboundQueueService } = await import('./mockCancerRegistryOutboundQueueService');
    const { dispatchCancerRegistryReportIfApplicable } = await import('./dispatchCancerRegistryReportIfApplicable');

    await mockCancerRegistrySettingsService.update({ registryId: 'naaccr_us' });
    const caseData = baseCase({ specimens: [{ id: 'sp1', coding: { icdO: [{ code: '8500/3', description: 'Duct carcinoma' }] } }] as any });
    const result = await dispatchCancerRegistryReportIfApplicable(caseData, 'fac-with-registry', 'Some Facility', okDispatch);
    expect(result.dispatched).toBe(true);

    const queue = await mockCancerRegistryOutboundQueueService.getByCaseId('S26-2000');
    if (queue.ok) expect(queue.data).toHaveLength(1);
  });

  it('real, a registry configured but only NON-reportable findings (e.g. cervical CIS) never dispatches — the exact, already-documented critical exception', async () => {
    const { mockCancerRegistrySettingsService } = await import('./mockCancerRegistrySettingsService');
    const { dispatchCancerRegistryReportIfApplicable } = await import('./dispatchCancerRegistryReportIfApplicable');

    await mockCancerRegistrySettingsService.update({ registryId: 'naaccr_us' });
    const caseData = baseCase({
      diagnostic: { primaryDiagnosis: 'CIN III, cervix biopsy' } as any,
      specimens: [{ id: 'sp1', coding: { icdO: [{ code: '8077/2', description: 'HSIL, cervix' }] } }] as any,
    });
    const result = await dispatchCancerRegistryReportIfApplicable(caseData, 'fac-cin3', 'Some Facility');
    expect(result.dispatched).toBe(false);
    expect(result.reason).toContain('No reportable ICD-O finding');
  });

  it('Batch 418: a cancer registry opt-out is overridden by statute, unless the lab honours it', async () => {
    const { mockCancerRegistrySettingsService } = await import('./mockCancerRegistrySettingsService');
    const { mockCancerRegistryOutboundQueueService } = await import('./mockCancerRegistryOutboundQueueService');
    const { dispatchCancerRegistryReportIfApplicable } = await import('./dispatchCancerRegistryReportIfApplicable');
    const optedOut = baseCase({
      id: 'S26-2418',
      // Batch 425: with the date of birth and the NHS number COSD requires, so the report isn't held for them.
      patient: { id: 'p2', mrn: 'MRN-418', firstName: 'Ann', lastName: 'Lee', dateOfBirth: '1960-02-02', nationalIdentifiers: [{ system: 'mrn_nhs', value: '9434765919', verificationStatus: 'verified' }], registryConsent: { screeningOptOut: false, cancerRegistryOptOut: true, recordedAt: '2026-09-30T00:00:00.000Z' } } as any,
      specimens: [{ id: 'sp1', coding: { icdO: [{ code: '8500/3', description: 'Duct carcinoma' }] } }] as any,
    });
    await mockCancerRegistrySettingsService.update({ registryId: 'cosd_uk' });
    expect((await dispatchCancerRegistryReportIfApplicable(optedOut, 'fac', 'F', okDispatch)).dispatched).toBe(true); // statutory
    await mockCancerRegistrySettingsService.update({ registryId: 'cosd_uk', honoursPatientOptOut: true });
    const r = await dispatchCancerRegistryReportIfApplicable(optedOut, 'fac', 'F', okDispatch);
    expect(r.dispatched).toBe(false);
    expect(r.reason).toMatch(/^Excluded by consent/);
    const queue = await mockCancerRegistryOutboundQueueService.getByCaseId('S26-2418');
    if (queue.ok) expect(queue.data).toHaveLength(1); // only the statutory one
  });

  it('Batch 419: each submission carries the header; a second one for the case is CORRECTION v2 with the same master id', async () => {
    const { mockCancerRegistrySettingsService } = await import('./mockCancerRegistrySettingsService');
    const { mockCancerRegistryOutboundQueueService } = await import('./mockCancerRegistryOutboundQueueService');
    const { dispatchCancerRegistryReportIfApplicable } = await import('./dispatchCancerRegistryReportIfApplicable');
    await mockCancerRegistrySettingsService.update({ registryId: 'naaccr_us', environment: 'production' });
    const caseData = baseCase({ id: 'S26-2419', specimens: [{ id: 'sp1', coding: { icdO: [{ code: '8500/3', description: 'Duct carcinoma' }] } }] as any });
    await dispatchCancerRegistryReportIfApplicable(caseData, 'fac', 'F', okDispatch);
    const r = await dispatchCancerRegistryReportIfApplicable(caseData, 'fac', 'F', okDispatch);
    expect(r.reason).toContain('CORRECTION v2');
    const all = await mockCancerRegistryOutboundQueueService.getByCaseId('S26-2419');
    const [a, b] = all.ok ? all.data.map(e => e.submission!) : [];
    expect(a).toMatchObject({ submissionVersion: 1, messageType: 'NEW', environment: 'production', specimenId: 'case' });
    expect(b.masterTransactionId).toBe(a.masterTransactionId);
    expect(b.previousSubmissionGuid).toBe(a.submissionGuid);
    const retried = await mockCancerRegistryOutboundQueueService.retryDispatch(all.ok ? all.data[1].id : '');
    expect(retried.ok && retried.data.submission).toMatchObject({ submissionGuid: b.submissionGuid, isDuplicateRetry: true });
  });

  it('Batch 420: the report is actually sent; sent → awaitingAck, a failed send is marked failed', async () => {
    const { mockCancerRegistrySettingsService } = await import('./mockCancerRegistrySettingsService');
    const { mockCancerRegistryOutboundQueueService } = await import('./mockCancerRegistryOutboundQueueService');
    const { dispatchCancerRegistryReportIfApplicable } = await import('./dispatchCancerRegistryReportIfApplicable');
    await mockCancerRegistrySettingsService.update({ registryId: 'naaccr_us' });
    const dispatch = vi.fn(async () => ({ ok: true }));
    const caseData = baseCase({ id: 'S26-2420', specimens: [{ id: 'sp1', coding: { icdO: [{ code: '8500/3', description: 'Duct carcinoma' }] } }] as any });
    await dispatchCancerRegistryReportIfApplicable(caseData, 'fac', 'F', { dispatch, sendGate: async () => ({ action: 'send' as const, environment: 'production' as const }) });
    expect(dispatch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ registryId: 'naaccr_us', submission: expect.objectContaining({ messageType: 'NEW' }) }));
    let q = await mockCancerRegistryOutboundQueueService.getByCaseId('S26-2420');
    expect(q.ok && q.data[0]).toMatchObject({ status: 'SENT', registryStatus: 'awaitingAck' });
    const failing = baseCase({ id: 'S26-2421', specimens: caseData.specimens });
    await dispatchCancerRegistryReportIfApplicable(failing, 'fac', 'F', { dispatch: async () => ({ ok: false, errorCode: 'DISPATCH_UNREACHABLE', error: 'down' }), sendGate: async () => ({ action: 'send' as const, environment: 'production' as const }) });
    q = await mockCancerRegistryOutboundQueueService.getByCaseId('S26-2421');
    expect(q.ok && q.data[0]).toMatchObject({ status: 'FAILED', errorCode: 'DISPATCH_UNREACHABLE' });
  });

  it('Batch 425: a report missing the registry\'s mandatory data is queued and held, never sent; the sign-out is untouched', async () => {
    const { mockCancerRegistrySettingsService } = await import('./mockCancerRegistrySettingsService');
    const { mockCancerRegistryOutboundQueueService } = await import('./mockCancerRegistryOutboundQueueService');
    const { dispatchCancerRegistryReportIfApplicable } = await import('./dispatchCancerRegistryReportIfApplicable');
    const { registryExceptionRows } = await import('../registrySubmission/registryExceptions');
    await mockCancerRegistrySettingsService.update({ registryId: 'naaccr_us' });
    const dispatch = vi.fn(async () => ({ ok: true }));
    const caseData = baseCase({
      id: 'S26-2425', patient: { id: 'p2', mrn: 'MRN-2425', firstName: 'Ann', lastName: 'Lee' } as any,
      specimens: [{ id: 'sp1', coding: { icdO: [{ code: '8500/3', description: 'Duct carcinoma' }] } }] as any,
    });
    const r = await dispatchCancerRegistryReportIfApplicable(caseData, 'fac-hold', 'Some Facility', { ...okDispatch, dispatch });
    expect(r.dispatched).toBe(false);
    expect(r.reason).toContain('naaccr_us requires the date of birth');
    expect(dispatch).not.toHaveBeenCalled();
    const queue = await mockCancerRegistryOutboundQueueService.getByCaseId('S26-2425');
    const entry: any = queue.ok ? queue.data[0] : undefined;
    expect(entry).toMatchObject({ status: 'FAILED', errorCode: 'HOLD_MISSING_MANDATORY_DATA', maxRetriesExceeded: false });
    expect(registryExceptionRows({ cytology: [], cancer: [entry] })).toEqual([expect.objectContaining({ kind: 'held', canResend: true, findings: [expect.objectContaining({ code: 'HOLD_MISSING_MANDATORY_DATA' })] })]);
  });
});
