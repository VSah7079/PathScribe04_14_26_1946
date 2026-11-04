// src/services/registrySubmission/registryAcknowledgement.test.ts
import { describe, it, expect } from 'vitest';
import { parseRegistryAcknowledgement, parseRegistryRevisionEvent, isRegistryRevision, applyRegistryAcknowledgement, registrySubmissionsToEscalate } from './registryAcknowledgement';

const G = '1b4e28ba-2fa1-81d2-883f-0016d3cca427';

describe('parseRegistryAcknowledgement (Batch 420; JSON only since Batch 425)', () => {
  it('status JSON: findings, tier and location kept', () => {
    const r = parseRegistryAcknowledgement('statusJson', JSON.stringify({ submissionGuid: G, status: 'REJECTED_RECOVERABLE', findings: [{ severity: 'CRITICAL_REJECT', code: 'T3-07', message: 'No code mapped', tier: 3 }] }));
    expect(r.ok && r.ack).toMatchObject({ submissionGuid: G, outcome: 'rejectedRecoverable', format: 'statusJson', findings: [{ tier: 3, code: 'T3-07' }] });
  });
  it('Batch 425: submissionId is the same as submissionGuid, and the registry\'s ackCode / responseCode is kept', () => {
    const r = parseRegistryAcknowledgement('statusJson', JSON.stringify({ submissionId: G, status: 'ACCEPTED', ackCode: 'AA' }));
    expect(r).toMatchObject({ ok: true, ack: { submissionGuid: G, outcome: 'accepted', responseCode: 'AA', findings: [] } });
    const r2 = parseRegistryAcknowledgement('statusJson', JSON.stringify({ status: 'ACCEPTED_WITH_WARNINGS', responseCode: 'CA' }), G);
    expect(r2.ok && r2.ack).toMatchObject({ submissionGuid: G, outcome: 'acceptedWithWarnings', responseCode: 'CA' });
  });
  it('Batch 425: HL7 and FHIR are refused (the engine converts them to the normalised JSON)', () => {
    const hl7 = `MSH|^~\\&|CSMS|NHS|PATHSCRIBE|LAB|20261001083000||ACK^R01|ACK1|P|2.5.1\rMSA|AA|${G}`;
    expect(parseRegistryAcknowledgement('hl7Ack', hl7)).toEqual({ ok: false, reason: 'notNormalizedJson' });
    expect(parseRegistryAcknowledgement('fhirOperationOutcome', JSON.stringify({ resourceType: 'OperationOutcome', issue: [] }), G)).toEqual({ ok: false, reason: 'notNormalizedJson' });
  });
  it('garbage is unparseable; no id is noSubmissionGuid', () => {
    expect(parseRegistryAcknowledgement('statusJson', '{')).toEqual({ ok: false, reason: 'unparseable' });
    expect(parseRegistryAcknowledgement('statusJson', JSON.stringify({ status: 'MAYBE' }))).toEqual({ ok: false, reason: 'unparseable' });
    expect(parseRegistryAcknowledgement('statusJson', JSON.stringify({ status: 'ACCEPTED' }))).toEqual({ ok: false, reason: 'noSubmissionGuid' });
  });
});

describe('parseRegistryRevisionEvent (Batch 425)', () => {
  it('the developer\'s shape: status REVISED with revisedPayload', () => {
    const body = { submissionId: G, status: 'REVISED', ackCode: 'AA', revisedPayload: { tnmStage: 'pT2', siteCode: 'C50.4' }, receivedAt: '2026-10-01T10:00:00Z' };
    expect(isRegistryRevision(body)).toBe(true);
    const r = parseRegistryRevisionEvent(JSON.stringify(body));
    expect(r).toMatchObject({ ok: true, submissionGuid: G, revision: { updatedFields: [{ field: 'tnmStage', value: 'pT2' }, { field: 'siteCode', value: 'C50.4' }], responseCode: 'AA' } });
    // Without the engine's hash, the content identifies it: the same revision hashes the same.
    const again = parseRegistryRevisionEvent(JSON.stringify(body));
    expect(r.ok && again.ok && r.revision.payloadHash === again.revision.payloadHash).toBe(true);
  });
  it('the event shape: REGISTRY_RESPONSE_UPDATED with updatedFields, by accession and registry', () => {
    const body = { event: 'REGISTRY_RESPONSE_UPDATED', status: 'REVISED', accessionId: 'S26-100', registryId: 'naaccr_us', previousStatus: 'ACCEPTED', payloadHash: 'abc', updatedFields: [{ field: 'stage', value: 'II' }] };
    expect(parseRegistryRevisionEvent(JSON.stringify(body))).toMatchObject({ ok: true, accessionId: 'S26-100', registryId: 'naaccr_us', revision: { payloadHash: 'abc', previousStatus: 'ACCEPTED' } });
  });
  it('an answer is not a revision; a revision naming nothing is refused', () => {
    expect(isRegistryRevision({ status: 'ACCEPTED' })).toBe(false);
    expect(isRegistryRevision({ status: 'REVISED', event: 'SOMETHING_ELSE' })).toBe(false);
    expect(parseRegistryRevisionEvent(JSON.stringify({ status: 'REVISED', revisedPayload: {} }))).toEqual({ ok: false, reason: 'noSubmission' });
    expect(parseRegistryRevisionEvent('nope')).toEqual({ ok: false, reason: 'unparseable' });
  });
});

describe('applyRegistryAcknowledgement', () => {
  it('awaiting or overdue takes the answer; a rejection can be replaced after a resend', () => {
    expect(applyRegistryAcknowledgement('awaitingAck', { outcome: 'accepted' })).toEqual({ result: 'applied', registryStatus: 'accepted' });
    expect(applyRegistryAcknowledgement('ackOverdue', { outcome: 'rejectedFatal' })).toEqual({ result: 'applied', registryStatus: 'rejectedFatal' });
    expect(applyRegistryAcknowledgement('rejectedRecoverable', { outcome: 'accepted' })).toEqual({ result: 'applied', registryStatus: 'accepted' });
    expect(applyRegistryAcknowledgement(undefined, { outcome: 'accepted' }).result).toBe('applied');
  });
  it('the same answer twice is a duplicate; an accepted submission is never reopened', () => {
    expect(applyRegistryAcknowledgement('accepted', { outcome: 'accepted' })).toEqual({ result: 'duplicate', registryStatus: 'accepted' });
    expect(applyRegistryAcknowledgement('rejectedFatal', { outcome: 'rejectedFatal' }).result).toBe('duplicate');
    expect(applyRegistryAcknowledgement('accepted', { outcome: 'rejectedFatal' })).toEqual({ result: 'conflict', registryStatus: 'accepted' });
  });
});

describe('registrySubmissionsToEscalate (72 hours)', () => {
  const now = new Date('2026-10-04T12:00:00.000Z');
  it('finds unacknowledged and undeliverable submissions older than 72 hours', () => {
    const r = registrySubmissionsToEscalate([
      { id: 'a', status: 'SENT', registryStatus: 'awaitingAck', queuedAt: '2026-10-01T00:00:00Z', sentAt: '2026-10-01T11:00:00Z', maxRetriesExceeded: false },
      { id: 'b', status: 'SENT', registryStatus: 'awaitingAck', queuedAt: '2026-10-01T00:00:00Z', sentAt: '2026-10-01T13:00:00Z', maxRetriesExceeded: false },
      { id: 'c', status: 'FAILED', errorCode: 'DISPATCH_TIMEOUT', queuedAt: '2026-10-01T11:00:00Z', maxRetriesExceeded: false },
      { id: 'd', status: 'FAILED', errorCode: 'REGISTRY_NOT_READY', queuedAt: '2026-09-01T00:00:00Z', maxRetriesExceeded: false },
      { id: 'e', status: 'FAILED', errorCode: 'DISPATCH_TIMEOUT', queuedAt: '2026-09-01T00:00:00Z', maxRetriesExceeded: true },
      { id: 'f', status: 'SENT', registryStatus: 'accepted', queuedAt: '2026-09-01T00:00:00Z', sentAt: '2026-09-01T00:00:00Z', maxRetriesExceeded: false },
    ], now);
    expect(r).toEqual({ ackOverdue: ['a'], deliveryAbandoned: ['c'] });
  });
});
