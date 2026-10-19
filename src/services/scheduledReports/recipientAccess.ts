// src/services/scheduledReports/recipientAccess.ts
// ─────────────────────────────────────────────────
// Batch 613: what a schedule's recipient may see, worked out with the same access rules search uses
// (caseAccessControl.ts). The report is built as its owner sees it; a recipient's share of it is
// the owner's cases filtered by the recipient's own access, never the other way round, so the owner
// learns nothing about cases they cannot see. Pure. The API server applies the same rules in SQL.
// ─────────────────────────────────────────────────
import type { Role } from '../roles/IRoleService';
import type { StaffUser } from '../users/IUserService';
import { deriveSessionRole } from '../auth/sessionRole';
import { staffSessionFields } from '../auth/sessionProfile';
import { filterAccessibleCasesWithPools, type CaseAccessSubspecialty, type SessionUser } from '../auth/caseAccessControl';
import type { Facility } from '../facilities/IFacilityService';

/**
 * The session a recipient would have: the app role their staff roles give, and the staff-record flags that widen
 * access. Null when their roles give no app access (a directory entry): that person may see no cases.
 */
export function sessionUserForStaff(staff: StaffUser, catalogue: readonly Role[]): SessionUser | null {
  const role = deriveSessionRole(staff.roles, catalogue);
  if (!role) return null;
  const f = staffSessionFields(staff);
  return {
    id: staff.id, role, organisationId: f.organisationId, canAccessCrossTenantQa: f.canAccessCrossTenantQa,
    canViewPediatric: f.canViewPediatric, canViewOrchestration: f.canViewOrchestration, firstName: f.firstName, lastName: f.lastName,
  };
}

/** The part of these cases (the owner's) that the recipient may see. */
export function casesVisibleToRecipient<T extends { originHospitalId?: string | null; subspecialtyId?: string | null }>(
  recipient: SessionUser | null,
  ownerCases: readonly T[],
  subspecialtiesById: Map<string, CaseAccessSubspecialty>,
  enterpriseFacilities: Facility[],
): T[] {
  if (!recipient) return [];
  return filterAccessibleCasesWithPools(recipient, [...ownerCases], subspecialtiesById, enterpriseFacilities);
}
