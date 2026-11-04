// src/services/followUp/followUpActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 454: the protected follow-up actions. Each checks its capability
// first and stops on a refusal (standing rule 7):
//   markFollowUpExpected        case:follow-up:expect        (at surgical sign-out)
//   recordFollowUpDisposition   qa:follow-up:record          (the lab closes one)
//   reopenFollowUp              qa:follow-up:record
//   emailOrderingClinician      qa:follow-up-clinician:email (followUpClinicianEmail.ts)
// Audit detail text is literal English (audit records are compliance
// artifacts) and names no patient: the accession goes in the caseId field.
// ─────────────────────────────────────────────────────────────────────────────

import { resolveCorrelationWindow, type EffectiveCorrelationRule } from '../cytology/cytologyHistologyCorrelationWindow';
import type { IFollowUpStore } from './followUpStore';
import { followUpAnchorSpecimen, type FollowUpCaseInfo } from './followUpTracking';
import {
  FOLLOW_UP_DISPOSITIONS, emptyFollowUpRecord,
  type FollowUpDisposition, type FollowUpExpectation, type FollowUpRecord,
} from './followUpTypes';

export const MAX_FOLLOW_UP_NOTE = 1000;

export interface FollowUpActionDeps {
  enforce: (capability: string, context?: { caseId?: string | null; facilityId?: string | null }) => Promise<{ allowed: boolean }>;
  store: IFollowUpStore;
  now: () => Date;
  logAudit: (event: { type: 'user' | 'system'; event: string; detail: string; user: string; caseId: string | null; confidence: null; facilityId?: string | null }) => Promise<unknown>;
}

export type FollowUpActionResult<T = void> = { ok: true; data: T } | { ok: false; reason: string };

export interface FollowUpUser { id: string; name: string }

/** Marks a signed-out surgical case "follow-up expected". The window is the
 *  facility's biopsy-to-resection rule, from the case's earliest surgical
 *  specimen. Marking it again replaces the earlier mark. */
export async function markFollowUpExpected(
  input: { caseInfo: FollowUpCaseInfo; signedOutAt: string; rule: EffectiveCorrelationRule; user: FollowUpUser; afterSignOut?: boolean },
  deps: FollowUpActionDeps,
): Promise<FollowUpActionResult<FollowUpExpectation>> {
  const { caseInfo, user } = input;
  const decision = await deps.enforce('case:follow-up:expect', { caseId: caseInfo.id, facilityId: caseInfo.facilityId ?? null });
  if (!decision.allowed) return { ok: false, reason: 'notPermitted' };
  const anchor = followUpAnchorSpecimen(caseInfo.specimens);
  if (!anchor) return { ok: false, reason: 'noSurgicalSpecimen' };
  const window = resolveCorrelationWindow(anchor, input.signedOutAt, input.rule);
  if (!window) return { ok: false, reason: 'noDate' };
  const expectation: FollowUpExpectation = {
    id: `fue-${caseInfo.id}`,
    caseId: caseInfo.id,
    specimenId: anchor.id,
    window,
    markedBy: user.id,
    markedByName: user.name,
    markedAt: deps.now().toISOString(),
    ...(input.afterSignOut ? { markedAfterSignOut: true as const } : {}),
  };
  await deps.store.saveExpectation(expectation);
  await deps.logAudit({
    type: 'user', event: 'followup.expected_marked',
    detail: `Follow-up specimen expected; due ${window.endsAt.slice(0, 10)} (${window.windowDays} days from ${window.anchorUsed})${input.afterSignOut ? '; marked after sign-out' : ''}`,
    user: user.id, caseId: caseInfo.accession, confidence: null, facilityId: caseInfo.facilityId ?? null,
  }).catch(() => undefined);
  return { ok: true, data: expectation };
}

/** The message for a mark that didn't land. */
export function followUpMarkFailureKey(reason: string): 'notPermitted' | 'noDate' | 'noSurgicalSpecimen' | 'failed' {
  return reason === 'notPermitted' || reason === 'noDate' || reason === 'noSurgicalSpecimen' ? reason : 'failed';
}

async function recordFor(store: IFollowUpStore, key: string): Promise<FollowUpRecord> {
  return (await store.getRecords()).find(r => r.key === key) ?? emptyFollowUpRecord(key);
}

/** The first problem with a disposition, or null. */
export function dispositionProblem(value: string, note: string | undefined): string | null {
  if (!(FOLLOW_UP_DISPOSITIONS as readonly string[]).includes(value)) return 'unknownDisposition';
  if (value === 'other' && !note?.trim()) return 'noteRequired';
  if ((note ?? '').length > MAX_FOLLOW_UP_NOTE) return 'noteTooLong';
  return null;
}

/** Records what happened to a follow-up, which closes it. */
export async function recordFollowUpDisposition(
  input: { key: string; caseId: string; accession: string; facilityId?: string; value: FollowUpDisposition; note?: string; user: FollowUpUser },
  deps: FollowUpActionDeps,
): Promise<FollowUpActionResult<FollowUpRecord>> {
  const decision = await deps.enforce('qa:follow-up:record', { caseId: input.caseId, facilityId: input.facilityId ?? null });
  if (!decision.allowed) return { ok: false, reason: 'notPermitted' };
  const problem = dispositionProblem(input.value, input.note);
  if (problem) return { ok: false, reason: problem };
  const record: FollowUpRecord = {
    ...(await recordFor(deps.store, input.key)),
    disposition: {
      value: input.value,
      note: input.note?.trim() || undefined,
      recordedBy: input.user.id,
      recordedByName: input.user.name,
      recordedAt: deps.now().toISOString(),
    },
  };
  await deps.store.saveRecord(record);
  await deps.logAudit({
    type: 'user', event: 'followup.disposition_recorded', detail: `Follow-up closed: ${input.value}`,
    user: input.user.id, caseId: input.accession, confidence: null, facilityId: input.facilityId ?? null,
  }).catch(() => undefined);
  return { ok: true, data: record };
}

/** Removes a disposition, so the follow-up is tracked again. */
export async function reopenFollowUp(
  input: { key: string; caseId: string; accession: string; facilityId?: string; user: FollowUpUser },
  deps: FollowUpActionDeps,
): Promise<FollowUpActionResult<FollowUpRecord>> {
  const decision = await deps.enforce('qa:follow-up:record', { caseId: input.caseId, facilityId: input.facilityId ?? null });
  if (!decision.allowed) return { ok: false, reason: 'notPermitted' };
  const current = await recordFor(deps.store, input.key);
  if (!current.disposition) return { ok: true, data: current };
  const { disposition: previous, ...rest } = current;
  const record: FollowUpRecord = { ...rest };
  await deps.store.saveRecord(record);
  await deps.logAudit({
    type: 'user', event: 'followup.reopened', detail: `Follow-up reopened (was ${previous.value})`,
    user: input.user.id, caseId: input.accession, confidence: null, facilityId: input.facilityId ?? null,
  }).catch(() => undefined);
  return { ok: true, data: record };
}

/** Notes that an internal alert went out (system bookkeeping, no capability:
 *  nobody does this; the alert sweep does). */
export async function noteFollowUpAlertSent(key: string, level: 'dueSoon' | 'overdue', at: Date, store: IFollowUpStore): Promise<void> {
  const record = await recordFor(store, key);
  await store.saveRecord({ ...record, alertsSent: { ...record.alertsSent, [level]: at.toISOString() } });
}

/**
 * Batch 459 (Pete: "a follow-up can't be marked 'expected' after sign-out").
 * What the report page offers for a case: nothing (not signed out, or no
 * surgical specimen to anchor the window), the mark, or the existing mark.
 * The permission is checked when marking (markFollowUpExpected).
 */
export type FollowUpMarkOffer = { kind: 'none' } | { kind: 'offer' } | { kind: 'marked'; expectation: FollowUpExpectation };

export function followUpMarkOffer(input: { status: string | undefined; caseInfo: FollowUpCaseInfo; expectation: FollowUpExpectation | null }): FollowUpMarkOffer {
  if (input.expectation) return { kind: 'marked', expectation: input.expectation };
  if (input.status !== 'finalized' && input.status !== 'closed') return { kind: 'none' };
  if (!followUpAnchorSpecimen(input.caseInfo.specimens)) return { kind: 'none' };
  return { kind: 'offer' };
}
