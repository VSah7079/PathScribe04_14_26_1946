// src/services/screeningRegistry/screeningRegistryEngine.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 414. The one engine every screening registry goes through, driven by
// its definition (screeningRegistryDefinitions.ts) and the lab's configuration
// (IScreeningRegistryConfigService). Pure: sign-out calls it, the settings
// screen shows its readiness, and the dispatch queue records what it decided.
//
//   eligible?   The registry takes this specimen (GYN only for every cervical
//               programme).
//   held?       It takes it, but it can't be sent correctly yet: the patient
//               identifier isn't the one the registry keys on (when the lab
//               requires it), or a coded field has no mapping while the lab
//               requires codes. A held
//               submission is queued and marked failed with the reason, so it
//               shows in the transmission audit and can be resent once fixed.
//               It is never sent half-coded.
//   payload     PathScribe's structured result (buildCytologyRegistryReportPayload,
//               with the built-in coders), plus the registry's programme,
//               wire format, patient identifier, and the lab's mapped codes.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { NationalPatientIdentifier } from '@/types/patient/NationalPatientIdentifier';
import { IDENTIFIER_FORMAT_LIBRARY } from '@/types/systemConfig';
import type { RegistryCodedField, ScreeningRegistryDefinition } from './screeningRegistryDefinitions';
import type { RegistryCodeMapping, ScreeningRegistryConfig } from './IScreeningRegistryConfigService';
import { buildCytologyRegistryReportPayload, type CytologyRegistryReportPayload } from '../cytology/buildCytologyRegistryReportPayload';

export type RegistryHoldReason = 'patientIdentifierFormat' | 'patientIdentifierChecksum' | 'patientIdentifierMissing' | 'unmappedCodes';

/** Batch 417: the patient fields the engine reads. */
export interface RegistryPatientInput {
  mrn?: string;
  nationalIdentifiers?: NationalPatientIdentifier[];
}

export interface RegistryPatientIdentifierResolution {
  formatId: string;
  value?: string;
  /** 'verified' from the national identifier's check digit; 'formatOnly' when only the MRN was there and it looks right;
   *  'failedChecksum' when the stored identifier failed; 'formatMismatch' when the MRN fallback doesn't look like one; 'missing' when nothing is there. */
  status: 'verified' | 'formatOnly' | 'failedChecksum' | 'formatMismatch' | 'missing';
  fromNationalIdentifier: boolean;
}

/** Batch 417 (SRS v2.1 FR-004): the identifier the registry keys on, from the
 *  patient's national identifiers first (its check digit already run), the MRN
 *  only as a format-checked fallback for records from before Batch 417. */
/** Batch 422: any registry definition with a patientIdentifierFormatId (screening or cancer). */
export function resolveRegistryPatientIdentifier(definition: { patientIdentifierFormatId?: string }, patient: RegistryPatientInput | undefined): RegistryPatientIdentifierResolution | undefined {
  const formatId = definition.patientIdentifierFormatId;
  if (!formatId) return undefined;
  const national = patient?.nationalIdentifiers?.find(i => i.system === formatId);
  if (national) {
    return {
      formatId, value: national.value, fromNationalIdentifier: true,
      status: national.verificationStatus === 'verified' ? 'verified' : national.verificationStatus === 'failedChecksum' ? 'failedChecksum' : 'formatOnly',
    };
  }
  const mrn = patient?.mrn?.trim();
  if (!mrn) return { formatId, status: 'missing', fromNationalIdentifier: false };
  const format = IDENTIFIER_FORMAT_LIBRARY.find(f => f.id === formatId);
  const looksRight = !format || new RegExp(format.pattern).test(mrn);
  return { formatId, value: mrn, status: looksRight ? 'formatOnly' : 'formatMismatch', fromNationalIdentifier: false };
}

/** The category ids a review uses, per coded field. */
export function codedCategoriesOf(review: Pick<CytologyReviewRecord, 'adequacySelections' | 'primaryInterpretationId' | 'additionalInterpretations' | 'recommendations'>): { field: RegistryCodedField; categoryId: string }[] {
  return [
    ...(review.adequacySelections ?? []).map(s => ({ field: 'adequacy' as const, categoryId: s.categoryId })),
    { field: 'primaryInterpretation' as const, categoryId: review.primaryInterpretationId },
    ...(review.additionalInterpretations ?? []).map(s => ({ field: 'additionalInterpretation' as const, categoryId: s.categoryId })),
    ...(review.recommendations ?? []).map(s => ({ field: 'recommendation' as const, categoryId: s.categoryId })),
  ];
}

const findMapping = (mappings: RegistryCodeMapping[], field: RegistryCodedField, categoryId: string) =>
  mappings.find(m => m.field === field && m.categoryId === categoryId && m.code.trim());

/** Does the patient carry the identifier the registry keys on, in a usable state? (No identifier required: yes.)
 *  Batch 417: a national identifier that passed its check digit, or the MRN looking like one for older records. */
export function patientIdentifierMatches(definition: ScreeningRegistryDefinition, patient: RegistryPatientInput | string | undefined): boolean {
  const r = resolveRegistryPatientIdentifier(definition, typeof patient === 'string' ? { mrn: patient } : patient);
  return !r || r.status === 'verified' || r.status === 'formatOnly';
}

export interface RegistrySubmissionDecision {
  eligible: boolean;
  holdReasons: RegistryHoldReason[];
  /** unmappedCodes: which field and category have no code. */
  unmapped: { field: RegistryCodedField; categoryId: string }[];
  mappedCodes: (RegistryCodeMapping & { field: RegistryCodedField })[];
}

export function decideRegistrySubmission(
  definition: ScreeningRegistryDefinition,
  config: ScreeningRegistryConfig,
  input: { isGynCytology: boolean; patientMrn?: string; patient?: RegistryPatientInput; review: Pick<CytologyReviewRecord, 'adequacySelections' | 'primaryInterpretationId' | 'additionalInterpretations' | 'recommendations'> },
): RegistrySubmissionDecision {
  if (definition.eligibility.gynOnly && !input.isGynCytology) return { eligible: false, holdReasons: [], unmapped: [], mappedCodes: [] };
  const holdReasons: RegistryHoldReason[] = [];
  if (config.requirePatientIdentifier) {
    const r = resolveRegistryPatientIdentifier(definition, input.patient ?? { mrn: input.patientMrn });
    if (r?.status === 'missing') holdReasons.push('patientIdentifierMissing');
    else if (r?.status === 'failedChecksum') holdReasons.push('patientIdentifierChecksum');
    else if (r?.status === 'formatMismatch') holdReasons.push('patientIdentifierFormat');
  }

  const used = codedCategoriesOf(input.review).filter(u => definition.codedFields.includes(u.field));
  const mappedCodes: RegistrySubmissionDecision['mappedCodes'] = [];
  const unmapped: RegistrySubmissionDecision['unmapped'] = [];
  for (const u of used) {
    const m = findMapping(config.codeMappings, u.field, u.categoryId);
    if (m) mappedCodes.push({ ...m, field: u.field }); else unmapped.push(u);
  }
  if (config.requireMappedCodes && unmapped.length) holdReasons.push('unmappedCodes');
  return { eligible: true, holdReasons, unmapped, mappedCodes };
}

/** What the settings screen shows: which of the lab's categories still need a code. */
export function registryConfigReadiness(
  definition: ScreeningRegistryDefinition,
  config: ScreeningRegistryConfig,
  categories: { id: string; section: string; usage?: string }[],
) {
  const fieldsFor = (c: { section: string; usage?: string }): RegistryCodedField[] =>
    c.section === 'adequacy' ? ['adequacy']
      : c.section === 'recommendation' ? ['recommendation']
        : c.section === 'interpretation_result'
          ? [...(c.usage !== 'secondary' ? ['primaryInterpretation' as const] : []), ...(c.usage !== 'primary' ? ['additionalInterpretation' as const] : [])]
          : [];
  const needed = categories.flatMap(c => fieldsFor(c).filter(f => definition.codedFields.includes(f)).map(field => ({ field, categoryId: c.id })));
  const missing = definition.resultCoding === 'builtIn' ? [] : needed.filter(n => !findMapping(config.codeMappings, n.field, n.categoryId));
  return {
    needed: needed.length,
    missing,
    /** Nothing will be held for missing codes. */
    ready: !config.requireMappedCodes || missing.length === 0,
  };
}

export interface ScreeningRegistryPayload extends CytologyRegistryReportPayload {
  programme: 'cervical';
  wireFormat: ScreeningRegistryDefinition['wireFormat'];
  /** The registry's national identifier: its value, whether it is usable, and (Batch 417) whether it came from the
   *  patient's verified national identifiers or is the MRN looking like one. */
  patientIdentifier?: { formatId: string; value?: string; matchesFormat: boolean; verification: RegistryPatientIdentifierResolution['status']; fromNationalIdentifier: boolean };
  mappedCodes: RegistrySubmissionDecision['mappedCodes'];
}

/** The payload: PathScribe's structured result with the built-in coders, plus the definition's and the lab's parts. */
export function buildScreeningRegistryPayload(
  definition: ScreeningRegistryDefinition,
  decision: RegistrySubmissionDecision,
  record: CytologySignOutRecord,
  context: {
    facilityId: string; facilityName?: string; reasonForStudy?: 'nhs_programme_invited' | 'private_or_opportunistic';
    primaryInterpretationId: string; isUnsatisfactory: boolean; additionalInterpretationIds?: string[];
    /** Batch 417: the case's patient, for the national identifier. Absent: the MRN in the record is used. */
    patient?: RegistryPatientInput;
  },
): ScreeningRegistryPayload {
  const base = buildCytologyRegistryReportPayload(
    record, definition.id, context.facilityId, context.facilityName, context.reasonForStudy,
    context.primaryInterpretationId, context.isUnsatisfactory, context.additionalInterpretationIds,
  );
  const resolved = resolveRegistryPatientIdentifier(definition, context.patient ?? { mrn: base.patient.mrn });
  return {
    ...base,
    programme: definition.programme,
    wireFormat: definition.wireFormat,
    ...(resolved ? { patientIdentifier: {
      formatId: resolved.formatId, value: resolved.value, matchesFormat: resolved.status === 'verified' || resolved.status === 'formatOnly',
      verification: resolved.status, fromNationalIdentifier: resolved.fromNationalIdentifier,
    } } : {}),
    mappedCodes: decision.mappedCodes,
  };
}

/** The English text stored on a held queue entry (a compliance record, not screen text). */
export function registryHoldMessage(decision: RegistrySubmissionDecision, definition: ScreeningRegistryDefinition): string {
  const parts: string[] = [];
  // Batch 421: the identifier's name (NHS Number), not its id (mrn_nhs): this text shows on the Registry Exceptions worklist.
  const identifier = IDENTIFIER_FORMAT_LIBRARY.find(f => f.id === definition.patientIdentifierFormatId)?.label ?? definition.patientIdentifierFormatId;
  if (decision.holdReasons.includes('patientIdentifierMissing')) {
    parts.push(`the patient has no ${identifier} recorded`);
  }
  if (decision.holdReasons.includes('patientIdentifierChecksum')) {
    parts.push(`the patient's ${identifier} failed its check digit`);
  }
  if (decision.holdReasons.includes('patientIdentifierFormat')) {
    parts.push(`the patient identifier is not a valid ${identifier} for this registry`);
  }
  if (decision.holdReasons.includes('unmappedCodes')) {
    parts.push(`no registry code is mapped for ${decision.unmapped.map(u => `${u.field} ${u.categoryId}`).join(', ')}`);
  }
  return `Held, not sent: ${parts.join('; ')}. Resend after fixing it in Configuration.`;
}

/** The settings screen's mapping table: one row per category and coded field the registry needs, with the lab's code. */
export function registryMappingRows(
  definition: ScreeningRegistryDefinition,
  config: ScreeningRegistryConfig,
  categories: { id: string; label: string; section: string; usage?: string; nomenclatureSystem?: string; active?: boolean }[],
) {
  const fieldsFor = (c: { section: string; usage?: string }): RegistryCodedField[] =>
    c.section === 'adequacy' ? ['adequacy']
      : c.section === 'recommendation' ? ['recommendation']
        : c.section === 'interpretation_result'
          ? [...(c.usage !== 'secondary' ? ['primaryInterpretation' as const] : []), ...(c.usage !== 'primary' ? ['additionalInterpretation' as const] : [])]
          : [];
  return categories.filter(c => c.active !== false).flatMap(c => fieldsFor(c).filter(f => definition.codedFields.includes(f)).map(field => {
    const m = config.codeMappings.find(x => x.field === field && x.categoryId === c.id);
    // The nomenclature's label key under cytologyCategoriesSection.nomenclatureSystems (bscc_rcpath → bsccRcpath).
    const nomenclatureLabelId = c.nomenclatureSystem?.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());
    return { field, categoryId: c.id, label: c.label, nomenclatureLabelId, code: m?.code ?? '', display: m?.display ?? '' };
  }));
}

/** A mapping row edited: the config with that row's code and display set (a blank code removes it on save). */
export function withRegistryMapping(config: ScreeningRegistryConfig, row: { field: RegistryCodedField; categoryId: string }, code: string, display: string): ScreeningRegistryConfig {
  const others = config.codeMappings.filter(m => !(m.field === row.field && m.categoryId === row.categoryId));
  return { ...config, codeMappings: [...others, { field: row.field, categoryId: row.categoryId, code, display: display || undefined }] };
}
