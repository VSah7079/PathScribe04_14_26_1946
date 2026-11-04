// src/services/authorization/capabilitySeeds.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-355 (Batch 369): the capabilities built-in roles start with, and how
// they reach a site's stored role catalog.
//
// Day-one grants (Pete, Sep 28, 2026: least privilege):
//   Superadmin   every capability in the catalog except SUPERADMIN_WITHHELD
//                (config:ai-prompt:approve; no bypass: it is a role)
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
//   capability, so Admin starts with it (Pete: "default to admin but it
//   remains an assignable permission", e.g. to Lab Director). Batch 669: Lab
//   Director is seeded with it too (MOLECULAR_CONTROL_RULES_MANAGE); the bench
//   roles see the rules read-only.
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
// Batch 603 (Pete, dev review): break-glass rebind of a downtime patient identity. Admin starts with it (it was open to administrator roles before);
// anyone else is granted it in Staff → Roles.
const BREAK_GLASS_REBIND = ['patient:break-glass:rebind'];

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
// Batch 529 (PS-554, Pete): configuration capabilities that no built-in role
// is given by the sweep above. Changing the mismatch rules starts with nobody
// (each hospital grants it to its own role); reading them goes to the roles
// below (MISMATCH_RULES_VIEW).
// Batch 536 (PS-554): and the AI instructions: editing starts with nobody,
// approving with Lab Director only (AI_PROMPT_APPROVE), reading with Lab
// Director and QA Reviewer (AI_PROMPT_VIEW).
/** Batch 654: printing a report that is still in its release delay under the Supervisor Override policy (Lab Director, Admin). */
export const HELD_PRINT_OVERRIDE = ['print:release-hold:override'];
export const CONFIG_NO_DEFAULT_GRANT: readonly string[] = [
  'config:clinical-mismatch-rules:manage', 'config:clinical-mismatch-rules:view',
  'config:ai-prompt:view', 'config:ai-prompt:edit', 'config:ai-prompt:approve',
];
export const CONFIG_SECTIONS = CAPABILITY_CATALOG
  .filter(c => CONFIG_GROUPS.includes(c.group) && !CONFIG_NO_DEFAULT_GRANT.includes(c.key))
  .map(c => c.key as string);
// Batch 529 (PS-554): reading the mismatch rules: Pathologist (so a pathologist
// can see why a case was held; Pete's deliberate exception to least
// privilege), QA Reviewer and Lab Director.
export const MISMATCH_RULES_VIEW = ['config:clinical-mismatch-rules:view'];
// Batch 536 (PS-554, Pete Oct 11): approving the AI instructions starts with
// Lab Director; reading them with Lab Director and QA Reviewer.
export const AI_PROMPT_VIEW = ['config:ai-prompt:view'];
// Batch 669 (Pete, mol-1): Control Rules are view-only for a Molecular Technologist; changing them is a management/admin action.
// Admin has it through the administration group; the Lab Director (management) is seeded here.
export const MOLECULAR_CONTROL_RULES_MANAGE = ['config:molecular-control-rules:manage'];
// Batch 669 (ctl, Pete): reading Control Rules no longer rides on the Molecular screen. Admin holds it through the administration
// group; Lab Director, QA Reviewer and every role that holds the Molecular screen (the Molecular Technologist) are seeded here.
// Manage needs view, so the Lab Director gets both.
export const MOLECULAR_CONTROL_RULES_VIEW = ['config:molecular-control-rules:view'];
export const AI_PROMPT_APPROVE = ['config:ai-prompt:view', 'config:ai-prompt:approve'];
/**
 * Batch 536 (Pete, Oct 11, 2026): capabilities the Superadmin role does not
 * hold. Approving the AI instructions is a laboratory's own act; ForMedrixAI
 * tests it with a Lab Director test account in a demonstration or test
 * tenant. Superadmin keeps reading and editing them (an edit voids nothing
 * that is approved: it waits for the laboratory's approval).
 */
export const SUPERADMIN_WITHHELD: readonly string[] = ['config:ai-prompt:approve'];
export const SUPERADMIN_CAPABILITY_KEYS: readonly string[] = ALL_CAPABILITY_KEYS.filter(k => !SUPERADMIN_WITHHELD.includes(k));
// Batch 530 (Pete: "allow pathologists or residents to add or reconcile the
// structured clinical history later during grossing or sign-out"): the roles
// that report and gross.
export const CLINICAL_HISTORY_RECORD = ['case:clinical-history:record'];
const CLINICAL_HISTORY_RECORD_ROLES = ['pathologist', 'fellow', 'resident', 'pa'];
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
// Batch 610: and the autopsy dashboards.
const QUALITY_COMPLIANCE = screens('audit-log', 'quality-assurance', 'registry-exceptions', 'autopsy-dashboards');
export const SCREEN_SEEDS: Readonly<Record<string, readonly string[]>> = {
  // Batch 489: and the Tumor Board workspace, for the roles that nominate
  // cases to a board (GROSSERS below).
  // Batch 491: and the margin-exception review queue, same roles — the
  // same clinical judgment call as case:margin-exception:resolve, which
  // this screen exists to reach.
  pathologist: screens('grossing', 'worklist', 'search', 'add-on-orders', 'intraop-queue', 'cytology-qc-queue', 'surgical-qa-worklist', 'my-contributions', 'cytology-workspace', 'tumor-board', 'margin-exception-review'),
  fellow:      screens('grossing', 'worklist', 'search', 'add-on-orders', 'intraop-queue', 'cytology-qc-queue', 'surgical-qa-worklist', 'my-contributions', 'cytology-workspace', 'tumor-board', 'margin-exception-review'),
  resident:    screens('grossing', 'worklist', 'search', 'add-on-orders', 'intraop-queue', 'my-contributions', 'cytology-workspace', 'tumor-board', 'margin-exception-review'),
  pa:          screens('accession', 'worklist', 'search', 'add-on-orders', 'intraop-queue', 'grossing', 'embedding', 'my-contributions', 'tumor-board', 'margin-exception-review'),
  // Batch 486 (Pete): considered, then reverted — the four bench roles
  // don't need My Contribution (it's a pathologist/resident screen). A
  // Cytotech Competency Assessment supervisor's own Mentor-tab fix
  // (MentorTab.tsx, caseMixCalculations.ts) stays — that's the
  // supervisor's screen, already seeded to pathologist/fellow/resident,
  // not the trainee's.
  // Batch 488 (Pete): the real next step from that review — each bench
  // role now opens its own dedicated bench-contribution page instead
  // (real accessioning rate / batch throughput & queue aging / stage-
  // to-stage TAT / molecular QC, scoped to what each role's own work
  // actually produces; see src/pages/README.md).
  // Batch 645: and the Lockbox Drop-Off screen (the kiosk and the Overnight folder), for the morning accessioning team.
  [SYSTEM_ROLE_IDS.ACCESSIONER]:            screens('accession', 'worklist', 'search', 'bench-contributions', 'lockbox-drop-off'),
  // Batch 740: both bench roles open the Cytology Preparation bench (fluid decision 1).
  [SYSTEM_ROLE_IDS.HISTOTECHNOLOGIST]:      screens('batch-management', 'embedding', 'microtomy', 'slide-distribution', 'search', 'bench-contributions', 'cytology-prep'),
  [SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST]:       screens('cytology-workspace', 'batch-management', 'search', 'bench-contributions', 'cytology-prep'),
  [SYSTEM_ROLE_IDS.MOLECULAR_TECHNOLOGIST]: screens('molecular', 'batch-management', 'search', 'bench-contributions'),
  // Batch 434 (Pete): Admin also opens Batch Management (it couldn't see Slide
  // scanning). The screen only: the batch actions stay with the bench roles,
  // and an administrator can add them to any role in the Role Dictionary.
  [SYSTEM_ROLE_IDS.ADMIN]:             [...screens('configuration', 'batch-management', 'outbound-queue', 'lockbox-drop-off'), ...QUALITY_COMPLIANCE],
  [SYSTEM_ROLE_IDS.TEMPLATE_AUTHOR]:   screens('configuration'),
  [SYSTEM_ROLE_IDS.TEMPLATE_APPROVER]: screens('configuration'),
  [SYSTEM_ROLE_IDS.LAB_DIRECTOR]:      [...screens('configuration', 'search', 'my-contributions'), ...QUALITY_COMPLIANCE],
  [SYSTEM_ROLE_IDS.QA_REVIEWER]:       QUALITY_COMPLIANCE,
};

const SCREEN_KEYS = CAPABILITY_CATALOG.filter(c => c.group === 'screens').map(c => c.key);

// Batch 645: Lockbox Drop-Off. Accessioner starts with all of it (receiving after-hours drops, the Overnight folder, resolving a
// placeholder); Admin with the folder only (oversight and the time-to-receipt summary). Pathologist and every other role start with
// nothing, and a hospital's own roles are not offered the screen automatically (customRoleScreenSeed): an administrator assigns it.
export const LOCKBOX_RECEIVE = ['lockbox:specimen:receive'];
export const LOCKBOX_FOLDER = ['lockbox:folder:review'];
export const LOCKBOX_RESOLVE = ['lockbox:placeholder:resolve'];
const LOCKBOX_SCREEN = 'screen:lockbox-drop-off:open';

// Batch 382: correcting an applied billing code. Its own list, not part of
// CASE_REPORT_ACTIONS, so it can be taken off the clinical roles later.
const BILLING_CORRECTION = ['billing:applied-code:correct'];
// Batch 460 (Pete): reviewing a case's billing codes, for the same roles (nobody loses it).
const BILLING_REVIEW = ['billing:applied-code:review'];
// Batch 383: releasing an autopsy body, for the roles with case access.
const AUTOPSY_RELEASE = ['autopsy:body:release'];
// Batch 495 (PS-283): printing a case report, for every role that could
// print one before (the roles with case access, built-in and a hospital's own).
const REPORT_PRINT = ['report:case-report:print'];
// Batch 609 (PS-44): attaching images to a case report, for the same case-access roles.
const REPORT_IMAGES = ['report:case-images:attach', 'case:attachment:upload', 'case:attachment:link', 'case:attachment:unlink', 'case:slide-image:open', 'case:requisition:view']; // Batch 742: and the case's attachments, same roles; Batch 750: opening a slide in the lab's own application; Batch 762: the case's scanned requisition
// Batch 613: related cases at sign-out are the signer's decision (Pathologist, Fellow); the Patient summary print is for the case-access roles that can read patient history.
const RELATED_CASES = ['report:related-cases:attach'];
const PATIENT_SUMMARY = ['patient:summary:print'];
// Batch 621: the AI extraction of a historical report's synoptic fields (advisory) and flagging it as wrong, for the roles that read history
// to report: Pathologist, Fellow, Resident. Not a hospital's own roles; an administrator grants it in Staff → Roles.
export const HISTORY_EXTRACTION = ['ai:history-extraction:run', 'ai:history-extraction:flag'];
// Batch 611 (#189): Smart Capture review, approval and export, for the Pathologist only (the approver is always a pathologist).
const SMART_CAPTURE = ['billing:smart-capture:review', 'billing:smart-capture:approve', 'billing:smart-capture:send'];
// Batch 516 (PS-283): printing a VIP/confidential case, for the Pathologist who
// reports it (least privilege; it needs report:case-report:print, which only the
// case-access roles hold). An administrator grants it to anyone else.
export const RESTRICTED_CASE_PRINT = ['report:restricted-case:print'];
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
// Batch 499: the organ-retention tier itself, same roles as retention detail.
const AUTOPSY_RETENTION_TIER = ['autopsy:retention-tier:record'];
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
// Batch 572: signing off your own screening hours, for the built-in roles whose reviews count toward the
// workload limit. Its own seed (not CYTOLOGY_SIGN_OUT): a hospital's own roles with case access don't get it,
// because a sign-off is a workload record a lab grants deliberately.
export const CYTOLOGY_SCREENING_HOURS = ['cytology:screening-hours:sign-off'];
// Batch 630 (Pete, Oct 19, 2026): entering an hrHPV result by hand, and approving such an entry that replaces an interface result.
// Pathologist and Lab Director start with it (least privilege); a lab grants it to others (a Lab Supervisor role, say) in the Role Dictionary.
export const CYTOLOGY_HPV_MANUAL_RESULT = ['cytology:hpv-result:record-manual'];
export const CYTOLOGY_CSMS_ELIGIBILITY = ['cytology:csms-eligibility:verify'];
// Batch 415: a cytotechnologist's own sign-out (negative GYN, advanced-CT
// exception), for the Cytotechnologist role and a hospital's own roles with
// case access (keep today's users). Remove it from the role where the
// country doesn't let cytotechnologists sign reports.
export const CYTOLOGY_CT_SIGN_OUT = ['cytology:ct-report:sign-out'];

// Batch 417: recording a patient's national identifier, for everyone who accessions (today's users keep it).
export const NATIONAL_IDENTIFIER_RECORD = ['patient:national-identifier:record'];
// Batch 418: and the patient's registry opt-outs.
export const REGISTRY_CONSENT_RECORD = ['patient:registry-consent:record'];
// Batch 613: asking to see a patient's other cases (every case-access role); deciding (Pathologist and Admin; the service also
// limits a pathologist to cases they are assigned to).
export const OTHER_CASES_REQUEST = ['patient:other-cases:request-access'];
export const OTHER_CASES_DECIDE = ['patient:other-cases:decide-access'];
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
// Batch 669 (ws-19): flagging a block exception and marking a block retrieved, for everyone who could do it before
// (keep today's users): the roles with the Add-On Orders screen and the bench roles with the Microtome workstation
// (which flags Block exhausted), and a hospital's own roles with case access.
export const ADD_ON_BENCH_ACTIONS = ['add-on:exception:flag', 'add-on:block:mark-retrieved'];
// Batch 404: Batch Management's overrides, for every role that has its screen
// (Pete: keep today's users).
// Batch 610 (#17/#123, #12): and trying the Simulated temperature reading, and exporting the Retention Holds queue.
export const BATCH_OVERRIDE_ACTIONS = ['batch:reconciliation:override', 'batch:run:abort', 'batch:cold-chain-excursion:acknowledge', 'batch:cold-chain-reading:simulate', 'retention:holds-queue:export'];
// Batch 726 (Lab Workflow & Batch spec): carriers at the workstations and the station scan trail, for every role with
// Batch Management or a bench workstation (and a hospital's own roles with case access).
export const STATION_CARRIER_ACTIONS = ['batch:manifest:seal', 'batch:carrier:advance', 'station:scan-mismatch:continue', 'station:scan-history:view'];
// Batch 730: the lab workflow reports, view and export, for every role with Batch Management (where the reports are).
export const LAB_WORKFLOW_REPORTS = [
  'report:workflow-turnaround:view', 'report:workflow-turnaround:export', 'report:station-volume:view', 'report:station-volume:export',
  'report:stat-performance:view', 'report:stat-performance:export', 'report:add-on-volume:view', 'report:add-on-volume:export',
  'report:recut-rework:view', 'report:recut-rework:export', 'report:reconciliation-exceptions:view', 'report:reconciliation-exceptions:export',
  'report:batch-duration:view', 'report:batch-duration:export',
];
const STATION_CARRIER_SCREENS = ['screen:batch-management:open', 'screen:embedding:open', 'screen:microtomy:open', 'screen:slide-distribution:open'];
// Batch 731 (spec §10.5, §10.6): an item's end state, for the roles at the Microtome or Slide Distribution; asking for
// an exhausted block to be re-embedded, for the roles that place add-on orders; marking it re-embedded, at Embedding.
export const MATERIAL_END_STATE = ['material:end-state:record'];
export const REEMBED_REQUEST = ['material:reembed:request'];
/** Batch 740: whoever opens the Cytology Preparation bench may hand a cell block off to histology. */
export const CELL_BLOCK_HANDOFF = ['cytology:cell-block:hand-off'];
/** Batch 741: dividing a specimen (Grossing, Cytology Preparation) and tracking its aliquots (Cytology Preparation, Batch Management). */
export const SPECIMEN_DIVIDE = ['material:specimen:divide'];
export const ALIQUOT_STATUS = ['material:aliquot-status:update'];
export const REEMBED_COMPLETE = ['material:reembed:complete'];
// Batch 610 (#11): deleting (Invalidating) a block after sign-out: supervisory and administrative roles only.
export const BLOCK_DELETE_SIGNED_OUT = ['material:block:delete-signed-out'];
// Batch 610 (#11): flagging a block Invalidated or Superseded on an amended report: Pathologist and Quality Manager (QA Reviewer).
export const BLOCK_FLAG_AMENDED = ['material:block:flag-amended'];
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
/** Batch 551: the Server jobs view (Admin). */
export const SERVER_JOBS = ['jobs:server-job:view', 'jobs:server-job:requeue'];
/** Batch 554: interface monitoring, the engines' listeners and queues (Admin; a hospital can grant it to its interface analysts). */
export const INTERFACE_MONITORING = ['interface:engine-status:view'];
// Batch 515 (PS-283): the Print Queue dashboard's actions, for everyone who
// opens the Audit Log, where the dashboard sits (keep today's users).
export const PRINT_QUEUE_ACTIONS = ['print:job:hold', 'print:job:cancel', 'print:job:redirect', 'print:job:retry'];
// Batch 518 (PS-122): resending outbound interface messages. Admin by
// default (Pete's accepted default named Admin and an Interface Analyst; there
// is no built-in Interface Analyst role, so a hospital grants it to its own).
export const INTERFACE_RESEND = ['interface:outbound:resend'];
// Batch 619 (PS-800): hold and release on the Outbound Queue screen (Admin).
export const INTERFACE_HOLD_RELEASE = ['interface:outbound:hold', 'interface:outbound:release', 'interface:outbound:mark-not-reportable', 'interface:outbound:retract', 'interface:outbound:override-release'];
// Batch 518 (PS-123, Pete Oct 2): batch label reprint, Histotechnologist and Admin.
export const LABEL_BATCH_REPRINT = ['label:batch:reprint'];
// Batch 515 (PS-290): issuing and revoking an outside consult link, for every
// role with case access (keep today's users) until Pete decides who should
// (proposed: Pathologist and Admin).
export const CONSULT_LINK_ACTIONS = ['case:consult-link:issue', 'case:consult-link:revoke'];
// Batch 669 (access-11): showing the consultant the patient's full name and date of birth
// (masked by default). Pathologist and Lab Director only; least privilege.
export const CONSULT_LINK_REVEAL_IDENTITY = ['case:consult-link:reveal-identity'];
// Batch 522 (PS-290): the list of outside consult links across all cases
// (Audit Log → Consult links), for the roles that oversee access: Admin,
// Lab Director and QA Reviewer.
export const CONSULT_LINK_OVERSIGHT = ['audit:consult-links:view'];
// Batch 437 (PS-282, PS-357): the exports, for the roles that open the screen
// they sit on (keep today's users).
export const AUDIT_LOG_EXPORTS = ['audit:audit-log:export', 'audit:error-log:export', 'audit:interface-log:export', 'audit:qa-log:export', 'audit:billing-log:export'];
export const CASE_SEARCH_EXPORT = ['search:case-results:export', 'search:case-report:export', 'search:report-schedule:manage'];
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
// Batch 649 (workflowCapabilities.ts): the everyday case actions that had no capability of their own. Least privilege,
// keeping today's users where the action was open to every case-access role (a hospital's own case-access roles get the
// same, customRoleScreenSeed):
//   sign-out / finalize and recall: the roles that sign or release reports (Pathologist, Fellow, Resident; Cytotechnologist
//     recalls its own held cytology sign-outs). Who may sign a given case is still its participants (canFinalizeCase).
//   preliminary release and amendment / correction / addendum release: Pathologist and Fellow (a resident's report is
//     countersigned; a laboratory grants these to residents in the Role Dictionary if it allows it).
//   pool claim and pass: the roles that take pool cases (Pathologist, Fellow, Resident, Cytotechnologist).
//   flags: every case-access role (bench staff flag specimens too).
//   diagnosis codes and informal review requests: the reporting roles (Pathologist, Fellow, Resident; Cytotechnologist codes
//     cytology cases on the Screening page).
//   creating a case: every role with the Accession screen.
//   QA deficiency actions: every role with the Quality Assurance screen (screenExports below).
export const SURGICAL_SIGN_OUT = ['surgical:report:sign-out'];
export const REPORT_RECALL = ['report:release:recall'];
export const SURGICAL_PRELIMINARY_RELEASE = ['surgical:preliminary:release'];
// Pete (Oct 2026): residents do not issue preliminary releases independently, so a hospital's own roles do not get it by default.
export const SURGICAL_REVISION_RELEASES = ['surgical:amendment:release', 'surgical:correction:release', 'surgical:addendum:release'];
export const SURGICAL_RELEASES = [...SURGICAL_PRELIMINARY_RELEASE, ...SURGICAL_REVISION_RELEASES];
export const POOL_ACTIONS = ['case:pool:claim', 'case:pool:pass'];
export const FLAG_ACTIONS = ['case:flag:apply', 'case:flag:remove'];
export const DIAGNOSIS_CODE_APPLY = ['case:diagnosis-code:apply'];
export const INFORMAL_REVIEW_REQUEST = ['case:informal-review:request'];
export const ACCESSION_CREATE = ['case:accession:create'];
// Batch 762: requisition ingestion. Running the job now and working the Unmatched Requisitions queue, for the roles that open Accession.
export const REQUISITION_INBOX = ['requisition:ingestion:run', 'requisition:inbox:review', 'requisition:inbox:resolve'];
// Batch 763: the Post-Stain / Pre-Distribution QC gate. Signing off staining runs and scanned images, for the roles that open
// Slide Distribution (where the checkpoint is); signing off a run that waits for its stainer's own sign-off, Lab Director.
export const STAIN_QC_SIGN_OFF = ['stain:qc:sign-off', 'scan:image-qc:sign-off'];
export const STAIN_QC_OVERRIDE = ['stain:qc:override'];
export const QA_DEFICIENCY_ACTIONS = ['qa:deficiency:raise', 'qa:deficiency:escalate', 'qa:deficiency:contain', 'qa:deficiency:verify', 'qa:management-review:submit'];
const SIGNING_ROLES = ['pathologist', 'fellow', 'resident'];
const ATTENDING_ROLES = ['pathologist', 'fellow'];
const POOL_ROLES = [...SIGNING_ROLES, SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST as string];

// Batch 484 (Structured Inking Sign-Out & Grossing Gate Logic Engine;
// PS-519 follow-up). The Administrative Override action at Gate B
// (Sign-Out), for a Severity 3 issue only — Pete's own spec names
// "Clinical Admin, Lead Pathologist" as eligible; this app has no
// built-in role literally named either, so this maps onto Admin and Lab
// Director, the same two roles config:inking-validation-mode:manage
// (the site's own inking policy) already trusts. Deliberately NOT given
// to 'pathologist' — a standard pathologist is never override-eligible
// per the spec, unlike case:edit-conflict:override above.
export const INKING_GATE_OVERRIDE = ['case:inking-gate:override'];
export const REFERRAL_TRANSIT = ['referral:transit-status:update'];
// Batch 434: WSI scan batches, for every role with the Batch Management screen.
export const WSI_SCAN_BATCH = ['wsi:scan-batch:load', 'wsi:scan-batch:send', 'wsi:scan-batch:unload'];
// Batch 407: disposing of retained material, for every role with the Batch Management screen.
// Batch 452: and removing a decant from the material tree, for the same roles.
// Batch 588: and deleting a block in process (each facility changes this in its role grants).
export const MATERIAL_DISPOSAL = ['retention:material:dispose', 'retention:disposal-report:export', 'case:decant:delete', 'material:block:delete-in-process'];
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
    ...(caps.includes('screen:quality-assurance:open') ? QA_DEFICIENCY_ACTIONS : []),
    ...(caps.includes('screen:accession:open') ? ACCESSION_CREATE : []),
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
    // Batch 645: the Lockbox Drop-Off screen is a low-privilege shared kiosk assigned on purpose, not offered to every case-access role.
    ...(role.caseAccess ? SCREEN_KEYS.filter(k => !admin.includes(k) && k !== LOCKBOX_SCREEN) : []),
    // Batch 381: and the case report's holds and delegation (Pete: keep today's users).
    ...(role.caseAccess ? [...CASE_REPORT_ACTIONS_FOR_CUSTOM] : []),
    // Batch 382: and correcting an applied billing code (also for the roles that resolve billing deficiencies).
    ...(role.caseAccess || role.configAccess ? [...BILLING_CORRECTION] : []),
    ...(role.caseAccess || role.configAccess ? [...BILLING_REVIEW] : []),
    // Batch 383: and releasing an autopsy body.
    ...(role.caseAccess ? [...AUTOPSY_RELEASE] : []),
    ...(role.caseAccess ? [...REPORT_PRINT] : []),
    ...(role.caseAccess ? [...REPORT_IMAGES] : []),
    ...(role.caseAccess ? [...PATIENT_SUMMARY] : []),
    // Batch 468: and recording a forensic chain-of-custody transfer.
    ...(role.caseAccess ? [...AUTOPSY_CUSTODY_TRANSFER] : []),
    // Batch 469: and consent narrowing/revocation, organ-retention disposal, toxicology.
    ...(role.caseAccess ? [...AUTOPSY_CONSENT_MANAGE] : []),
    ...(role.caseAccess ? [...AUTOPSY_RETENTION_DISPOSAL] : []),
    ...(role.caseAccess ? [...AUTOPSY_TOXICOLOGY] : []),
    // Batch 471: and cancelling a toxicology order, retention detail, consent reinstatement.
    ...(role.caseAccess ? [...AUTOPSY_TOXICOLOGY_CANCEL] : []),
    ...(role.caseAccess ? [...AUTOPSY_RETENTION_DETAIL] : []),
    ...(role.caseAccess ? [...AUTOPSY_RETENTION_TIER] : []),
    ...(role.caseAccess ? [...AUTOPSY_CONSENT_REINSTATE] : []),
    // Batch 417: and recording a national identifier.
    ...(role.caseAccess ? [...NATIONAL_IDENTIFIER_RECORD] : []),
    ...(role.caseAccess ? [...REGISTRY_CONSENT_RECORD] : []),
    ...(role.caseAccess ? [...OTHER_CASES_REQUEST] : []),
    // Batch 403: and add-on orders (a role with case access had that screen too).
    ...(role.caseAccess ? [...ADD_ON_ORDER_ACTIONS] : []),
    ...(role.caseAccess ? [...ADD_ON_BENCH_ACTIONS] : []),
    // Batch 404: and Batch Management's overrides (a role with case access had that screen too).
    ...(role.caseAccess ? [...BATCH_OVERRIDE_ACTIONS] : []),
    // Batch 726: and carriers at the workstations (case access had those screens too).
    ...(role.caseAccess ? [...STATION_CARRIER_ACTIONS] : []),
    // Batch 405: and superseding a molecular run.
    ...(role.caseAccess ? [...MOLECULAR_SUPERSEDE] : []),
    // Batch 467: and the molecular Order Queue's actions.
    ...(role.caseAccess ? [...MOLECULAR_ORDER_ACTIONS] : []),
    // Batch 669 (ctl): and reading Control Rules (they could open the page through the Molecular screen).
    ...(role.caseAccess ? [...MOLECULAR_CONTROL_RULES_VIEW] : []),
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
    ...(role.configAccess ? [...PRINT_QUEUE_ACTIONS] : []),
    ...(role.caseAccess ? [...CONSULT_LINK_ACTIONS] : []),
    // Batch 649: and the case actions that had no capability before (keep today's users).
    ...(role.caseAccess ? [...SURGICAL_SIGN_OUT, ...REPORT_RECALL, ...SURGICAL_REVISION_RELEASES, ...POOL_ACTIONS, ...FLAG_ACTIONS, ...DIAGNOSIS_CODE_APPLY, ...INFORMAL_REVIEW_REQUEST] : []),
    // Batch 437: and the exports on the screens it gets.
    ...screenExports([
      ...(role.caseAccess ? SCREEN_KEYS.filter(k => !admin.includes(k) && k !== LOCKBOX_SCREEN) : []),
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
    // Batch 489: flagging a case for Tumor Board/MDT is a clinical
    // judgment call, seeded only to the roles that gross/sign out, not
    // the broader CASE_ACCESS_ROLES (which also reaches bench roles).
    ...(GROSSERS.includes(r) ? ['case:tumor-board:flag'] : []),
    // Batch 490: resolving/dismissing a margin-distance extraction
    // exception is the same kind of clinical judgment call, seeded the
    // same way.
    ...(GROSSERS.includes(r) ? ['case:margin-exception:resolve'] : []),
    // Batch 491: overriding an auto-generated Tumor Board flag is the same
    // kind of clinical judgment call as flagging one, seeded the same way —
    // never the broader CASE_ACCESS_ROLES.
    ...(GROSSERS.includes(r) ? ['case:tumor-board:dismiss'] : []),
    // Batch 491: queue management (status — Presented/Deferred, or
    // cancelling a manual nomination) is broader than the clinical dismiss
    // above — seeded the same way as the other case-access actions below.
    // Batch 493: scheduling (board/meeting date/time/presenter) moved to
    // its own case:tumor-board:schedule, seeded the same way here so
    // nothing changes for existing case-access roles — a clerical/
    // scheduling-only custom role gets just that one, granted separately
    // through the Role Dictionary, not from this seed list.
    ...(CASE_ACCESS_ROLES.includes(r) ? ['case:tumor-board:manage', 'case:tumor-board:schedule'] : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? CASE_REPORT_ACTIONS : []),
    ...(CASE_ACCESS_ROLES.includes(r) || BILLING_CORRECTION_ROLES.includes(r) ? BILLING_CORRECTION : []),
    ...(CASE_ACCESS_ROLES.includes(r) || BILLING_CORRECTION_ROLES.includes(r) ? BILLING_REVIEW : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_RELEASE : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? REPORT_PRINT : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? REPORT_IMAGES : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? PATIENT_SUMMARY : []),
    ...(['pathologist', 'fellow'].includes(r) ? RELATED_CASES : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_CUSTODY_TRANSFER : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_CONSENT_MANAGE : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_RETENTION_DISPOSAL : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_TOXICOLOGY : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_TOXICOLOGY_CANCEL : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_RETENTION_DETAIL : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_RETENTION_TIER : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? AUTOPSY_CONSENT_REINSTATE : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? NATIONAL_IDENTIFIER_RECORD : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? REGISTRY_CONSENT_RECORD : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? OTHER_CASES_REQUEST : []),
    ...(['pathologist', 'fellow', 'resident'].includes(r) ? HISTORY_EXTRACTION : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? REGISTRY_RESEND : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? QA_TREND : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? REGISTRY_GO_LIVE_APPROVE : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? REGISTRY_REVISION_REVIEW : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? CONFIG_SECTIONS_LAB_DIRECTOR : []),
    ...(r === SYSTEM_ROLE_IDS.TEMPLATE_AUTHOR ? CONFIG_TEMPLATE_AUTHOR : []),
    ...(r === SYSTEM_ROLE_IDS.TEMPLATE_APPROVER ? CONFIG_TEMPLATE_APPROVER : []),
    ...(EQUIPMENT_MAINTENANCE_ROLES.includes(r) ? EQUIPMENT_MAINTENANCE : []),
    ...(CYTOLOGY_SIGN_OUT_ROLES.includes(r) ? CYTOLOGY_SIGN_OUT : []),
    ...(CYTOLOGY_SIGN_OUT_ROLES.includes(r) ? CYTOLOGY_SCREENING_HOURS : []),
    ...(r === SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST ? CYTOLOGY_CT_SIGN_OUT : []),
    ...(r === 'pathologist' ? CYTOLOGY_REVISION : []),
    ...(r === 'pathologist' ? CYTOLOGY_EARLY_FINALIZE : []),
    ...(r === 'pathologist' || r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? CYTOLOGY_HPV_MANUAL_RESULT : []),
    ...(r === 'pathologist' || r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? CYTOLOGY_CSMS_ELIGIBILITY : []),
    ...(PEER_REVIEW_ROLES.includes(r) ? PEER_REVIEW_VERDICTS : []),
    ...(PEER_REVIEW_ROLES.includes(r) ? PEER_REVIEW_CASE_ACTIONS : []),
    ...(r === 'pathologist' ? PEER_REVIEW_PATHOLOGIST_ACTIONS : []),
    ...(PEER_REVIEW_ROLES.includes(r) ? CYTOLOGY_REVIEW_TAKE : []),
    ...(ADD_ON_ORDER_ROLES.includes(r) ? ADD_ON_ORDER_ACTIONS : []),
    ...(caps.includes('screen:add-on-orders:open') || caps.includes('screen:microtomy:open') ? ADD_ON_BENCH_ACTIONS : []),
    ...(caps.includes('screen:batch-management:open') ? BATCH_OVERRIDE_ACTIONS : []),
    ...(STATION_CARRIER_SCREENS.some(k => caps.includes(k)) ? STATION_CARRIER_ACTIONS : []),
    ...(caps.includes('screen:batch-management:open') ? MATERIAL_DISPOSAL : []),
    ...(caps.includes('screen:batch-management:open') ? LAB_WORKFLOW_REPORTS : []),
    ...(caps.includes('screen:microtomy:open') || caps.includes('screen:slide-distribution:open') ? MATERIAL_END_STATE : []),
    ...(ADD_ON_ORDER_ROLES.includes(r) ? REEMBED_REQUEST : []),
    ...(caps.includes('screen:embedding:open') ? REEMBED_COMPLETE : []),
    ...(caps.includes('screen:cytology-prep:open') ? CELL_BLOCK_HANDOFF : []),
    ...(caps.includes('screen:grossing:open') || caps.includes('screen:cytology-prep:open') ? SPECIMEN_DIVIDE : []),
    ...(caps.includes('screen:cytology-prep:open') || caps.includes('screen:batch-management:open') ? ALIQUOT_STATUS : []),
    ...(caps.includes('screen:batch-management:open') ? REFERRAL_TRANSIT : []),
    ...(caps.includes('screen:batch-management:open') ? WSI_SCAN_BATCH : []),
    ...(caps.includes('screen:audit-log:open') ? AUDIT_ERROR_RESOLVE : []),
    ...(caps.includes('screen:audit-log:open') ? PRINT_QUEUE_ACTIONS : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? CONSULT_LINK_ACTIONS : []),
    ...(r === 'pathologist' || r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? CONSULT_LINK_REVEAL_IDENTITY : []),
    ...(r === SYSTEM_ROLE_IDS.ACCESSIONER ? [...LOCKBOX_RECEIVE, ...LOCKBOX_FOLDER, ...LOCKBOX_RESOLVE] : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? CONSULT_LINK_OVERSIGHT : []),
    ...(caps.includes('screen:audit-log:open') ? AUDIT_LOG_EXPORTS : []),
    ...(caps.includes('screen:search:open') ? CASE_SEARCH_EXPORT : []),
    ...(caps.includes('screen:my-contributions:open') ? CONTRIBUTION_EXPORTS : []),
    ...(caps.includes('screen:quality-assurance:open') ? CAPA_DECIDE : []),
    ...(caps.includes('screen:quality-assurance:open') ? FOLLOW_UP_ACTIONS : []),
    ...(caps.includes('screen:quality-assurance:open') ? QA_DEFICIENCY_ACTIONS : []),
    ...(caps.includes('screen:accession:open') ? [...ACCESSION_CREATE, ...REQUISITION_INBOX] : []),
    ...(caps.includes('screen:slide-distribution:open') ? STAIN_QC_SIGN_OFF : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? [...STAIN_QC_SIGN_OFF, ...STAIN_QC_OVERRIDE] : []),
    ...(SIGNING_ROLES.includes(r) ? [...SURGICAL_SIGN_OUT, ...DIAGNOSIS_CODE_APPLY, ...INFORMAL_REVIEW_REQUEST] : []),
    ...(ATTENDING_ROLES.includes(r) ? SURGICAL_RELEASES : []),
    ...(POOL_ROLES.includes(r) ? [...POOL_ACTIONS, ...REPORT_RECALL] : []),
    ...(r === SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST ? DIAGNOSIS_CODE_APPLY : []),
    ...(CASE_ACCESS_ROLES.includes(r) ? FLAG_ACTIONS : []),
    ...(FOLLOW_UP_EXPECT_ROLES.includes(r) ? FOLLOW_UP_EXPECT : []),
    ...(ORGAN_MAP_INSERT_ROLES.includes(r) ? ORGAN_MAP_INSERT : []),
    ...(r === 'pathologist' || r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? CASE_EDIT_CONFLICT_OVERRIDE : []),
    ...(r === 'pathologist' ? RESTRICTED_CASE_PRINT : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? INKING_GATE_OVERRIDE : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? HELD_PRINT_OVERRIDE : []),
    ...(r === 'pathologist' || r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? MISMATCH_RULES_VIEW : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? AI_PROMPT_APPROVE : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? [...MOLECULAR_CONTROL_RULES_VIEW, ...MOLECULAR_CONTROL_RULES_MANAGE] : []),
    ...(caps.includes('screen:molecular:open') ? MOLECULAR_CONTROL_RULES_VIEW : []),
    ...(CLINICAL_HISTORY_RECORD_ROLES.includes(r) ? CLINICAL_HISTORY_RECORD : []),
    ...(r === SYSTEM_ROLE_IDS.HISTOTECHNOLOGIST ? LABEL_BATCH_REPRINT : []),
    ...(r === SYSTEM_ROLE_IDS.LAB_DIRECTOR ? BLOCK_DELETE_SIGNED_OUT : []),
    ...(r === 'pathologist' ? BLOCK_FLAG_AMENDED : []),
    ...(r === 'pathologist' ? SMART_CAPTURE : []),
    ...(r === 'pathologist' ? OTHER_CASES_DECIDE : []),
    ...(caps.includes('screen:molecular:open') ? MOLECULAR_SUPERSEDE : []),
    ...(caps.includes('screen:molecular:open') ? MOLECULAR_ORDER_ACTIONS : []),
    ...MESSAGING,
  ]])),
  [SYSTEM_ROLE_IDS.SUPERADMIN]: SUPERADMIN_CAPABILITY_KEYS,
  [SYSTEM_ROLE_IDS.ADMIN]: [...BREAK_GLASS_REBIND, ...EXPORTS, ...CASE_EDIT_CONFLICT_OVERRIDE, ...INKING_GATE_OVERRIDE, ...ADMINISTRATION, ...SUPPORT_ACCESS, ...CONFIG_SECTIONS, ...SCREEN_SEEDS[SYSTEM_ROLE_IDS.ADMIN], ...BILLING_CORRECTION, ...BILLING_REVIEW, ...MESSAGING, ...AUDIT_ERROR_RESOLVE, ...PRINT_QUEUE_ACTIONS, ...INTERFACE_RESEND, ...INTERFACE_HOLD_RELEASE, ...LOCKBOX_FOLDER, ...INTERFACE_MONITORING, ...SERVER_JOBS, ...LABEL_BATCH_REPRINT, ...CONSULT_LINK_OVERSIGHT, ...screenExports(SCREEN_SEEDS[SYSTEM_ROLE_IDS.ADMIN]), ...BLOCK_DELETE_SIGNED_OUT, ...OTHER_CASES_DECIDE, ...HELD_PRINT_OVERRIDE],
  [SYSTEM_ROLE_IDS.QA_REVIEWER]: [...EXPORTS, ...MISMATCH_RULES_VIEW, ...AI_PROMPT_VIEW, ...MOLECULAR_CONTROL_RULES_VIEW, ...SCREEN_SEEDS[SYSTEM_ROLE_IDS.QA_REVIEWER], ...BILLING_CORRECTION, ...BILLING_REVIEW, ...MESSAGING, ...AUDIT_ERROR_RESOLVE, ...PRINT_QUEUE_ACTIONS, ...CONSULT_LINK_OVERSIGHT, ...screenExports(SCREEN_SEEDS[SYSTEM_ROLE_IDS.QA_REVIEWER]), ...BLOCK_DELETE_SIGNED_OUT, ...BLOCK_FLAG_AMENDED],
};

/**
 * Batch 371 (Pete: hospital administrators have no control over
 * Superadmin). The Superadmin role always holds the whole catalog (since
 * Batch 536, except SUPERADMIN_WITHHELD); any
 * stored difference is put back on load. ForMedrixAI decides what it
 * holds, in the catalog, not a hospital in its Role Dictionary.
 */
export function lockPlatformRoles<R extends SeedableRole>(roles: readonly R[]): { roles: R[]; changed: boolean } {
  let changed = false;
  const out = roles.map(r => {
    if (r.id !== SYSTEM_ROLE_IDS.SUPERADMIN) return r;
    const have = r.capabilities ?? [];
    if (have.length === SUPERADMIN_CAPABILITY_KEYS.length && SUPERADMIN_CAPABILITY_KEYS.every(k => have.includes(k))) return r;
    changed = true;
    return { ...r, capabilities: [...SUPERADMIN_CAPABILITY_KEYS], seededCapabilities: [...SUPERADMIN_CAPABILITY_KEYS] };
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
