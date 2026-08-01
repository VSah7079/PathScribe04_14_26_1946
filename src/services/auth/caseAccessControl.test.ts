// src/services/auth/caseAccessControl.test.ts
import { describe, it, expect } from 'vitest';
import { resolveCaseAccess, canFinalizeCase, deriveEligibleFinalizerIds, type SessionUser, type CaseAccessSubspecialty, type CaseFinalizeParticipant } from './caseAccessControl';

const ORG_A = 'ORG-DVMC'; // real seeded org id, resolvable via getOrganisationByHospitalId
const HOSP_A = 'HOSP-001'; // its real seeded originHospitalId

function session(overrides: Partial<SessionUser> = {}): SessionUser {
  return { id: 'user-1', role: 'pathologist', organisationId: ORG_A, ...overrides };
}

describe('resolveCaseAccess — dimension 1 (tenant) unchanged from canAccessCase', () => {
  it('denies with no session', () => {
    const result = resolveCaseAccess(null, { originHospitalId: HOSP_A });
    expect(result.granted).toBe(false);
    if (!result.granted) expect(result.dimension).toBe('no-session');
  });

  it('denies with no case record', () => {
    const result = resolveCaseAccess(session(), null);
    expect(result.granted).toBe(false);
    if (!result.granted) expect(result.dimension).toBe('no-case');
  });

  it('grants superadmin regardless of organisation', () => {
    const result = resolveCaseAccess(session({ role: 'superadmin', organisationId: undefined }), { originHospitalId: HOSP_A });
    expect(result.granted).toBe(true);
    if (result.granted) expect(result.dimension).toBe('superadmin');
  });

  it('denies a session with no organisationId resolved', () => {
    const result = resolveCaseAccess(session({ organisationId: undefined }), { originHospitalId: HOSP_A });
    expect(result.granted).toBe(false);
    if (!result.granted) expect(result.dimension).toBe('no-org');
  });

  it('denies a case whose organisation does not match the session', () => {
    const result = resolveCaseAccess(session({ organisationId: 'ORG-SOME-OTHER' }), { originHospitalId: HOSP_A });
    expect(result.granted).toBe(false);
    if (!result.granted) expect(result.dimension).toBe('tenant-mismatch');
  });

  it('grants a case in the same organisation, no subspecialty involved', () => {
    const result = resolveCaseAccess(session(), { originHospitalId: HOSP_A });
    expect(result.granted).toBe(true);
    if (result.granted) expect(result.dimension).toBe('pool-open');
  });
});

describe('resolveCaseAccess — dimension 3 (pool/subspecialty), the real new enforcement', () => {
  const restrictedSub: CaseAccessSubspecialty = { id: 'derm', userIds: ['member-1', 'member-2'], isWorkgroup: true, isWorkgroupEnabled: true };
  const disabledSub: CaseAccessSubspecialty = { id: 'derm', userIds: ['member-1'], isWorkgroup: true, isWorkgroupEnabled: false };
  const nonWorkgroupSub: CaseAccessSubspecialty = { id: 'gi', userIds: [], isWorkgroup: false, isWorkgroupEnabled: false };

  it('a non-member is denied when the pool has workgroup enforcement enabled', () => {
    const result = resolveCaseAccess(session({ id: 'outsider' }), { originHospitalId: HOSP_A, subspecialtyId: 'derm' }, restrictedSub);
    expect(result.granted).toBe(false);
    if (!result.granted) expect(result.dimension).toBe('pool-restricted');
  });

  it('a real member is granted access to an enforced pool', () => {
    const result = resolveCaseAccess(session({ id: 'member-1' }), { originHospitalId: HOSP_A, subspecialtyId: 'derm' }, restrictedSub);
    expect(result.granted).toBe(true);
    if (result.granted) expect(result.dimension).toBe('pool-member');
  });

  it('the real safety property: isWorkgroupEnabled=false means NO restriction, matching every currently seeded subspecialty — a non-member still gets access', () => {
    const result = resolveCaseAccess(session({ id: 'outsider' }), { originHospitalId: HOSP_A, subspecialtyId: 'derm' }, disabledSub);
    expect(result.granted).toBe(true);
    if (result.granted) expect(result.dimension).toBe('pool-open');
  });

  it('a standard (non-workgroup) subspecialty never restricts, regardless of membership', () => {
    const result = resolveCaseAccess(session({ id: 'outsider' }), { originHospitalId: HOSP_A, subspecialtyId: 'gi' }, nonWorkgroupSub);
    expect(result.granted).toBe(true);
  });

  it('superadmin bypasses pool restriction too', () => {
    const result = resolveCaseAccess(session({ role: 'superadmin' }), { originHospitalId: HOSP_A, subspecialtyId: 'derm' }, restrictedSub);
    expect(result.granted).toBe(true);
    if (result.granted) expect(result.dimension).toBe('superadmin');
  });

  it('tenant boundary is still checked BEFORE pool membership — wrong org, right pool member, still denied', () => {
    const result = resolveCaseAccess(session({ id: 'member-1', organisationId: 'ORG-SOME-OTHER' }), { originHospitalId: HOSP_A, subspecialtyId: 'derm' }, restrictedSub);
    expect(result.granted).toBe(false);
    if (!result.granted) expect(result.dimension).toBe('tenant-mismatch');
  });
});

describe('canFinalizeCase — dimension 4 (case relationship) as a real write guard', () => {
  const primary: CaseFinalizeParticipant = { staffId: 'primary-1', status: 'active', participationTypeIds: ['primary'] };
  const attending: CaseFinalizeParticipant = { staffId: 'attending-1', status: 'active', participationTypeIds: ['attending'] };
  const resident: CaseFinalizeParticipant = { staffId: 'resident-1', status: 'active', participationTypeIds: ['resident'] };
  const removedPrimary: CaseFinalizeParticipant = { staffId: 'was-primary', status: 'removed', participationTypeIds: ['primary'] };

  it('denies with no session', () => {
    const result = canFinalizeCase(null, [primary]);
    expect(result.granted).toBe(false);
  });

  it('grants the assigned primary', () => {
    const result = canFinalizeCase(session({ id: 'primary-1' }), [primary, resident]);
    expect(result.granted).toBe(true);
    if (result.granted) expect(result.dimension).toBe('assigned-participant');
  });

  it('grants the assigned attending', () => {
    const result = canFinalizeCase(session({ id: 'attending-1' }), [attending]);
    expect(result.granted).toBe(true);
  });

  it('denies a resident who is on the case but not primary/attending — the real gap this closes', () => {
    const result = canFinalizeCase(session({ id: 'resident-1' }), [resident]);
    expect(result.granted).toBe(false);
    if (!result.granted) expect(result.dimension).toBe('not-a-participant');
  });

  it('denies someone with no relationship to the case at all, even though they could VIEW it via resolveCaseAccess', () => {
    const result = canFinalizeCase(session({ id: 'random-viewer' }), [primary]);
    expect(result.granted).toBe(false);
  });

  it('denies a REMOVED primary — status must be active, not just a historical participation record', () => {
    const result = canFinalizeCase(session({ id: 'was-primary' }), [removedPrimary]);
    expect(result.granted).toBe(false);
  });

  it('grants an admin/pathologist-admin/superadmin regardless of case participation — the real supervisor override', () => {
    for (const role of ['admin', 'pathologist-admin', 'superadmin'] as const) {
      const result = canFinalizeCase(session({ id: 'someone-else', role }), [primary]);
      expect(result.granted).toBe(true);
      if (result.granted) expect(result.dimension).toBe('admin-override');
    }
  });

  it('denies a plain pathologist with no participant record at all (empty/undefined participants)', () => {
    expect(canFinalizeCase(session({ id: 'nobody' }), []).granted).toBe(false);
    expect(canFinalizeCase(session({ id: 'nobody' }), undefined).granted).toBe(false);
  });
});

describe('deriveEligibleFinalizerIds — the real denormalization dimension 4 server-side enforcement depends on', () => {
  it('includes an active primary participant', () => {
    const ids = deriveEligibleFinalizerIds([
      { staffId: 'primary-1', status: 'active', participationTypeIds: ['primary'] },
    ]);
    expect(ids).toContain('primary-1');
  });

  it('includes an active attending participant', () => {
    const ids = deriveEligibleFinalizerIds([
      { staffId: 'attending-1', status: 'active', participationTypeIds: ['attending'] },
    ]);
    expect(ids).toContain('attending-1');
  });

  it('excludes a resident — same eligibility rule as canFinalizeCase, not a separate definition that could drift', () => {
    const ids = deriveEligibleFinalizerIds([
      { staffId: 'resident-1', status: 'active', participationTypeIds: ['resident'] },
    ]);
    expect(ids).not.toContain('resident-1');
  });

  it('excludes a REMOVED primary — a stale historical record must not remain eligible', () => {
    const ids = deriveEligibleFinalizerIds([
      { staffId: 'was-primary', status: 'removed', participationTypeIds: ['primary'] },
    ]);
    expect(ids).not.toContain('was-primary');
  });

  it('handles null/undefined participants without throwing, returning an empty array', () => {
    expect(deriveEligibleFinalizerIds(null)).toEqual([]);
    expect(deriveEligibleFinalizerIds(undefined)).toEqual([]);
  });

  it('a participant with multiple roles including one eligible one is still included', () => {
    const ids = deriveEligibleFinalizerIds([
      { staffId: 'multi-1', status: 'active', participationTypeIds: ['resident', 'attending'] },
    ]);
    expect(ids).toContain('multi-1');
  });

  it('real, end-to-end agreement: canFinalizeCase grants exactly the people deriveEligibleFinalizerIds includes', () => {
    const participants: CaseFinalizeParticipant[] = [
      { staffId: 'primary-1', status: 'active', participationTypeIds: ['primary'] },
      { staffId: 'resident-1', status: 'active', participationTypeIds: ['resident'] },
      { staffId: 'was-attending', status: 'removed', participationTypeIds: ['attending'] },
    ];
    const eligibleIds = deriveEligibleFinalizerIds(participants);
    for (const p of participants) {
      const decision = canFinalizeCase(session({ id: p.staffId }), participants);
      expect(decision.granted).toBe(eligibleIds.includes(p.staffId));
    }
  });
});
