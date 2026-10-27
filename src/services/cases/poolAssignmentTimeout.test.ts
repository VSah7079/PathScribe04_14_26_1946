import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
vi.mock('./casePoolAssignmentService', () => ({ getRoutingConfig: () => ({ enabled: true, assignmentTimeoutSec: 300 }), routeCase: vi.fn() }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent: vi.fn() } }));
import { assignmentWaitExpired, expireUnassignedCases, startAssignmentTimeoutSweep, type ExpireDeps } from './poolAssignmentTimeout';
import type { Case } from '@/types/case/Case';

const T0 = Date.parse('2026-10-22T10:00:00.000Z');
const mk = (over: Record<string, unknown> = {}) => ({ id: 'C1', status: 'gross-complete', order: {}, grossCompletedAt: new Date(T0).toISOString(), ...over } as unknown as Case);
const depsAt = (nowMs: number, over: Partial<ExpireDeps> = {}): ExpireDeps => ({
  timeoutSec: () => 300, routingEnabled: () => true, now: () => nowMs,
  route: vi.fn().mockResolvedValue({ outcome: 'routed_to_pool', poolName: 'GI' }),
  audit: vi.fn().mockResolvedValue(undefined), ...over,
});

describe('assignmentWaitExpired', () => {
  it('expires after exactly the timeout, not before', () => {
    expect(assignmentWaitExpired(mk(), T0 + 299_999, 300)).toBe(false);
    expect(assignmentWaitExpired(mk(), T0 + 300_000, 300)).toBe(true);
  });
  it('0 means no wait', () => expect(assignmentWaitExpired(mk(), T0, 0)).toBe(true));
  it('never expires an assigned, pooled, finalized or ungrossed case', () => {
    expect(assignmentWaitExpired(mk({ order: { assignedTo: 'u1' } }), T0 + 1e9, 300)).toBe(false);
    expect(assignmentWaitExpired(mk({ status: 'pool' }), T0 + 1e9, 300)).toBe(false);
    expect(assignmentWaitExpired(mk({ status: 'finalized' }), T0 + 1e9, 300)).toBe(false);
    expect(assignmentWaitExpired(mk({ grossCompletedAt: undefined }), T0 + 1e9, 300)).toBe(false);
  });
});

describe('expireUnassignedCases', () => {
  it('routes only expired cases, audits, and tries each case once', async () => {
    const d = depsAt(T0 + 301_000);
    const tried = new Set<string>();
    const r = await expireUnassignedCases([mk(), mk({ id: 'C2', order: { assignedTo: 'u' } })], d, tried);
    expect(r.routed).toEqual(['C1']);
    expect(d.audit).toHaveBeenCalledTimes(1);
    await expireUnassignedCases([mk()], d, tried);
    expect(d.route).toHaveBeenCalledTimes(1);
  });
  it('does nothing when automatic routing is off, and contains a failure', async () => {
    const off = depsAt(T0 + 1e6, { routingEnabled: () => false });
    expect((await expireUnassignedCases([mk()], off)).routed).toEqual([]);
    const bad = depsAt(T0 + 1e6, { route: vi.fn().mockRejectedValue(new Error('x')) });
    expect((await expireUnassignedCases([mk()], bad)).failed).toEqual(['C1']);
  });
});

describe('startAssignmentTimeoutSweep (fake timers)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(T0); });
  afterEach(() => vi.useRealTimers());

  it('expires an unaccepted case once 300 s have passed, then stops when asked', async () => {
    const onRouted = vi.fn();
    const deps = depsAt(0, { now: () => Date.now() });
    const stop = startAssignmentTimeoutSweep(() => [mk()], onRouted, { intervalMs: 30_000, deps });
    await vi.advanceTimersByTimeAsync(240_000);
    expect(onRouted).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(onRouted).toHaveBeenCalledWith(['C1']);
    stop();
    onRouted.mockClear();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(onRouted).not.toHaveBeenCalled();
  });
});
