// src/services/roles/builtInRoleText.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 513 (PS-269): the built-in roles' seeded descriptions.
//
// A role's description is stored data (admins can edit it), so the stored
// text is never translated. While a built-in role still carries the exact
// text PathScribe seeded, though, that text is ours, not the lab's, and the
// list shows it in the user's language through a locale key. Once an
// administrator edits it, their wording is shown as typed.
// ─────────────────────────────────────────────────────────────────────────────
import { SYSTEM_ROLE_IDS } from './systemRoles';

/** The English text each built-in role is seeded with, by role id. */
export const BUILT_IN_ROLE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  pathologist: 'Licensed pathologist with full clinical case access and sign-out authority.',
  resident: 'Pathology resident with case access and co-sign capability.',
  fellow: 'Subspecialty fellow with near-attending drafting autonomy. Manages cases independently through a complete draft report; attending still officially signs out.',
  pa: "Performs macroscopic examination, grossing, and specimen description. Distinct certified profession (PA(ASCP)/AAPA) — not the general-healthcare 'Physician Assistant.' No microscopic, diagnosis, or sign-out access.",
  [SYSTEM_ROLE_IDS.ADMIN]: 'System administrator with configuration access but no clinical case access.',
  physician: 'External ordering physician. Directory only — no app access.',
  'or-staff': "Operating room staff (RN, circulator, surgeon) using the Intraoperative Dashboard's quick-auth PIN. Directory only — no general app access.",
  [SYSTEM_ROLE_IDS.TEMPLATE_AUTHOR]: 'Drafts and edits synoptic templates and submits them for review. Cannot approve or publish.',
  [SYSTEM_ROLE_IDS.TEMPLATE_APPROVER]: 'Reviews, approves and publishes synoptic templates written by others.',
  [SYSTEM_ROLE_IDS.LAB_DIRECTOR]: 'Laboratory director. Signs off and publishes synoptic templates written by others.',
  [SYSTEM_ROLE_IDS.QA_REVIEWER]: "Exports quality-assurance reports and report change history. Given alongside a staff member's main role.",
  [SYSTEM_ROLE_IDS.ACCESSIONER]: 'Receives specimens and accessions new cases.',
  [SYSTEM_ROLE_IDS.HISTOTECHNOLOGIST]: 'Processes, embeds, cuts and stains tissue; runs histology batches and slide distribution.',
  [SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST]: 'Prepares and screens cytology specimens.',
  [SYSTEM_ROLE_IDS.MOLECULAR_TECHNOLOGIST]: 'Runs molecular testing: plates, racks and molecular batches.',
  [SYSTEM_ROLE_IDS.SUPERADMIN]: 'PathScribe platform support. Held only through a PathScribe support sign-in; cannot be given to staff.',
};

/** Locale key for each built-in role's seeded description (ids hold dashes,
 *  so the keys are spelled out rather than built from the id). */
const DESCRIPTION_KEY: Readonly<Record<string, string>> = {
  pathologist: 'roleDictionary.builtInDescriptions.pathologist',
  resident: 'roleDictionary.builtInDescriptions.resident',
  fellow: 'roleDictionary.builtInDescriptions.fellow',
  pa: 'roleDictionary.builtInDescriptions.pathologistsAssistant',
  [SYSTEM_ROLE_IDS.ADMIN]: 'roleDictionary.builtInDescriptions.admin',
  physician: 'roleDictionary.builtInDescriptions.physician',
  'or-staff': 'roleDictionary.builtInDescriptions.orStaff',
  [SYSTEM_ROLE_IDS.TEMPLATE_AUTHOR]: 'roleDictionary.builtInDescriptions.templateAuthor',
  [SYSTEM_ROLE_IDS.TEMPLATE_APPROVER]: 'roleDictionary.builtInDescriptions.templateApprover',
  [SYSTEM_ROLE_IDS.LAB_DIRECTOR]: 'roleDictionary.builtInDescriptions.labDirector',
  [SYSTEM_ROLE_IDS.QA_REVIEWER]: 'roleDictionary.builtInDescriptions.qaReviewer',
  [SYSTEM_ROLE_IDS.ACCESSIONER]: 'roleDictionary.builtInDescriptions.accessioner',
  [SYSTEM_ROLE_IDS.HISTOTECHNOLOGIST]: 'roleDictionary.builtInDescriptions.histotechnologist',
  [SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST]: 'roleDictionary.builtInDescriptions.cytotechnologist',
  [SYSTEM_ROLE_IDS.MOLECULAR_TECHNOLOGIST]: 'roleDictionary.builtInDescriptions.molecularTechnologist',
  [SYSTEM_ROLE_IDS.SUPERADMIN]: 'roleDictionary.builtInDescriptions.superadmin',
};

/** The locale key to show for a role's description, or null when the stored
 *  text should be shown as is (a custom role, or one an admin re-worded). */
export function builtInRoleDescriptionKey(role: { id: string; builtIn?: boolean; description?: string }): string | null {
  if (!role.builtIn) return null;
  const seeded = BUILT_IN_ROLE_DESCRIPTIONS[role.id];
  if (seeded === undefined || seeded !== role.description) return null;
  return DESCRIPTION_KEY[role.id] ?? null;
}

/** Every locale key above, for the locale-coverage test. */
export const BUILT_IN_ROLE_DESCRIPTION_KEYS: readonly string[] = Object.values(DESCRIPTION_KEY);
