import { describe, expect, it, vi } from 'vitest';
import { footerStatusKind, HEALTH_RECHECK_AFTER_MS, parseHealthStatus, shouldRecheck, type HealthStatus } from './healthStatusContract';
import { createMockHealthStatusService } from './mockHealthStatusService';
import { createHttpHealthStatusService } from './httpHealthStatusService';
import type { ApiHttpClient } from '../apiServer/apiHttpClient';

const good = { overall: 'degraded', components: { database: 'operational', messaging: 'degraded', queues: 'operational', interfaceEngine: 'operational' }, checkedAt: '2026-10-24T10:00:00Z' };

describe('parseHealthStatus', () => {
  it('reads a complete answer and drops extra fields', () => {
    expect(parseHealthStatus({ ...good, patient: 'X' })).toEqual(good);
  });
  it.each([null, 'ok', {}, { ...good, overall: 'fine' }, { ...good, components: { database: 'operational' } }, { ...good, components: { ...good.components, queues: 'ok' } }])('rejects %j', raw => {
    expect(parseHealthStatus(raw)).toBeNull();
  });
});

describe('footerStatusKind', () => {
  const s = parseHealthStatus(good) as HealthStatus;
  it('shows checking until the first answer, then the server overall state', () => {
    expect(footerStatusKind('checking', null)).toBe('checking');
    expect(footerStatusKind('ready', s)).toBe('degraded');
    expect(footerStatusKind('checking', s)).toBe('degraded');
  });
  it('a failed check is statusUnavailable, never operational, even with an older answer', () => {
    expect(footerStatusKind('failed', null)).toBe('statusUnavailable');
    expect(footerStatusKind('failed', { ...s, overall: 'operational' })).toBe('statusUnavailable');
  });
});

describe('shouldRecheck', () => {
  it('only when visible and 5 minutes old (or never checked)', () => {
    expect(shouldRecheck(null, 0, true)).toBe(true);
    expect(shouldRecheck(0, HEALTH_RECHECK_AFTER_MS - 1, true)).toBe(false);
    expect(shouldRecheck(0, HEALTH_RECHECK_AFTER_MS, true)).toBe(true);
    expect(shouldRecheck(0, HEALTH_RECHECK_AFTER_MS * 2, false)).toBe(false);
  });
});

describe('mock health service', () => {
  it('probes the browser, labelled simulated', async () => {
    const on = await createMockHealthStatusService({ isOnline: () => true }).check();
    expect(on.ok && on.data.overall).toBe('operational');
    expect(on.ok && on.data.simulated).toBe(true);
    const off = await createMockHealthStatusService({ isOnline: () => false }).check();
    expect(off.ok && off.data.overall).toBe('unavailable');
  });
  it('can be set to an answer or to fail', async () => {
    const m = createMockHealthStatusService();
    m.setMockResult(parseHealthStatus(good));
    const r = await m.check();
    expect(r.ok && r.data.overall).toBe('degraded');
    m.setMockResult('fail');
    expect((await m.check()).ok).toBe(false);
  });
});

describe('http health service', () => {
  const clientWith = (get: ApiHttpClient['get']) => ({ get } as unknown as ApiHttpClient);
  it('GETs the one route and returns the parsed answer', async () => {
    const get = vi.fn().mockResolvedValue({ ok: true, data: good });
    const r = await createHttpHealthStatusService(clientWith(get)).check();
    expect(get).toHaveBeenCalledWith('/api/health/health-status/check');
    expect(r.ok && r.data.overall).toBe('degraded');
  });
  it('an HTTP failure, an unreadable answer or a throw is a failed check', async () => {
    for (const get of [vi.fn().mockResolvedValue({ ok: false, error: 'X' }), vi.fn().mockResolvedValue({ ok: true, data: { overall: 'operational' } }), vi.fn().mockRejectedValue(new Error('net'))]) {
      expect((await createHttpHealthStatusService(clientWith(get as never)).check()).ok).toBe(false);
    }
  });
});
