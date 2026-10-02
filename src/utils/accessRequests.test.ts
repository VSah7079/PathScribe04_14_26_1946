// src/utils/accessRequests.test.ts
// Batch 431: every access request is saved as a record (once while pending)
// before the admins are messaged; the badges read the person's pending ones.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AccessRequest } from '@/types/access/AccessRequest';

const records: AccessRequest[] = [];
const sent: unknown[] = [];

vi.mock('@/services', () => ({
  accessRequestService: {
    getAllForUser: vi.fn(async (userId: string) => ({ ok: true, data: records.filter(r => r.requestingUserId === userId) })),
    create: vi.fn(async (req: Omit<AccessRequest, 'id' | 'status' | 'requestedAt'>) => {
      const rec = { ...req, id: `ar-${records.length + 1}`, status: 'pending', requestedAt: '2026-10-01T00:00:00Z' } as AccessRequest;
      records.push(rec);
      return { ok: true, data: rec };
    }),
  },
  userService: {
    getAll: vi.fn(async () => ({ ok: true, data: [
      { id: '3', firstName: 'Pete', lastName: 'Nimmo', status: 'Active', roles: ['Admin'], organisationId: 'org-1' },
    ] })),
  },
  messageService: { send: vi.fn(async (m: unknown) => { sent.push(m); return { ok: true }; }) },
}));

import { sendAccessRequestToAdmins, pendingAccessRequestsFor, isSameAccessRequest } from './accessRequests';

const requester = { id: '1', name: 'Sarah Chen', organisationId: 'org-1' };

describe('access requests are recorded (Batch 431)', () => {
  beforeEach(() => { records.length = 0; sent.length = 0; });

  it('saves a record and messages the admins', async () => {
    await sendAccessRequestToAdmins(requester, 'Pool Access Request', 'body', '/configuration', { type: 'pool', caseId: 'S26-1', poolName: 'GI' });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ type: 'pool', poolName: 'GI', requestingUserId: '1', requestingUserName: 'Sarah Chen', organisationId: 'org-1', status: 'pending' });
    expect(sent).toHaveLength(1);
  });

  it('does not save a second pending record for the same pool, even from another case', async () => {
    await sendAccessRequestToAdmins(requester, 's', 'b', '/c', { type: 'pool', caseId: 'S26-1', poolName: 'GI' });
    await sendAccessRequestToAdmins(requester, 's', 'b', '/c', { type: 'pool', caseId: 'S26-2', poolName: 'GI' });
    expect(records).toHaveLength(1);
  });

  it('pediatric and Orchestration requests are per case', async () => {
    await sendAccessRequestToAdmins(requester, 's', 'b', '/c', { type: 'pediatric', caseId: 'S26-1' });
    await sendAccessRequestToAdmins(requester, 's', 'b', '/c', { type: 'pediatric', caseId: 'S26-2' });
    await sendAccessRequestToAdmins(requester, 's', 'b', '/c', { type: 'orchestration', caseId: 'S26-1' });
    expect(records.map(r => `${r.type}:${r.caseId}`)).toEqual(['pediatric:S26-1', 'pediatric:S26-2', 'orchestration:S26-1']);
  });

  it('pendingAccessRequestsFor returns only the person’s pending requests', async () => {
    await sendAccessRequestToAdmins(requester, 's', 'b', '/c', { type: 'pediatric', caseId: 'S26-1' });
    records.push({ ...records[0], id: 'old', status: 'granted' });
    records.push({ ...records[0], id: 'other', requestingUserId: '2' });
    expect((await pendingAccessRequestsFor('1')).map(r => r.id)).toEqual(['ar-1']);
  });

  it('isSameAccessRequest ignores resolved requests', () => {
    const r = { id: 'x', type: 'pediatric', caseId: 'S26-1', status: 'denied' } as AccessRequest;
    expect(isSameAccessRequest(r, { type: 'pediatric', caseId: 'S26-1' })).toBe(false);
  });
});
