// src/services/authorization/capabilityCatalog.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-355 (Batch 369): the catalog of capabilities, the one list of things a
// role can be granted that PathScribe actually enforces.
//
//   • Keys are `domain:object:verb`, verb last: `qa:fppe-tracking:export`.
//   • Every capability here is checked by a service (the authorization
//     guard test fails the build otherwise), so there are no dead flags.
//   • A capability is added when its check is added, never before. Actions
//     not yet identified are simply not in the catalog yet.
//   • `requires` lists capabilities this one can't be used without. The
//     Role Dictionary offers to turn them on with it, the role service
//     refuses a role that has one without the other, and the check denies
//     it. Use it when one capability exposes the data of another (the
//     evidence binder exports the records the QA dashboard totals).
//   • `group` is how administrators see the list in Staff → Roles.
//   • Risk 'high' means every check of it at an action is written to the
//     audit log, allowed or denied. Every export is high risk.
//
// Labels and descriptions are UI text: `capabilities.items.<labelId>` in the
// locale files. The key itself is what's stored on a role and audited.
//
// Not to be confused with constants/systemActions.ts (ACTION_GROUPS): those
// are the voice and keyboard commands, which are not access control.
// ─────────────────────────────────────────────────────────────────────────────
import { LOCKBOX_CAPABILITIES } from './lockboxCapabilities'; import { BATCH_CARRIER_CAPABILITIES } from './batchCarrierCapabilities'; import { LAB_WORKFLOW_REPORT_CAPABILITIES } from './labWorkflowReportCapabilities'; import { MATERIAL_LIFECYCLE_CAPABILITIES } from './materialLifecycleCapabilities'; import { PRINTING_POLICY_CAPABILITIES } from './printingPolicyCapabilities'; import { BENCH_REASON_CAPABILITIES } from './benchReasonCapabilities'; import { CYTOLOGY_PREP_CAPABILITIES } from './cytologyPrepCapabilities'; import { CASE_ATTACHMENT_CAPABILITIES } from './caseAttachmentCapabilities';
import { WORKFLOW_CAPABILITIES } from './workflowCapabilities'; import { INTRAOP_CAPABILITIES } from './intraopCapabilities'; import { MOLECULAR_CONTROL_RULES_CAPABILITIES } from './molecularControlRulesCapabilities';
export type CapabilityRisk = 'high' | 'standard';
export type CapabilityGroupId =
  | 'screens'
  | 'casework'
  | 'billing'
  | 'autopsy'
  | 'messaging'
  | 'reportHistory'
  | 'qaOperations'
  | 'qaCapa'
  | 'qaFinancials'
  | 'qaCytology'
  | 'qaOversight'
  | 'administration'
  | 'configTemplates'
  | 'configAi'
  | 'configCytology'
  | 'configLab'
  | 'configQuality'
  | 'configOperations'
  | 'configIntegrations'
  | 'configBilling'
  | 'configSystem'
  | 'supportAccess'
  | 'platform';

export interface CapabilityDefinition {
  /** Stored on roles and written to the audit log. Never change a published key. */
  readonly key: string;
  /** Locale key under capabilities.items. */
  readonly labelId: string;
  readonly group: CapabilityGroupId;
  readonly risk: CapabilityRisk;
  /** Capabilities that must be granted too for this one to work. */
  readonly requires: readonly string[];
  /** Batch 371 (Pete): ForMedrixAI platform support only. Held only through
   *  a role staff can't be given (Superadmin); a hospital role can never
   *  hold it, and a hospital administrator can't grant it. */
  readonly platformOnly?: boolean;
}

/** The order groups are shown in. */
export const CAPABILITY_GROUPS: readonly CapabilityGroupId[] = [
  'screens', 'casework', 'billing', 'autopsy', 'messaging', 'reportHistory', 'qaOperations', 'qaCapa', 'qaFinancials', 'qaCytology', 'qaOversight', 'administration',
  'configTemplates', 'configAi', 'configCytology', 'configLab', 'configQuality', 'configOperations', 'configIntegrations', 'configBilling', 'configSystem',
  'supportAccess', 'platform',
];

export const CAPABILITY_CATALOG = [
  // ── Screens (Batch 374) ───────────────────────────────────────────────────
  // Pete: "Home Page should only show tiles that the User has access to."
  // One capability per screen. The Home page and the two hubs show only the
  // tiles whose screen the user may open, and the route itself checks again
  // (services/screens/screenAccess.ts). Standard risk: opening a screen
  // isn't audited; what is done there is checked by its own capabilities.
  { key: 'screen:accession:open',            labelId: 'screenAccessionOpen',           group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:worklist:open',             labelId: 'screenWorklistOpen',            group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:search:open',               labelId: 'screenSearchOpen',              group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:add-on-orders:open',        labelId: 'screenAddOnOrdersOpen',         group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:intraop-queue:open',        labelId: 'screenIntraopQueueOpen',        group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:cytology-qc-queue:open',    labelId: 'screenCytologyQcQueueOpen',     group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:surgical-qa-worklist:open', labelId: 'screenSurgicalQaWorklistOpen',  group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:my-contributions:open',     labelId: 'screenMyContributionsOpen',     group: 'screens', risk: 'standard', requires: [] },
  // Batch 488 (Pete): the dedicated bench-contribution page for the four
  // bench roles (Accessioner, Histotechnologist, Cytotechnologist,
  // Molecular Technologist) — real accessioning rate, batch throughput/
  // queue aging, stage-to-stage TAT, and molecular QC/rerun data, never
  // the pathologist-facing myContributions screen above.
  { key: 'screen:bench-contributions:open',  labelId: 'screenBenchContributionsOpen',  group: 'screens', risk: 'standard', requires: [] },
  // Batch 489 (Module 1 of Pete's Tumor Board / MDT Workspace spec): the
  // dedicated board-nomination workspace (filters by board/status/
  // presenter/meeting window; the "Flag for MDT" action is a separate
  // case-level capability, case:tumor-board:flag, below).
  { key: 'screen:tumor-board:open',          labelId: 'screenTumorBoardOpen',          group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:batch-management:open',     labelId: 'screenBatchManagementOpen',     group: 'screens', risk: 'standard', requires: [] },
  // Pathology Workspace hub
  { key: 'screen:cytology-workspace:open',   labelId: 'screenCytologyWorkspaceOpen',   group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:microtomy:open',            labelId: 'screenMicrotomyOpen',           group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:grossing:open',              labelId: 'screenGrossingOpen',            group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:embedding:open',            labelId: 'screenEmbeddingOpen',           group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:slide-distribution:open',   labelId: 'screenSlideDistributionOpen',   group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:molecular:open',            labelId: 'screenMolecularOpen',           group: 'screens', risk: 'standard', requires: [] },
  // Batch 491: the margin-extraction review queue (Pending
  // MarginExtractionException records a rule can't evaluate until a
  // human tags the real distance or dismisses it) — deferred from Batch
  // 490's own extraction layer. Seeded the same way as the case-level
  // case:margin-exception:resolve action it gates access to (GROSSERS
  // only), in the Pathology Workspace hub alongside the other grossing-
  // adjacent screens.
  { key: 'screen:margin-exception-review:open', labelId: 'screenMarginExceptionReviewOpen', group: 'screens', risk: 'standard', requires: [] },
  // Quality & Compliance hub
  { key: 'screen:audit-log:open',            labelId: 'screenAuditLogOpen',            group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:quality-assurance:open',    labelId: 'screenQualityAssuranceOpen',    group: 'screens', risk: 'standard', requires: [] },
  // Batch 610 (#61, #89): the three-tier autopsy dashboards, in Quality & Compliance.
  { key: 'screen:autopsy-dashboards:open',   labelId: 'screenAutopsyDashboardsOpen',   group: 'screens', risk: 'standard', requires: [] },
  // Batch 619 (PS-800): the one Outbound Queue, in the Quality & Compliance hub.
  { key: 'screen:outbound-queue:open',       labelId: 'screenOutboundQueueOpen',       group: 'screens', risk: 'standard', requires: [] },
  // Batch 421 (Registry Engine SRS v2.1, FR-008.6): the Registry Exceptions worklist, in Quality & Compliance.
  { key: 'screen:registry-exceptions:open', labelId: 'screenRegistryExceptionsOpen', group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:configuration:open',        labelId: 'screenConfigurationOpen',       group: 'screens', risk: 'standard', requires: [] },
  // ── Case work (Batch 378) ─────────────────────────────────────────────────
  // Completing grossing moves a case to Gross Complete after checking the
  // organisation's Grossing field requirements (services/grossing).
  { key: 'case:grossing:complete', labelId: 'caseGrossingComplete', group: 'casework', risk: 'high', requires: [] },
  // Batch 381 (Pete: "Add, keep today's users"): holds and delegation had no
  // permission check. Checked in services/cases/caseHolds.ts and
  // delegations/mockDelegationService.ts; seeded to every role that could
  // open a case report before, so nobody loses them.
  { key: 'case:hold:place',             labelId: 'caseHoldPlace',             group: 'casework', risk: 'high', requires: [] },
  { key: 'case:hold:release',           labelId: 'caseHoldRelease',           group: 'casework', risk: 'high', requires: [] },
  { key: 'case:retention-hold:place',   labelId: 'caseRetentionHoldPlace',    group: 'casework', risk: 'high', requires: [] },
  { key: 'case:retention-hold:release', labelId: 'caseRetentionHoldRelease',  group: 'casework', risk: 'high', requires: [] },
  { key: 'case:delegation:create',      labelId: 'caseDelegationCreate',      group: 'casework', risk: 'high', requires: [] },
  // Batch 489 (Module 1 of Pete's Tumor Board / MDT Workspace spec):
  // nominating a case for a board's agenda ("Flag for MDT"). Deliberately
  // its own capability, not a reuse of case:delegation:create above —
  // that one also reaches the bench roles (CASE_ACCESS_ROLES), but
  // flagging a case for multidisciplinary discussion is a clinical/
  // diagnostic judgment call, seeded only to GROSSERS (Pathologist,
  // Fellow, Resident, PA) in capabilitySeeds.ts.
  { key: 'case:tumor-board:flag',       labelId: 'caseTumorBoardFlag',        group: 'casework', risk: 'high', requires: [] },
  // Batch 490 (margin-distance extraction layer): manually tagging the real
  // distance for a free-text margin answer the parser couldn't confidently
  // read (resolveException), or closing the exception with no numeric tag
  // (dismissException). A judgment call on what the pathologist's own
  // words mean clinically, same reasoning as case:tumor-board:flag above —
  // seeded only to GROSSERS in capabilitySeeds.ts, not every case-access role.
  { key: 'case:margin-exception:resolve', labelId: 'caseMarginExceptionResolve', group: 'casework', risk: 'high', requires: [] },
  // Batch 491 (PS-359 follow-up; Pete, Oct 8: separate queue management from
  // clinical dismiss). Moving a listing through its status lifecycle
  // (Presented/Deferred, or cancelling a manual nomination) — the
  // clinical/coordinator judgment of where a case stands, never moving a
  // listing to 'Dismissed' (see case:tumor-board:dismiss below).
  // Batch 493 (Pete, Oct 8: "a specific permission to schedule these MDT
  // so that an admin assistant can schedule them in advance"): the real
  // follow-up the comment above once predicted — board/meeting-date/
  // meeting-time/presenter assignment moved OUT of this capability and
  // into the new, narrower case:tumor-board:schedule below, so an admin
  // can grant a clerical/scheduling-only custom role (e.g. "Admin
  // Assistant") just that capability through the Role Dictionary, without
  // also granting this one's status-change authority.
  { key: 'case:tumor-board:manage',     labelId: 'caseTumorBoardManage',      group: 'casework', risk: 'standard', requires: [] },
  // Batch 493: the real, specific "schedule an MDT in advance" permission
  // Pete asked for — board, meeting date/time, and presenter assignment,
  // split out of case:tumor-board:manage above so a non-clinical
  // scheduling role can hold exactly this and nothing else (no status
  // changes, no case-access implications). Seeded to the same case-access
  // roles as case:tumor-board:manage, so nothing changes for existing
  // clinical users — this exists so an admin can ALSO grant it, alone, to
  // a custom role through Config → Staff → Role Dictionary.
  { key: 'case:tumor-board:schedule',   labelId: 'caseTumorBoardSchedule',    group: 'casework', risk: 'standard', requires: [] },
  // Overriding an auto-generated Tumor Board flag is the clinical judgment
  // call Pete's recommendation (Oct 8) called out by name: "An
  // administrative user should never have the permission to silently
  // dismiss a clinical quality or tumor board flag." Seeded only to
  // GROSSERS, same as case:tumor-board:flag above — never the broader
  // case:tumor-board:manage/case:tumor-board:schedule roles.
  { key: 'case:tumor-board:dismiss',    labelId: 'caseTumorBoardDismiss',     group: 'casework', risk: 'high', requires: [] },
  // Batch 441: changing a case's team (Case Team), including who its primary pathologist is.
  { key: 'case:team:manage',            labelId: 'caseTeamManage',            group: 'casework', risk: 'high', requires: [] },
  // Batch 417 (Registry Engine SRS v2.1, FR-004.3): recording or removing a
  // patient's national identifier (NHS number, BSN, IHI…), the number every
  // registry keys on. Checked in services/patientIdentifiers/recordNationalPatientIdentifier.ts.
  // Batch 603 (Pete, dev review): break-glass rebind was open to a role string; now its own permission. It still needs a reason code and a written justification (the service enforces both) and is audited.
  { key: 'patient:break-glass:rebind', labelId: 'patientBreakGlassRebind', group: 'casework', risk: 'high', requires: [] },
  { key: 'patient:national-identifier:record', labelId: 'patientNationalIdentifierRecord', group: 'casework', risk: 'high', requires: [] },
  // Batch 418 (SRS v2.1, FR-008.1): recording a patient's registry opt-outs
  // (screening programme; cancer registry where the law allows). Checked in
  // services/registryConsent/recordPatientRegistryConsent.ts.
  { key: 'patient:registry-consent:record', labelId: 'patientRegistryConsentRecord', group: 'casework', risk: 'high', requires: [] },
  // Batch 613 (Pete, Oct 18, 2026): a patient's other cases the signed-in user cannot open. Asking is standard risk; deciding
  // (approve, deny, revoke) is high risk. Deciding is also limited, in the service, to the case's assigned pathologist or an administrator.
  { key: 'patient:other-cases:request-access', labelId: 'patientOtherCasesRequestAccess', group: 'casework', risk: 'standard', requires: [] },
  { key: 'patient:other-cases:decide-access',  labelId: 'patientOtherCasesDecideAccess',  group: 'casework', risk: 'high',     requires: [] },
  // Batch 390 (PS-340): correcting a signed-out cytology diagnosis, and adding
  // an addendum to one, are two separate acts (a correction replaces what was
  // reported; an addendum leaves it standing). Checked in
  // services/cytology/releaseCytologyCorrection.ts and releaseCytologyAddendum.ts.
  { key: 'cytology:report:correct',     labelId: 'cytologyReportCorrect',     group: 'casework', risk: 'high', requires: [] },
  { key: 'cytology:report:addend',      labelId: 'cytologyReportAddend',      group: 'casework', risk: 'high', requires: [] },
  // Batch 409 (Pete: "Keep today's users"): signing out a cytology specimen
  // (or, for a resident, FPPE hire or new cytotechnologist, releasing it for
  // countersign). On top of signing authority and the CT/countersign rules,
  // never instead of them. Checked in services/cytology/signOutCytologyCase.ts.
  { key: 'cytology:report:sign-out',    labelId: 'cytologyReportSignOut',     group: 'casework', risk: 'high', requires: [] },
  // Batch 415 (Pete: "Control via permissions"): a cytotechnologist signing out
  // (negative GYN, or the advanced-CT exception), on top of the sign-out
  // permission. A lab in a country where cytotechnologists don't sign reports
  // takes it off the role. Checked in services/cytology/signOutCytologyCase.ts.
  { key: 'cytology:ct-report:sign-out', labelId: 'cytologyCtReportSignOut',   group: 'casework', risk: 'high', requires: ['cytology:report:sign-out'] },
  // Batch 410 (Pete: each gets its own permission, today's users keep it): the
  // rest of the Cytology Workspace's actions. Recording a screening review
  // (services/cytology/saveCytologyReview.ts); choosing which review is the
  // final diagnosis, removing a QC flag (which would let a cytotechnologist
  // sign out without the rescreen), recording the 5-year retrospective review
  // outcome, and recording or dismissing a cyto-histologic correlation
  // (services/cytology/cytologyCaseActions.ts). Adding a QC flag needs none.
  { key: 'cytology:review:record',                labelId: 'cytologyReviewRecord',               group: 'casework', risk: 'high', requires: [] },
  // Batch 572 (Pete, Oct 14, 2026; F7 option C): confirm or correct your own screening hours at the end of the day (the screening hours record; the supervisor's workload report counts them).
  { key: 'cytology:screening-hours:sign-off',     labelId: 'cytologyScreeningHoursSignOff',      group: 'casework', risk: 'high', requires: [] },
  { key: 'cytology:hpv-result:record-manual',     labelId: 'cytologyHpvResultRecordManual',      group: 'casework', risk: 'high', requires: [] },
  { key: 'cytology:csms-eligibility:verify',     labelId: 'cytologyCsmsEligibilityVerify',      group: 'casework', risk: 'high', requires: [] },
  { key: 'cytology:final-diagnosis:select',       labelId: 'cytologyFinalDiagnosisSelect',       group: 'casework', risk: 'high', requires: [] },
  { key: 'cytology:qc-flag:remove',               labelId: 'cytologyQcFlagRemove',               group: 'casework', risk: 'high', requires: [] },
  { key: 'cytology:retrospective-review:record',  labelId: 'cytologyRetrospectiveReviewRecord',  group: 'casework', risk: 'high', requires: [] },
  { key: 'cytology:histology-correlation:record', labelId: 'cytologyHistologyCorrelationRecord', group: 'casework', risk: 'high', requires: [] },
  // Batch 411 (Pete: finalize a multi-specimen case only when every specimen is
  // signed out, "or provide an explicit override permission for authorized
  // users"): finalizing a cytology case early, with a reason, audited. Checked
  // in services/cytology/cytologyCaseFinalization.ts.
  { key: 'cytology:case:finalize',                labelId: 'cytologyCaseFinalize',               group: 'casework', risk: 'high', requires: [] },
  // Batch 412 (Pete): asking a review's author to revise it before sign-out.
  // It stops a cytotechnologist signing out until the author revises or a
  // pathologist records their own review; plain notes need no permission.
  // Checked in services/cytology/cytologyReviewNotes.ts.
  { key: 'cytology:revision:request',             labelId: 'cytologyRevisionRequest',            group: 'casework', risk: 'high', requires: [] },
  // Batch 533 (Pete, Oct 12: an urgent per-specimen preliminary; who may send
  // one is "Configurable"): releasing a cytology specimen's preliminary report
  // ahead of the case report. No built-in role starts with it (Superadmin
  // aside, which has every capability): each laboratory grants it in the Role
  // Dictionary. Checked in services/cytology/releaseCytologyPreliminary.ts.
  { key: 'cytology:preliminary:release',          labelId: 'cytologyPreliminaryRelease',         group: 'casework', risk: 'high', requires: [] },

  // Batch 396: recording a peer-review verdict. Taking a cytology QC review and
  // recording its concurrence or discrepancy (services/cytologyQc/
  // mockCytologyQcCaseAssignmentService.ts), and recording or dismissing a
  // surgical post-sign-out QA review (services/quality/surgicalQaReview.ts).
  // Pete: from the queue or from the case screen.
  { key: 'cytology:qc-review:record',   labelId: 'cytologyQcReviewRecord',    group: 'casework', risk: 'high', requires: [] },
  // Batch 432 (Pete): the supervisor bypass on the Cytology QC queue forces a
  // case to final-approved with a justification. Nobody by default; an
  // administrator assigns it, and it opens the queue for the override.
  { key: 'cytology:qc-review:bypass',   labelId: 'cytologyQcReviewBypass',    group: 'casework', risk: 'high', requires: [] },
  { key: 'surgical:qa-review:record',   labelId: 'surgicalQaReviewRecord',    group: 'casework', risk: 'high', requires: [] },

  // Batch 439 (PS-144): peer review before sign-out. Asking for one (and
  // withdrawing it), the reviewer's independent read, and signing out ahead
  // of it for urgent care when the sign-out gate is on. Checked in
  // services/quality/peerReviewService.ts.
  { key: 'case:peer-review:request',    labelId: 'casePeerReviewRequest',     group: 'casework', risk: 'high', requires: [] },
  { key: 'case:peer-review:record',     labelId: 'casePeerReviewRecord',      group: 'casework', risk: 'high', requires: [] },
  { key: 'case:peer-review:override',   labelId: 'casePeerReviewOverride',    group: 'casework', risk: 'high', requires: [] },
  // Batch 439 (PS-145): the pathologist's decision on a clinical-pathologic
  // mismatch suggestion (services/clinical/clinicalMismatchDecision.ts).
  { key: 'case:clinical-mismatch:record', labelId: 'caseClinicalMismatchRecord', group: 'casework', risk: 'high', requires: [] },
  // Batch 530 (Pete, Oct 11, 2026): adding or reconciling a case's structured
  // clinical history after accession (grossing, report review, sign-out), so a
  // case accessioned without one isn't stuck. Pathologist, Fellow, Resident and
  // PA by default. Checked in services/clinicalHistory/recordClinicalHistoryAfterAccession.ts.
  { key: 'case:clinical-history:record', labelId: 'caseClinicalHistoryRecord', group: 'casework', risk: 'high', requires: [] },
  // Batch 439 (PS-148): assessing an outside consultant's opinion against the
  // case (services/consultAccess/mockConsultTokenService.ts).
  { key: 'case:outside-consult:assess', labelId: 'caseOutsideConsultAssess',  group: 'casework', risk: 'high', requires: [] },
  // Batch 515 (PS-290): issuing and revoking an outside consultant's view-only
  // link to a case (services/consultAccess/mockConsultTokenService.ts).
  { key: 'case:consult-link:issue',  labelId: 'caseConsultLinkIssue',  group: 'casework', risk: 'high', requires: [] },
  { key: 'case:consult-link:revoke', labelId: 'caseConsultLinkRevoke', group: 'casework', risk: 'high', requires: [] },
  // Batch 522 (PS-290): every outside consult link across all cases (Audit Log → Consult links).
  { key: 'audit:consult-links:view', labelId: 'auditConsultLinksView', group: 'qaOversight', risk: 'high', requires: ['screen:audit-log:open'] },
  // Batch 440 (PS-271 follow-up): a pathologist takes a positive GYN case
  // from the Cytology Review tray and becomes its primary
  // (services/cytology/cytologyQueuesLive.ts).
  { key: 'cytology:pathologist-review:take', labelId: 'cytologyPathologistReviewTake', group: 'casework', risk: 'high', requires: [] },

  // Batch 403 (Pete: "Both, all 3 roles"): placing a pathologist's add-on order
  // (recuts, special stains, IHC, molecular/send-out; also cancelling one or
  // modifying and resubmitting it after a block exception), and approving
  // destructive cutting when the block may be used up. Checked in
  // services/addOnOrders/addOnOrderActions.ts; seeded to Pathologist, Fellow
  // and Resident, who had the Add-On Orders screen.
  { key: 'add-on:order:place',                     labelId: 'addOnOrderPlace',                    group: 'casework', risk: 'high', requires: [] },
  { key: 'add-on:exception:approve-destructive-cut', labelId: 'addOnExceptionApproveDestructiveCut', group: 'casework', risk: 'high', requires: [] },

  // Batch 404 and 726: Batch Management's overrides and carriers at the workstations (batchCarrierCapabilities.ts).
  ...BATCH_CARRIER_CAPABILITIES,
  ...LAB_WORKFLOW_REPORT_CAPABILITIES, // Batch 730: lab workflow reports (labWorkflowReportCapabilities.ts).
  ...MATERIAL_LIFECYCLE_CAPABILITIES, ...PRINTING_POLICY_CAPABILITIES, ...BENCH_REASON_CAPABILITIES, ...CYTOLOGY_PREP_CAPABILITIES, ...CASE_ATTACHMENT_CAPABILITIES, // Batch 731: end states and re-embedding; 734: direct printing; 736: bench reasons; 740: cytology preparation; 742: case attachments.
  // Batch 432: recording where a referral batch is (in transit, delivered).
  { key: 'referral:transit-status:update', labelId: 'referralTransitStatusUpdate', group: 'casework', risk: 'high', requires: [] },
  // Batch 434 (Pete): WSI scan batches. Loading slides from the scanning queue
  // into a batch on a slide scanner, sending its manifest to the scanner
  // through the interface engine, and unloading it. Checked in
  // services/digitalPathology/wsiScanBatchWorkflow.ts against the scanner's
  // lab; seeded to every role with the Batch Management screen.
  { key: 'wsi:scan-batch:load',   labelId: 'wsiScanBatchLoad',   group: 'casework', risk: 'standard', requires: [] },
  { key: 'wsi:scan-batch:send',   labelId: 'wsiScanBatchSend',   group: 'casework', risk: 'standard', requires: [] },
  { key: 'wsi:scan-batch:unload', labelId: 'wsiScanBatchUnload', group: 'casework', risk: 'standard', requires: [] },
  // Batch 407 (Pete: "Keep today's users"): disposing of retained material
  // (wet tissue, blocks, slides) by scanning it on the Disposal Queue. The one
  // irreversible step in the retention workflow. Checked in
  // services/retentionPolicy/disposeItemByScan.ts, with the station's facility;
  // seeded to every role with the Batch Management screen (where the Disposal
  // Queue lives) and to a hospital's own roles with case access.
  { key: 'retention:material:dispose',             labelId: 'retentionMaterialDispose',           group: 'casework', risk: 'high', requires: [] },
  // Batch 452: removing a decant from the material tree.
  { key: 'case:decant:delete',                     labelId: 'caseDecantDelete',                   group: 'casework', risk: 'high', requires: [] },
  // Batch 588 (Pete, Oct 16 2026): deleting a block that is still in process (a soft delete: the
  // block stays on the case marked Deleted). Which roles hold it is each facility's choice through
  // its role grants. Checked in services/material/deleteBlockInProcess.ts.
  { key: 'material:block:delete-in-process',       labelId: 'materialBlockDeleteInProcess',       group: 'casework', risk: 'high', requires: [] },
  { key: 'material:block:delete-signed-out',       labelId: 'materialBlockDeleteSignedOut',       group: 'casework', risk: 'high', requires: [] },
  { key: 'material:block:flag-amended',             labelId: 'materialBlockFlagAmended',           group: 'casework', risk: 'high', requires: [] },
  { key: 'batch:cold-chain-reading:simulate',       labelId: 'batchColdChainReadingSimulate',      group: 'casework', risk: 'standard', requires: [] },
  { key: 'retention:holds-queue:export',            labelId: 'retentionHoldsQueueExport',          group: 'casework', risk: 'high', requires: [] },
  // Batch 454 (Pete): marking a signed-out surgical case "follow-up specimen
  // expected" (a resection or excision), so the lab is told if none arrives in
  // the biopsy-to-resection window. Checked in services/followUp/followUpActions.ts.
  { key: 'case:follow-up:expect',                  labelId: 'caseFollowUpExpect',                 group: 'casework', risk: 'standard', requires: [] },
  // Batch 461 (organ maps): placing the anatomical map image in the report, or
  // taking it out. Checked in services/organMapping/organMapFigures.ts.
  { key: 'report:organ-map:insert',                labelId: 'reportOrganMapInsert',               group: 'casework', risk: 'standard', requires: [] },
  // Batch 495 (PS-283 §4.2.4): printing a case report — print, reprint,
  // print from the preview window, or opening a stored version's PDF. Before,
  // none of the four was checked. Checked in services/printing/reportPrintGate.ts
  // with the case and its facility; seeded to every role with case access
  // (keep today's users). High risk: patient data leaves the app on paper.
  // Batch 497: the preview window was retired; three print paths remain.
  { key: 'report:case-report:print',               labelId: 'reportCaseReportPrint',              group: 'casework', risk: 'high', requires: [] },
  // Batch 516 (PS-283, Pete): printing a case that carries a print-restricting
  // flag (VIP, confidential consultation). Checked on top of report:case-report:print
  // (services/printing/reportPrintGate.ts).
  { key: 'report:restricted-case:print', labelId: 'reportRestrictedCasePrint', group: 'casework', risk: 'high', requires: ['report:case-report:print'] },
  // Batch 609 (PS-44): attaching images to a case's report (gross photographs,
  // microphotographs) and taking them off. They print after the report's own
  // pages, so the action changes what leaves the lab. Checked in
  // services/imageAssociation/caseReportImages.ts; seeded to every role with
  // case access (the people who handle the case's images today).
  { key: 'report:case-images:attach', labelId: 'reportCaseImagesAttach', group: 'casework', risk: 'standard', requires: [] },
  // Batch 613: a patient's other released cases, sent with the report being signed out; and the Patient summary print.
  { key: 'report:related-cases:attach', labelId: 'reportRelatedCasesAttach', group: 'casework', risk: 'standard', requires: [] },
  { key: 'patient:summary:print', labelId: 'patientSummaryPrint', group: 'casework', risk: 'high', requires: [] },
  // Batch 621: the AI reads a historical report's text and keeps what it found beside the case, for the pathologist to look at; and "flag as wrong".
  { key: 'ai:history-extraction:run', labelId: 'aiHistoryExtractionRun', group: 'casework', risk: 'high', requires: [] },
  { key: 'ai:history-extraction:flag', labelId: 'aiHistoryExtractionFlag', group: 'casework', risk: 'standard', requires: ['ai:history-extraction:run'] },
  // Batch 458 (PS-71): "Overwrite" on the report page's Edit Conflict dialog:
  // save this session's changes over a newer version someone else saved.
  // Checked in services/cases/caseWrite.ts overwriteAfterConflict.
  { key: 'case:edit-conflict:override',             labelId: 'caseEditConflictOverride',           group: 'casework', risk: 'high', requires: [] },
  // Batch 407: exporting the disposal (waste-tracking) report, which lists
  // accession numbers. Before, the export had no check at all. Checked in
  // services/retentionPolicy/exportDisposalReport.ts with the report's
  // facility; seeded like disposal itself (Pete: keep today's users).
  { key: 'retention:disposal-report:export',       labelId: 'retentionDisposalReportExport',      group: 'casework', risk: 'high', requires: [] },
  // Batch 437 (PS-282, PS-357): exports that list cases. The case search CSV
  // was audited but unchecked; the two contribution CSVs were neither.
  // Checked in services/caseSearch (exportRows) and
  // services/contribution/contributionExports.ts; seeded to the roles that
  // open Search and My Contributions (keep today's users).
  { key: 'search:case-results:export',                labelId: 'searchCaseResultsExport',               group: 'casework', risk: 'high', requires: ['screen:search:open'] },
  // Batch 613: reporting on search results. The grouped or column-chosen report file is its own export; scheduling a report is its own action.
  { key: 'search:case-report:export',                 labelId: 'searchCaseReportExport',                group: 'casework', risk: 'high', requires: ['screen:search:open'] },
  { key: 'search:report-schedule:manage',             labelId: 'searchReportScheduleManage',            group: 'casework', risk: 'high', requires: ['screen:search:open'] },
  { key: 'contribution:trainee-case-reference:export', labelId: 'contributionTraineeCaseReferenceExport', group: 'casework', risk: 'high', requires: ['screen:my-contributions:open'] },
  { key: 'contribution:case-mix-summary:export',      labelId: 'contributionCaseMixSummaryExport',      group: 'casework', risk: 'high', requires: ['screen:my-contributions:open'] },

  // Batch 405 (Pete: "Permission, keep users"): Clone & Supersede retires a
  // molecular run and starts its replacement. Checked in
  // services/molecular/mockMolecularBatchService.ts; seeded to every role with
  // the Molecular screen.
  { key: 'molecular:batch:supersede', labelId: 'molecularBatchSupersede', group: 'casework', risk: 'high', requires: [] },
  // Batch 467 (Pete's spec: in-house molecular order queue): putting in-house orders on a plate or taking them off,
  // and cancelling (or re-routing to send-out) an order. Checked in
  // services/molecularOrders/molecularOrderEngine.ts; seeded like superseding a run.
  { key: 'molecular:order:assign-plate', labelId: 'molecularOrderAssignPlate', group: 'casework', risk: 'standard', requires: ['screen:molecular:open'] },
  { key: 'molecular:order:cancel', labelId: 'molecularOrderCancel', group: 'casework', risk: 'high', requires: ['screen:molecular:open'] },
  // Batch 467b: choosing a queued send-out order's reference lab (its own action, not cancelling).
  { key: 'molecular:order:set-lab', labelId: 'molecularOrderSetLab', group: 'casework', risk: 'standard', requires: ['screen:molecular:open'] },

  // ── Billing (Batch 382) ───────────────────────────────────────────────────
  // Correcting an applied billing code credits the original charge and bills
  // the new one. Pete: keep today's users, but as a permission of its own,
  // apart from case access, so a hospital can later take it off its clinical
  // roles without changing the service. Checked in services/billing/
  // correctServiceCharge.ts (enforceAppliedCodeCorrection).
  { key: 'billing:applied-code:correct', labelId: 'billingAppliedCodeCorrect', group: 'billing', risk: 'high', requires: [] },
  // Batch 460 (Pete): approving, rejecting, overriding, adding and deleting a
  // case's billing codes (each one charges or credits). Given to every role
  // that works cases, like the correction above, so nobody loses it; taken
  // off per role in the Role Dictionary. Checked in services/billing/
  // caseBillingCharges.ts (enforceBillingReview) for the report page, the
  // Cytology Workspace and Microtome.
  { key: 'billing:applied-code:review', labelId: 'billingAppliedCodeReview', group: 'billing', risk: 'high', requires: [] },
  // Batch 433 (Pete): approving, rejecting, holding and releasing charges
  // that wait for billing approval. Nobody by default: each facility approves
  // access to its own billing (the staff member's facility assignment limits
  // whose charges they can decide).
  { key: 'billing:charge:approve', labelId: 'billingChargeApprove', group: 'billing', risk: 'high', requires: [] },
  // Batch 611 (#189): Smart Capture, a labelled prototype that suggests charge lines for a person to review.
  { key: 'billing:smart-capture:review', labelId: 'billingSmartCaptureReview', group: 'billing', risk: 'standard', requires: [] },
  { key: 'billing:smart-capture:approve', labelId: 'billingSmartCaptureApprove', group: 'billing', risk: 'high', requires: [] },
  { key: 'billing:smart-capture:send', labelId: 'billingSmartCaptureSend', group: 'billing', risk: 'high', requires: [] },

  // ── Autopsy (Batch 383) ───────────────────────────────────────────────────
  // Releasing a body ends the mortuary's custody: it records who received it
  // and who released it. A permission of its own (as with the billing
  // correction), for the roles with case access today. Checked in
  // services/autopsy/releaseAutopsyBody.ts.
  { key: 'autopsy:body:release', labelId: 'autopsyBodyRelease', group: 'autopsy', risk: 'high', requires: [] },

  // Batch 468 (PS-261): recording a forensic chain-of-custody transfer
  // (body, evidence, or personal effects — who held it, who it was
  // transferred to, when). Its own capability, never reusing
  // autopsy:body:release — a distinct action, an append-only log
  // rather than a one-shot release. Checked in
  // services/autopsy/recordAutopsyCustodyTransfer.ts.
  { key: 'autopsy:custody:transfer', labelId: 'autopsyCustodyTransfer', group: 'autopsy', risk: 'high', requires: [] },

  // Batch 469 (PS-261 §2.5.1 follow-up): narrowing or revoking an
  // already-granted hospital next-of-kin consent. Its own capability
  // — a distinct, later action from the authorization-completion
  // submit (no capability of its own; part of the normal accession
  // workflow). Checked in services/autopsy/recordAutopsyConsentStatusChange.ts.
  { key: 'autopsy:consent:manage', labelId: 'autopsyConsentManage', group: 'autopsy', risk: 'high', requires: [] },

  // Batch 469 (PS-261 §2.4.2): recording the disposal of retained
  // organs/tissue (method, timestamp, certificate). Checked in
  // services/autopsy/recordAutopsyOrganRetentionDisposal.ts.
  { key: 'autopsy:retention-disposal:record', labelId: 'autopsyRetentionDisposalRecord', group: 'autopsy', risk: 'high', requires: [] },

  // Batch 469 (PS-261 §2.3): ordering postmortem toxicology and
  // recording its result — two distinct actions, never one blanket
  // "toxicology" flag (Pete: no blanket flags). Checked in
  // services/autopsy/orderAutopsyToxicology.ts and
  // services/autopsy/recordAutopsyToxicologyResult.ts.
  { key: 'autopsy:toxicology:order', labelId: 'autopsyToxicologyOrder', group: 'autopsy', risk: 'standard', requires: [] },
  { key: 'autopsy:toxicology:result', labelId: 'autopsyToxicologyResult', group: 'autopsy', risk: 'high', requires: [] },

  // Batch 471 (PS-261 follow-up): cancelling a toxicology order before
  // a result arrives. Its own capability, never reusing
  // autopsy:toxicology:order or autopsy:toxicology:result — a
  // distinct action from either. Checked in
  // services/autopsy/cancelAutopsyToxicologyOrder.ts.
  { key: 'autopsy:toxicology:cancel', labelId: 'autopsyToxicologyCancel', group: 'autopsy', risk: 'high', requires: [] },

  // Batch 471 (PS-261 follow-up): recording who holds retained
  // organs/tissue and where, while retention is ongoing — distinct
  // from autopsy:retention-disposal:record, which only covers final
  // disposal. Checked in
  // services/autopsy/recordAutopsyOrganRetentionDetail.ts.
  { key: 'autopsy:retention-detail:record', labelId: 'autopsyRetentionDetailRecord', group: 'autopsy', risk: 'high', requires: [] },
  // Batch 499: choosing the organ-retention tier (and its reason). Was saved
  // with no check until now (disclosed since Batch 472). Checked in
  // services/autopsy/recordAutopsyOrganRetentionTier.ts.
  { key: 'autopsy:retention-tier:record', labelId: 'autopsyRetentionTierRecord', group: 'autopsy', risk: 'high', requires: [] },

  // Batch 471 (PS-261 follow-up): reinstating an already-narrowed or
  // revoked hospital consent. Its own capability, never reusing
  // autopsy:consent:manage — narrowing/revoking and reinstating are
  // opposite-direction actions a hospital may want to grant
  // separately. Checked in
  // services/autopsy/recordAutopsyConsentReinstatement.ts.
  { key: 'autopsy:consent:reinstate', labelId: 'autopsyConsentReinstate', group: 'autopsy', risk: 'high', requires: [] },

  // Batch 478 (PS-261 follow-up; Pete's own locked-in decision: "a NEW
  // dedicated capability, audited"): resolveAutopsyGrossExaminationGate.ts's
  // hard stop (missing legal authorization, or revoked hospital consent)
  // now actually blocks PAD/FAD signing (services/autopsy/signAutopsyReport.ts) —
  // before this batch it only drove a warning banner. Overriding it is a
  // bypass of a legal/consent block, same class of action as
  // cytology:qc-review:bypass: nobody by default, an administrator assigns
  // it. Every override is logged (AutopsyCaseDetails.gateOverrides,
  // append-only, plus the shared audit trail).
  { key: 'autopsy:gross-exam-gate:override', labelId: 'autopsyGrossExamGateOverride', group: 'autopsy', risk: 'high', requires: [] },

  // Batch 478 (PS-261 follow-up; Pete's own scoping decision): recording a
  // per-organ finding during the gross exam, using the existing 31-code
  // AutopsyOrganCode vocabulary (SNOMED mapping deferred, pending PS-343
  // licensing). Its own capability, distinct from the consent/custody/
  // retention actions above — this is ordinary clinical documentation, not
  // a legal or chain-of-custody action. Checked in
  // services/autopsy/recordAutopsyOrganTag.ts.
  { key: 'autopsy:organ-tag:record', labelId: 'autopsyOrganTagRecord', group: 'autopsy', risk: 'standard', requires: [] },

  // Batch 480 (Structured Inking, Module 1; PS-359 follow-up). Recording a
  // margin's ink application during grossing — ordinary clinical
  // documentation, same posture as autopsy:organ-tag:record above. Checked
  // in services/grossing/recordMarginInkApplication.ts.
  { key: 'grossing:margin-ink:record', labelId: 'grossingMarginInkRecord', group: 'casework', risk: 'standard', requires: [] },
  // Changing a site's inking_validation_mode (WARN_ONLY vs STRICT_ENFORCE,
  // services/grossing/inkingSiteSettings.ts) — a policy change, high-risk
  // like its siblings config:report-appearance:manage and
  // config:organ-map-scheme:manage. Those are group: 'configSystem', so this
  // one is too: CONFIG_SECTIONS sweeps every configSystem (and other
  // config*) capability into the Admin seed (and, via
  // CONFIG_SECTIONS_LAB_DIRECTOR, Lab Director's) automatically — it is NOT
  // "nobody by default" the way cytology:qc-review:bypass or
  // autopsy:gross-exam-gate:override are (see capabilitySeeds.ts).
  { key: 'config:inking-validation-mode:manage', labelId: 'configInkingValidationModeManage', group: 'configSystem', risk: 'high', requires: [] },
  // Batch 595: which code systems (ICD-10, ICD-11, ICD-O, SNOMED CT ...) each
  // jurisdiction uses, and when. Checked in services/coding/codeSystemPolicyService.ts.
  { key: 'config:code-systems:manage', labelId: 'configCodeSystemsManage', group: 'configSystem', risk: 'high', requires: [] },

  // Batch 484 (Structured Inking Sign-Out & Grossing Gate Logic Engine;
  // PS-519 follow-up). The Administrative Override action at Gate B
  // (Sign-Out) for a Severity 3 (compliance-critical) margin-ink issue —
  // Pete's own spec: "Clinical Admin, Lead Pathologist" only, never a
  // standard pathologist. group: 'casework' (an action on one case, not a
  // system-wide policy change, unlike config:inking-validation-mode:manage
  // above), so it is NOT swept in by CONFIG_SECTIONS; seeded explicitly
  // (capabilitySeeds.ts's INKING_GATE_OVERRIDE) to Admin and Lab Director
  // only. Checked in services/grossing/recordInkingGateOverride.ts.
  { key: 'case:inking-gate:override', labelId: 'caseInkingGateOverride', group: 'casework', risk: 'high', requires: [] },

  // ── Messaging (Batch 385) ─────────────────────────────────────────────────
  // Sending a message or a reply, and sending a secure email to an outside
  // address (which leaves the organisation, so it is a separate, high-risk
  // permission). Seeded to every role, so nobody loses sending. Checked in
  // services/messages/mockMessageService.ts.
  { key: 'message:internal:send', labelId: 'messageSend', group: 'messaging', risk: 'standard', requires: [] },
  { key: 'message:secure-email:send', labelId: 'messageSecureEmailSend', group: 'messaging', risk: 'high', requires: [] },

  // ── Report history ────────────────────────────────────────────────────────
  { key: 'report:change-history:export', labelId: 'reportChangeHistoryExport', group: 'reportHistory', risk: 'high', requires: [] },

  // ── Quality assurance: Operations pillar ─────────────────────────────────
  { key: 'qa:deficiencies:export',            labelId: 'qaDeficienciesExport',           group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:intraop-linkage:export',         labelId: 'qaIntraopLinkageExport',         group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:reconciliation:export',          labelId: 'qaReconciliationExport',         group: 'qaOperations', risk: 'high', requires: [] },
  // Batch 454 (Pete): the "Follow-up not received" report. Closing a follow-up
  // with a disposition, and emailing the ordering clinician when the lab
  // decides to (never automatic). Checked in services/followUp/.
  { key: 'qa:follow-up:export',               labelId: 'qaFollowUpExport',               group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:follow-up:record',               labelId: 'qaFollowUpRecord',               group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:follow-up-clinician:email',      labelId: 'qaFollowUpClinicianEmail',       group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:countersign-turnaround:export',  labelId: 'qaCountersignTurnaroundExport',  group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:fppe-tracking:export',           labelId: 'qaFppeTrackingExport',           group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:drift-correction:export',        labelId: 'qaDriftCorrectionExport',        group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:patient-match-review:export',    labelId: 'qaPatientMatchReviewExport',     group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:access-request-response:export', labelId: 'qaAccessRequestResponseExport', group: 'qaOperations', risk: 'high', requires: [] },
  // Batch 610 (#78): the AI discordance tab's two CSV exports (per-vendor discordance rate, stalled AI results).
  { key: 'qa:ai-discordance:export',          labelId: 'qaAiDiscordanceExport',          group: 'qaOperations', risk: 'high', requires: [] },
  // Batch 425: the registry transmission audit (screening and cancer, one column set: sent time,
  // registry status, the registry's response code). Checked in services/qualityAssurance/qaExport.ts,
  // called by services/registrySubmission/registryExceptionsService.ts (exportRegistryTransmissionAudit).
  { key: 'qa:registry-transmission-audit:export', labelId: 'qaRegistryTransmissionAuditExport', group: 'qaOperations', risk: 'high', requires: [] },

  // ── Quality assurance: CAPA pillar ────────────────────────────────────────
  { key: 'qa:management-reviews:export', labelId: 'qaManagementReviewsExport', group: 'qaCapa', risk: 'high', requires: [] },
  // Batch 438 (PS-144–148, Pete Oct 2): PathScribe recommends a CAPA; a QA
  // lead confirms it (opens and assigns the CAPA) or dismisses it with a
  // reason. Checked in services/quality/capaRecommendationService.ts; seeded
  // to the roles that open Quality Assurance (Admin, Lab Director, QA Reviewer).
  { key: 'qa:capa-recommendation:decide', labelId: 'qaCapaRecommendationDecide', group: 'qaCapa', risk: 'high', requires: ['screen:quality-assurance:open'] },
  // Batch 442 (PS-147): discordance patterns over time (a pathologist's, or a
  // specimen type's). Personnel-sensitive: Lab Director only to start; the
  // reviewed pathologist doesn't hold it.
  { key: 'qa:pathologist-trend:view',   labelId: 'qaPathologistTrendView',   group: 'qaCapa', risk: 'high', requires: ['screen:quality-assurance:open'] },
  { key: 'qa:pathologist-trend:decide', labelId: 'qaPathologistTrendDecide', group: 'qaCapa', risk: 'high', requires: ['qa:pathologist-trend:view'] },

  // ── Quality assurance: Financials pillar ─────────────────────────────────
  { key: 'qa:billing-deficiencies:export', labelId: 'qaBillingDeficienciesExport', group: 'qaFinancials', risk: 'high', requires: [] },

  // ── Quality assurance: Cytology pillar ───────────────────────────────────
  { key: 'qa:cytology-histology-correlation:export', labelId: 'qaCytologyHistologyCorrelationExport', group: 'qaCytology', risk: 'high', requires: [] },

  // ── Quality assurance: dashboards, inspection and enterprise ─────────────
  { key: 'qa:activity-dashboard:export', labelId: 'qaActivityDashboardExport', group: 'qaOversight', risk: 'high', requires: [] },
  // Batch 432 (Pete): marking an Audit Log error resolved. Everyone who opens the Audit Log.
  { key: 'audit:error:resolve', labelId: 'auditErrorResolve', group: 'qaOversight', risk: 'high', requires: [] },
  // Batch 515 (PS-283): the Print Queue dashboard's actions (Audit Log →
  // Interfaces): hold or release, cancel, redirect, retry
  // (services/printing/mockPrintQueueService.ts, redispatchPrintJob.ts).
  { key: 'print:job:hold',     labelId: 'printJobHold',     group: 'qaOversight', risk: 'high', requires: [] },
  { key: 'print:job:cancel',   labelId: 'printJobCancel',   group: 'qaOversight', risk: 'high', requires: [] },
  { key: 'print:job:redirect', labelId: 'printJobRedirect', group: 'qaOversight', risk: 'high', requires: [] },
  { key: 'print:job:retry',    labelId: 'printJobRetry',    group: 'qaOversight', risk: 'high', requires: [] },
  // Batch 518 (PS-122): send, resend or simulate a failure for an outbound
  // interface message (Audit Log → Interfaces → Outbound, every queue).
  { key: 'interface:outbound:resend', labelId: 'interfaceOutboundResend', group: 'qaOversight', risk: 'high', requires: [] },
  // Batch 619 (PS-800): hold and release an outbound message from the Outbound Queue screen
  // (services/outboundQueue/outboundQueueService.ts); retry there uses interface:outbound:resend.
  { key: 'interface:outbound:hold', labelId: 'interfaceOutboundHold', group: 'qaOversight', risk: 'high', requires: ['screen:outbound-queue:open'] },
  { key: 'interface:outbound:release', labelId: 'interfaceOutboundRelease', group: 'qaOversight', risk: 'high', requires: ['screen:outbound-queue:open'] },
  // Billing release runs through the Outbound Queue (Pete, Oct 19): cancel a queued charge before release, or force an immediate release.
  { key: 'interface:outbound:retract', labelId: 'interfaceOutboundRetract', group: 'qaOversight', risk: 'high', requires: ['screen:outbound-queue:open'] },
  { key: 'interface:outbound:override-release', labelId: 'interfaceOutboundOverrideRelease', group: 'qaOversight', risk: 'high', requires: ['screen:outbound-queue:open'] },
  // Close a message the receiving registry rejected as not reportable (nothing more is sent for it).
  { key: 'interface:outbound:mark-not-reportable', labelId: 'interfaceOutboundMarkNotReportable', group: 'qaOversight', risk: 'high', requires: ['screen:outbound-queue:open'] },
  // Batch 551 (PS-539 phase 2d; MESSAGE_BUS_API.md §4): the API server's background jobs (System Logs →
  // Server jobs): see the job kinds' health and the dead-lettered jobs; requeue one (delivery, held release,
  // charge, export and event jobs; interface and print jobs keep their own resend capabilities).
  // Batch 554 (PS-539 phase 2d): interface monitoring, the engines' listeners and queues (Interfaces → Engines).
  { key: 'interface:engine-status:view', labelId: 'interfaceEngineStatusView', group: 'qaOversight', risk: 'standard', requires: ['screen:audit-log:open'] },
  { key: 'jobs:server-job:view', labelId: 'jobsServerJobView', group: 'qaOversight', risk: 'standard', requires: ['screen:audit-log:open'] },
  { key: 'jobs:server-job:requeue', labelId: 'jobsServerJobRequeue', group: 'qaOversight', risk: 'high', requires: ['jobs:server-job:view'] },
  // Batch 518 (PS-123): reprint labels for many cases at once (Batch Management → Label reprint).
  { key: 'label:batch:reprint', labelId: 'labelBatchReprint', group: 'casework', risk: 'high', requires: [] },
  // The binder lists, case by case, the same QA review records the dashboard
  // totals, so anyone who can export it can export the dashboard's figures.
  { key: 'qa:inspection-evidence:export', labelId: 'qaInspectionEvidenceExport', group: 'qaOversight', risk: 'high', requires: ['qa:activity-dashboard:export'] },
  { key: 'qa:enterprise-rollup:export',   labelId: 'qaEnterpriseRollupExport',   group: 'qaOversight', risk: 'high', requires: [] },
  // Batch 437 (PS-282, PS-357): the Audit Log page's five CSV exports. They
  // had no check at all. One per log (Pete: no blanket flags). Checked in
  // services/auditlog/auditLogExports.ts; seeded to the roles that open the
  // Audit Log (keep today's users). Every export is also audited.
  { key: 'audit:audit-log:export',     labelId: 'auditAuditLogExport',     group: 'qaOversight', risk: 'high', requires: ['screen:audit-log:open'] },
  { key: 'audit:error-log:export',     labelId: 'auditErrorLogExport',     group: 'qaOversight', risk: 'high', requires: ['screen:audit-log:open'] },
  { key: 'audit:interface-log:export', labelId: 'auditInterfaceLogExport', group: 'qaOversight', risk: 'high', requires: ['screen:audit-log:open'] },
  { key: 'audit:qa-log:export',        labelId: 'auditQaLogExport',        group: 'qaOversight', risk: 'high', requires: ['screen:audit-log:open'] },
  { key: 'audit:billing-log:export',   labelId: 'auditBillingLogExport',   group: 'qaOversight', risk: 'high', requires: ['screen:audit-log:open'] },

  // ── Administration (PS-356, Batch 370) ───────────────────────────────────
  // Before these, anyone signed in could edit roles (their own capabilities
  // included) and staff role assignments: the self-escalation path.
  { key: 'config:roles:manage',        labelId: 'configRolesManage',        group: 'administration', risk: 'high', requires: [] },
  { key: 'config:staff:edit',          labelId: 'configStaffEdit',          group: 'administration', risk: 'high', requires: [] },
  // Roles, facility assignments, pediatric/orchestration/cross-tenant flags
  // and jurisdictional credentials: what someone is allowed to do or see.
  { key: 'config:staff-access:assign', labelId: 'configStaffAccessAssign',  group: 'administration', risk: 'high', requires: ['config:staff:edit'] },
  // Batch 448: set or remove a staff member's sign-in password (sites without single sign-on, and the demo).
  { key: 'config:staff-password:manage', labelId: 'configStaffPasswordManage', group: 'administration', risk: 'high', requires: ['config:staff:edit'] },
  { key: 'config:demo-data:reset',     labelId: 'configDemoDataReset',      group: 'administration', risk: 'high', requires: [] },
  // PS-359 (Batch 376): which fields each page requires, for the person's own organisation.
  { key: 'config:field-requirements:manage', labelId: 'configFieldRequirementsManage', group: 'administration', risk: 'high', requires: [] },
  // Batch 611 (#157): resetting a colleague's second-factor enrolment (a lost device), own organisation only.
  { key: 'auth:mfa-enrolment:reset', labelId: 'authMfaEnrolmentReset', group: 'administration', risk: 'high', requires: [] },
  // Batch 399: the critical intraoperative results dictionary decides when a
  // frozen result needs direct communication with the operating surgeon, so
  // changing it is an administrative, audited act. Checked in
  // services/intraop/mockIntraopCriticalResultService.ts.
  { key: 'config:intraop-critical-results:manage', labelId: 'configIntraopCriticalResultsManage', group: 'administration', risk: 'high', requires: [] }, ...INTRAOP_CAPABILITIES, // Batch 669 (ops-14): the OR Suite demo
  // Batch 406: a molecular assay's control rules (which controls every plate
  // needs, and which deck slots its sample rack may go in) decide whether a
  // run is valid, so changing them is an administrative act. Pete: "default to
  // admin but it remains an assignable permission" (a Lab Director is given it
  // in the Role Dictionary). Checked in
  // services/molecular/mockMolecularAssayControlRuleService.ts.
  ...MOLECULAR_CONTROL_RULES_CAPABILITIES, // Batch 669 (ctl): view and manage, in molecularControlRulesCapabilities.ts
  // Batch 414: which cervical screening registry each facility reports to,
  // and each registry's code mappings and hold rules (a compliance setting:
  // it decides where patients' results go). Checked in
  // services/screeningRegistry/saveScreeningRegistrySettings.ts.
  { key: 'config:screening-registry:manage', labelId: 'configScreeningRegistryManage', group: 'administration', risk: 'high', requires: [] },
  // Batch 422: which cancer registry each facility reports to, its environment, and whether the
  // jurisdiction honours a patient's opt-out. Checked in services/cancerRegistry/saveCancerRegistrySettings.ts.
  { key: 'config:cancer-registry:manage', labelId: 'configCancerRegistryManage', group: 'administration', risk: 'high', requires: [] },
  // Batch 415 (Pete: US rules "should be an enabled feature"): switching the
  // CLIA workload cap and the CAP 5-year lookback on or off, for the
  // enterprise or a facility. Checked in services/cytology/saveCytologyComplianceFeatures.ts.
  { key: 'config:cytology-compliance:manage', labelId: 'configCytologyComplianceManage', group: 'administration', risk: 'high', requires: [] },
  // Batch 421 (SRS v2.1 FR-008.5/7): re-validating and resending a held, undelivered, unanswered or
  // rejected registry submission from the Registry Exceptions worklist. Checked in
  // services/registrySubmission/resendRegistrySubmission.ts.
  // Batch 620 (PS-800): the registry batch files: their profiles, and making a file (it carries patient data out, so it is high risk and audited).
  { key: 'config:batch-registry-feed:manage', labelId: 'configBatchRegistryFeedManage', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'registry:batch-file:generate', labelId: 'registryBatchFileGenerate', group: 'administration', risk: 'high', requires: ['config:batch-registry-feed:manage'] },
  { key: 'registry:submission:resend', labelId: 'registrySubmissionResend', group: 'administration', risk: 'high', requires: ['screen:registry-exceptions:open'] },
  // Batch 423 (SRS v2.1 step 7): approving a registry's switch from its test system to the
  // live register, re-confirming credentials, in stated capacities. Checked in
  // services/registryGoLive/registryGoLive.ts (approveRegistryGoLive). Preparing the request
  // and returning to test need the registry's own manage capability.
  { key: 'registry:live-register:approve', labelId: 'registryLiveRegisterApprove', group: 'administration', risk: 'high', requires: [] },
  // Batch 423: the two go-live approval settings (self-approval, required approvals), the
  // template review settings' shape. Checked in registryGoLive.ts (saveRegistryGoLiveGovernance).
  { key: 'config:registry-go-live:manage', labelId: 'configRegistryGoLiveManage', group: 'administration', risk: 'high', requires: [] },
  // Batch 424: sending the synthetic test suite to a registry's test system, on a validation
  // instance only. Checked in services/registryGoLive/registryGoLive.ts (runRegistryTestSuite).
  { key: 'registry:test-suite:run', labelId: 'registryTestSuiteRun', group: 'administration', risk: 'high', requires: [] },
  // Batch 425: marking a registry's revision of accepted data reviewed (it leaves the Registry
  // Exceptions worklist; the CAPA deficiency raised with it stays open in Quality Assurance).
  // Checked in services/registrySubmission/recordRegistryRevision.ts (reviewRegistryRevision).
  { key: 'registry:revision:review', labelId: 'registryRevisionReview', group: 'administration', risk: 'high', requires: ['screen:registry-exceptions:open'] },
  // Batch 425 (Pete and his developer: "Template Review settings save authorization"): the
  // template review settings (self-approval, required approvals). Checked in
  // services/templates/templateGovernanceSettings.ts (saveTemplateGovernanceWithAudit).
  { key: 'config:template-governance:manage', labelId: 'configTemplateGovernanceManage', group: 'administration', risk: 'high', requires: [] },

  // ── Configuration sections (Batch 428) ────────────────────────────────────
  // Pete: "If you don't have permission to access configuration, you should
  // [not] be able to backdoor in", then the section-by-section scan: before
  // this, anyone who could open Configuration could change any section. One
  // capability per section (Pete's choice), checked in the section's service
  // (guardConfigWrites, or enforce at the action). Seeds: Admin and Lab
  // Director start with all of them (Lab Director keeps what it could do:
  // everything but drafting synoptic protocols); Template Author and Template
  // Approver only the protocol and template ones; a hospital's own roles none
  // until an administrator grants them (capabilitySeeds.ts).
  // Protocols and report templates
  { key: 'config:protocol:draft', labelId: 'configProtocolDraft', group: 'configTemplates', risk: 'high', requires: [] },
  { key: 'config:protocol:approve', labelId: 'configProtocolApprove', group: 'configTemplates', risk: 'high', requires: [] },
  { key: 'config:protocol:publish', labelId: 'configProtocolPublish', group: 'configTemplates', risk: 'high', requires: [] },
  { key: 'config:protocol:retire', labelId: 'configProtocolRetire', group: 'configTemplates', risk: 'high', requires: [] },
  { key: 'config:report-template:manage', labelId: 'configReportTemplateManage', group: 'configTemplates', risk: 'high', requires: [] },
  { key: 'config:report-template:publish', labelId: 'configReportTemplatePublish', group: 'configTemplates', risk: 'high', requires: [] },
  { key: 'config:template-routing:manage', labelId: 'configTemplateRoutingManage', group: 'configTemplates', risk: 'high', requires: [] },
  // AI, voice, actions and macros
  { key: 'config:ai-behavior:manage', labelId: 'configAiBehaviorManage', group: 'configAi', risk: 'high', requires: [] },
  { key: 'config:ai-provider:manage', labelId: 'configAiProviderManage', group: 'configAi', risk: 'high', requires: [] },
  { key: 'config:ai-model:manage', labelId: 'configAiModelManage', group: 'configAi', risk: 'high', requires: [] },
  // Batch 536 (PS-558): which AI services and hosting regions each
  // jurisdiction (or facility) allows. Checked in
  // services/aiIntegration/aiVendorPolicyService.ts.
  { key: 'config:ai-vendor-policy:manage', labelId: 'configAiVendorPolicyManage', group: 'configAi', risk: 'high', requires: [] },
  { key: 'config:actions:manage', labelId: 'configActionsManage', group: 'configAi', risk: 'high', requires: [] },
  { key: 'config:voice:manage', labelId: 'configVoiceManage', group: 'configAi', risk: 'high', requires: [] },
  { key: 'config:macros:manage', labelId: 'configMacrosManage', group: 'configAi', risk: 'high', requires: [] },
  // Cytology
  { key: 'config:cytology-categories:manage', labelId: 'configCytologyCategoriesManage', group: 'configCytology', risk: 'high', requires: [] },
  { key: 'config:cytology-nomenclature:manage', labelId: 'configCytologyNomenclatureManage', group: 'configCytology', risk: 'high', requires: [] },
  { key: 'config:cytology-routing:manage', labelId: 'configCytologyRoutingManage', group: 'configCytology', risk: 'high', requires: [] },
  { key: 'config:cytology-screening-strategy:manage', labelId: 'configCytologyScreeningStrategyManage', group: 'configCytology', risk: 'high', requires: [] },
  // Batch 452 (PS-156): the cyto-histo correlation window (length and start date).
  // Batch 453 (PS-324): the surgical biopsy-to-resection correlation window.
  { key: 'config:biopsy-resection-correlation:manage', labelId: 'configBiopsyResectionCorrelationManage', group: 'configQuality', risk: 'high', requires: [] },
  // Batch 491 (PS-359 follow-up): the Tumor Board/MDT auto-flagging rules'
  // margin-distance thresholds — the enterprise baseline and each
  // facility's own override, per Pete's confirmed Hybrid Inheritance Model
  // (Oct 8: "org-wide baseline... facility-level settings inherit... unless
  // an explicit local override is authorized"). Same configQuality group,
  // same enterprise+facility-override pattern, as the two lines above.
  { key: 'config:tumor-board-rules:manage', labelId: 'configTumorBoardRulesManage', group: 'configQuality', risk: 'high', requires: [] },
  // Batch 454: follow-up tracking (the warning period, whether the clinician
  // email is offered, and its wording), per enterprise and facility.
  { key: 'config:follow-up-tracking:manage', labelId: 'configFollowUpTrackingManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:cytology-histology-correlation:manage', labelId: 'configCytologyHistologyCorrelationManage', group: 'configCytology', risk: 'high', requires: [] },
  { key: 'config:cytology-instrumentation:manage', labelId: 'configCytologyInstrumentationManage', group: 'configCytology', risk: 'high', requires: [] },
  { key: 'config:cytology-qc-rates:manage', labelId: 'configCytologyQcRatesManage', group: 'configCytology', risk: 'high', requires: [] },
  { key: 'config:cytology-workload-cap:manage', labelId: 'configCytologyWorkloadCapManage', group: 'configCytology', risk: 'high', requires: [] },
  { key: 'config:cytology-severity-mapping:manage', labelId: 'configCytologySeverityMappingManage', group: 'configCytology', risk: 'high', requires: [] },
  { key: 'config:cytology-qc-rules:manage', labelId: 'configCytologyQcRulesManage', group: 'configCytology', risk: 'high', requires: [] },
  // Lab dictionaries and case workflow
  { key: 'config:case-flags:manage', labelId: 'configCaseFlagsManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:subspecialties:manage', labelId: 'configSubspecialtiesManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:specimen-dictionary:manage', labelId: 'configSpecimenDictionaryManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:stain-dictionary:manage', labelId: 'configStainDictionaryManage', group: 'configLab', risk: 'high', requires: [] },
  // Structured Inking, Module 3 (PS-359 follow-up): the margin ink-colour dictionary resolveInkingValidationSeverity.ts's margin_ink_color_unmapped check validates against.
  { key: 'config:ink-color:manage', labelId: 'configInkColorManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:processing-protocols:manage', labelId: 'configProcessingProtocolsManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:container-types:manage', labelId: 'configContainerTypesManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:reagent-lots:manage', labelId: 'configReagentLotsManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:delegation-types:manage', labelId: 'configDelegationTypesManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:deficiency-types:manage', labelId: 'configDeficiencyTypesManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:tat-targets:manage', labelId: 'configTatTargetsManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:case-routing:manage', labelId: 'configCaseRoutingManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'case:routing:run', labelId: 'caseRoutingRun', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:grossing-routes:manage', labelId: 'configGrossingRoutesManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:facilities:manage', labelId: 'configFacilitiesManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:physicians:manage', labelId: 'configPhysiciansManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:departments:manage', labelId: 'configDepartmentsManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:asset-locations:manage', labelId: 'configAssetLocationsManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:cold-chain:manage', labelId: 'configColdChainManage', group: 'configLab', risk: 'high', requires: [] },
  // Batch 728 (Lab Workflow spec, Decision 4): research cases and batch purposes (services/researchCases/, batches/batchPurposes.ts).
  { key: 'config:research-cases:manage', labelId: 'configResearchCasesManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:batch-purposes:manage', labelId: 'configBatchPurposesManage', group: 'configLab', risk: 'high', requires: [] },
  { key: 'config:case-masks:manage', labelId: 'configCaseMasksManage', group: 'configLab', risk: 'high', requires: [] },
  // Results, reporting and quality
  { key: 'config:participation-types:manage', labelId: 'configParticipationTypesManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:release-buffer:manage', labelId: 'configReleaseBufferManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:delivery-rules:manage', labelId: 'configDeliveryRulesManage', group: 'configQuality', risk: 'high', requires: [] },
  // Batch 619 (PS-800): when reports, billing and feeds go out (enterprise level, performing-facility overrides).
  { key: 'config:delivery-schedules:manage', labelId: 'configDeliverySchedulesManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:abnormal-triggers:manage', labelId: 'configAbnormalTriggersManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:concordance-review:manage', labelId: 'configConcordanceReviewManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:qa-types:manage', labelId: 'configQaTypesManage', group: 'configQuality', risk: 'high', requires: [] },
  // Batch 438 (PS-146): the revision reason dictionary (amendment and
  // correction reasons, and which are clinically significant). Its service
  // had no check and no screen; Configuration → System → Revision Reasons.
  { key: 'config:revision-reasons:manage', labelId: 'configRevisionReasonsManage', group: 'configQuality', risk: 'high', requires: [] },
  // Batch 439 (PS-144): where the peer-review sign-out gate is on
  // (organisation, facility, department). Off by default.
  { key: 'config:peer-review:manage', labelId: 'configPeerReviewManage', group: 'configQuality', risk: 'high', requires: [] },
  // Batch 442 (PS-147): each site's discordance-trend thresholds.
  { key: 'config:qa-trend-policy:manage', labelId: 'configQaTrendPolicyManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:validation-studies:manage', labelId: 'configValidationStudiesManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'validation:approval:record', labelId: 'validationApprovalRecord', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:retention-policy:manage', labelId: 'configRetentionPolicyManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:fppe:manage', labelId: 'configFppeManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:cytotech-competency:manage', labelId: 'configCytotechCompetencyManage', group: 'configQuality', risk: 'high', requires: [] },
  // Batch 529 (PS-554, Pete's decisions of Oct 11, 2026): the clinical-pathologic
  // mismatch risk rules. Changing them starts with no built-in role (each
  // hospital grants it, e.g. to its own Pathologist Administrator role);
  // reading them goes to Pathologist, QA Reviewer and Lab Director (see
  // CONFIG_NO_DEFAULT_GRANT and MISMATCH_RULES_VIEW in capabilitySeeds.ts).
  // Checked in services/clinical/clinicalMismatchRuleService.ts.
  { key: 'config:clinical-mismatch-rules:manage', labelId: 'configClinicalMismatchRulesManage', group: 'configQuality', risk: 'high', requires: ['config:clinical-mismatch-rules:view'] },
  { key: 'config:clinical-mismatch-rules:view', labelId: 'configClinicalMismatchRulesView', group: 'configQuality', risk: 'standard', requires: [] },
  // Batch 536 (PS-554, Pete Oct 11): the governed AI instructions for the
  // mismatch check. Editing starts with no built-in role; approving starts with
  // Lab Director and is never held by Superadmin; reading goes to Lab Director
  // and QA Reviewer. Approving and changing the mismatch rules are a
  // separation of duties (SEPARATION_OF_DUTIES below). Checked in
  // services/clinical/aiInstructionService.ts.
  { key: 'config:ai-prompt:view', labelId: 'configAiPromptView', group: 'configQuality', risk: 'standard', requires: [] },
  { key: 'config:ai-prompt:edit', labelId: 'configAiPromptEdit', group: 'configQuality', risk: 'high', requires: ['config:ai-prompt:view'] },
  { key: 'config:ai-prompt:approve', labelId: 'configAiPromptApprove', group: 'configQuality', risk: 'high', requires: ['config:ai-prompt:view'] },
  // Printing, labels and benches
  { key: 'config:printers:manage', labelId: 'configPrintersManage', group: 'configOperations', risk: 'high', requires: [] },
  { key: 'config:print-settings:manage', labelId: 'configPrintSettingsManage', group: 'configOperations', risk: 'high', requires: [] },
  { key: 'config:print-routing:manage', labelId: 'configPrintRoutingManage', group: 'configOperations', risk: 'high', requires: [] },
  { key: 'config:label-layouts:manage', labelId: 'configLabelLayoutsManage', group: 'configOperations', risk: 'high', requires: [] },
  { key: 'config:cassette-routing:manage', labelId: 'configCassetteRoutingManage', group: 'configOperations', risk: 'high', requires: [] },
  { key: 'config:cassette-colors:manage', labelId: 'configCassetteColorsManage', group: 'configOperations', risk: 'high', requires: [] },
  { key: 'config:scan-stations:manage', labelId: 'configScanStationsManage', group: 'configOperations', risk: 'high', requires: [] },
  { key: 'config:equipment:manage', labelId: 'configEquipmentManage', group: 'configOperations', risk: 'high', requires: [] },
  // Batch 429 (Pete): recording maintenance and calibration is its own permission, for the bench staff who
  // do it (Batch Management → Equipment log) as well as Admin and Lab Director.
  { key: 'equipment:maintenance:record', labelId: 'equipmentMaintenanceRecord', group: 'configOperations', risk: 'high', requires: [] },
  { key: 'config:grossing-hardware:manage', labelId: 'configGrossingHardwareManage', group: 'configOperations', risk: 'high', requires: [] },
  { key: 'config:workstation-groups:manage', labelId: 'configWorkstationGroupsManage', group: 'configOperations', risk: 'high', requires: [] },
  { key: 'config:action-groups:manage', labelId: 'configActionGroupsManage', group: 'configOperations', risk: 'high', requires: [] },
  { key: 'config:or-suite-terminals:manage', labelId: 'configOrSuiteTerminalsManage', group: 'configOperations', risk: 'high', requires: [] },
  { key: 'config:display-profiles:manage', labelId: 'configDisplayProfilesManage', group: 'configOperations', risk: 'high', requires: [] },
  // Integrations and intake
  { key: 'config:vendor-integrations:manage', labelId: 'configVendorIntegrationsManage', group: 'configIntegrations', risk: 'high', requires: [] },
  // Batch 552 (PS-539 phase 2d; SITE_AGENT_API.md §2, §3): the site agents (Configuration → System → Site agents):
  // make an enrolment code or revoke an agent; change the site's agent printers and shares.
  { key: 'config:site-agents:enroll', labelId: 'configSiteAgentsEnroll', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'config:site-agent-config:manage', labelId: 'configSiteAgentConfigManage', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'config:cosd-destination:manage', labelId: 'configCosdDestinationManage', group: 'configIntegrations', risk: 'high', requires: [] },
  // Batch 621: AI extraction of historical reports (Configuration → System → AI history extraction). Advisory only.
  { key: 'config:history-extraction:manage', labelId: 'configHistoryExtractionManage', group: 'configIntegrations', risk: 'high', requires: [] },
  // Batch 612: the workstation registry.
  { key: 'config:workstations:manage', labelId: 'configWorkstationsManage', group: 'configSystem', risk: 'high', requires: [] },
  { key: 'config:workstation-tokens:manage', labelId: 'configWorkstationTokensManage', group: 'configSystem', risk: 'high', requires: [] },
  // Batch 613 (PS-787): the reporting feed for Power BI and other BI tools.
  { key: 'config:bi-feed:manage', labelId: 'configBiFeedManage', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'config:bi-feed-tokens:manage', labelId: 'configBiFeedTokensManage', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'config:bi-feed-identified:approve', labelId: 'configBiFeedIdentifiedApprove', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'config:crosswalk:manage', labelId: 'configCrosswalkManage', group: 'configIntegrations', risk: 'high', requires: [] },
  // Batch 517 (PS-143): a lab's secure messaging gateways and their BAA / data processing agreements.
  { key: 'config:secure-messaging:manage', labelId: 'configSecureMessagingManage', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'config:migration-mappings:manage', labelId: 'configMigrationMappingsManage', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'config:assist-polling:manage', labelId: 'configAssistPollingManage', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'assist:lis-message:ingest', labelId: 'assistLisMessageIngest', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'config:interface-preview:view', labelId: 'configInterfacePreviewView', group: 'configIntegrations', risk: 'high', requires: [] },
  // Billing tables
  // Batch 619 (PS-800): when generated charges are released to billing (per billing type, enterprise default with performing-facility overrides).
  { key: 'config:billing-release:manage', labelId: 'configBillingReleaseManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:us-epath:manage', labelId: 'configUsEpathManage', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'config:billing-rules:manage', labelId: 'configBillingRulesManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:billing-tables:approve', labelId: 'configBillingTablesApprove', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:billing-code-import:run', labelId: 'configBillingCodeImportRun', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:billing-modifiers:manage', labelId: 'configBillingModifiersManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:billing-rvu:manage', labelId: 'configBillingRvuManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:billing-ncci:manage', labelId: 'configBillingNcciManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:billing-triggers:manage', labelId: 'configBillingTriggersManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:payment-types:manage', labelId: 'configPaymentTypesManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:payment-mappings:manage', labelId: 'configPaymentMappingsManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:smart-capture:manage', labelId: 'configSmartCaptureManage', group: 'configBilling', risk: 'high', requires: [] },
  // Security and system
  { key: 'config:session-security:manage', labelId: 'configSessionSecurityManage', group: 'configSystem', risk: 'high', requires: [] },
  { key: 'config:report-appearance:manage', labelId: 'configReportAppearanceManage', group: 'configSystem', risk: 'high', requires: [] },
  // Batch 461 (Pete: sites set the map colours and patterns; labs bind their own
  // synoptic questions). Checked in services/organMapping/organMapConfig.ts.
  { key: 'config:organ-map-scheme:manage', labelId: 'configOrganMapSchemeManage', group: 'configSystem', risk: 'high', requires: [] },
  { key: 'config:organ-map-bindings:manage', labelId: 'configOrganMapBindingsManage', group: 'configSystem', risk: 'high', requires: [] },
  { key: 'config:contribution-settings:manage', labelId: 'configContributionSettingsManage', group: 'configSystem', risk: 'high', requires: [] },
  { key: 'config:external-resources:manage', labelId: 'configExternalResourcesManage', group: 'configSystem', risk: 'high', requires: [] },
  { key: 'config:research-feed:manage', labelId: 'configResearchFeedManage', group: 'configSystem', risk: 'high', requires: [] },
  // Batch 447: the QA feedback button and where QA feedback goes.
  { key: 'config:feedback:manage', labelId: 'configFeedbackManage', group: 'configSystem', risk: 'high', requires: [] },

  // ── Support access (Batch 372) ───────────────────────────────────────────
  // The hospital's control over ForMedrixAI support reaching its data (Pete's
  // specification). Held by the hospital's IT/security administrators; seeded
  // to Admin. Superadmin holds them too, but they act only on the person's
  // own organisation and never on their own request
  // (services/supportAccess/supportAccessRules.ts).
  { key: 'config:support-access:policy',  labelId: 'configSupportAccessPolicy',  group: 'supportAccess', risk: 'high', requires: [] },
  { key: 'config:support-access:approve', labelId: 'configSupportAccessApprove', group: 'supportAccess', risk: 'high', requires: [] },
  { key: 'config:support-audit:view',     labelId: 'configSupportAuditView',     group: 'supportAccess', risk: 'high', requires: [] },

  // ── ForMedrixAI platform support (Batch 371) ──────────────────────────────
  // Pete: Superadmin is reserved for ForMedrixAI support staff, and hospital
  // administrators have no control over it. These are held only through the
  // Superadmin role.
  // Opening a case from another organisation (support access). Every such
  // open is checked and written to the audit log.
  { key: 'platform:cross-tenant-cases:view', labelId: 'platformCrossTenantCasesView', group: 'platform', risk: 'high', requires: [], platformOnly: true },
  // Which governing bodies' content (CAP, RCPath, ICCR, RCPA) syncs into the
  // platform's synoptic library: a platform-wide setting, not a hospital's.
  { key: 'platform:governing-bodies:manage', labelId: 'platformGoverningBodiesManage', group: 'platform', risk: 'high', requires: [], platformOnly: true },
  // Batch 428: the national signing rules for each country (Configuration → System → Country signing
  // rules) were already ForMedrixAI support's alone, by a role check in the service; now a capability,
  // checked in services/participationTypes/saveCountryProfiles.ts.
  { key: 'platform:signing-rules:manage', labelId: 'platformSigningRulesManage', group: 'platform', risk: 'high', requires: [], platformOnly: true },
  // Batch 612: the Interface Dictionary / Message Mapper (Configuration → System → Interface Dictionary).
  // Pete: only ForMedrixAI staff build vendor profiles. Checked in services/interfaceDictionary/interfaceDictionaryServices.ts.
  // Create a vendor profile, open a draft, edit its mappings and test it against a pasted sample.
  { key: 'platform:interface-dictionary:manage', labelId: 'platformInterfaceDictionaryManage', group: 'platform', risk: 'high', requires: [], platformOnly: true },
  // Make a tested version live, roll back to the version before, or switch a profile off.
  { key: 'platform:interface-dictionary:publish', labelId: 'platformInterfaceDictionaryPublish', group: 'platform', risk: 'high', requires: ['platform:interface-dictionary:manage'], platformOnly: true },
  // Demo only: apply a pasted vendor message to a case so the Vendor fields panel can be seen. Labelled Simulated.
  { key: 'platform:interface-dictionary:simulate', labelId: 'platformInterfaceDictionarySimulate', group: 'platform', risk: 'high', requires: ['platform:interface-dictionary:manage'], platformOnly: true },
  ...LOCKBOX_CAPABILITIES, ...WORKFLOW_CAPABILITIES, // Batch 645: Lockbox Drop-Off; Batch 649: case and QA actions
] as const satisfies readonly CapabilityDefinition[];

/** A key that is in the catalog. */
export type CapabilityKey = (typeof CAPABILITY_CATALOG)[number]['key'];

/** The QA report exports (every capability whose key starts `qa:` and ends `:export`). */
export type QaExportCapability = Extract<CapabilityKey, `qa:${string}:export`>;

const BY_KEY = new Map<string, CapabilityDefinition>(CAPABILITY_CATALOG.map(c => [c.key, c]));

export function capabilityDefinition(key: string): CapabilityDefinition | undefined {
  return BY_KEY.get(key);
}

/** Whether a capability is reserved for ForMedrixAI platform support (Batch 371). */
export function isPlatformOnly(key: string): boolean {
  return !!BY_KEY.get(key)?.platformOnly;
}

export function isCapabilityKey(key: string): key is CapabilityKey {
  return BY_KEY.has(key);
}

export const ALL_CAPABILITY_KEYS: readonly CapabilityKey[] = CAPABILITY_CATALOG.map(c => c.key);

/**
 * Batch 536 (PS-554; Pete, Oct 11, 2026): pairs of capabilities no one person
 * may hold together, through one role or several. Changing the mismatch rules
 * and approving the AI instructions the check uses are separate duties.
 * Superadmin has no exemption (it doesn't hold the approval at all:
 * SUPERADMIN_WITHHELD in capabilitySeeds.ts).
 */
export const SEPARATION_OF_DUTIES: readonly (readonly [CapabilityKey, CapabilityKey])[] = [
  ['config:clinical-mismatch-rules:manage', 'config:ai-prompt:approve'],
];

/** The separation-of-duty pairs these capabilities break (both held). Pure. */
export function separationOfDutiesConflicts(capabilities: Iterable<string>): (readonly [CapabilityKey, CapabilityKey])[] {
  const held = new Set(capabilities);
  return SEPARATION_OF_DUTIES.filter(([a, b]) => held.has(a) && held.has(b));
}

/** The catalog grouped for display, groups in CAPABILITY_GROUPS order, empty groups left out. */
export function capabilitiesByGroup(catalog: readonly CapabilityDefinition[] = CAPABILITY_CATALOG): { group: CapabilityGroupId; capabilities: CapabilityDefinition[] }[] {
  return CAPABILITY_GROUPS
    .map(group => ({ group, capabilities: catalog.filter(c => c.group === group) }))
    .filter(g => g.capabilities.length > 0);
}

/** The locale keys for a capability's name and description. */
export const capabilityLabelKey = (c: Pick<CapabilityDefinition, 'labelId'>) => `capabilities.items.${c.labelId}.label`;
export const capabilityDescriptionKey = (c: Pick<CapabilityDefinition, 'labelId'>) => `capabilities.items.${c.labelId}.description`;
export const capabilityGroupKey = (g: CapabilityGroupId) => `capabilities.groups.${g}`;

/** Problems with a catalog: bad key shape, duplicates, unknown requirements, cycles. Empty when sound. */
export function catalogProblems(catalog: readonly CapabilityDefinition[]): string[] {
  const problems: string[] = [];
  const keys = new Set<string>();
  const labelIds = new Set<string>();
  for (const c of catalog) {
    if (!/^[a-z]+(-[a-z]+)*:[a-z]+(-[a-z]+)*:[a-z]+(-[a-z]+)*$/.test(c.key)) problems.push(`${c.key}: key is not domain:object:verb`);
    if (keys.has(c.key)) problems.push(`${c.key}: duplicate key`);
    if (labelIds.has(c.labelId)) problems.push(`${c.key}: duplicate labelId ${c.labelId}`);
    if (!CAPABILITY_GROUPS.includes(c.group)) problems.push(`${c.key}: unknown group ${c.group}`);
    keys.add(c.key);
    labelIds.add(c.labelId);
  }
  const byKey = new Map(catalog.map(c => [c.key, c]));
  for (const c of catalog) {
    for (const r of c.requires) {
      if (!byKey.has(r)) problems.push(`${c.key}: requires unknown ${r}`);
      if (r === c.key) problems.push(`${c.key}: requires itself`);
    }
  }
  // Cycle check (depth-first, three colours).
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (key: string, path: string[]): void => {
    if (state.get(key) === 'done') return;
    if (state.get(key) === 'visiting') { problems.push(`requirement cycle: ${[...path, key].join(' → ')}`); return; }
    state.set(key, 'visiting');
    for (const r of byKey.get(key)?.requires ?? []) if (byKey.has(r)) visit(r, [...path, key]);
    state.set(key, 'done');
  };
  for (const c of catalog) visit(c.key, []);
  return problems;
}
