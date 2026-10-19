// src/services/coding/codeSystemPolicy.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 594: which code systems a jurisdiction uses, and when. Each rule has a
// role ('off', 'optional', 'required') and an optional start date, so moving a
// region from ICD-10 to ICD-11 is a change of data: ICD-11 off, then optional,
// then required from a date, while ICD-10 stays required until it is not.
// Nothing here is a regulatory claim: the defaults below ask for nothing, and
// real requirements are set by an administrator (Planned, see KNOWN_GAPS.md).
// Pure: today's date is passed in.
// ─────────────────────────────────────────────────────────────────────────────
import type { Jurisdiction } from '@/types/systemConfig';
import type { CodedEntry, CodeSystemId } from './codedEntry';
import { KNOWN_CODE_SYSTEMS } from './codedEntry';

export type CodeSystemRole = 'off' | 'optional' | 'required';

export interface CodeSystemRule {
  system: CodeSystemId;
  role: CodeSystemRole;
  /** ISO date (YYYY-MM-DD). The rule applies from this day; before it the system is 'off'. Omitted: applies now. */
  from?: string;
}

export interface CodeSystemPolicy {
  rules: CodeSystemRule[];
}

/** The role a system has on a given day (the latest rule that has started wins; no rule: off). */
export function roleOn(policy: CodeSystemPolicy, system: CodeSystemId, today: string): CodeSystemRole {
  const started = policy.rules
    .filter(r => r.system === system && (!r.from || r.from <= today))
    .sort((a, b) => (a.from ?? '').localeCompare(b.from ?? ''));
  return started.length ? started[started.length - 1].role : 'off';
}

/** Systems that may be used on this day, in the order the rules list them. */
export function activeSystems(policy: CodeSystemPolicy, today: string): CodeSystemId[] {
  const seen: CodeSystemId[] = [];
  for (const r of policy.rules) if (!seen.includes(r.system)) seen.push(r.system);
  return seen.filter(s => roleOn(policy, s, today) !== 'off');
}

export function requiredSystems(policy: CodeSystemPolicy, today: string): CodeSystemId[] {
  return activeSystems(policy, today).filter(s => roleOn(policy, s, today) === 'required');
}

/** Required systems with no code among the entries. */
export function missingRequiredSystems(entries: readonly CodedEntry[], policy: CodeSystemPolicy, today: string): CodeSystemId[] {
  return requiredSystems(policy, today).filter(s => !entries.some(e => e.system === s && e.code.trim() !== ''));
}

/** Entries in a system the policy does not allow today (for example ICD-11 before it is switched on). */
export function entriesOutsidePolicy(entries: readonly CodedEntry[], policy: CodeSystemPolicy, today: string): CodedEntry[] {
  return entries.filter(e => roleOn(policy, e.system, today) === 'off');
}

/**
 * What a jurisdiction starts with: every known system optional except ICD-11,
 * which is off. Matches today's behaviour (ICD-11 is switched off in the
 * Terminology Services settings). The jurisdiction does not change the default
 * yet; it is a parameter so a per-jurisdiction setting can replace this later.
 */
export function defaultCodePolicy(_jurisdiction?: Jurisdiction): CodeSystemPolicy {
  return { rules: KNOWN_CODE_SYSTEMS.map(system => ({ system, role: system === 'ICD11' ? 'off' as const : 'optional' as const })) };
}

export interface CodeSystemStatus {
  system: CodeSystemId;
  /** The role today. */
  role: CodeSystemRole;
  /** The next change after today, if any rule starts later. */
  next?: { role: CodeSystemRole; from: string };
}

/** Each system in the policy: its role today and its next scheduled change (pure; for the Code Systems screen). */
export function policyStatuses(policy: CodeSystemPolicy, today: string): CodeSystemStatus[] {
  const systems: CodeSystemId[] = [];
  for (const r of policy.rules) if (!systems.includes(r.system)) systems.push(r.system);
  return systems.map(system => {
    const later = policy.rules
      .filter(r => r.system === system && r.from && r.from > today)
      .sort((a, b) => (a.from ?? '').localeCompare(b.from ?? ''))[0];
    return { system, role: roleOn(policy, system, today), ...(later?.from ? { next: { role: later.role, from: later.from } } : {}) };
  });
}
