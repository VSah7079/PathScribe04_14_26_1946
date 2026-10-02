// src/services/cytology/cytologyRegistryQueueRetry.test.ts
// Batch 419 (SRS v2.1 FR-008.5): a resend keeps the submission id and marks the duplicate.
import { describe, it, expect, beforeEach } from 'vitest';
import { buildRegistrySubmissionHeader } from '../registrySubmission/registrySubmissionHeader';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } };
});

describe('cytology registry queue retry (Batch 419)', () => {
  it('keeps the header and sets isDuplicateRetry', async () => {
    const { mockCytologyRegistryOutboundQueueService: q } = await import('./mockCytologyRegistryOutboundQueueService');
    const submission = buildRegistrySubmissionHeader({ facilityId: 'F1', caseId: 'C1', specimenId: 'SP1', registryId: 'csms_uk', signOutTimestamp: 't', kind: 'signOut' }, []);
    const e = await q.enqueue({ caseId: 'C1', signOutRecordId: 'so1', registryId: 'csms_uk', submission });
    if (!e.ok) throw new Error('enqueue');
    await q.markFailed(e.data.id, { errorCode: 'DISPATCH_TIMEOUT', errorMessage: 'x', maxRetriesExceeded: false });
    const r = await q.retryDispatch(e.data.id);
    expect(r.ok && r.data.submission).toEqual({ ...submission, isDuplicateRetry: true });
  });
  it('an entry without a header (an exclusion, or from before Batch 419) stays without one', async () => {
    const { mockCytologyRegistryOutboundQueueService: q } = await import('./mockCytologyRegistryOutboundQueueService');
    const e = await q.enqueue({ caseId: 'C2', signOutRecordId: 'so1', registryId: 'csms_uk' });
    if (!e.ok) throw new Error('enqueue');
    const r = await q.retryDispatch(e.data.id);
    expect(r.ok && r.data.submission).toBeUndefined();
  });
});
