// src/services/billingRelease/billingRelease.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): billing release rules. A charge is GENERATED when its clinical milestone is
// reached (the Billing Type Trigger setting: technical at grossing, professional -26 and Global at
// final sign-out, PS-336). This file decides when a generated charge is RELEASED from the Outbound
// Queue to the billing interface. The performing laboratory controls that, per billing type, and can
// change it for a facility or for one kind of case. Everything here is pure: no storage, no clock
// (callers pass `now`), no patient data. Timing reuses the Delivery Schedules engine.
//
//   enterprise default  ->  performing-facility override  ->  built-in default
//   release mode DYNAMIC_WITH_HOLD   goes `holdDurationMinutes` after its milestone (0 = at once)
//   release mode SCHEDULED_BATCH     goes in the next batch run of the rule's batch schedule
//   autoReleaseOnComplete false      never goes on its own; a person releases it from the queue
//   manualReviewRequired             an unmapped CPT code or a missing technical-component facility
//                                    parks the charge for review (an amendment's delta charge always does)
//
// Contract: docs/architecture/BILLING_RELEASE_API.md
// ─────────────────────────────────────────────────────────────────────────────
import type { ID } from '../types';
import { IMMEDIATE_SCHEDULE, evaluateSchedule, validateSchedule, type DeliverySchedule, type ScheduleProblem } from '../deliverySchedules/deliverySchedule';
import type { NeedsReviewReason } from '../outboundQueue/outboundQueueTypes';

export const BILLING_TYPES = ['TC', '26', 'Global'] as const;
export type BillingType = typeof BILLING_TYPES[number];
export const RELEASE_MODES = ['DYNAMIC_WITH_HOLD', 'SCHEDULED_BATCH'] as const;
export type ReleaseMode = typeof RELEASE_MODES[number];
export const AMENDMENT_FLAGS = ['any', 'original', 'amended'] as const;
export type AmendmentFlag = typeof AMENDMENT_FLAGS[number];
/** The release states a billing charge shows in the Outbound Queue. */
export type ReleaseStatus = 'QUEUED' | 'HELD' | 'RELEASED' | 'RETRACTED' | 'FAILED';

export const MAX_HOLD_MINUTES = 30 * 24 * 60;

/** What a rule applies to. null / empty means "any". */
export interface BillingReleaseCriteria {
  billingType: BillingType | null;
  /** Specimen category / case type ids (e.g. 'surgical', 'cytology'). Empty = every kind of case. */
  caseTypes: string[];
  orderingSiteId: ID | null;
  primaryPathologistId: ID | null;
  amendment: AmendmentFlag;
}

export interface BillingReleaseAction {
  releaseMode: ReleaseMode;
  /** DYNAMIC_WITH_HOLD: minutes after the milestone before the charge goes. 0 = at once. */
  holdDurationMinutes: number;
  /** SCHEDULED_BATCH: the batch (kind 'batch' of a delivery schedule); null otherwise. */
  batchSchedule: DeliverySchedule | null;
  /** false = the charge waits for a person to release it. */
  autoReleaseOnComplete: boolean;
  /** An unmapped CPT code or a missing technical-component facility parks the charge for review. */
  manualReviewRequired: boolean;
}

/** One stored rule: at the enterprise (facilityId null) or as one performing facility's own. */
export interface BillingReleaseRule {
  id: ID;
  /** The performing facility this rule belongs to; null = the enterprise default. */
  facilityId: ID | null;
  criteria: BillingReleaseCriteria;
  action: BillingReleaseAction;
  updatedAt: string;
}
export interface BillingReleaseRuleInput { id?: ID; facilityId: ID | null; criteria: BillingReleaseCriteria; action: BillingReleaseAction }

/** The spec's per-site, per-billing-type release schedule (a view of one rule). */
export interface BillingReleaseSchedule {
  siteId: ID | null;
  billingType: BillingType | null;
  releaseMode: ReleaseMode;
  holdDurationMinutes: number;
  /** Simple daily or weekly batches as a cron line ("m h * * d"); '' when the batch can't be written as one. */
  batchScheduleCron: string;
}

export const ANY_CRITERIA: BillingReleaseCriteria = { billingType: null, caseTypes: [], orderingSiteId: null, primaryPathologistId: null, amendment: 'any' };
export const DEFAULT_ACTION: BillingReleaseAction = { releaseMode: 'DYNAMIC_WITH_HOLD', holdDurationMinutes: 0, batchSchedule: null, autoReleaseOnComplete: true, manualReviewRequired: true };

/**
 * What happens when no rule matches: the charge goes at its milestone (technical charge at grossing, professional
 * and Global at final sign-out). All of it can be changed by a rule.
 */
export const BUILT_IN_ACTION: BillingReleaseAction = DEFAULT_ACTION;

export type ReleaseRuleProblem = 'billingTypeInvalid' | 'modeInvalid' | 'holdInvalid' | 'batchRequired' | 'batchInvalid' | 'amendmentInvalid' | 'caseTypesInvalid';

export function validateRule(r: BillingReleaseRuleInput): (ReleaseRuleProblem | ScheduleProblem)[] {
  const out: (ReleaseRuleProblem | ScheduleProblem)[] = [];
  const { criteria: c, action: a } = r;
  if (c.billingType !== null && !BILLING_TYPES.includes(c.billingType)) out.push('billingTypeInvalid');
  if (!AMENDMENT_FLAGS.includes(c.amendment)) out.push('amendmentInvalid');
  if (!Array.isArray(c.caseTypes) || c.caseTypes.some(x => typeof x !== 'string' || !x.trim())) out.push('caseTypesInvalid');
  if (!RELEASE_MODES.includes(a.releaseMode)) out.push('modeInvalid');
  if (!Number.isInteger(a.holdDurationMinutes) || a.holdDurationMinutes < 0 || a.holdDurationMinutes > MAX_HOLD_MINUTES) out.push('holdInvalid');
  if (a.releaseMode === 'SCHEDULED_BATCH') {
    if (!a.batchSchedule || a.batchSchedule.kind !== 'batch') out.push('batchRequired');
    else out.push(...validateSchedule(a.batchSchedule));
  }
  return out;
}

// ── Cron view ────────────────────────────────────────────────────────────────

/** A batch as the spec's cron line, when it is a plain daily or weekly batch at one time; '' otherwise. */
export function batchToCron(s: DeliverySchedule | null): string {
  if (!s || s.kind !== 'batch' || s.batchTimes.length !== 1 || s.batchFrequency === 'monthly') return '';
  const [h, m] = s.batchTimes[0].split(':').map(Number);
  const dow = s.batchFrequency === 'daily' ? '*' : [...s.batchDays].sort((a, b) => a - b).join(',');
  return `${m} ${h} * * ${dow}`;
}

export const toReleaseSchedule = (r: BillingReleaseRule): BillingReleaseSchedule => ({
  siteId: r.facilityId, billingType: r.criteria.billingType, releaseMode: r.action.releaseMode,
  holdDurationMinutes: r.action.holdDurationMinutes, batchScheduleCron: batchToCron(r.action.batchSchedule),
});

// ── Matching ─────────────────────────────────────────────────────────────────

/** What the rules need to know about one charge. The service that supplies them reads them from the case and the ledger. */
export interface BillingChargeFacts {
  billingType: BillingType;
  caseType?: string;
  performingFacilityId?: ID;
  orderingSiteId?: ID;
  primaryPathologistId?: ID;
  /** The charge belongs to an amended report. */
  amended: boolean;
  /** The charge is a delta charge produced by an amendment. */
  amendmentDelta: boolean;
  cptMapped: boolean;
  /** A split case whose technical-component facility was not recorded. */
  technicalFacilityMissing: boolean;
  /** When the charge was generated (its milestone: grossing for technical, sign-out for the rest, as configured). */
  generatedAt: string;
  /** Final sign-out of the case; absent until then. */
  signedOutAt?: string;
}

const matches = (c: BillingReleaseCriteria, f: BillingChargeFacts): boolean =>
  (c.billingType === null || c.billingType === f.billingType)
  && (c.caseTypes.length === 0 || (f.caseType !== undefined && c.caseTypes.includes(f.caseType)))
  && (c.orderingSiteId === null || c.orderingSiteId === f.orderingSiteId)
  && (c.primaryPathologistId === null || c.primaryPathologistId === f.primaryPathologistId)
  && (c.amendment === 'any' || (c.amendment === 'amended') === f.amended);

/** The more a rule says, the more specific it is; a facility's own rule outranks any enterprise rule. */
const specificity = (r: BillingReleaseRule): number =>
  (r.facilityId ? 100 : 0) + (r.criteria.billingType ? 8 : 0) + (r.criteria.caseTypes.length ? 4 : 0) + (r.criteria.orderingSiteId ? 4 : 0)
  + (r.criteria.primaryPathologistId ? 2 : 0) + (r.criteria.amendment !== 'any' ? 1 : 0);

export type ReleaseRuleSource = 'facility' | 'enterprise' | 'default';
export interface ResolvedReleaseRule { action: BillingReleaseAction; source: ReleaseRuleSource; rule: BillingReleaseRule | null }

export function resolveReleaseRule(rules: BillingReleaseRule[], f: BillingChargeFacts): ResolvedReleaseRule {
  const hit = rules
    .filter(r => (r.facilityId === null || r.facilityId === f.performingFacilityId) && matches(r.criteria, f))
    .sort((a, b) => specificity(b) - specificity(a) || a.id.localeCompare(b.id))[0];
  return hit ? { action: hit.action, source: hit.facilityId ? 'facility' : 'enterprise', rule: hit } : { action: BUILT_IN_ACTION, source: 'default', rule: null };
}

// ── Decision ─────────────────────────────────────────────────────────────────

export type ReleaseReason = 'due' | 'holdWindow' | 'batchWaiting' | 'awaitingSignOut' | 'manualRelease' | 'review';
export interface ReleaseDecision {
  /** due: goes on the next sweep. waiting: not yet. review/manual: needs a person. */
  state: 'due' | 'waiting' | 'review' | 'manual';
  reason: ReleaseReason;
  /** When it goes (absent when it waits for a person or for sign-out). */
  scheduledReleaseAt?: string;
  needsReview?: NeedsReviewReason;
  source: ReleaseRuleSource;
  ruleId: ID | null;
}

/** Why a charge is parked for a person, if it is. A delta charge from an amendment always is. */
export function reviewReasonFor(f: BillingChargeFacts, a: BillingReleaseAction): NeedsReviewReason | undefined {
  if (f.amendmentDelta) return 'amendmentDelta';
  if (!a.manualReviewRequired) return undefined;
  if (!f.cptMapped) return 'unmappedCpt';
  if (f.technicalFacilityMissing) return 'missingTechnicalFacility';
  return undefined;
}

export function decideRelease(rules: BillingReleaseRule[], f: BillingChargeFacts, now: Date, lastBatchRunAt?: string | null): ReleaseDecision {
  const { action: a, source, rule } = resolveReleaseRule(rules, f);
  const base = { source, ruleId: rule?.id ?? null };
  const needsReview = reviewReasonFor(f, a);
  if (needsReview) return { ...base, state: 'review', reason: 'review', needsReview };
  if (!a.autoReleaseOnComplete) return { ...base, state: 'manual', reason: 'manualRelease' };
  // Technical charges go from their own milestone; the others wait for final sign-out.
  const from = f.billingType === 'TC' ? f.generatedAt : f.signedOutAt;
  if (!from) return { ...base, state: 'waiting', reason: 'awaitingSignOut' };
  if (a.releaseMode === 'SCHEDULED_BATCH' && a.batchSchedule) {
    const d = evaluateSchedule(a.batchSchedule, now, { signedOutAt: from, lastRunAt: lastBatchRunAt ?? null });
    return d.canSendNow ? { ...base, state: 'due', reason: 'due', scheduledReleaseAt: d.nextDueAt ?? now.toISOString() }
      : { ...base, state: 'waiting', reason: 'batchWaiting', ...(d.nextDueAt ? { scheduledReleaseAt: d.nextDueAt } : {}) };
  }
  if (a.holdDurationMinutes === 0) return { ...base, state: 'due', reason: 'due', scheduledReleaseAt: from };
  const d = evaluateSchedule({ ...IMMEDIATE_SCHEDULE, kind: 'review_hold', reviewHoldMinutes: a.holdDurationMinutes }, now, { signedOutAt: from });
  return d.canSendNow ? { ...base, state: 'due', reason: 'due', scheduledReleaseAt: d.nextDueAt ?? from }
    : { ...base, state: 'waiting', reason: 'holdWindow', ...(d.nextDueAt ? { scheduledReleaseAt: d.nextDueAt } : {}) };
}

/** The release status a charge shows, from the charge queue's own status and the decision. */
export function releaseStatusFor(queueStatus: 'QUEUED' | 'SENT' | 'FAILED', retracted: boolean, decision: ReleaseDecision, overridden = false): ReleaseStatus {
  if (retracted) return 'RETRACTED';
  if (queueStatus === 'SENT') return 'RELEASED';
  if (queueStatus === 'FAILED') return 'FAILED';
  if (overridden) return 'QUEUED';
  return decision.state === 'due' ? 'QUEUED' : 'HELD';
}

// ── Amendment and retraction ─────────────────────────────────────────────────

export interface QueuedChargeRef { id: string; caseId?: string; status: 'QUEUED' | 'SENT' | 'FAILED'; retracted?: boolean }
export interface AmendmentPlan {
  /** Charges still in the queue (not sent) for the case: cancel these. */
  retract: string[];
  /** Charges already sent: the correction is a credit and a new charge (the existing credit flow), and the new charge is a delta routed to review. */
  alreadySent: string[];
}
/** What an amendment or retraction does to the case's charges: unsent ones are retracted, sent ones are left to the credit flow. */
export function planAmendment(caseId: string, charges: QueuedChargeRef[]): AmendmentPlan {
  const mine = charges.filter(c => c.caseId === caseId && !c.retracted);
  return { retract: mine.filter(c => c.status !== 'SENT').map(c => c.id), alreadySent: mine.filter(c => c.status === 'SENT').map(c => c.id) };
}

// ── Seed ─────────────────────────────────────────────────────────────────────

/** The enterprise starts with the three documented defaults, each editable: technical not held, professional and Global held until final sign-out. */
export const seedRules = (at: string): BillingReleaseRule[] => BILLING_TYPES.map(billingType => ({
  id: `brr-ent-${billingType}`, facilityId: null, criteria: { ...ANY_CRITERIA, billingType }, action: { ...DEFAULT_ACTION }, updatedAt: at,
}));
