// src/services/quality/capaRecommendationRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 to PS-148 (Batch 438): the shared CAPA recommendation engine's
// decisions (pure; tested in capaRecommendationService.test.ts).
//
// Pete (Oct 2):
//   • PathScribe recommends; a QA lead confirms (opens and assigns the CAPA)
//     or dismisses with a reason. Nothing opens a CAPA by itself.
//   • A disagreement resolved by consensus raises no CAPA (PS-144).
//   • A major discordance found after sign-out is its own moment; the
//     correction that follows is linked to it, not a second recommendation
//     (PS-148 → PS-146).
//   • A correction counts when its reason is marked clinically significant
//     in the lab's reason dictionary (PS-146).
// ─────────────────────────────────────────────────────────────────────────────

import type { CapaRecommendation, CapaRecommendationInput, CapaRecommendationSource } from '@/types/quality/CapaRecommendation';
import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';
import type { QaActivityType } from '@/types/quality/QaActivityType';

/** Sources that describe a discordance found about the case (a later correction links to them). */
export const DISCORDANCE_SOURCES: ReadonlySet<CapaRecommendationSource> = new Set([
  'qa-discordance', 'post-signout-discordance', 'unresolved-disagreement', 'clinical-mismatch',
]);

/** The QA activity types reviewed after sign-out (their discordance is PS-148's moment). */
export const POST_SIGN_OUT_ACTIVITY_TYPE_IDS: ReadonlySet<string> = new Set(['qa-activity-surgical-peer-review']);

/** Whether a recommendation still stands for its problem: pending, or confirmed with its CAPA not yet closed. */
export function isLive(rec: CapaRecommendation, capaClosed: (deficiencyId: string) => boolean): boolean {
  if (rec.status === 'pending') return true;
  if (rec.status === 'confirmed') return !!rec.deficiencyId && !capaClosed(rec.deficiencyId);
  return false;
}

/**
 * The recommendation an event belongs to instead of a new one, if any:
 *   • a clinically significant correction after a discordance on the same
 *     case (any specimen) links to that discordance (PS-148);
 *   • the same problem again (same case, deficiency type and specimen)
 *     links to the live recommendation for it.
 * A dismissed one never absorbs a new event: a new event can be judged afresh.
 */
export function findLinkTarget(
  existing: readonly CapaRecommendation[],
  input: Pick<CapaRecommendationInput, 'caseId' | 'specimenId' | 'source' | 'deficiencyTypeId'>,
  capaClosed: (deficiencyId: string) => boolean,
): CapaRecommendation | undefined {
  const live = existing.filter(r => r.caseId === input.caseId && isLive(r, capaClosed));
  if (input.source === 'clinical-correction') {
    const discordance = live.find(r => DISCORDANCE_SOURCES.has(r.source));
    if (discordance) return discordance;
  }
  return live.find(r => r.deficiencyTypeId === input.deficiencyTypeId && (r.specimenId ?? null) === (input.specimenId ?? null));
}

/** Batch 439 (PS-145): the clinical-pathologic correlation activity. An unresolved mismatch recommends as its own source. */
export const CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID = 'qa-activity-clinical-pathologic-correlation';

/**
 * What a QA review with an outcome recommends, if anything (replaces the PS-134 auto-raise).
 *   • consensus reached → nothing (PS-144);
 *   • unresolved → always: a clinical-pathologic mismatch (PS-145) or an
 *     unresolved peer disagreement;
 *   • otherwise the activity type's rule (severities). A rule marked
 *     `postSignOutOnly` (outside consult, Batch 439) applies only to a
 *     review made after the report was released. A discordance found after
 *     sign-out is its own source (PS-148).
 */
export function qaRecordRecommendation(
  record: Pick<QaActivityRecord, 'outcome' | 'severity' | 'consensus' | 'activityTypeId' | 'postSignOut'>,
  activityType: Pick<QaActivityType, 'capaTriggerRule'> | undefined,
): { source: CapaRecommendationSource; deficiencyTypeId: string } | null {
  if (record.outcome !== 'discordant') return null;
  if (record.consensus === 'consensus-reached') return null;
  if (record.consensus === 'unresolved') {
    if (record.activityTypeId === CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID) {
      return { source: 'clinical-mismatch', deficiencyTypeId: activityType?.capaTriggerRule?.deficiencyTypeId ?? 'def-clinical-pathologic-mismatch' };
    }
    return { source: 'unresolved-disagreement', deficiencyTypeId: activityType?.capaTriggerRule?.deficiencyTypeId ?? 'def-unresolved-peer-disagreement' };
  }
  const rule = activityType?.capaTriggerRule;
  if (!rule?.deficiencyTypeId || !record.severity || !rule.triggerSeverities?.includes(record.severity)) return null;
  if (rule.postSignOutOnly && !record.postSignOut) return null;
  return {
    source: POST_SIGN_OUT_ACTIVITY_TYPE_IDS.has(record.activityTypeId) || record.postSignOut ? 'post-signout-discordance' : 'qa-discordance',
    deficiencyTypeId: rule.deficiencyTypeId,
  };
}

/** The recommendation's summary for a QA record (literal English: audit and CAPA text). */
export function qaRecordSummary(
  record: Pick<QaActivityRecord, 'consensus' | 'severity' | 'comments' | 'postSignOut' | 'activityTypeId'>,
  activityTypeName: string,
): string {
  const what = record.activityTypeId === CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID && record.consensus === 'unresolved'
    ? 'an unresolved clinical-pathologic mismatch'
    : record.consensus === 'unresolved'
      ? 'a disagreement with no consensus'
      : `a ${record.severity ?? ''} severity discordance${record.postSignOut ? ' after sign-out' : ''}`.replace(/\s+/g, ' ');
  return `QA activity "${activityTypeName}" found ${what}: ${record.comments ?? ''}`.trim();
}

export type CapaDecisionProblem = 'NOT_PENDING' | 'REASON_REQUIRED' | 'OWNER_REQUIRED';

/** Why a decision can't be recorded, or null. */
export function decisionProblem(
  rec: Pick<CapaRecommendation, 'status'>,
  decision: { kind: 'confirm'; assignedTo: string } | { kind: 'dismiss'; reason: string },
): CapaDecisionProblem | null {
  if (rec.status !== 'pending') return 'NOT_PENDING';
  if (decision.kind === 'dismiss' && !decision.reason.trim()) return 'REASON_REQUIRED';
  if (decision.kind === 'confirm' && !decision.assignedTo.trim()) return 'OWNER_REQUIRED';
  return null;
}

/** The CAPA's comment when a recommendation is confirmed (literal English). */
export function capaComment(rec: Pick<CapaRecommendation, 'summary' | 'linkedEvents'>, note: string): string {
  const linked = (rec.linkedEvents ?? []).map(e => ` Linked: ${e.summary}`).join('');
  return `${rec.summary}${linked}${note.trim() ? ` QA lead: ${note.trim()}` : ''}`;
}

/** Who can own a CAPA: active staff, by name (pure). */
export function capaOwnerOptions(users: ReadonlyArray<{ id: string; firstName: string; lastName: string; status?: string }>): { id: string; name: string }[] {
  return users
    .filter(u => u.status !== 'Inactive')
    .map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim() || u.id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The queue: pending first (oldest first, so nothing waits long), then decided (newest first). */
export function capaQueueOrder(recs: readonly CapaRecommendation[], showDecided: boolean): CapaRecommendation[] {
  const pending = recs.filter(r => r.status === 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!showDecided) return pending;
  const decided = recs.filter(r => r.status !== 'pending').sort((a, b) => (b.decidedAt ?? b.createdAt).localeCompare(a.decidedAt ?? a.createdAt));
  return [...pending, ...decided];
}
