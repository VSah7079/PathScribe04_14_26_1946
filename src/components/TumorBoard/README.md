# components/TumorBoard/

## Batch 489 — Module 1 of Pete's Tumor Board / MDT Workspace spec (PS-359 follow-up)

`FlagForMdtModal.tsx` — the manual "Flag for MDT" action: a small, standalone modal (board selection only) reached from the report page at sign-out (`SynopticReportPage.tsx`), calling `tumorBoardService.create()` directly. No business logic here (CLAUDE.md rule 2) — the create call's own authorization check (`case:tumor-board:flag`) and one-active-listing-per-case rule live in `services/tumorBoard/mockTumorBoardService.ts`.

Deliberately not routed through `Synoptic/Delegate/DelegateModal.tsx`: a board nomination has no person/pool recipient, which that modal's `DelegationRequest` shape always requires. See `services/tumorBoard/README.md` for the full reasoning.

This is the real fix for `'delegation.tumorBoard'` ("Submit to Tumor Board") — a voice/keyboard action declared in `constants/systemActions.ts` and recognized by voice, but never wired to any handler anywhere in the app until this batch.

## Batch 494 — optional meeting date/time at flag time (PS-359 follow-up — MDT Self-Service Assignment & Batching redesign)

`FlagForMdtModal.tsx` gains optional meeting-date/meeting-time `<input>` fields (time disabled until a date is chosen) so a case enters a real batch — board + date/time — the moment it's flagged, per Pete's spec: *"When a case is identified for multidisciplinary tumor board review, it is tagged with an 'MDT' status and assigned a date and time slot"* up front, with the **presenter** left Null until someone claims it later from the workspace's own self-service dashboard. Left blank, a case still lands in the "Unscheduled" group, same as before this batch. `create()` is now called with the facility `timezone` (`config.facilityTimezone`, same pattern `update()` already used since Batch 493) — needed so the service's own batch-lock check (`services/tumorBoard/tumorBoardBatchLock.ts`) can correctly refuse a meeting date already inside its lock window. Error display switched from the raw `ServiceResult.error` code to a translated `flagForMdtModal.errors.<code>` lookup (CLAUDE.md rule 3 — no raw English error strings), covering the service's `activeListingExists`/`batchLocked`/`notPermitted`/`presenterNotEligible` codes plus a generic `saveFailed` fallback.

No business logic added here either — board/date/time selection is just which option is picked; the create call, the one-active-listing-per-case rule, and the batch-lock check all still live in `services/tumorBoard/mockTumorBoardService.ts`.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md if this folder's overall PURPOSE changes.*
