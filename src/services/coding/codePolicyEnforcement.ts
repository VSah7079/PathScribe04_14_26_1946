// src/services/coding/codePolicyEnforcement.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 607 (#137, #161, #182): where the code-system policy is applied.
//   • the Add Code window shows only the systems the policy allows, and marks required ones;
//   • sign-out finds required systems with no code, and an outside-policy code, and can be overridden
//     (the override is audited, with no patient details);
//   • outbound messages carry only codes the policy allows.
// Pure: today's date and the case's codes are passed in.
// ─────────────────────────────────────────────────────────────────────────────
import type { CaseCoding } from '@/types/case/Case';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { CodedEntry, CodeSystemId } from './codedEntry';
import { fromCaseCoding } from './caseCodingAdapter';
import { activeSystems, entriesOutsidePolicy, missingRequiredSystems, roleOn, type CodeSystemPolicy, type CodeSystemRole } from './codeSystemPolicy';

export interface PillState { system: CodeSystemId; role: Exclude<CodeSystemRole, 'off'>; required: boolean }

/** The systems the Add Code window offers, in the given order, with the role each has today. Systems the policy has no rule for are not offered. */
export function pillStates(all: readonly CodeSystemId[], policy: CodeSystemPolicy, today: string): PillState[] {
  const on = new Set(activeSystems(policy, today));
  return all.filter(s => on.has(s)).map(system => {
    const role = roleOn(policy, system, today) as PillState['role'];
    return { system, role, required: role === 'required' };
  });
}

/** Today's date as YYYY-MM-DD in local time (the one place the clock is read for the browser callers). */
export function isoDayOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface CodeCarrier {
  coding?: CaseCoding;
  specimens?: { coding?: { icd10?: { code: string }[]; snomed?: { code: string }[]; icdO?: { code: string }[]; cpt?: string[] } }[];
}

/** Every code on a case (case level and each specimen), as entries. Older records read as source 'legacy'. */
export function collectCaseEntries(c: CodeCarrier): CodedEntry[] {
  const out: CodedEntry[] = [...(c.coding?.entries ?? []), ...fromCaseCoding(c.coding)];
  for (const sp of c.specimens ?? []) {
    const k = sp.coding;
    if (!k) continue;
    for (const x of k.icd10 ?? []) out.push({ system: 'ICD10', code: x.code, source: 'legacy' });
    for (const x of k.snomed ?? []) out.push({ system: 'SNOMED', code: x.code, source: 'legacy' });
    for (const x of k.icdO ?? []) out.push({ system: 'ICDO', code: x.code, source: 'legacy' });
    for (const x of k.cpt ?? []) out.push({ system: 'CPT', code: x, source: 'legacy' });
  }
  return out;
}

export interface SignOutCodeCheck {
  /** Required systems with no code. */
  missing: CodeSystemId[];
  /** Codes in a system the policy does not allow today. */
  outside: CodedEntry[];
  ok: boolean;
}

export function signOutCodeCheck(entries: readonly CodedEntry[], policy: CodeSystemPolicy, today: string): SignOutCodeCheck {
  const missing = missingRequiredSystems(entries, policy, today);
  const outside = entriesOutsidePolicy(entries, policy, today);
  return { missing, outside, ok: missing.length === 0 };
}

/** What may leave in an outbound message: codes in a system the policy allows today. `withheld` is what was held back. */
export function filterOutbound(entries: readonly CodedEntry[], policy: CodeSystemPolicy, today: string): { allowed: CodedEntry[]; withheld: CodedEntry[] } {
  const withheld = entriesOutsidePolicy(entries, policy, today);
  return { allowed: entries.filter(e => !withheld.includes(e)), withheld };
}

/** Audit entry for a sign-out that went ahead with a required system uncoded. Names systems only: no code values, no patient. */
export function codeSignOutOverrideAudit(caseId: string, userName: string, missing: readonly CodeSystemId[]): NewAuditLog {
  return {
    type: 'user', event: 'CODE_POLICY_SIGNOUT_OVERRIDE', caseId, user: userName, confidence: null,
    detail: `Signed out without a code in required system(s): ${missing.join(', ')}. Signer confirmed the override.`,
  };
}

/** Audit entry for codes held back from an outbound message. Counts and systems only. */
export function codeOutboundWithheldAudit(caseId: string | null, userName: string, withheld: readonly CodedEntry[]): NewAuditLog {
  const systems = [...new Set(withheld.map(e => e.system))].join(', ');
  return {
    type: 'user', event: 'CODE_POLICY_OUTBOUND_WITHHELD', caseId, user: userName, confidence: null,
    detail: `${withheld.length} code(s) in system(s) not allowed by the code-system policy were left out of an outbound message: ${systems}.`,
  };
}

// ── Batch 614 (PS-762): the same policy, applied on the other coding screens ──────────────────────────────

/** Systems from `all` that the policy has switched off today (no rule counts as off). Used for the inline note on a screen. */
export function systemsOffByPolicy(all: readonly CodeSystemId[], policy: CodeSystemPolicy, today: string): CodeSystemId[] {
  return all.filter(s => roleOn(policy, s, today) === 'off');
}

/** Whether a system may be used on this screen today. */
export function systemAllowed(system: CodeSystemId, policy: CodeSystemPolicy, today: string): boolean {
  return roleOn(policy, system, today) !== 'off';
}

/** The diagnosis codes an order message may carry: none when ICD-10 is switched off. */
export function orderDiagnosesAllowed<T>(diagnoses: readonly T[] | undefined, policy: CodeSystemPolicy, today: string): T[] | undefined {
  if (!diagnoses) return undefined;
  return systemAllowed('ICD10', policy, today) ? [...diagnoses] : [];
}

/** True when the policy offers no system the screen could use (the Add Code window then falls back to the site's own list and says so). */
export function policyOffersNone(all: readonly CodeSystemId[], policy: CodeSystemPolicy, today: string): boolean {
  return all.length > 0 && systemsOffByPolicy(all, policy, today).length === all.length;
}
