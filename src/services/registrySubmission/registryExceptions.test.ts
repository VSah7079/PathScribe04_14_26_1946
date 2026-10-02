// src/services/registrySubmission/registryExceptions.test.ts
import { describe, it, expect, vi } from 'vitest';
import { registryExceptionKind, registryExceptionRows, registryExceptionCounts, type RegistryQueueEntryForWorklist } from './registryExceptions';
import { resendRegistrySubmission, type ResendDeps } from './resendRegistrySubmission';
import { rebuildRegistrySubmission, type RebuildDeps } from './rebuildRegistrySubmission';

const hdr = (v: number, master = 'M1', extra: object = {}) => ({ submissionGuid: `G${master}${v}`, submissionVersion: v, masterTransactionId: master, messageType: v === 1 ? 'NEW' : 'CORRECTION', environment: 'test', isDuplicateRetry: false, specimenId: 'SP1', kind: 'signOut', ...extra }) as any;
const e = (over: Partial<RegistryQueueEntryForWorklist>): RegistryQueueEntryForWorklist => ({ id: 'e', caseId: 'C1', registryId: 'csms_uk', status: 'SENT', queuedAt: '2026-10-01T00:00:00Z', maxRetriesExceeded: false, ...over });
const ack = (outcome: string, at = '2026-10-02T00:00:00Z') => ({ submissionGuid: 'x', outcome, findings: [{ severity: 'CRITICAL_REJECT', code: '102', message: 'bad NHS number' }], format: 'hl7Ack', receivedAt: at, raw: 'MSH|...' }) as any;

describe('registryExceptionKind (Batch 421)', () => {
  it('names each exception and ignores the rest', () => {
    expect(registryExceptionKind(e({ status: 'FAILED', errorCode: 'REGISTRY_NOT_READY' }))).toBe('held');
    expect(registryExceptionKind(e({ status: 'FAILED', errorCode: 'DISPATCH_TIMEOUT', maxRetriesExceeded: true }))).toBe('deliveryFailed');
    expect(registryExceptionKind(e({ status: 'FAILED', errorCode: 'DISPATCH_TIMEOUT' }))).toBeNull(); // still retrying
    expect(registryExceptionKind(e({ registryStatus: 'rejectedRecoverable' }))).toBe('rejectedRecoverable');
    expect(registryExceptionKind(e({ registryStatus: 'rejectedFatal' }))).toBe('rejectedFatal');
    expect(registryExceptionKind(e({ registryStatus: 'ackOverdue' }))).toBe('ackOverdue');
    expect(registryExceptionKind(e({ registryStatus: 'accepted', acknowledgements: [ack('accepted'), ack('rejectedFatal')] }))).toBe('conflict');
    expect(registryExceptionKind(e({ registryStatus: 'accepted', acknowledgements: [ack('accepted')] }))).toBeNull();
    expect(registryExceptionKind(e({ status: 'FAILED', errorCode: 'EXCLUDED_BY_CONSENT', maxRetriesExceeded: true }))).toBeNull();
    expect(registryExceptionKind(e({ registryStatus: 'awaitingAck' }))).toBeNull();
  });
});

describe('registryExceptionRows', () => {
  it('only the latest version of a result, both queues, worst first, with findings and the raw message', () => {
    const rows = registryExceptionRows({
      cytology: [
        e({ id: 'v1', registryStatus: 'rejectedRecoverable', submission: hdr(1), acknowledgements: [ack('rejectedRecoverable')] }),
        e({ id: 'v2', status: 'FAILED', errorCode: 'REGISTRY_NOT_READY', errorMessage: 'Held, not sent: no code mapped', submission: hdr(2) }),
      ],
      cancer: [e({ id: 'k1', registryId: 'naaccr_us', registryStatus: 'rejectedFatal', submission: hdr(1, 'M2'), acknowledgements: [ack('rejectedFatal', '2026-10-03T00:00:00Z')] })],
    });
    expect(rows.map(r => `${r.queue}:${r.entryId}:${r.kind}`)).toEqual(['cancer:k1:rejectedFatal', 'cytology:v2:held']);
    expect(rows[0]).toMatchObject({ rawAcknowledgement: 'MSH|...', findings: [{ code: '102' }], canResend: true, at: '2026-10-03T00:00:00Z' });
    expect(rows[1].findings).toEqual([{ severity: 'CRITICAL_REJECT', code: 'REGISTRY_NOT_READY', message: 'Held, not sent: no code mapped' }]);
    expect(registryExceptionCounts(rows)).toMatchObject({ rejectedFatal: 1, held: 1, rejectedRecoverable: 0 });
  });
  it('an entry from before Batch 419 (no header) shows but cannot be resent; a conflict cannot be resent', () => {
    const rows = registryExceptionRows({ cytology: [e({ id: 'old', status: 'FAILED', errorCode: 'REGISTRY_NOT_READY', errorMessage: 'x' })], cancer: [e({ id: 'c', registryStatus: 'accepted', submission: hdr(1, 'M3'), acknowledgements: [ack('accepted'), ack('rejectedFatal')] })] });
    expect(rows.map(r => [r.entryId, r.canResend])).toEqual([['c', false], ['old', false]]);
  });
});

function resendSetup(entry: RegistryQueueEntryForWorklist & { contentHash?: string }, rebuild: any, allowed = true) {
  const port = {
    get: async () => entry,
    retryDispatch: vi.fn(async () => ({ ok: true as const, data: { id: entry.id, submission: { ...entry.submission!, isDuplicateRetry: true } } })),
    markSent: vi.fn(async () => undefined), markFailed: vi.fn(async () => undefined),
  };
  const deps: ResendDeps = {
    enforce: vi.fn(async () => ({ allowed })),
    queues: { cytology: port, cancer: port },
    rebuild: async () => rebuild,
    submitNewVersion: vi.fn(async () => ({ outcome: 'sent', queueId: 'new', submission: hdr(2) })),
    dispatch: vi.fn(async () => ({ ok: true })),
    logAudit: vi.fn(),
  };
  return { deps, port };
}
const u = { id: 'u1', name: 'Pete' };

describe('resendRegistrySubmission (Batch 421)', () => {
  it('needs registry:submission:resend', async () => {
    const { deps } = resendSetup(e({ submission: hdr(1) }), { status: 'ready', body: {}, contentHash: 'h' }, false);
    expect((await resendRegistrySubmission({ queue: 'cytology', entryId: 'e' }, u, deps)).outcome).toBe('notPermitted');
    expect(deps.enforce).toHaveBeenCalledWith('registry:submission:resend', { queueEntryId: 'e' });
  });
  it('same content, undelivered: the same submission again, flagged duplicate', async () => {
    const { deps, port } = resendSetup({ ...e({ status: 'FAILED', errorCode: 'DISPATCH_TIMEOUT', maxRetriesExceeded: true, submission: hdr(1) }), contentHash: 'h' }, { status: 'ready', body: { result: 'NILM' }, contentHash: 'h' });
    const r = await resendRegistrySubmission({ queue: 'cancer', entryId: 'e' }, u, deps);
    expect(r).toMatchObject({ outcome: 'resent', submission: { submissionGuid: 'GM11', isDuplicateRetry: true } });
    expect(deps.dispatch).toHaveBeenCalledWith('cancer', 'e', { result: 'NILM', submission: expect.objectContaining({ isDuplicateRetry: true }) });
    expect(port.markSent).toHaveBeenCalledWith('e');
    expect(deps.submitNewVersion).not.toHaveBeenCalled();
  });
  it('same content the registry rejected: refused', async () => {
    const { deps, port } = resendSetup({ ...e({ registryStatus: 'rejectedRecoverable', submission: hdr(1) }), contentHash: 'h' }, { status: 'ready', body: {}, contentHash: 'h' });
    expect((await resendRegistrySubmission({ queue: 'cytology', entryId: 'e' }, u, deps)).outcome).toBe('unchanged');
    expect(port.retryDispatch).not.toHaveBeenCalled();
  });
  it('changed content: a new version through the normal path', async () => {
    const { deps } = resendSetup({ ...e({ registryStatus: 'rejectedRecoverable', submission: hdr(1) }), contentHash: 'h' }, { status: 'ready', body: {}, contentHash: 'h2' });
    expect(await resendRegistrySubmission({ queue: 'cytology', entryId: 'e' }, u, deps)).toMatchObject({ outcome: 'newVersion', newEntryId: 'new', submission: { submissionVersion: 2 } });
  });
  it('still held, not applicable, a failed send, no header', async () => {
    expect((await resendRegistrySubmission({ queue: 'cytology', entryId: 'e' }, u, resendSetup(e({ submission: hdr(1) }), { status: 'held', message: 'no code' }).deps))).toEqual({ outcome: 'stillHeld', message: 'no code' });
    expect((await resendRegistrySubmission({ queue: 'cytology', entryId: 'e' }, u, resendSetup(e({ submission: hdr(1) }), { status: 'notApplicable', reason: 'opted out' }).deps)).outcome).toBe('notApplicable');
    const f = resendSetup({ ...e({ registryStatus: 'ackOverdue', submission: hdr(1) }), contentHash: 'h' }, { status: 'ready', body: {}, contentHash: 'h' });
    (f.deps.dispatch as any).mockResolvedValueOnce({ ok: false, errorCode: 'DISPATCH_UNREACHABLE', error: 'down' });
    expect((await resendRegistrySubmission({ queue: 'cytology', entryId: 'e' }, u, f.deps)).outcome).toBe('resendFailed');
    expect(f.port.markFailed).toHaveBeenCalledWith('e', expect.objectContaining({ errorCode: 'DISPATCH_UNREACHABLE' }));
    expect((await resendRegistrySubmission({ queue: 'cytology', entryId: 'e' }, u, resendSetup(e({}), { status: 'ready', body: {}, contentHash: 'h' }).deps)).outcome).toBe('noHeader');
  });
});

describe('rebuildRegistrySubmission (Batch 421)', () => {
  const caseData = { id: 'C1', order: { facilityId: 'F1' } };
  const base: RebuildDeps = {
    getCase: async () => caseData,
    getSignOutRecordAndReview: async () => ({ record: {}, review: {} }),
    getCategories: async () => [],
    prepareScreening: async () => ({ outcome: 'ready', definition: { id: 'csms_uk' } as any, decision: { holdReasons: [] } as any, body: { a: 1 }, contentHash: 'h' }),
    prepareCancer: async () => ({ outcome: 'ready', registryId: 'naaccr_us', body: { b: 1 } as any, contentHash: 'k' }),
    sendGate: async () => ({ action: 'send' as const }),
  };
  it('ready, held, moved registry, gone', async () => {
    expect(await rebuildRegistrySubmission('cytology', e({ signOutRecordId: 'so1' }), base)).toEqual({ status: 'ready', body: { a: 1 }, contentHash: 'h' });
    const held = await rebuildRegistrySubmission('cytology', e({ signOutRecordId: 'so1' }), { ...base, prepareScreening: async () => ({ outcome: 'ready', definition: { id: 'csms_uk', patientIdentifierFormatId: 'mrn_nhs' } as any, decision: { holdReasons: ['patientIdentifierMissing'], unmapped: [] } as any }) });
    expect(held).toMatchObject({ status: 'held' });
    expect((held as any).message).toContain('no NHS Number recorded');
    expect((await rebuildRegistrySubmission('cytology', e({ signOutRecordId: 'so1', registryId: 'ncsr_australia' }), base)).status).toBe('notApplicable');
    expect((await rebuildRegistrySubmission('cancer', e({ registryId: 'naaccr_us' }), base)).status).toBe('ready');
    expect((await rebuildRegistrySubmission('cancer', e({ registryId: 'naaccr_us' }), { ...base, getCase: async () => null })).status).toBe('notApplicable');
  });
});
