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
  { key: 'screen:batch-management:open',     labelId: 'screenBatchManagementOpen',     group: 'screens', risk: 'standard', requires: [] },
  // Pathology Workspace hub
  { key: 'screen:cytology-workspace:open',   labelId: 'screenCytologyWorkspaceOpen',   group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:microtomy:open',            labelId: 'screenMicrotomyOpen',           group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:embedding:open',            labelId: 'screenEmbeddingOpen',           group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:slide-distribution:open',   labelId: 'screenSlideDistributionOpen',   group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:molecular:open',            labelId: 'screenMolecularOpen',           group: 'screens', risk: 'standard', requires: [] },
  // Quality & Compliance hub
  { key: 'screen:audit-log:open',            labelId: 'screenAuditLogOpen',            group: 'screens', risk: 'standard', requires: [] },
  { key: 'screen:quality-assurance:open',    labelId: 'screenQualityAssuranceOpen',    group: 'screens', risk: 'standard', requires: [] },
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
  // Batch 417 (Registry Engine SRS v2.1, FR-004.3): recording or removing a
  // patient's national identifier (NHS number, BSN, IHI…), the number every
  // registry keys on. Checked in services/patientIdentifiers/recordNationalPatientIdentifier.ts.
  { key: 'patient:national-identifier:record', labelId: 'patientNationalIdentifierRecord', group: 'casework', risk: 'high', requires: [] },
  // Batch 418 (SRS v2.1, FR-008.1): recording a patient's registry opt-outs
  // (screening programme; cancer registry where the law allows). Checked in
  // services/registryConsent/recordPatientRegistryConsent.ts.
  { key: 'patient:registry-consent:record', labelId: 'patientRegistryConsentRecord', group: 'casework', risk: 'high', requires: [] },

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

  // Batch 403 (Pete: "Both, all 3 roles"): placing a pathologist's add-on order
  // (recuts, special stains, IHC, molecular/send-out; also cancelling one or
  // modifying and resubmitting it after a block exception), and approving
  // destructive cutting when the block may be used up. Checked in
  // services/addOnOrders/addOnOrderActions.ts; seeded to Pathologist, Fellow
  // and Resident, who had the Add-On Orders screen.
  { key: 'add-on:order:place',                     labelId: 'addOnOrderPlace',                    group: 'casework', risk: 'high', requires: [] },
  { key: 'add-on:exception:approve-destructive-cut', labelId: 'addOnExceptionApproveDestructiveCut', group: 'casework', risk: 'high', requires: [] },

  // Batch 404 (Pete: "3 permissions, keep users"): Batch Management's three
  // chain-of-custody overrides. Completing a reconciliation with items
  // missing or unexpected, aborting a batch, and acknowledging a cold-chain
  // temperature excursion. Checked in services/batches/mockBatchService.ts;
  // seeded to every role with the Batch Management screen.
  { key: 'batch:reconciliation:override',          labelId: 'batchReconciliationOverride',        group: 'casework', risk: 'high', requires: [] },
  { key: 'batch:run:abort',                        labelId: 'batchRunAbort',                      group: 'casework', risk: 'high', requires: [] },
  { key: 'batch:cold-chain-excursion:acknowledge', labelId: 'batchColdChainExcursionAcknowledge', group: 'casework', risk: 'high', requires: [] },
  // Batch 432: recording where a referral batch is (in transit, delivered).
  { key: 'referral:transit-status:update', labelId: 'referralTransitStatusUpdate', group: 'casework', risk: 'high', requires: [] },
  // Batch 407 (Pete: "Keep today's users"): disposing of retained material
  // (wet tissue, blocks, slides) by scanning it on the Disposal Queue. The one
  // irreversible step in the retention workflow. Checked in
  // services/retentionPolicy/disposeItemByScan.ts, with the station's facility;
  // seeded to every role with the Batch Management screen (where the Disposal
  // Queue lives) and to a hospital's own roles with case access.
  { key: 'retention:material:dispose',             labelId: 'retentionMaterialDispose',           group: 'casework', risk: 'high', requires: [] },
  // Batch 407: exporting the disposal (waste-tracking) report, which lists
  // accession numbers. Before, the export had no check at all. Checked in
  // services/retentionPolicy/exportDisposalReport.ts with the report's
  // facility; seeded like disposal itself (Pete: keep today's users).
  { key: 'retention:disposal-report:export',       labelId: 'retentionDisposalReportExport',      group: 'casework', risk: 'high', requires: [] },

  // Batch 405 (Pete: "Permission, keep users"): Clone & Supersede retires a
  // molecular run and starts its replacement. Checked in
  // services/molecular/mockMolecularBatchService.ts; seeded to every role with
  // the Molecular screen.
  { key: 'molecular:batch:supersede', labelId: 'molecularBatchSupersede', group: 'casework', risk: 'high', requires: [] },

  // ── Billing (Batch 382) ───────────────────────────────────────────────────
  // Correcting an applied billing code credits the original charge and bills
  // the new one. Pete: keep today's users, but as a permission of its own,
  // apart from case access, so a hospital can later take it off its clinical
  // roles without changing the service. Checked in services/billing/
  // correctServiceCharge.ts (enforceAppliedCodeCorrection).
  { key: 'billing:applied-code:correct', labelId: 'billingAppliedCodeCorrect', group: 'billing', risk: 'high', requires: [] },

  // ── Autopsy (Batch 383) ───────────────────────────────────────────────────
  // Releasing a body ends the mortuary's custody: it records who received it
  // and who released it. A permission of its own (as with the billing
  // correction), for the roles with case access today. Checked in
  // services/autopsy/releaseAutopsyBody.ts.
  { key: 'autopsy:body:release', labelId: 'autopsyBodyRelease', group: 'autopsy', risk: 'high', requires: [] },

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
  { key: 'qa:countersign-turnaround:export',  labelId: 'qaCountersignTurnaroundExport',  group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:fppe-tracking:export',           labelId: 'qaFppeTrackingExport',           group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:drift-correction:export',        labelId: 'qaDriftCorrectionExport',        group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:patient-match-review:export',    labelId: 'qaPatientMatchReviewExport',     group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'qa:access-request-response:export', labelId: 'qaAccessRequestResponseExport', group: 'qaOperations', risk: 'high', requires: [] },
  // Batch 425: the registry transmission audit (screening and cancer, one column set: sent time,
  // registry status, the registry's response code). Checked in services/qualityAssurance/qaExport.ts,
  // called by services/registrySubmission/registryExceptionsService.ts (exportRegistryTransmissionAudit).
  { key: 'qa:registry-transmission-audit:export', labelId: 'qaRegistryTransmissionAuditExport', group: 'qaOperations', risk: 'high', requires: [] },

  // ── Quality assurance: CAPA pillar ────────────────────────────────────────
  { key: 'qa:management-reviews:export', labelId: 'qaManagementReviewsExport', group: 'qaCapa', risk: 'high', requires: [] },

  // ── Quality assurance: Financials pillar ─────────────────────────────────
  { key: 'qa:billing-deficiencies:export', labelId: 'qaBillingDeficienciesExport', group: 'qaFinancials', risk: 'high', requires: [] },

  // ── Quality assurance: Cytology pillar ───────────────────────────────────
  { key: 'qa:cytology-histology-correlation:export', labelId: 'qaCytologyHistologyCorrelationExport', group: 'qaCytology', risk: 'high', requires: [] },

  // ── Quality assurance: dashboards, inspection and enterprise ─────────────
  { key: 'qa:activity-dashboard:export', labelId: 'qaActivityDashboardExport', group: 'qaOversight', risk: 'high', requires: [] },
  // Batch 432 (Pete): marking an Audit Log error resolved. Everyone who opens the Audit Log.
  { key: 'audit:error:resolve', labelId: 'auditErrorResolve', group: 'qaOversight', risk: 'high', requires: [] },
  // The binder lists, case by case, the same QA review records the dashboard
  // totals, so anyone who can export it can export the dashboard's figures.
  { key: 'qa:inspection-evidence:export', labelId: 'qaInspectionEvidenceExport', group: 'qaOversight', risk: 'high', requires: ['qa:activity-dashboard:export'] },
  { key: 'qa:enterprise-rollup:export',   labelId: 'qaEnterpriseRollupExport',   group: 'qaOversight', risk: 'high', requires: [] },

  // ── Administration (PS-356, Batch 370) ───────────────────────────────────
  // Before these, anyone signed in could edit roles (their own capabilities
  // included) and staff role assignments: the self-escalation path.
  { key: 'config:roles:manage',        labelId: 'configRolesManage',        group: 'administration', risk: 'high', requires: [] },
  { key: 'config:staff:edit',          labelId: 'configStaffEdit',          group: 'administration', risk: 'high', requires: [] },
  // Roles, facility assignments, pediatric/orchestration/cross-tenant flags
  // and jurisdictional credentials: what someone is allowed to do or see.
  { key: 'config:staff-access:assign', labelId: 'configStaffAccessAssign',  group: 'administration', risk: 'high', requires: ['config:staff:edit'] },
  { key: 'config:demo-data:reset',     labelId: 'configDemoDataReset',      group: 'administration', risk: 'high', requires: [] },
  // PS-359 (Batch 376): which fields each page requires, for the person's own organisation.
  { key: 'config:field-requirements:manage', labelId: 'configFieldRequirementsManage', group: 'administration', risk: 'high', requires: [] },
  // Batch 399: the critical intraoperative results dictionary decides when a
  // frozen result needs direct communication with the operating surgeon, so
  // changing it is an administrative, audited act. Checked in
  // services/intraop/mockIntraopCriticalResultService.ts.
  { key: 'config:intraop-critical-results:manage', labelId: 'configIntraopCriticalResultsManage', group: 'administration', risk: 'high', requires: [] },
  // Batch 406: a molecular assay's control rules (which controls every plate
  // needs, and which deck slots its sample rack may go in) decide whether a
  // run is valid, so changing them is an administrative act. Pete: "default to
  // admin but it remains an assignable permission" (a Lab Director is given it
  // in the Role Dictionary). Checked in
  // services/molecular/mockMolecularAssayControlRuleService.ts.
  { key: 'config:molecular-control-rules:manage', labelId: 'configMolecularControlRulesManage', group: 'administration', risk: 'high', requires: [] },
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
  { key: 'config:actions:manage', labelId: 'configActionsManage', group: 'configAi', risk: 'high', requires: [] },
  { key: 'config:voice:manage', labelId: 'configVoiceManage', group: 'configAi', risk: 'high', requires: [] },
  { key: 'config:macros:manage', labelId: 'configMacrosManage', group: 'configAi', risk: 'high', requires: [] },
  // Cytology
  { key: 'config:cytology-categories:manage', labelId: 'configCytologyCategoriesManage', group: 'configCytology', risk: 'high', requires: [] },
  { key: 'config:cytology-nomenclature:manage', labelId: 'configCytologyNomenclatureManage', group: 'configCytology', risk: 'high', requires: [] },
  { key: 'config:cytology-routing:manage', labelId: 'configCytologyRoutingManage', group: 'configCytology', risk: 'high', requires: [] },
  { key: 'config:cytology-screening-strategy:manage', labelId: 'configCytologyScreeningStrategyManage', group: 'configCytology', risk: 'high', requires: [] },
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
  { key: 'config:case-masks:manage', labelId: 'configCaseMasksManage', group: 'configLab', risk: 'high', requires: [] },
  // Results, reporting and quality
  { key: 'config:participation-types:manage', labelId: 'configParticipationTypesManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:release-buffer:manage', labelId: 'configReleaseBufferManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:delivery-rules:manage', labelId: 'configDeliveryRulesManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:abnormal-triggers:manage', labelId: 'configAbnormalTriggersManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:concordance-review:manage', labelId: 'configConcordanceReviewManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:qa-types:manage', labelId: 'configQaTypesManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:validation-studies:manage', labelId: 'configValidationStudiesManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'validation:approval:record', labelId: 'validationApprovalRecord', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:retention-policy:manage', labelId: 'configRetentionPolicyManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:fppe:manage', labelId: 'configFppeManage', group: 'configQuality', risk: 'high', requires: [] },
  { key: 'config:cytotech-competency:manage', labelId: 'configCytotechCompetencyManage', group: 'configQuality', risk: 'high', requires: [] },
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
  { key: 'config:crosswalk:manage', labelId: 'configCrosswalkManage', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'config:migration-mappings:manage', labelId: 'configMigrationMappingsManage', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'config:assist-polling:manage', labelId: 'configAssistPollingManage', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'assist:lis-message:ingest', labelId: 'assistLisMessageIngest', group: 'configIntegrations', risk: 'high', requires: [] },
  { key: 'config:interface-preview:view', labelId: 'configInterfacePreviewView', group: 'configIntegrations', risk: 'high', requires: [] },
  // Billing tables
  { key: 'config:billing-rules:manage', labelId: 'configBillingRulesManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:billing-tables:approve', labelId: 'configBillingTablesApprove', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:billing-code-import:run', labelId: 'configBillingCodeImportRun', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:billing-modifiers:manage', labelId: 'configBillingModifiersManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:billing-rvu:manage', labelId: 'configBillingRvuManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:billing-ncci:manage', labelId: 'configBillingNcciManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:billing-triggers:manage', labelId: 'configBillingTriggersManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:payment-types:manage', labelId: 'configPaymentTypesManage', group: 'configBilling', risk: 'high', requires: [] },
  { key: 'config:payment-mappings:manage', labelId: 'configPaymentMappingsManage', group: 'configBilling', risk: 'high', requires: [] },
  // Security and system
  { key: 'config:session-security:manage', labelId: 'configSessionSecurityManage', group: 'configSystem', risk: 'high', requires: [] },
  { key: 'config:report-appearance:manage', labelId: 'configReportAppearanceManage', group: 'configSystem', risk: 'high', requires: [] },
  { key: 'config:contribution-settings:manage', labelId: 'configContributionSettingsManage', group: 'configSystem', risk: 'high', requires: [] },
  { key: 'config:external-resources:manage', labelId: 'configExternalResourcesManage', group: 'configSystem', risk: 'high', requires: [] },
  { key: 'config:research-feed:manage', labelId: 'configResearchFeedManage', group: 'configSystem', risk: 'high', requires: [] },

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
