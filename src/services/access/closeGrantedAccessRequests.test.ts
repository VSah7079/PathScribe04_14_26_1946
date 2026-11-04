// @vitest-environment happy-dom
//
// src/services/access/closeGrantedAccessRequests.test.ts
// Batch 431: a request closes as granted once the access it asked for is given.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AccessRequest } from '@/types/access/AccessRequest';
import { isAccessGiven, requestsNowGranted, closeGrantedAccessRequests, type AccessFacts } from './closeGrantedAccessRequests';

vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }) },
}));

const req = (over: Partial<AccessRequest>): AccessRequest => ({
  id: 'r', type: 'orchestration', requestingUserId: '1', requestingUserName: 'Sarah Chen',
  requestedAt: '2026-10-01T00:00:00Z', status: 'pending', ...over,
});

const facts = (over: Partial<AccessFacts> = {}): AccessFacts => ({ users: [], facilities: [], pools: [], ...over });

describe('isAccessGiven', () => {
  it('orchestration: the person’s Orchestration flag', () => {
    expect(isAccessGiven(req({}), facts({ users: [{ id: '1', canViewOrchestration: true }] }))).toBe(true);
    expect(isAccessGiven(req({}), facts({ users: [{ id: '1' }] }))).toBe(false);
  });

  it('pediatric: needs BOTH the flag and the facility list', () => {
    const r = req({ type: 'pediatric', facilityId: 'c1' });
    expect(isAccessGiven(r, facts({ users: [{ id: '1', canViewPediatric: true }], facilities: [{ id: 'c1', authorizedPediatricPathologistIds: [] }] }))).toBe(false);
    expect(isAccessGiven(r, facts({ users: [{ id: '1' }], facilities: [{ id: 'c1', authorizedPediatricPathologistIds: ['1'] }] }))).toBe(false);
    expect(isAccessGiven(r, facts({ users: [{ id: '1', canViewPediatric: true }], facilities: [{ id: 'c1', authorizedPediatricPathologistIds: ['1'] }] }))).toBe(true);
  });

  it('pool: membership, matched by pool id or name', () => {
    const pools = [{ id: 'sub-gi', name: 'GI', userIds: ['1'] }];
    expect(isAccessGiven(req({ type: 'pool', poolName: 'GI' }), facts({ pools }))).toBe(true);
    expect(isAccessGiven(req({ type: 'pool', poolId: 'sub-gi' }), facts({ pools }))).toBe(true);
    expect(isAccessGiven(req({ type: 'pool', poolName: 'Breast' }), facts({ pools }))).toBe(false);
  });

  it('requestsNowGranted skips requests already closed', () => {
    const f = facts({ users: [{ id: '1', canViewOrchestration: true }] });
    expect(requestsNowGranted([req({ id: 'a' }), req({ id: 'b', status: 'denied' })], f).map(r => r.id)).toEqual(['a']);
  });
});

describe('closeGrantedAccessRequests with the app services', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });

  it('closes an Orchestration request once the admin gives the flag, recording who and when', async () => {
    const { mockAccessRequestService } = await import('./mockAccessRequestService');
    const { mockUserService } = await import('../users/mockUserService');
    const created = await mockAccessRequestService.create({ type: 'orchestration', requestingUserId: '1', requestingUserName: 'Sarah Chen', caseId: 'O26-1' });
    expect(created.ok).toBe(true);

    expect(await closeGrantedAccessRequests()).toEqual([]);   // not given yet

    // Saving the flag runs the check itself; running it again here makes the
    // test independent of that background run's timing.
    await mockUserService.update('1', { canViewOrchestration: true });
    await closeGrantedAccessRequests();
    const all = await mockAccessRequestService.getAll();
    const rec = all.ok ? all.data[0] : undefined;
    expect(rec?.status).toBe('granted');
    expect(rec?.resolvedAt).toBeTruthy();
  });
});
