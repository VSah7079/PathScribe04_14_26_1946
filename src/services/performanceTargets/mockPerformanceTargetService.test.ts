// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { mockPerformanceTargetService as svc, PERFORMANCE_TARGETS_STORAGE_KEY, STARTING_PERFORMANCE_TARGETS } from './mockPerformanceTargetService';
import { mockAuditService } from '../auditlog/mockAuditService';

describe('mockPerformanceTargetService', () => {
  beforeEach(() => localStorage.removeItem('pathscribe_mock_' + PERFORMANCE_TARGETS_STORAGE_KEY));

  it('starts with the starting targets', async () => {
    const r = await svc.getAll();
    expect(r.ok && r.data.map(t => t.key)).toEqual(STARTING_PERFORMANCE_TARGETS.map(t => t.key));
  });

  it('adds a target, keeps it after reload, and audits the numbers', async () => {
    const r = await svc.add({ key: '', label: 'Slides per Week', description: '', value: 40, unit: 'cases', period: 'weekly', system: true });
    expect(r.ok && r.data).toMatchObject({ key: 'slides_per_week', system: false });
    const all = await svc.getAll();
    expect(all.ok && all.data.some(t => t.key === 'slides_per_week')).toBe(true);
    const log = await mockAuditService.getAuditLogs();
    expect(log.ok && log.data.some(e => e.event === 'PERFORMANCE_TARGET_CHANGED' && e.detail.includes('Slides per Week'))).toBe(true);
  });

  it('changes a value but not a system target\'s key, and refuses bad values', async () => {
    const r = await svc.update('pt-1', { value: 130, key: 'hacked' });
    expect(r.ok && r.data).toMatchObject({ value: 130, key: 'cases_monthly', system: true });
    expect(await svc.update('pt-1', { value: -5 })).toEqual({ ok: false, error: 'valueInvalid' });
    expect(await svc.update('nope', { value: 5 })).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('deletes a custom target but not a system one', async () => {
    expect(await svc.delete('pt-1')).toEqual({ ok: false, error: 'SYSTEM_TARGET' });
    expect((await svc.delete('pt-5')).ok).toBe(true);
    const r = await svc.getByKey('rvu_monthly');
    expect(r.ok && r.data).toBeNull();
  });
});
