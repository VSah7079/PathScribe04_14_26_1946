import { describe, expect, it, vi } from 'vitest';
import { createMockBillingFeedAdapter } from './billingFeedAdapter';
import { createHoldStore } from './outboundHoldStore';
import type { OutboundHold } from './outboundQueueTypes';

const charge = (o: object = {}) => ({ id: 'c1', serviceChargeRecordId: 's', caseId: 'S26-1', billingType: 'TC', triggerEvent: 'SPECIMEN_GROSSED', status: 'QUEUED', queuedAt: '2026-10-01T00:00:00Z', retryCount: 0, maxRetriesExceeded: false, ...o });

function make(rows = [charge()]) {
  let holds: OutboundHold[] = [];
  const charges = { getAll: vi.fn(async () => ({ ok: true as const, data: rows as never })), retryDispatch: vi.fn(async () => ({ ok: true as const, data: rows[0] as never })) };
  const store = createHoldStore(() => holds, h => { holds = h; });
  return { adapter: createMockBillingFeedAdapter(charges, store, () => '2026-10-10T00:00:00Z'), holds: () => holds, charges };
}

describe('mock billing feed adapter', () => {
  it('lists charges with their billing type, and a coding gap waits for review', async () => {
    const { adapter } = make([charge(), charge({ id: 'c2', billingType: '26', status: 'FAILED', errorCode: 'MISSING_ICD10' })]);
    const items = await adapter.listBillingItems();
    expect(items[0].billing).toEqual({ billingType: 'TC' });
    expect(items[1].billing).toEqual({ billingType: '26', needsReview: 'unmappedCpt' });
    expect(JSON.stringify(items)).not.toContain('errorMessage');
  });
  it('holds, releases, overrides and retracts through the store', async () => {
    const { adapter, holds } = make();
    expect(await adapter.hold('c1', 'billingReview', 'n', 'Dr A')).toBe(true);
    expect(holds()[0]).toMatchObject({ ref: 'billing:c1', reason: 'billingReview' });
    expect(await adapter.release('c1')).toBe(true);
    expect(holds()).toEqual([]);
    expect(await adapter.release('c1', { overriddenBy: 'u9' })).toBe(true);
    expect(holds()[0]).toMatchObject({ override: true, heldBy: 'u9' });
    expect(await adapter.retract('c1', 'caseAmended', 'u9')).toBe(true);
    expect(holds().length).toBe(1);
    expect(holds()[0]).toMatchObject({ closed: 'retracted', reason: 'caseAmended' });
  });
  it('refuses a charge that is gone or already sent, and retries through the charge queue', async () => {
    const { adapter } = make([charge({ id: 'c9', status: 'SENT' })]);
    expect(await adapter.hold('c9', 'other', undefined, 'u')).toBe(false);
    expect(await adapter.retract('c9', 'other', 'u')).toBe(false);
    expect(await adapter.release('nope')).toBe(false);
    expect(await adapter.retry('c9')).toBe(true);
  });
});
