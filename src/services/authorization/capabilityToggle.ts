// src/services/authorization/capabilityToggle.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-355 (Batch 451, moved out of components/Config/Staff/RoleCapabilitiesTab.tsx):
// what happens when an administrator ticks or unticks capabilities on a role
// in the Role Dictionary, and how a group's checkbox shows.
//
//   - Turning capabilities on that need others the role lacks asks first
//     (offering to add them); otherwise the change applies at once.
//   - Turning capabilities off that others on the role depend on asks first
//     (warning that those go too); otherwise the change applies at once.
//   - A group's checkbox is ticked when the role holds all of the group,
//     part-ticked when it holds some; clicking it turns the whole group off
//     when all are held, otherwise on.
// The dependency plans themselves come from capabilityDependencies.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { planGrant, planRevoke } from './capabilityDependencies';

export type CapabilityGroupState = 'all' | 'some' | 'none';

/** How much of a group a role holds. */
export function capabilityGroupState(keys: readonly string[], granted: ReadonlySet<string> | readonly string[]): CapabilityGroupState {
  const have = granted instanceof Set ? granted : new Set(granted as readonly string[]);
  const n = keys.filter(k => have.has(k)).length;
  return n === 0 ? 'none' : n === keys.length ? 'all' : 'some';
}

export type CapabilityToggleOutcome =
  | { kind: 'none' }
  | { kind: 'apply'; next: string[] }
  | { kind: 'confirm'; direction: 'grant' | 'revoke'; others: string[]; next: string[] };

/** The result of turning `keys` on (`turnOn`) or off for a role holding `granted`. */
export function planCapabilityToggle(granted: readonly string[], keys: readonly string[], turnOn: boolean): CapabilityToggleOutcome {
  if (turnOn) {
    const plan = planGrant(granted, keys);
    if (plan.requested.length === 0) return { kind: 'none' };
    if (plan.missingRequirements.length === 0) return { kind: 'apply', next: plan.withRequirements };
    return { kind: 'confirm', direction: 'grant', others: plan.missingRequirements, next: plan.withRequirements };
  }
  const plan = planRevoke(granted, keys);
  if (plan.requested.length === 0) return { kind: 'none' };
  if (plan.affectedDependents.length === 0) return { kind: 'apply', next: plan.withDependents };
  return { kind: 'confirm', direction: 'revoke', others: plan.affectedDependents, next: plan.withDependents };
}

/** One capability's checkbox clicked: off if held, on if not. */
export function planCapabilityClick(granted: readonly string[], key: string): CapabilityToggleOutcome {
  return planCapabilityToggle(granted, [key], !granted.includes(key));
}

/** A group's checkbox clicked: the whole group off when all of it is held, otherwise on. */
export function planCapabilityGroupClick(granted: readonly string[], groupKeys: readonly string[]): CapabilityToggleOutcome {
  return planCapabilityToggle(granted, groupKeys, capabilityGroupState(groupKeys, granted) !== 'all');
}
