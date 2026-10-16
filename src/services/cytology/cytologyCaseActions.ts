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

import { nextDecantLabel, type DecantChange } from '../material/materialTree';
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
import { saveCaseChangeFrom } from './cytologyCaseWriteDeps';


type Actor = { id: string; name: string };

/** The case's specimens with one specimen replaced by `change(specimen)`. */
function specimensWith(caseData: Case, specimenId: string, change: (sp: any) => any): any[] {
  return ((caseData.specimens ?? []) as any[]).map(sp => (sp.id === specimenId ? change(sp) : sp));
}

/** PS-71 (Batch 458): every Workspace case save goes through here. The
 *  change is built from the case the screen loaded and saved with its
 *  version; if someone saved since, it is rebuilt from the newer case and
 *  saved against that (saveCaseChangeFrom), never over their change. */
export function saveWorkspaceCaseChange(caseData: Case, change: (current: Case) => Partial<Case> | null, deps: Pick<CytologyWorkspaceDeps, 'getCase' | 'updateCase'>) {
  return saveCaseChangeFrom(caseData, change, { getCase: id => deps.getCase(id, 'current'), updateCase: deps.updateCase });
}

/** Merge a patch into one specimen's cytology screening record and save the
 *  case. PS-71 (Batch 458): a patch that depends on what the specimen holds
 *  (a list it adds to) is a function of the specimen, so a re-applied save
 *  starts from the newer case's list. */
export async function patchCytologyScreening(
  caseData: Case, specimenId: string,
  patch: Record<string, unknown> | ((specimen: any) => Record<string, unknown>),
  deps: Pick<CytologyWorkspaceDeps, 'getCase' | 'updateCase'>,
) {
  const saved = await saveWorkspaceCaseChange(caseData, current => ({
    specimens: specimensWith(current, specimenId, sp => ({ ...sp, cytologyScreening: { ...sp.cytologyScreening, ...(typeof patch === 'function' ? patch(sp) : patch) } })),
  }), deps);
  return (saved?.specimens ?? caseData.specimens) as any[];
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
    // Batch 450: the description of the mapping that set the rank (the most
    // severe matched code), not whichever matched entry the mapping lists first.
    const matched = mapping
      .filter((m: any) => snomed.some((s: { code: string }) => s.code === m.snomedCode))
      .reduce((best: any, m: any) => (!best || m.severityRank > best.severityRank ? m : best), undefined);
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
  await patchCytologyScreening(input.caseData, input.specimenId, sp => ({
    histologyCorrelationCandidates: candidatesOf(sp).map(c =>
      c.candidateCaseId === input.candidateCaseId ? { ...c, recordedActivityRecordId: created.data.id } : c),
  }), deps);
  return 'recorded';
}

/** A candidate that isn't the relevant biopsy: dismissed, with no QA record. */
export async function dismissHistologyCorrelationCandidate(
  input: { caseData: Case; specimenId: string; specimen: any; candidateCaseId: string },
  deps: CytologyWorkspaceDeps,
): Promise<'notPermitted' | 'dismissed'> {
  const decision = await deps.enforce('cytology:histology-correlation:record', { caseId: input.caseData.id });
  if (!decision.allowed) return 'notPermitted';
  await patchCytologyScreening(input.caseData, input.specimenId, sp => ({
    histologyCorrelationCandidates: candidatesOf(sp).map(c =>
      c.candidateCaseId === input.candidateCaseId ? { ...c, dismissedAsNotRelevant: true } : c),
  }), deps);
  return 'dismissed';
}

// ── Material, ROSE, codes, LMP ───────────────────────────────────────────────

/** Batch 453: why a decant change wasn't saved (the toast key's last part). */
export class CytologyDecantNotSaved extends Error {
  constructor(readonly reason: string, readonly currentVersion?: number) { super(`Decant change not saved: ${reason}`); }
}

/** Batch 453: one decant change through the atomic, versioned save when the
 *  deps provide it (published as MATERIAL_DECANTED), else the old whole-case
 *  write. Returns the new specimens; throws CytologyDecantNotSaved. */
async function saveDecant(caseData: Case, change: DecantChange, fallbackSpecimens: (current: Case) => any[], deps: CytologyWorkspaceDeps): Promise<any[]> {
  if (!deps.saveDecantChange) {
    // PS-71 (Batch 458): the whole-case write is versioned too, rebuilt from the newer case on a conflict.
    const saved = await saveWorkspaceCaseChange(caseData, current => ({ specimens: fallbackSpecimens(current) }), deps);
    return (saved?.specimens ?? []) as any[];
  }
  const result = await deps.saveDecantChange(caseData.id, change, (caseData as any).version ?? 0);
  if (result.ok === false) throw new CytologyDecantNotSaved(result.error, (result as any).currentVersion);
  deps.publishMaterialEvent?.({ type: 'MATERIAL_DECANTED', caseId: caseData.id, change: result.change, decant: result.event });
  return result.specimens;
}

/** Batch 460: the billing panel's change to one billable unit (a decant or a
 *  block) of a cytology specimen. A decant goes through the material save
 *  (versioned, published); a block is changed on the case as saved. The
 *  change is a function of the unit's codes, so it applies to the newer
 *  case's codes when someone saved in between. Returns the new specimens,
 *  and the case's new version from the material save. */
export async function saveCytologyUnitCoding(
  input: { caseData: Case; specimenId: string; unitId: string; change: (coding: any) => any },
  deps: CytologyWorkspaceDeps,
): Promise<{ specimens: any[]; version?: number }> {
  const { specimenId, unitId, change } = input;
  // The case as saved now (several changes can follow each other before the
  // screen re-renders, e.g. "Approve all" across decants).
  const caseData = ((await deps.getCase(input.caseData.id, 'current')) as Case | null) ?? input.caseData;
  const specimen = ((caseData.specimens ?? []) as any[]).find(sp => sp.id === specimenId);
  const decant = (specimen?.decants ?? []).find((d: any) => d.id === unitId);
  if (decant) {
    const patch = { coding: change(decant.coding) };
    if (deps.saveDecantChange) {
      const result = await deps.saveDecantChange(caseData.id, { kind: 'update', decantId: unitId, patch } as DecantChange, (caseData as any).version ?? 0);
      if (result.ok === false) throw new CytologyDecantNotSaved(result.error, (result as any).currentVersion);
      deps.publishMaterialEvent?.({ type: 'MATERIAL_DECANTED', caseId: caseData.id, change: result.change, decant: result.event });
      return { specimens: result.specimens, version: (result as any).version };
    }
    const specimens = await saveDecant(caseData, { kind: 'update', decantId: unitId, patch } as DecantChange, current =>
      specimensWith(current, specimenId, sp => ({ ...sp, decants: (sp.decants ?? []).map((d: any) => (d.id === unitId ? { ...d, coding: change(d.coding) } : d)) })), deps);
    return { specimens };
  }
  const saved = await saveWorkspaceCaseChange(caseData, current => ({
    specimens: specimensWith(current, specimenId, sp => ({ ...sp, blocks: (sp.blocks ?? []).map((b: any) => (b.id === unitId ? { ...b, coding: change(b.coding) } : b)) })),
  }), deps);
  return withSavedVersion(caseData.id, (saved?.specimens ?? []) as any[], deps);
}

/** The saved specimens with the case's version as saved now, so the screen's next save is checked against it. */
async function withSavedVersion(caseId: string, specimens: any[], deps: CytologyWorkspaceDeps): Promise<{ specimens: any[]; version?: number }> {
  const after = (await deps.getCase(caseId, 'current')) as Case | undefined;
  return { specimens: (after?.specimens as any[]) ?? specimens, version: after?.version };
}

/** Batch 460: the billing panel's change to the specimens (base codes, matrix
 *  codes), applied to the case as saved. Returns the new specimens and version. */
export async function saveCytologySpecimenBilling(input: { caseData: Case; change: (specimens: any[]) => any[] }, deps: CytologyWorkspaceDeps): Promise<{ specimens: any[]; version?: number }> {
  const saved = await saveWorkspaceCaseChange(input.caseData, current => ({ specimens: input.change((current.specimens ?? []) as any[]) }), deps);
  return withSavedVersion(input.caseData.id, (saved?.specimens ?? []) as any[], deps);
}

/** A residual fluid or cell block: labelled D1, D2…, with its cassette colour and display id. Returns the new specimens. */
export async function addCytologyDecant(
  input: { caseData: Case; specimen: any; decantType: DecantType; user: Actor },
  deps: CytologyWorkspaceDeps,
) {
  const { caseData, specimen } = input;
  const existing = specimen.decants ?? [];
  // Batch 453: never reuses a label after a decant was removed.
  const label = nextDecantLabel(existing);
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
  return saveDecant(caseData, { kind: 'add', specimenId: specimen.id, decant: decant as any },
    current => specimensWith(current, specimen.id, sp => ({ ...sp, decants: [...(sp.decants ?? []), decant] })), deps);
}

export async function updateCytologyDecantStains(
  input: { caseData: Case; specimen: any; decantId: string; stains: unknown[] },
  deps: CytologyWorkspaceDeps,
) {
  return saveDecant(input.caseData, { kind: 'update', decantId: input.decantId, patch: { stains: input.stains as any } }, current =>
    specimensWith(current, input.specimen.id, sp => ({
      ...sp, decants: (sp.decants ?? []).map((d: any) => (d.id === input.decantId ? { ...d, stains: input.stains } : d)),
    })), deps);
}

export async function recordCytologyRoseEvaluation(
  input: { caseData: Case; specimen: any; location: any; passes: any[]; user: Actor },
  deps: CytologyWorkspaceDeps,
) {
  const evaluation = { performedAt: deps.now().toISOString(), performedBy: { userId: input.user.id, userName: input.user.name }, location: input.location, passes: input.passes };
  const id = `rose-${deps.newId()}`;
  // PS-71 (Batch 458): added to the evaluations the saved case holds, with its version.
  const saved = await saveWorkspaceCaseChange(input.caseData, current => ({
    specimens: specimensWith(current, input.specimen.id, sp => ({ ...sp, roseEvaluations: resolveCytologyRoseEvaluationAdded(sp.roseEvaluations, evaluation, id) })),
  }), deps);
  return (saved?.specimens ?? []) as any[];
}

/**
 * Code Manager changes, per specimen (billing units are per specimen for
 * Non-GYN and FNA). Every added and removed code is audited. Returns the new
 * coding and specimens.
 */
export async function applyCytologyCodeChanges(input: { caseData: Case; codes: any[]; user: { id?: string; name?: string } }, deps: CytologyWorkspaceDeps) {
  const { caseData } = input;
  // PS-71 (Batch 458): the codes are applied to the case as saved, with its
  // version; on a conflict, to the newer case (the audit names what that save added and removed).
  let resolved!: ReturnType<typeof resolveUpdatedCodingFromModalSubmission>;
  await saveWorkspaceCaseChange(caseData, current => {
    resolved = resolveUpdatedCodingFromModalSubmission((current.specimens ?? []) as any[], input.codes);
    return { coding: resolved.newCoding, specimens: resolved.updatedSpecimens } as Partial<Case>;
  }, deps);
  const { newCoding, updatedSpecimens, additionsBySpecimen, removalsBySpecimen } = resolved;
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
  // PS-71 (Batch 458): versioned; the rest of the patient record comes from the case as saved.
  await saveWorkspaceCaseChange(input.caseData, current => ({ patient: { ...current.patient, lastMenstrualPeriod: input.lmp || undefined } as Case['patient'] }), deps);
}

/** The case's spelling language (PS-342). PS-71 (Batch 458): saved with
 *  the version the screen loaded, re-applied to the newer case on a conflict. */
export async function saveCytologySpellingLocaleOverride(input: { caseData: Case; locale: string | null }, deps: Pick<CytologyWorkspaceDeps, 'getCase' | 'updateCase'>) {
  await saveWorkspaceCaseChange(input.caseData, () => ({ spellingLocaleOverride: input.locale } as Partial<Case>), deps);
}

// ── Print ────────────────────────────────────────────────────────────────────

/**
 * The report to print. A signed-out specimen prints its latest signed record
 * exactly as signed; before sign-out, a preview from the final diagnosis's
 * review (or the initial screen). Null when there is nothing to print yet.
 * Batch 539: the PDF bytes, made by the report renderer; a preview carries the
 * PRELIMINARY — SUBJECT TO CHANGE watermark. Throws when it can't be made.
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
  const content = await cytologyReviewReportContent({ ...input, review }, deps);
  return deps.renderReportPdf(content, { preview: true });
}

/**
 * Batch 533: the report content from one review, as the workspace knows the
 * case (the print preview before sign-out, and an urgent preliminary report).
 * Signed by the review's author, at the review's time; the screener is the
 * specimen's primary screen, if any.
 */
export async function cytologyReviewReportContent(
  input: { caseData: Case; specimen: Parameters<typeof buildCytologyPrintDocument>[0]['specimen']; reviews: CytologyReviewRecord[]; review: CytologyReviewRecord; categories: CytologyCategoryEntry[]; isPathologist: boolean },
  deps: Pick<CytologyWorkspaceDeps, 'resolveReportLocale'>,
) {
  const { caseData, specimen, review } = input;
  const screened = input.reviews.find(r => r.role === 'primary_screen');
  const screening = specimen?.cytologyScreening ?? {};
  return resolveCytologyReportContent(
    review,
    input.categories,
    {
      name: caseData.patient ? `${caseData.patient.firstName ?? ''} ${caseData.patient.lastName ?? ''}`.trim() : 'Unknown Patient',
      dateOfBirth: caseData.patient?.dateOfBirth,
      mrn: caseData.patient?.mrn,
      lastMenstrualPeriod: caseData.patient?.lastMenstrualPeriod,
    },
    { accessionNumber: caseData.accession?.fullAccession ?? caseData.id, orderingProvider: caseData.order?.requestingProvider },
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
    await deps.resolveReportLocale(caseData.order?.facilityId),
  );
}

