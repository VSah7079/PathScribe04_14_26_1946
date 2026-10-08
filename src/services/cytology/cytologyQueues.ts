// src/services/cytology/cytologyQueues.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 440 (PS-271 follow-up, Pete Oct 2): who works which GYN cytology case.
//
//   • QC rescreen (the x% of negatives, and targeted high-risk) lives in the
//     Cytology Workspace's QC / Rescreen tile, as an unassigned, shared
//     queue: whoever is on the QC bench works every QC-flagged GYN
//     specimen. A rescreen is an independent second look (NHS: "each
//     member of staff's independent opinion must be recorded"), so a
//     specimen you did the primary screen on stays in your queue, marked
//     as yours (Pete: show it, don't hide it, so it is never stranded
//     unseen in a small lab), and recording a QC rescreen of it is
//     refused; "Ask a colleague" messages another cytotech. A pathologist
//     doing the QC (rare) uses the same tile.
//   • A positive GYN goes to a pathologist: CLIA §493.1274(e) (and
//     Australia's 2023 cervical screening requirements, and the NHS) need a
//     pathologist to confirm every abnormal result. It appears on the main
//     Worklist's Cytology Review tile — a shared tray of positive cases with
//     no pathologist on them yet, plus the viewer's own. A pathologist takes
//     one (they become the case's primary), then reviews and signs out in
//     the Cytology Workspace as today. No auto-assignment.
//
// Pure functions here; the loaders are in cytologyQueuesLive.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyReviewRecord, CytologyReviewRole } from '@/types/cytology/CytologyReviewRecord';
import type { CaseParticipant } from '@/types/case/Case';

type Review = Pick<CytologyReviewRecord, 'role' | 'recordedBy' | 'requiresPathologistReview'>;

const QC_ROLES: ReadonlySet<CytologyReviewRole> = new Set(['qc_random_selection', 'qc_targeted_high_risk']);
/** The roles a cytotechnologist screens in (before any pathologist). */
const SCREENING_ROLES: ReadonlySet<CytologyReviewRole> = new Set(['primary_screen', 'qc_random_selection', 'qc_targeted_high_risk', 'secondary_reviewer']);
const PATHOLOGIST_ROLES: ReadonlySet<CytologyReviewRole> = new Set(['pathologist_review', 'post_signout_peer_review_random', 'post_signout_peer_review_targeted']);
/** Statuses past sign-out (or in the release buffer). */
const SIGNED_OUT: ReadonlySet<string> = new Set(['finalized', 'closed', 'pending-release']);

export const isQcRole = (role: CytologyReviewRole) => QC_ROLES.has(role);

/** Who did the primary screen, if anyone has. */
export function primaryScreenerId(reviews: readonly Review[]): string | undefined {
  return reviews.find(r => r.role === 'primary_screen')?.recordedBy.userId;
}

/** A new QC rescreen by the person who did the primary screen: refused (an independent second look). */
export function qcByPrimaryScreener(role: CytologyReviewRole, reviews: readonly Review[], userId: string): boolean {
  return isQcRole(role) && primaryScreenerId(reviews) === userId;
}

/** This viewer did the primary screen: shown in their QC queue, marked, but they can't record the rescreen. */
export function isOwnPrimaryScreen(reviews: readonly Review[], viewerId: string): boolean {
  return primaryScreenerId(reviews) === viewerId;
}

/**
 * A GYN specimen waiting for a pathologist: a screen (primary, QC or
 * secondary) found something that needs pathologist confirmation, no
 * pathologist has reviewed it yet, and the case isn't signed out.
 */
export function awaitingPathologistReview(reviews: readonly Review[], caseStatus: string | undefined): boolean {
  if (caseStatus && SIGNED_OUT.has(caseStatus)) return false;
  if (reviews.some(r => PATHOLOGIST_ROLES.has(r.role))) return false;
  return reviews.some(r => SCREENING_ROLES.has(r.role) && r.requiresPathologistReview);
}

/**
 * Batch 441: who else the rules need to know about a case.
 *   isCytotech — a cytotech-only staff member. Before Batch 441 a cytotech
 *     claiming a pool case could become its 'primary'; such a person is
 *     still not the case's pathologist.
 *   assignedTo — order.assignedTo, used when the case has no participants
 *     list at all (older data).
 */
export interface CaseStaffContext {
  isCytotech?: (staffId: string) => boolean;
  assignedTo?: string | null;
}

/** The pathologists on a case: active participants on anything but the cytotechnologist track, who aren't cytotechs. */
export function pathologistsOnCase(participants: readonly CaseParticipant[] | undefined, ctx: CaseStaffContext = {}): string[] {
  const isCytotech = ctx.isCytotech ?? (() => false);
  const active = (participants ?? []).filter(p => p.status === 'active');
  if (active.length === 0) return ctx.assignedTo && !isCytotech(ctx.assignedTo) ? [ctx.assignedTo] : [];
  return active
    .filter(p => p.participationTypeIds.some(t => t !== 'cytotechnologist') && !isCytotech(p.staffId))
    .map(p => p.staffId);
}

export type CytologyReviewTrayState = 'open' | 'mine' | 'hidden';

/** On the Cytology Review tile: open (anyone may take it), mine (I'm the pathologist), or hidden (another pathologist has it). */
export function cytologyReviewTrayState(participants: readonly CaseParticipant[] | undefined, viewerId: string, ctx: CaseStaffContext = {}): CytologyReviewTrayState {
  const pathologists = pathologistsOnCase(participants, ctx);
  if (pathologists.length === 0) return 'open';
  return pathologists.includes(viewerId) ? 'mine' : 'hidden';
}

export type TakeCytologyReviewProblem = 'ALREADY_TAKEN' | 'NOT_AWAITING';

export function takeCytologyReviewProblem(
  participants: readonly CaseParticipant[] | undefined,
  viewerId: string,
  awaiting: boolean,
  ctx: CaseStaffContext = {},
): TakeCytologyReviewProblem | null {
  if (!awaiting) return 'NOT_AWAITING';
  return cytologyReviewTrayState(participants, viewerId, ctx) === 'hidden' ? 'ALREADY_TAKEN' : null;
}
