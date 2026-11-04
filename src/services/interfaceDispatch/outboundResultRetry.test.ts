// @vitest-environment happy-dom
// src/services/interfaceDispatch/outboundResultRetry.test.ts (Batch 561)
// A result retried from the failed-messages screen: held while its workup version isn't known (Batch 559),
// and the hash of the PDF a retry carries is recorded on the entry.
import { describe, it, expect, vi } from 'vitest';

const prepare = vi.hoisted(() => vi.fn());
vi.mock('../reports/prepareOruR01Dispatch', () => ({ prepareOruR01Dispatch: prepare }));

import { loadOutboundQueueAdapters } from './outboundQueueAdapters';
import { outboundResultQueueService } from '../index';

const entry = { id: 'q-9', status: 'FAILED' as const, queuedAt: '2026-10-14T00:00:00Z', retryCount: 0, maxRetriesExceeded: false, caseId: 'C1', instanceId: 'I1', resultState: 'FINAL' as const, organisationId: 'o' };

describe('retrying a result (Batch 561)', () => {
  it('is held, with the reason, while the workup version is not known; "not found" builds nothing', async () => {
    const a = await loadOutboundQueueAdapters();
    prepare.mockResolvedValueOnce({ ok: false, reason: 'version_unknown', error: 'Held: … workup version is not known …' });
    expect(await a.result.buildPayload(entry)).toEqual({ held: 'Held: … workup version is not known …' });
    prepare.mockResolvedValueOnce({ ok: false, reason: 'not_found', error: 'gone' });
    expect(await a.result.buildPayload(entry)).toBeNull();
  });

  it('records the hash of the PDF the retry carries', async () => {
    const a = await loadOutboundQueueAdapters();
    const record = vi.spyOn(outboundResultQueueService, 'recordPdfSha256').mockResolvedValue({ ok: true, data: entry } as never);
    prepare.mockResolvedValueOnce({ ok: true, payload: { messageId: 'm' }, pdfSha256: 'c'.repeat(64) });
    expect(await a.result.buildPayload(entry)).toEqual({ messageId: 'm' });
    expect(record).toHaveBeenCalledWith('q-9', 'c'.repeat(64));
    record.mockRestore();
  });
});
