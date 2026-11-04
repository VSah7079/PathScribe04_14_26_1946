// src/services/staff/staffFormChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 528 (PS-359): what the Staff editor needs before it can save, from
// the organisation's Field Requirements (page `staff`). Moved here from
// StaffTab.tsx, where the check was hard-coded (first name, last name, a
// role). Pure.
//
//   - Required fields with no value are missing (the "Still required" list).
//   - A role is always required (locked): access comes from roles.
//   - An email address, when given, must look like one, required or not.
//   - Batch 544 (Pete, Oct 13, 2026: images and attachments are links only):
//     the signature, when given, must be an https:// link to the image in the
//     hospital's own system. A file saved earlier as a data: URL is refused,
//     so the editor asks for a link the next time the record is saved.
// ─────────────────────────────────────────────────────────────────────────────
import { missingRequiredFields, type ResolvedFieldRequirement } from '../fieldRequirements/fieldRequirementRules';
import { isHttpsLink } from '../links/externalLink';

/** The editor's values the requirements are checked against. */
export interface StaffFormValues {
  firstName: string;
  middleName: string;
  lastName: string;
  roles: readonly string[];
  subspecialtyIds: readonly string[];
  facilityIds: readonly string[];
  email: string;
  phone: string;
  credentials: string;
  npi: string;
  gmcNumber: string;
  license: string;
  signatureUrl: string;
}

export type StaffFormProblem = 'required' | 'atLeastOneRole' | 'invalidEmail' | 'invalidLink';

export interface StaffFormCheck {
  /** Field id (as in the Field Requirements catalog) → what is wrong with it. */
  problems: Partial<Record<string, StaffFormProblem>>;
  /** The required fields with no value, in catalog order. */
  missing: ResolvedFieldRequirement[];
}

// Batch 549: the link check is shared (services/links/externalLink.ts); re-exported for this file's callers.
export { isHttpsLink } from '../links/externalLink';

/**
 * The signature as the editor opens it. A signature saved before Batch 544 as
 * an image (a data: URL) or as anything else that isn't a link is not shown
 * as text: the field opens empty, saying a link is needed, so the record can
 * still be saved.
 */
export function signatureLinkOnOpen(stored: string | undefined): { value: string; needsLink: boolean } {
  const v = (stored ?? '').trim();
  if (!v) return { value: '', needsLink: false };
  return isHttpsLink(v) ? { value: v, needsLink: false } : { value: '', needsLink: true };
}

/** Whether the signature preview can be shown: only a valid link is loaded. */
export const signaturePreviewUrl = (value: string): string | undefined => (isHttpsLink(value) ? value.trim() : undefined);

const listValue = (v: readonly string[]) => (v.length ? 'set' : '');

export function staffFormValues(v: StaffFormValues): Record<string, unknown> {
  return {
    firstName: v.firstName, middleName: v.middleName, lastName: v.lastName,
    roles: listValue(v.roles), subspecialties: listValue(v.subspecialtyIds), facilities: listValue(v.facilityIds),
    email: v.email, phone: v.phone, credentials: v.credentials,
    npi: v.npi, gmcNumber: v.gmcNumber, license: v.license, signature: v.signatureUrl,
  };
}

export function checkStaffForm(v: StaffFormValues, requirements: readonly ResolvedFieldRequirement[]): StaffFormCheck {
  const missing = missingRequiredFields(requirements, staffFormValues(v));
  const problems: StaffFormCheck['problems'] = {};
  for (const f of missing) problems[f.id] = f.id === 'roles' ? 'atLeastOneRole' : 'required';
  if (v.email.trim() && !/\S+@\S+\.\S+/.test(v.email)) problems.email = 'invalidEmail';
  if (v.signatureUrl.trim() && !isHttpsLink(v.signatureUrl)) problems.signature = 'invalidLink';
  return { problems, missing };
}
