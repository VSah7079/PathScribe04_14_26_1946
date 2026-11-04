// src/services/cytology/cytologyWorkspaceView.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 410 (PS-359): what the Cytology Workspace (CytologyScreeningPage.tsx)
// shows, decided here instead of inline in the page: the category pickers,
// the synoptic translation check, each review's sign-out eligibility, the
// Sign Out panel, the on-screen 5-year lookback card, the HPV card, the AI
// concordance prompt, the workload banner, and the Code Manager's inputs.
// Pure: no services, no screen text (the page translates the keys returned).
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CytologyCategorySelection, CytologyReviewRecord, CytologyReviewRole } from '@/types/cytology/CytologyReviewRecord';
import type { CytologyCategoryEntry, CytologyNomenclatureSystem } from './ICytologyCategoryService';
import type { PathologyLexiconEntry, PathologyLexiconLocale } from '@/types/cytology/PathologyLexicon';
import type { ProviderCredential } from '@/types/staff/ProviderCredential';
import type { Jurisdiction } from '@/types/systemConfig';
import type { AiScreeningResult } from '@/types/digitalPathology/AiScreeningResult';
import type { PatientCytoHistoHistory } from './resolvePatientCytoHistoHistory';
import type { CytologyWorkloadCapacityStatus } from './resolveCytologyWorkloadCapacity';
import { resolveCytologySignOutGate, type CytologySignOutBlockReason, type CytologySignOutGateResult } from './resolveCytologySignOutGate';
import { resolveCanSignOutCytology } from './resolveCanSignOutCytology';
import { resolveCytologySynopticTemplateById } from './cytologySynopticTemplateRegistry';
import { resolveUnvalidatedTermKeysInAnswers, resolveTranslationAcknowledgmentIsCurrent } from './resolveSynopticTranslationValidation';
import { resolveCytologyFiveYearRetrospectiveLookback } from './resolveCytologyFiveYearRetrospectiveLookback';


// ── Category pickers ─────────────────────────────────────────────────────────

/** The review form's pick lists, from the case's nomenclature dictionary. */
export function cytologyCategoryOptions(categories: CytologyCategoryEntry[]) {
  const interpretation = (usage: 'primary' | 'secondary') => categories.filter(c =>
    c.section === 'interpretation_result' && (c.usage === usage || c.usage === 'both'));
  return {
    adequacy: categories.filter(c => c.section === 'adequacy'),
    generalCategorization: categories.filter(c => c.section === 'general_categorization'),
    primary: interpretation('primary'),
    recommendation: categories.filter(c => c.section === 'recommendation'),
    /** Additional interpretations: every secondary one except the chosen primary. */
    additionalExcluding: (primaryId: string) => interpretation('secondary').filter(c => c.id !== primaryId),
  };
}

/**
 * The text a category shows in review history and on the report: its
 * description (what labs fill in for that purpose), else "ABBR — Label", else
 * the label, else the stored id.
 */
export function cytologyCategoryLabel(categories: CytologyCategoryEntry[], id: string): string {
  const c = categories.find(x => x.id === id);
  if (!c) return id;
  return c.description ?? (c.abbreviation ? `${c.abbreviation} — ${c.label}` : c.label);
}

/** A review's selections as label + reviewer comment, for the history card. */
export function cytologySelectionEntries(selections: CytologyCategorySelection[] | undefined, categories: CytologyCategoryEntry[]) {
  return (selections ?? []).map(s => ({ label: cytologyCategoryLabel(categories, s.categoryId), comment: s.comment || undefined }));
}

// ── Sign-out eligibility ─────────────────────────────────────────────────────

/**
 * The synoptic translation check the sign-out gate takes, for one review.
 * Undefined when the review has no synoptic answers (GYN and CISOE-A reviews).
 * An English screen has nothing unvalidated.
 */
export function cytologySynopticTranslationCheck(
  review: Pick<CytologyReviewRecord, 'synopticData'>,
  uiLanguage: string,
  lexicon: PathologyLexiconEntry[],
): { hasUnvalidatedTerms: boolean; hasCurrentAcknowledgment: boolean } | undefined {
  if (!review.synopticData) return undefined;
  const template = resolveCytologySynopticTemplateById(review.synopticData.templateId);
  if (!template) return undefined;
  const locale = uiLanguage.split('-')[0];
  if (locale === 'en') return { hasUnvalidatedTerms: false, hasCurrentAcknowledgment: true };
  const unvalidated = resolveUnvalidatedTermKeysInAnswers(template, review.synopticData.answers, locale as PathologyLexiconLocale, lexicon);
  return {
    hasUnvalidatedTerms: unvalidated.length > 0,
    hasCurrentAcknowledgment: resolveTranslationAcknowledgmentIsCurrent(review.synopticData.translationValidationAcknowledgment as any, unvalidated),
  };
}

/** What the sign-out gate needs about the case and the person looking at it. */
export interface CytologyGateContext {
  isGynCytology: boolean;
  isFlaggedForQc: boolean;
  categories: CytologyCategoryEntry[];
  labJurisdiction: Jurisdiction;
  signingProviderCredentials: ProviderCredential[] | undefined;
  uiLanguage: string;
  pathologyLexicon: PathologyLexiconEntry[];
  isPathologist: boolean;
  /** Batch 412: an open "Requires revision" note on the specimen (blocks a cytotechnologist only). */
  pendingAuthorRevision?: boolean;
}

/**
 * One review's sign-out gate, and whether this user may sign it out (or set
 * it as the final diagnosis, which decides what gets signed out).
 */
export function cytologyReviewEligibility(review: CytologyReviewRecord, ctx: CytologyGateContext): { gate: CytologySignOutGateResult; authorized: boolean } {
  const gate = resolveCytologySignOutGate(
    { adequacyCategoryIds: review.adequacySelections?.map(s => s.categoryId), requiresPathologistReview: review.requiresPathologistReview },
    ctx.isGynCytology, ctx.isFlaggedForQc, ctx.categories, ctx.labJurisdiction, ctx.signingProviderCredentials, undefined,
    cytologySynopticTranslationCheck(review, ctx.uiLanguage, ctx.pathologyLexicon),
    !!ctx.pendingAuthorRevision,
  );
  return { gate, authorized: resolveCanSignOutCytology(ctx.isPathologist, gate) };
}

/** The Sign Out row before sign-out: ask for a final diagnosis, or say whether it can be signed (one flat shape). */
export function cytologySignOutPanel(
  finalDiagnosis: { reviewRecordId: string } | undefined,
  reviews: CytologyReviewRecord[],
  ctx: CytologyGateContext,
): { needsFinalDiagnosis: boolean; canSign: boolean; blockedReasons: CytologySignOutBlockReason[] } {
  if (!finalDiagnosis) return { needsFinalDiagnosis: true, canSign: false, blockedReasons: [] };
  const finalReview = reviews.find(r => r.id === finalDiagnosis.reviewRecordId);
  if (!finalReview) return { needsFinalDiagnosis: false, canSign: false, blockedReasons: [] };
  const { gate, authorized } = cytologyReviewEligibility(finalReview, ctx);
  return { needsFinalDiagnosis: false, canSign: authorized, blockedReasons: gate.blockedReasons };
}

// ── Who is reviewing ─────────────────────────────────────────────────────────

/** Admin, pathologist-admin and Superadmin accounts count as the pathologist track when not on the case. */
export function isAdminTierAccount(role: string | undefined): boolean {
  return role === 'admin' || role === 'pathologist-admin' || role === 'superadmin';
}

/** The role shown: the review being edited keeps its own role; a new one takes the resolved role. */
export function displayedReviewerRole(editingReviewId: string | null, reviews: CytologyReviewRecord[], resolvedRole: CytologyReviewRole): CytologyReviewRole {
  return (editingReviewId ? reviews.find(r => r.id === editingReviewId)?.role : undefined) ?? resolvedRole;
}

/**
 * The Synoptic drawer is for Non-GYN cases reported by a pathologist or an
 * advanced-certified CT, and never at a CISOE-A facility (CISOE-A covers
 * Non-GYN itself).
 */
export function showCytologySynopticTrigger(isGynCytology: boolean, nomenclature: CytologyNomenclatureSystem, isPathologist: boolean, hasAdvancedCert: boolean): boolean {
  return !isGynCytology && nomenclature !== 'palga_cisoea' && (isPathologist || hasAdvancedCert);
}

// ── Cards ────────────────────────────────────────────────────────────────────

/**
 * The on-screen CAP 5-year lookback card: when the diagnosis being entered is
 * high grade (rank 4+), the patient's earlier negative or low-grade Paps from
 * the last five years, with the accession and result from the history panel.
 * (Sign-out flags those cases for the 5-Year Lookback tile separately.)
 */
export function onScreenFiveYearLookback(
  categories: CytologyCategoryEntry[],
  primaryInterpretationId: string,
  history: PatientCytoHistoHistory | null,
  now: Date,
) {
  const rank = categories.find(c => c.id === primaryInterpretationId)?.diagnosticRank;
  if (rank === undefined || rank < 4 || !history) return [];
  const priors = history.priorCytologyResults
    .filter((r): r is typeof r & { reviewRecordId: string; specimenId: string } => !!r.reviewRecordId && !!r.specimenId);
  const flagged = resolveCytologyFiveYearRetrospectiveLookback(rank,
    priors.map(r => ({ id: r.reviewRecordId, caseId: r.caseId, specimenId: r.specimenId, recordedAt: r.date, diagnosticRank: r.diagnosticRank })), now);
  return flagged.map(item => {
    const source = priors.find(r => r.reviewRecordId === item.reviewId);
    return { reviewId: item.reviewId, caseId: item.caseId, recordedAt: item.recordedAt, accessionNumber: source?.accessionNumber ?? item.caseId, resultLabel: source?.resultLabel };
  });
}

export function hasPatientHistory(history: PatientCytoHistoHistory | null): history is PatientCytoHistoHistory {
  return !!history && (history.priorCytologyResults.length > 0 || history.priorSurgicalBiopsies.length > 0);
}

export interface CytologyHpvFields {
  hpvCoTestOrdered?: boolean;
  hpvResult?: string;
  hpvGenotypeDetail?: { hpv16: boolean; hpv18Or45: boolean; otherHighRisk: boolean };
  hpvOrderReason?: 'co_test' | 'ascus_reflex' | 'post_treatment_surveillance';
  hpvAbnormalFlag?: 'A' | 'N';
  hpvReferenceRange?: string;
}

/** The HPV co-testing card: what to show, as locale-key suffixes under cytologyScreening.hpv. */
export function cytologyHpvCard(hpv: CytologyHpvFields) {
  const positive = hpv.hpvResult === 'Positive';
  const d = hpv.hpvGenotypeDetail;
  return {
    hasAny: !!(hpv.hpvCoTestOrdered || hpv.hpvResult),
    positive,
    /** Only a reflex or surveillance order says why; a routine co-test doesn't. */
    reasonKey: hpv.hpvOrderReason === 'ascus_reflex' ? 'reasons.ascus_reflex'
      : hpv.hpvOrderReason === 'post_treatment_surveillance' ? 'reasons.post_treatment' : null,
    /** Genotypes, for a positive result with genotyping. Null: no genotype line. */
    genotypeKeys: positive && d
      ? (['hpv16', 'hpv18Or45', 'otherHighRisk'] as const).filter(k => d[k]).map(k => `genotypes.${k}`)
      : null,
  };
}

/** The AI concordance prompt's summary of what the AI reported. */
export function aiScreeningSummary(result: AiScreeningResult):
  { kind: 'triage'; reviewRecommended: boolean; group?: number; total?: number } | { kind: 'fov'; count: number } {
  const triage = result.slideTriage;
  if (!triage) return { kind: 'fov', count: result.findings.length };
  const ranked = triage.rankGroup != null && triage.totalRankGroups != null;
  return { kind: 'triage', reviewRecommended: !!triage.reviewRecommended, ...(ranked ? { group: triage.rankGroup!, total: triage.totalRankGroups! } : {}) };
}

/** The most recent completed AI screening result, or null. */
export function latestCompletedAiResult(results: AiScreeningResult[]): AiScreeningResult | null {
  const completed = results.filter(r => r.status === 'completed');
  return completed.length ? completed.reduce((a, b) => ((b.completedAt ?? '') > (a.completedAt ?? '') ? b : a)) : null;
}

/** Ask for the reviewer's concordance with the AI once, after their own finding is saved. */
export function shouldPromptAiConcordance(result: AiScreeningResult | null): boolean {
  return !!result && result.humanConcordant === undefined;
}

/** The workload banner: nothing when within capacity. SCU shown to one decimal in the user's locale. */
export function cytologyWorkloadBanner(status: CytologyWorkloadCapacityStatus | null, locale: string) {
  if (!status || status.status === 'ok') return null;
  const fmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return { level: status.status, used: fmt.format(status.candidateScu), max: fmt.format(status.maxAllowedScu) };
}

/** Histology correlation candidates still waiting: not recorded, not dismissed. */
export function openHistologyCorrelationCandidates(specimen: any): { candidateCaseId: string; detectedAt: string }[] {
  return ((specimen?.cytologyScreening?.histologyCorrelationCandidates ?? []) as { candidateCaseId: string; detectedAt: string; recordedActivityRecordId?: string; dismissedAsNotRelevant?: boolean }[])
    .filter(c => c.recordedActivityRecordId === undefined && !c.dismissedAsNotRelevant);
}

// ── Code Manager ─────────────────────────────────────────────────────────────

type CodeSystem = 'ICD' | 'SNOMED' | 'ICD-O' | 'CPT';
export interface CytologyExistingCode { id: string; system: CodeSystem; code: string; display: string; source: 'manual'; specimenId?: string }

/** The codes already on the case and its specimens, as the Code Manager lists them. */
export function cytologyExistingCodes(caseData: Case): CytologyExistingCode[] {
  const c = caseData as any;
  const described = (list: { code: string; description: string }[] | undefined, system: CodeSystem, prefix: string, specimenId: string) =>
    (list ?? []).map((x, i) => ({ id: `${prefix}-${specimenId}-${i}`, system, code: x.code, display: x.description, source: 'manual' as const, specimenId }));
  return [
    ...((c.coding?.icd10 ?? []) as string[]).map((code, i) => ({ id: `case-icd-${i}`, system: 'ICD' as const, code, display: code, source: 'manual' as const })),
    ...((c.coding?.snomed ?? []) as string[]).map((code, i) => ({ id: `case-snomed-${i}`, system: 'SNOMED' as const, code, display: code, source: 'manual' as const })),
    ...((c.specimens ?? []) as any[]).flatMap(sp => [
      ...described(sp.coding?.icd10, 'ICD', 'icd', sp.id),
      ...described(sp.coding?.snomed, 'SNOMED', 'snomed', sp.id),
      ...described(sp.coding?.icdO, 'ICD-O', 'icdo', sp.id),
      ...((sp.coding?.cpt ?? []) as string[]).map(code => ({ id: `cpt-${sp.id}-${code}`, system: 'CPT' as const, code, display: code, source: 'manual' as const, specimenId: sp.id })),
    ]),
  ];
}

/** The Code Manager's specimen list (the page words each name), and the one to target when there is only one. */
export function cytologyCodeSpecimens(caseData: Case) {
  const specimens = (caseData.specimens ?? []) as { id: string; label: string; description?: string }[];
  return {
    specimens: specimens.map((sp, i) => ({ index: i, id: i + 1, specimenId: sp.id, label: sp.label, description: sp.description ?? '' })),
    activeSpecimenIndex: specimens.length === 1 ? 0 : undefined,
  };
}

// ── Specimens (Batch 411) ────────────────────────────────────────────────────

export interface CytologyCaseProgress {
  /** More than one cytology specimen: the tabs and progress show. */
  multiSpecimen: boolean;
  signedOut: number;
  total: number;
  /** Some but not all signed out, and the case isn't final yet: offer early finalization. */
  canFinalizeEarly: boolean;
  earlyFinalization?: NonNullable<Case['cytologyEarlyFinalization']>;
}

/** The case's progress towards Final, from its cytology specimens' statuses. */
export function cytologyCaseProgress(tabs: { status: 'draft' | 'pendingRevision' | 'signedOut' }[], caseData: Pick<Case, 'status' | 'cytologyEarlyFinalization'> | null): CytologyCaseProgress {
  const signedOut = tabs.filter(t => t.status === 'signedOut').length;
  const total = tabs.length;
  return {
    multiSpecimen: total > 1,
    signedOut,
    total,
    canFinalizeEarly: signedOut > 0 && signedOut < total && caseData?.status !== 'finalized',
    ...(caseData?.cytologyEarlyFinalization ? { earlyFinalization: caseData.cytologyEarlyFinalization } : {}),
  };
}

// ── Review actions (Batch 412) ───────────────────────────────────────────────

/** What the signed-in user may do with one review in the history, before and after sign-out. */
export function cytologyReviewActions(
  review: Pick<CytologyReviewRecord, 'recordedBy'>,
  ctx: { userId?: string; isPathologist: boolean; specimenSignedOut: boolean; nomenclature: CytologyNomenclatureSystem },
) {
  const own = !!ctx.userId && review.recordedBy.userId === ctx.userId;
  return {
    isAuthor: own,
    /** Notes go on someone else's review, before sign-out. */
    canAddNote: !own && !ctx.specimenSignedOut,
    /** A pathologist revises another reviewer's review into their own and signs out (Bethesda-style forms only). */
    canReviseForSignOut: ctx.isPathologist && !own && !ctx.specimenSignedOut && ctx.nomenclature !== 'palga_cisoea',
  };
}
