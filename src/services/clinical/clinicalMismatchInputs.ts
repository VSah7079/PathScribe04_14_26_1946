// src/services/clinical/clinicalMismatchInputs.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 523 (PS-145, decision 15): what the clinical-pathologic mismatch check
// compares, for each place it runs, and whether it still needs running.
// Pure; the check itself is detectClinicalPathologicMismatch.ts. Clinical and
// narrative text only: no patient identifier is put into an input.
//
//   surgical — the order's indication and history against the microscopic
//              description, the diagnosis, and a confirmed malignancy
//              (as built in Batch 439).
//   cytology — the same clinical text against the specimen's final
//              interpretation(s) and comments. Malignant means a frank
//              malignancy (diagnostic rank 5, or a category marked
//              Malignant). Run on the pathologist track only: the
//              cytotechnologist track signs out negatives.
//   autopsy  — the clinical history and clinical cause of death (the order)
//              against the report sections (the final anatomic diagnoses
//              and findings) and the abnormal organ findings. At FAD only.
//
// A decision is recorded once per case (surgical, autopsy) or once per
// specimen (cytology, where each specimen is signed out on its own).
// ─────────────────────────────────────────────────────────────────────────────
import { evidenceFromFieldValues } from './clinicalMismatchDecision';
import type { Case } from '@/types/case/Case';
import type { CytologyCategoryEntry } from '../cytology/ICytologyCategoryService';
import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';
import { CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID } from '../quality/capaRecommendationRules';
import { malignantNow, caseSignedOut } from '../quality/peerReviewRules';
import { clinicalHistoryText } from './clinicalHistoryText';
import type { ClinicalMismatchInput, ClinicalMismatchKind } from './detectClinicalPathologicMismatch';

/** The longest findings text sent to the check. */
const MAX_FINDINGS = 6000;
const clip = (s: string) => (s.length > MAX_FINDINGS ? s.slice(0, MAX_FINDINGS) : s);

const clinicalOf = (c: Case) => ({
  clinicalIndication: c.order?.clinicalIndication ?? '',
  clinicalHistory: clinicalHistoryText(c.order?.clinicalHistory),
});

export function surgicalMismatchInput(c: Case): ClinicalMismatchInput {
  return {
    ...clinicalOf(c),
    microscopic: c.diagnostic?.microscopicDescription ?? '',
    diagnosis: c.diagnostic?.primaryDiagnosis ?? '',
    malignantNow: malignantNow(c),
    discipline: 'surgical',
  };
}

/** Frank malignancy: diagnostic rank 5, or a category marked Malignant. */
export const MALIGNANT_CYTOLOGY_RANK = 5;

export function cytologyMismatchInput(
  c: Case,
  finalReview: { primaryInterpretationId: string; primaryInterpretationComment?: string; additionalInterpretations?: { categoryId: string; comment?: string }[]; notes?: string },
  categories: readonly Pick<CytologyCategoryEntry, 'id' | 'label' | 'description' | 'diagnosticRank' | 'suggestedAbnormalSeverity'>[],
  gynScreening: boolean,
): ClinicalMismatchInput {
  const ids = [finalReview.primaryInterpretationId, ...(finalReview.additionalInterpretations ?? []).map(a => a.categoryId)];
  const chosen = ids.map(id => categories.find(e => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e);
  const comments = [finalReview.primaryInterpretationComment, ...(finalReview.additionalInterpretations ?? []).map(a => a.comment), finalReview.notes].filter(Boolean);
  return {
    ...clinicalOf(c),
    microscopic: clip(comments.join(' ')),
    diagnosis: chosen.map(e => e.description || e.label).join('; '),
    malignantNow: chosen.some(e => (e.diagnosticRank ?? 0) >= MALIGNANT_CYTOLOGY_RANK || e.suggestedAbnormalSeverity === 'Malignant'),
    discipline: 'cytology',
    gynScreening,
  };
}

/** `sections`: the report sections as on screen (the page saves them just before signing). */
export function autopsyMismatchInput(c: Case, sections?: readonly { label?: string; text?: string }[]): ClinicalMismatchInput {
  const reportSections = (sections ?? (c as { orchSections?: { label?: string; text?: string }[] }).orchSections ?? [])
    .filter(s => s.text?.trim())
    .map(s => `${s.label ?? ''}: ${s.text!.trim()}`);
  const organs = (c.autopsy?.organTags ?? [])
    .filter(t => t.status === 'abnormal' && t.finding?.trim())
    .map(t => `${t.organCode}: ${t.finding!.trim()}`);
  return {
    ...clinicalOf(c),
    microscopic: clip([...organs, c.diagnostic?.microscopicDescription ?? ''].filter(Boolean).join('; ')),
    diagnosis: clip([c.diagnostic?.primaryDiagnosis ?? '', ...reportSections].filter(Boolean).join('\n')),
    malignantNow: malignantNow(c),
    discipline: 'autopsy',
  };
}

/** Whether a decision is already recorded: for the specimen when one is named, else for the case. */
export function mismatchAlreadyDecided(records: readonly Pick<QaActivityRecord, 'caseId' | 'activityTypeId' | 'fieldValues'>[], caseId: string, specimenId?: string): boolean {
  return records.some(r => r.caseId === caseId && r.activityTypeId === CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID
    && (!specimenId || r.fieldValues?.specimenId === specimenId));
}

/** Batch 530 (PS-554): the deferred mismatches no secondary review has completed yet, oldest first (pure). */
export function mismatchesAwaitingSecondaryReview<R extends Pick<QaActivityRecord, 'id' | 'activityTypeId' | 'fieldValues' | 'recordedAt'>>(records: readonly R[]): R[] {
  const ofType = records.filter(r => r.activityTypeId === CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID);
  const reviewed = new Set(ofType.map(r => r.fieldValues?.reviewOf).filter((v): v is string => typeof v === 'string'));
  return ofType
    .filter(r => r.fieldValues?.resolutionStatus === 'DEFERRED' && !reviewed.has(r.id))
    .sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)));
}

/** Batch 530: the Specimen Dictionary entries of a case's specimens, for the mismatch rules. */
export function caseSpecimenTypeIds(c: Pick<Case, 'specimens'>): string[] {
  return (c.specimens ?? []).map(s => s.specimenDictionaryEntryId).filter((id): id is string => !!id);
}

/**
 * Batch 530 (PS-554, Gate A): what the report page checks in the background,
 * or null when there's nothing to check yet or any more: no diagnosis written,
 * the case already signed out, or (autopsy) before the PAD or after the FAD,
 * since the check runs for the FAD only.
 */
export function reportPageMismatchInput(c: Case, sections?: readonly { label?: string; text?: string }[]): ClinicalMismatchInput | null {
  if (caseSignedOut(c.status)) return null;
  if (c.autopsy) {
    if (!c.autopsy.padSnapshot || c.autopsy.fadSnapshot) return null;
    const input = autopsyMismatchInput(c, sections);
    return input.diagnosis.trim() ? input : null;
  }
  const input = surgicalMismatchInput(c);
  return input.diagnosis.trim() || input.microscopic.trim() ? input : null;
}

/** Batch 530: what the secondary review shows and records for a deferred mismatch (pure). */
export function deferredMismatchDetails(r: Pick<QaActivityRecord, 'id' | 'caseId' | 'caseType' | 'subspecialtyId' | 'fieldValues' | 'recordedAt' | 'recordedBy' | 'comments'>) {
  const v = r.fieldValues ?? {};
  const str = (k: string) => (typeof v[k] === 'string' ? (v[k] as string) : undefined);
  const kind = str('mismatchKind') as ClinicalMismatchKind | undefined;
  return {
    recordId: r.id,
    caseId: r.caseId,
    caseType: r.caseType,
    subspecialtyId: r.subspecialtyId,
    kind: kind ?? 'other',
    source: (str('suggestionSource') ?? 'ai') as 'ai' | 'rule' | 'pathologist',
    confidence: typeof v.suggestionConfidence === 'number' ? v.suggestionConfidence : undefined,
    clinicalIndication: str('clinicalIndication'),
    evidence: evidenceFromFieldValues(v), // Batch 685
    discipline: str('discipline') as ClinicalMismatchInput['discipline'],
    specimenId: str('specimenId'),
    deferredAt: r.recordedAt,
    deferredBy: r.recordedBy?.userName,
    note: r.comments,
  };
}

/**
 * Batch 530 (Pete, Oct 11, 2026: "flag rather than block"): with no clinical
 * indication and no clinical history there is nothing to compare, so the
 * mismatch check is deferred rather than run. Intake isn't blocked; the
 * report page says so, sign-out records it in the audit log
 * (CLINICAL_MISMATCH_CHECK_DEFERRED), and the clinical history can be added
 * later (recordClinicalHistoryAfterAccession). Pure.
 */
export function mismatchCheckDeferred(input: Pick<ClinicalMismatchInput, 'clinicalIndication' | 'clinicalHistory' | 'frozenImpression'>): boolean {
  // The same test the check itself makes (detectClinicalPathologicMismatch): a frozen-section impression counts.
  return !`${input.clinicalIndication}${input.clinicalHistory}${input.frozenImpression ?? ''}`.trim();
}

/** Batch 530: whether a case has any clinical information for the mismatch check (pure). */
export function caseHasClinicalInformation(c: Pick<Case, 'order'>): boolean {
  return !mismatchCheckDeferred(clinicalOf(c as Case));
}

/** Batch 530: the Specimen Dictionary types of a case's specimens, for the clinical history picker (pure). */
export function caseSpecimenTypeNames(c: Pick<Case, 'specimens'>, dictionary: readonly { id: string; type: string }[]): string[] {
  return [...new Set(caseSpecimenTypeIds(c).map(id => dictionary.find(e => e.id === id)?.type).filter((t): t is string => !!t))];
}

// ── Batch 531 (Pete, Oct 12: "If the diagnosis changes, the check should be rerun") ──

/**
 * A short fingerprint of what the check compared (the clinical text and the
 * findings), kept with each decision. A decision stands only for the text it
 * was made on: when the text changes, the check runs again. Pure (FNV-1a).
 */
export function mismatchInputFingerprint(input: Pick<ClinicalMismatchInput, 'clinicalIndication' | 'clinicalHistory' | 'frozenImpression' | 'microscopic' | 'diagnosis'>): string {
  const text = [input.clinicalIndication, input.clinicalHistory, input.frozenImpression ?? '', input.microscopic, input.diagnosis]
    .map(s => s.trim().replace(/\s+/g, ' ')).join('\u241E');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

type CorrelationRecord = Pick<QaActivityRecord, 'caseId' | 'activityTypeId' | 'fieldValues' | 'recordedAt'>;

/** The newest decision (or log entry) for the case, or for the specimen when one is named; null when none (pure). */
export function latestMismatchRecord<R extends CorrelationRecord>(records: readonly R[], caseId: string, specimenId?: string): R | null {
  const mine = records.filter(r => r.caseId === caseId && r.activityTypeId === CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID
    && (!specimenId || r.fieldValues?.specimenId === specimenId) && !r.fieldValues?.reviewOf);
  return mine.reduce<R | null>((newest, r) => (!newest || String(r.recordedAt) > String(newest.recordedAt) ? r : newest), null);
}

export type MismatchRecheck = 'decided' | 'recheck';

/**
 * Whether the check needs to run (pure). No earlier record → run. An
 * earlier record made on the same text → decided. Text changed since (or a
 * record from before Batch 531, with no fingerprint) → run again.
 */
export function mismatchRecheck(previous: CorrelationRecord | null, fingerprint: string): MismatchRecheck {
  if (!previous) return 'recheck';
  return previous.fieldValues?.inputFingerprint === fingerprint ? 'decided' : 'recheck';
}

/**
 * After a re-check of changed text: ask again only when the new suggestion is
 * worse than what was decided (rule 8: a typo fix doesn't re-prompt anyone).
 * Worse: a different kind of mismatch, or now high risk when it wasn't. Pure.
 */
export function mismatchWorseThanBefore(
  previous: CorrelationRecord | null,
  now: { kind: string; risk: 'suppressed' | 'low' | 'high' },
): boolean {
  if (!previous) return true;
  if (now.risk === 'suppressed') return false;
  const before = previous.fieldValues ?? {};
  if (before.mismatchKind !== now.kind) return true;
  return now.risk === 'high' && before.risk !== 'high';
}

