// @vitest-environment happy-dom
//
// src/services/auditlog/resolveError.test.ts
// Batch 432: resolving an Audit Log error needs audit:error:resolve and records who and when.
import { describe, it, expect, vi, beforeEach } from 'vitest';

let allowed = true;
const enforce = vi.fn(async (_c: string) => ({ allowed }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (c: string) => enforce(c) } }));
vi.mock('../auth/caseAccessControl', () => ({ getSessionUser: () => ({ id: '3', firstName: 'Pete', lastName: 'Nimmo' }) }));

describe('resolveError (Batch 432)', () => {
  beforeEach(() => { localStorage.clear(); allowed = true; enforce.mockClear(); });

  it('refuses without the permission and changes nothing', async () => {
    const { mockAuditService: svc } = await import('./mockAuditService');
    const logged = await svc.logError({ severity: 'error', code: 'E1', message: 'x', source: 'test', caseId: null });
    if (!logged.ok) throw new Error('setup failed');
    allowed = false;
    expect(await svc.resolveError(logged.data.id)).toMatchObject({ ok: false, error: 'NOT_PERMITTED' });
    expect(enforce).toHaveBeenCalledWith('audit:error:resolve');
    const all = await svc.getErrorLogs();
    expect(all.ok && all.data.find(e => e.id === logged.data.id)?.resolved).toBe(false);
  });

  it('marks it resolved with who and when', async () => {
    const { mockAuditService: svc } = await import('./mockAuditService');
    const logged = await svc.logError({ severity: 'warning', code: 'E2', message: 'y', source: 'test', caseId: null });
    if (!logged.ok) throw new Error('setup failed');
    const res = await svc.resolveError(logged.data.id);
    expect(res.ok).toBe(true);
    if (res.ok) { expect(res.data.resolved).toBe(true); expect(res.data.resolvedBy).toBe('Pete Nimmo'); expect(res.data.resolvedAt).toBeTruthy(); }
  });
});
