// src/services/authorization/capabilitySeeds.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-355 (Batch 369): the capabilities built-in roles start with, and how
// they reach a site's stored role catalog.
//
// Day-one grants (Pete, Sep 28, 2026: least privilege):
//   Superadmin   every capability in the catalog (no bypass: it is a role)
//   Admin        report change-history export, every QA export, and (Batch
//                370) managing roles and staff and the full demo reset
//   QA Reviewer  the exports only
//   everyone else, Pathologist included: none. A pathologist with QA duties
//   is given QA Reviewer as well.
//   Batch 374: every built-in role (and a hospital's own roles) also starts
//   with the screens it opens (SCREEN_SEEDS, customRoleScreenSeed).
//   Batch 381: every role with case access (built-in or the hospital's own)
//   also starts with placing/releasing holds and delegating a case.
//   Batch 382: and, with Admin, Lab Director and QA Reviewer (who resolve
//   billing deficiencies), correcting an applied billing code, as its own
//   permission apart from case access (Pete: keep today's users).
//   Batch 403: Pathologist, Fellow and Resident (and a hospital's own roles
//   with case access) also start with placing add-on orders and approving
//   destructive cutting.
//   Batch 404: every role with the Batch Management screen (and a hospital's
//   own roles with case access) also starts with its three overrides.
//   Batch 405: every role with the Molecular screen (and a hospital's own
//   roles with case access) also starts with superseding a molecular run.
//   Batch 467: and with the molecular Order Queue's actions (assign to a
//   plate, cancel or re-route).
//   Batch 409: Pathologist, Fellow, Resident and Cytotechnologist (and a
//   hospital's own roles with case access) also start with signing out a
//   cytology specimen (Pete: keep today's users).
//   Batch 407: every role with the Batch Management screen (and a hospital's
//   own roles with case access) also starts with disposing of retained
//   material from the Disposal Queue and exporting the disposal report
//   (Pete: keep today's users).
//   Batch 428: the Configuration section capabilities (CONFIG_SECTIONS below):
//   Admin all; Lab Director all but drafting synoptic protocols; Template
//   Author and Template Approver only the protocol and template ones.
//   Batch 406: managing molecular assay control rules is an administration
//   capability, so Admin starts with it and nobody else does (Pete: "default
//   to admin but it remains an assignable permission", e.g. to Lab Director).
//
// Seeds are offered once. Each built-in role remembers which seed
// capabilities it has been offered (Role.seededCapabilities), so:
//   • a capability added to the catalog later reaches the built-in roles
//     on their next load;
//   • a capability an administrator removed from a built-in role stays
//     removed.
// Custom roles are offered only screens (Batch 374; customRoleScreenSeed).
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { ALL_CAPABILITY_KEYS, CAPABILITY_CATALOG } from './capabilityCatalog';
import { SYSTEM_ROLE_IDS } from '../roles/systemRoles';

const EXPORTS = CAPABILITY_CATALOG
  // Batch 438: only the qa: exports (qa:capa-recommendation:decide is not one; it comes with the Quality Assurance screen).
  .filter(c => c.key === 'report:change-history:export' || (c.key.startsWith('qa:') && c.key.endsWith(':export')))
  .map(c => c.key);

// PS-356 (Batch 370): managing roles and staff, and the full demo reset.
const ADMINISTRATION = CAPABILITY_CATALOG.filter(c => c.group === 'administration').map(c => c.key);

// Batch 428 (Pete, Oct 1, 2026): the Configuration section capabilities. Admin
// starts with all of them. Lab Director keeps everything it could change
// before: all of them except drafting synoptic protocols (a Template Author
// act it never had). Template Author and Template Approver keep only the
// protocol and template ones. A hospital's own roles get none until an
// administrator grants them (customRoleScreenSeed adds none).
const CONFIG_GROUPS: readonly string[] = [
  'configTemplates', 'configAi', 'configCytology', 'configLab', 'configQuality',
  'configOperations', 'configIntegrations', 'configBilling', 'configSystem',
];
export const CONFIG_SECTIONS = CAPABILITY_CATALOG.filter(c => CONFIG_GROUPS.includes(c.group)).map(c => c.key as string);
export const CONFIG_SECTIONS_LAB_DIRECTOR = CONFIG_SECTIONS.filter(k => k !== 'config:protocol:draft');
export const CONFIG_TEMPLATE_AUTHOR = ['config:protocol:draft', 'config:report-template:manage'];
// Batch 429 (Pete): recording equipment maintenance and calibration, for the bench roles too.
export const EQUIPMENT_MAINTENANCE = ['equipment:maintenance:record'];
const EQUIPMENT_MAINTENANCE_ROLES: string[] = [
  SYSTEM_ROLE_IDS.HISTOTECHNOLOGIST, SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST, SYSTEM_ROLE_IDS.MOLECULAR_TECHNOLOGIST,
];
export const CONFIG_TEMPLATE_APPROVER = ['config:protocol:approve', 'config:protocol:publish', 'config:protocol:retire', 'config:report-template:publish'];

// Batch 372: the hospital's control over support access. Seeded to Admin; a
// hospital can move them to a dedicated IT/security role.
const SUPPORT_ACCESS = CAPABILITY_CATALOG.filter(c => c.group === 'supportAccess').map(c => c.key);

// Batch 374: the screens each built-in role opens (Pete chose this matrix,
// Sep 28, 2026). The Home page and hubs show only these tiles.
const screens = (...names: string[]) => names.map(n => `screen:${n}:open`);
// Batch 421: and the Registry Exceptions worklist.
const QUALITY_COMPLIANCE = screens('audit-log', 'quality-assurance', 'registry-exceptions');
export const SCREEN_SEEDS: Readonly<Record<string, readonly string[]>> = {
  pathologist: screens('worklist', 'search', 'add-on-orders', 'intraop-queue', 'cytology-qc-queue', 'surgical-qa-worklist', 'my-contributions', 'cytology-workspace'),
  fellow:      screens('worklist', 'search', 'add-on-orders', 'intraop-queue', 'cytology-qc-queue', 'surgical-qa-worklist', 'my-contributions', 'cytology-workspace'),
  resident:    screens('worklist', 'search', 'add-on-orders', 'intraop-queue', 'my-contributions', 'cytology-workspace'),
  pa:          screens('accession', 'worklist', 'search', 'intraop-queue', 'embedding', 'my-contributions'),
  [SYSTEM_ROLE_IDS.ACCESSIONER]:            screens('accession', 'worklist', 'search'),
  [SYSTEM_ROLE_IDS.HISTOTECHNOLOGIST]:      screens('batch-management', 'embedding', 'microtomy', 'slide-distribution', 'search'),
  [SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST]:       screens('cytology-workspace', 'batch-management', 'search'),
  [SYSTEM_ROLE_IDS.MOLECULAR_TECHNOLOGIST]: screens('molecular', 'batch-management', 'search'),
  // Batch 434 (Pete): Admin also opens Batch Management (it couldn't see Slide
  // scanning). The screen only: the batch actions stay with the bench roles,
  // and an administrator can add them to any role in the Role Dictionary.
  [SYSTEM_ROLE_IDS.ADMIN]:             [...screens('configuration', 'batch-management'), ...QUALITY_COMPLIANCE],
  [SYSTEM_ROLE_IDS.TEMPLATE_AUTHOR]:   screens('configuration'),
  [SYSTEM_ROLE_IDS.TEMPLATE_APPROVER]: screens('configuration'),
  [SYSTEM_ROLE_IDS.LAB_DIRECTOR]:      [...screens('configuration', 'search', 'my-contributions'), ...QUALITY_COMPLIANCE],
  [SYSTEM_ROLE_IDS.QA_REVIEWER]:       QUALITY_COMPLIANCE,
};

const SCREEN_KEYS = CAPABILITY_CATALOG.filter(c => c.group === 'screens').map(c => c.key);

// Batch 382: correcting an applied billing code. Its own list, not part of
// CASE_REPORT_ACTIONS, so it can be taken off the clinical roles later.
const BILLING_CORRECTION = ['billing:applied-code:correct'];
// Batch 460 (Pete): reviewing a case's billing codes, for the same roles (nobody loses it).
const BILLING_REVIEW = ['billing:applied-code:review'];
// Batch 383: releasing an autopsy body, for the roles with case access.
const AUTOPSY_RELEASE = ['autopsy:body:release'];
// Batch 468: recording a forensic chain-of-custody transfer — seeded
// alongside AUTOPSY_RELEASE for the same case-access roles, since both
// are the same "handles the body/evidence" class of autopsy action.
const AUTOPSY_CUSTODY_TRANSFER = ['autopsy:custody:transfer'];
// Batch 469: narrowing/revoking consent, recording organ-retention
// disposal, and toxicology ordering/results — same "handles the
// body/evidence/consent" class of autopsy action, same roles.
const AUTOPSY_CONSENT_MANAGE = ['autopsy:consent:manage'];
const AUTOPSY_RETENTION_DISPOSAL = ['autopsy:retention-disposal:record'];
const AUTOPSY_TOXICOLOGY = ['autopsy:toxicology:order', 'autopsy:toxicology:result'];
// Batch 471 (PS-261 follow-up): cancelling a toxicology order,
// recording organ-retention detail, and reinstating consent — same
// "handles the body/evidence/consent" class of autopsy action, same
// roles as the rest of this group.
const AUTOPSY_TOXICOLOGY_CANCEL = ['autopsy:toxicology:cancel'];
const AUTOPSY_RETENTION_DETAIL = ['autopsy:retention-detail:record'];
const AUTOPSY_CONSENT_REINSTATE = ['autopsy:consent:reinstate'];
// Batch 478: per-organ tagging during the gross exam — ordinary clinical
// documentation, seeded alongside case:grossing:complete for the same
// GROSSERS (Pathologist, Fellow, Resident, PA), not the broader
// case-access group the consent/custody/retention actions above use.
// autopsy:gross-exam-gate:override starts with nobody (an administrator
// assigns it), same as cytology:qc-review:bypass — deliberately absent
// from every seed list below.
const AUTOPSY_ORGAN_TAG = ['autopsy:organ-tag:record'];
// Batch 480: recording a margin's ink application during grossing — same
// "ordinary clinical documentation, seeded to the roles that gross" posture
// as AUTOPSY_ORGAN_TAG above. config:inking-validation-mode:manage (the
// site-level WARN_ONLY/STRICT_ENFORCE toggle) is a group: 'configSystem'
// capability, so — unlike the true "nobody by default" actions above
// (cytology:qc-review:bypass, autopsy:gross-exam-gate:override, which are
// simply never spread into any seed constant) — it IS granted by default,
// via CONFIG_SECTIONS below, to Admin and (via CONFIG_SECTIONS_LAB_DIRECTOR)
// Lab Director, same as its siblings config:report-appearance:manage and
// config:organ-map-scheme:manage.
const GROSSING_MARGIN_INK = ['grossing:margin-ink:record'];
// Batch 385: sending messages and secure email, for every role (Pete: keep today's users).
const MESSAGING = ['message:internal:send', 'message:secure-email:send'];
// Batch 390 (PS-340): correcting or adding to a signed-out cytology report.
// Pathologist only: nobody had a screen for it before, and signing out a
// cytology diagnosis is already a pathologist act. A hospital's own roles get
// none until an administrator grants it.
const CYTOLOGY_REVISION = ['cytology:report:correct', 'cytology:report:addend'];
// Batch 411: finalizing a cytology case before every specimen is signed out.
// An override, so Pathologist only (least privilege); a hospital grants it to
// others in the Role Dictionary.
const CYTOLOGY_EARLY_FINALIZE = ['cytology:case:finalize'];
// Batch 409: signing out a cytology specimen, for the roles that sign out or
// release for countersign today (Pete: keep today's users). Cytotechnologists
// sign NILM GYN cases; residents go to countersign. A hospital's own roles
// with case access get it too. Batch 410: and the Cytology Workspace's other
// actions (recording a review, choosing the final diagnosis, removing a QC
// flag, the 5-year lookback outcome, cyto-histo correlation), for the same
// roles: the four that have the Cytology Workspace screen.
export const CYTOLOGY_SIGN_OUT = [
  'cytology:report:sign-out',
  'cytology:review:record', 'cytology:final-diagnosis:select', 'cytology:qc-flag:remove',
  'cytology:retrospective-review:record', 'cytology:histology-correlation:record',
  // Batch 412: requesting a revision of someone's review, for the same reviewers.
  'cytology:revision:request',
];
const CYTOLOGY_SIGN_OUT_ROLES = ['pathologist', 'fellow', 'resident', SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST as string];
// Batch 415: a cytotechnologist's own sign-out (negative GYN, advanced-CT
// exception), for the Cytotechnologist role and a hospital's own roles with
// case access (keep today's users). Remove it from the role where the
// country doesn't let cytotechnologists sign reports.
export const CYTOLOGY_CT_SIGN_OUT = ['cytology:ct-report:sign-out'];

// Batch 417: recording a patient's national identifier, for everyone who accessions (today's users keep it).
export const NATIONAL_IDENTIFIER_RECORD = ['patient:national-identifier:record'];
// Batch 418: and the patient's registry opt-outs.
export const REGISTRY_CONSENT_RECORD = ['patient:registry-consent:record'];
// Batch 421: resending a registry submission: Admin (administration group) and the Lab Director.
export const REGISTRY_RESEND = ['registry:submission:resend'];
// Batch 425: marking a registry revision reviewed, the same people who resend.
export const REGISTRY_REVISION_REVIEW = ['registry:revision:review'];
// Batch 423: approving a registry's go-live: Admin (administration group) and the Lab Director.
export const REGISTRY_GO_LIVE_APPROVE = ['registry:live-register:approve'];
// Batch 396: recording peer-review verdicts, for the roles that had the two
// review queues (Pathologist and Fellow), so nobody loses what they could do.
const PEER_REVIEW_VERDICTS = ['cytology:qc-review:record', 'surgical:qa-review:record'];
const PEER_REVIEW_ROLES = ['pathologist', 'fellow'];
// Batch 439 (PS-144, PS-145, PS-148): asking for a pre-sign-out peer review,
// deciding a clinical-pathologic mismatch suggestion and assessing an outside
// consult, for the roles that report cases. The independent read and the
// urgent-care override are the pathologist's alone.
export const PEER_REVIEW_CASE_ACTIONS = ['case:peer-review:request', 'case:clinical-mismatch:record', 'case:outside-consult:assess'];
export const PEER_REVIEW_PATHOLOGIST_ACTIONS = ['case:peer-review:record', 'case:peer-review:override'];
// Batch 440: taking a positive GYN case for pathologist review, for the roles that review cytology.
export const CYTOLOGY_REVIEW_TAKE = ['cytology:pathologist-review:take'];
// Batch 403: placing add-on orders and approving destructive cutting, for the
// roles that had the Add-On Orders screen (Pete: all three).
export const ADD_ON_ORDER_ACTIONS = ['add-on:order:place', 'add-on:exception:approve-destructive-cut'];
const ADD_ON_ORDER_ROLES = ['pathologist', 'fellow', 'resident'];
// Batch 404: Batch Management's overrides, for every role that has its screen
// (Pete: keep today's users).
export const BATCH_OVERRIDE_ACTIONS = ['batch:reconciliation:override', 'batch:run:abort', 'batch:cold-chain-excursion:acknowledge'];
// Batch 405: superseding a molecular run, for every role with the Molecular screen.
export const MOLECULAR_SUPERSEDE = ['molecular:batch:supersede'];
// Batch 467: the in-house molecular Order Queue's actions, for the same roles.
export const MOLECULAR_ORDER_ACTIONS = ['molecular:order:assign-plate', 'molecular:order:cancel', 'molecular:order:set-lab'];
// Batch 432 (Pete): resolving Audit Log errors, for everyone who opens the
// Audit Log (Admin, Lab Director, QA Reviewer); referral transit status for
// every role with the Batch Management screen. The Cytology QC supervisor
// bypass (cytology:qc-review:bypass) starts with nobody: an administrator
// assigns it, and holding it opens the Cytology QC queue for the override.
export const AUDIT_ERROR_RESOLVE = ['audit:error:resolve'];
// Batch 437 (PS-282, PS-357): the exports, for the roles that open the screen
// they sit on (keep today's users).
export const AUDIT_LOG_EXPORTS = ['audit:audit-log:export', 'audit:error-log:export', 'audit:interface-log:export', 'audit:qa-log:export', 'audit:billing-log:export'];
export const CASE_SEARCH_EXPORT = ['search:case-results:export'];
export const CONTRIBUTION_EXPORTS = ['contribution:trainee-case-reference:export', 'contribution:case-mix-summary:export'];
// Batch 438 (PS-144–148): confirming or dismissing a CAPA recommendation, for the roles that open Quality Assurance.
export const CAPA_DECIDE = ['qa:capa-recommendation:decide'];
// Batch 442 (PS-147): discordance patterns are personnel-sensitive: Lab Director only.
export const QA_TREND = ['qa:pathologist-trend:view', 'qa:pathologist-trend:decide'];
// Batch 454 (Pete): closing a follow-up and emailing the ordering clinician,
// for the roles that open Quality Assurance (Admin, Lab Director, QA Reviewer).
// Marking a surgical case "follow-up expected" at sign-out, for the roles that
// sign out surgical cases (Pathologist, Fellow); least privilege, so a
// resident's case is marked by the attending who signs it.
export const FOLLOW_UP_ACTIONS = ['qa:follow-up:record', 'qa:follow-up-clinician:email'];
export const FOLLOW_UP_EXPECT = ['case:follow-up:expect'];
const FOLLOW_UP_EXPECT_ROLES = ['pathologist', 'fellow'];
// Batch 461: inserting the organ map into the report, for the people who write reports.
export const ORGAN_MAP_INSERT = ['report:organ-map:insert'];
const ORGAN_MAP_INSERT_ROLES = ['pathologist', 'fellow', 'resident'];
// Batch 458 (PS-71, Pete, Oct 4): Overwrite on the Edit Conflict dialog, for
// Pathologist, Admin and Lab Director. An exception to least privilege (a
// Pathologist otherwise starts with nothing): pathologists are the final
// clinical authority on sign-off and amendments, and an administrator-only
// overwrite would hold up urgent addenda and off-hours work.
export const CASE_EDIT_CONFLICT_OVERRIDE = ['case:edit-conflict:override'];
export const REFERRAL_TRANSIT = ['referral:transit-status:update'];
// Batch 434: WSI scan batches, for every role with the Batch Management screen.
export const WSI_SCAN_BATCH = ['wsi:scan-batch:load', 'wsi:scan-batch:send', 'wsi:scan-batch:unload'];
// Batch 407: disposing of retained material, for every role with the Batch Management screen.
// Batch 452: and removing a decant from the material tree, for the same roles.
export const MATERIAL_DISPOSAL = ['retention:material:dispose', 'retention:disposal-report:export', 'case:decant:delete'];
const BILLING_CORRECTION_ROLES: string[] = [
  SYSTEM_ROLE_IDS.ADMIN, SYSTEM_ROLE_IDS.LAB_DIRECTOR, SYSTEM_ROLE_IDS.QA_REVIEWER,
];

// Batch 381: see CASE_REPORT_ACTIONS below.
const CASE_REPORT_ACTIONS_FOR_CUSTOM = ['case:hold:place', 'case:hold:release', 'case:retention-hold:place', 'case:retention-hold:release', 'case:delegation:create', 'case:team:manage'];

/** Batch 437: the exports that go with the screens a role opens. */
function screenExports(caps: readonly string[]): string[] {
  return [
    ...(caps.includes('screen:audit-log:open') ? AUDIT_LOG_EXPORTS : []),
    ...(caps.includes('screen:search:open') ? CASE_SEARCH_EXPORT : []),
    ...(caps.includes('screen:my-contributions:open') ? CONTRIBUTION_EXPORTS : []),
    ...(caps.includes('screen:quality-assurance:open') ? CAPA_DECIDE : []),
    ...(caps.includes('screen:quality-assurance:open') ? FOLLOW_UP_ACTIONS : []),
  ];
}

/**
 * Batch 374: screens for a role a hospital created itself, so nobody holding
 * one loses a screen they could open before screens were capabilities. A
 * role with case access gets every screen except Configuration and Quality &
 * Compliance; one with configuration access gets those. Offered once, like
 * every seed; an administrator narrows it in the Role Dictionary.
 */
export function customRoleScreenSeed(role: { caseAccess?: boolean; configAccess?: boolean }): string[] {
  const admin = [...screens('configuration'), ...QUALITY_COMPLIANCE];
  return [
    ...(role.caseAccess ? SCREEN_KEYS.filter(k => !admin.includes(k)) : []),
    // Batch 381: and the case report's holds and delegation (Pete: keep today's users).
    ...(role.caseAccess ? [...CASE_REPORT_ACTIONS_FOR_CUSTOM] : []),
    // Batch 382: and correcting an applied billing code (also for the roles that resolve billing deficiencies).
    ...(role.caseAccess || role.configAccess ? [...BILLING_CORRECTION] : []),
    ...(role.caseAccess || role.configAccess ? [...BILLING_REVIEW] : []),
    // Batch 383: and releasing an autopsy body.
    ...(role.caseAccess ? [...AUTOPSY_RELEASE] : []),
    // Batch 468: and recording a forensic chain-of-custody transfer.
    ...(role.caseAccess ? [...AUTOPSY_CUSTODY_TRANSFER] : []),
    // Batch 469: and consent narrowing/revocation, organ-retention disposal, toxicology.
    ...(role.caseAccess ? [...AUTOPSY_CONSENT_MANAGE] : []),
    ...(role.caseAccess ? [...AUTOPSY_RETENTION_DISPOSAL] : []),
    ...(role.caseAccess ? [...AUTOPSY_TOXICOLOGY] : []),
    // Batch 471: and cancelling a toxicology order, retention detail, consent reinstatement.
    ...(role.caseAccess ? [...AUTOPSY_TOXICOLOGY_CANCEL] : []),
    ...(role.caseAccess ? [...AUTOPSY_RETENTION_DETAIL] : []),
    ...(role.caseAccess ? [...AUTOPSY_CONSENT_REINSTATE] : []),
    // Batch 417: and recording a national identifier.
    ...(role.caseAccess ? [...NATIONAL_IDENTIFIER_RECORD] : []),
    ...(role.caseAccess ? [...REGISTRY_CONSENT_RECORD] : []),
    // Batch 403: and add-on orders (a role with case access had that screen too).
    ...(role.caseAccess ? [...ADD_ON_ORDER_ACTIONS] : []),
    // Batch 404: and Batch Management's overrides (a role with case access had that screen too).
    ...(role.caseAccess ? [...BATCH_OVERRIDE_ACTIONS] : []),
    // Batch 405: and superseding a molecular run.
    ...(role.caseAccess ? [...MOLECULAR_SUPERSEDE] : []),
    // Batch 467: and the molecular Order Queue's actions.
    ...(role.caseAccess ? [...MOLECULAR_ORDER_ACTIONS] : []),
    // Batch 409: and signing out a cytology specimen (Batch 410: and the workspace's other actions).
    ...(role.caseAccess ? [...CYTOLOGY_SIGN_OUT] : []),
    ...(role.caseAccess ? [...CYTOLOGY_CT_SIGN_OUT] : []),
    // Batch 407: and disposing of retained material.
    ...(role.caseAccess ? [...MATERIAL_DISPOSAL] : []),
    // Batch 432: and referral transit status (case access had Batch Management),
    // and resolving Audit Log errors (configuration access had the Audit Log).
    ...(role.caseAccess ? [...REFERRAL_TRANSIT] : []),
    // Batch 434: and WSI scan batches (case access had Batch Management).
    ...(role.caseAccess ? [...WSI_SCAN_BATCH] : []),
    ...(role.configAccess ? [...AUDIT_ERROR_RESOLVE] : []),
    // Batch 437: and the exports on the screens it gets.
    ...screenExports([
      ...(role.caseAccess ? SCREEN_KEYS.filter(k => !admin.includes(k)) : []),
      ...(role.configAccess ? admin : []),
    ]),
    // Batch 385: and sending messages, for every custom role.
    ...MESSAGING,
    ...(role.configAccess ? admin : []),
  ];
}

/** Built-in role id → the capabilities it starts with. */
// Batch 378: completing grossing, for the people who gross.
const GROSSERS = ['pathologist', 'fellow', 'resident', 'pa'];

// Batch 381 (Pete: "keep today's users"): placing and releasing holds and
// delegating a case, for every role that could open a case report before
// (the roles with case access, built-in and a hospital's own).
export const CASE_REPORT_ACTIONS: readonly string[] = CASE_REPORT_ACTIONS_FOR_CUSTOM;
const CASE_ACCESS_ROLES = [
  ...GROSSERS,
  SYSTEM_ROLE_IDS.ACCESSIONER, SYSTEM_ROLE_IDS.HISTOTECHNOLOGIST, SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST, SYSTEM_ROLE_IDS.MOLECULAR_TECHNOLOGIST,
];

export const CAPABILITY_SEEDS: Readonly<Record<string, readonly string[]>> = {
  ...Object.fromEntries(Object.entries(SCREEN_SEEDS).map(([r, caps]) => [r, [
    ...caps,
    ...(GROSSERS.includes(r) ? ['case:grossing:complete'] : []),
    // Batch 478: and per-organ tagging during the gross exam.
    ...(GROSSERS.includes(r) ? AUTOPSY_ORGAN_TAG : []),
    // Batch 480: and recording a margin's ink application during grossing.
    ...(GROSSERS.includes(r) ? GROSSING_MARGIN_INK : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? CASE_REPORT_ACTIONS : []),
    ...(CASE_ACCESS_ROLES.includes(r) || BILLING_CORRECTION_ROLES.includes(r) ? BILLING_CORRECTION : []),
    ...(CASE_ACCESS_ROLES.includes(r) || BILLING_CORRECTION_ROLES.includes(r) ? BILLING_REVIEW : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_RELEASE : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_CUSTODY_TRANSFER : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_CONSENT_MANAGE : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_RETENTION_DISPOSAL : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_TOXICOLOGY : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_TOXICOLOGY_CANCEL : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_RETENTION_DETAIL : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_CONSENT_REINSTATE : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? NATIONAL_IDENTIFIER_RECORD : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? REGISTRY_CONSENT_RECORD : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? REGISTRY_RESEND : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? QA_TREND : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? REGISTRY_GO_LIVE_APPROVE : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? REGISTRY_REVISION_REVIEW : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? CONFIG_SECTIONS_LAB_DIRECTOR : []),
    ...(r === SYSTEM_ROLE_IDS.TEMPLATE_AUTHOR ? CONFIG_TEMPLATE_AUTHOR : []),
    ...(r === SYSTEM_ROLE_IDS.TEMPLATE_APPROVER ? CONFIG_TEMPLATE_APPROVER : []),
    ...(EQUIPMENT_MAINTENANCE_ROLES.includes(r) ? EQUIPMENT_MAINTENANCE : []),
    ...(CYTOLOGY_SIGN_OUT_ROLES.includes(r) ? CYTOLOGY_SIGN_OUT : []),
    ...(r === SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST ? CYTOLOGY_CT_SIGN_OUT : []),
    ...(r === 'pathologist' ? CYTOLOGY_REVISION : []),
    ...(r === 'pathologist' ? CYTOLOGY_EARLY_FINALIZE : []),
    ...(PEER_REVIEW_ROLES.includes(r) ? PEER_REVIEW_VERDICTS : []),
    ...(PEER_REVIEW_ROLES.includes(r) ? PEER_REVIEW_CASE_ACTIONS : []),
    ...(r === 'pathologist' ? PEER_REVIEW_PATHOLOGIST_ACTIONS : []),
    ...(PEER_REVIEW_ROLES.includes(r) ? CYTOLOGY_REVIEW_TAKE : []),
    ...(ADD_ON_ORDER_ROLES.includes(r) ? ADD_ON_ORDER_ACTIONS : []),
    ...(caps.includes('screen:batch-management:open') ? BATCH_OVERRIDE_ACTIONS : []),
    ...(caps.includes('screen:batch-management:open') ? MATERIAL_DISPOSAL : []),
    ...(caps.includes('screen:batch-management:open') ? REFERRAL_TRANSIT : []),
    ...(caps.includes('screen:batch-management:open') ? WSI_SCAN_BATCH : []),
    ...(caps.includes('screen:audit-log:open') ? AUDIT_ERROR_RESOLVE : []),
    ...(caps.includes('screen:audit-log:open') ? AUDIT_LOG_EXPORTS : []),
    ...(caps.includes('screen:search:open') ? CASE_SEARCH_EXPORT : []),
    ...(caps.includes('screen:my-contributions:open') ? CONTRIBUTION_EXPORTS : []),
    ...(caps.includes('screen:quality-assurance:open') ? CAPA_DECIDE : []),
    ...(caps.includes('screen:quality-assurance:open') ? FOLLOW_UP_ACTIONS : []),
    ...(FOLLOW_UP_EXPECT_ROLES.includes(r) ? FOLLOW_UP_EXPECT : []),
    ...(ORGAN_MAP_INSERT_ROLES.includes(r) ? ORGAN_MAP_INSERT : []),
    ...(r === 'pathologist' || r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? CASE_EDIT_CONFLICT_OVERRIDE : []),
    ...(caps.includes('screen:molecular:open') ? MOLECULAR_SUPERSEDE : []),
    ...(caps.includes('screen:molecular:open') ? MOLECULAR_ORDER_ACTIONS : []),
    ...MESSAGING,
  ]])),
  [SYSTEM_ROLE_IDS.SUPERADMIN]: ALL_CAPABILITY_KEYS,
  [SYSTEM_ROLE_IDS.ADMIN]: [...EXPORTS, ...CASE_EDIT_CONFLICT_OVERRIDE, ...ADMINISTRATION, ...SUPPORT_ACCESS, ...CONFIG_SECTIONS, ...SCREEN_SEEDS[SYSTEM_ROLE_IDS.ADMIN], ...BILLING_CORRECTION, ...BILLING_REVIEW, ...MESSAGING, ...AUDIT_ERROR_RESOLVE, ...screenExports(SCREEN_SEEDS[SYSTEM_ROLE_IDS.ADMIN])],
  [SYSTEM_ROLE_IDS.QA_REVIEWER]: [...EXPORTS, ...SCREEN_SEEDS[SYSTEM_ROLE_IDS.QA_REVIEWER], ...BILLING_CORRECTION, ...BILLING_REVIEW, ...MESSAGING, ...AUDIT_ERROR_RESOLVE, ...screenExports(SCREEN_SEEDS[SYSTEM_ROLE_IDS.QA_REVIEWER])],
};

/**
 * Batch 371 (Pete: hospital administrators have no control over
 * Superadmin). The Superadmin role always holds the whole catalog; any
 * stored difference is put back on load. ForMedrixAI decides what it
 * holds, in the catalog, not a hospital in its Role Dictionary.
 */
export function lockPlatformRoles<R extends SeedableRole>(roles: readonly R[]): { roles: R[]; changed: boolean } {
  let changed = false;
  const out = roles.map(r => {
    if (r.id !== SYSTEM_ROLE_IDS.SUPERADMIN) return r;
    const have = r.capabilities ?? [];
    if (have.length === ALL_CAPABILITY_KEYS.length && ALL_CAPABILITY_KEYS.every(k => have.includes(k))) return r;
    changed = true;
    return { ...r, capabilities: [...ALL_CAPABILITY_KEYS], seededCapabilities: [...ALL_CAPABILITY_KEYS] };
  });
  return { roles: out, changed };
}

export interface SeedableRole {
  id: string;
  builtIn?: boolean;
  caseAccess?: boolean;
  configAccess?: boolean;
  capabilities?: string[];
  seededCapabilities?: string[];
}

/** Offers each built-in role the seed capabilities it hasn't been offered yet. */
export function applyCapabilitySeeds<R extends SeedableRole>(roles: readonly R[], seeds: Readonly<Record<string, readonly string[]>> = CAPABILITY_SEEDS): { roles: R[]; changed: boolean } {
  let changed = false;
  const out = roles.map(r => {
    // Batch 374: a hospital's own roles are offered the screens their access implies.
    const custom = r.builtIn ? [] : customRoleScreenSeed(r);
    const seed = r.builtIn ? seeds[r.id] : (custom.length ? custom : undefined);
    const offered = new Set(r.seededCapabilities ?? []);
    const fresh = (seed ?? []).filter(k => !offered.has(k));
    if (fresh.length === 0 && (r.capabilities !== undefined || !seed)) return r;
    changed = true;
    const capabilities = [...new Set([...(r.capabilities ?? []), ...fresh])];
    return { ...r, capabilities, seededCapabilities: [...offered, ...fresh] };
  });
  return { roles: out, changed };
}
