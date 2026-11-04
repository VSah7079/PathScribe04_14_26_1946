// src/services/participationTypes/cytotechParticipationRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 441 (Pete, Oct 2): "Cytotechs can not be selected for Pathologist
// roles."
//
// Staff whose only clinical role is Cytotechnologist (no Pathologist,
// Resident or Fellow role alongside it) may hold only non-pathologist
// participation types on a case — never primary, co-signer, resident, frozen
// section, second opinion, consultant or provisional hire, nor any type that
// can finalize. This holds whatever the Role Dictionary lists for the role,
// so a configuration slip can't make a cytotech a case's pathologist.
//
// Used by the Case Team save, delegation, pool claims and the Role
// Dictionary save. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { SYSTEM_ROLE_IDS } from '../roles/systemRoles';

/** The participation types that make someone a pathologist on the case. */
export const PATHOLOGIST_PARTICIPATION_TYPE_IDS: ReadonlySet<string> = new Set([
  'primary', 'attending', 'resident', 'frozen', 'second_opinion', 'consultant', 'provisional_hire',
]);

/** The type a cytotechnologist holds on a case. */
export const CYTOTECHNOLOGIST_PARTICIPATION_TYPE_ID = 'cytotechnologist';

/** Built-in roles on the pathologist track (a person holding one may hold pathologist types). */
const PATHOLOGIST_TRACK_ROLE_IDS: ReadonlySet<string> = new Set(['pathologist', 'resident', 'fellow']);

interface RoleRef { id: string; name: string }
interface TypeRef { id: string; canFinalize?: boolean }

/** A participation type that makes its holder a pathologist on the case (a custom type that can finalize counts too). */
export function isPathologistParticipationType(typeId: string, types?: readonly TypeRef[]): boolean {
  if (PATHOLOGIST_PARTICIPATION_TYPE_IDS.has(typeId)) return true;
  return types?.find(t => t.id === typeId)?.canFinalize === true;
}

function roleIdsOf(staffRoleNames: readonly string[] | undefined, roles: readonly RoleRef[]): Set<string> {
  const names = new Set((staffRoleNames ?? []).map(n => n.trim().toLowerCase()));
  return new Set(roles.filter(r => names.has(r.name.trim().toLowerCase())).map(r => r.id));
}

/** Holds the Cytotechnologist role and no pathologist-track role. */
export function isCytotechOnly(staffRoleNames: readonly string[] | undefined, roles: readonly RoleRef[]): boolean {
  const ids = roleIdsOf(staffRoleNames, roles);
  if (!ids.has(SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST)) return false;
  return ![...ids].some(id => PATHOLOGIST_TRACK_ROLE_IDS.has(id));
}

/** Whether this staff member may hold this participation type, as far as the cytotech rule goes. */
export function mayHoldParticipationType(
  staffRoleNames: readonly string[] | undefined, roles: readonly RoleRef[], typeId: string, types?: readonly TypeRef[],
): boolean {
  return !(isCytotechOnly(staffRoleNames, roles) && isPathologistParticipationType(typeId, types));
}

/** Whether a role may list this participation type: the built-in Cytotechnologist may not list a pathologist type. */
export function roleMayListParticipationType(roleId: string | undefined, type: TypeRef): boolean {
  return !(roleId === SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST && isPathologistParticipationType(type.id, [type]));
}

/** A role whose participation types include a pathologist type, when the role is the built-in Cytotechnologist. */
export function cytotechRoleProblem(role: { id: string; participationTypeIds?: readonly string[] }, types?: readonly TypeRef[]): string[] {
  if (role.id !== SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST) return [];
  return (role.participationTypeIds ?? []).filter(id => isPathologistParticipationType(id, types));
}

export interface ParticipantRef { staffId: string; staffName: string; participationTypeIds: string[]; status: 'active' | 'removed' }
export interface StaffRef { id: string; roles: string[] }

/** The first active participant who is a cytotech-only staff member holding a pathologist type, if any. */
export function cytotechInPathologistSlot(
  participants: readonly ParticipantRef[], staff: readonly StaffRef[], roles: readonly RoleRef[], types?: readonly TypeRef[],
): { staffId: string; staffName: string; typeId: string } | null {
  const byId = new Map(staff.map(s => [s.id, s]));
  for (const p of participants) {
    if (p.status !== 'active') continue;
    const s = byId.get(p.staffId);
    if (!s) continue;
    const bad = p.participationTypeIds.find(t => !mayHoldParticipationType(s.roles, roles, t, types));
    if (bad) return { staffId: p.staffId, staffName: p.staffName, typeId: bad };
  }
  return null;
}
