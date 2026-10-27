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
  aggregateCytologySpecimenFacts, cytologySpecimenScreeningFacts, cytologySpecimensOf, cytologyWorklistRow,
  effectiveCytologySettingsFor, latestCompletedAiResults,
  type CytologyRoutingInputs, type CytologyWorklistCase,
} from './cytologyWorklist';
import { resolveCaseCytologyWorklistMembership } from './resolveCaseCytologyWorklistMembership';
import { resolveCaseCytologyTriagePendingMembership } from './resolveCaseCytologyTriagePendingMembership';
import { resolveCaseCytologyScansCompletedMembership } from './resolveCaseCytologyScansCompletedMembership';
import { resolveCaseCytologyRecallNeededMembership } from './resolveCaseCytologyRecallNeededMembership';
import { recallIsFulfilled } from './selfCollectedRecallFulfilment';
import { recallKindOfSpecimens } from './selfCollectedRecall';
import { performingLabJurisdictionOf } from './recallJurisdiction';
import { resolveRecallWindowsFor, type RecallWindows } from './recallWindows';
import type { RecallWordingConfig } from './recallWording';
import { loadQcRescreenQueue } from './cytologyQueuesLive';
import { refreshCytologyHistologyCorrelationCandidatesLive } from './cytologyHistologyCorrelationLive';


export interface CytologyWorklistData {
  rows: CytologyWorklistCase[];
  qcRows: CytologyWorklistCase[];
  triageRows: Case[];
  scansCompletedRows: Case[];
  recallRows: Case[];
  /** Batch 631: the jurisdiction of each Recall needed case's performing lab (its recall wording and priority follow it). Absent when none can be resolved. */
  recallJurisdictionByCase: Record<string, string>;
  /** Batch 632, per country since Batch 640: the lab's target windows for a self-collected recall (recallWindows.ts). */
  recallWindows: Record<'AU' | 'NZ', RecallWindows>;
  /** Batch 640: wording the lab's administrator has written for the recall text (recallWording.ts). */
  recallWording: RecallWordingConfig;
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
  const { specimenDictionaryService } = await import('../specimenDictionary/specimenDictionaryServiceInstance');
  const { cytologyRoutingSettingsService } = await import('./cytologyRoutingSettingsServiceInstance');
  const { cytologyScreeningStrategyService } = await import('./cytologyScreeningStrategyServiceInstance');
  const { aiScreeningResultService } = await import('../digitalPathology/aiScreeningResultServiceInstance');
  const { facilityCytologyRoutingOverrideService } = await import('./facilityCytologyRoutingOverrideServiceInstance');
  const { facilityCytologyScreeningStrategyOverrideService } = await import('./facilityCytologyScreeningStrategyOverrideServiceInstance');
  const { cytologyInstrumentationService } = await import('./cytologyInstrumentationServiceInstance');
  const { wsiScanBatchService } = await import('../digitalPathology/wsiScanBatchServiceInstance');
  const { facilityService } = await import('../facilities/facilityServiceInstance');
  const { cytologyReviewRecordService } = await import('./cytologyReviewRecordServiceInstance');

  const [allCases, dictRes, enterpriseRes, enterpriseStrategyRes, aiRes, instrumentationRes, batchesRes] = await Promise.all([
    caseRouter.listCasesForUser(viewerId),
    specimenDictionaryService.getAll(),
    cytologyRoutingSettingsService.get(),
    cytologyScreeningStrategyService.get(),
    aiScreeningResultService.getAll(),
    cytologyInstrumentationService.get(),
    wsiScanBatchService.getAll(),
  ]);
  const dictionary = dictRes.ok ? dictRes.data : [];
  const dictById = new Map(dictionary.map(e => [e.id, e]));
  const aiByCase = latestCompletedAiResults(aiRes.ok ? aiRes.data : []);

  // Each facility's overrides, fetched once.
  const facilityIds = Array.from(new Set(allCases.map(c => c.order?.facilityId).filter((id): id is string => !!id)));
  const [routingOverrides, strategyOverrides] = await Promise.all([
    Promise.all(facilityIds.map(async id => [id, await facilityCytologyRoutingOverrideService.getForFacility(id)] as const)),
    Promise.all(facilityIds.map(async id => [id, await facilityCytologyScreeningStrategyOverrideService.getForFacility(id)] as const)),
  ]);
  const inputs: CytologyRoutingInputs = {
    enterpriseRouting: enterpriseRes.ok ? enterpriseRes.data : { nonGynCytologyRouting: 'surgical_pathology_worklist' as NonGynCytologyRouting },
    enterpriseStrategy: enterpriseStrategyRes.ok ? enterpriseStrategyRes.data : { screeningStrategy: 'co_testing' as const },
    routingOverrideByFacility: new Map(routingOverrides.map(([id, res]) => [id, res.ok ? res.data : null])),
    strategyOverrideByFacility: new Map(strategyOverrides.map(([id, res]) => [id, res.ok ? res.data : null])),
  };

  const member = (resolve: (specimens: any, dict: any, routing: NonGynCytologyRouting, strategy: any) => boolean) =>
    allCases.filter(c => { const s = effectiveCytologySettingsFor(c, inputs); return resolve(c.specimens as any, dictionary, s.routing, s.strategy); });

  // Batch 631: a recall is done once the same patient has a later clinician-collected cervical sample (or any repeat collection).
  const recallFulfilledFor = (c: Case) => recallIsFulfilled(c, recallKindOfSpecimens(c.specimens ?? undefined), allCases, dictionary);

  const modality = instrumentationRes.ok ? instrumentationRes.data.modality : 'wsi';
  const batches = batchesRes.ok ? batchesRes.data : [];

  const reviewsFor = async (specimenId: string) => {
    const res = await cytologyReviewRecordService.getBySpecimenId(specimenId);
    return res.ok ? res.data : [];
  };
  // Batch 483 (PS-359 tracker follow-up): a case can carry more than one
  // cytology/FNA specimen, and the one that's actually QC-flagged (or
  // awaiting histology correlation, or mid-decant, …) isn't necessarily
  // the first. Every cytology specimen's own flags are computed and then
  // OR-ed together (aggregateCytologySpecimenFacts), so the case still
  // surfaces correctly even when a later specimen is the one that
  // qualifies. `knownSpecimenId` — the QC/Rescreen queue already knows
  // exactly which specimen matched — picks that one as the row's
  // representative specimen (qcReason, specimenId) rather than
  // re-deriving a possibly different one.
  const toRow = async (c: Case, knownSpecimenId?: string): Promise<CytologyWorklistCase> => {
    const perSpecimen = await Promise.all(cytologySpecimensOf(c, dictById).map(async ({ specimen, entry }) => {
      const screening = specimen?.cytologyScreening;
      const reviews = specimen?.id && (screening?.qcFlag || screening?.postSignOutPeerReviewFlag) ? await reviewsFor(specimen.id) : [];
      return cytologySpecimenScreeningFacts(specimen, entry, reviews);
    }));
    const agg = aggregateCytologySpecimenFacts(perSpecimen, knownSpecimenId);
    return cytologyWorklistRow(c, agg.specimen, agg.entry, {
      isQcPending: agg.isQcPending,
      isRetrospectiveReviewPending: agg.isRetrospectiveReviewPending,
      isPostSignOutPeerReviewPending: agg.isPostSignOutPeerReviewPending,
      isHistologyCorrelationPending: agg.isHistologyCorrelationPending,
      isFollowUpDue: followUpDue.has(c.id),
      isCellBlockAncillaryPending: agg.isCellBlockAncillaryPending,
      isRoseActive: agg.isRoseActive,
      aiScreeningResult: aiByCase.get(c.id),
    });
  };

  const qcRefs = await loadQcRescreenQueue(viewerId);
  const [rows, qcRows] = await Promise.all([
    Promise.all(member(resolveCaseCytologyWorklistMembership).map(c => toRow(c))),
    Promise.all(qcRefs.map(async ref => ({ ...(await toRow(ref.caseData, ref.specimenId)), ownPrimaryScreen: ref.ownPrimaryScreen }))),
  ]);
  const facilitiesRes = await facilityService.getAll();
  const allFacilities = facilitiesRes.ok ? facilitiesRes.data : [];
  const recallRows = member(resolveCaseCytologyRecallNeededMembership).filter(c => !recallFulfilledFor(c));
  return {
    rows,
    qcRows,
    triageRows: member(resolveCaseCytologyTriagePendingMembership),
    scansCompletedRows: allCases.filter(c => resolveCaseCytologyScansCompletedMembership(c.id, c.specimens as any, batches, modality)),
    recallRows,
    recallWindows: Object.fromEntries((['AU', 'NZ'] as const).map(j => [j, resolveRecallWindowsFor(j, inputs.enterpriseStrategy.selfCollectedRecallWindowsByJurisdiction, inputs.enterpriseStrategy.selfCollectedRecallWindows)])) as Record<'AU' | 'NZ', RecallWindows>,
    recallWording: inputs.enterpriseStrategy.selfCollectedRecallWording ?? {},
    recallJurisdictionByCase: Object.fromEntries(recallRows.flatMap(c => { const j = performingLabJurisdictionOf(c.order?.facilityId, allFacilities); return j ? [[c.id, j]] : []; })),
  };
}
