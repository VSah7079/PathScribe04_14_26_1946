// src/services/aiGovernance/aiAutoFill.ts
// ─────────────────────────────────────────────────
// Batch 689: AI Output Governance (Intended Use Statement, "Provenance Over Confidence").
// When AI values are written into empty answer fields without the pathologist typing them
// (the Auto-insert setting on page load, or "Regenerate from Gross"), the fill is recorded.
// The values themselves stay 'unverified': they are tinted, counted at sign-out and need a
// Confirm or Override like any other AI value. Pure apart from recordAiAutoFill.
// The audit detail names the count and the trigger only, never a value (no patient data).
// ─────────────────────────────────────────────────
import type { NewAuditLog } from '../auditlog/IAuditService';

type Answers = Record<string, string | string[]>;
type Suggestions = Record<string, { value: string | string[]; confidence?: number } | undefined>;
export type AiAutoFillSource = 'page-load' | 'regenerate-from-gross';

const isEmpty = (v: unknown): boolean => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/** Fills only empty fields whose suggestion meets the threshold; a field with a value is never touched. */
export function applyAiAutoFill(answers: Answers, suggestions: Suggestions, threshold: number): { answers: Answers; filled: string[] } {
  const next = { ...answers };
  const filled: string[] = [];
  Object.entries(suggestions).forEach(([fieldId, sug]) => {
    if (sug && (sug.confidence ?? 0) >= threshold && isEmpty(next[fieldId])) { next[fieldId] = sug.value; filled.push(fieldId); }
  });
  return { answers: next, filled };
}

/** The audit entry for an auto-fill; null when nothing was filled. */
export function aiAutoFillAudit(count: number, source: AiAutoFillSource, who: { caseId: string | null; userName: string }): NewAuditLog | null {
  if (count <= 0) return null;
  const how = source === 'page-load' ? 'when the report opened (Auto-insert is on)' : 'by "Regenerate from Gross"';
  return { type: 'user', event: 'AI_VALUES_AUTOFILLED', detail: `${count} field${count === 1 ? '' : 's'} filled with unconfirmed AI values ${how}; each still needs Confirm or Override`, user: who.userName || 'unknown', caseId: who.caseId, confidence: null };
}

/** Records the auto-fill; a failure to audit never blocks the fill. */
export function recordAiAutoFill(audit: { logEvent: (e: NewAuditLog) => Promise<unknown> }, count: number, source: AiAutoFillSource, who: { caseId: string | null; userName: string }): void {
  const e = aiAutoFillAudit(count, source, who);
  if (e) void audit.logEvent(e).catch(() => {});
}
