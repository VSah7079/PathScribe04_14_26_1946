import { describe, it, expect } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
const { dispatchQueuedCharge, sendCaseChargesToBillingEngine } = await import('./dispatchCharge');
const { outboundChargeQueueService } = await import('@/services');

describe('charge dispatch', () => {
  it('markSent moves QUEUED to SENT', async () => {
    const q = await outboundChargeQueueService.enqueue({ serviceChargeRecordId: 'r1', caseId: 'c1', billingType: 'Global', triggerEvent: 'CASE_SIGNED_OUT' });
    expect(q.ok && q.data.status).toBe('QUEUED');
    const s = await outboundChargeQueueService.markSent((q as any).data.id);
    expect(s.ok && s.data.status).toBe('SENT');
  });
  it('a charge whose case is missing is marked FAILED with a reason, never SENT', async () => {
    const q = await outboundChargeQueueService.enqueue({ serviceChargeRecordId: 'r2', caseId: 'no-such-case', billingType: 'Global', triggerEvent: 'CASE_SIGNED_OUT' });
    const r = await dispatchQueuedCharge((q as any).data, 'T');
    expect(r.ok).toBe(false);
    const all = await outboundChargeQueueService.getAll();
    const e = (all as any).data.find((x: any) => x.id === (q as any).data.id);
    expect(e.status).toBe('FAILED'); expect(e.errorMessage).toBeTruthy();
  });
  it('sending a case with no charges says so', async () => {
    const r = await sendCaseChargesToBillingEngine('case-without-charges', 'T');
    expect(r.ok).toBe(false); expect(r.message).toContain('no charges');
  });
});
