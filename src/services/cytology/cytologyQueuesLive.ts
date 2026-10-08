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
import { resolveCytologyQcPoolMembership } from './resolveCytologyQcPoolMembership';
import {
  awaitingPathologistReview, cytologyReviewTrayState, isOwnPrimaryScreen, takeCytologyReviewProblem,
  type CaseStaffContext, type CytologyReviewTrayState,
} from './cytologyQueues';

export interface GynSpecimenRef { caseData: Case; specimenId: string }

/** Each accessible case's GYN cytology specimen. */
async function gynSpecimens(): Promise<GynSpecimenRef[]> {
  const { caseRouter } = await import('../cases/CaseRouter');
  const { mockSpecimenDictionaryService } = await import('../specimenDictionary/mockSpecimenDictionaryService');
  const [casesRes, dictRes] = await Promise.all([caseRouter.getAll(undefined, { includeOrchestration: true }), mockSpecimenDictionaryService.getAll()]);
  if (!casesRes.ok) return [];
  const dictById = new Map((dictRes.ok ? dictRes.data : []).map(e => [e.id, e]));
  const out: GynSpecimenRef[] = [];
  for (const c of casesRes.data as Case[]) {
    for (const sp of (c.specimens ?? []) as Array<{ id: string; specimenDictionaryEntryId?: string }>) {
      const entry = sp.specimenDictionaryEntryId ? dictById.get(sp.specimenDictionaryEntryId) : undefined;
      if (resolveSpecimenEntryMatchesCategory(entry, ['GYN_CYTOLOGY'])) { out.push({ caseData: c, specimenId: sp.id }); break; }
    }
  }
  return out;
}

/** Batch 441: who on a case is a cytotech-only staff member, from the staff directory and role catalog. */
async function cytotechLookup(): Promise<(staffId: string) => boolean> {
  const { mockUserService } = await import('../users/mockUserService');
  const { mockRoleService } = await import('../roles/mockRoleService');
  const { isCytotechOnly } = await import('../participationTypes/cytotechParticipationRules');
  const [staffRes, rolesRes] = await Promise.all([mockUserService.getAll(), mockRoleService.getAll()]);
  const roles = rolesRes.ok ? rolesRes.data : [];
  const cytotechs = new Set((staffRes.ok ? staffRes.data : []).filter(u => isCytotechOnly(u.roles, roles)).map(u => u.id));
  return id => cytotechs.has(id);
}

const staffContext = (c: Case, isCytotech: (id: string) => boolean): CaseStaffContext => ({ isCytotech, assignedTo: c.order?.assignedTo ?? null });

async function reviewsFor(specimenId: string) {
  const { mockCytologyReviewRecordService } = await import('./mockCytologyReviewRecordService');
  const res = await mockCytologyReviewRecordService.getBySpecimenId(specimenId);
  return res.ok ? res.data : [];
}

export interface QcRescreenRef extends GynSpecimenRef {
  /** The viewer did the primary screen: someone else must do the rescreen. */
  ownPrimaryScreen: boolean;
}

/** Every QC-flagged GYN specimen waiting for a rescreen, the viewer's own primary screens marked. */
export async function loadQcRescreenQueue(viewerId: string): Promise<QcRescreenRef[]> {
  const out: QcRescreenRef[] = [];
  for (const ref of await gynSpecimens()) {
    const sp = (ref.caseData.specimens ?? []).find(s => s.id === ref.specimenId) as { cytologyScreening?: { qcFlag?: Parameters<typeof resolveCytologyQcPoolMembership>[0] } } | undefined;
    const qcFlag = sp?.cytologyScreening?.qcFlag;
    if (!qcFlag) continue;
    const reviews = await reviewsFor(ref.specimenId);
    if (resolveCytologyQcPoolMembership(qcFlag, reviews)) out.push({ ...ref, ownPrimaryScreen: isOwnPrimaryScreen(reviews, viewerId) });
  }
  return out;
}

/** Positive GYN cases waiting for a pathologist: the open ones and the viewer's own. */
export async function loadCytologyReviewTray(viewerId: string): Promise<Array<GynSpecimenRef & { state: Exclude<CytologyReviewTrayState, 'hidden'> }>> {
  const out: Array<GynSpecimenRef & { state: Exclude<CytologyReviewTrayState, 'hidden'> }> = [];
  const isCytotech = await cytotechLookup();
  for (const ref of await gynSpecimens()) {
    const reviews = await reviewsFor(ref.specimenId);
    if (!awaitingPathologistReview(reviews, ref.caseData.status)) continue;
    const state = cytologyReviewTrayState(ref.caseData.participants, viewerId, staffContext(ref.caseData, isCytotech));
    if (state !== 'hidden') out.push({ ...ref, state });
  }
  return out;
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
  const { mockAuditService } = await import('../auditlog/mockAuditService');
  const caseData = await caseRouter.getCase(caseId).catch(() => undefined);
  if (!caseData) return { ok: false, error: 'NOT_FOUND' };
  const me = readSessionProfile();
  const viewerId = me?.id ?? 'unknown';
  const ref = (await gynSpecimens()).find(r => r.caseData.id === caseId);
  const awaiting = !!ref && awaitingPathologistReview(await reviewsFor(ref.specimenId), caseData.status);
  const ctx = staffContext(caseData, await cytotechLookup());
  const problem = takeCytologyReviewProblem(caseData.participants, viewerId, awaiting, ctx);
  if (problem) return { ok: false, error: problem };
  if (cytologyReviewTrayState(caseData.participants, viewerId, ctx) === 'open') {
    await caseRouter.updateCase(caseId, syncPrimaryAssignee(caseData, viewerId, viewerId, me?.name, ctx.isCytotech), caseData.version);
    mockAuditService.logEvent({ type: 'user', event: 'CYTOLOGY_REVIEW_TAKEN', detail: 'Pathologist took a positive GYN cytology case for review from the Cytology Review tray.', user: viewerId, caseId, confidence: null }).catch(() => {});
  }
  return { ok: true, data: undefined };
}
