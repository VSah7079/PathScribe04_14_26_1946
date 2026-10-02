// src/services/cytology/cytologyCaseActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 410 (PS-359; Pete: each gets its own permission, today's users keep
// it). The Cytology Workspace's other actions, moved out of
// CytologyScreeningPage.tsx so the page only renders and dispatches:
//
//   • choosing the final diagnosis     cytology:final-diagnosis:select (new),
//     and the same CT/pathologist gate the Sign Out button applies, because
//     the final diagnosis decides what gets signed out;
//   • flagging for high-risk QC        no permission (it only adds a check);
//   • removing a QC flag               cytology:qc-flag:remove (new): without
//     it a cytotechnologist could sign out without the mandatory rescreen;
//   • the 5-year lookback outcome      cytology:retrospective-review:record (new);
//   • recording or dismissing a cyto-histologic correlation
//                                      cytology:histology-correlation:record (new);
//   • the automatic correlation lookup, decants and their stains, ROSE
//     evaluations, Code Manager changes (each audited), the LMP, and the
//     report preview print.
//
// Each returns what happened; the page shows it. Stored names and audit text
// stay English (data and compliance records, not screen text).
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { DecantType } from '@/types/case/Material';
import type { CytologyCategoryEntry } from './ICytologyCategoryService';
import type { CytologyWorkspaceDeps } from './cytologyWorkspacePorts';
import { cytologyReviewEligibility, type CytologyGateContext } from './cytologyWorkspaceView';
import { resolveCytologyFinalDiagnosisSnapshot } from './resolveCytologyFinalDiagnosisSnapshot';
import { resolveCytologyHistologySeverityFromSnomed } from './resolveCytologyHistologySeverityFromSnomed';
import { resolveCytologyHistologyCorrelationOutcome, type CytologyHistologyCorrelationOutcome } from './resolveCytologyHistologyCorrelationOutcome';
import { resolveCytologyRoseEvaluationAdded } from './resolveCytologyRoseEvaluationAdded';
import { resolveUpdatedCodingFromModalSubmission } from './resolveUpdatedCodingFromModalSubmission';
import { resolveCytologyReportContent } from './resolveCytologyReportContent';
import { decantIdentifier } from '@/types/labels/LabelData';
import { CYTO_HISTO_CORRELATION_ACTIVITY_TYPE_ID } from '../quality/mockQaActivityTypeService';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Actor = { id: string; name: string };

/** The case's specimens with one specimen replaced by `change(specimen)`. */
function specimensWith(caseData: Case, specimenId: string, change: (sp: any) => any): any[] {
  return ((caseData.specimens ?? []) as any[]).map(sp => (sp.id === specimenId ? change(sp) : sp));
}

/** Merge a patch into one specimen's cytology screening record and save the case. */
export async function patchCytologyScreening(caseData: Case, specimenId: string, patch: Record<string, unknown>, deps: Pick<CytologyWorkspaceDeps, 'updateCase'>) {
  const specimens = specimensWith(caseData, specimenId, sp => ({ ...sp, cytologyScreening: { ...sp.cytologyScreening, ...patch } }));
  await deps.updateCase(caseData.id, { specimens });
  return specimens;
}

// ── Final diagnosis and QC ───────────────────────────────────────────────────

export async function selectCytologyFinalDiagnosis(
  input: { caseData: Case; specimenId: string; review: CytologyReviewRecord; user: Actor; gate: CytologyGateContext },
  deps: CytologyWorkspaceDeps,
): Promise<'notPermitted' | 'pathologistOnly' | 'selected'> {
  const decision = await deps.enforce('cytology:final-diagnosis:select', { caseId: input.caseData.id });
  if (!decision.allowed) return 'notPermitted';
  if (!cytologyReviewEligibility(input.review, input.gate).authorized) return 'pathologistOnly';
  await patchCytologyScreening(input.caseData, input.specimenId, {
    finalDiagnosis: { ...resolveCytologyFinalDiagnosisSnapshot(input.review), selectedBy: input.user.id, selectedByName: input.user.name, selectedAt: deps.now().toISOString() },
  }, deps);
  return 'selected';
}

/** A manual high-risk QC flag. Adding a check needs no permission. */
export async function flagCytologyForQc(input: { caseData: Case; specimenId: string; user: Actor }, deps: CytologyWorkspaceDeps) {
  await patchCytologyScreening(input.caseData, input.specimenId, {
    qcFlag: { reason: 'targeted_high_risk', flaggedBy: input.user.id, flaggedByName: input.user.name, flaggedAt: deps.now().toISOString() },
  }, deps);
}

/** Removing a QC flag (manual or automatic): needs the permission, and is audited. */
export async function removeCytologyQcFlag(
  input: { caseData: Case; specimenId: string; user: Actor; currentReason?: string },
  deps: CytologyWorkspaceDeps,
): Promise<'notPermitted' | 'removed'> {
  const decision = await deps.enforce('cytology:qc-flag:remove', { caseId: input.caseData.id });
  if (!decision.allowed) return 'notPermitted';
  await patchCytologyScreening(input.caseData, input.specimenId, { qcFlag: undefined }, deps);
  deps.logAudit({
    type: 'user', event: 'Cytology QC flag removed',
    detail: `QC flag${input.currentReason ? ` (${input.currentReason})` : ''} removed from specimen ${input.specimenId}`,
    user: input.user.name || input.user.id, caseId: input.caseData.accession?.fullAccession ?? input.caseData.id, confidence: null,
  });
  return 'removed';
}

// ── 5-year retrospective review ──────────────────────────────────────────────

export type CytologyRetrospectiveOutcome = 'confirmed_negative' | 'screening_error' | 'interpretation_error' | 'sampling_error';

export async function completeCytologyRetrospectiveReview(
  input: { caseData: Case; specimenId: string; flag: Record<string, unknown> | undefined; outcome: CytologyRetrospectiveOutcome | ''; correctiveAction: string; user: Actor },
  deps: CytologyWorkspaceDeps,
): Promise<'notPermitted' | 'incomplete' | 'recorded'> {
  if (!input.flag || !input.outcome) return 'incomplete';
  const decision = await deps.enforce('cytology:retrospective-review:record', { caseId: input.caseData.id });
  if (!decision.allowed) return 'notPermitted';
  await patchCytologyScreening(input.caseData, input.specimenId, {
    retrospectiveReviewFlag: {
      ...input.flag,
      outcome: input.outcome,
      correctiveAction: input.correctiveAction.trim() || undefined,
      reviewedBy: input.user.id, reviewedByName: input.user.name, reviewedAt: deps.now().toISOString(),
    },
  }, deps);
  return 'recorded';
}

// ── Cyto-histologic correlation ──────────────────────────────────────────────

export interface HistologyCorrelationResolution {
  cytologyDxLabel: string;
  histologyDxDescription?: string;
  outcome: CytologyHistologyCorrelationOutcome;
  cytologyRank?: number;
  histologyRank?: number;
}

type Candidate = { candidateCaseId: string; recordedActivityRecordId?: string; dismissedAsNotRelevant?: boolean };
const candidatesOf = (specimen: any): Candidate[] => specimen?.cytologyScreening?.histologyCorrelationCandidates ?? [];

/**
 * The automatic correlation for each unrecorded candidate: the candidate
 * case's SNOMED codes (every specimen: the relevant biopsy isn't known in
 * advance, and the highest resolvable severity wins) against the
 * admin-configured severity mapping, compared with the final diagnosis's rank.
 * Unresolvable until a mapping exists; never a made-up result.
 */
export async function resolveHistologyCorrelations(
  input: { specimen: any; categories: CytologyCategoryEntry[]; finalPrimaryInterpretationId?: string },
  deps: CytologyWorkspaceDeps,
): Promise<Record<string, HistologyCorrelationResolution>> {
  const open = candidatesOf(input.specimen).filter(c => c.recordedActivityRecordId === undefined);
  if (!open.length) return {};
  const finalCategory = input.categories.find(c => c.id === input.finalPrimaryInterpretationId);
  const mappingRes = await deps.getSnomedSeverityMapping();
  const mapping = mappingRes.ok ? mappingRes.data : [];
  const out: Record<string, HistologyCorrelationResolution> = {};
  for (const candidate of open) {
    const candidateCase = await deps.getCase(candidate.candidateCaseId, 'current');
    const snomed = ((candidateCase?.specimens ?? []) as any[]).flatMap(sp => sp.coding?.snomed ?? []);
    const histologyRank = resolveCytologyHistologySeverityFromSnomed(snomed, mapping);
    const matched = mapping.find((m: any) => snomed.some((s: { code: string }) => s.code === m.snomedCode));
    out[candidate.candidateCaseId] = {
      cytologyDxLabel: finalCategory?.label ?? 'Unknown',
      histologyDxDescription: matched?.description,
      outcome: resolveCytologyHistologyCorrelationOutcome(finalCategory?.diagnosticRank, histologyRank),
      cytologyRank: finalCategory?.diagnosticRank,
      histologyRank,
    };
  }
  return out;
}

export type HistologyCorrelationEntry =
  /** Confirming the automatic result. `unknownDiagnosis` is recorded when the mapping has no description. */
  | { kind: 'resolved'; resolution: HistologyCorrelationResolution; unknownDiagnosis: string }
  | { kind: 'manual'; histologyDx: string; outcome: 'concordant' | 'discordant'; cytologyRank?: number };

/**
 * Records the correlation as a "Cytology-Histology Correlation" QA activity.
 * The record's outcome is binary (minor and major discrepancies are both
 * discordant); the full magnitude and both severity ranks are kept in its
 * fields for the correlation report.
 */
export async function recordCytologyHistologyCorrelation(
  input: { caseData: Case; specimenId: string; specimen: any; candidateCaseId: string; categories: CytologyCategoryEntry[]; finalPrimaryInterpretationId?: string; entry: HistologyCorrelationEntry; user: Actor },
  deps: CytologyWorkspaceDeps,
): Promise<'notPermitted' | 'failed' | 'recorded'> {
  const decision = await deps.enforce('cytology:histology-correlation:record', { caseId: input.caseData.id });
  if (!decision.allowed) return 'notPermitted';
  const { entry } = input;
  const histologyDx = entry.kind === 'resolved' ? (entry.resolution.histologyDxDescription ?? entry.unknownDiagnosis) : entry.histologyDx;
  const outcome = entry.kind === 'resolved' ? (entry.resolution.outcome === 'concordant' ? 'concordant' : 'discordant') : entry.outcome;
  const magnitude = entry.kind === 'resolved' ? entry.resolution.outcome : undefined;
  const cytologyRank = entry.kind === 'resolved' ? entry.resolution.cytologyRank : entry.cytologyRank;
  const histologyRank = entry.kind === 'resolved' ? entry.resolution.histologyRank : undefined;

  const created = await deps.createQaActivity({
    activityTypeId: CYTO_HISTO_CORRELATION_ACTIVITY_TYPE_ID,
    caseId: input.caseData.id, specimenId: input.specimenId,
    caseType: input.specimen?.description || 'GYN Cytology',
    fieldValues: {
      cytologyDx: input.categories.find(c => c.id === input.finalPrimaryInterpretationId)?.label ?? 'Unknown',
      histologyDx,
      histologyCaseId: input.candidateCaseId,
      // Omitted (never a made-up 0) when unknown: a manual entry has no histology rank.
      ...(cytologyRank !== undefined ? { cytologyRank } : {}),
      ...(histologyRank !== undefined ? { histologyRank } : {}),
      ...(magnitude && magnitude !== 'concordant' ? { discrepancyMagnitude: magnitude } : {}),
    },
    outcome,
    recordedBy: { userId: input.user.id, userName: input.user.name },
  });
  if (!created.ok) return 'failed';
  await patchCytologyScreening(input.caseData, input.specimenId, {
    histologyCorrelationCandidates: candidatesOf(input.specimen).map(c =>
      c.candidateCaseId === input.candidateCaseId ? { ...c, recordedActivityRecordId: created.data.id } : c),
  }, deps);
  return 'recorded';
}

/** A candidate that isn't the relevant biopsy: dismissed, with no QA record. */
export async function dismissHistologyCorrelationCandidate(
  input: { caseData: Case; specimenId: string; specimen: any; candidateCaseId: string },
  deps: CytologyWorkspaceDeps,
): Promise<'notPermitted' | 'dismissed'> {
  const decision = await deps.enforce('cytology:histology-correlation:record', { caseId: input.caseData.id });
  if (!decision.allowed) return 'notPermitted';
  await patchCytologyScreening(input.caseData, input.specimenId, {
    histologyCorrelationCandidates: candidatesOf(input.specimen).map(c =>
      c.candidateCaseId === input.candidateCaseId ? { ...c, dismissedAsNotRelevant: true } : c),
  }, deps);
  return 'dismissed';
}

// ── Material, ROSE, codes, LMP ───────────────────────────────────────────────

/** A residual fluid or cell block: labelled D1, D2…, with its cassette colour and display id. Returns the new specimens. */
export async function addCytologyDecant(
  input: { caseData: Case; specimen: any; decantType: DecantType; user: Actor },
  deps: CytologyWorkspaceDeps,
) {
  const { caseData, specimen } = input;
  const existing = specimen.decants ?? [];
  const label = `D${existing.length + 1}`;
  const fullAccession = caseData.accession?.fullAccession;
  const decant = {
    id: `dcnt-${specimen.id}-${deps.newId()}`,
    label,
    decantType: input.decantType,
    stains: [],
    createdAt: deps.now().toISOString(),
    createdBy: input.user.name,
    displayId: fullAccession ? decantIdentifier(fullAccession, specimen.label, label) : undefined,
    cassetteColorId: await deps.resolveDecantCassetteColor(input.decantType, { priority: (caseData as any).order?.priority }),
  };
  const specimens = specimensWith(caseData, specimen.id, sp => ({ ...sp, decants: [...existing, decant] }));
  await deps.updateCase(caseData.id, { specimens });
  return specimens;
}

export async function updateCytologyDecantStains(
  input: { caseData: Case; specimen: any; decantId: string; stains: unknown[] },
  deps: CytologyWorkspaceDeps,
) {
  const decants = (input.specimen.decants ?? []).map((d: any) => (d.id === input.decantId ? { ...d, stains: input.stains } : d));
  const specimens = specimensWith(input.caseData, input.specimen.id, sp => ({ ...sp, decants }));
  await deps.updateCase(input.caseData.id, { specimens });
  return specimens;
}

export async function recordCytologyRoseEvaluation(
  input: { caseData: Case; specimen: any; location: any; passes: any[]; user: Actor },
  deps: CytologyWorkspaceDeps,
) {
  const evaluations = resolveCytologyRoseEvaluationAdded(
    input.specimen.roseEvaluations,
    { performedAt: deps.now().toISOString(), performedBy: { userId: input.user.id, userName: input.user.name }, location: input.location, passes: input.passes },
    `rose-${deps.newId()}`,
  );
  const specimens = specimensWith(input.caseData, input.specimen.id, sp => ({ ...sp, roseEvaluations: evaluations }));
  await deps.updateCase(input.caseData.id, { specimens });
  return specimens;
}

/**
 * Code Manager changes, per specimen (billing units are per specimen for
 * Non-GYN and FNA). Every added and removed code is audited. Returns the new
 * coding and specimens.
 */
export async function applyCytologyCodeChanges(input: { caseData: Case; codes: any[]; user: { id?: string; name?: string } }, deps: CytologyWorkspaceDeps) {
  const { caseData } = input;
  const { newCoding, updatedSpecimens, additionsBySpecimen, removalsBySpecimen } =
    resolveUpdatedCodingFromModalSubmission((caseData.specimens ?? []) as any[], input.codes);
  await deps.updateCase(caseData.id, { coding: newCoding, specimens: updatedSpecimens });
  const who = input.user.name ?? input.user.id ?? 'unknown';
  const caseRef = caseData.accession?.fullAccession ?? caseData.id;
  const label = (specId: string) => ((caseData.specimens ?? []) as any[]).find(s => s.id === specId)?.label ?? specId;
  for (const [specId, codes] of additionsBySpecimen) {
    deps.logAudit({ type: 'user', event: 'CPT code added (Code Manager)', detail: `${label(specId)}: ${codes.join(', ')} added`, user: who, caseId: caseRef, confidence: null });
  }
  for (const [specId, codes] of removalsBySpecimen) {
    deps.logAudit({ type: 'user', event: 'CPT code removed (Code Manager)', detail: `${label(specId)}: ${codes.join(', ')} removed`, user: who, caseId: caseRef, confidence: null });
  }
  return { coding: newCoding, specimens: updatedSpecimens };
}

/** The patient's last menstrual period (cleared when blank). */
export async function saveCytologyLastMenstrualPeriod(input: { caseData: Case; lmp: string }, deps: CytologyWorkspaceDeps) {
  await deps.updateCase(input.caseData.id, { patient: { ...input.caseData.patient, lastMenstrualPeriod: input.lmp || undefined } });
}

// ── Print ────────────────────────────────────────────────────────────────────

/**
 * The report to print. A signed-out specimen prints its latest signed record
 * exactly as signed; before sign-out, a preview from the final diagnosis's
 * review (or the initial screen). Null when there is nothing to print yet.
 */
export async function buildCytologyPrintDocument(
  input: { caseData: Case; specimen: any; specimenId: string; reviews: CytologyReviewRecord[]; categories: CytologyCategoryEntry[]; finalDiagnosisReviewId?: string; isPathologist: boolean },
  deps: CytologyWorkspaceDeps,
) {
  const signOutRes = await deps.getSignOutRecords(input.specimenId);
  const latest = signOutRes.ok && signOutRes.data.length
    ? [...signOutRes.data].sort((a, b) => b.signedAt.localeCompare(a.signedAt))[0] : undefined;
  if (latest) return deps.renderReportPdf(latest.reportContent);

  const screened = input.reviews.find(r => r.role === 'primary_screen');
  const signed = input.finalDiagnosisReviewId ? input.reviews.find(r => r.id === input.finalDiagnosisReviewId) : undefined;
  const review = signed ?? screened;
  if (!review) return null;
  const { caseData, specimen } = input;
  const screening = specimen?.cytologyScreening ?? {};
  const content = resolveCytologyReportContent(
    review,
    input.categories,
    {
      name: caseData.patient ? `${caseData.patient.firstName ?? ''} ${caseData.patient.lastName ?? ''}`.trim() : 'Unknown Patient',
      dateOfBirth: caseData.patient?.dateOfBirth,
      mrn: caseData.patient?.mrn,
      lastMenstrualPeriod: caseData.patient?.lastMenstrualPeriod,
    },
    { accessionNumber: caseData.accession?.fullAccession ?? caseData.id, orderingProvider: (caseData.order as any)?.requestingProvider },
    {
      typeDescription: specimen?.description ?? '',
      collectedAt: specimen?.collectedAt,
      receivedAt: specimen?.receivedAt,
      preparationMethod: screening.preparationMethod,
      computerAssistedScreening: screening.computerAssistedScreening,
      hpvResult: screening.hpvResult,
      hpvGenotypeDetail: screening.hpvGenotypeDetail,
      hpvOrderReason: screening.hpvOrderReason,
      educationalNotes: screening.educationalNotes,
    },
    screened ? { name: screened.recordedBy.userName } : undefined,
    { name: review.recordedBy.userName, isPathologist: input.isPathologist },
    review.recordedAt,
    await deps.resolveReportLocale((caseData.order as any)?.facilityId),
  );
  return deps.renderReportPdf(content);
}
