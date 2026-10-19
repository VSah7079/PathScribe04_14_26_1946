import { describe, it, expect } from 'vitest';
import { casesVisibleToRecipient, sessionUserForStaff } from './recipientAccess';
import type { Role } from '../roles/IRoleService';
import type { StaffUser } from '../users/IUserService';
import type { Facility } from '../facilities/IFacilityService';
import type { CaseAccessSubspecialty } from '../auth/caseAccessControl';

// Batch 613: a recipient's share of a scheduled report is the owner's cases filtered by the recipient's own access.
const roles = [
  { id: 'path', name: 'Pathologist', caseAccess: true, configAccess: false },
  { id: 'adm', name: 'Administrator', caseAccess: false, configAccess: true },
  { id: 'phys', name: 'Physician', caseAccess: false, configAccess: false },
] as unknown as Role[];
const staff = (id: string, over: Record<string, unknown> = {}) =>
  ({ id, firstName: 'A', lastName: 'B', email: `${id}@x`, roles: ['Pathologist'], organisationId: 'HOSP-1', ...over }) as unknown as StaffUser;
const facilities = [
  { id: 'f1', isEnterprise: true, legacyTenantIds: ['HOSP-1'] },
  { id: 'f2', isEnterprise: true, legacyTenantIds: ['HOSP-2'] },
] as unknown as Facility[];
const cases = [
  { id: 'c1', originHospitalId: 'HOSP-1', subspecialtyId: null },
  { id: 'c2', originHospitalId: 'HOSP-1', subspecialtyId: 'breast' },
  { id: 'c3', originHospitalId: 'HOSP-2', subspecialtyId: null },
];
const pools = new Map<string, CaseAccessSubspecialty>([
  ['breast', { id: 'breast', userIds: ['member'], isWorkgroup: true, isWorkgroupEnabled: true }],
]);
const idsFor = (s: StaffUser) => casesVisibleToRecipient(sessionUserForStaff(s, roles), cases, pools, facilities).map(c => c.id);

describe('recipient access for scheduled reports (Batch 613)', () => {
  it('a recipient sees the owner\'s cases from their own organisation, and a pool case only as a member', () => {
    expect(idsFor(staff('member'))).toEqual(['c1', 'c2']);
    expect(idsFor(staff('outsider'))).toEqual(['c1']);
  });

  it('a recipient from another organisation does not see this organisation\'s cases', () => {
    expect(idsFor(staff('far', { organisationId: 'HOSP-2' }))).toEqual(['c3']);
  });

  it('a recipient with no organisation, or whose roles give no app access, sees nothing', () => {
    expect(idsFor(staff('nobody', { organisationId: undefined }))).toEqual([]);
    expect(sessionUserForStaff(staff('doc', { roles: ['Physician'] }), roles)).toBeNull();
    expect(idsFor(staff('doc', { roles: ['Physician'] }))).toEqual([]);
  });

  it('never grants platform support from a hospital\'s own staff directory', () => {
    expect(sessionUserForStaff(staff('x', { roles: ['Superadmin'] }), roles)).toBeNull();
  });
});
