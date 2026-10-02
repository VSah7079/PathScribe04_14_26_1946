// src/services/registrySubmission/recordRegistryAcknowledgement.test.ts
import { describe, it, expect, vi } from 'vitest';
import { recordRegistryAcknowledgement, escalateStaleRegistrySubmissions, type RegistryAckDeps, type RegistryQueueEntryView } from './recordRegistryAcknowledgement';

function queue(entries: RegistryQueueEntryView[]) {
  return {
    entries,
    getAll: async () => ({ ok: true as const, data: entries }),
    setRegistryStatus: vi.fn(async (id: string, status: any, ack?: any) => { const e: any = entries.find(x => x.id === id); e.registryStatus = status; if (ack) (e.acks ??= []).push(ack); }),
    markFailed: vi.fn(async (id: string, f: any) => { Object.assign(entries.find(x => x.id === id)!, { status: 'FAILED', maxRetriesExceeded: f.maxRetriesExceeded }); }),
  };
}
const G1 = 'aaaaaaaa-0000-8000-8000-000000000001';
const G2 = 'aaaaaaaa-0000-8000-8000-000000000002';
function setup(now = '2026-10-01T12:00:00.000Z') {
  const cytology = queue([{ id: 'c1', caseId: 'C1', registryId: 'csms_uk', status: 'SENT', registryStatus: 'awaitingAck', queuedAt: '2026-10-01T09:00:00Z', sentAt: '2026-10-01T09:00:00Z', maxRetriesExceeded: false, submission: { submissionGuid: G1 } }]);
  const cancer = queue([{ id: 'k1', caseId: 'C2', registryId: 'naaccr_us', status: 'SENT', registryStatus: 'awaitingAck', queuedAt: '2026-10-01T09:00:00Z', sentAt: '2026-10-01T09:00:00Z', maxRetriesExceeded: false, submission: { submissionGuid: G2 } }]);
  const audits: any[] = [];
  const deps: RegistryAckDeps = { queues: { cytology, cancer }, logAudit: e => audits.push(e), now: () => new Date(now) };
  return { deps, cytology, cancer, audits };
}

describe('recordRegistryAcknowledgement (Batch 420)', () => {
  it('a rejection moves the cytology submission to rejectedRecoverable, keeps the raw message and response code, audits on the case', async () => {
    const { deps, cytology, audits } = setup();
    const body = JSON.stringify({ submissionId: G1, status: 'REJECTED_RECOVERABLE', ackCode: 'AE', findings: [{ severity: 'CRITICAL_REJECT', code: '102', message: 'NHS number check digit failed', location: 'PID^1^3' }] });
    const r = await recordRegistryAcknowledgement({ format: 'statusJson', body }, deps);
    expect(r).toEqual({ outcome: 'applied', queue: 'cytology', entryId: 'c1', registryStatus: 'rejectedRecoverable' });
    const ack = cytology.setRegistryStatus.mock.calls[0][2];
    expect(ack).toMatchObject({ submissionGuid: G1, outcome: 'rejectedRecoverable', responseCode: 'AE', raw: body, receivedAt: '2026-10-01T12:00:00.000Z' });
    expect(audits[0]).toMatchObject({ event: 'Registry acknowledgement received', caseId: 'C1' });
    expect(audits[0].detail).toContain('CRITICAL_REJECT 102: NHS number check digit failed');
  });

  it('an acceptance for a cancer submission; then the same again is a duplicate; a later rejection is a conflict', async () => {
    const { deps, cancer, audits } = setup();
    const ok = JSON.stringify({ status: 'ACCEPTED' });
    expect(await recordRegistryAcknowledgement({ format: 'statusJson', body: ok, submissionGuid: G2 }, deps)).toMatchObject({ outcome: 'applied', queue: 'cancer', registryStatus: 'accepted' });
    expect((await recordRegistryAcknowledgement({ format: 'statusJson', body: ok, submissionGuid: G2 }, deps)).outcome).toBe('duplicate');
    const bad = JSON.stringify({ status: 'REJECTED_FATAL' });
    expect(await recordRegistryAcknowledgement({ format: 'statusJson', body: bad, submissionGuid: G2 }, deps)).toMatchObject({ outcome: 'conflict', registryStatus: 'accepted' });
    expect(cancer.entries[0].registryStatus).toBe('accepted');
    expect(audits[audits.length - 1].event).toBe('Registry acknowledgement conflicts with an accepted submission');
  });

  it('unknown id, unreadable message, missing id, and (Batch 425) HL7 or FHIR sent straight to PathScribe', async () => {
    const { deps, audits } = setup();
    expect((await recordRegistryAcknowledgement({ format: 'statusJson', body: JSON.stringify({ submissionGuid: 'nope', status: 'ACCEPTED' }) }, deps)).outcome).toBe('unknownSubmission');
    expect((await recordRegistryAcknowledgement({ format: 'statusJson', body: 'garbage' }, deps)).outcome).toBe('unparseable');
    expect((await recordRegistryAcknowledgement({ format: 'statusJson', body: JSON.stringify({ status: 'ACCEPTED' }) }, deps)).outcome).toBe('noSubmissionGuid');
    expect((await recordRegistryAcknowledgement({ format: 'hl7Ack', body: `MSH|^~\\&|X\rMSA|AA|${G1}` }, deps)).outcome).toBe('notNormalizedJson');
    expect(audits.map(a => a.event)).toEqual(['Registry acknowledgement for an unknown submission', 'Registry acknowledgement rejected', 'Registry acknowledgement rejected', 'Registry acknowledgement rejected']);
  });
});

describe('escalateStaleRegistrySubmissions (Batch 420, 72 hours)', () => {
  it('marks unacknowledged submissions overdue and stops retrying undeliverable ones', async () => {
    const { deps, cytology, cancer } = setup('2026-10-05T12:00:00.000Z');
    cancer.entries.push({ id: 'k2', caseId: 'C3', registryId: 'naaccr_us', status: 'FAILED', errorCode: 'DISPATCH_TIMEOUT', queuedAt: '2026-10-01T00:00:00Z', maxRetriesExceeded: false });
    expect(await escalateStaleRegistrySubmissions(deps)).toEqual({ ackOverdue: 2, deliveryAbandoned: 1 });
    expect(cytology.entries[0].registryStatus).toBe('ackOverdue');
    expect(cancer.markFailed).toHaveBeenCalledWith('k2', expect.objectContaining({ errorCode: 'DISPATCH_TIMEOUT', maxRetriesExceeded: true }));
    // a late acknowledgement is still taken
    const late = await recordRegistryAcknowledgement({ format: 'statusJson', body: JSON.stringify({ submissionGuid: G1, status: 'ACCEPTED' }) }, deps);
    expect(late).toMatchObject({ outcome: 'applied', registryStatus: 'accepted' });
  });
});
