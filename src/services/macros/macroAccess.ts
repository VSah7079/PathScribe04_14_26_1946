// src/services/macros/macroAccess.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 349 (PS-126, Pete: "Admins should see all macros and they should be
// sorted by Type (Enterprise, then the various users). Users with the
// permission to create an Enterprise Macro will see that option…").
//
//   Batch 663 (Pete): access follows the capability config:macros:manage, not a role name. The screen asks
//   useCapabilities().has('config:macros:manage') and passes the answer (`canManageAll`) to these functions.
//   canManageAll   see every macro, including other users' personal ones, and create or change Enterprise macros.
//   macroTiersFor(canManageAll)   the visibility choices offered when creating or editing: Enterprise only with it.
//   groupAllMacros(...)        the administrator's "All" list: Enterprise
//                              first, then each facility by name, then each
//                              user's personal macros by the user's name;
//                              macros sorted by name within each group.
// Pure; MacroPanel.tsx renders the result.
// ─────────────────────────────────────────────────────────────────────────────

import type { Macro } from './IMacroService';

export type MacroTier = 'enterprise' | 'facility' | 'personal';

/** The capability that lets a person see and change every macro, Enterprise included. */
export const MACRO_MANAGE_CAPABILITY = 'config:macros:manage';

export function macroTiersFor(canManageAll: boolean): MacroTier[] {
  return canManageAll ? ['enterprise', 'facility', 'personal'] : ['facility', 'personal'];
}

export function macroTierOf(m: Pick<Macro, 'ownerUserId' | 'performingLabFacilityId'>): MacroTier {
  return m.ownerUserId ? 'personal' : m.performingLabFacilityId ? 'facility' : 'enterprise';
}

/** Whether this user may change (or delete) this macro. */
export function canEditMacro(m: Pick<Macro, 'ownerUserId' | 'performingLabFacilityId'>, userId: string, canManageAll: boolean): boolean {
  if (canManageAll) return true;
  const tier = macroTierOf(m);
  if (tier === 'enterprise') return false;
  if (tier === 'personal') return m.ownerUserId === userId;
  return true; // facility macros: as before, anyone with access to this screen
}

/**
 * Batch 428: whether a macro change is the person's own business or needs
 * config:macros:manage. A personal macro is its owner's to change; anything
 * touching a shared (enterprise or facility) macro, or someone else's
 * personal one, needs the capability. `before` is the stored macro (absent
 * for a new one), `after` the result of the change.
 */
export function macroChangeNeedsCapability(
  before: Pick<Macro, 'ownerUserId' | 'performingLabFacilityId'> | undefined,
  after: Pick<Macro, 'ownerUserId' | 'performingLabFacilityId'>,
  userId: string | undefined,
): boolean {
  const ownOnly = (m: Pick<Macro, 'ownerUserId' | 'performingLabFacilityId'>) =>
    macroTierOf(m) === 'personal' && !!userId && m.ownerUserId === userId;
  return !((before ? ownOnly(before) : true) && ownOnly(after));
}

export interface MacroGroup {
  tier: MacroTier;
  /** Facility id or owner user id; '' for Enterprise. */
  key: string;
  /** Facility or user name (data, not translated); '' for Enterprise. */
  label: string;
  macros: Macro[];
}

export function groupAllMacros(
  macros: readonly Macro[],
  facilityName: (id: string) => string | undefined,
  userName: (id: string) => string | undefined,
): MacroGroup[] {
  const byName = (a: Macro, b: Macro) => a.name.localeCompare(b.name);
  const groups = new Map<string, MacroGroup>();
  for (const m of macros) {
    const tier = macroTierOf(m);
    const key = tier === 'personal' ? m.ownerUserId! : tier === 'facility' ? m.performingLabFacilityId! : '';
    const id = `${tier}:${key}`;
    if (!groups.has(id)) {
      const label = tier === 'personal' ? (userName(key) ?? key) : tier === 'facility' ? (facilityName(key) ?? key) : '';
      groups.set(id, { tier, key, label, macros: [] });
    }
    groups.get(id)!.macros.push(m);
  }
  const order: Record<MacroTier, number> = { enterprise: 0, facility: 1, personal: 2 };
  return [...groups.values()]
    .map(g => ({ ...g, macros: [...g.macros].sort(byName) }))
    .sort((a, b) => order[a.tier] - order[b.tier] || a.label.localeCompare(b.label));
}
