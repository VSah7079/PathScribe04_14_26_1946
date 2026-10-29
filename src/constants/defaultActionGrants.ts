// Batches 600-601: the default grants of the 60 record-changing and 89 open/filter/move commands that the roles list gained
// (docs/product/ACTIONS_COVERAGE.md). Customers start from these defaults and change them; nobody
// builds a role from nothing. Keyed by built-in role name, like DEFAULT_ROLE_PERMISSIONS.
//
// Starting points chosen from each role's job (to be reviewed by Pete, the domain expert):
//   Pathologist   everything about reports, cases, orders, intraoperative work and cytology review;
//                 not the bench stations, result dispatch or deleting a worklist row.
//   Fellow        as Pathologist, but cannot finalise, sign out and next, recall or return a report.
//   Resident      as Fellow, but no cytology correlation or retrospective review.
//   PA            grossing side: orders, printing, flags, case team, intraoperative gross logging.
//   Accessioner   new specimens, STAT flags, printing, notes.
//   Histotech     the three bench stations and container creation, printing, recuts and stains, notes.
//   Cytotech      all cytology screening commands, flags, printing, notes.
//   Molecular     plate, rack and container commands, notes.
//   Admin, Lab Director   result dispatch (send now, retry); Admin also deleting a worklist row.
//   Physician, Or Staff, QA Reviewer, Template roles   none (directory-only or review-only roles).
//   Superadmin    everything (built in systemActions.ts).
// A command is only a way to trigger something. Whether the person may do it is still decided by their
// capabilities in the service; these grants do not widen access.
import type { ActionId } from './systemActions';

const REPORT_FLOW: ActionId[] = [
  'report.addAddendum', 'report.addAmendment', 'report.saveDraft', 'report.discardChanges', 'report.chooseTemplate',
  'ai.confirmFinding', 'ai.overrideFinding', 'notes.save',
];
const REPORT_FINAL: ActionId[] = ['finalise.confirm', 'diagnosis.signOutAndNext', 'report.recall', 'report.returnToTrainee'];
const CASE_FLOW: ActionId[] = [
  'delegation.confirm', 'delegation.requestConsultation', 'pool.claimCase', 'pool.declineCase',
  'flags.save', 'flags.applyStat', 'team.addMember', 'team.assignParticipation',
];
const ORDERS: ActionId[] = [
  'orders.blockRecut', 'orders.stainSectioning', 'orders.newSpecimen', 'orders.confirmBlock',
  'orders.addOnAdd', 'orders.addOnSubmit',
];
const PRINT: ActionId[] = ['print.cassette', 'print.caseSlides'];
const INTRAOP: ActionId[] = [
  'intraop.logSurgeonReport', 'intraop.touchPrepPerformed', 'intraop.touchPrepSkip', 'intraop.frozenSectionCut',
  'intraop.logSquashPrep', 'intraop.logCytologyFluid', 'intraop.logGrossOnly', 'intraop.startSession',
  'intraop.saveSpecimenNext', 'intraop.saveSpecimenClose', 'intraop.mergeSession',
];
const CYTOLOGY: ActionId[] = [
  'cytology.addResidualFluid', 'cytology.addCellBlock', 'cytology.saveSynoptic', 'cytology.insertNarrative',
  'cytology.saveReview', 'cytology.saveCisoea', 'cytology.completeRetrospective', 'cytology.recordCorrelation',
];
const CYTOLOGY_DAILY = CYTOLOGY.filter(a => a !== 'cytology.completeRetrospective' && a !== 'cytology.recordCorrelation');
const BENCH: ActionId[] = [
  'workstation.microtomyComment', 'workstation.microtomyStain', 'workstation.embeddingConfirm', 'workstation.embeddingComment',
  'workstation.slideCheckout', 'workstation.slideScanner', 'workstation.createContainer',
];
const MOLECULAR: ActionId[] = ['workstation.createPlate', 'workstation.placeRack', 'workstation.createContainer'];
const DISPATCH: ActionId[] = ['dispatch.sendNow', 'dispatch.retry'];
// Batch 601: commands that only open, filter, move, select or cancel. Roles with case screens get all of them;
// Admin, Lab Director and QA Reviewer get going-to and searching (they have no case screens).
const VIEW_ALL: ActionId[] = [
  'view.openDelegateModal', 'view.delegatePeerReview', 'view.delegateFormalConsult', 'view.delegateFullTransfer',
  'view.aiReviewSkip', 'view.aiReviewCancel', 'view.openPreFinalise', 'view.finaliseCancel', 'view.skipField',
  'view.fullView', 'view.tabbedView', 'view.maxView', 'view.minView', 'view.previewReport', 'view.voiceCaseComment',
  'view.voiceSpecimenComment', 'view.voiceInternalNote', 'view.voiceAddSynoptic', 'view.noteAdd', 'view.noteDictate',
  'view.noteVisibilityPrivate', 'view.noteVisibilityShared', 'view.noteCancel', 'view.noteClose', 'view.gotoCodes',
  'view.voiceAddCode', 'view.selectSpecimen', 'view.openHistory', 'view.closeHistory', 'view.voiceCancel',
  'view.flagSelectCase', 'view.flagSelectAllSpecimens', 'view.flagDeselectAll', 'view.flagCancel',
  'view.openCaseTeam', 'view.flagOpenManager', 'banner.showNhsStatus', 'table.goToRow', 'table.openByAccession', 'caseTeam.addCollaborator',
  'view.addOrders', 'view.openHome', 'view.openEnhancementRequest', 'view.openTestingFeedback', 'view.viewHelp',
  'view.openResources', 'view.systemLogout', 'view.openRoutingRules', 'view.testRouting',
  'view.openParticipationTypes', 'view.focusCaseSearch', 'view.openIntraopQueue', 'view.intraopStartNewEntry',
  'view.tableFilterPhysician', 'view.readFlags', 'view.readSpecimen', 'view.readDigitalReadiness',
  'view.readDpTriage', 'view.openSlideDetails', 'view.tableFilterDp', 'view.tableFilterGyncyto',
  'view.tableFilterNongyncyto', 'view.tableFilterAutopsy', 'view.tableFilterNewcases', 'view.tableFilterCompleted',
  'view.tableSortByColumn', 'view.tableClearSort', 'view.tableFilterParticipating', 'view.tableFilterCountersign',
  'view.tableFilterPool', 'view.searchExecute', 'view.searchClear', 'view.searchLoadSaved', 'view.msgMarkReadAll',
  'view.msgViewMessages', 'view.tatShowFirstTouch', 'view.tatShowTotalCase', 'view.tatShowFrozenSection',
  'view.tatShowGrossing', 'view.tatShowSignOut', 'view.tatShowColdIschemia', 'view.tatShowConsultResponse',
  'view.tatShowConsultAwaiting', 'view.cytologyOpenMaterial', 'view.cytologyOpenSynoptic',
  'view.cytologySelectTemplateThyroid', 'view.cytologySelectTemplatePancreaticobiliary',
  'view.cytologySelectTemplateSalivaryGland', 'view.cytologySelectTemplateLymphNode',
  'view.cytologySelectTemplateUrine',
];
const VIEW_BASIC: ActionId[] = [
  'view.openHome', 'view.openEnhancementRequest', 'view.openTestingFeedback', 'view.viewHelp', 'view.openResources',
  'view.systemLogout', 'view.openRoutingRules', 'view.testRouting', 'view.openParticipationTypes',
  'view.focusCaseSearch', 'view.openIntraopQueue', 'view.intraopStartNewEntry', 'view.searchExecute',
  'view.searchClear', 'view.searchLoadSaved', 'view.msgMarkReadAll', 'view.msgViewMessages',
];


// Batch 617: grants for the 16 actions Batches 613-616 added. Same least-privilege starting points as the matching
// capabilities in capabilitySeeds.ts; a command grant never widens what the person may do.
const SIGNOUT_CASES: ActionId[] = ['related.attachCases', 'followUp.expect', 'codes.searchFlagged'];
const CASE_ACCESS_ASK: ActionId[] = ['patientSummary.print', 'caseAccess.request'];
const CASE_ACCESS_DECIDE: ActionId[] = ['caseAccess.approve', 'caseAccess.deny', 'caseAccess.revoke'];
const SEARCH_REPORTS: ActionId[] = ['searchReport.save', 'searchReport.export', 'searchReport.schedule'];
const FOLLOW_UP_QA: ActionId[] = ['followUp.recordOutcome', 'followUp.reopen', 'followUp.emailClinician'];
const BIOMETRIC: ActionId[] = ['biometric.enrol', 'biometric.disable'];
// Batch 619 (PS-800): the Outbound Queue's actions follow its capabilities (Admin).
const OUTBOUND_QUEUE: ActionId[] = ['outboundQueue.hold', 'outboundQueue.release', 'outboundQueue.retry', 'outboundQueue.retract', 'outboundQueue.overrideRelease', 'outboundQueue.markNotReportable'];

// Batch 637: grants for the actions Batches 620-636 added. They follow the matching capabilities in capabilitySeeds.ts;
// a command grant never widens what the person may do.
const HPV_MANUAL: ActionId[] = ['hpvResult.recordManual', 'hpvResult.approveManual', 'hpvResult.rejectManual'];
const CSMS_ELIGIBILITY: ActionId[] = ['csms.verifyEligibility', 'csms.recordNotEligible'];
// Batch 645: Lockbox Drop-Off. Accessioner (the morning team) gets all seven; Admin only opens it, looks at the folder and marks accessioned.
const LOCKBOX_ALL: ActionId[] = ['lockbox.open', 'lockbox.focusScan', 'lockbox.markUrgent', 'lockbox.showDropOff', 'lockbox.showFolder', 'lockbox.markAccessioned', 'lockbox.resolvePlaceholder'];
const LOCKBOX_OVERSIGHT: ActionId[] = ['lockbox.open', 'lockbox.showFolder', 'lockbox.markAccessioned'];
const HISTORY_READING: ActionId[] = ['historyExtraction.run', 'historyExtraction.flag'];

// Batch 720: the Grossing screen's bench tools: the people who gross.
const GROSSING_BENCH: ActionId[] = ['grossing.printCassettes', 'grossing.takePhoto', 'grossing.assignDecal', 'grossing.addOnOrder'];

export const DEFAULT_ACTION_GRANTS: Readonly<Record<string, readonly ActionId[]>> = {
  Pathologist: [...GROSSING_BENCH, ...HPV_MANUAL, ...CSMS_ELIGIBILITY, ...HISTORY_READING, ...SIGNOUT_CASES, ...CASE_ACCESS_ASK, ...CASE_ACCESS_DECIDE, ...SEARCH_REPORTS, ...FOLLOW_UP_QA, ...BIOMETRIC, ...VIEW_ALL, ...REPORT_FLOW, ...REPORT_FINAL, ...CASE_FLOW, ...ORDERS, ...PRINT, ...INTRAOP, ...CYTOLOGY],
  Fellow: [...GROSSING_BENCH, ...HISTORY_READING, ...SIGNOUT_CASES, ...CASE_ACCESS_ASK, ...BIOMETRIC, ...VIEW_ALL, ...REPORT_FLOW, ...CASE_FLOW, ...ORDERS, ...PRINT, ...INTRAOP, ...CYTOLOGY],
  Resident: [...GROSSING_BENCH, ...HISTORY_READING, ...CASE_ACCESS_ASK, 'codes.searchFlagged', ...BIOMETRIC, ...VIEW_ALL, ...REPORT_FLOW, ...CASE_FLOW, ...ORDERS, ...PRINT, ...INTRAOP, ...CYTOLOGY_DAILY],
  'Pathologists Assistant': [
    ...GROSSING_BENCH,
    ...VIEW_ALL, ...BIOMETRIC, 'caseAccess.request',
    'report.saveDraft', 'report.discardChanges', 'notes.save',
    'flags.save', 'flags.applyStat', 'team.addMember',
    'orders.blockRecut', 'orders.stainSectioning', 'orders.newSpecimen', 'orders.confirmBlock', ...PRINT,
    'intraop.logGrossOnly', 'intraop.logSquashPrep', 'intraop.touchPrepPerformed', 'intraop.touchPrepSkip',
  ],
  Accessioner: [...LOCKBOX_ALL, ...BIOMETRIC, ...VIEW_ALL, 'orders.newSpecimen', 'flags.save', 'flags.applyStat', ...PRINT, 'notes.save'],
  Histotechnologist: [...BIOMETRIC, ...VIEW_ALL, ...BENCH, ...PRINT, 'orders.blockRecut', 'orders.stainSectioning', 'notes.save'],
  Cytotechnologist: [...BIOMETRIC, ...VIEW_ALL, ...CYTOLOGY, 'flags.save', 'flags.applyStat', ...PRINT, 'notes.save'],
  'Molecular Technologist': [...BIOMETRIC, ...VIEW_ALL, ...MOLECULAR, 'notes.save'],
  Admin: ['registryBatch.makeFile', ...OUTBOUND_QUEUE, ...LOCKBOX_OVERSIGHT, ...BIOMETRIC, ...SEARCH_REPORTS, ...FOLLOW_UP_QA, 'caseAccess.approve', 'caseAccess.deny', 'caseAccess.revoke', ...VIEW_BASIC, ...DISPATCH, 'table.deleteRow'],
  'Lab Director': [...HPV_MANUAL, ...CSMS_ELIGIBILITY, ...BIOMETRIC, ...SEARCH_REPORTS, ...FOLLOW_UP_QA, ...VIEW_BASIC, ...DISPATCH],
  'QA Reviewer': [...BIOMETRIC, ...SEARCH_REPORTS, ...FOLLOW_UP_QA, ...VIEW_BASIC],
};
