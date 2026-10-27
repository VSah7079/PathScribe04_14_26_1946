// src/services/aiGovernance/aiReviewAudit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 680: AI Output Governance (Intended Use Statement): "User acceptance,
// modification and rejection actions shall be auditable." This builds the
// audit entry for a pathologist's decision on AI-drafted narrative. Pure.
// The detail names the section and the action only: never the text, so the
// entry carries no patient data. Audit `detail` stays literal English.
// ─────────────────────────────────────────────────────────────────────────────
import type { NewAuditLog } from '../auditlog/IAuditService';

export type AiReviewAction = 'accepted' | 'accepted-edited' | 'rejected';
export const AI_REVIEW_EVENTS: Record<AiReviewAction, string> = {
  accepted: 'AI_NARRATIVE_ACCEPTED',
  'accepted-edited': 'AI_NARRATIVE_ACCEPTED_EDITED',
  rejected: 'AI_NARRATIVE_REJECTED',
};

export function aiNarrativeReviewAudit(input: { action: AiReviewAction; caseId: string | null; userName: string; sectionLabel: string }): NewAuditLog {
  const verb = input.action === 'rejected' ? 'kept the earlier text instead of the AI draft for' : input.action === 'accepted-edited' ? 'accepted, with changes, the AI draft of' : 'accepted the AI draft of';
  return { type: 'user', event: AI_REVIEW_EVENTS[input.action], detail: `${input.userName || 'Unknown user'} ${verb} the "${input.sectionLabel}" section`, user: input.userName || 'unknown', caseId: input.caseId, confidence: null };
}

type BoundEntry = {
  system: string; code: string; source?: string; display?: string; changedFromSuggestion?: boolean;
  ai?: { model?: string; provider?: string; confidence?: number; verifiedBy?: string; sourceSection?: string; specimen?: string };
};

/** Batch 696: what the audit says about how a bound AI code was produced and checked (literal English; numbers belong in the log, not on screen). */
export function aiCodeProvenanceText(e: BoundEntry): string {
  const a = e.ai;
  const parts: string[] = [];
  if (a?.model) parts.push(`model ${a.model}${a.provider ? ` via ${a.provider}` : ''}`);
  if (typeof a?.confidence === 'number') parts.push(`model confidence ${a.confidence}%`);
  parts.push(a?.verifiedBy === 'dictionary' ? 'code confirmed in the terminology dictionary' : a?.verifiedBy === 'code-map' ? 'code confirmed in the billing code table' : 'code check not recorded');
  if (a?.sourceSection) parts.push(`taken from the ${a.sourceSection}${a.specimen ? `, specimen ${a.specimen}` : ''}`);
  parts.push(e.changedFromSuggestion ? 'changed by the pathologist before binding' : 'bound as suggested');
  return parts.join('; ');
}

/** Newly bound AI-suggested codes: entries from the AI that were not in the saved coding before (pure). */
export function aiCodeBindAudits(
  previous: readonly { system: string; code: string; source?: string }[],
  next: readonly BoundEntry[],
  who: { caseId: string | null; userName: string },
): NewAuditLog[] {
  const had = new Set(previous.map(e => `${e.system}|${e.code}`));
  return next.filter(e => e.source === 'ai' && !had.has(`${e.system}|${e.code}`)).map(e => ({
    type: 'user' as const, event: 'AI_CODE_BOUND',
    detail: `${who.userName || 'Unknown user'} reviewed and bound the AI-suggested ${e.system} code ${e.code}${e.display ? ` (${e.display})` : ''} (${aiCodeProvenanceText(e)})`,
    user: who.userName || 'unknown', caseId: who.caseId, confidence: typeof e.ai?.confidence === 'number' ? e.ai.confidence : null,
  }));
}

/** Records one audit entry per newly bound AI code; a failure to audit never blocks the save. */
export function recordAiCodeBinds(
  audit: { logEvent: (e: NewAuditLog) => Promise<unknown> },
  previous: Parameters<typeof aiCodeBindAudits>[0], next: Parameters<typeof aiCodeBindAudits>[1], who: Parameters<typeof aiCodeBindAudits>[2],
): void {
  aiCodeBindAudits(previous, next, who).forEach(e => { void audit.logEvent(e).catch(() => {}); });
}

type ReportWithSuggestions = { answers?: Record<string, unknown>; aiSuggestions?: Record<string, { verification?: string } | undefined> };
const hasAnswer = (v: unknown): boolean => Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '';

/**
 * Batch 681: fields holding an AI value nobody has confirmed or overridden (pure).
 * Required fields never get this far (sign-out stops on them), so at sign-out these are optional fields.
 */
export function unreviewedAiValueCount(reports: readonly ReportWithSuggestions[] | undefined): number {
  return (reports ?? []).reduce((n, r) => n + Object.entries(r.aiSuggestions ?? {}).filter(([id, s]) => s?.verification === 'unverified' && hasAnswer(r.answers?.[id])).length, 0);
}
