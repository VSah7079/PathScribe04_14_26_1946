// src/services/fieldRequirements/fieldRequirementRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359 (Batch 376). Pete: "The User may need to have control over what
// fields on a page are required before saving. Field Configuration that is
// grouped by Pages … Some fields should always be required, and should be
// uneditable."
//
// The catalog below is the only list of configurable pages and fields.
// Each field is:
//   locked    always required; no organisation can switch it off (the reason
//             is shown beside it)
//   required  required unless the organisation switches it off
//   optional  not required unless the organisation switches it on
// The defaults reproduce what each page required before this feature, so
// nothing changes until an administrator changes it. (Grossing's "protocol"
// rule, Batch 379, is new: before it, a protocol-less specimen simply
// couldn't get blocks on the Grossing screen, so its case couldn't complete.)
//
// Settings are per organisation only: no enterprise or performing-facility
// overrides (Pete, Sep 28, 2026).
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

export type FieldRequirementPageId = 'accession' | 'grossing' | 'report' | 'messaging' | 'cytology' | 'microtomy' | 'intraop' | 'embedding' | 'slideDistribution' | 'addOnOrder' | 'batchManagement' | 'molecularBatch' | 'molecularRack';
export type FieldGroup = 'patient' | 'order' | 'specimens' | 'blocks' | 'fixation'
  | 'specimenDetails' | 'revisions' | 'criticalFindings'
  | 'holds' | 'comments' | 'delegation' | 'biopsyArray' | 'blockChanges'
  | 'discordance' | 'billingChanges' | 'autopsy' | 'signoutGates'
  | 'newMessage' | 'secureEmail' | 'reply'
  | 'cytologyReview' | 'cisoea' | 'retrospective' | 'histologyCorrelation'
  | 'slideOrders' | 'cytologyRevision'
  | 'addOrders'
  | 'intraopSession' | 'intraopSpecimen' | 'intraopTouchPrep' | 'intraopReport' | 'intraopMerge'
  | 'embeddingConfirm' | 'cassetteReprint'
  | 'slideCheckout' | 'scannerLoad' | 'slideException' | 'slideLabelReprint'
  | 'addOnOrder' | 'addOnException' | 'addOnResponse'
  | 'batchCreate' | 'batchClose'
  | 'molecularRun' | 'molecularWells' | 'molecularSupersede'
  | 'molecularRackContents' | 'molecularRackPlacement';
export type FieldDefault = 'locked' | 'required' | 'optional';
export type LockReason = 'patientIdentification' | 'routing' | 'orderingProvider' | 'specimen'
  | 'specimenIdentity' | 'specimenDescription' | 'revisionRecord' | 'amendmentNotification' | 'criticalResult'
  | 'holdAccountability' | 'retentionHold' | 'commentText' | 'delegationRouting' | 'biopsyArray' | 'materialTraceability'
  | 'discordanceRecord' | 'billingAudit' | 'billingCodeCorrection'
  | 'autopsyAuthority' | 'bodyReleaseCustody' | 'fixationCompliance' | 'preAnalyticCompliance'
  | 'messageRouting' | 'messageContent' | 'externalAddress'
  | 'screeningResult' | 'cisoeaMatrix' | 'retrospectiveOutcome' | 'correlationRecord'
  | 'slideOrder' | 'slideChangeReason'
  | 'intraopReporting' | 'quickGrossGate' | 'intraopMergeTarget'
  | 'verbalReportRecord' | 'readBack' | 'criticalResultDirect'
  | 'pieceCountVerification' | 'cassetteReprintReason'
  | 'scannerInstrument'
  | 'addOnOrderContent' | 'sendOutRouting'
  | 'batchProtocol' | 'rackTraceability' | 'decalTiming' | 'batchStain' | 'batchCustodyChange' | 'coldChainRecord'
  | 'molecularRunRecord' | 'wellTraceability' | 'controlTraceability' | 'supersedeRecord'
  | 'rackIdentity' | 'sampleMapping' | 'deckPlacement';
/** Extra guidance shown beside a field on the Field Requirements screen (Batch 379). */
export type FieldHint = 'blocksScope' | 'protocolOff' | 'delegationNoteByType' | 'nonNegativeOnly' | 'gynOnly'
  | 'matrixBlocksToo' | 'withFrozenDiagnosis' | 'otherReasonOnly' | 'noAdtMatchOnly' | 'criticalNotSurgeonOnly'
  | 'recutLinesOnly' | 'sendOutLinesOnly'
  | 'reusableRackOnly' | 'decalOnly' | 'referralOnly' | 'cytologyStainingOnly' | 'stainingOnly'
  | 'patientWellsOnly' | 'controlWellsOnly'
  | 'occupiedPositionsOnly' | 'multiSlotOnly';

export interface FieldRequirementDefinition {
  /** Stable id, stored in settings. Never change a published id. */
  readonly id: string;
  readonly group: FieldGroup;
  readonly default: FieldDefault;
  /** Why a locked field can't be switched off. */
  readonly lockReason?: LockReason;
  /** The value is one per specimen: required means every specimen has one. */
  readonly perSpecimen?: boolean;
  /** The value is one per block: required means every block has one (Batch 378). */
  readonly perBlock?: boolean;
  /** Left blank, the page fills it in when saving (Accession's Patient ID),
   *  so a blank value still counts as supplied. If filling it in fails, the
   *  page stops and says so (Pete, Batch 377). */
  readonly autoFilled?: boolean;
  /** Guidance shown beside the field in place of the per-specimen/per-block note. */
  readonly hint?: FieldHint;
}

export const FIELD_REQUIREMENT_PAGES: Readonly<Record<FieldRequirementPageId, readonly FieldRequirementDefinition[]>> = {
  // Accession: before PS-359 the page required the patient's names and date
  // of birth, the client, the requesting provider and a described specimen.
  accession: [
    { id: 'givenNames',          group: 'patient',   default: 'locked',   lockReason: 'patientIdentification' },
    { id: 'familyNames',         group: 'patient',   default: 'locked',   lockReason: 'patientIdentification' },
    { id: 'dateOfBirth',         group: 'patient',   default: 'locked',   lockReason: 'patientIdentification' },
    { id: 'mrn',                 group: 'patient',   default: 'optional', autoFilled: true },
    { id: 'client',              group: 'order',     default: 'locked',   lockReason: 'routing' },
    { id: 'requestingProvider',  group: 'order',     default: 'locked',   lockReason: 'orderingProvider' },
    { id: 'location',            group: 'order',     default: 'optional' },
    { id: 'assignedPathologist', group: 'order',     default: 'optional' },
    { id: 'clinicalIndication',  group: 'order',     default: 'optional' },
    { id: 'specimenDescription', group: 'specimens', default: 'locked',   lockReason: 'specimen', perSpecimen: true },
    { id: 'collectedAt',         group: 'specimens', default: 'optional', perSpecimen: true },
    { id: 'processedAt',         group: 'specimens', default: 'optional', perSpecimen: true },
  ],
  // Grossing (Batch 378): checked when grossing is completed (Complete
  // grossing), since each edit on the Grossing screen saves as it's made.
  // Batch 379 (Pete): "protocol" is the organisation's Require-protocol-for-
  // grossing-completion switch, on by default. Switched off, a specimen
  // without a protocol can be completed after a confirmation and is routed
  // for secondary review (services/grossing/grossingCompletion.ts). "blocks"
  // moved from locked to required-by-default, and applies only to specimens
  // whose protocol makes blocks (not cytology preparations).
  grossing: [
    { id: 'protocol',               group: 'specimens', default: 'required', perSpecimen: true, hint: 'protocolOff' },
    { id: 'blocks',                 group: 'specimens', default: 'required', perSpecimen: true, hint: 'blocksScope' },
    { id: 'pieceCount',             group: 'blocks',    default: 'optional', perBlock: true },
    { id: 'fixationEndedAt',        group: 'fixation',  default: 'optional', perSpecimen: true },
    { id: 'fixativeRatioConfirmed', group: 'fixation',  default: 'optional', perSpecimen: true },
    // Batch 397: a block's piece description, and matrix blocks (one cassette
    // shared by several specimens, edited in the report page's matrix block
    // editor) now count as blocks for both piece rules. Edits there save as
    // they're made, so, like the Grossing screen, they're checked at Complete
    // grossing (services/grossing/grossingCompletion.ts).
    { id: 'pieceDescription',       group: 'blocks',    default: 'optional', perBlock: true, hint: 'matrixBlocksToo' },
  ],
  // Case report page (Batch 380, Pete: "move on to the Synoptic Report page
  // and its related modals"), group 1: the Add/Edit specimen modal, the
  // amendment/correction/addendum modal and the critical-findings modal.
  // Checked when that modal saves (services/fieldRequirements/reportPageChecks.ts).
  // Locked fields are the ones each modal already required, which laboratory
  // standards require (CAP for amended reports and their clinician
  // notification, CLIA 42 CFR 493.1291(g) for critical results). A
  // synoptic template's own required answers stay with the template.
  report: [
    { id: 'specimenLabel',          group: 'specimenDetails',  default: 'locked',   lockReason: 'specimenIdentity' },
    { id: 'specimenDescription',    group: 'specimenDetails',  default: 'locked',   lockReason: 'specimenDescription' },
    { id: 'anatomicSite',           group: 'specimenDetails',  default: 'optional' },
    { id: 'laterality',             group: 'specimenDetails',  default: 'optional' },
    { id: 'collectionMethod',       group: 'specimenDetails',  default: 'optional' },
    { id: 'containerType',          group: 'specimenDetails',  default: 'optional' },
    { id: 'complexity',             group: 'specimenDetails',  default: 'optional' },
    { id: 'snomedTypeCode',         group: 'specimenDetails',  default: 'optional' },
    { id: 'snomedSiteCode',         group: 'specimenDetails',  default: 'optional' },
    { id: 'revisionReason',         group: 'revisions',        default: 'locked',   lockReason: 'revisionRecord' },
    { id: 'revisionText',           group: 'revisions',        default: 'locked',   lockReason: 'revisionRecord' },
    { id: 'addendumTitle',          group: 'revisions',        default: 'locked',   lockReason: 'revisionRecord' },
    { id: 'amendmentNotification',  group: 'revisions',        default: 'locked',   lockReason: 'amendmentNotification' },
    { id: 'correctionNotification', group: 'revisions',        default: 'optional' },
    { id: 'addendumNotification',   group: 'revisions',        default: 'optional' },
    { id: 'criticalClinician',      group: 'criticalFindings', default: 'locked',   lockReason: 'criticalResult' },
    { id: 'criticalMethod',         group: 'criticalFindings', default: 'locked',   lockReason: 'criticalResult' },
    { id: 'criticalNotifiedBy',     group: 'criticalFindings', default: 'locked',   lockReason: 'criticalResult' },
    { id: 'criticalReadBack',       group: 'criticalFindings', default: 'optional' },
    // Group 2 (Batch 381). Pete chose to list these fixed fields as locked,
    // so the settings screen shows every rule each modal applies. The one
    // switch is a note on every delegation (a delegation type can already
    // require one of its own, in Delegation Types).
    { id: 'caseHoldNote',             group: 'holds',        default: 'locked',   lockReason: 'holdAccountability' },
    { id: 'caseHoldReleaseNote',      group: 'holds',        default: 'locked',   lockReason: 'holdAccountability' },
    { id: 'retentionHoldNote',        group: 'holds',        default: 'locked',   lockReason: 'retentionHold' },
    { id: 'retentionHoldReleaseNote', group: 'holds',        default: 'locked',   lockReason: 'retentionHold' },
    { id: 'commentText',              group: 'comments',     default: 'locked',   lockReason: 'commentText' },
    { id: 'delegationType',           group: 'delegation',   default: 'locked',   lockReason: 'delegationRouting' },
    { id: 'delegationRecipient',      group: 'delegation',   default: 'locked',   lockReason: 'delegationRouting' },
    { id: 'delegationSynoptic',       group: 'delegation',   default: 'locked',   lockReason: 'delegationRouting' },
    { id: 'delegationNote',           group: 'delegation',   default: 'optional', hint: 'delegationNoteByType' },
    { id: 'arrayCassetteLabel',       group: 'biopsyArray',  default: 'locked',   lockReason: 'biopsyArray' },
    { id: 'arraySpecimens',           group: 'biopsyArray',  default: 'locked',   lockReason: 'biopsyArray' },
    { id: 'blockCancelReason',        group: 'blockChanges', default: 'locked',   lockReason: 'materialTraceability' },
    { id: 'restainStain',             group: 'blockChanges', default: 'locked',   lockReason: 'materialTraceability' },
    { id: 'restainReason',            group: 'blockChanges', default: 'locked',   lockReason: 'materialTraceability' },
    // Group 3 (Batch 382), first part: the frozen-versus-final discordance
    // record and the two billing modals. Pete's group 2 choice again: list
    // each modal's fixed fields as locked. The delta, severity, root cause
    // and comment apply only when the final category differs from the frozen
    // one; the root-cause explanation only when the root cause is "Other".
    { id: 'discordanceFinalDiagnosis', group: 'discordance',    default: 'locked',   lockReason: 'discordanceRecord' },
    { id: 'discordanceFinalCategory',  group: 'discordance',    default: 'locked',   lockReason: 'discordanceRecord' },
    { id: 'discordanceDelta',          group: 'discordance',    default: 'locked',   lockReason: 'discordanceRecord' },
    { id: 'discordanceSeverity',       group: 'discordance',    default: 'locked',   lockReason: 'discordanceRecord' },
    { id: 'discordanceRootCause',      group: 'discordance',    default: 'locked',   lockReason: 'discordanceRecord' },
    { id: 'discordanceRootCauseNote',  group: 'discordance',    default: 'locked',   lockReason: 'discordanceRecord' },
    { id: 'discordanceComments',       group: 'discordance',    default: 'locked',   lockReason: 'discordanceRecord' },
    { id: 'postSignoutBillingReason',  group: 'billingChanges', default: 'locked',   lockReason: 'billingAudit' },
    { id: 'postSignoutBillingComment', group: 'billingChanges', default: 'locked',   lockReason: 'billingAudit' },
    { id: 'correctedBillingCode',      group: 'billingChanges', default: 'locked',   lockReason: 'billingCodeCorrection' },
    // Group 3 (Batch 383): the two autopsy forms and the two sign-out gates.
    // Locked where a legal or accreditation rule already demands the value
    // (the gross-examination gate, chain of custody, CAP/ASCO fixation timing,
    // ISO 15189 / CAP pre-analytic dates); the two free-text notes are
    // optional switches. The order and date apply to medicolegal cases; the
    // consent time and scope to hospital-consented cases.
    { id: 'autopsyOrderReference',    group: 'autopsy',      default: 'locked',   lockReason: 'autopsyAuthority' },
    { id: 'autopsyOrderDate',         group: 'autopsy',      default: 'locked',   lockReason: 'autopsyAuthority' },
    { id: 'autopsyConsentGivenAt',    group: 'autopsy',      default: 'locked',   lockReason: 'autopsyAuthority' },
    { id: 'autopsyConsentScope',      group: 'autopsy',      default: 'optional' },
    { id: 'autopsyReleasedTo',        group: 'autopsy',      default: 'locked',   lockReason: 'bodyReleaseCustody' },
    { id: 'autopsyReleasedBy',        group: 'autopsy',      default: 'locked',   lockReason: 'bodyReleaseCustody' },
    { id: 'fixationTime',                 group: 'signoutGates', default: 'locked',   lockReason: 'fixationCompliance' },
    { id: 'fixationUnrecoverableComment', group: 'signoutGates', default: 'optional' },
    { id: 'preAnalyticCollectedAt',       group: 'signoutGates', default: 'locked',   lockReason: 'preAnalyticCompliance' },
    { id: 'preAnalyticReceivedAt',        group: 'signoutGates', default: 'locked',   lockReason: 'preAnalyticCompliance' },
    { id: 'preAnalyticOverrideComment',   group: 'signoutGates', default: 'locked',   lockReason: 'preAnalyticCompliance' },
    // Batch 397: Add Orders → Blocks / Recut. A new block (deeper levels) needs
    // the specimen it's cut from and its cassette label, as before.
    { id: 'addOrdersSpecimen',            group: 'addOrders',    default: 'locked',   lockReason: 'materialTraceability' },
    { id: 'addOrdersCassetteLabel',       group: 'addOrders',    default: 'locked',   lockReason: 'materialTraceability' },
  ],
  // Messaging (Batch 384): the message drawer opened from the header and the
  // Worklist's Staff column. A message needs a recipient and text; the subject
  // is the one switch (an organisation can allow messages without one).
  messaging: [
    { id: 'messageRecipient',   group: 'newMessage', default: 'locked',   lockReason: 'messageRouting' },
    { id: 'messageSubject',     group: 'newMessage', default: 'required' },
    { id: 'messageBody',        group: 'newMessage', default: 'locked',   lockReason: 'messageContent' },
    { id: 'secureEmailTo',      group: 'secureEmail', default: 'locked',  lockReason: 'externalAddress' },
    { id: 'secureEmailSubject', group: 'secureEmail', default: 'required' },
    { id: 'secureEmailBody',    group: 'secureEmail', default: 'locked',  lockReason: 'messageContent' },
    { id: 'messageReply',       group: 'reply',      default: 'locked',   lockReason: 'messageContent' },
  ],
  // Cytology screening (Batch 386): the screening page's five forms. Before
  // this, a Bethesda review needed only its primary interpretation, the CISOE-A
  // form needed all six components (resolveCisoeAValidation), a retrospective
  // review its outcome, and a manual histology correlation a diagnosis and an
  // outcome. Everything else was optional; an organisation can now require it.
  cytology: [
    { id: 'reviewGeneralCategorization', group: 'cytologyReview', default: 'optional' },
    { id: 'reviewAdequacy',              group: 'cytologyReview', default: 'optional' },
    { id: 'reviewPrimaryInterpretation', group: 'cytologyReview', default: 'locked',   lockReason: 'screeningResult' },
    { id: 'reviewPrimaryComment',        group: 'cytologyReview', default: 'optional' },
    { id: 'reviewAdditional',            group: 'cytologyReview', default: 'optional' },
    { id: 'reviewRecommendations',       group: 'cytologyReview', default: 'optional' },
    { id: 'reviewNotes',                 group: 'cytologyReview', default: 'optional' },
    { id: 'reviewLmp',                   group: 'cytologyReview', default: 'optional', hint: 'gynOnly' },
    { id: 'cisoeaComposition',           group: 'cisoea',         default: 'locked',   lockReason: 'cisoeaMatrix' },
    { id: 'cisoeaInflammation',          group: 'cisoea',         default: 'locked',   lockReason: 'cisoeaMatrix' },
    { id: 'cisoeaSquamous',              group: 'cisoea',         default: 'locked',   lockReason: 'cisoeaMatrix' },
    { id: 'cisoeaOtherEndometrium',      group: 'cisoea',         default: 'locked',   lockReason: 'cisoeaMatrix' },
    { id: 'cisoeaEndocervical',          group: 'cisoea',         default: 'locked',   lockReason: 'cisoeaMatrix' },
    { id: 'cisoeaAdequacy',              group: 'cisoea',         default: 'locked',   lockReason: 'cisoeaMatrix' },
    { id: 'cisoeaComments',              group: 'cisoea',         default: 'optional' },
    { id: 'cisoeaNotes',                 group: 'cisoea',         default: 'optional' },
    { id: 'retroOutcome',                group: 'retrospective',  default: 'locked',   lockReason: 'retrospectiveOutcome' },
    { id: 'retroCorrectiveAction',       group: 'retrospective',  default: 'optional', hint: 'nonNegativeOnly' },
    { id: 'histologyDiagnosis',          group: 'histologyCorrelation', default: 'locked', lockReason: 'correlationRecord' },
    { id: 'histologyOutcome',            group: 'histologyCorrelation', default: 'locked', lockReason: 'correlationRecord' },
    // Correcting a signed-out report, or adding to it (Batch 390, PS-340): a
    // reason is always recorded, and an addendum has to say something.
    { id: 'revisionReason',              group: 'cytologyRevision', default: 'locked', lockReason: 'revisionRecord' },
    { id: 'revisionAddendumText',        group: 'cytologyRevision', default: 'locked', lockReason: 'revisionRecord' },
  ],
  // Microtomy workstation (Batch 388, PS-359): the comment drawer and the slide
  // grid. A comment needs text and a slide order needs a stain, as before. The
  // level depth (µm) is a switch. A reprint or the cancelling of a printed slide
  // already needed a reason (utils/microtomyOperations.ts, for duplicate-label
  // and traceability auditing), so both are locked and listed here.
  // Checked by services/fieldRequirements/microtomyChecks.ts.
  microtomy: [
    { id: 'commentText',  group: 'comments',    default: 'locked', lockReason: 'commentText' },
    { id: 'stainType',    group: 'slideOrders', default: 'locked', lockReason: 'slideOrder' },
    { id: 'levelDepth',   group: 'slideOrders', default: 'optional' },
    { id: 'reprintReason', group: 'slideOrders', default: 'locked', lockReason: 'slideChangeReason' },
    { id: 'cancelReason', group: 'slideOrders', default: 'locked', lockReason: 'slideChangeReason' },
  ],
  // Intraoperative consultation (Batch 397, PS-359): the Intraop page's new
  // session form, each specimen's capture, the touch prep skip, the verbal
  // report to the surgeon and merging a session into its case. Before, a
  // session needed the patient's name and MRN, their confirmation, the OR
  // number and the surgeon; a specimen its label and Quick Gross (the service
  // also refuses touch prep or a frozen cut before Quick Gross); a merge a
  // case. Everything else was optional; an organisation can now require it.
  // Checked by services/fieldRequirements/intraopChecks.ts.
  intraop: [
    { id: 'patientName',            group: 'intraopSession',   default: 'locked',   lockReason: 'patientIdentification' },
    { id: 'mrn',                    group: 'intraopSession',   default: 'locked',   lockReason: 'patientIdentification' },
    { id: 'patientConfirmed',       group: 'intraopSession',   default: 'locked',   lockReason: 'patientIdentification' },
    { id: 'dateOfBirth',            group: 'intraopSession',   default: 'optional', hint: 'noAdtMatchOnly' },
    { id: 'orNumber',               group: 'intraopSession',   default: 'required' },
    { id: 'surgeon',                group: 'intraopSession',   default: 'locked',   lockReason: 'intraopReporting' },
    { id: 'facility',               group: 'intraopSession',   default: 'optional' },
    { id: 'location',               group: 'intraopSession',   default: 'optional' },
    { id: 'specimenLabel',          group: 'intraopSpecimen',  default: 'locked',   lockReason: 'specimenIdentity' },
    { id: 'quickGross',             group: 'intraopSpecimen',  default: 'locked',   lockReason: 'quickGrossGate' },
    { id: 'frozenDiagnosis',        group: 'intraopSpecimen',  default: 'optional' },
    { id: 'frozenCategory',         group: 'intraopSpecimen',  default: 'optional', hint: 'withFrozenDiagnosis' },
    { id: 'touchPrepSkipNote',      group: 'intraopTouchPrep', default: 'optional', hint: 'otherReasonOnly' },
    // Batch 399 (Pete): who received the verbal report, their role and the
    // read-back are always recorded; a critical result given to anyone but the
    // operating surgeon needs a "Surgeon unavailable" reason (and a note for
    // "Other"). services/intraop/verbalReport.ts enforces these in the service too.
    { id: 'verbalReportRecipient',    group: 'intraopReport',    default: 'locked',   lockReason: 'verbalReportRecord' },
    { id: 'verbalReportRole',         group: 'intraopReport',    default: 'locked',   lockReason: 'verbalReportRecord' },
    { id: 'verbalReportReadBack',     group: 'intraopReport',    default: 'locked',   lockReason: 'readBack' },
    { id: 'surgeonUnavailableReason', group: 'intraopReport',    default: 'locked',   lockReason: 'criticalResultDirect', hint: 'criticalNotSurgeonOnly' },
    { id: 'surgeonUnavailableNote',   group: 'intraopReport',    default: 'locked',   lockReason: 'criticalResultDirect', hint: 'otherReasonOnly' },
    { id: 'verbalReportNote',       group: 'intraopReport',    default: 'optional' },
    { id: 'mergeCase',              group: 'intraopMerge',     default: 'locked',   lockReason: 'intraopMergeTarget' },
  ],
  // Embedding station (Batch 401, PS-359): the comment drawer, confirming a
  // block as embedded, and reprinting its cassette label. Before, a comment
  // needed text, Confirm needed an observed piece count (it is compared with
  // grossing's count and a mismatch raises a Tissue Discrepancy), and a reprint
  // needed a reason (utils/embeddingOperations.ts records it for auditing), so
  // those three are locked. The base mold size and orientation instructions
  // were optional; an organisation can now require them before a block is
  // confirmed as embedded.
  // Checked by services/fieldRequirements/embeddingChecks.ts.
  embedding: [
    { id: 'commentText',             group: 'comments',         default: 'locked',   lockReason: 'commentText' },
    { id: 'observedPieceCount',      group: 'embeddingConfirm', default: 'locked',   lockReason: 'pieceCountVerification' },
    { id: 'moldSize',                group: 'embeddingConfirm', default: 'optional' },
    { id: 'orientationInstructions', group: 'embeddingConfirm', default: 'optional' },
    { id: 'reprintReason',           group: 'cassetteReprint',  default: 'locked',   lockReason: 'cassetteReprintReason' },
  ],
  // Slide distribution station (Batch 402, PS-359): routing a finished slide
  // to a pathologist (physical checkout) or a scanner, flagging an exception,
  // and reprinting its label. Before, a checkout needed a pathologist, a pool
  // or a location (any one; the page still insists on that), and a scanner
  // routing needed the instrument, which is locked. The rest were optional
  // and are now switches. The label reprint reason is new and locked (Pete,
  // Batch 402), matching Microtomy and Embedding: a reprinted slide label is a
  // possible duplicate, so the reason goes on the chain-of-custody record.
  // Checked by services/fieldRequirements/slideDistributionChecks.ts.
  slideDistribution: [
    { id: 'readingPathologist', group: 'slideCheckout',     default: 'optional' },
    { id: 'slideFolderId',      group: 'slideCheckout',     default: 'optional' },
    { id: 'trayNumber',         group: 'slideCheckout',     default: 'optional' },
    { id: 'courierBagId',       group: 'slideCheckout',     default: 'optional' },
    { id: 'scannerInstrument',  group: 'scannerLoad',       default: 'locked',   lockReason: 'scannerInstrument' },
    { id: 'rackId',             group: 'scannerLoad',       default: 'optional' },
    { id: 'slotPosition',       group: 'scannerLoad',       default: 'optional' },
    { id: 'exceptionNote',      group: 'slideException',    default: 'optional' },
    { id: 'reprintReason',      group: 'slideLabelReprint', default: 'locked',   lockReason: 'slideChangeReason' },
  ],
  // Add-On Orders (Batch 403, PS-359): a pathologist's recuts, special stains,
  // IHC and molecular/send-out orders; a tech flagging a block exception on
  // one; and the pathologist's response. Before, an order needed at least one
  // block and at least one line (locked); everything else was optional and is
  // now a switch, except the send-out lab. Pete: a molecular or send-out line
  // always names its reference lab at submission (locked), because an
  // unrouted send-out leaves blind spots in the courier and tracking logs. It
  // fills in from the test's pre-approved labs (Stain Dictionary), so the
  // pathologist needn't know the vendor.
  // Checked by services/fieldRequirements/addOnOrderChecks.ts.
  addOnOrder: [
    { id: 'addOnBlocks',         group: 'addOnOrder',     default: 'locked',   lockReason: 'addOnOrderContent' },
    { id: 'addOnLines',          group: 'addOnOrder',     default: 'locked',   lockReason: 'addOnOrderContent' },
    { id: 'levelDepth',          group: 'addOnOrder',     default: 'optional', hint: 'recutLinesOnly' },
    { id: 'cuttingInstructions', group: 'addOnOrder',     default: 'optional' },
    { id: 'sendOutLab',          group: 'addOnOrder',     default: 'locked',   lockReason: 'sendOutRouting', hint: 'sendOutLinesOnly' },
    { id: 'exceptionNote',       group: 'addOnException', default: 'optional' },
    { id: 'responseNote',        group: 'addOnResponse',  default: 'optional' },
  ],
  // Batch Management (Batch 404, PS-359): New container, and closing a batch
  // out. Before, a container needed its protocol, a reusable rack its rack
  // id, a decal batch a target duration, a referral its destination lab and
  // a cytology staining batch its stain; forcing a reconciliation closed
  // needed a reason, and so did acknowledging a cold-chain excursion. All
  // stay locked. Aborting a batch now always needs a reason too (Pete, Batch
  // 404; before, a blank one was stored as "No reason given."). The test
  // requested on a referral and a staining run's reagent lots are switches.
  // Checked by services/fieldRequirements/batchChecks.ts.
  batchManagement: [
    { id: 'protocol',              group: 'batchCreate', default: 'locked',   lockReason: 'batchProtocol' },
    { id: 'rackId',                group: 'batchCreate', default: 'locked',   lockReason: 'rackTraceability', hint: 'reusableRackOnly' },
    { id: 'decalDuration',         group: 'batchCreate', default: 'locked',   lockReason: 'decalTiming',      hint: 'decalOnly' },
    { id: 'referralDestination',   group: 'batchCreate', default: 'locked',   lockReason: 'sendOutRouting',   hint: 'referralOnly' },
    { id: 'referralTestRequested', group: 'batchCreate', default: 'optional', hint: 'referralOnly' },
    { id: 'cytologyStainType',     group: 'batchCreate', default: 'locked',   lockReason: 'batchStain',       hint: 'cytologyStainingOnly' },
    { id: 'stainingReagentLots',   group: 'batchCreate', default: 'optional', hint: 'stainingOnly' },
    { id: 'abortReason',           group: 'batchClose',  default: 'locked',   lockReason: 'batchCustodyChange' },
    { id: 'overrideReason',        group: 'batchClose',  default: 'locked',   lockReason: 'batchCustodyChange' },
    { id: 'coldChainNote',         group: 'batchClose',  default: 'locked',   lockReason: 'coldChainRecord' },
  ],
  // Molecular plate builder (Batch 405, PS-359). Before, a run needed its
  // assay code, assay name and instrument, and every control well its lot
  // number and expiry (reagent gating); superseding a run needed a reason.
  // All stay locked. New and locked (Pete, Batch 405): every patient well
  // names its specimen (container barcode or accession), so the result can
  // be traced back to it. The deck slot, at least one reagent lot and each
  // patient well's aliquot volume are switches.
  // Checked by services/fieldRequirements/molecularBatchChecks.ts.
  molecularBatch: [
    { id: 'assayCode',        group: 'molecularRun',       default: 'locked',   lockReason: 'molecularRunRecord' },
    { id: 'assayName',        group: 'molecularRun',       default: 'locked',   lockReason: 'molecularRunRecord' },
    { id: 'targetInstrument', group: 'molecularRun',       default: 'locked',   lockReason: 'molecularRunRecord' },
    { id: 'deckSlot',         group: 'molecularRun',       default: 'optional' },
    { id: 'reagentLots',      group: 'molecularRun',       default: 'optional' },
    { id: 'patientSpecimen',  group: 'molecularWells',     default: 'locked',   lockReason: 'wellTraceability',    hint: 'patientWellsOnly' },
    { id: 'aliquotVolume',    group: 'molecularWells',     default: 'optional', hint: 'patientWellsOnly' },
    { id: 'controlLotInfo',   group: 'molecularWells',     default: 'locked',   lockReason: 'controlTraceability', hint: 'controlWellsOnly' },
    { id: 'supersedeReason',  group: 'molecularSupersede', default: 'locked',   lockReason: 'supersedeRecord' },
  ],
  // Molecular Rack Loading (Batch 406, PS-359). Before, a rack needed only
  // its capacity: its barcode was generated, a manually entered tube had no
  // accession, and nothing recorded which instrument or deck slot it went to.
  // Pete: a rack is ready for the instrument only with its identifier, the
  // sample ID of every occupied position, and its instrument and deck slot
  // (the slot only where the instrument has more than one that takes a
  // sample rack). All four locked; the rack barcode is generated when left
  // blank. The assay (which narrows the slots to those its rule allows) is a
  // switch. Checked by services/fieldRequirements/molecularRackChecks.ts and
  // again in services/molecular/mockMolecularExtractionRackService.ts.
  molecularRack: [
    { id: 'rackBarcode',   group: 'molecularRackContents',  default: 'locked',   lockReason: 'rackIdentity',     autoFilled: true },
    { id: 'sampleMapping', group: 'molecularRackContents',  default: 'locked',   lockReason: 'sampleMapping',    hint: 'occupiedPositionsOnly' },
    { id: 'instrument',    group: 'molecularRackPlacement', default: 'locked',   lockReason: 'deckPlacement' },
    { id: 'deckSlot',      group: 'molecularRackPlacement', default: 'locked',   lockReason: 'deckPlacement',    hint: 'multiSlotOnly' },
    { id: 'assay',         group: 'molecularRackPlacement', default: 'optional' },
  ],
};

/** The order groups are shown in on the Field Requirements screen (Batch 397: moved here from the screen, so a new group can't be left off). */
export const FIELD_GROUP_ORDER: readonly FieldGroup[] = [
  'patient', 'order', 'specimens', 'blocks', 'fixation', 'specimenDetails', 'revisions', 'criticalFindings',
  'holds', 'comments', 'delegation', 'biopsyArray', 'blockChanges', 'addOrders', 'discordance', 'billingChanges', 'autopsy', 'signoutGates',
  'newMessage', 'secureEmail', 'reply', 'cytologyReview', 'cisoea', 'retrospective', 'histologyCorrelation', 'cytologyRevision',
  'embeddingConfirm', 'cassetteReprint', 'slideOrders',
  'slideCheckout', 'scannerLoad', 'slideException', 'slideLabelReprint',
  'addOnOrder', 'addOnException', 'addOnResponse',
  'batchCreate', 'batchClose',
  'molecularRun', 'molecularWells', 'molecularSupersede', 'molecularRackContents', 'molecularRackPlacement',
  'intraopSession', 'intraopSpecimen', 'intraopTouchPrep', 'intraopReport', 'intraopMerge',
];

export const FIELD_REQUIREMENT_PAGE_IDS = Object.keys(FIELD_REQUIREMENT_PAGES) as FieldRequirementPageId[];

/** An organisation's choices for one page: field id → required. Only fields it changed. */
export type FieldRequirementOverrides = Readonly<Record<string, boolean>>;

export interface ResolvedFieldRequirement extends FieldRequirementDefinition {
  required: boolean;
  locked: boolean;
  /** true when the organisation's choice differs from the default. */
  changed: boolean;
}

/** The page's fields with the organisation's choices applied. Choices for locked or unknown fields are ignored. */
export function resolveFieldRequirements(page: FieldRequirementPageId, overrides: FieldRequirementOverrides = {}): ResolvedFieldRequirement[] {
  return FIELD_REQUIREMENT_PAGES[page].map(f => {
    const locked = f.default === 'locked';
    const byDefault = f.default !== 'optional';
    const chosen = !locked && typeof overrides[f.id] === 'boolean' ? overrides[f.id] : byDefault;
    return { ...f, locked, required: locked || chosen, changed: !locked && chosen !== byDefault };
  });
}

export type OverrideProblem = 'unknownPage' | 'unknownField' | 'locked';

/** Why this change can't be made, or null. */
export function overrideProblem(page: string, fieldId: string): OverrideProblem | null {
  const fields = FIELD_REQUIREMENT_PAGES[page as FieldRequirementPageId];
  if (!fields) return 'unknownPage';
  const f = fields.find(x => x.id === fieldId);
  if (!f) return 'unknownField';
  return f.default === 'locked' ? 'locked' : null;
}

/** Whether a field is required in this resolved list (drives the "*" beside a label). Batch 397. */
export function isFieldRequired(requirements: readonly ResolvedFieldRequirement[], fieldId: string): boolean {
  return requirements.find(f => f.id === fieldId)?.required ?? false;
}

const isEmpty = (v: unknown): boolean =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * The required fields with no value, in catalog order. A per-specimen field
 * takes one value per specimen and is missing if there are no specimens or
 * any specimen lacks it. A field filled in automatically when blank is never
 * missing here; the save checks that filling it in worked.
 */
export function missingRequiredFields(requirements: readonly ResolvedFieldRequirement[], values: Readonly<Record<string, unknown>>): ResolvedFieldRequirement[] {
  return requirements.filter(f => {
    if (!f.required || f.autoFilled) return false;
    const v = values[f.id];
    if (f.perSpecimen || f.perBlock) return !Array.isArray(v) || v.length === 0 || v.some(isEmpty);
    return isEmpty(v);
  });
}

/** The audit entry for a change (literal English: audit records are compliance artifacts, not UI). */
export function fieldRequirementChangeAudit(
  page: FieldRequirementPageId, fieldId: string, required: boolean, organisationName: string, actorName: string,
): { type: 'user'; event: string; detail: string; user: string; caseId: null; confidence: null } {
  return {
    type: 'user',
    event: 'Field requirement changed',
    detail: `${organisationName}: ${page} field "${fieldId}" is now ${required ? 'required' : 'not required'}.`,
    user: actorName,
    caseId: null,
    confidence: null,
  };
}
