// src/services/tumorBoard/mockTumorBoardService.ts
import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { shouldNotifyTumorBoardAssignment, notifyTumorBoardAssignment } from './notifyTumorBoardAssignment';
import { isTumorBoardBatchLocked } from './tumorBoardBatchLock';
import { isPresenterEligibleRoles } from './tumorBoardPresenterEligibility';
import { mockTumorBoardBatchSettingsService } from '../tumorBoardRules/mockTumorBoardRuleService';
import { mockUserService } from '../users/mockUserService';
import { demoTumorBoardListings } from './tumorBoardDemoSeed';
import type {
  ITumorBoardService,
  TumorBoardListing,
  TumorBoardListingFilter,
  NewTumorBoardListing,
  TumorBoardListingUpdate,
} from './ITumorBoardService';

// Batch 491: queue management (update) and the clinical dismiss override
// are gated separately, per Pete's confirmed Coordinator-vs-Clinical split
// (Oct 8) — see capabilityCatalog.ts's own case:tumor-board:manage /
// case:tumor-board:dismiss entries.
// Batch 493: update() itself now splits further — status changes need
// case:tumor-board:manage, board/schedule/presenter changes need the new,
// narrower case:tumor-board:schedule — see requiredTumorBoardCapabilitiesFor()
// below and capabilityCatalog.ts's own case:tumor-board:schedule entry.

const STORAGE_KEY = 'tumor_board_listings';

const persist = (data: TumorBoardListing[]) => storageSet(STORAGE_KEY, data);
// Batch 516: nothing stored yet (first run, or after a Full Reset) → the demo
// agenda (tumorBoardDemoSeed.ts), stored at once so its dates stay put.
const load = (): TumorBoardListing[] => {
  const stored = storageGet<TumorBoardListing[] | null>(STORAGE_KEY, null);
  if (stored) return stored;
  const seeded = demoTumorBoardListings();
  persist(seeded);
  return seeded;
};
let LISTINGS: TumorBoardListing[] = load();

const ok  = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

/** Batch 493: pure — which capability (or capabilities) a given set of
 *  update() changes needs. Exported so it's directly testable rather than
 *  only indirectly through update()'s own enforce() calls (CLAUDE.md rule
 *  2). Status (a manual Cancel, Presented, Deferred) needs the broader
 *  case:tumor-board:manage; board/meeting-date/meeting-time/presenter
 *  needs only the narrower case:tumor-board:schedule — the real split
 *  Pete asked for so a clerical/scheduling-only role never needs the
 *  status-change authority. A change touching neither recognized group
 *  (shouldn't happen from a real, type-checked caller) still requires the
 *  broader capability, fail-safe rather than fail-open. */
export function requiredTumorBoardCapabilitiesFor(changes: TumorBoardListingUpdate): Array<'case:tumor-board:manage' | 'case:tumor-board:schedule'> {
  const needsSchedule = changes.board !== undefined || changes.meetingDate !== undefined
    || changes.meetingTime !== undefined || changes.presenterUserId !== undefined || changes.presenterUserName !== undefined;
  const needsManage = changes.status !== undefined;
  const caps: Array<'case:tumor-board:manage' | 'case:tumor-board:schedule'> = [];
  if (needsManage) caps.push('case:tumor-board:manage');
  if (needsSchedule) caps.push('case:tumor-board:schedule');
  return caps.length > 0 ? caps : ['case:tumor-board:manage'];
}

/** Batch 494: the real, server-side half of Pete's own presenter
 *  restriction (Batch 493's "Attending Pathologists, Fellows, and
 *  Residents") — looks the user up and checks their actual roles, rather
 *  than trusting that only an already-filtered dropdown could have sent
 *  this id. A lookup failure (deleted/unknown user) is treated as
 *  ineligible, fail-safe. */
async function presenterIsEligible(userId: string): Promise<boolean> {
  const res = await mockUserService.getById(userId);
  if (!res.ok || !res.data) return false;
  return isPresenterEligibleRoles(res.data.roles);
}

// Batch 494: ServiceResult is a discriminated union (services/types.ts) —
// `.data` only narrows after an explicit `.ok` check, not behind `?? {}`.
// Falls back to the service's own default (never-lock) if the settings
// read itself somehow fails, same fallback create()/update() already
// used before this was pulled out into its own helper.
async function getBatchCutoffHours(): Promise<number> {
  const res = await mockTumorBoardBatchSettingsService.get();
  return res.ok ? res.data.cutoffHours : 0;
}

function matches(l: TumorBoardListing, f?: TumorBoardListingFilter): boolean {
  if (!f) return true;
  if (f.board && l.board !== f.board) return false;
  if (f.status && l.status !== f.status) return false;
  if (f.presenterUserId && l.presenterUserId !== f.presenterUserId) return false;
  if (f.meetingDateFrom && (!l.meetingDate || l.meetingDate < f.meetingDateFrom)) return false;
  if (f.meetingDateTo && (!l.meetingDate || l.meetingDate > f.meetingDateTo)) return false;
  return true;
}

export const mockTumorBoardService: ITumorBoardService = {
  async getAll() {
    await delay();
    return ok([...LISTINGS]);
  },

  async list(filter) {
    await delay();
    return ok(LISTINGS.filter(l => matches(l, filter)));
  },

  async getActiveForCase(caseId: string) {
    await delay();
    // Batch 491: a Dismissed listing is no longer active either — the same
    // as Cancelled, it shouldn't block a later, genuine nomination.
    const active = LISTINGS.find(l => l.caseId === caseId && l.status !== 'Cancelled' && l.status !== 'Dismissed') ?? null;
    return ok(active);
  },

  async create(listing: NewTumorBoardListing, timezone: string = 'UTC') {
    await delay();
    // Batch 489 (CLAUDE.md rule 7): flagging a case for Tumor Board/MDT is
    // a protected action — case:tumor-board:flag, seeded only to the
    // grossing roles (capabilitySeeds.ts), not every case-access role.
    // Batch 491: the rule evaluator's own 'Rule'-sourced create() runs as
    // the signing pathologist, who already holds this (see
    // ITumorBoardService.ts's own create() header).
    const decision = await authorizationService.enforce('case:tumor-board:flag', { caseId: listing.caseId });
    if (!decision.allowed) return err<TumorBoardListing>('notPermitted');
    // Real, enforced rule: at most one ACTIVE (non-Cancelled, non-
    // Dismissed) listing per case at a time — re-flagging a case that
    // already has one updates its board/presenter instead of creating a
    // silent duplicate the workspace would then show twice.
    const existingActive = LISTINGS.find(l => l.caseId === listing.caseId && l.status !== 'Cancelled' && l.status !== 'Dismissed');
    if (existingActive) {
      return err<TumorBoardListing>('activeListingExists');
    }
    // Batch 494 (Pete, Oct 8): FlagForMdtModal now collects a meeting
    // date/time at flag time too (the case enters a batch immediately) —
    // refuse one that's already past its own cut-off, same rule a
    // reschedule via update() is held to below.
    if (listing.meetingDate) {
      const cutoffHours = await getBatchCutoffHours();
      if (isTumorBoardBatchLocked(listing.meetingDate, listing.meetingTime, new Date(), timezone, cutoffHours)) {
        return err<TumorBoardListing>('batchLocked');
      }
    }
    // Batch 494: the rare caller that sets a presenter at creation time
    // (no current caller does — FlagForMdtModal never collects one, and
    // the rule evaluator doesn't either) is held to the same real
    // eligibility check update() enforces below, rather than letting
    // creation be a silent bypass of it.
    if (listing.presenterUserId && !(await presenterIsEligible(listing.presenterUserId))) {
      return err<TumorBoardListing>('presenterNotEligible');
    }
    const now = new Date().toISOString();
    const newListing: TumorBoardListing = {
      id: 'tbl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      caseId: listing.caseId,
      caseAccession: listing.caseAccession,
      board: listing.board,
      meetingDate: listing.meetingDate,
      meetingTime: listing.meetingTime,
      status: 'Pending Presentation',
      presenterUserId: listing.presenterUserId,
      presenterUserName: listing.presenterUserName,
      ...(listing.presenterUserId ? { presenterAssignedAt: now, presenterAssignedByUserId: listing.createdByUserId, presenterAssignedByUserName: listing.createdByUserName } : {}),
      source: listing.source ?? 'Manual',
      triggerReason: listing.triggerReason,
      createdAt: now,
      createdByUserId: listing.createdByUserId,
      createdByUserName: listing.createdByUserName,
      updatedAt: now,
      updatedByUserId: listing.createdByUserId,
      updatedByUserName: listing.createdByUserName,
    };
    LISTINGS = [...LISTINGS, newListing];
    persist(LISTINGS);
    return ok({ ...newListing });
  },

  async update(id: ID, changes: TumorBoardListingUpdate, byUserId: string, byUserName: string, timezone: string = 'UTC') {
    await delay();
    // Batch 491 (CLAUDE.md rule 7): queue management (status — a manual
    // Cancel, Presented, Deferred) is case:tumor-board:manage, separate
    // from the narrow clinical case:tumor-board:dismiss below.
    // Batch 493 (Pete, Oct 8: "a specific permission to schedule these MDT
    // so that an admin assistant can schedule them in advance"): board/
    // meeting-date/meeting-time/presenter is its own, narrower
    // case:tumor-board:schedule — requiredTumorBoardCapabilitiesFor()
    // decides which (either, or both) this particular call's fields need,
    // so a call that only ever sets one group — the real shape every UI
    // handler in TumorBoardWorkspacePage.tsx already uses — is never
    // refused for lacking the OTHER capability too. Both enforce() calls
    // are written out as literal keys (not looped over a variable) so
    // capabilities.guard.test.ts's own static scan — which looks for
    // enforce('<literal-key>') — can still find each one checked.
    const caseId = LISTINGS.find(l => l.id === id)?.caseId;
    const needed = requiredTumorBoardCapabilitiesFor(changes);
    if (needed.includes('case:tumor-board:manage')) {
      const decision = await authorizationService.enforce('case:tumor-board:manage', { caseId });
      if (!decision.allowed) return err<TumorBoardListing>('notPermitted');
    }
    if (needed.includes('case:tumor-board:schedule')) {
      const decision = await authorizationService.enforce('case:tumor-board:schedule', { caseId });
      if (!decision.allowed) return err<TumorBoardListing>('notPermitted');
    }
    // 'Dismissed' always goes through dismiss() — its own reason/audit
    // shape and its own, narrower capability. This shape's own
    // TumorBoardManagedStatus type already excludes it for a caller using
    // real types, but a status still arrives at runtime as a plain string
    // from any caller that isn't type-checked (an older build, a stray
    // cast) — so it's refused here too, not just by the type.
    if ((changes.status as string | undefined) === 'Dismissed') {
      return err<TumorBoardListing>('useDismissInstead');
    }
    const idx = LISTINGS.findIndex(l => l.id === id);
    if (idx === -1) return err<TumorBoardListing>(`Tumor Board listing ${id} not found`);
    const current = LISTINGS[idx];

    // Batch 494: the batch-lock rule applies ONLY to a board/meeting-date/
    // meeting-time change — never to a presenter-only or status-only one,
    // so claiming (or reassigning) a case, or moving it through its
    // status lifecycle, is never blocked by a locked session the way a
    // RESCHEDULE into/within one is. Checked against the resulting
    // (merged) date/time, not just whichever of the three fields this
    // particular call happens to touch.
    const isReschedule = changes.board !== undefined || changes.meetingDate !== undefined || changes.meetingTime !== undefined;
    if (isReschedule) {
      const targetDate = changes.meetingDate !== undefined ? (changes.meetingDate ?? undefined) : current.meetingDate;
      const targetTime = changes.meetingTime !== undefined ? (changes.meetingTime ?? undefined) : current.meetingTime;
      const cutoffHours = await getBatchCutoffHours();
      if (isTumorBoardBatchLocked(targetDate, targetTime, new Date(), timezone, cutoffHours)) {
        return err<TumorBoardListing>('batchLocked');
      }
    }
    // Batch 494: the same real, server-side eligibility check create()
    // now also runs — a presenter being SET (not cleared) must actually
    // be presenter-eligible, whether this is a self-claim or someone
    // assigning a colleague.
    if (changes.presenterUserId && !(await presenterIsEligible(changes.presenterUserId))) {
      return err<TumorBoardListing>('presenterNotEligible');
    }

    const now = new Date().toISOString();
    const presenterIsChanging = changes.presenterUserId !== undefined && changes.presenterUserId !== current.presenterUserId;
    const updated: TumorBoardListing = {
      ...current,
      ...(changes.board !== undefined ? { board: changes.board } : {}),
      ...(changes.meetingDate !== undefined ? { meetingDate: changes.meetingDate ?? undefined } : {}),
      ...(changes.meetingTime !== undefined ? { meetingTime: changes.meetingTime ?? undefined } : {}),
      ...(changes.status !== undefined ? { status: changes.status } : {}),
      ...(changes.presenterUserId !== undefined ? { presenterUserId: changes.presenterUserId ?? undefined } : {}),
      ...(changes.presenterUserName !== undefined ? { presenterUserName: changes.presenterUserName ?? undefined } : {}),
      // Batch 494 (Pete, Oct 8: "logs the timestamp of when the case was
      // claimed and by whom") — stamped only when a presenter is actually
      // being SET to something new (a claim or a reassignment), never on
      // an unrelated edit (a later status change doesn't touch these three).
      ...(presenterIsChanging && changes.presenterUserId
        ? { presenterAssignedAt: now, presenterAssignedByUserId: byUserId, presenterAssignedByUserName: byUserName }
        : {}),
      updatedAt: now,
      updatedByUserId: byUserId,
      updatedByUserName: byUserName,
    };
    LISTINGS = LISTINGS.map(l => l.id === id ? updated : l);
    persist(LISTINGS);
    // Batch 493 (Pete, Oct 8): "If I assign a future date for a tumor
    // board, I'd want a message, and can we send out an appointment to
    // their calendar?" Fire-and-forget, same pattern as
    // runMarginRuleEvaluation.ts at sign-out — never blocks or fails this
    // save. shouldNotifyTumorBoardAssignment() is the single, pure,
    // reused decision of WHEN (also called by useTumorBoardWorkspace.ts
    // for its own "Notified" toast).
    if (shouldNotifyTumorBoardAssignment(current, updated, new Date(), timezone)) {
      void notifyTumorBoardAssignment(updated, byUserId, byUserName, timezone);
    }
    return ok({ ...updated });
  },

  async dismiss(id: ID, reason: string, byUserId: string, byUserName: string) {
    await delay();
    const idx = LISTINGS.findIndex(l => l.id === id);
    if (idx === -1) return err<TumorBoardListing>(`Tumor Board listing ${id} not found`);
    // Batch 491 (CLAUDE.md rule 7; Pete, Oct 8): overriding a flag is the
    // clinical judgment call — never case:tumor-board:manage.
    const decision = await authorizationService.enforce('case:tumor-board:dismiss', { caseId: LISTINGS[idx].caseId });
    if (!decision.allowed) return err<TumorBoardListing>('notPermitted');
    if (!reason.trim()) return err<TumorBoardListing>('reasonRequired');
    const now = new Date().toISOString();
    const updated: TumorBoardListing = {
      ...LISTINGS[idx],
      status: 'Dismissed',
      dismissReason: reason.trim(),
      dismissedByUserId: byUserId,
      dismissedByUserName: byUserName,
      dismissedAt: now,
      updatedAt: now,
      updatedByUserId: byUserId,
      updatedByUserName: byUserName,
    };
    LISTINGS = LISTINGS.map(l => l.id === id ? updated : l);
    persist(LISTINGS);
    return ok({ ...updated });
  },
};
