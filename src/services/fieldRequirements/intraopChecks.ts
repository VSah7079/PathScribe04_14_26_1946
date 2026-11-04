// src/services/fieldRequirements/intraopChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359, Batch 397. What the Intraop page's forms need before they act, per
// the organisation's Field Requirements (page "intraop"):
//   - starting a session (patient, OR, surgeon)   intraopSessionMissing
//   - saving a specimen from the capture form      intraopSpecimenMissing
//   - logging Quick Gross on a specimen card       intraopQuickGrossMissing
//   - skipping touch prep                          intraopTouchPrepSkipMissing
//   - logging the verbal report                    intraopVerbalReportMissing (Batch 399: structured)
//   - merging a session into its case              intraopMergeMissing
// The locked fields reproduce what each form already required; the rest are
// switches. Every path that acts (the button and its voice command) asks these.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { missingRequiredFields, resolveFieldRequirements, type FieldGroup, type ResolvedFieldRequirement } from './fieldRequirementRules';
import type { VerbalReportInput } from '@/types/intraop/IntraoperativeEntry';
import { SURGEON_UNAVAILABLE_OTHER, surgeonUnavailableNeeded, verbalReportProblems } from '../intraop/verbalReport';

const filled = (v: unknown): string => (typeof v === 'string' ? v.trim() : v ? 'yes' : '');
const NOT_APPLICABLE = 'notApplicable';
const inGroup = (requirements: readonly ResolvedFieldRequirement[], group: FieldGroup) => requirements.filter(f => f.group === group);

/** Before an organisation's settings load, the page's defaults apply. */
export const INTRAOP_DEFAULT_REQUIREMENTS: readonly ResolvedFieldRequirement[] = resolveFieldRequirements('intraop');

/** Whether an Intraop field is required (drives the "*" beside a label). */
export function intraopFieldRequired(requirements: readonly ResolvedFieldRequirement[], fieldId: string): boolean {
  return requirements.find(f => f.id === fieldId)?.required ?? false;
}

export interface IntraopSessionForm {
  patientName: string;
  mrn: string;
  patientConfirmed: boolean;
  dateOfBirth: string;
  /** The patient came from the hospital's ADT record: name and date of birth are theirs, not typed. */
  adtMatched: boolean;
  orNumber: string;
  surgeon: string;
  facilityId: string;
  locationId: string;
  /** The chosen facility has rooms to choose from. A location can't be required of a facility with none. */
  facilityHasLocations: boolean;
}

export function intraopSessionMissing(form: IntraopSessionForm, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'intraopSession'), {
    patientName: filled(form.patientName),
    mrn: filled(form.mrn),
    patientConfirmed: form.patientConfirmed ? 'yes' : '',
    // Asked only when the patient was typed in (no ADT match): an ADT record
    // may have no date of birth, and it can't be typed over.
    dateOfBirth: form.adtMatched ? NOT_APPLICABLE : filled(form.dateOfBirth),
    orNumber: filled(form.orNumber),
    surgeon: filled(form.surgeon),
    facility: filled(form.facilityId),
    location: form.facilityId && !form.facilityHasLocations ? NOT_APPLICABLE : filled(form.locationId),
  }).map(f => f.id);
}

export interface IntraopSpecimenForm {
  specimenLabel: string;
  quickGross: string;
  frozenDiagnosis: string;
  frozenCategory: string;
}

export function intraopSpecimenMissing(form: IntraopSpecimenForm, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'intraopSpecimen'), {
    specimenLabel: filled(form.specimenLabel),
    quickGross: filled(form.quickGross),
    frozenDiagnosis: filled(form.frozenDiagnosis),
    // A category is asked for only with a frozen diagnosis to categorise.
    frozenCategory: filled(form.frozenDiagnosis) ? filled(form.frozenCategory) : NOT_APPLICABLE,
  }).map(f => f.id);
}

/** Quick Gross logged on a specimen card after the session was saved. */
export function intraopQuickGrossMissing(quickGross: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'intraopSpecimen').filter(f => f.id === 'quickGross'), { quickGross: filled(quickGross) }).map(f => f.id);
}

/** Skipping touch prep: a note is asked for only with the "Other" reason. */
export function intraopTouchPrepSkipMissing(reason: string, note: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'intraopTouchPrep'), {
    touchPrepSkipNote: reason === 'other' ? filled(note) : NOT_APPLICABLE,
  }).map(f => f.id);
}

/**
 * The verbal report to the surgical team (Batch 399): who received it, their
 * role, the read-back, a "Surgeon unavailable" reason when a critical result
 * didn't go to the operating surgeon (and a note for "Other"), and the note
 * when the organisation requires one. The locked rules are
 * services/intraop/verbalReport.ts's, which the service enforces too.
 */
export function intraopVerbalReportMissing(input: VerbalReportInput, requirements: readonly ResolvedFieldRequirement[]): string[] {
  const locked = new Set(verbalReportProblems(input));
  const needsReason = surgeonUnavailableNeeded(input);
  const isOther = input.surgeonUnavailable?.reasonId === SURGEON_UNAVAILABLE_OTHER;
  return missingRequiredFields(inGroup(requirements, 'intraopReport'), {
    verbalReportRecipient: locked.has('verbalReportRecipient') ? '' : 'yes',
    verbalReportRole: locked.has('verbalReportRole') ? '' : 'yes',
    verbalReportReadBack: locked.has('verbalReportReadBack') ? '' : 'yes',
    surgeonUnavailableReason: !needsReason ? NOT_APPLICABLE : locked.has('surgeonUnavailableReason') ? '' : 'yes',
    surgeonUnavailableNote: !needsReason || !isOther ? NOT_APPLICABLE : locked.has('surgeonUnavailableNote') ? '' : 'yes',
    verbalReportNote: filled(input.note ?? ''),
  }).map(f => f.id);
}

export function intraopMergeMissing(caseId: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'intraopMerge'), { mergeCase: filled(caseId) }).map(f => f.id);
}
