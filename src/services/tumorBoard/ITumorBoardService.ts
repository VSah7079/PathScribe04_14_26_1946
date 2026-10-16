// src/services/tumorBoard/ITumorBoardService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 489 (Module 1 of Pete's Tumor Board / MDT Workspace spec; PS-359
// follow-up). Pete: "MDT/Tumor Board rises to the new feature level."
//
// The real, confirmed gap this closes: this app already has a generic
// 'Tumor Board Scheduled' flag (services/flags/mockFlagService.ts, id
// 'f5') plus three board-specific ones (Thyroid/Urology/Melanoma MDT),
// and a live but unrelated-shaped DelegationType 'TUMOR_BOARD'
// (services/delegationTypes/) that DelegateModal.tsx forces through its
// generic "pick a person or pool to hand this off to" flow — neither one
// carries board/schedule/status as real, structured fields; a board name
// and a meeting time only ever existed baked into a flag's free-text
// `name` (e.g. "Thoracic MDT — Fri 09:00", confirmed in demo seed data).
// This is the real, dedicated record Pete's spec asks for instead: WHICH
// board, WHEN the meeting is, WHO presents, and WHERE the case stands in
// that board's own worklist — queryable and filterable, not parsed out
// of a string.
//
// Deliberately NOT built on the generic Flag system (FlagInstance/
// caseFlagsApi.ts): that file's applyFlags()/deleteFlags() hardcode
// 'current-user' for appliedBy/deletedBy (a real, separate, pre-existing
// gap — disclosed, not fixed here; it affects every flag in the app, not
// just this one) and carry no fields for board/schedule/status at all.
// Also deliberately NOT built on IDelegationService: a delegation's own
// DelegationRequest always requires a `recipient` (a specific user or
// pool) — real and correct for a hand-off, but a board isn't a person or
// a queue, and forcing one through that shape is exactly the awkward fit
// DelegateModal.tsx's own existing 'TUMOR_BOARD' delegation type already
// shows today. This is a new, small, purpose-built record instead.
//
// Scope, Module 1 only (manual nomination + the dedicated workspace):
//   - board: a closed set of 4 real board names, per Pete's own spec
//     ("Breast MDT, GI MDT, Thoracic MDM, Gyn-Onc"). A fixed list for
//     now, same pattern as BatchProcessingNode — becomes an
//     admin-configurable dictionary later if Pete asks for one.
//   - status: 'Pending Presentation' default (Pete's own spec), plus
//     'Presented', 'Deferred', 'Cancelled' — a real lifecycle, not just
//     a boolean flagged/unflagged.
//   - Auto-flagging (the rules engine) and read-only Case Presentation
//     View are later modules — this file only records a MANUAL
//     nomination, per Pete's own explicit sequencing.
//
// Shape note (added after Pete's auto-flagging value-driver pitch, before
// the engine itself is built): three fields below exist now so Module
// 1's shape doesn't need a breaking change once the rules engine lands —
// `source`, `triggerReason`, the `'Dismissed'` status and its
// `dismiss*` fields. Nothing in Module 1 writes `source: 'Rule'` yet;
// every listing created by this module's manual "Flag for MDT" action
// is `source: 'Manual'`. Cheaper to add the columns now than migrate
// stored listings later:
//   - `source: 'Manual' | 'Rule'` — who/what created the listing, so the
//     workspace can show provenance and QA can tell nominated from
//     auto-flagged cases apart.
//   - `triggerReason?: string` — a short, human-readable rendering of
//     which rule(s) fired and on what values (Pete's own example:
//     "Flagged for MDT: Invasive Ductal Carcinoma, ER Negative, Margin
//     < 1mm"), for the transparent-audit-trail driver. Unset for manual
//     listings; the engine module populates it from the structured
//     `reportingRole`-tagged fields and matched option values it used.
//   - `'Dismissed'` status + `dismissReason`/`dismissedByUserId/Name` —
//     the one-click, reasoned override the "curated agenda" driver
//     needs, kept distinct from a human un-nominating a case
//     (`'Cancelled'`): a dismissal is a judgment call on an
//     auto-generated flag and needs its own reason on the audit trail;
//     a cancellation is just retracting a manual nomination.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';

/** The 4 real MDT boards this org runs, per Pete's own spec. Fixed set,
 *  not free text — same reasoning as BATCH_PROCESSING_NODES: downstream
 *  filtering (the workspace's own Board Selection filter) depends on a
 *  closed, known vocabulary, not whatever a user happened to type. */
export const TUMOR_BOARD_NAMES = ['Breast MDT', 'GI MDT', 'Thoracic MDM', 'Gyn-Onc'] as const;
export type TumorBoardName = typeof TUMOR_BOARD_NAMES[number];

/** Pete's own spec: "Case Status (Pending Presentation default)." A real
 *  lifecycle a listing moves through, not a single boolean. 'Dismissed'
 *  added for the auto-flagging override driver — see the Shape note
 *  above; Module 1 never sets it, since nothing here creates
 *  rule-sourced listings yet, but the status exists so the engine
 *  module doesn't need a breaking change. */
export const TUMOR_BOARD_CASE_STATUSES = ['Pending Presentation', 'Presented', 'Deferred', 'Cancelled', 'Dismissed'] as const;
export type TumorBoardCaseStatus = typeof TUMOR_BOARD_CASE_STATUSES[number];

/** Who/what created the listing — Module 1 only ever writes 'Manual'
 *  (the "Flag for MDT" action). 'Rule' is reserved for the later
 *  auto-flagging engine module. */
export const TUMOR_BOARD_SOURCES = ['Manual', 'Rule'] as const;
export type TumorBoardSource = typeof TUMOR_BOARD_SOURCES[number];

export interface TumorBoardListing {
  id: ID;
  caseId: string;
  /** Denormalized at creation time purely for display without a second
   *  case lookup on every row of the workspace's own list — the real
   *  case is still the source of truth for everything else (patient
   *  name, diagnosis); this is never read back as authoritative. */
  caseAccession: string;
  board: TumorBoardName;
  /** Unset until someone schedules it from the workspace — a case can be
   *  flagged for a board before a specific meeting slot is assigned. */
  meetingDate?: string;
  /** Batch 493: 'HH:mm', facility-local, same convention as every other
   *  facility-time field in this app (see utils/facilityTime.ts) — never
   *  the viewing device's own local time. Optional: a meeting can be
   *  scheduled by date alone (shows as an all-day event on the calendar
   *  invite below); set once a specific slot is known. */
  meetingTime?: string;
  status: TumorBoardCaseStatus;
  presenterUserId?: string;
  presenterUserName?: string;
  /** Batch 494 (Pete, Oct 8, the MDT Self-Service Assignment & Batching
   *  redesign: "PathScribe logs the timestamp of when the case was
   *  claimed and by whom"). Distinct from updatedAt/updatedByUser* below,
   *  which move on ANY field edit (a status change, say) — these three
   *  are set ONLY when presenterUserId transitions to a new, non-null
   *  value (a self-claim or an admin-assist assignment alike; the acting
   *  user is whoever called update(), not necessarily the presenter
   *  themselves), so "when was this actually claimed, by whom" survives
   *  later, unrelated edits instead of being overwritten by them. */
  presenterAssignedAt?: string;
  presenterAssignedByUserId?: string;
  presenterAssignedByUserName?: string;
  /** Batch 491 (the auto-flagging rules engine, tumorBoardRules/): who/what
   *  created this listing. The Module-1 header comment above described
   *  these fields as already existing "so Module 1's shape doesn't need a
   *  breaking change" — they were not, in fact, on this interface yet; a
   *  real gap, caught and fixed here (CLAUDE.md rule 6) rather than
   *  carried forward a second time. Every listing created by
   *  FlagForMdtModal's manual action is 'Manual'; the rule evaluator
   *  (services/tumorBoardRules/runMarginRuleEvaluation.ts) writes 'Rule'. */
  source: TumorBoardSource;
  /** Set only for source: 'Rule' — a short, human-readable rendering of
   *  which rule fired and on what value (e.g. "Margin: Distance to
   *  closest margin < 1mm (0.6mm)"). Unset for manual listings. */
  triggerReason?: string;
  /** Set only when status is 'Dismissed' — the clinical override reason
   *  (case:tumor-board:dismiss), kept distinct from a manual nomination's
   *  'Cancelled' (which needs no reason). */
  dismissReason?: string;
  dismissedByUserId?: string;
  dismissedByUserName?: string;
  dismissedAt?: string;
  /** Real audit fields — who actually nominated this case and when,
   *  never inferred or hardcoded (the real, disclosed gap in
   *  caseFlagsApi.ts's own appliedBy, named above, is exactly what this
   *  file does NOT repeat). */
  createdAt: string;
  createdByUserId: string;
  createdByUserName: string;
  updatedAt: string;
  updatedByUserId: string;
  updatedByUserName: string;
}

export interface TumorBoardListingFilter {
  board?: TumorBoardName;
  status?: TumorBoardCaseStatus;
  presenterUserId?: string;
  /** Meeting date window, inclusive, both ends optional — the
   *  workspace's own "Meeting Window" filter (Today/This Week/This
   *  Month/All presets resolve to a concrete range before calling this). */
  meetingDateFrom?: string;
  meetingDateTo?: string;
}

export interface NewTumorBoardListing {
  caseId: string;
  caseAccession: string;
  board: TumorBoardName;
  meetingDate?: string;
  meetingTime?: string;
  presenterUserId?: string;
  presenterUserName?: string;
  createdByUserId: string;
  createdByUserName: string;
  /** Defaults to 'Manual' when omitted — every existing caller
   *  (FlagForMdtModal) relies on that default and doesn't pass this. */
  source?: TumorBoardSource;
  triggerReason?: string;
}

/** Batch 491: 'Dismissed' is deliberately not a valid value here — it has
 *  its own reason/audit shape and its own narrower capability
 *  (case:tumor-board:dismiss), so it goes through dismiss() below, never
 *  through this generic update(). mockTumorBoardService.update() refuses
 *  a status of 'Dismissed' passed through this shape. */
export type TumorBoardManagedStatus = Exclude<TumorBoardCaseStatus, 'Dismissed'>;

export interface TumorBoardListingUpdate {
  board?: TumorBoardName;
  meetingDate?: string | null;
  meetingTime?: string | null;
  status?: TumorBoardManagedStatus;
  presenterUserId?: string | null;
  presenterUserName?: string | null;
}

export interface ITumorBoardService {
  getAll(): Promise<ServiceResult<TumorBoardListing[]>>;
  /** Filtered server-side (the mock applies the same filter in memory) so
   *  a real backend can page/filter without shipping the whole table. */
  list(filter?: TumorBoardListingFilter): Promise<ServiceResult<TumorBoardListing[]>>;
  /** The case's own current listing, if any — a case may be nominated to
   *  more than one board over time, but at most one ACTIVE (non-
   *  Cancelled, non-Dismissed) listing per case at once; see
   *  mockTumorBoardService's own create() for that real, enforced rule. */
  getActiveForCase(caseId: string): Promise<ServiceResult<TumorBoardListing | null>>;
  /** Protected (case:tumor-board:flag). Batch 491: the rule evaluator also
   *  calls this, with source: 'Rule', at the signing pathologist's own
   *  sign-out — the same roles that can sign out a surgical case
   *  (Pathologist, Fellow, Resident, PA) already hold this capability, so
   *  no separate bypass is needed; see runMarginRuleEvaluation.ts.
   *  Batch 494 (the MDT Self-Service Assignment & Batching redesign):
   *  FlagForMdtModal now collects meetingDate/meetingTime at flag time too
   *  (Pete: a case is "tagged... and assigned a date and time slot" up
   *  front, with the PHYSICIAN assignment left null until someone claims
   *  it later) — so create() can now refuse 'batchLocked' when the chosen
   *  session's cut-off has already passed (tumorBoardBatchLock.ts), and
   *  'presenterNotEligible' on the rare caller that passes a presenter at
   *  creation time. `timezone` (optional, defaulting to UTC like
   *  update()'s own) is what that lock check is evaluated against,
   *  facility-locally. The rule evaluator's own 'Rule'-sourced create()
   *  never sets a meetingDate, so neither new check ever applies to it —
   *  an auto-flagged case lands in the "Unscheduled" group and gets
   *  batched in later, same as any other nomination with no date yet. */
  create(listing: NewTumorBoardListing, timezone?: string): Promise<ServiceResult<TumorBoardListing>>;
  /** Queue management — scheduling, presenter, board, or a manual
   *  Cancel. Protected: a status change (Presented/Deferred/Cancelled)
   *  needs case:tumor-board:manage; a board/meeting-date/meeting-time/
   *  presenter change needs the narrower case:tumor-board:schedule
   *  (Batch 493) — see mockTumorBoardService.ts's own
   *  requiredTumorBoardCapabilitiesFor(). Refuses status: 'Dismissed'
   *  (use dismiss() instead).
   *  Batch 493: `timezone` decides, facility-locally, whether a presenter
   *  + meeting-date/time change is still in the future (and so worth a
   *  notification + calendar invite) — optional, defaulting to UTC, so
   *  every pre-existing caller/test that doesn't care about that exact
   *  cutoff keeps compiling unchanged.
   *  Batch 494: the same `timezone` is now also what a board/meeting-
   *  date/meeting-time change (never a presenter-only or status-only one)
   *  is checked against for 'batchLocked' (tumorBoardBatchLock.ts); and
   *  any change that sets presenterUserId to a new, non-null value is
   *  checked for 'presenterNotEligible' (tumorBoardPresenterEligibility.ts)
   *  and, if it passes, stamps presenterAssignedAt/By* — see
   *  TumorBoardListing's own comment above. */
  update(id: ID, changes: TumorBoardListingUpdate, byUserId: string, byUserName: string, timezone?: string): Promise<ServiceResult<TumorBoardListing>>;
  /** The clinical override of an auto-generated (or manual) flag, with a
   *  mandatory reason. Protected (case:tumor-board:dismiss) — never the
   *  broader case:tumor-board:manage. */
  dismiss(id: ID, reason: string, byUserId: string, byUserName: string): Promise<ServiceResult<TumorBoardListing>>;
}
