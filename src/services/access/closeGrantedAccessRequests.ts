// src/services/access/closeGrantedAccessRequests.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 431: an access request is closed as granted when the access it asked
// for is actually given. Until now nothing closed a request at all, so every
// request stayed pending and the QA Access Request Response tab could not
// measure how long admins took.
//
// Admins don't "approve a request"; they give the access where it lives:
//   • pool:          add the person to the pool (Configuration → Subspecialties)
//   • pediatric:     the person's Pediatric flag AND the submitting facility's
//                    authorized pediatric pathologists list (both needed, the
//                    same two-part rule the worklist enforces)
//   • orchestration: the person's Orchestration flag (staff record)
// So after each of those saves (users, facilities, subspecialties services),
// this checks the open requests and closes the ones now satisfied, recording
// who gave the access and when.
//
// The decision is pure (requestsNowGranted, tested); the runner loads the data.
// ─────────────────────────────────────────────────────────────────────────────

import type { AccessRequest } from '@/types/access/AccessRequest';

export interface AccessFacts {
  users: ReadonlyArray<{ id: string; canViewPediatric?: boolean; canViewOrchestration?: boolean }>;
  facilities: ReadonlyArray<{ id: string; authorizedPediatricPathologistIds?: string[] }>;
  pools: ReadonlyArray<{ id: string; name: string; userIds?: string[] }>;
}

/** Whether the access a request asked for has now been given (pure). */
export function isAccessGiven(r: AccessRequest, facts: AccessFacts): boolean {
  const user = facts.users.find(u => u.id === r.requestingUserId);
  switch (r.type) {
    case 'orchestration':
      return user?.canViewOrchestration === true;
    case 'pediatric': {
      if (user?.canViewPediatric !== true) return false;
      if (!r.facilityId) return true;
      const facility = facts.facilities.find(f => f.id === r.facilityId);
      return !!facility?.authorizedPediatricPathologistIds?.includes(r.requestingUserId);
    }
    case 'pool': {
      const key = r.poolId ?? r.poolName;
      const pool = facts.pools.find(p => p.id === key || p.name === key);
      return !!pool?.userIds?.includes(r.requestingUserId);
    }
    default:
      return false;
  }
}

/** The pending requests whose access has now been given (pure). */
export function requestsNowGranted(requests: readonly AccessRequest[], facts: AccessFacts): AccessRequest[] {
  return requests.filter(r => r.status === 'pending' && isAccessGiven(r, facts));
}

/** Closes every pending request whose access has been given; returns the ids closed. */
export async function closeGrantedAccessRequests(): Promise<string[]> {
  const [{ mockAccessRequestService }, { mockUserService }, { mockFacilityService }, { subspecialtyServiceUnchecked }, { getSessionUser }] = await Promise.all([
    import('./mockAccessRequestService'),
    import('../users/mockUserService'),
    import('../facilities/mockFacilityService'),
    import('../subspecialties/mockSubspecialtyService'),
    import('../auth/caseAccessControl'),
  ]);
  const pending = await mockAccessRequestService.getPending();
  if (!pending.ok || pending.data.length === 0) return [];
  const [users, facilities, pools] = await Promise.all([
    mockUserService.getAll(), mockFacilityService.getAll(), subspecialtyServiceUnchecked.getAll(),
  ]);
  const facts: AccessFacts = {
    users: users.ok ? users.data : [],
    facilities: facilities.ok ? facilities.data : [],
    pools: pools.ok ? pools.data : [],
  };
  const admin = getSessionUser();
  const adminId = admin?.id ?? 'system';
  const adminName = admin ? [admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.id : 'System';
  const closed: string[] = [];
  for (const r of requestsNowGranted(pending.data, facts)) {
    const res = await mockAccessRequestService.grant(r.id, adminId, adminName);
    if (res.ok) closed.push(r.id);
  }
  return closed;
}

/** Runs the check after a save, without holding the save up or failing it. */
export function afterAccessMayHaveChanged(): void {
  void closeGrantedAccessRequests().catch(() => { /* checked again after the next change */ });
}
