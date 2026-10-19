// src/services/coding/codeSystemPolicyRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 595: the checks and wording for a jurisdiction's code-system policy
// (Configuration → System → Code Systems). Pure. The policy itself and its
// date logic are in codeSystemPolicy.ts; the service that keeps and audits
// changes is codeSystemPolicyService.ts.
// ─────────────────────────────────────────────────────────────────────────────
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { Jurisdiction } from '@/types/systemConfig';
import type { CodeSystemRule } from './codeSystemPolicy';

/** What an administrator has set for one jurisdiction. No record means the default policy. */
export interface CodeSystemPolicyRecord {
  jurisdiction: Jurisdiction;
  rules: CodeSystemRule[];
  updatedAt?: string;
  updatedBy?: string;
}

export type CodeSystemPolicyProblem = 'NO_RULES' | 'BAD_SYSTEM' | 'BAD_ROLE' | 'BAD_DATE' | 'DUPLICATE' | 'TOO_MANY';

export const MAX_CODE_SYSTEM_RULES = 40;
const SYSTEM_ID = /^[A-Za-z0-9._-]{1,24}$/;
const ROLES = ['off', 'optional', 'required'] as const;

/** A real calendar day written YYYY-MM-DD. */
export function isIsoDay(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const d = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
}

export function normalizeCodeSystemRecord(r: CodeSystemPolicyRecord): CodeSystemPolicyRecord {
  const rules = r.rules.map(x => ({
    system: x.system.trim(),
    role: x.role,
    ...(x.from && x.from.trim() ? { from: x.from.trim() } : {}),
  }));
  return { ...r, rules };
}

export function codeSystemRecordProblem(r: CodeSystemPolicyRecord): CodeSystemPolicyProblem | null {
  if (!r.rules.length) return 'NO_RULES';
  if (r.rules.length > MAX_CODE_SYSTEM_RULES) return 'TOO_MANY';
  const seen = new Set<string>();
  for (const x of r.rules) {
    if (!SYSTEM_ID.test(x.system)) return 'BAD_SYSTEM';
    if (!(ROLES as readonly string[]).includes(x.role)) return 'BAD_ROLE';
    if (x.from !== undefined && !isIsoDay(x.from)) return 'BAD_DATE';
    const key = `${x.system}|${x.from ?? ''}`;
    if (seen.has(key)) return 'DUPLICATE';
    seen.add(key);
  }
  return null;
}

/** The rules as one English line, for the audit record (audit text stays English). */
export function describeCodeSystemRules(rules: readonly CodeSystemRule[] | null): string {
  if (!rules) return 'default policy';
  return rules.map(x => `${x.system} ${x.role}${x.from ? ` from ${x.from}` : ''}`).join('; ');
}

export function codeSystemPolicyChangeAudit(before: CodeSystemPolicyRecord | null, after: CodeSystemPolicyRecord | null, actorName: string): NewAuditLog {
  const jurisdiction = (after ?? before)!.jurisdiction;
  return {
    type: 'user', event: 'CODE_SYSTEM_POLICY_CHANGED', caseId: null, user: actorName, confidence: null,
    detail: `Code systems for ${jurisdiction}: ${describeCodeSystemRules(before?.rules ?? null)} → ${describeCodeSystemRules(after?.rules ?? null)}.`,
  };
}
