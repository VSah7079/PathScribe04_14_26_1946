// src/utils/clinicalAdmins.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct confirmation: "I would send the message to
// Admins, or create a new entity, like clinical admins as a subset."
//
// Investigated before building: the real, existing `Admin` role
// (services/roles/mockRoleService.ts) is explicitly defined as
// non-clinical — `caseAccess: false`, its own description literally
// reads "System administrator with configuration access but no
// clinical case access." The real people who ARE both admin and
// clinical (Pete Nimmo, Amber Fehrs-Battey, Bronwyn Prior in this
// app's seed data) hold `Admin` and a real clinical role
// simultaneously — they aren't a distinct role themselves.
//
// "Clinical Admin" is deliberately NOT a new, standalone Role record
// users get reassigned to (a bigger, more disruptive change to
// existing role-assignment data than the ask called for) — it's a
// real, reusable, COMPUTED concept: any user holding `Admin` alongside
// any role the real Role dictionary itself marks as having
// `caseAccess: true`. Matching against the dictionary's own flag,
// rather than hardcoding a list of clinical role-name strings, means
// this stays correct automatically if a new clinical role is ever
// added to the dictionary later.
// ─────────────────────────────────────────────────────────────────────────────
import type { StaffUser } from '../services/users/IUserService';
import type { Role } from '../services/roles/IRoleService';

/**
 * Real, computed subset — every user who holds `Admin` AND at least
 * one role the Role dictionary itself marks `caseAccess: true`. Used
 * to target case-sensitive admin notifications (e.g. a real interface
 * exception requiring a clinical judgment call, not just a system
 * fix) at people who can actually make that call, rather than every
 * `Admin` regardless of clinical standing.
 */
export function getClinicalAdmins(allUsers: StaffUser[], allRoles: Role[]): StaffUser[] {
  const clinicalRoleNames = new Set(allRoles.filter(r => r.caseAccess).map(r => r.name));
  return allUsers.filter(u =>
    u.status === 'Active' &&
    u.roles.includes('Admin') &&
    u.roles.some(roleName => clinicalRoleNames.has(roleName))
  );
}
