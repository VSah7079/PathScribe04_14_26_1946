// @vitest-environment happy-dom
//
// src/services/access/mockAccessRequestService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Batch 432: deny checks the permission that gives that access, and messages the requester.
const allowed = new Set<string>();
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async (c: string) => ({ allowed: allowed.has(c) }) },
}));
const sent: { recipientId: string; subject: string; body: string }[] = [];
vi.mock('../index', () => ({ messageService: { send: async (m: { recipientId: string; subject: string; body: string }) => { sent.push(m); return { ok: true, data: m }; } } }));

import { mockAccessRequestService as svc } from './mockAccessRequestService';

beforeEach(() => {
  localStorage.clear();
  allowed.clear(); allowed.add('config:staff:edit'); allowed.add('config:staff-access:assign');
  sent.length = 0;
});

describe('mockAccessRequestService — real feature, per direct follow-up: "Do we Track the request to gain access? ... Do we generate a ticket system that has its own status"', () => {
  it('creates a real, pending pediatric request', async () => {
    const res = await svc.create({
      type: 'pediatric', requestingUserId: 'u1', requestingUserName: 'Dr. One',
      caseId: 'S26-1', facilityId: 'client-1', facilityName: 'Metro General',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.status).toBe('pending');
      expect(res.data.type).toBe('pediatric');
      expect(res.data.id).toBeTruthy();
    }
  });

  it('creates a real, pending pool request', async () => {
    const res = await svc.create({
      type: 'pool', requestingUserId: 'u1', requestingUserName: 'Dr. One',
      caseId: 'S26-1', poolId: 'gi', poolName: 'Gastrointestinal',
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.type).toBe('pool');
  });

  it('a real, pending request shows up in the admin queue', async () => {
    await svc.create({ type: 'pediatric', requestingUserId: 'u1', requestingUserName: 'Dr. One', facilityId: 'client-1' });
    const res = await svc.getPending();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toHaveLength(1);
  });

  it('grant moves a real request from pending to granted, recording the real resolver', async () => {
    const created = await svc.create({ type: 'pool', requestingUserId: 'u1', requestingUserName: 'Dr. One', poolId: 'gi' });
    if (!created.ok) throw new Error('setup failed');
    const granted = await svc.grant(created.data.id, 'admin-1', 'Admin Smith');
    expect(granted.ok).toBe(true);
    if (granted.ok) {
      expect(granted.data.status).toBe('granted');
      expect(granted.data.resolvedByUserId).toBe('admin-1');
      expect(granted.data.resolvedByUserName).toBe('Admin Smith');
      expect(granted.data.resolvedAt).toBeTruthy();
    }
  });

  it('deny moves a real request from pending to denied', async () => {
    const created = await svc.create({ type: 'pediatric', requestingUserId: 'u1', requestingUserName: 'Dr. One', facilityId: 'client-1' });
    if (!created.ok) throw new Error('setup failed');
    const denied = await svc.deny(created.data.id, 'admin-1', 'Admin Smith', 'Not on the pediatric rota');
    expect(denied.ok).toBe(true);
    if (denied.ok) { expect(denied.data.status).toBe('denied'); expect(denied.data.denialReason).toBe('Not on the pediatric rota'); }
    expect(sent).toHaveLength(1);
    expect(sent[0].recipientId).toBe('u1');
    expect(sent[0].body).toContain('Not on the pediatric rota');
  });

  it('Batch 432: deny needs a reason and the permission that gives that access', async () => {
    const pool = await svc.create({ type: 'pool', requestingUserId: 'u1', requestingUserName: 'Dr. One', poolName: 'GI' });
    if (!pool.ok) throw new Error('setup failed');
    expect(await svc.deny(pool.data.id, 'admin-1', 'Admin Smith', '  ')).toMatchObject({ ok: false, error: 'REASON_REQUIRED' });
    allowed.delete('config:staff:edit');
    expect(await svc.deny(pool.data.id, 'admin-1', 'Admin Smith', 'No')).toMatchObject({ ok: false, error: 'NOT_PERMITTED' });
    allowed.add('config:staff:edit');
    expect((await svc.deny(pool.data.id, 'admin-1', 'Admin Smith', 'No')).ok).toBe(true);
    expect(await svc.deny(pool.data.id, 'admin-1', 'Admin Smith', 'No')).toMatchObject({ ok: false, error: 'ALREADY_RESOLVED' });
  });

  it('a resolved request genuinely leaves the pending admin queue', async () => {
    const created = await svc.create({ type: 'pool', requestingUserId: 'u1', requestingUserName: 'Dr. One', poolId: 'gi' });
    if (!created.ok) throw new Error('setup failed');
    await svc.grant(created.data.id, 'admin-1', 'Admin Smith');
    const pending = await svc.getPending();
    expect(pending.ok).toBe(true);
    if (pending.ok) expect(pending.data).toHaveLength(0);
  });

  it('getAllForUser returns every real request for that user, any status', async () => {
    await svc.create({ type: 'pediatric', requestingUserId: 'u1', requestingUserName: 'Dr. One', facilityId: 'client-1' });
    const created2 = await svc.create({ type: 'pool', requestingUserId: 'u1', requestingUserName: 'Dr. One', poolId: 'gi' });
    if (created2.ok) await svc.grant(created2.data.id, 'admin-1', 'Admin Smith');
    await svc.create({ type: 'pool', requestingUserId: 'u2', requestingUserName: 'Dr. Two', poolId: 'derm' });

    const res = await svc.getAllForUser('u1');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toHaveLength(2);
  });

  it('getAll returns every real request regardless of user or status - for the real turnaround-time metric', async () => {
    const c1 = await svc.create({ type: 'pediatric', requestingUserId: 'u1', requestingUserName: 'Dr. One', facilityId: 'client-1' });
    if (c1.ok) await svc.grant(c1.data.id, 'admin-1', 'Admin Smith');
    await svc.create({ type: 'pool', requestingUserId: 'u2', requestingUserName: 'Dr. Two', poolId: 'derm' });
    const res = await svc.getAll();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toHaveLength(2);
  });

  it('resolving a real, non-existent request id returns a real error, not a silent no-op', async () => {
    const res = await svc.grant('does-not-exist', 'admin-1', 'Admin Smith');
    expect(res.ok).toBe(false);
  });

  it('a genuinely empty store returns an empty queue, never throws', async () => {
    const res = await svc.getPending();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
  });
});
