// Batch 616 (PS-484): the server versions of audit, users, roles, facilities,
// registry settings and authorization, against a fake fetch (STAFF_ADMIN_API.md).
import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from './apiHttpClient';
import { createHttpAuditService } from '../auditlog/httpAuditService';
import { createHttpUserService } from '../users/httpUserService';
import { createHttpRoleService } from '../roles/httpRoleService';
import { createHttpFacilityService } from '../facilities/httpFacilityService';
import { createHttpFacilityRegistryOverrideService, createHttpRegistrySettingsService } from '../facilities/httpRegistrySettingsService';
import { createHttpAuthorizationService } from '../authorization/httpAuthorizationService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
type F = ReturnType<typeof vi.fn>;
// a fresh Response per call (a body can be read once)
const always = (status: number, body?: unknown) => vi.fn().mockImplementation(async () => reply(status, body));
const client = (f: F) => createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' });
const call = (f: F, i = 0) => ({ url: f.mock.calls[i][0] as string, method: (f.mock.calls[i][1] as RequestInit).method, body: (f.mock.calls[i][1] as RequestInit).body as string | undefined });

describe('http audit service', () => {
  it('lists logs with filters (all is left out) and sends an entry without time or actor', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, { items: [{ id: 'a' }] })).mockResolvedValueOnce(reply(200, { id: 'b' }));
    const s = createHttpAuditService(client(f));
    expect(await s.getAuditLogs({ type: 'all', user: 'all', dateFrom: '2026-10-01', search: 'role' })).toEqual({ ok: true, data: [{ id: 'a' }] });
    expect(call(f).url).toBe('https://api.test/api/auditlog/audit/get-audit-logs');
    expect(JSON.parse(call(f).body as string)).toEqual({ dateFrom: '2026-10-01', search: 'role' });
    const entry = { type: 'user' as const, event: 'Role changed', detail: 'no patient data', user: 'Dr A', caseId: null, confidence: null };
    expect(await s.logEvent(entry)).toEqual({ ok: true, data: { id: 'b' } });
    expect(call(f, 1)).toMatchObject({ url: 'https://api.test/api/auditlog/audit/log-event', method: 'POST' });
    expect(JSON.parse(call(f, 1).body as string)).toEqual({ ...entry, stationId: null });
  });
  it('lists errors, logs one and resolves one; there is no delete', async () => {
    const f = always(200, { items: [] });
    const s = createHttpAuditService(client(f));
    await s.getErrorLogs({ severity: 'error', resolved: false });
    expect(call(f).url).toBe('https://api.test/api/auditlog/audit/get-error-logs');
    expect(JSON.parse(call(f).body as string)).toEqual({ severity: 'error', resolved: false });
    await s.getErrorLogs({ severity: 'all', resolved: 'all' });
    expect(call(f, 1).url).toBe('https://api.test/api/auditlog/audit/get-error-logs');
    expect(JSON.parse(call(f, 1).body as string)).toEqual({});
    await s.logError({ severity: 'warning', code: 'X', message: 'm', source: 's', caseId: null });
    expect(call(f, 2)).toMatchObject({ url: 'https://api.test/api/auditlog/audit/log-error', method: 'POST' });
    await s.resolveError('e 1');
    expect(call(f, 3)).toMatchObject({ url: 'https://api.test/api/auditlog/audit/resolve-error', method: 'POST', body: JSON.stringify({ id: 'e 1' }) });
    expect(Object.keys(s).sort()).toEqual(['getAuditLogs', 'getErrorLogs', 'logError', 'logEvent', 'resolveError']);
  });
  it('turns a refusal into a fixed code', async () => {
    const f = always(403, { message: 'Smith, John' });
    expect(await createHttpAuditService(client(f)).getAuditLogs()).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
});

describe('http user service', () => {
  it('reads, adds, edits, deactivates and reactivates', async () => {
    const f = always(200, { items: [{ id: 'u1' }], id: 'u1' });
    const s = createHttpUserService(client(f));
    expect(await s.getAll()).toEqual({ ok: true, data: [{ id: 'u1' }] });
    await s.getById('u/1');
    await s.add({ firstName: 'A' } as never);
    await s.update('u1', { phone: '1' });
    await s.deactivate('u1');
    await s.reactivate('u1');
    expect([0, 1, 2, 3, 4, 5].map(i => `${call(f, i).method} ${call(f, i).url.replace('https://api.test', '')}`)).toEqual([
      'GET /api/users/user/get-all', 'GET /api/users/user/get-by-id?id=u%2F1', 'POST /api/users/user/add', 'POST /api/users/user/update', 'POST /api/users/user/deactivate', 'POST /api/users/user/reactivate',
    ]);
    expect(call(f, 3).body).toBe(JSON.stringify({ id: 'u1', changes: { phone: '1' } }));
  });
  it('keeps NOT_FOUND and CONFLICT codes', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(404, {})).mockResolvedValueOnce(reply(409, {}));
    const s = createHttpUserService(client(f));
    expect(await s.getById('x')).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await s.update('x', {})).toMatchObject({ ok: false, error: 'CONFLICT' });
  });
});

describe('http role service', () => {
  it('covers every call', async () => {
    const f = always(200, { items: [] });
    const s = createHttpRoleService(client(f));
    await s.getAll(); await s.getById('r1'); await s.add({ name: 'N' } as never); await s.update('r1', { description: 'd' }); await s.delete('r1');
    expect([0, 1, 2, 3, 4].map(i => `${call(f, i).method} ${call(f, i).url.replace('https://api.test', '')}`)).toEqual([
      'GET /api/roles/role/get-all', 'GET /api/roles/role/get-by-id?id=r1', 'POST /api/roles/role/add', 'POST /api/roles/role/update', 'POST /api/roles/role/delete',
    ]);
  });
  it('a refused role save is NOT_PERMITTED', async () => {
    const f = always(403, { error: 'capability_refused' });
    expect(await createHttpRoleService(client(f)).update('r1', {})).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
});

describe('http facility service', () => {
  it('covers every call, and print settings travel on their own call', async () => {
    const f = always(200, { items: [] });
    const s = createHttpFacilityService(client(f));
    await s.getAll(); await s.getById('f1'); await s.add({ name: 'F' } as never); await s.update('f1', { name: 'G' });
    await s.deactivate('f1'); await s.reactivate('f1'); await s.verify('f1');
    await s.setPrintSettings('f1', { printDeliveryConfig: undefined } as never);
    await s.findOrCreateByAssigningAuthority('AUTH', 'Name', 'note');
    await s.setDirectDevicePrinting('f1', true);
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `${call(f, i).method} ${call(f, i).url.replace('https://api.test', '')}`)).toEqual([
      'GET /api/facilities/facility/get-all', 'GET /api/facilities/facility/get-by-id?id=f1', 'POST /api/facilities/facility/add', 'POST /api/facilities/facility/update', 'POST /api/facilities/facility/deactivate',
      'POST /api/facilities/facility/reactivate', 'POST /api/facilities/facility/verify', 'POST /api/facilities/facility/set-print-settings', 'POST /api/facilities/facility/find-or-create-by-assigning-authority',
      'POST /api/facilities/facility/set-direct-device-printing',
    ]);
    expect(JSON.parse(call(f, 8).body as string)).toEqual({ assigningAuthority: 'AUTH', name: 'Name', note: 'note' });
  });
});

describe('http registry settings services', () => {
  it('reads, patches and resets the settings', async () => {
    const f = always(200, { registryId: 'none' });
    const s = createHttpRegistrySettingsService(client(f));
    expect(await s.get()).toEqual({ ok: true, data: { registryId: 'none' } });
    await s.update({ registryId: 'none' }); await s.reset();
    expect([0, 1, 2].map(i => `${call(f, i).method} ${call(f, i).url.replace('https://api.test', '')}`)).toEqual([
      'GET /api/facilities/registry-settings/get', 'POST /api/facilities/registry-settings/update', 'POST /api/facilities/registry-settings/reset',
    ]);
  });
  it('a facility with no override is a successful none; the other calls follow the route', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(404, {})).mockImplementation(async () => reply(200, {}));
    const s = createHttpFacilityRegistryOverrideService(client(f));
    expect(await s.getForFacility('f1')).toEqual({ ok: true, data: null });
    await s.create('f1', { registryId: 'none' }); await s.update('f1', {}); await s.remove('f1');
    expect([1, 2, 3].map(i => call(f, i).method)).toEqual(['POST', 'POST', 'POST']);
    expect(call(f, 1).url).toBe('https://api.test/api/facilities/facility-registry-override/create');
  });
});

describe('http authorization service', () => {
  const decision = { capability: 'config:roles:manage', allowed: true, grantedBy: [{ id: 'r', name: 'Admin' }], missingRequirements: [], context: {} };
  it('puts each check to the server and returns its answer', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, decision)).mockResolvedValueOnce(reply(200, { ...decision, allowed: false, reason: 'notGranted' }));
    const s = createHttpAuthorizationService(client(f));
    expect((await s.evaluate('config:roles:manage', { facilityId: 'f1' })).allowed).toBe(true);
    expect(call(f)).toMatchObject({ url: 'https://api.test/api/authorization/authorization/evaluate', method: 'POST' });
    expect(JSON.parse(call(f).body as string)).toEqual({ capability: 'config:roles:manage', context: { facilityId: 'f1' } });
    expect((await s.enforce('config:roles:manage')).allowed).toBe(false);
    expect(call(f, 1).url).toBe('https://api.test/api/authorization/authorization/enforce');
  });
  it('fails closed: a refusal, a server error or an unreadable answer is never a grant', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, {})).mockResolvedValueOnce(reply(500, {})).mockResolvedValueOnce(reply(200, { oops: true }));
    const s = createHttpAuthorizationService(client(f));
    for (let i = 0; i < 3; i++) {
      const d = await s.enforce('config:roles:manage');
      expect(d.allowed).toBe(false);
      expect(d.reason).toBe('notGranted');
    }
  });
  it('reads the granted set and the snapshot; an unreachable server grants nothing', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, { capabilities: ['a', 'b'] })).mockResolvedValueOnce(reply(200, { subject: null, roles: [] }))
      .mockResolvedValueOnce(reply(503, {})).mockResolvedValueOnce(reply(503, {}));
    const s = createHttpAuthorizationService(client(f));
    expect([...(await s.grantedCapabilities())]).toEqual(['a', 'b']);
    expect(await s.snapshot()).toEqual({ subject: null, roles: [] });
    expect((await s.grantedCapabilities()).size).toBe(0);
    expect(await s.snapshot()).toEqual({ subject: null, roles: [] });
  });
});
