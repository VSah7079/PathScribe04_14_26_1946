// src/services/marginExtraction/reviewMarginException.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (findings ws-16 / ws-17): what Resolve and Dismiss on the Margin Exception Review screen do, as one
// service call each, so the page and hook only dispatch (CLAUDE.md rule 2).
//
//   1. The decision itself, through IMarginExtractionService (which enforces case:margin-exception:resolve and
//      refuses with 'notPermitted'; nothing below runs after a refusal).
//   2. A mandatory audit entry (literal English, ids only plus the value / reason the person gave): who, when, case,
//      item, value or reason. The original typed text is NOT written (free text, often names the patient).
//   3. The Tumor Board margin rules are run again for that case, so a recorded margin flags the case at once and not
//      only at the next sign-out. Best effort: a failure here never undoes the decision, and is reported to the screen.
//
// An audit failure never undoes the decision either (it has already been saved); it is reported as
// `auditWritten: false` so the screen can say so plainly.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { IAuditService, NewAuditLog } from '../auditlog/IAuditService';
import type { Case } from '@/types/case/Case';
import type { IMarginExtractionService, MarginExtractionException } from './IMarginExtractionService';
import type { RunMarginRuleEvaluationInput, RunMarginRuleEvaluationResult } from '../tumorBoardRules/runMarginRuleEvaluation';

export interface MarginExceptionActor { id: string; name: string }

/** What happened to the tumor board rule check that follows the decision. */
export type MarginRuleCheckOutcome =
  | { status: 'flagged'; board: string }
  | { status: 'notFlagged' }
  | { status: 'failed' };

export interface MarginExceptionActionOutcome {
  exception: MarginExtractionException;
  auditWritten: boolean;
  ruleCheck: MarginRuleCheckOutcome;
}

export interface ReviewMarginExceptionDeps {
  marginExtractionService: Pick<IMarginExtractionService, 'resolveException' | 'dismissException'>;
  auditService: Pick<IAuditService, 'logEvent'>;
  /** Loads the case so its rules can be run again; null when it cannot be found. */
  getCase: (caseId: string) => Promise<Case | null>;
  /** Runs the rules (runMarginRuleEvaluation, with the case's own facility and template fields already resolved). */
  runRules: (input: Omit<RunMarginRuleEvaluationInput, 'getTemplateFields' | 'facilityId'> & { caseData: Case }) => Promise<RunMarginRuleEvaluationResult>;
  now?: () => string;
}

/** The parse-failure reason in plain English, for the audit text (the screen's own wording is translated; audit is not). */
const REASON_ENGLISH: Record<string, string> = {
  empty: 'no answer given yet',
  noNumericToken: 'no number found in the text',
  surroundingText: 'a number surrounded by text the parser does not trust',
};

export interface MarginExceptionAuditInput {
  action: 'resolved' | 'dismissed';
  exception: Pick<MarginExtractionException, 'id' | 'caseId' | 'fieldLabel' | 'reason'>;
  caseAccession?: string;
  valueMm?: number;
  dismissReason?: string;
  actorName: string;
  at: string;
}

/** The audit entry for a resolved or dismissed margin exception. Pure. */
export function marginExceptionAuditEntry(i: MarginExceptionAuditInput): NewAuditLog {
  const where = `case ${i.caseAccession || i.exception.caseId}`;
  const why = REASON_ENGLISH[i.exception.reason] ?? i.exception.reason;
  const detail = i.action === 'resolved'
    ? `Margin exception ${i.exception.id} (${where}, field "${i.exception.fieldLabel}", flagged because: ${why}) resolved by ${i.actorName} at ${i.at}. Recorded margin distance: ${i.valueMm} mm. The typed text is not recorded in the audit log.`
    : `Margin exception ${i.exception.id} (${where}, field "${i.exception.fieldLabel}", flagged because: ${why}) dismissed by ${i.actorName} at ${i.at} with no distance recorded. Reason given: ${i.dismissReason ?? ''}`;
  return {
    type: 'user',
    event: i.action === 'resolved' ? 'Margin exception resolved' : 'Margin exception dismissed',
    detail, user: i.actorName, caseId: i.exception.caseId, confidence: null,
  };
}

async function afterDecision(
  exception: MarginExtractionException, action: 'resolved' | 'dismissed', actor: MarginExceptionActor,
  extra: { valueMm?: number; dismissReason?: string; caseAccession?: string }, deps: ReviewMarginExceptionDeps,
): Promise<MarginExceptionActionOutcome> {
  const at = (deps.now ?? (() => new Date().toISOString()))();
  let auditWritten = true;
  try {
    await deps.auditService.logEvent(marginExceptionAuditEntry({ action, exception, actorName: actor.name, at, ...extra }));
  } catch { auditWritten = false; }

  let ruleCheck: MarginRuleCheckOutcome = { status: 'failed' };
  try {
    const caseData = await deps.getCase(exception.caseId);
    if (caseData) {
      const r = await deps.runRules({
        caseId: exception.caseId, caseAccession: extra.caseAccession || exception.caseId, caseData,
        instances: (caseData.synopticReports ?? []).map(s => ({ instanceId: s.instanceId, templateId: s.templateId, answers: s.answers ?? {} })),
        byUserId: actor.id, byUserName: actor.name,
      });
      ruleCheck = r.flagged && r.board ? { status: 'flagged', board: r.board } : { status: 'notFlagged' };
    }
  } catch { ruleCheck = { status: 'failed' }; }
  return { exception, auditWritten, ruleCheck };
}

export async function resolveMarginExceptionWithFollowUp(
  id: string, valueMm: number, actor: MarginExceptionActor, caseAccession: string | undefined, deps: ReviewMarginExceptionDeps,
): Promise<ServiceResult<MarginExceptionActionOutcome>> {
  const res = await deps.marginExtractionService.resolveException(id, valueMm, actor.id, actor.name);
  if (!res.ok) return res;
  return { ok: true, data: await afterDecision(res.data, 'resolved', actor, { valueMm, caseAccession }, deps) };
}

export async function dismissMarginExceptionWithFollowUp(
  id: string, reason: string, actor: MarginExceptionActor, caseAccession: string | undefined, deps: ReviewMarginExceptionDeps,
): Promise<ServiceResult<MarginExceptionActionOutcome>> {
  const res = await deps.marginExtractionService.dismissException(id, reason, actor.id, actor.name);
  if (!res.ok) return res;
  return { ok: true, data: await afterDecision(res.data, 'dismissed', actor, { dismissReason: reason, caseAccession }, deps) };
}

/** Pending items first-in-list as the screen shows them; decided ones newest first. Pure. */
export function partitionMarginExceptions(all: readonly MarginExtractionException[]): { pending: MarginExtractionException[]; decided: MarginExtractionException[] } {
  const pending = all.filter(e => e.status === 'Pending');
  const decided = all.filter(e => e.status !== 'Pending').sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''));
  return { pending, decided };
}

export interface MarginOutcomeNotice { kind: 'info' | 'warning'; key: string; params?: Record<string, string> }

/** The inline notices the screen shows after a decision (translation keys; the board name is looked up by the page). Pure. */
export function marginOutcomeNotices(o: MarginExceptionActionOutcome): MarginOutcomeNotice[] {
  const out: MarginOutcomeNotice[] = [];
  if (o.ruleCheck.status === 'flagged') out.push({ kind: 'info', key: 'marginExceptionReview.notice.flagged', params: { board: o.ruleCheck.board } });
  else if (o.ruleCheck.status === 'notFlagged') out.push({ kind: 'info', key: 'marginExceptionReview.notice.notFlagged' });
  else out.push({ kind: 'warning', key: 'marginExceptionReview.notice.ruleCheckFailed' });
  if (!o.auditWritten) out.push({ kind: 'warning', key: 'marginExceptionReview.notice.auditNotWritten' });
  return out;
}
