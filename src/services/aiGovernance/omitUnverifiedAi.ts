// src/services/aiGovernance/omitUnverifiedAi.ts
// ─────────────────────────────────────────────────
// Batch 691: AI Output Governance. An AI value nobody confirmed does not go into the signed report.
// Batch 692: the same for grossing reports, at Gross Complete (the PA's finalize) and again at case sign-out.
// When the sign-out dialog opens, every OPTIONAL field that still holds an unchanged, unverified AI
// value is returned to its pre-confirm state: the answer is cleared, the AI suggestion stays (still
// unverified, still offering Confirm). Cancelling the dialog and pressing Confirm puts the value back.
// Required fields are not touched: sign-out already stops on them. A value the pathologist edited is
// theirs and is kept. The audit entry names the count only, never a value (no patient data).
// Pure apart from the per-tab memory and recordAiOmittedAtSignOut.
// ─────────────────────────────────────────────────
import type { NewAuditLog } from '../auditlog/IAuditService';

type Suggestion = { verification?: string; value?: unknown } | undefined;
interface Report { instanceId: string; templateId?: string; answers?: Record<string, unknown>; aiSuggestions?: Record<string, Suggestion> }
export interface AiOmission { instanceId: string; fieldId: string }

const hasAnswer = (v: unknown): boolean => Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '';
const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Optional fields holding an unchanged unverified AI value. `suggestionsOf` supplies the current verification state
 * (the panel saves it straight to the store, so the stored copy is the current one); `requiredIds` the template's required fields.
 */
export function unverifiedAiOmissions(
  reports: readonly Report[] | undefined,
  suggestionsOf: (r: Report) => Record<string, Suggestion> | undefined,
  requiredIds: (r: Report) => ReadonlySet<string>,
): AiOmission[] {
  return (reports ?? []).flatMap(r => {
    const required = requiredIds(r);
    return Object.entries(suggestionsOf(r) ?? {})
      .filter(([id, s]) => s?.verification === 'unverified' && !required.has(id) && hasAnswer(r.answers?.[id]) && sameValue(r.answers?.[id], s.value))
      .map(([fieldId]) => ({ instanceId: r.instanceId, fieldId }));
  });
}

/** The reports with those answers cleared; other reports and every suggestion are left as they were. */
export function withoutOmitted<T extends Report>(reports: T[] | undefined, omissions: readonly AiOmission[]): T[] | undefined {
  if (!reports || omissions.length === 0) return reports;
  return reports.map(r => {
    const ids = omissions.filter(o => o.instanceId === r.instanceId).map(o => o.fieldId);
    if (ids.length === 0) return r;
    const answers = { ...(r.answers ?? {}) };
    ids.forEach(id => { delete answers[id]; });
    return { ...r, answers };
  });
}

// What was left out for each case in this browser tab, so the sign-out audit can name it.
const left = new Map<string, AiOmission[]>();
export const rememberOmissions = (caseId: string, list: AiOmission[]): void => { if (list.length) left.set(caseId, [...(left.get(caseId) ?? []), ...list]); };
export const forgetOmissions = (caseId: string): void => { left.delete(caseId); };

/** Left-out values still left out at the moment of signing (one the pathologist then confirmed has an answer again). */
export function stillOmitted(caseId: string, reports: readonly Report[] | undefined): AiOmission[] {
  const byId = new Map((reports ?? []).map(r => [r.instanceId, r]));
  const seen = new Set<string>();
  return (left.get(caseId) ?? []).filter(o => {
    const k = `${o.instanceId}|${o.fieldId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return !hasAnswer(byId.get(o.instanceId)?.answers?.[o.fieldId]);
  });
}

export type OmitStage = 'signout' | 'gross';
export function aiOmittedAtSignOutAudit(count: number, who: { caseId: string | null; userName: string }, stage: OmitStage = 'signout'): NewAuditLog | null {
  if (count <= 0) return null;
  return { type: 'user', event: 'AI_VALUES_OMITTED_AT_SIGNOUT', detail: `${count} optional AI-filled field${count === 1 ? ' was' : 's were'} left out of the ${stage === 'gross' ? 'finalized gross' : 'signed'} report because ${who.userName || 'the signing user'} had not confirmed ${count === 1 ? 'it' : 'them'}`, user: who.userName || 'unknown', caseId: who.caseId, confidence: null };
}

/** Gross Complete (Batch 692): the same omission, audited at once for the fields cleared in that step. */
export function recordAiOmittedAtGross(audit: { logEvent: (e: NewAuditLog) => Promise<unknown> }, caseId: string, count: number, userName: string): void {
  const e = aiOmittedAtSignOutAudit(count, { caseId, userName }, 'gross');
  if (e) void audit.logEvent(e).catch(() => {});
}

/** Called once the sign-out checks pass; a failure to audit never blocks the sign-out. */
export function recordAiOmittedAtSignOut(audit: { logEvent: (e: NewAuditLog) => Promise<unknown> }, caseId: string, reports: readonly Report[] | undefined, userName: string): void {
  const e = aiOmittedAtSignOutAudit(stillOmitted(caseId, reports).length, { caseId, userName });
  if (e) void audit.logEvent(e).catch(() => {});
}
