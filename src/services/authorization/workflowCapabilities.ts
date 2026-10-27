// src/services/authorization/workflowCapabilities.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649: the everyday case and quality actions that had no capability of their own (the workflow audit found
// each one checked only by its screen, or by nothing). Kept in their own file, spread into CAPABILITY_CATALOG, so
// capabilityCatalog.ts stays at 1,000 lines (CLAUDE.md rule 10). One capability per distinct action (Pete: no
// blanket flags). Each is checked in the service that does the work (authorizationService.enforce):
//
//   surgical:report:sign-out          sign out (Orchestration) or finalize (Assist) a surgical report:
//                                     services/auth/authorizeSurgicalSignOut.ts. The case relationship
//                                     (canFinalizeCase) still decides who may sign THIS case; since Batch 649
//                                     no role, Superadmin included, bypasses it.
//   surgical:preliminary:release      Release preliminary: services/reports/releasePreliminaryReport.ts.
//   surgical:amendment:release        release an amendment (diagnosis changed), a correction (no diagnostic
//   surgical:correction:release       change) or an addendum: services/reports/revisionReleaseCapability.ts,
//   surgical:addendum:release         from mockAmendmentService.release.
//   report:release:recall             recall a report output during its release delay (the signer only, as
//                                     before): mockReportReleaseService.recall and releaseReport.recallHeldRelease.
//   case:pool:claim / case:pool:pass  take or pass a pool case: services/cases/poolCaseActions.ts.
//   case:flag:apply / case:flag:remove  case and specimen flags (Flag Manager): api/caseFlagsApi.ts.
//   case:diagnosis-code:apply         save diagnosis codes from the Codes window: services/codes/diagnosisCodeApply.ts.
//   case:accession:create             create a case on the Accession screen: services/accessioning/createAccessionedCase.ts.
//   case:informal-review:request      ask a colleague for an informal review: services/reports/sendReviewRequest.ts.
//   qa:deficiency:raise / escalate / contain / verify   the Quality Assurance deficiency actions:
//                                     services/deficiencies/qaDeficiencyActions.ts.
//
// Seeds (capabilitySeeds.ts, WORKFLOW_SEEDS) are least privilege: see that file.
// ─────────────────────────────────────────────────────────────────────────────
import type { CapabilityDefinition } from './capabilityCatalog';

export const WORKFLOW_CAPABILITIES = [
  { key: 'surgical:report:sign-out', labelId: 'surgicalReportSignOut', group: 'casework', risk: 'high', requires: [] },
  { key: 'surgical:preliminary:release', labelId: 'surgicalPreliminaryRelease', group: 'casework', risk: 'high', requires: [] },
  { key: 'surgical:amendment:release', labelId: 'surgicalAmendmentRelease', group: 'casework', risk: 'high', requires: [] },
  { key: 'surgical:correction:release', labelId: 'surgicalCorrectionRelease', group: 'casework', risk: 'high', requires: [] },
  { key: 'surgical:addendum:release', labelId: 'surgicalAddendumRelease', group: 'casework', risk: 'high', requires: [] },
  { key: 'report:release:recall', labelId: 'reportReleaseRecall', group: 'casework', risk: 'high', requires: [] },
  { key: 'case:pool:claim', labelId: 'casePoolClaim', group: 'casework', risk: 'high', requires: [] },
  { key: 'case:pool:pass', labelId: 'casePoolPass', group: 'casework', risk: 'standard', requires: [] },
  { key: 'case:flag:apply', labelId: 'caseFlagApply', group: 'casework', risk: 'standard', requires: [] },
  { key: 'case:flag:remove', labelId: 'caseFlagRemove', group: 'casework', risk: 'standard', requires: [] },
  { key: 'case:diagnosis-code:apply', labelId: 'caseDiagnosisCodeApply', group: 'casework', risk: 'high', requires: [] },
  { key: 'case:accession:create', labelId: 'caseAccessionCreate', group: 'casework', risk: 'high', requires: ['screen:accession:open'] },
  { key: 'case:informal-review:request', labelId: 'caseInformalReviewRequest', group: 'casework', risk: 'standard', requires: [] },
  { key: 'qa:deficiency:raise', labelId: 'qaDeficiencyRaise', group: 'qaOperations', risk: 'high', requires: ['screen:quality-assurance:open'] },
  { key: 'qa:deficiency:escalate', labelId: 'qaDeficiencyEscalate', group: 'qaOperations', risk: 'high', requires: ['screen:quality-assurance:open'] },
  { key: 'qa:deficiency:contain', labelId: 'qaDeficiencyContain', group: 'qaOperations', risk: 'high', requires: ['screen:quality-assurance:open'] },
  // Batch 654: printing a report still in its release delay under the Supervisor Override policy (planReportPrint).
  { key: 'print:release-hold:override', labelId: 'printReleaseHoldOverride', group: 'qaOversight', risk: 'high', requires: [] },
  { key: 'qa:deficiency:verify', labelId: 'qaDeficiencyVerify', group: 'qaOperations', risk: 'high', requires: ['screen:quality-assurance:open'] },
  // Batch 659: submitting a Management Review of closed deficiencies.
  { key: 'qa:management-review:submit', labelId: 'qaManagementReviewSubmit', group: 'qaOperations', risk: 'high', requires: ['screen:quality-assurance:open'] },
  // Batch 669 (ws-19, Pete: strict gates): flagging a block exception (Block exhausted and the other reasons, on the Add-On
  // Orders tracking list and the Microtomy workstation) and marking a block retrieved for an add-on order. Both were open
  // to everyone who could reach the screen. Checked in services/addOnOrders/addOnOrderActions.ts.
  { key: 'add-on:exception:flag', labelId: 'addOnExceptionFlag', group: 'casework', risk: 'standard', requires: [] },
  { key: 'add-on:block:mark-retrieved', labelId: 'addOnBlockMarkRetrieved', group: 'casework', risk: 'standard', requires: [] },
  // Batch 669 (access-11): opting in, when issuing an External Consult link, to showing the outside consultant the patient's
  // full name and date of birth (the page is masked by default). Pathologist and Lab Director. Checked in the consult link service.
  { key: 'case:consult-link:reveal-identity', labelId: 'caseConsultLinkRevealIdentity', group: 'casework', risk: 'high', requires: [] },
] as const satisfies readonly CapabilityDefinition[];
