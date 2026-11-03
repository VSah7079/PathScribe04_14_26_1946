// src/services/roles/actionSeeds.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batches 600-601: how the 145 commands added to the roles list reach roles a site has
// already stored.
//
// A site that already has its roles saved would never see new default grants, because stored
// roles win over the built-in seed. So each built-in role is offered the new commands once
// (Role.seededActions remembers which), exactly as built-in roles are offered new capabilities
// (services/authorization/capabilitySeeds.ts):
//   • a command added later reaches the built-in roles on their next load;
//   • a command an administrator removed from a built-in role stays removed;
//   • a hospital's own roles (including copies of a built-in role) are never touched.
// What each role starts with is in constants/defaultActionGrants.ts.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────
import { ACTION_GROUPS, type PermissionSet, type ActionId } from '@/constants/systemActions';
import { DEFAULT_ACTION_GRANTS } from '@/constants/defaultActionGrants';

/** Built-in role id → the key of its default grants. */
const GRANT_KEY_BY_ROLE_ID: Readonly<Record<string, string>> = {
  pathologist: 'Pathologist',
  resident: 'Resident',
  fellow: 'Fellow',
  pa: 'Pathologists Assistant',
  admin: 'Admin',
  'lab-director': 'Lab Director',
  accessioner: 'Accessioner',
  histotechnologist: 'Histotechnologist',
  cytotechnologist: 'Cytotechnologist',
  'molecular-technologist': 'Molecular Technologist',
  'qa-reviewer': 'QA Reviewer',
};

const SEEDED_GROUPS = [
  'report_flow', 'case_flow', 'orders_print', 'intraop', 'cytology', 'workstations', 'dispatch', // Batch 600
  'view_app', 'view_worklist', 'view_search', 'view_contribution', 'view_report', 'view_cytology', // Batch 601
];
/** Every command in the Batch 600-601 groups. */
export const SEEDED_ACTION_IDS: readonly ActionId[] = ACTION_GROUPS.filter(g => SEEDED_GROUPS.includes(g.id)).flatMap(g => g.actions.map(a => a.id));
/** Batch 763 (Pete, Nov 2, 2026, standing rule: "add new actions to super user role"): Superadmin is offered every command in
 *  the Action list, so a command added in any later batch reaches a stored Superadmin role on its next load. It used to be
 *  offered the Batch 600-601 groups only, so later groups (Lockbox, Grossing bench, Requisition Inbox...) never reached it. */
export const ALL_ACTION_IDS: readonly ActionId[] = ACTION_GROUPS.flatMap(g => g.actions.map(a => a.id));

/** The commands a built-in role is offered. */
export function actionSeedFor(roleId: string): readonly ActionId[] {
  if (roleId === 'superadmin') return ALL_ACTION_IDS;
  const key = GRANT_KEY_BY_ROLE_ID[roleId];
  return key ? (DEFAULT_ACTION_GRANTS[key] ?? []) : [];
}

export interface ActionSeedableRole {
  id: string;
  builtIn?: boolean;
  permissions: PermissionSet;
  seededActions?: string[];
}

/** Offers each built-in role the commands it hasn't been offered yet. */
export function applyActionSeeds<R extends ActionSeedableRole>(roles: readonly R[]): { roles: R[]; changed: boolean } {
  let changed = false;
  const out = roles.map(r => {
    if (!r.builtIn) return r;
    const seed = actionSeedFor(r.id);
    const offered = new Set(r.seededActions ?? []);
    const fresh = seed.filter(id => !offered.has(id));
    if (fresh.length === 0) return r;
    changed = true;
    const permissions: PermissionSet = { ...r.permissions };
    fresh.forEach(id => { permissions[id] = true; });
    return { ...r, permissions, seededActions: [...offered, ...fresh] };
  });
  return { roles: out, changed };
}
