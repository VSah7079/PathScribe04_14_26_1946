// src/services/cytology/cytologyWorklistLive.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 441: loads the Cytology Workspace worklist (decisions in
// cytologyWorklist.ts). Moved from CytologyWorklistPage.tsx's load().
// The viewer's cases (caseRouter.listCasesForUser), each routed by its
// facility's settings; the QC / Rescreen tile is the shared queue
// (loadQcRescreenQueue, Batch 440).
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { NonGynCytologyRouting } from './ICytologyRoutingSettingsService';
import {
  cytologySpecimenOf, cytologyWorklistRow, effectiveCytologySettingsFor, latestCompletedAiResults,
  type CytologyRoutingInputs, type CytologyWorklistCase,
} from './cytologyWorklist';
import { resolveCaseCytologyWorklistMembership } from './resolveCaseCytologyWorklistMembership';
import { resolveCaseCytologyTriagePendingMembership } from './resolveCaseCytologyTriagePendingMembership';
import { resolveCaseCytologyScansCompletedMembership } from './resolveCaseCytologyScansCompletedMembership';
import { resolveCaseCytologyRecallNeededMembership } from './resolveCaseCytologyRecallNeededMembership';
import { resolveCytologyQcPoolMembership } from './resolveCytologyQcPoolMembership';
import { resolveCytologyRetrospectiveReviewPoolMembership } from './resolveCytologyRetrospectiveReviewPoolMembership';
import { resolveCytologyPostSignOutPeerReviewPoolMembership } from './resolveCytologyPostSignOutPeerReviewPoolMembership';
import { resolveCytologyHistologyCorrelationPoolMembership } from './resolveCytologyHistologyCorrelationPoolMembership';
import { resolveCytologyDecantPendingMembership } from './resolveCytologyDecantPendingMembership';
import { resolveCytologyRoseActiveMembership } from './resolveCytologyRoseActiveMembership';
import { loadQcRescreenQueue } from './cytologyQueuesLive';
import { refreshCytologyHistologyCorrelationCandidatesLive } from './cytologyHistologyCorrelationLive';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CytologyWorklistData {
  rows: CytologyWorklistCase[];
  qcRows: CytologyWorklistCase[];
  triageRows: Case[];
  scansCompletedRows: Case[];
  recallRows: Case[];
}

export async function loadCytologyWorklist(viewerId: string): Promise<CytologyWorklistData> {
  // Batch 452 (PS-156): before the tiles are counted, look again for biopsies
  // that arrived after an abnormal Pap was signed out, so the Histology
  // Correlation tile includes them.
  await refreshCytologyHistologyCorrelationCandidatesLive();
  // Batch 454: cytology follow-ups due soon or overdue (the Follow-up due
  // tile), and any internal alerts now due, sent once each.
  const { loadFollowUpItems, sendFollowUpAlertsLive } = await import('../followUp/followUpLive');
  const { cytologyFollowUpCaseIds } = await import('../followUp/followUpTracking');
  void sendFollowUpAlertsLive().catch(() => undefined);
  const followUpDue = cytologyFollowUpCaseIds((await loadFollowUpItems().catch(() => ({ items: [] }))).items);
  const { caseRouter } = await import('../cases/CaseRouter');
  const { mockSpecimenDictionaryService } = await import('../specimenDictionary/mockSpecimenDictionaryService');
  const { mockCytologyRoutingSettingsService } = await import('./mockCytologyRoutingSettingsService');
  const { mockCytologyScreeningStrategyService } = await import('./mockCytologyScreeningStrategyService');
  const { mockAiScreeningResultService } = await import('../digitalPathology/mockAiScreeningResultService');
  const { mockFacilityCytologyRoutingOverrideService } = await import('./mockFacilityCytologyRoutingOverrideService');
  const { mockFacilityCytologyScreeningStrategyOverrideService } = await import('./mockFacilityCytologyScreeningStrategyOverrideService');
  const { mockCytologyInstrumentationService } = await import('./mockCytologyInstrumentationService');
  const { mockWsiScanBatchService } = await import('../digitalPathology/mockWsiScanBatchService');
  const { mockCytologyReviewRecordService } = await import('./mockCytologyReviewRecordService');

  const [allCases, dictRes, enterpriseRes, enterpriseStrategyRes, aiRes, instrumentationRes, batchesRes] = await Promise.all([
    caseRouter.listCasesForUser(viewerId),
    mockSpecimenDictionaryService.getAll(),
    mockCytologyRoutingSettingsService.get(),
    mockCytologyScreeningStrategyService.get(),
    mockAiScreeningResultService.getAll(),
    mockCytologyInstrumentationService.get(),
    mockWsiScanBatchService.getAll(),
  ]);
  const dictionary = dictRes.ok ? dictRes.data : [];
  const dictById = new Map(dictionary.map(e => [e.id, e]));
  const aiByCase = latestCompletedAiResults(aiRes.ok ? aiRes.data : []);

  // Each facility's overrides, fetched once.
  const facilityIds = Array.from(new Set(allCases.map(c => c.order?.facilityId).filter((id): id is string => !!id)));
  const [routingOverrides, strategyOverrides] = await Promise.all([
    Promise.all(facilityIds.map(async id => [id, await mockFacilityCytologyRoutingOverrideService.getForFacility(id)] as const)),
    Promise.all(facilityIds.map(async id => [id, await mockFacilityCytologyScreeningStrategyOverrideService.getForFacility(id)] as const)),
  ]);
  const inputs: CytologyRoutingInputs = {
    enterpriseRouting: enterpriseRes.ok ? enterpriseRes.data : { nonGynCytologyRouting: 'surgical_pathology_worklist' as NonGynCytologyRouting },
    enterpriseStrategy: enterpriseStrategyRes.ok ? enterpriseStrategyRes.data : { screeningStrategy: 'co_testing' as const },
    routingOverrideByFacility: new Map(routingOverrides.map(([id, res]) => [id, res.ok ? res.data : null])),
    strategyOverrideByFacility: new Map(strategyOverrides.map(([id, res]) => [id, res.ok ? res.data : null])),
  };

  const member = (resolve: (specimens: any, dict: any, routing: NonGynCytologyRouting, strategy: any) => boolean) =>
    allCases.filter(c => { const s = effectiveCytologySettingsFor(c, inputs); return resolve(c.specimens as any, dictionary, s.routing, s.strategy); });

  const modality = instrumentationRes.ok ? instrumentationRes.data.modality : 'wsi';
  const batches = batchesRes.ok ? batchesRes.data : [];

  const reviewsFor = async (specimenId: string) => {
    const res = await mockCytologyReviewRecordService.getBySpecimenId(specimenId);
    return res.ok ? res.data : [];
  };
  const toRow = async (c: Case): Promise<CytologyWorklistCase> => {
    const { specimen, entry } = cytologySpecimenOf(c, dictById);
    const screening = specimen?.cytologyScreening;
    const reviews = specimen?.id && (screening?.qcFlag || screening?.postSignOutPeerReviewFlag) ? await reviewsFor(specimen.id) : [];
    return cytologyWorklistRow(c, specimen, entry, {
      isQcPending: !!(specimen?.id && screening?.qcFlag) && resolveCytologyQcPoolMembership(screening.qcFlag, reviews),
      isRetrospectiveReviewPending: !!screening?.retrospectiveReviewFlag && resolveCytologyRetrospectiveReviewPoolMembership(screening.retrospectiveReviewFlag),
      isPostSignOutPeerReviewPending: !!(specimen?.id && screening?.postSignOutPeerReviewFlag) && resolveCytologyPostSignOutPeerReviewPoolMembership(screening.postSignOutPeerReviewFlag, reviews),
      isHistologyCorrelationPending: resolveCytologyHistologyCorrelationPoolMembership(screening?.histologyCorrelationCandidates),
      isFollowUpDue: followUpDue.has(c.id),
      isCellBlockAncillaryPending: resolveCytologyDecantPendingMembership(specimen?.decants),
      isRoseActive: resolveCytologyRoseActiveMembership(specimen?.roseEvaluations),
      aiScreeningResult: aiByCase.get(c.id),
    });
  };

  const qcRefs = await loadQcRescreenQueue(viewerId);
  const [rows, qcRows] = await Promise.all([
    Promise.all(member(resolveCaseCytologyWorklistMembership).map(toRow)),
    Promise.all(qcRefs.map(async ref => ({ ...(await toRow(ref.caseData)), ownPrimaryScreen: ref.ownPrimaryScreen }))),
  ]);
  return {
    rows,
    qcRows,
    triageRows: member(resolveCaseCytologyTriagePendingMembership),
    scansCompletedRows: allCases.filter(c => resolveCaseCytologyScansCompletedMembership(c.id, c.specimens as any, batches, modality)),
    recallRows: member(resolveCaseCytologyRecallNeededMembership),
  };
}
