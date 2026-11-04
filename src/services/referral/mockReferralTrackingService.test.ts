// src/services/referral/mockReferralTrackingService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextManualTransitStatuses } from './referralTransitRules';

// Batch 432: setting the status by hand needs referral:transit-status:update.
let allowed = true;
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed }) },
}));

beforeEach(() => {
  allowed = true;
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('mockReferralTrackingService — real transit status + inbound result tracking', () => {
  it('real, createOnDispatch starts a real tracking record at \'dispatched\'', async () => {
    const { mockReferralTrackingService } = await import('./mockReferralTrackingService');
    const result = await mockReferralTrackingService.createOnDispatch('batch-001');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.transitStatus).toBe('dispatched');
  });

  it('real, a genuine duplicate createOnDispatch for the same batch is refused, not silently overwritten', async () => {
    const { mockReferralTrackingService } = await import('./mockReferralTrackingService');
    await mockReferralTrackingService.createOnDispatch('batch-002');
    const second = await mockReferralTrackingService.createOnDispatch('batch-002');
    expect(second.ok).toBe(false);
  });

  it('real, updateTransitStatus correctly moves the real, existing record through the lifecycle', async () => {
    const { mockReferralTrackingService } = await import('./mockReferralTrackingService');
    await mockReferralTrackingService.createOnDispatch('batch-003');
    const updated = await mockReferralTrackingService.updateTransitStatus('batch-003', 'in_transit');
    expect(updated.ok).toBe(true);
    if (updated.ok) expect(updated.data.transitStatus).toBe('in_transit');
  });

  it('real, recordResult moves status to result_received and stores the real discrete result', async () => {
    const { mockReferralTrackingService } = await import('./mockReferralTrackingService');
    await mockReferralTrackingService.createOnDispatch('batch-004');
    const result = await mockReferralTrackingService.recordResult('batch-004', { resultType: 'discrete', discreteResult: 'BRAF V600E detected' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.transitStatus).toBe('result_received');
      expect(result.data.discreteResult).toBe('BRAF V600E detected');
      expect(result.data.receivedAt).toBeDefined();
    }
  });

  it('real, an honest failure for a genuinely unknown batchId, never a silent no-op', async () => {
    const { mockReferralTrackingService } = await import('./mockReferralTrackingService');
    const result = await mockReferralTrackingService.updateTransitStatus('does-not-exist', 'in_transit');
    expect(result.ok).toBe(false);
  });

  it('Batch 432: by hand, forward only, never "result received", and needs the permission', async () => {
    const { mockReferralTrackingService: svc } = await import('./mockReferralTrackingService');
    await svc.createOnDispatch('batch-005');
    allowed = false;
    expect(await svc.updateTransitStatus('batch-005', 'in_transit')).toMatchObject({ ok: false, error: 'NOT_PERMITTED' });
    allowed = true;
    expect(await svc.updateTransitStatus('batch-005', 'result_received')).toMatchObject({ ok: false, error: 'RESULT_ONLY_BY_RESULT' });
    expect((await svc.updateTransitStatus('batch-005', 'delivered')).ok).toBe(true);
    expect(await svc.updateTransitStatus('batch-005', 'in_transit')).toMatchObject({ ok: false, error: 'TRANSIT_BACKWARDS' });
  });

  it('Batch 432: the choices offered from each status', () => {
    expect(nextManualTransitStatuses('dispatched')).toEqual(['in_transit', 'delivered']);
    expect(nextManualTransitStatuses('in_transit')).toEqual(['delivered']);
    expect(nextManualTransitStatuses('delivered')).toEqual([]);
    expect(nextManualTransitStatuses('result_received')).toEqual([]);
  });
});
