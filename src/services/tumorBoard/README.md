# services/tumorBoard/

## Batch 489 — Module 1 of Pete's Tumor Board / MDT Workspace spec (PS-359 follow-up)

The dedicated board-nomination record: `TumorBoardListing` (board, meeting date, status, presenter, full audit fields), with a fixed 4-board vocabulary (`Breast MDT`, `GI MDT`, `Thoracic MDM`, `Gyn-Onc`) and a real status lifecycle (`Pending Presentation` default, `Presented`, `Deferred`, `Cancelled`, `Dismissed`).

**Pattern:** Standard interface/mock pattern (`ITumorBoardService` / `mockTumorBoardService`), `storageGet`/`storageSet` via `services/mockStorage.ts` (`tumor_board_listings`).

**Why a new service, not an existing one:** the app already had a generic `'Tumor Board Scheduled'` flag plus three board-specific ones (`services/flags/mockFlagService.ts`) and a live `TUMOR_BOARD` `DelegationType` (`services/delegationTypes/`) — neither carries board/schedule/status as real structured fields; `DelegateModal.tsx` forces a person/pool recipient through its generic hand-off flow, which doesn't fit a board. This is a small, purpose-built record instead. `caseFlagsApi.ts`'s own disclosed `appliedBy: 'current-user'` bug (never the real signed-in user) was a second reason not to build on the Flag system — not fixed here, out of scope.

**Protected action:** `create()` enforces `case:tumor-board:flag` (seeded to the grossing roles only — Pathologist, Fellow, Resident, PA — not every case-access role, since this is a clinical judgment call). See `docs/architecture/AUTHORIZATION_API.md`.

**Business rule:** at most one ACTIVE (non-`Cancelled`) listing per case at a time; `create()` refuses a second one rather than silently duplicating.

**Shape note (for the later auto-flagging rules-engine module):** `source: 'Manual' | 'Rule'`, `triggerReason?: string`, and the `'Dismissed'` status exist now so Module 1's shape doesn't need a breaking change once that engine lands — Module 1 itself only ever writes `source: 'Manual'`.

- `ITumorBoardService.ts` — the interface and types.
- `mockTumorBoardService.ts` — the mock implementation.
- `tumorBoardWorkspaceFilters.ts` — pure filter/sort logic for the workspace page (`resolveMeetingWindow`, `toServiceFilter`, `sortListings`), kept out of the component per CLAUDE.md rule 2.

**UI:** `pages/TumorBoardWorkspacePage.tsx` (the workspace, `/tumor-board`) and `components/TumorBoard/FlagForMdtModal.tsx` (the manual "Flag for MDT" action, reached from `SynopticReportPage.tsx` — the real fix for the previously-dead `'delegation.tumorBoard'` voice/keyboard action).

## Batch 491 — the rule evaluator, the Coordinator/Clinical capability split, and a real-gap correction (PS-359 follow-up)

**Verify-don't-trust correction:** this file's own header above (and `ITumorBoardService.ts`'s own comment) claimed `source`/`triggerReason`/`'Dismissed'`/the dismiss fields already existed on `TumorBoardListing` "so Module 1's shape doesn't need a breaking change." Checked against the actual interface for this batch: they did **not** exist. Added for real now — `source`, `triggerReason`, `dismissReason`, `dismissedByUserId`, `dismissedByUserName`, `dismissedAt` on `TumorBoardListing`; `source?`/`triggerReason?` on `NewTumorBoardListing`.

**The rule evaluator** (`services/tumorBoardRules/`, new folder — see its own README) reads the hybrid-inheritance auto-flagging rules, evaluates them against `services/marginExtraction/`'s margin-distance shadow attributes, and calls this service's `create()` with `source: 'Rule'` when a case should be flagged. No bypass of `case:tumor-board:flag` was needed for this system-initiated call: GROSSERS (the only roles with that capability) are exactly who signs out a surgical case, so the existing gate naturally passes for the signing pathologist.

**Coordinator-vs-Clinical capability split**, per Pete's own confirmed design:
- `case:tumor-board:manage` (new) — broad queue-management access (status other than Dismissed, presenter, board, meeting date), seeded to every case-access role (`CASE_ACCESS_ROLES`) since no dedicated Coordinator role exists in this app yet.
- `case:tumor-board:dismiss` (new) — the narrow clinical override that closes a listing as `'Dismissed'` with a mandatory reason, seeded only to GROSSERS, same reasoning as `case:tumor-board:flag`.
- `update()` refuses a `status: 'Dismissed'` transition at the type level (`TumorBoardManagedStatus = Exclude<TumorBoardCaseStatus, 'Dismissed'>`) and defensively at runtime (`'useDismissInstead'`) — the override path always goes through the new, narrower `dismiss(id, reason, byUserId, byUserName)` method instead.
- `getActiveForCase()` and `create()`'s duplicate-check now exclude `'Dismissed'` alongside `'Cancelled'`.

## Batch 493 — Residents as presenters, meeting time + calendar invites, and the scheduling capability split (PS-359 follow-up)

**Residents added to the Presenter list** (Pete, Oct 8, confirming a genuine gap): `useTumorBoardWorkspace.ts`'s presenter filter was pathologist/fellow-only since Batch 489, but residents do present at Tumor Board. Now filters to `pathologist | fellow | resident`. PA is still deliberately excluded (a PA grosses specimens, doesn't present findings) — Pete's own wording.

**New optional `meetingTime` field** (`TumorBoardListing.meetingTime?: string`, `HH:mm`, facility-local) — asked for a start time because a calendar invite needs one. Left blank, a listing is still a date-only meeting and any invite goes out as all-day. New `<input type="time">` in `TumorBoardWorkspacePage.tsx`, disabled until a meeting date is set.

**Real in-app message + calendar invite on a future assignment** (Pete, Oct 8: *"If I assign a future date for a tumor board, I'd want a message, and can we send out an appointment to their calendar?"*):
- `notifyTumorBoardAssignment.ts` (new) — `shouldNotifyTumorBoardAssignment(previous, updated, now, timezone)` is the single pure decision of *when*: presenter and meeting date both set, the facility-local meeting instant (date+time, or 23:59 when time is blank) is still in the future, and something about the presenter/date/time actually changed on this save (not a bare status edit). `notifyTumorBoardAssignment(updated, byUserId, byUserName, timezone)` is the impure orchestrator: sends an in-app message to the presenter via `mockMessageService.send()` (sender `'system'` / `'PathScribe System'`, matching the app's existing system-notice convention) and, when the presenter has an email on file, emails them a real RFC 5545 `.ics` invite via `sendEmail()`'s new `attachments` support.
- `buildTumorBoardInviteIcs.ts` (new) — builds a `METHOD:REQUEST` VEVENT (so Outlook/Gmail/Apple Calendar render real Accept/Decline buttons), `ORGANIZER`/`ATTENDEE` lines, a 60-minute default duration for timed meetings, `VALUE=DATE` (exclusive next-day end) for date-only ones, facility-timezone-aware timestamps via `utils/facilityTime.ts`'s new `getFacilityDateTimeUtc()`, and RFC 5545 text escaping.
- **Deliberately no PHI in either the message or the invite** — only the board name and the case's internal accession number. An accepted calendar invite can sync out to the presenter's own Outlook/Gmail calendar, which is outside this app's PHI boundary, so nothing patient-identifying goes into it.
- Called fire-and-forget (`void`, try/catch, never throws) from `update()`, same pattern as `tumorBoardRules/runMarginRuleEvaluation.ts` at sign-out — never blocks or fails the save itself.
- Chose an emailed `.ics` attachment over a real Google/Outlook Calendar OAuth integration: no calendar connector exists in this app yet, and building one is a much larger, separate feature than this batch.

**Scheduling capability split** (Pete, Oct 8: *"There should be a specific permission to schedule these MDT so that an admin assistant can schedule them in advance"*): `update()` now requires one or both of two capabilities, decided by the new, directly-tested pure function `requiredTumorBoardCapabilitiesFor(changes)`:
- `case:tumor-board:manage` — status changes only (Cancel, Presented, Deferred), same as Batch 491.
- `case:tumor-board:schedule` (new) — board, meeting date, meeting time, presenter. Seeded to every role `case:tumor-board:manage` was seeded to (`capabilitySeeds.ts`), but — unlike a hard-coded role — any custom role an admin creates via Config → Staff → Role Dictionary can now be granted just this narrower capability, which is the real fix for "an admin assistant can schedule them in advance" without also handing them the clinical queue-management authority.
- Every existing caller in `TumorBoardWorkspacePage.tsx` already changes exactly one field-group per `update()` call, so this split needed no UI restructuring — each handler already only ever needs one of the two capabilities.
- Both capabilities are enforced as their own literal `enforce('case:tumor-board:manage', …)` / `enforce('case:tumor-board:schedule', …)` calls (not a loop over a variable) so `capabilities.guard.test.ts`'s static source scan can still find each one checked.

**Verify-don't-trust correction:** Batch 492's "disclosed, not fixed" note — across this folder's own ancestor READMEs and Jira comment 10831 — claimed no messaging/notification system existed yet in this app. Building this batch's real notification found that claim was wrong: `services/messages/` and `services/communications/` both already existed and were already in use elsewhere. Corrected everywhere that claim was made.

- `ITumorBoardService.ts` — `meetingTime` on `TumorBoardListing`/`NewTumorBoardListing`/`TumorBoardListingUpdate`; `update()` gains an optional `timezone` parameter.
- `mockTumorBoardService.ts` — `requiredTumorBoardCapabilitiesFor()`, the two-capability `update()` enforcement, the fire-and-forget notification call.
- `buildTumorBoardInviteIcs.ts` / `buildTumorBoardInviteIcs.test.ts` — new.
- `notifyTumorBoardAssignment.ts` / `notifyTumorBoardAssignment.test.ts` — new.

## Batch 494 — MDT Self-Service Assignment & Batching redesign (PS-359 follow-up)

Pete, Oct 8, immediately after Batch 493 shipped: *"I'm just not feeling this workflow. This is an adjustment,"* followed by a full written spec. The up-front "assign a presenter when you flag the case" workflow is replaced, not extended: `presenterUserId` stays Null at flag time; pathologists/fellows/residents self-assign from a session-grouped dashboard (or an admin assigns on their behalf); each session's case list **locks** a configured interval before the meeting; the list can be printed as a hard-copy checklist.

**New real server-side presenter-eligibility check.** `tumorBoardPresenterEligibility.ts` (new) — `isPresenterEligibleRoles(roles)` / `PRESENTER_ELIGIBLE_ROLES = ['pathologist', 'fellow', 'resident']`, the same set `useTumorBoardWorkspace.ts`'s presenter-list filter already used since Batch 493, but that filter was UI-only: nothing server-side ever stopped a `case:tumor-board:schedule` holder from setting an *ineligible* presenter. Both `create()` and `update()` now call this (via `mockUserService.getById()`) and return `presenterNotEligible` otherwise.

**New batch-lock cut-off.** `tumorBoardBatchLock.ts` (new) — `isTumorBoardBatchLocked(meetingDate, meetingTime, now, timezone, cutoffHours)`, a pure, timezone-aware (`getFacilityDateTimeUtc`) check: a date-only session locks relative to 23:59 facility-local, same "all-day" convention as `notifyTumorBoardAssignment.ts`/`buildTumorBoardInviteIcs.ts`. `create()`/`update()` both refuse a board/meeting-date/meeting-time change into an already-locked session (`batchLocked`) — **never** a presenter or status change, so claiming still works right up to and after a locked or already-past meeting. The cut-off's own value (`cutoffHours`, default 48h) lives in `services/tumorBoardRules/` as one enterprise-wide setting (`mockTumorBoardBatchSettingsService`) rather than a per-facility override — see that folder's own README for the scope reasoning.

**New claim audit trail.** `presenterAssignedAt` / `presenterAssignedByUserId` / `presenterAssignedByUserName` on `TumorBoardListing`, stamped by `update()`/`create()` only on an actual presenter-SET transition (not on a clear, not on an unrelated edit) — distinct from the pre-existing `updatedAt`/`updatedBy*`, which still track the row generally.

**New session grouping.** `tumorBoardSessionGrouping.ts` (new) — `groupTumorBoardRowsBySession<T extends { listing: TumorBoardListing }>(rows, cutoffHours, now, timezone)`, a pure function grouping a workspace's rows into board+meetingDate sessions (soonest first; every date-less row collected into one trailing "Unscheduled" group), each carrying its own `locked` and `unassignedCount`. Used by `TumorBoardWorkspacePage.tsx` to render the self-service dashboard instead of a flat list.

**`create()` gains an optional `timezone` parameter** (default `'UTC'`), needed for the batch-lock check above — `FlagForMdtModal.tsx` now passes `config.facilityTimezone`, same as `update()` already did since Batch 493.

- `tumorBoardPresenterEligibility.ts` / `tumorBoardPresenterEligibility.test.ts` — new.
- `tumorBoardBatchLock.ts` / `tumorBoardBatchLock.test.ts` — new.
- `tumorBoardSessionGrouping.ts` / `tumorBoardSessionGrouping.test.ts` — new.
- `ITumorBoardService.ts` — `presenterAssignedAt`/`presenterAssignedByUserId`/`presenterAssignedByUserName` on `TumorBoardListing`; `create()` gains `timezone?: string`.
- `mockTumorBoardService.ts` — `presenterIsEligible()`, `getBatchCutoffHours()`, the lock/eligibility checks and claim-audit stamping in both `create()`/`update()`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 516: Tumor Board / MDT demo data

`tumorBoardDemoSeed.ts` (+ test) is written when nothing is stored (first run, or after a Full Reset).
- **Boards:** all four.
- **Statuses:** pending, presented, deferred.
- **Presenters:** one claimed, one waiting to be claimed.
- **Scheduling:** one case not yet scheduled.
- **Source:** one listing flagged by the margin rule.

The cases are S26-4670..4673 (new, in `cases/demoBaselineCases.ts`), plus S26-4630, S26-4631 and S26-4642.

## Batch 617 (part C): server versions (PS-514)

The tumor board service here now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/TUMOR_BOARD_API.md`. The mocks are unchanged.

`tumorBoardRefusal` (Batch 659): maps service refusals to the message shown on the workspace.
