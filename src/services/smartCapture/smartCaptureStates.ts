// src/services/smartCapture/smartCaptureStates.ts
// ─────────────────────────────────────────────────
// Batch 611 (queue entry #189): the Smart Capture review states and their rules.
// Pure: no storage, no audit, no service calls. The service applies these.
//
//   suggested  the rule set offered the line; nobody has looked at it
//   reviewed   a person accepted or rejected it
//   approved   a pathologist confirmed the accepted lines (nothing leaves before this)
//   exported   the approved lines were handed to the charge path (Simulated in the demo)
//
// No autonomous submission: a line only moves forward by a person's action, and
// the export only takes lines that were approved.
// ─────────────────────────────────────────────────
import type { SmartCaptureSuggestion } from './smartCaptureRules';

export type SmartCaptureLineState = 'suggested' | 'reviewed' | 'approved' | 'exported';
export type SmartCaptureDecision = 'accepted' | 'rejected';

export interface SmartCaptureLine extends SmartCaptureSuggestion {
  state: SmartCaptureLineState;
  /** Set once reviewed. A rejected line stays rejected through approval and never leaves. */
  decision?: SmartCaptureDecision;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface SmartCaptureRecord {
  caseId: string;
  ruleVersion: string;
  /** What the rules read when the suggestions were made; a different value later means the case changed. */
  signature: string;
  generatedAt: string;
  lines: SmartCaptureLine[];
  approvedBy?: string;
  approvedAt?: string;
  exportedAt?: string;
  /** Whether the export went to the simulated engine. */
  exportSimulated?: boolean;
  lastExportError?: string;
}

export type SmartCaptureRecordState = 'none' | 'suggested' | 'reviewed' | 'approved' | 'exported';

/** Where the record as a whole stands (pure). */
export function recordState(record: SmartCaptureRecord | null | undefined): SmartCaptureRecordState {
  if (!record || record.lines.length === 0) return 'none';
  const live = record.lines.filter(l => l.decision !== 'rejected');
  if (live.length > 0 && live.every(l => l.state === 'exported')) return 'exported';
  if (live.length > 0 && live.every(l => l.state === 'approved' || l.state === 'exported')) return 'approved';
  if (record.lines.every(l => l.state !== 'suggested')) return 'reviewed';
  return 'suggested';
}

/** Whether the case changed since the suggestions were made, or the rules did (pure). */
export function isStale(record: SmartCaptureRecord | null | undefined, signature: string, ruleVersion: string): boolean {
  return !!record && (record.signature !== signature || record.ruleVersion !== ruleVersion);
}

export type SmartCaptureRefusal =
  | 'NOTHING_ACCEPTED' | 'UNREVIEWED_LINES' | 'NOT_A_PATHOLOGIST' | 'NOT_CONFIRMED' | 'NOT_APPROVED' | 'ALREADY_EXPORTED'
  | 'STALE' | 'PRODUCTION_GATED' | 'NOT_FOUND' | 'LOCKED';

/** Roles that may give the confirmation. The approver is always a pathologist, never an administrator (pure). */
export function mayConfirm(role: string | undefined): boolean {
  return role === 'pathologist' || role === 'pathologist-admin';
}

/** Why a record cannot be approved yet, or null when it can (pure). */
export function approvalRefusal(record: SmartCaptureRecord | null | undefined, input: { role: string | undefined; confirmed: boolean; stale: boolean }): SmartCaptureRefusal | null {
  if (!record) return 'NOT_FOUND';
  if (!mayConfirm(input.role)) return 'NOT_A_PATHOLOGIST';
  if (input.stale) return 'STALE';
  if (recordState(record) === 'exported' || recordState(record) === 'approved') return 'LOCKED';
  if (record.lines.some(l => l.state === 'suggested')) return 'UNREVIEWED_LINES';
  if (!record.lines.some(l => l.decision === 'accepted')) return 'NOTHING_ACCEPTED';
  if (!input.confirmed) return 'NOT_CONFIRMED';
  return null;
}

/** Why an approved record cannot be exported yet, or null when it can (pure). */
export function exportRefusal(record: SmartCaptureRecord | null | undefined, input: { stale: boolean; engineSimulated: boolean; productionActivated: boolean }): SmartCaptureRefusal | null {
  if (!record) return 'NOT_FOUND';
  const state = recordState(record);
  if (state === 'exported') return 'ALREADY_EXPORTED';
  if (state !== 'approved') return 'NOT_APPROVED';
  if (input.stale) return 'STALE';
  // A real engine address is configured: nothing goes until the production gate has been opened.
  if (!input.engineSimulated && !input.productionActivated) return 'PRODUCTION_GATED';
  return null;
}

/** The lines that leave: accepted and approved, never a rejected one (pure). */
export function exportableLines(record: SmartCaptureRecord): SmartCaptureLine[] {
  return record.lines.filter(l => l.decision === 'accepted' && l.state === 'approved');
}

/** Carries earlier decisions onto fresh suggestions where the rule, code and units are unchanged (pure). */
export function mergeDecisions(fresh: readonly SmartCaptureSuggestion[], previous: readonly SmartCaptureLine[] | undefined): SmartCaptureLine[] {
  const before = new Map((previous ?? []).map(l => [`${l.key}|${l.cpt}|${l.units}`, l]));
  return fresh.map(s => {
    const old = before.get(`${s.key}|${s.cpt}|${s.units}`);
    if (old && old.state === 'reviewed') return { ...s, state: 'reviewed' as const, decision: old.decision, reviewedBy: old.reviewedBy, reviewedAt: old.reviewedAt };
    return { ...s, state: 'suggested' as const };
  });
}
