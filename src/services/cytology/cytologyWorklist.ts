// src/services/cytology/cytologyWorklist.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 441: the Cytology Workspace worklist's decisions, moved out of
// pages/CytologyWorklistPage/CytologyWorklistPage.tsx (which only renders
// now). Pure; the loader that fetches is cytologyWorklistLive.ts.
//
//   • Per case: the effective non-GYN routing and screening strategy
//     (enterprise default → facility override → the patient's age), then
//     which lists the case belongs on: screening (rows), HPV triage, recall
//     needed (self-collected positive), scans completed.
//   • Per row: the cytology specimen, GYN or not, organ site, and the
//     QA flags (QC, 5-year lookback, post-sign-out peer review, histology
//     correlation, cell block / ancillary, ROSE, CSMS verification, AI).
//   • The tabs: what My Worklist, Pool, QC / Rescreen and the QA tiles show
//     for a domain and organ-site filter, and their counts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { AiScreeningResult } from '@/types/digitalPathology/AiScreeningResult';
import type { NonGynCytologyRouting } from './ICytologyRoutingSettingsService';
import { resolveEffectiveCytologyRoutingSettings } from './resolveEffectiveCytologyRoutingSettings';
import { resolveEffectiveCytologyScreeningStrategy } from './resolveEffectiveCytologyScreeningStrategy';
import { resolveEffectiveCytologyScreeningStrategyForPatient } from './resolveEffectiveCytologyScreeningStrategyForPatient';
import { resolveAgeFromDateOfBirth } from './resolveAgeFromDateOfBirth';
import { resolveSpecimenEntryMatchesCategory } from '../specimenDictionary/resolveSpecimenEntryMatchesCategory';
import { resolveCytologyQcPoolMembership } from './resolveCytologyQcPoolMembership';
import { resolveCytologyRetrospectiveReviewPoolMembership } from './resolveCytologyRetrospectiveReviewPoolMembership';
import { resolveCytologyPostSignOutPeerReviewPoolMembership } from './resolveCytologyPostSignOutPeerReviewPoolMembership';
import { resolveCytologyHistologyCorrelationPoolMembership } from './resolveCytologyHistologyCorrelationPoolMembership';
import { resolveCytologyDecantPendingMembership } from './resolveCytologyDecantPendingMembership';
import { resolveCytologyRoseActiveMembership } from './resolveCytologyRoseActiveMembership';


export type CytologyWorklistTab =
  | 'assigned' | 'pool' | 'qc' | 'hpv_triage' | 'recall_needed' | 'csms_qa' | 'retrospective_lookback'
  | 'post_signout_peer_review' | 'histology_correlation' | 'scans_completed' | 'cell_block_ancillary_pending' | 'rose_active'
  | 'follow_up_due';
export type CytologyDomain = 'gyn' | 'non_gyn';

export interface CytologyWorklistCase {
  caseData: Case;
  specimenId: string | null;
  /** From the cytology specimen's dictionary entry (GYN_CYTOLOGY category). */
  isGynCytology: boolean;
  /** The dictionary entry's organ site (non-GYN), when configured. */
  organSite?: string;
  isQcPending: boolean;
  isRetrospectiveReviewPending: boolean;
  isPostSignOutPeerReviewPending: boolean;
  isHistologyCorrelationPending: boolean;
  /** Batch 454: the abnormal result's histology follow-up is due soon or overdue. */
  isFollowUpDue?: boolean;
  /** A decant on the cytology specimen still has an unfinished stain order. */
  isCellBlockAncillaryPending: boolean;
  /** A ROSE evaluation within the recent window. */
  isRoseActive: boolean;
  /** An active 'f36' flag (CSMS Eligibility Verification Needed). */
  isCsmsQaPending: boolean;
  /** The most recent completed AI screening result for the case. */
  aiScreeningResult?: AiScreeningResult;
  /** QC tile only (Batch 440): the viewer did the primary screen. */
  ownPrimaryScreen?: boolean;
  /** Any specimen on the case has a final diagnosis. */
  hasFinalDiagnosis: boolean;
  /** The cytology specimen's QC flag reason, when flagged. */
  qcReason?: string;
}

/** The settings the per-case routing needs. */
export interface CytologyRoutingInputs {
  enterpriseRouting: { nonGynCytologyRouting: NonGynCytologyRouting };
  enterpriseStrategy: any;
  routingOverrideByFacility: ReadonlyMap<string, any>;
  strategyOverrideByFacility: ReadonlyMap<string, any>;
}

/** The effective non-GYN routing and screening strategy for one case. */
export function effectiveCytologySettingsFor(c: Case, inputs: CytologyRoutingInputs): { routing: NonGynCytologyRouting; strategy: any } {
  const facilityId = c.order?.facilityId;
  const routingOverride = facilityId ? inputs.routingOverrideByFacility.get(facilityId) ?? null : null;
  const strategyOverride = facilityId ? inputs.strategyOverrideByFacility.get(facilityId) ?? null : null;
  const routing = resolveEffectiveCytologyRoutingSettings(inputs.enterpriseRouting as any, routingOverride).nonGynCytologyRouting;
  const facilityStrategy = resolveEffectiveCytologyScreeningStrategy(inputs.enterpriseStrategy, strategyOverride);
  const strategy = resolveEffectiveCytologyScreeningStrategyForPatient(facilityStrategy, resolveAgeFromDateOfBirth(c.patient?.dateOfBirth));
  return { routing, strategy };
}

/** The most recent completed AI screening result per case. */
export function latestCompletedAiResults(results: readonly AiScreeningResult[]): Map<string, AiScreeningResult> {
  const out = new Map<string, AiScreeningResult>();
  for (const r of results) {
    if (r.status !== 'completed') continue;
    const existing = out.get(r.caseId);
    if (!existing || (r.completedAt ?? '') > (existing.completedAt ?? '')) out.set(r.caseId, r);
  }
  return out;
}

/**
 * Every one of the case's cytology specimens (Cytology or FNA dictionary
 * entries), each with its dictionary entry.
 *
 * Batch 483 (PS-359 tracker follow-up — "Cytology: multi-specimen bug"):
 * this replaces the old `cytologySpecimenOf`, which returned only the
 * FIRST matching specimen on the case. A case can carry more than one
 * cytology/FNA specimen (two separate FNA sites, say); the first one's
 * screening state is not necessarily representative — its own QC flag,
 * retrospective-review flag, post-sign-out-peer-review flag, histology-
 * correlation candidates, pending decant or active ROSE evaluation could
 * all be on a SECOND specimen the old code never looked at, so that
 * specimen's state was silently invisible to every worklist tab and QA
 * tile. Callers aggregate across every specimen this returns
 * (`cytologySpecimenScreeningFacts` + `aggregateCytologySpecimenFacts`)
 * rather than picking just one up front.
 */
export function cytologySpecimensOf(c: Case, dictById: ReadonlyMap<string, any>): Array<{ specimen: any; entry: any }> {
  const out: Array<{ specimen: any; entry: any }> = [];
  for (const sp of (c.specimens ?? []) as any[]) {
    const entry = sp.specimenDictionaryEntryId ? dictById.get(sp.specimenDictionaryEntryId) : undefined;
    if (entry && (entry.type === 'Cytology' || entry.type === 'FNA')) out.push({ specimen: sp, entry });
  }
  return out;
}

/** One cytology specimen's own screening-derived worklist/QA flags. */
export interface CytologySpecimenScreeningFacts {
  specimen: any;
  entry: any;
  isQcPending: boolean;
  isRetrospectiveReviewPending: boolean;
  isPostSignOutPeerReviewPending: boolean;
  isHistologyCorrelationPending: boolean;
  isCellBlockAncillaryPending: boolean;
  isRoseActive: boolean;
}

/** `specimen`'s own flags, given its already-fetched QC/peer-review history (`reviewsFor` is a live concern). */
export function cytologySpecimenScreeningFacts(specimen: any, entry: any, reviews: readonly unknown[]): CytologySpecimenScreeningFacts {
  const screening = specimen?.cytologyScreening;
  return {
    specimen, entry,
    isQcPending: !!(specimen?.id && screening?.qcFlag) && resolveCytologyQcPoolMembership(screening.qcFlag, reviews as never),
    isRetrospectiveReviewPending: !!screening?.retrospectiveReviewFlag && resolveCytologyRetrospectiveReviewPoolMembership(screening.retrospectiveReviewFlag),
    isPostSignOutPeerReviewPending: !!(specimen?.id && screening?.postSignOutPeerReviewFlag) && resolveCytologyPostSignOutPeerReviewPoolMembership(screening.postSignOutPeerReviewFlag, reviews as never),
    isHistologyCorrelationPending: resolveCytologyHistologyCorrelationPoolMembership(screening?.histologyCorrelationCandidates),
    isCellBlockAncillaryPending: resolveCytologyDecantPendingMembership(specimen?.decants),
    isRoseActive: resolveCytologyRoseActiveMembership(specimen?.roseEvaluations),
  };
}

/**
 * ORs every specimen-level flag across the case's cytology specimens (so
 * the case surfaces on a tab/tile when ANY of its specimens qualifies),
 * and picks the specimen that should represent the row: `preferSpecimenId`
 * when given (the QC/Rescreen queue already knows which specimen actually
 * matched), else whichever specimen is itself QC-pending, else the first.
 */
export function aggregateCytologySpecimenFacts(
  perSpecimen: readonly CytologySpecimenScreeningFacts[],
  preferSpecimenId?: string,
): Omit<CytologySpecimenScreeningFacts, 'isQcPending'> & { isQcPending: boolean } {
  const representative = (preferSpecimenId ? perSpecimen.find(p => p.specimen?.id === preferSpecimenId) : undefined)
    ?? perSpecimen.find(p => p.isQcPending)
    ?? perSpecimen[0];
  return {
    specimen: representative?.specimen, entry: representative?.entry,
    isQcPending: perSpecimen.some(p => p.isQcPending),
    isRetrospectiveReviewPending: perSpecimen.some(p => p.isRetrospectiveReviewPending),
    isPostSignOutPeerReviewPending: perSpecimen.some(p => p.isPostSignOutPeerReviewPending),
    isHistologyCorrelationPending: perSpecimen.some(p => p.isHistologyCorrelationPending),
    isCellBlockAncillaryPending: perSpecimen.some(p => p.isCellBlockAncillaryPending),
    isRoseActive: perSpecimen.some(p => p.isRoseActive),
  };
}

/** The flags a row needs that come from outside the case (review history, AI). */
export interface CytologyRowFacts {
  isQcPending: boolean;
  isRetrospectiveReviewPending: boolean;
  isPostSignOutPeerReviewPending: boolean;
  isHistologyCorrelationPending: boolean;
  isFollowUpDue?: boolean;
  isCellBlockAncillaryPending: boolean;
  isRoseActive: boolean;
  aiScreeningResult?: AiScreeningResult;
}

export function cytologyWorklistRow(c: Case, specimen: any, entry: any, facts: CytologyRowFacts): CytologyWorklistCase {
  return {
    caseData: c,
    specimenId: specimen?.id ?? null,
    isGynCytology: resolveSpecimenEntryMatchesCategory(entry, ['GYN_CYTOLOGY']),
    organSite: entry?.organSite,
    ...facts,
    hasFinalDiagnosis: ((c.specimens ?? []) as any[]).some(sp => sp.cytologyScreening?.finalDiagnosis),
    qcReason: specimen?.cytologyScreening?.qcFlag?.reason,
    isCsmsQaPending: (((c as any).caseFlags ?? []) as any[]).some(f => f.flagDefinitionId === 'f36' && !f.deletedAt),
  };
}

/** Rows that belong to a primary tab rather than a QA tile. */
const onPrimaryTabs = (r: CytologyWorklistCase) =>
  !r.isQcPending && !r.isCsmsQaPending && !r.isRetrospectiveReviewPending && !r.isPostSignOutPeerReviewPending && !r.isHistologyCorrelationPending && !r.isFollowUpDue;

export interface CytologyWorklistView {
  /** What each tab lists (HPV triage, recall and scans list cases, not rows). */
  lists: Record<Exclude<CytologyWorklistTab, 'hpv_triage' | 'recall_needed' | 'scans_completed'>, CytologyWorklistCase[]>;
  counts: Record<CytologyWorklistTab, number>;
}

/**
 * The tabs for a domain (GYN / non-GYN) and an organ-site filter (non-GYN
 * only). The QA tiles (CSMS, lookback, peer review, histology correlation)
 * span both domains; QC / Rescreen is the shared GYN queue.
 */
export function cytologyWorklistView(
  input: {
    rows: readonly CytologyWorklistCase[]; qcRows: readonly CytologyWorklistCase[];
    triageCount: number; recallCount: number; scansCompletedCount: number;
  },
  domain: CytologyDomain, organSiteFilter: string | null, viewerId: string | undefined,
): CytologyWorklistView {
  const domainRows = input.rows
    .filter(r => r.isGynCytology === (domain === 'gyn'))
    .filter(r => domain === 'gyn' || !organSiteFilter || r.organSite === organSiteFilter);
  const lists = {
    assigned: domainRows.filter(r => r.caseData.order?.assignedTo === viewerId && onPrimaryTabs(r)),
    pool: domainRows.filter(r => r.caseData.status === 'pool' && onPrimaryTabs(r)),
    qc: domain === 'gyn' ? [...input.qcRows] : [],
    cell_block_ancillary_pending: domainRows.filter(r => r.isCellBlockAncillaryPending),
    rose_active: domainRows.filter(r => r.isRoseActive),
    csms_qa: input.rows.filter(r => r.isCsmsQaPending),
    retrospective_lookback: input.rows.filter(r => r.isRetrospectiveReviewPending),
    post_signout_peer_review: input.rows.filter(r => r.isPostSignOutPeerReviewPending),
    histology_correlation: input.rows.filter(r => r.isHistologyCorrelationPending),
    follow_up_due: input.rows.filter(r => !!r.isFollowUpDue),
  };
  const counts = {
    ...Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, v.length])),
    hpv_triage: input.triageCount, recall_needed: input.recallCount, scans_completed: input.scansCompletedCount,
  } as Record<CytologyWorklistTab, number>;
  return { lists, counts };
}

/** The organ sites present among the non-GYN rows (the quick-filter chips). */
export function availableOrganSites(rows: readonly CytologyWorklistCase[]): string[] {
  return Array.from(new Set(rows.filter(r => !r.isGynCytology && r.organSite).map(r => r.organSite as string)));
}

/**
 * The HPV result event an interface engine would deliver (Record Negative /
 * Record Positive simulate that delivery; no molecular platform is
 * connected in this environment). Null when the case has no dictionary
 * specimen.
 */
export function simulatedHpvResultEvent(c: Case, result: 'Positive' | 'Negative', messageId: string, timestamp: string) {
  const specimen = ((c.specimens ?? []) as any[]).find(sp => sp.specimenDictionaryEntryId);
  if (!specimen) return null;
  return {
    messageId,
    timestamp,
    organisationId: (c as any).originEnterpriseId ?? 'unknown',
    internalCaseId: c.id,
    accessionNumber: c.accession?.fullAccession ?? c.id,
    specimenLetter: specimen.label,
    hrHpvResult: result,
    abnormalFlag: result === 'Positive' ? 'A' as const : 'N' as const,
  };
}
