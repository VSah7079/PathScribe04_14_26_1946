// src/services/actionRegistry/permissionOnlyActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 614: the Role Dictionary entries that have no voice phrase or hotkey of their own, and why.
//
// Batches 599-601 left 98 entries "permission-only" with a note that voice might come later. Batch 614 settled every
// one: 16 text-editor commands became real voice and hotkey commands (EDITOR_*, see components/Editor/editorCommands.ts),
// and each of the rest is classified below, so none is left as "planned".
//
//   covered       The thing it grants is already spoken or keyed by another command (`coveredBy`, a registry id).
//   screen        It opens a screen or list. Reached from the menu, or by the Go to prefix and the "open ..." commands
//                 where one exists; there is no action on a case to trigger.
//   needs-choice  It needs a person, value, file or record picked on screen first. The screen's own dialog asks;
//                 a spoken word alone cannot supply it.
//   risky         It changes or sends records outside the lab, or cannot be undone. It takes a deliberate click so a
//                 misheard word or a stray key cannot do it. (Sign-out itself is spoken: it opens the confirmation.)
//
// A role's grant of any of these only records whether the role may use it. Real access control is capabilities.
// actionRegistry/actionsCoverage.guard.test.ts checks this list against the two registries.
// ─────────────────────────────────────────────────────────────────────────────

export type PermissionOnlyKind = 'covered' | 'screen' | 'needs-choice' | 'risky';

export interface PermissionOnlyEntry {
  kind: PermissionOnlyKind;
  /** Registry action id that already does it. Only for `covered`. */
  coveredBy?: string;
}

export const PERMISSION_ONLY_REASON: Record<PermissionOnlyKind, string> = {
  covered: 'Already spoken or keyed by another command.',
  screen: 'Opens a screen or list; reached from the menu, the Go to prefix or an "open ..." command, with no action to trigger.',
  'needs-choice': 'Needs a person, value, file or record picked on screen first; the screen\'s own dialog asks for it.',
  risky: 'Changes or sends records outside the lab, or cannot be undone; it takes a deliberate click so a misheard word cannot do it.',
};

const c = (coveredBy: string): PermissionOnlyEntry => ({ kind: 'covered', coveredBy });
const SCREEN: PermissionOnlyEntry = { kind: 'screen' };
const CHOICE: PermissionOnlyEntry = { kind: 'needs-choice' };
const RISKY: PermissionOnlyEntry = { kind: 'risky' };

/** Role Dictionary id -> classification. 80 ids (98 entries: ai.viewConfidence and ai.override are listed in two groups). */
export const PERMISSION_ONLY_ACTIONS: Readonly<Record<string, PermissionOnlyEntry>> = {
  'system.saveDraft': c('SAVE_DRAFT'),
  'table.refineSearch': c('TABLE_SEARCH'),
  'diagnosis.signOut': c('SIGN_OUT'),
  'diagnosis.coSign': RISKY,
  'diagnosis.amend': c('ADD_AMENDMENT'),
  'diagnosis.revokeSignOut': RISKY,
  'case.viewWorklist': c('OPEN_WORKLIST'),
  'case.open': c('TABLE_OPEN_SELECTED'),
  'case.editDemographics': CHOICE,
  'case.assign': CHOICE,
  'case.reassign': CHOICE,
  'case.prioritize': c('FLAG_APPLY_STAT'),
  'case.archive': RISKY,
  'case.delete': RISKY,
  'case.viewPediatric': SCREEN,
  'specimen.edit': CHOICE,
  'specimen.remove': RISKY,
  'specimen.applyFlag': c('FLAG_OPEN_MANAGER'),
  'specimen.removeFlag': c('FLAG_OPEN_MANAGER'),
  'specimen.assignSubspecialty': CHOICE,
  'specimen.syncLIS': RISKY,
  'specimen.editLISStatus': RISKY,
  'report.preview': c('PREVIEW_REPORT'),
  'report.generate': CHOICE,
  'report.deliver': RISKY,
  'report.redeliver': RISKY,
  'report.viewHistory': SCREEN,
  'report.download': CHOICE,
  'report.selectTemplate': c('TEMPLATE_SELECT'),
  'report.overrideTemplate': c('TEMPLATE_SELECT'),
  'ai.diagnosisSuggest': c('AI_REVIEW_CONFIRM'),
  'ai.grossAssist': c('AI_REVIEW_CONFIRM'),
  'ai.macroSuggest': c('AI_REVIEW_CONFIRM'),
  'ai.viewConfidence': SCREEN,
  'ai.override': c('AI_REVIEW_OVERRIDE'),
  'ai.changeReportTemplate': c('TEMPLATE_SELECT'),
  'ai.acceptNarrativeSection': c('CYTOLOGY_INSERT_NARRATIVE'),
  'ai.regenerateSection': CHOICE,
  'facility.view': SCREEN,
  'facility.edit': CHOICE,
  'physician.view': SCREEN,
  'physician.edit': CHOICE,
  'physician.verify': CHOICE,
  'config.access': c('OPEN_CONFIGURATION'),
  'config.staff': SCREEN,
  'config.roles': SCREEN,
  'config.subspecialties': SCREEN,
  'config.specimens': SCREEN,
  'config.flags': SCREEN,
  'config.ai': SCREEN,
  'config.macros': SCREEN,
  'config.shortcuts': SCREEN,
  'config.lis': SCREEN,
  'config.auditLog': c('OPEN_AUDIT'),
  'config.reportTemplates': SCREEN,
  'config.routingRules': c('OPEN_ROUTING_RULES'),
  'config.validationStudies': SCREEN,
  'qc.configure': SCREEN,
  'qc.viewQueue': SCREEN,
  'qc.claimReview': CHOICE,
  'qc.submitReview': CHOICE,
  'qc.escalateDiscordance': CHOICE,
  'qc.viewDashboard': SCREEN,
  'qc.exportReport': RISKY,
  'billing.viewCodes': SCREEN,
  'billing.editCodes': CHOICE,
  'billing.submitClaim': RISKY,
  'billing.viewHistory': SCREEN,
  'billing.exportBatch': RISKY,
  'admin.dashboard': SCREEN,
  'admin.reports': SCREEN,
  'admin.export': RISKY,
  'admin.backups': RISKY,
  'admin.eventLog': SCREEN,
  'admin.impersonate': RISKY,
  'admin.validationStudies': SCREEN,
  'ai.reviewTriage': c('AI_REVIEW_CONFIRM'),
  'ai.codeSuggest': c('AI_REVIEW_CONFIRM'),
  'ai.narrativeGenerate': c('CYTOLOGY_INSERT_NARRATIVE'),
  'synoptic.markDeferred': CHOICE,
  // Batch 617: actions added by Batches 613-616 (related cases, case access, search reports, follow-up, biometric)
  'related.attachCases': CHOICE,
  'patientSummary.print': CHOICE,
  'caseAccess.request': CHOICE,
  'caseAccess.approve': RISKY,
  'caseAccess.deny': RISKY,
  'caseAccess.revoke': RISKY,
  'searchReport.save': CHOICE,
  'searchReport.export': RISKY,
  // Batch 619 (PS-800): the Outbound Queue. Each needs messages picked on screen first; the last four change what leaves the lab.
  'outboundQueue.hold': CHOICE,
  'outboundQueue.release': RISKY,
  'outboundQueue.retry': RISKY,
  'outboundQueue.retract': RISKY,
  'outboundQueue.overrideRelease': RISKY,
  'outboundQueue.markNotReportable': RISKY,
  // Batch 645: a folder row is picked first, and each adds a permanent entry; the placeholder link needs the real number typed.
  'lockbox.markAccessioned': RISKY,
  'lockbox.resolvePlaceholder': CHOICE,
  // Batch 762: Requisition Inbox. Run now has its phrase and Alt+R; the rest need a row (or the case) picked first, and
  // Discard cannot be undone.
  'requisition.openInbox': SCREEN,
  'requisition.view': CHOICE,
  'requisition.link': CHOICE,
  'requisition.discard': RISKY,
  'requisition.openFromCase': SCREEN,
  // Batch 763: the QC checkpoint on Slide Distribution, each on a run or an image picked first.
  'stainQc.signOffRun': CHOICE,
  'stainQc.failSlide': CHOICE,
  'stainQc.overrideVendor': RISKY,
  'stainQc.releaseImage': CHOICE,
  'stainQc.rescanImage': CHOICE,
  'searchReport.schedule': CHOICE,
  'followUp.expect': CHOICE,
  'followUp.recordOutcome': CHOICE,
  'followUp.reopen': CHOICE,
  'followUp.emailClinician': RISKY,
  'codes.searchFlagged': CHOICE,
  'biometric.enrol': CHOICE,
  'biometric.disable': CHOICE,
  // Batch 637: actions added by Batches 620-636. Each needs a result or case picked on screen first, or is a deliberate click.
  'hpvResult.recordManual': CHOICE,
  'hpvResult.approveManual': RISKY,
  'hpvResult.rejectManual': RISKY,
  'csms.verifyEligibility': RISKY,
  'csms.recordNotEligible': CHOICE,
  'historyExtraction.run': CHOICE,
  'historyExtraction.flag': CHOICE,
  'registryBatch.makeFile': RISKY,
};
