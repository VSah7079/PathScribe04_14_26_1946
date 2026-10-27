import { describe, it, expect, vi } from 'vitest';
import { openCriticalAlertReference } from './openCriticalAlertReference';
import type { CriticalAlertReferenceToken } from './ICriticalAlertReferenceTokenService';

const rec = (accessCount: number) => ({ id: 't1', accessCount }) as CriticalAlertReferenceToken;

describe('openCriticalAlertReference (access-12)', () => {
  it('returns the record AFTER this view is recorded, so the first view says 1, not 0', async () => {
    const order: string[] = [];
    const service = {
      resolve: vi.fn(async () => { order.push('resolve'); return { ok: true as const, data: rec(0) }; }),
      recordAccess: vi.fn(async () => { order.push('record'); return { ok: true as const, data: rec(1) }; }),
    };
    const r = await openCriticalAlertReference('tok', service);
    expect(order).toEqual(['resolve', 'record']);
    expect(r.ok && r.data.accessCount).toBe(1);
  });
  it('records nothing for an invalid link', async () => {
    const service = { resolve: vi.fn(async () => ({ ok: false as const, error: 'no' })), recordAccess: vi.fn() };
    const r = await openCriticalAlertReference('tok', service as never);
    expect(r.ok).toBe(false);
    expect(service.recordAccess).not.toHaveBeenCalled();
  });
  it('still opens if recording fails, counting this view', async () => {
    const service = { resolve: vi.fn(async () => ({ ok: true as const, data: rec(4) })), recordAccess: vi.fn(async () => ({ ok: false as const, error: 'x' })) };
    const r = await openCriticalAlertReference('tok', service as never);
    expect(r.ok && r.data.accessCount).toBe(5);
  });
});
