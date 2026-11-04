// src/services/cytology/cytologyQueuesLive.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 440: the shared GYN queues (decisions in cytologyQueues.ts), read
// across every case the viewer may open (caseRouter.getAll applies the
// organisation and pool walls), not just the cases assigned to them:
//   loadQcRescreenQueue    — the Cytology Workspace's QC / Rescreen tile
//   loadCytologyReviewTray — the main Worklist's Cytology Review tile
//   takeCytologyReview     — a pathologist takes a positive GYN case
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { ServiceResult } from '../types';
import { resolveSpecimenEntryMatchesCategory } from '../specimenDictionary/resolveSpecimenEntryMatchesCategory';
import { caseVersionOf } from '../cases/caseWrite';
import { resolveCytologyQcPoolMembership } from './resolveCytologyQcPoolMembership';
import {
  awaitingPathologistReview, cytologyReviewTrayState, firstQualifyingSpecimenPerCase, isOwnPrimaryScreen,
  takeCytologyReviewProblem, type CaseStaffContext, type CytologyReviewTrayState,
} from './cytologyQueues';

export interface GynSpecimenRef { caseData: Case; specimenId: string }

/**
 * Every accessible case's GYN cytology specimens — one ref per specimen,
 * not one per case.
 *
 * Batch 483 (PS-359 tracker follow-up — "Cytology: multi-specimen bug"):
 * this used to `break` after the case's FIRST GYN specimen, so a case
 * whose SECOND GYN specimen was the one actually QC-flagged, or awaiting
 * pathologist review, never appeared in either queue at all — the first,
 * unflagged specimen silently stood in for the whole case. Callers now see
 * every specimen and decide which one(s) qualify themselves
 * (`firstQualifyingSpecimenPerCase` keeps the tiles at one row per case).
 */
async function gynSpecimens(): Promise<GynSpecimenRef[]> {
  const { caseRouter } = await import('../cases/CaseRouter');
  const { specimenDictionaryService } = await import('../specimenDictionary/specimenDictionaryServiceInstance');
  const [casesRes, dictRes] = await Promise.all([caseRouter.getAll(undefined, { includeOrchestration: true }), specimenDictionaryService.getAll()]);
  if (!casesRes.ok) return [];
  const dictById = new Map((dictRes.ok ? dictRes.data : []).map(e => [e.id, e]));
  const out: GynSpecimenRef[] = [];
  for (const c of casesRes.data as Case[]) {
    for (const sp of (c.specimens ?? []) as Array<{ id: string; specimenDictionaryEntryId?: string }>) {
      const entry = sp.specimenDictionaryEntryId ? dictById.get(sp.specimenDictionaryEntryId) : undefined;
      if (resolveSpecimenEntryMatchesCategory(entry, ['GYN_CYTOLOGY'])) out.push({ caseData: c, specimenId: sp.id });
    }
  }
  return out;
}

/** Batch 441: who on a case is a cytotech-only staff member, from the staff directory and role catalog. */
async function cytotechLookup(): Promise<(staffId: string) => boolean> {
  const { userService } = await import('../users/userServiceInstance');
  const { roleService } = await import('../roles/roleServiceInstance');
  const { isCytotechOnly } = await import('../participationTypes/cytotechParticipationRules');
  const [staffRes, rolesRes] = await Promise.all([userService.getAll(), roleService.getAll()]);
  const roles = rolesRes.ok ? rolesRes.data : [];
  const cytotechs = new Set((staffRes.ok ? staffRes.data : []).filter(u => isCytotechOnly(u.roles, roles)).map(u => u.id));
  return id => cytotechs.has(id);
}

const staffContext = (c: Case, isCytotech: (id: string) => boolean): CaseStaffContext => ({ isCytotech, assignedTo: c.order?.assignedTo ?? null });

async function reviewsFor(specimenId: string) {
  const { cytologyReviewRecordService } = await import('./cytologyReviewRecordServiceInstance');
  const res = await cytologyReviewRecordService.getBySpecimenId(specimenId);
  return res.ok ? res.data : [];
}

export interface QcRescreenRef extends GynSpecimenRef {
  /** The viewer did the primary screen: someone else must do the rescreen. */
  ownPrimaryScreen: boolean;
}

/**
 * Every QC-flagged GYN specimen waiting for a rescreen, the viewer's own
 * primary screens marked. Batch 483: checks every GYN specimen on each
 * case (not just the first), then keeps one row per case.
 */
export async function loadQcRescreenQueue(viewerId: string): Promise<QcRescreenRef[]> {
  const matches: QcRescreenRef[] = [];
  for (const ref of await gynSpecimens()) {
    const sp = (ref.caseData.specimens ?? []).find(s => s.id === ref.specimenId) as { cytologyScreening?: { qcFlag?: Parameters<typeof resolveCytologyQcPoolMembership>[0] } } | undefined;
    const qcFlag = sp?.cytologyScreening?.qcFlag;
    if (!qcFlag) continue;
    const reviews = await reviewsFor(ref.specimenId);
    if (resolveCytologyQcPoolMembership(qcFlag, reviews)) matches.push({ ...ref, ownPrimaryScreen: isOwnPrimaryScreen(reviews, viewerId) });
  }
  return firstQualifyingSpecimenPerCase(matches);
}

/**
 * Positive GYN cases waiting for a pathologist: the open ones and the
 * viewer's own. Batch 483: checks every GYN specimen on each case (not
 * just the first), then keeps one row per case.
 */
export async function loadCytologyReviewTray(viewerId: string): Promise<Array<GynSpecimenRef & { state: Exclude<CytologyReviewTrayState, 'hidden'> }>> {
  const matches: Array<GynSpecimenRef & { state: Exclude<CytologyReviewTrayState, 'hidden'> }> = [];
  const isCytotech = await cytotechLookup();
  for (const ref of await gynSpecimens()) {
    const reviews = await reviewsFor(ref.specimenId);
    if (!awaitingPathologistReview(reviews, ref.caseData.status)) continue;
    const state = cytologyReviewTrayState(ref.caseData.participants, viewerId, staffContext(ref.caseData, isCytotech));
    if (state !== 'hidden') matches.push({ ...ref, state });
  }
  return firstQualifyingSpecimenPerCase(matches);
}

/**
 * A pathologist takes a positive GYN case: they become its primary (the
 * cytotechnologist stays on the case). Needs cytology:pathologist-review:take.
 */
export async function takeCytologyReview(caseId: string): Promise<ServiceResult<void>> {
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  if (!(await authorizationService.enforce('cytology:pathologist-review:take', { caseId })).allowed) return { ok: false, error: 'NOT_PERMITTED' };
  const { caseRouter } = await import('../cases/CaseRouter');
  const { readSessionProfile } = await import('../auth/sessionProfile');
  const { syncPrimaryAssignee } = await import('../cases/caseAssignmentSync');
  const { auditService } = await import('../auditlog/auditServiceInstance');
  const caseData = await caseRouter.getCase(caseId).catch(() => undefined);
  if (!caseData) return { ok: false, error: 'NOT_FOUND' };
  const me = readSessionProfile();
  const viewerId = me?.id ?? 'unknown';
  // Batch 483: a case can carry more than one GYN specimen; pick whichever
  // one is actually awaiting pathologist review, not just the case's first.
  const refsWithAwaiting = await Promise.all(
    (await gynSpecimens()).filter(r => r.caseData.id === caseId)
      .map(async r => ({ ref: r, awaiting: awaitingPathologistReview(await reviewsFor(r.specimenId), caseData.status) })),
  );
  const chosen = refsWithAwaiting.find(x => x.awaiting) ?? refsWithAwaiting[0];
  const awaiting = chosen?.awaiting ?? false;
  const ctx = staffContext(caseData, await cytotechLookup());
  const problem = takeCytologyReviewProblem(caseData.participants, viewerId, awaiting, ctx);
  if (problem) return { ok: false, error: problem };
  if (cytologyReviewTrayState(caseData.participants, viewerId, ctx) === 'open') {
    await caseRouter.updateCase(caseId, syncPrimaryAssignee(caseData, viewerId, viewerId, me?.name, ctx.isCytotech), caseVersionOf(caseData));
    auditService.logEvent({ type: 'user', event: 'CYTOLOGY_REVIEW_TAKEN', detail: 'Pathologist took a positive GYN cytology case for review from the Cytology Review tray.', user: viewerId, caseId, confidence: null }).catch(() => {});
  }
  return { ok: true, data: undefined };
}
