// @vitest-environment happy-dom
// Batch 456 (demo baseline): registry submissions for the Registry Exceptions
// worklist, and an outstanding critical-finding alert, come back after a Full Reset.
import { beforeEach, describe, expect, it } from 'vitest';
import { CANCER_REGISTRY_DEMO_QUEUE } from '../cancerRegistry/cancerRegistryDemoSeed';
import { mockCancerRegistryOutboundQueueService } from '../cancerRegistry/mockCancerRegistryOutboundQueueService';
import { mockCytologyRegistryOutboundQueueService } from '../cytology/mockCytologyRegistryOutboundQueueService';
import { loadRegistryExceptions } from '../registrySubmission/registryExceptionsService';
import { registryAckDeps } from '../registrySubmission/recordRegistryAcknowledgementDeps';
import { registryTransmissionAuditRows } from '../registrySubmission/registryTransmissionAudit';
import { registryLabelKey } from '../registrySubmission/registryExceptions';
import { registryMasterTransactionId } from '../registrySubmission/registrySubmissionHeader';
import { mockCaseService } from '../cases/mockCaseService';
import { CRITICAL_ALERT_DEMO_TOKEN } from '../clinical/criticalAlertDemoSeed';
import { mockCriticalAlertDispatchService } from '../clinical/mockCriticalAlertDispatchService';
import { mockCriticalAlertReferenceTokenService } from '../clinical/mockCriticalAlertReferenceTokenService';
import { resolveCriticalAlertReferenceTokenStatus } from '../clinical/ICriticalAlertReferenceTokenService';
import { mockAbnormalTriggerRuleService } from '../abnormalDetection/mockAbnormalTriggerRuleService';

/* eslint-disable @typescript-eslint/no-explicit-any */
beforeEach(() => localStorage.clear());

const load = () => loadRegistryExceptions({
  ack: registryAckDeps,
  getAll: { cytology: () => mockCytologyRegistryOutboundQueueService.getAll() as any, cancer: () => mockCancerRegistryOutboundQueueService.getAll() as any },
});

describe('Batch 456: registry submissions on the Registry Exceptions worklist', () => {
  it('shows a rejection to fix, an overdue acknowledgement and a revision after acceptance; accepted submissions stay off', async () => {
    const rows = await load();
    expect(rows.map(r => [r.caseId, r.kind])).toEqual([
      ['S26-4405', 'rejectedRecoverable'],
      ['S26-4633', 'revisedPostAcceptance'],
      ['S26-4490', 'ackOverdue'],
    ]);
    const rejected = rows[0];
    expect(rejected.canResend).toBe(true);
    expect(rejected.findings.map(f => f.severity)).toEqual(['CRITICAL_REJECT', 'WARNING']);
    expect(JSON.parse(rejected.rawAcknowledgement!).status).toBe('REJECTED_RECOVERABLE');
    expect(rows[1].findings).toEqual([expect.objectContaining({ code: 'dateOfDiagnosis' })]);
    expect(registryLabelKey('cancer', rejected.registryId, () => undefined)).toBe('cancerRegistrySection.registries.naaccrUs');
  });

  it('loading the worklist escalates nothing further: the seeds are already in their final states', async () => {
    await load();
    const all = await mockCancerRegistryOutboundQueueService.getAll();
    const status = Object.fromEntries((all.ok ? all.data : []).map(e => [e.id, e.registryStatus]));
    expect(status).toEqual({
      'crq-demo-4405': 'rejectedRecoverable', 'crq-demo-4490': 'ackOverdue', 'crq-demo-4633': 'accepted',
      'crq-demo-4412-v1': 'accepted', 'crq-demo-4412-v2': 'acceptedWithWarnings', 'crq-demo-4630': 'accepted',
    });
  });

  it('each submission is for a signed-out case of a Desert Valley client, built for that facility, and each answer names its own submission id', async () => {
    for (const e of CANCER_REGISTRY_DEMO_QUEUE) {
      const c: any = await mockCaseService.getCase(e.caseId);
      expect(c, e.caseId).toBeTruthy();
      expect(['c1', 'c4'], e.caseId).toContain(c.order.facilityId);
      expect(e.submission!.masterTransactionId, e.id).toBe(registryMasterTransactionId({ facilityId: c.order.facilityId, caseId: e.caseId, specimenId: 'case', registryId: 'naaccr_us' }));
      expect(['finalized', 'pending-release', 'closed'], e.caseId).toContain(c.status);
      for (const a of e.acknowledgements ?? []) expect(a.submissionGuid, e.id).toBe(e.submission!.submissionGuid);
    }
    const v2 = CANCER_REGISTRY_DEMO_QUEUE.find(e => e.id === 'crq-demo-4412-v2')!;
    const v1 = CANCER_REGISTRY_DEMO_QUEUE.find(e => e.id === 'crq-demo-4412-v1')!;
    expect(v2.submission).toMatchObject({ submissionVersion: 2, messageType: 'CORRECTION', previousSubmissionGuid: v1.submission!.submissionGuid, masterTransactionId: v1.submission!.masterTransactionId });
  });

  it('the transmission audit lists every submission, with the revision counted', () => {
    const rows = registryTransmissionAuditRows({ cytology: [], cancer: CANCER_REGISTRY_DEMO_QUEUE as any }, {});
    expect(rows).toHaveLength(6);
    expect(rows.find(r => r.caseId === 'S26-4633')?.revisionsAfterAcceptance).toBe(1);
  });

  it('a Full Reset brings the seeded queue back', async () => {
    await mockCancerRegistryOutboundQueueService.retryDispatch('crq-demo-4405');
    expect((await load()).some(r => r.entryId === 'crq-demo-4405')).toBe(false);
    localStorage.clear();
    expect((await load()).some(r => r.entryId === 'crq-demo-4405' && r.kind === 'rejectedRecoverable')).toBe(true);
  });
});

describe('Batch 456: an outstanding critical-finding alert', () => {
  it('S26-4621: dispatched to the ordering physician by secure email, the link active, not opened, not acknowledged', async () => {
    const dispatches = await mockCriticalAlertDispatchService.getByCaseId('S26-4621');
    const d = dispatches.ok ? dispatches.data[0] : undefined;
    expect(d).toMatchObject({ findingSeverity: 'Critical', physicianId: 'ph2', physicianName: 'Jennifer Davis' });
    expect(d!.channels.map(c => c.channel)).toEqual(['secure_email']);
    expect(d!.channels[0].detail).toContain(`/critical-alert/${CRITICAL_ALERT_DEMO_TOKEN}`);
    expect(d!.channels[0].detail).not.toContain('Basal cell');

    const resolved = await mockCriticalAlertReferenceTokenService.resolve(CRITICAL_ALERT_DEMO_TOKEN);
    expect(resolved.ok).toBe(true);
    const t = (resolved as any).data;
    expect(t).toMatchObject({ dispatchRecordId: d!.id, caseId: 'S26-4621', accessionNumber: 'S26-4621', accessCount: 0 });
    expect(t.acknowledgedAt).toBeUndefined();
    expect(resolveCriticalAlertReferenceTokenStatus(t)).toBe('Active');
  });

  it('the case is signed out by Pete Nimmo for Dr. Jennifer Davis, and the lab rates a positive margin Critical', async () => {
    const c: any = await mockCaseService.getCase('S26-4621');
    expect(c.order.orderingPhysicianId).toBe('ph2');
    expect(c.finalizedBy).toBe('PATH-001');
    expect(c.diagnostic.microscopicDescription).toMatch(/deep margin/);
    const rules = await mockAbnormalTriggerRuleService.getAll();
    expect((rules as any).data.find((r: any) => r.id === 'atr-margin-positive')).toMatchObject({ severity: 'Critical', status: 'Active' });
  });

  it('acknowledging is kept, and a Full Reset makes the alert outstanding again', async () => {
    const t = (await mockCriticalAlertReferenceTokenService.resolve(CRITICAL_ALERT_DEMO_TOKEN) as any).data;
    await mockCriticalAlertReferenceTokenService.recordAccess(t.id);
    await mockCriticalAlertReferenceTokenService.recordAcknowledged(t.id);
    const after = (await mockCriticalAlertReferenceTokenService.resolve(CRITICAL_ALERT_DEMO_TOKEN) as any).data;
    expect(after.acknowledgedAt).toBeTruthy();
    expect(after.accessCount).toBe(1);
    localStorage.clear();
    const reset = (await mockCriticalAlertReferenceTokenService.resolve(CRITICAL_ALERT_DEMO_TOKEN) as any).data;
    expect(reset.acknowledgedAt).toBeUndefined();
    expect(reset.accessCount).toBe(0);
  });
});
