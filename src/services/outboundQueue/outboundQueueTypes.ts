// src/services/outboundQueue/outboundQueueTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): the one shape every outbound queue is shown in on the
// Outbound Queue screen, whatever queue the message waits in.
//
// PathScribe owns what is sent and when (the rules, the schedule, the queue,
// the status and the audit); the interface engine owns how (translation,
// transport, transport retry and acknowledgements). An engine acknowledgement
// updates the entry's status here, so this screen is the single source of truth.
// Contract: docs/architecture/OUTBOUND_QUEUE_API.md.
// ─────────────────────────────────────────────────────────────────────────────

/** The ten feeds: the eight interface queues (outboundQueueAdapters.ts), the billing charges and the registry submissions. */
export const OUTBOUND_FEEDS = [
  'result', 'patient_adt', 'accession', 'lis_sync', 'billing', 'report_delivery', 'cytology_result', 'referral', 'molecular_order', 'registry',
] as const;
export type OutboundFeed = (typeof OUTBOUND_FEEDS)[number];

/**
 * waiting        queued, goes at its scheduled time
 * held           a person stopped it; nothing sends it until it is released
 * sent           the engine has it
 * acknowledged   the receiver confirmed it (the engine's acknowledgement)
 * failed         a send failed; it can be retried
 * deadLettered   it failed past its automatic retries; a person must retry it
 * rejected       the receiving registry returned it with validation errors; a coder or
 *                pathologist fixes it and resubmits it, or marks it not reportable
 * notReportable  a person closed it as not reportable (nothing more is sent)
 * retracted      a queued charge cancelled before release because its case was amended or retracted
 *                (terminal; a reason code and an audit entry)
 */
export const OUTBOUND_STATES = ['waiting', 'held', 'sent', 'acknowledged', 'failed', 'deadLettered', 'rejected', 'notReportable', 'retracted'] as const;
export type OutboundState = (typeof OUTBOUND_STATES)[number];

/** Where a feed goes, as a fixed id (the screen translates it). */
export type OutboundDestination = 'interfaceEngine' | 'billingSystem' | 'lisPartner' | 'deliveryService' | 'registry';

/** How a feed reaches its receiver, shown as part of the destination label only (the engine owns the transport). */
export const OUTBOUND_TRANSPORTS = ['restMtls', 'sftp', 'portalUpload'] as const;
export type OutboundTransport = (typeof OUTBOUND_TRANSPORTS)[number];

/** Why a rejected message is resubmitted (the retry's reason), and why one is marked not reportable. */
export const RESUBMIT_REASONS = ['dataCorrected', 'codingCorrected', 'pathologistCorrected', 'other'] as const;
export type ResubmitReason = (typeof RESUBMIT_REASONS)[number];
export const NOT_REPORTABLE_REASONS = ['notReportableCondition', 'outsideJurisdiction', 'duplicateSubmission', 'other'] as const;
export type NotReportableReason = (typeof NOT_REPORTABLE_REASONS)[number];

/** Why a queued charge is retracted before release (fixed codes). */
export const RETRACT_REASONS = ['caseAmended', 'caseRetracted', 'duplicateCharge', 'other'] as const;
export type RetractReason = (typeof RETRACT_REASONS)[number];

/** Why a billing item is parked for a person to look at. An amended case's delta charge is always routed to review. */
export const NEEDS_REVIEW_REASONS = ['unmappedCpt', 'missingTechnicalFacility', 'amendmentDelta'] as const;
export type NeedsReviewReason = (typeof NEEDS_REVIEW_REASONS)[number];

/**
 * What only a billing item carries (all optional). The billing feed adapter fills them; the queue shows them and never
 * works them out. scheduledReleaseAt is the delivery schedule's time (evaluateSchedule); overriddenBy is a user id, never a name.
 */
export interface OutboundBillingDetail {
  /** TC technical component, 26 professional component, Global. */
  billingType?: 'TC' | '26' | 'Global';
  scheduledReleaseAt?: string;
  /** Set when staff forced an immediate release ahead of the schedule. */
  overriddenBy?: string;
  needsReview?: NeedsReviewReason;
  /** A delta charge from an amended case. */
  amendmentDelta?: boolean;
  /** Set when the charge was cancelled before release. */
  retraction?: { reasonCode: RetractReason };
}

/** How close a message is to its reporting deadline. Only messages still to be sent or fixed are flagged. */
export type DeadlineFlag = 'ok' | 'dueSoon' | 'overdue';

/** What the receiving registry returned: fixed error codes only (never the registry's message text, which can carry patient data). */
export interface OutboundRejection {
  errorCodes: string[];
  /** Fatal: the registry will not take a resubmission of this message as it is. */
  fatal?: boolean;
  /** When the correction is due back to the registry. */
  correctionDueAt?: string;
}

/** Why a person held a message: quick picks first, a note is optional. */
export const HOLD_REASONS = ['downtime', 'receiverMaintenance', 'dataCheck', 'billingReview', 'duplicateSuspected', 'other'] as const;
export type HoldReason = (typeof HOLD_REASONS)[number];

/** The error codes the queues record (fixed codes, never message text). */
export type OutboundErrorCode =
  | 'MISSING_ICD10' | 'MISSING_PROVIDER_NPI' | 'DISPATCH_TIMEOUT' | 'DISPATCH_REJECTED' | 'DISPATCH_UNREACHABLE';

/** A queue entry as a feed source reports it, before the hold and the case lookup are added. */
export interface OutboundFeedEntry {
  id: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: string;
  lastAttemptAt?: string;
  /** Set when the receiver's acknowledgement came back (via the engine). */
  acknowledgedAt?: string;
  errorCode?: OutboundErrorCode;
  retryCount: number;
  maxRetriesExceeded: boolean;
  /** The case it concerns, when it concerns one. */
  caseId?: string;
  /** When the report was signed out: the reporting deadline counts from here. */
  signedOutAt?: string;
  /** Set when the receiving registry returned it with validation errors (an engine or server acknowledgement). */
  rejection?: OutboundRejection;
  /** An amended report's re-queue names the entry (in the same feed) it amends. */
  amendsId?: string;
  transport?: OutboundTransport;
  billing?: OutboundBillingDetail;
  /** A hold the feed itself keeps (the billing feed holds its own charges). */
  hold?: { reason: HoldReason; note?: string; heldBy: string; heldAt: string };
  /** A short kind label id (e.g. 'finalReport', 'TC'); fixed text, no patient text. */
  kind: string;
}

/** A hold: who stopped the message, when, and why. The note is the person's text and carries no patient detail. */
export interface OutboundHold {
  ref: string;
  /** Set when the message was closed (not reportable, retracted) rather than held. */
  closed?: 'notReportable' | 'retracted';
  /** Set when staff forced an immediate release: the record is the override, not a hold. */
  override?: boolean;
  reason: HoldReason | NotReportableReason | RetractReason;
  note?: string;
  heldBy: string;
  heldAt: string;
}

/** One row on the screen. `ref` is `<feed>:<id>`, unique across feeds. */
export interface OutboundQueueItem {
  ref: string;
  feed: OutboundFeed;
  id: string;
  destination: OutboundDestination;
  kind: string;
  state: OutboundState;
  queuedAt: string;
  /** When it goes: the schedule's time when one applies, otherwise when it was queued (immediate). */
  scheduledFor: string;
  attempts: number;
  errorCode?: OutboundErrorCode;
  /** The accession number: identifies a case, shown with data-phi. */
  accessionNumber?: string;
  facilityId?: string;
  hold?: Pick<OutboundHold, 'reason' | 'note' | 'heldBy' | 'heldAt'>;
  /** Why it was closed as not reportable (state notReportable). */
  closedReason?: NotReportableReason | RetractReason;
  rejection?: OutboundRejection;
  /** Reporting deadline (days from sign-out, from the schedule's deadline setting) and how close it is. */
  deadline?: { dueAt: string; flag: DeadlineFlag };
  /** An amended report's re-queue: the original message it amends. */
  amendsRef?: string;
  /** Shown as part of the destination label only. */
  transport?: OutboundTransport;
  /** Billing items only. */
  billing?: OutboundBillingDetail;
}

export interface OutboundQueueFilter {
  feeds?: readonly OutboundFeed[];
  states?: readonly OutboundState[];
  /** Facility ids; an item with no known facility shows only when this is absent (the enterprise view). */
  facilityIds?: readonly string[];
  /** Matches the accession number (case-insensitive, contains). */
  search?: string;
  /** Only billing items parked for review (unmapped code, missing technical-component facility, amendment delta). */
  needsReview?: boolean;
  /** Only messages with one of these deadline flags. */
  deadlines?: readonly DeadlineFlag[];
}

export type OutboundSortKey = 'scheduledFor' | 'queuedAt' | 'state' | 'feed' | 'attempts' | 'deadline';
export interface OutboundQueueSort { key: OutboundSortKey; direction: 'asc' | 'desc' }

export type OutboundAction = 'hold' | 'release' | 'retry' | 'markNotReportable' | 'retract' | 'overrideRelease';
export type OutboundActionRefusal = 'notPermitted' | 'notFound' | 'notHoldable' | 'notHeld' | 'notRetryable' | 'notRejected' | 'notRetractable' | 'notReleasable' | 'reasonRequired' | 'failed';
export interface OutboundActionResult { ref: string; ok: boolean; refusal?: OutboundActionRefusal }
export type OutboundCounts = Record<OutboundState, number>;
export interface OutboundDeadlineCounts { dueSoon: number; overdue: number }
export interface OutboundBillingCounts { needsReview: number; amendmentDelta: number }
