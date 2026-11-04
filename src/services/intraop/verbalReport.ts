// src/services/intraop/verbalReport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 399 (Pete). The verbal report of a frozen result, as a structured
// record: who received it, their role, the read-back, the critical-result
// decision and, when a critical result didn't go to the operating surgeon,
// why. Accreditation and hospital policy allow the result to go to the
// surgeon or an authorized member of the surgical team; the read-back is
// mandatory; the record says who and when. For a critical result, direct
// communication with the operating surgeon is expected, so anyone else
// receiving it needs a "Surgeon unavailable" reason, chosen by the
// pathologist.
//
// These are the rules every log must meet, whatever the organisation's Field
// Requirements (all locked there; intraopChecks.intraopVerbalReportMissing
// adds the optional note switch for the screen). Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { VerbalReportInput, VerbalReportLog } from '@/types/intraop/IntraoperativeEntry';

export const SURGEON_UNAVAILABLE_OTHER = 'SU_OTHER';

/** Batch 399 (Pete): "Other" needs a real explanation, not "." or "busy". */
export const OTHER_NOTE_MIN_CHARS = 12;
export function otherNoteAcceptable(note: string | undefined): boolean {
  const text = (note ?? '').trim();
  const letters = text.replace(/[^\p{L}\p{N}]/gu, '');
  const words = text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w));
  return letters.length >= OTHER_NOTE_MIN_CHARS - 2 && text.length >= OTHER_NOTE_MIN_CHARS && words.length >= 3;
}

/** Tappable starting phrases for an "Other" note (locale keys under intraopQueue.verbalReport.otherSuggestions). */
export const OTHER_NOTE_SUGGESTION_KEYS = ['callWithAnotherTeam', 'leftHospitalCoveringInformed', 'unreachableByPhone'] as const;

/**
 * Who took the report (Pete: no scrolling through a hospital directory
 * mid-call). The session's surgeon comes first, then physicians from the
 * directory whose names match what's typed. A typed name that isn't in the
 * directory is still accepted by the form. Pure.
 */
export function recipientSuggestions(query: string, sessionSurgeon: string, directoryNames: readonly string[], limit = 8): string[] {
  const q = query.trim().toLowerCase().replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?)\s+/, '');
  const fits = (name: string) => !q || name.toLowerCase().includes(q);
  const out: string[] = [];
  for (const name of [sessionSurgeon, ...directoryNames]) {
    const n = name?.trim();
    if (n && fits(n) && !out.some(o => o.toLowerCase() === n.toLowerCase())) out.push(n);
    if (out.length >= limit) break;
  }
  return out;
}

/** Picking "Operating surgeon" fills in the session's surgeon when nothing is typed yet. */
export function receivedByForRole(role: string, current: string, sessionSurgeon: string): string {
  return role === 'operating_surgeon' && !current.trim() ? sessionSurgeon : current;
}

/** A critical result is going to someone other than the operating surgeon. */
export function surgeonUnavailableNeeded(input: Pick<VerbalReportInput, 'critical' | 'recipientRole'>): boolean {
  return input.critical && !!input.recipientRole && input.recipientRole !== 'operating_surgeon';
}

/** What a verbal report still lacks, in form order (field ids of the Intraop Field Requirements). */
export function verbalReportProblems(input: VerbalReportInput): string[] {
  const out: string[] = [];
  if (!input.receivedBy.trim()) out.push('verbalReportRecipient');
  if (!input.recipientRole) out.push('verbalReportRole');
  if (!input.readBackConfirmed) out.push('verbalReportReadBack');
  if (surgeonUnavailableNeeded(input)) {
    if (!input.surgeonUnavailable?.reasonId) out.push('surgeonUnavailableReason');
    else if (input.surgeonUnavailable.reasonId === SURGEON_UNAVAILABLE_OTHER && !otherNoteAcceptable(input.surgeonUnavailable.note)) out.push('surgeonUnavailableNote');
  }
  return out;
}

/** The stored record. `now` is the system clock: a time said aloud goes in the note, never here. */
export function buildVerbalReportLog(input: VerbalReportInput, now: string): VerbalReportLog {
  const unavailable = surgeonUnavailableNeeded(input) && input.surgeonUnavailable
    ? { reasonId: input.surgeonUnavailable.reasonId, reasonName: input.surgeonUnavailable.reasonName, ...(input.surgeonUnavailable.note?.trim() ? { note: input.surgeonUnavailable.note.trim() } : {}) }
    : undefined;
  return {
    timestamp: now,
    note: input.note?.trim() || '(no note recorded)',
    receivedBy: input.receivedBy.trim(),
    recipientRole: input.recipientRole || undefined,
    readBackConfirmed: input.readBackConfirmed,
    critical: { flagged: input.critical, suggestedIds: [...input.suggestedCriticalIds], suggestedNames: [...input.suggestedCriticalNames] },
    ...(unavailable ? { surgeonUnavailable: unavailable } : {}),
    ...(input.reportedBy ? { reportedBy: input.reportedBy } : {}),
    ...(input.dictation && input.dictation.filledFields.length ? { dictation: { engine: input.dictation.engine, filledFields: [...input.dictation.filledFields] } } : {}),
  };
}

/** The audit line for a logged report (literal English: audit records are compliance artifacts). */
export function verbalReportAuditDetail(log: VerbalReportLog): string {
  const parts = [
    `Verbal report of frozen result given to ${log.receivedBy ?? 'unrecorded recipient'} (${log.recipientRole ?? 'role not recorded'})`,
    `read-back ${log.readBackConfirmed ? 'confirmed' : 'not confirmed'}`,
  ];
  if (log.critical) {
    const suggested = log.critical.suggestedNames.length ? `dictionary suggested: ${log.critical.suggestedNames.join(', ')}` : 'no dictionary match';
    parts.push(`critical result: ${log.critical.flagged ? 'yes' : 'no'} (${suggested})`);
  }
  if (log.surgeonUnavailable) parts.push(`surgeon unavailable: ${log.surgeonUnavailable.reasonName}${log.surgeonUnavailable.note ? ` (${log.surgeonUnavailable.note})` : ''}`);
  if (log.dictation) parts.push(`filled from dictation (${log.dictation.engine === 'ai' ? 'AI' : 'rules'}) and checked by the pathologist: ${log.dictation.filledFields.join(', ')}`);
  return parts.join('; ') + '.';
}
