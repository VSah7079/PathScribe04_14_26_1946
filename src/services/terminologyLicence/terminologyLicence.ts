// src/services/terminologyLicence/terminologyLicence.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 623 (PS-130). PathScribe never ships SNOMED CT or ICD-O-3 code sets. A customer that
// holds a licence records it here (Configuration > Terminology services), and from then on
// the real codes an admin has entered on an abnormal-result rule are used in place of the test
// codes. These are the pure rules; the screen only renders them and the save is checked by
// `config:terminology-licence:manage` (systemConfig/systemConfigChangeChecks.ts).
//
//   • A licence counts only while it is switched on AND has not expired (the expiry date is
//     the last valid day).
//   • Turning one on needs the holder, the edition and the licence reference, so the audit
//     trail can say whose licence the codes came from.
//   • A code is checked for shape only (SNOMED CT: 6-18 digits; ICD-O-3 morphology: 4 digits,
//     a slash and 1 digit). PathScribe cannot tell whether a well-shaped code is in the
//     customer's edition; that stays the customer's responsibility.
// ─────────────────────────────────────────────────────────────────────────────

import type { LicensedTerminologySystem, TerminologyLicence, TerminologyLicences } from '@app-types/config/EnterpriseConfig';
import type { LicensedCodingTerm } from '../abnormalDetection/IAbnormalTriggerRuleService';

export const LICENSED_SYSTEMS: LicensedTerminologySystem[] = ['SNOMED_CT', 'ICD_O_3'];

/** A coding term's system name → the licence that covers it. */
export const LICENCE_FOR_CODE_SYSTEM: Record<LicensedCodingTerm['system'], LicensedTerminologySystem> = {
  'SNOMED-CT': 'SNOMED_CT',
  'ICD-O-3': 'ICD_O_3',
};

export const EMPTY_LICENCE: TerminologyLicence = { enabled: false, holder: '', edition: '', reference: '', expiresOn: '' };

export type LicenceStatus = 'none' | 'active' | 'expired' | 'off';

/** YYYY-MM-DD of today in UTC (the day boundary the expiry date is compared against). */
export const todayIso = (now: Date = new Date()): string => now.toISOString().slice(0, 10);

export function licenceStatus(licence: TerminologyLicence | undefined, today: string): LicenceStatus {
  if (!licence) return 'none';
  if (!licence.enabled) return 'off';
  if (licence.expiresOn && today > licence.expiresOn) return 'expired';
  return 'active';
}

/** The licences that currently allow real codes. */
export function activeLicensedSystems(licences: TerminologyLicences | undefined, today: string): LicensedTerminologySystem[] {
  return LICENSED_SYSTEMS.filter(s => licenceStatus(licences?.[s], today) === 'active');
}

export type LicenceError = 'holderRequired' | 'editionRequired' | 'referenceRequired' | 'expiryInvalid';

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const isRealDate = (iso: string): boolean => {
  if (!DATE_SHAPE.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
};

/** Trims the draft and checks it. A licence that is off is stored as typed (nothing is required of it). */
export function validateLicenceDraft(draft: TerminologyLicence): { ok: true; licence: TerminologyLicence } | { ok: false; errors: LicenceError[] } {
  const licence: TerminologyLicence = {
    enabled: draft.enabled,
    holder: draft.holder.trim(), edition: draft.edition.trim(),
    reference: draft.reference.trim(), expiresOn: draft.expiresOn.trim(),
  };
  const errors: LicenceError[] = [];
  if (licence.expiresOn && !isRealDate(licence.expiresOn)) errors.push('expiryInvalid');
  if (licence.enabled) {
    if (!licence.holder) errors.push('holderRequired');
    if (!licence.edition) errors.push('editionRequired');
    if (!licence.reference) errors.push('referenceRequired');
  }
  return errors.length ? { ok: false, errors } : { ok: true, licence };
}

const CODE_SHAPE: Record<LicensedCodingTerm['system'], RegExp> = {
  'SNOMED-CT': /^\d{6,18}$/,
  'ICD-O-3': /^\d{4}\/\d$/,
};

export const isWellFormedCode = (system: LicensedCodingTerm['system'], code: string): boolean => CODE_SHAPE[system].test(code.trim());

export type RuleCodingError = 'snomedCodeInvalid' | 'icdo3CodeInvalid' | 'snomedDisplayRequired' | 'icdo3DisplayRequired';

export interface RuleCodingDraft {
  snomedCode: string; snomedDisplay: string;
  icdo3Code: string; icdo3Display: string;
}

export const EMPTY_RULE_CODING_DRAFT: RuleCodingDraft = { snomedCode: '', snomedDisplay: '', icdo3Code: '', icdo3Display: '' };

/** The form's two optional code pairs → the rule's licensedCoding (an empty pair is left out). */
export function parseRuleCoding(draft: RuleCodingDraft): { ok: true; coding: LicensedCodingTerm[] } | { ok: false; errors: RuleCodingError[] } {
  const coding: LicensedCodingTerm[] = [];
  const errors: RuleCodingError[] = [];
  const pairs: { system: LicensedCodingTerm['system']; code: string; display: string; badCode: RuleCodingError; noDisplay: RuleCodingError }[] = [
    { system: 'SNOMED-CT', code: draft.snomedCode.trim(), display: draft.snomedDisplay.trim(), badCode: 'snomedCodeInvalid', noDisplay: 'snomedDisplayRequired' },
    { system: 'ICD-O-3', code: draft.icdo3Code.trim(), display: draft.icdo3Display.trim(), badCode: 'icdo3CodeInvalid', noDisplay: 'icdo3DisplayRequired' },
  ];
  for (const p of pairs) {
    if (!p.code && !p.display) continue;
    if (!isWellFormedCode(p.system, p.code)) { errors.push(p.badCode); continue; }
    if (!p.display) { errors.push(p.noDisplay); continue; }
    coding.push({ system: p.system, code: p.code, display: p.display });
  }
  return errors.length ? { ok: false, errors } : { ok: true, coding };
}

/** A rule's stored coding → the form's fields. */
export function ruleCodingDraftOf(coding: LicensedCodingTerm[] | undefined): RuleCodingDraft {
  const snomed = coding?.find(c => c.system === 'SNOMED-CT');
  const icdo3 = coding?.find(c => c.system === 'ICD-O-3');
  return { snomedCode: snomed?.code ?? '', snomedDisplay: snomed?.display ?? '', icdo3Code: icdo3?.code ?? '', icdo3Display: icdo3?.display ?? '' };
}

/** Both licences at once, as the card saves them. A system left off and blank is not stored. */
export function validateLicences(drafts: Record<LicensedTerminologySystem, TerminologyLicence>):
  { ok: true; licences: TerminologyLicences } | { ok: false; errors: Partial<Record<LicensedTerminologySystem, LicenceError[]>> } {
  const licences: TerminologyLicences = {};
  const errors: Partial<Record<LicensedTerminologySystem, LicenceError[]>> = {};
  for (const system of LICENSED_SYSTEMS) {
    const checked = validateLicenceDraft(drafts[system]);
    if (!checked.ok) { errors[system] = checked.errors; continue; }
    const l = checked.licence;
    if (l.enabled || l.holder || l.edition || l.reference || l.expiresOn) licences[system] = l;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, licences };
}

/** The card's starting fields from what is stored. */
export const licenceDraftsOf = (licences: TerminologyLicences | undefined): Record<LicensedTerminologySystem, TerminologyLicence> => ({
  SNOMED_CT: { ...EMPTY_LICENCE, ...licences?.SNOMED_CT },
  ICD_O_3: { ...EMPTY_LICENCE, ...licences?.ICD_O_3 },
});
