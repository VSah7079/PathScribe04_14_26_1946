**Batch 650:** `poolClaimWindow.ts`: Accept case / Pass case (Alt+A, Ctrl+Alt+P) press the pool claim window's buttons only once it is ready and the capability (`case:pool:claim` / `case:pool:pass`) is held; the window takes the context the registry files them under (`POOL_WINDOW_VOICE_CONTEXT`). Test: `poolClaimWindow.test.ts`.

**Batch 649:** `poolCaseActions.ts`: claiming (`case:pool:claim`, high risk, audited) and passing (`case:pool:pass`) a pool case check their capability in the service; pool membership rules still apply. A refusal is reported as `isPoolActionNotPermitted`.

**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/cases/

The biggest, most central folder — case data access, LIS-vs-Orchestration routing, and production-migration planning.

**Pattern:** See PRODUCTION_MIGRATION.md — this folder deliberately does NOT follow the simple interface/mock/firestore triplet; read that doc first.

## Files

- **`ICaseService.ts`** — The contract any case data source must satisfy (mock, Firestore, HL7 FHIR, or direct LIS DB). `updateCase` now takes an optional third `expectedVersion?: number` parameter (added for the Case Hydration & Optimistic Concurrency Control spec) — omitted entirely, every existing call site keeps today's unconditional-write behavior; provided, the implementation must perform a real compare-and-swap and throw `ConcurrencyConflictError` on a mismatch. Additive, not a breaking change. **Extended (Aug 2026)**, prompted by Pete asking directly whether MRN and MPI search actually worked (they didn't — see `caseFilterUtils.ts`'s and `FirestoreCaseService.ts`'s own entries below): added `patientId?: string` to `CaseFilterParams` — the real Master Patient Index id (`services/patients/IPatientIndexService.ts`), matched against `patient.id`, which `AccessionPage.tsx`'s real MPI resolution already populates. Also added `pageSize?: number`/`cursor?: string` for real, cursor-based pagination — deliberately cursor-based rather than offset-based (`skip N, take pageSize`), since offset paging degrades at scale (the database still walks past every skipped document on every request) — the exact class of problem Pete described hitting directly with Clinisys VUE, addressed before it became a problem here rather than after. Also fixed a stale comment on `clientIds` still referencing the old fake `c1`-`c8` id scheme, already fixed elsewhere.
- **`ConcurrencyConflictError.ts`** — New. The real 409-equivalent contract every case service throws on a genuine version mismatch — carries `caseId`/`expectedVersion`/`actualVersion` so a catcher can build a real reconciliation UI rather than a generic error message. `CaseRouter.ts` specifically preserves and rethrows this type rather than swallowing it into a generic error (see its own entry below) — losing that distinction here would have made every downstream conflict-handling fix pointless.
- **`CaseRouter.ts`** — THE FACADE — routes between LIS cases (S26- prefix) and Orchestration cases (O26- prefix). Production-critical, explicitly marked 'keep' in PRODUCTION_MIGRATION.md. **Real fix:** `updateCase`'s catch block used to discard whatever error the underlying service threw and replace it with a generic one (`catch { throw new Error(...) }`, not even capturing the original) — meaning a `ConcurrencyConflictError` thrown by any case service would have been silently lost before ever reaching a caller. Now passes `expectedVersion` through and explicitly preserves/rethrows `ConcurrencyConflictError` by type. **Real pagination work (Aug 2026)**, prompted directly by Pete raising Search performance and specifically citing prior, direct experience with Clinisys VUE needing paging at scale: `getAll()` now supports real, cursor-based pagination end to end. The single-source case (most users — `includeOrchestration` requires `canViewOrchestration`) passes the cursor straight through to whichever one real service is being queried. The dual-source case is genuinely harder: a cursor value from LIS's own `updatedAt` timeline may not exist at all in Orchestration's dataset, so `getAll()` decodes/encodes a composite cursor (`{lis, orch}`, JSON-encoded) and calls `caseFilterUtils.ts`'s `mergeDualSourcePages()` to interleave both sources' independently-fetched batches correctly by `updatedAt` — see that file's own entry for the real bug testing this caught before it shipped. Honest, documented limitation, not a silent gap: accessibility filtering (`filterAccessibleCasesWithPools`) runs *after* each source's own pagination, since it can't be pushed into either underlying query — meaning a page can come back with fewer than `pageSize` items if some of what was fetched isn't accessible to the current user. A real tradeoff, not a bug, but worth knowing if a page ever looks shorter than expected.
- **`casePoolAssignmentService.ts`** — (renamed from caseRoutingService.ts) Automatic case-pool/subspecialty routing when no LIS assignment exists — a genuinely different concern from CaseRouter.ts (business logic, not data-source selection). **Real fix, found via a direct audit:** this was a complete, working system (admin-configurable Routing Rules, a preview tool, keyword-to-subspecialty matching, real pool application) that was never actually called from anywhere — genuinely orphaned, not a stub. Deliberately wired in at grossing completion (`SynopticReportPage.tsx`'s `handleGrossComplete`), not at accession — grossing isn't gated by pool status (a case can be "in pool, already grossed"), but routing *before* grossing would let a pathologist claim a case with nothing to review yet. Also fixed a real, separate bug found in the same pass: 4 of the 6 built-in routing rules referenced `subspecialtyId` values that didn't match any real `Subspecialty` record (`gu`≠`uro`, `gynecologic`≠`gyn`, `dermatology`≠`derm`, `hematopathology`≠`heme`) — every keyword match was silently failing and falling through to the fallback pool regardless of specimen type. **Redesigned against FEAT-ROUT-01** ("Dynamic Workgroup Pool & Specimen-Based Case Routing," an external spec): routing key is now `[Specimen Type] + [Performing Lab ID] → Pool`, not free-text keyword matching alone. `RoutingRule` gained `mappedSpecimenTypeIds?: string[]` — a specimen's own `specimenDictionaryEntryId` is matched deterministically against this first; `keywords` is now an explicit, secondary fallback only for specimens with no dictionary link (manual entry, or seeded before that field existed). Both `RoutingRule` and `Subspecialty` (the pool itself) gained `performingLabFacilityId?: string` — the same Global/scoped convention as `ContainerType`/`DelegationType` — so different performing labs get their own pools; a lab-specific rule/pool wins over a Global one for that lab's own cases (most-specific-wins, same precedence as TAT Config and Template Routing). `Subspecialty` also gained `isCatchAll?: boolean` — the real, primary source of truth for a pool's fallback status per lab (or Global), checked before `RoutingConfig.fallbackPoolId`/`labFallbacks`, which remain a secondary manual override. `mockFacilityService.ts`'s `add()`/`update()` now auto-provision a default "`<Facility Name>` — General Pathology" catch-all pool the moment a facility gains the `performing_lab` role (see that folder's own README) — including a one-time backfill for the seeded performing labs that predate this. `CasePoolAssignmentSection.tsx` (see `components/Config/System/README.md`) was rewritten from a settings-only page (no admin UI for `RoutingRule[]` at all, despite the service supporting it) into a real table+modal with Edit/Duplicate/Deactivate.
- **`IFppeAssignmentService.ts`** / **`mockFppeAssignmentService.ts`** — Real CRUD + real in-place mutations for FPPE (Focused Professional Practice Evaluation) new-hire credentialing assignments (`types/case/FppeAssignment.ts`) — the old system, still the real source of truth for `FppeAssignmentsSection.tsx`'s own list view and writes (PS-114 shadow-writes the generic `QaSupervisionAssignment` system alongside it; see `services/quality/README.md`). **Real fix, per direct guidance (FPPE Facility organization):** `create()`'s input gained a required `facilityId` — `FppeAssignment` had no facility association at all before, a genuine gap that made it impossible for an admin to tell which real performing lab a given supervisee belonged to. Seed data is a real, genuinely empty array (`storageGet(STORAGE_KEY, [])`) — every real assignment in a fresh environment comes from an admin actually creating one through `FppeAssignmentsSection.tsx`, not a fabricated demo history. *(Retired in Batch 515, PS-124: these files are deleted; FPPE assignments live in the QA supervision service.)*
- **`AuditLogger.ts`** — DSPT/GDPR-compliant structured access logging, partitioned per data source for medico-legal clarity. **Real fix, found via a direct question about whether these events showed up on the System Audit page — they didn't:** this previously only did `console.debug()` in dev mode, completely disconnected from `services/auditlog/` — the actual store `AuditLogPage.tsx` reads from. Every `case.read`/`case.write`/`case.write.conflict` event logged by any case service was invisible to any real user. Now genuinely writes into the same real audit store as every other audit trail in this app, fire-and-forget (an audit write failing must never fail the case operation it describes). Also added a real, distinct `case.write.conflict` event type — separate from a generic `case.write` failure, so a real audit review can tell "someone else won a race" apart from "the write actually broke."
- **`FHIRCaseService.ts`** — Production NHS HL7 FHIR R4 implementation — deliberate scaffolding, not yet wired in. Full resource-mapping table and go-live TODO list in its own header.
- **`FirestoreCaseService.ts`** — (casing fixed July 2026 — was firestoreCaseService.ts, mismatched PRODUCTION_MIGRATION.md's documented name, would have broken on a case-sensitive/Linux deploy) Production Orchestration-case data source. **Real fix:** `updateCase` now performs the actual optimistic-concurrency compare-and-swap inside a genuine Firestore `runTransaction` — reads the current version, compares, throws `ConcurrencyConflictError` on mismatch, writes and increments atomically on match. Not a two-step check-then-write (which would itself race) — a real transaction. **Real fix (Aug 2026), found answering Pete's direct question "is MRN search wired?":** `getAll()`'s `hospitalId` filter used to query `where('hospitalId', '==', ...)` — a field that doesn't exist anywhere on the real `Case` schema (MRN genuinely lives at `patient.mrn`), meaning this query would always have returned zero results in production. Fixed to the real field path. Added a real, exact-match `patientId` (MPI) constraint on `patient.id` alongside it. **Real filter parity work**, closing the gap between what `SearchPage.tsx` sends and what this file actually queried: added genuine server-side `where()`/`in` constraints for `clientIds`, `genderList` (normalized to the real stored single-letter codes — `patient.sex` is `'M'/'F'/'X'/'U'/'O'`, `SearchPage` sends full words), and `pathologistIds`. **Real, hard Firestore constraint handled explicitly, not silently**: only one field can have an inequality/range filter per query, and `dateFrom`/`dateTo` (accession date) and `dobFrom`/`dobTo`/`ageMin`/`ageMax` (both ultimately ranges on `patient.dateOfBirth`) compete for that one slot — accession date wins the server-side slot when both are given, with the DOB/age range applied client-side after (same "keep result sets small" reasoning the existing text-search filters already used, just for a range). Also fixed a real, honest discrepancy: the accession-date field used here is `order.receivedDate` (the same field `WorklistTable.tsx`'s own `getSortValue()` already treats as canonical), not the mock's own `specimens[0]?.receivedAt` — Firestore can't query into the first element of an array field directly, so the two backends' exact date source genuinely differs, documented rather than silently assumed equivalent. **Real, cursor-based pagination** (`limit()`/`startAfter()`) — see `ICaseService.ts`'s entry above for why cursor rather than offset.
- **`FirestoreCaseService.test.ts`** — Real tests against a mocked Firestore SDK (the existing pattern this file already used) — extended with real coverage of the version compare-and-swap: matching version succeeds, mismatched version throws and never writes, a legacy case with no version field yet is treated as version 0 rather than crashing, a case that doesn't exist yet is treated as version 0 inside the transaction.
- **`caseFilterUtils.ts`** — Shared case-filtering pipeline — extracted specifically to stop mockCaseService.ts and mockOrchestratorCaseService.ts's filter logic from drifting apart, the same class of bug this codebase has hit and fixed repeatedly (see its own header comment for the pattern list). **Two real, severe bugs found and fixed in a systematic bad-query audit (Aug 2026):** (1) the priority filter read `(c as any).priority`, but `Case.priority` doesn't exist anywhere in the real type — priority genuinely only lives at `Case.order.priority` (confirmed directly against `types/case/Case.ts`) — so this filter always fell back to `'routine'` regardless of a case's real priority, meaning STAT/Rush searches never matched anything real and a "Routine" search incorrectly matched everything. Fixed to read `order?.priority`. (2) the client-ID filter had a fallback branch using a stale `c1`-`c8` id→name map; for any real client ID (which `SearchPage.tsx` now correctly passes, after its own `ALL_CLIENTS` fix), the lookup returned `undefined`, fell through `?? ''`, and `string.includes('')` is always `true` — silently matching every case with any client name at all, completely defeating the filter. Verified with a direct runtime test before fixing. Removed the fallback (confirmed via the real seed data that no case actually needs it — every case with a `clientName` also has a `clientId`) along with the now-fully-dead `ALL_CLIENTS_MAP`. Also added real `hospitalId` (MRN) and `patientId` (MPI) filtering — both were declared params, sent by `SearchPage.tsx`, but never actually checked anywhere in this pipeline. **New (Aug 2026): `applyCasePagination()` and `mergeDualSourcePages()`** — real, shared pagination for `mockCaseService.ts`/`mockOrchestratorCaseService.ts`, giving the mock backend the same `pageSize`/`cursor`/`meta` contract `FirestoreCaseService.ts` uses, so `SearchPage.tsx` doesn't need to special-case which backend is active. Sorts by `updatedAt` descending before paginating, matching Firestore's own `orderBy`, so both backends present cases in the same order. `mergeDualSourcePages()` handles the genuinely harder problem — `CaseRouter.getAll()` merging two independently-paginated sources (LIS + Orchestration) needs a composite cursor (`{lis, orch}`), since a cursor value from one source's timeline may not exist at all in the other's. Deliberately extracted into its own pure function specifically so it could be tested directly without mocking `CaseRouter`'s full session/subspecialty/audit dependency graph — and that testing caught a real bug before it shipped: `hasMore` was originally computed only from whether the merged, already-fetched batch exceeded `pageSize`, missing the case where a source's own prior fetch already knew it had more data but that source's entire fetched batch got fully consumed by the current page. Fixed by threading each source's own `hasMore` into the merge. See `caseFilterUtils.test.ts` (new, 14 tests) for the full verification, including the specific regression test for that bug.
- **`mockCaseService.ts`** — MASSIVE (6,000+ lines) — the real, active LIS-mode mock data source. Marked for deletion at production go-live per PRODUCTION_MIGRATION.md Step 4. **Real fix:** `updateCase` now has the same real version compare-and-swap as `FirestoreCaseService.ts` — single-threaded JS means a synchronous check-then-write is genuinely atomic here, no transaction needed the way Firestore requires one. **Second real fix, found via a direct audit:** `claimPoolCase`/`acceptPoolCase` had zero subspecialty-membership checking at all — any pathologist could claim any pool case regardless of subspecialty, since the only existing check was a claim-lock against two people claiming simultaneously. New `canUserClaimPoolCase()` helper (exported for direct testing) checks `Subspecialty.userIds` when `isWorkgroupEnabled` is on for the case's pool — backward-compatible by default, since every seeded subspecialty has that flag off today, meaning claiming stays fully unrestricted until an admin actually turns restriction on for a given pool. Checked at both `claimPoolCase` and `acceptPoolCase` independently (defense-in-depth — `acceptPoolCase` is separately exported and directly callable, shouldn't rely solely on `claimPoolCase` having run first). **Third real fix**, found investigating Pete's "is there a mock data issue" question: zero seed cases anywhere had `diagnostic.finalizedBy`/`issuedDate` set, meaning `ProductivityTab.tsx`'s real case-count dashboard and all four newly-real TAT sections in `QualityTab.tsx` (see `components/Contribution/README.md`) would show genuinely empty results for a fresh demo, even with their calculation logic correct — there was nothing to calculate from. A real, idempotent enrichment step (right after `MOCK_CASES` is defined) gives ten existing seed cases realistic, chronologically consistent lifecycle timestamps, deliberately mixing in-target and genuine outliers. Extended in a later pass to also give those same ten cases' first specimen real `collection`/`processing.processedAt` data, once `COLD_ISCHEMIA` TAT went from "no real data anywhere" to "real data that existed but was never wired up" — same reasoning, same enrichment step, verified the same way (direct output check, not just a compile pass). **Fourth real fix**, closing out `CONSULTATION_RESPONSE`/`CONSULTATION_AWAITING`: `DelegationRecord.status` had `'completed'` as a valid value but nothing ever transitioned a record there — new `completeDelegation()` function (Batch 353: now `delegationService.complete()`, `services/delegations/`) and `completedAt` field close that gap (also fixing a pre-existing, silent bug in `WorklistPage.tsx`'s own "Delegated to Me" count, which could only ever grow). `DELEGATION_SEED` (Batch 353: moved to `services/delegations/delegationStore.ts`) gives `loadDelegations()` a real fallback — five genuine, chronologically real records referencing real case IDs and real seeded pathologist user IDs (`PATH-001`/Pete plus four others), a deliberate mix of late responses, an on-time response, and still-pending requests. This same investigation also surfaced that `receivedDate`/`assignedTo` genuinely live under `Case.order`, not top-level — the enrichment script's first draft used the wrong path and silently enriched zero cases, caught by directly verifying the result rather than trusting the code compiled. **Fifth real fix (Aug 2026):** `getAll()` now applies real, cursor-based pagination via `caseFilterUtils.ts`'s `applyCasePagination()` — see that file's own entry for the full detail. **New (Aug 2026): `evaluateGrossingTemplateFit`** — real feature, per direct follow-up: "there is kind of a workflow that allows the Gross to be dictated and on submission, the AI reads the Text, and updates the template... Not sure if there is bearing here." Confirmed real bearing: `generateGrossingFieldSuggestionsFromDictation` (same file, existing) already re-populates whatever template's fields it's given from a case's real dictated Gross text — what was missing was a trigger to re-evaluate which Grossing Template fits best once that real text exists, since accession-time `evaluateGrossingTemplateAssignment` only ever runs once, before any dictation, from a much thinner signal (specimen description + clinical indication alone). Mirrors `evaluateSynopticAssignment`'s own proven Stage 1 pattern exactly — same prompt structure, same defensive validation, same real `ProtocolChange` output the already-working `ProtocolChangeModal.tsx` renders as-is (confirmed its props are genuinely generic, no Synoptic-specific typing — reused directly, no parallel modal built). Wired into `useGrossingCompletion.ts`'s real Gross Complete flow, right before the existing dictation-to-fields pass — a specimen with a proposed change is excluded from that pass and instead gets fresh suggestions re-derived for its newly-accepted template in `useAmendmentWorkflow.ts`'s new `handleGrossingProtoCommit`, from the exact same dictated text. **Real bug found via live testing, not reasoning:** the first prompt draft's "SPECIMEN {id} ({label}): {desc}" header let a real AI response fold the parenthesized label into the id field of its own JSON reply (`"O26-0031-SP-A (A)"` instead of `"O26-0031-SP-A"`) — fixed the prompt to state the real id on its own explicit line, and added a defensive `specimenId` validation check (same "don't trust, verify" posture already applied to template IDs) so a still-malformed id is dropped with an honest warning rather than silently propagating. Verified live end-to-end: a genuine mismatch (default template assigned at accession from a vague description, then a clearly fluid-specimen dictation at Gross Complete) produced a real 98%-confidence proposal, and accepting it both switched the template and populated 7 real AI-derived field suggestions for the new template from the same dictated narrative — confirmed no information was lost.
- **`canUserClaimPoolCase.test.ts`** — New. Real tests for the claim-enforcement helper above: unrestricted when no pool, unrestricted when the poolId isn't a real Subspecialty (the "general" fallback pool), unrestricted when `isWorkgroupEnabled` is off (today's default), blocks a real non-member when the restriction is on, allows a real member when the restriction is on.
- **`mockOrchestratorCaseService.ts`** — Large — the real, active Orchestration-mode mock data source. Also marked for deletion at go-live. Same real version compare-and-swap fix as `mockCaseService.ts` — this is the service that actually backs Orchestration-mode case writes (`orchSections` etc.), confirmed via `CaseRouter`'s real constructor wiring (`new CaseRouter(mockCaseService, mockOrchestratorCaseService)`), so it needed the identical fix independently, not automatically covered by fixing the LIS-mode service alone. **Real fix (Aug 2026):** `getAll()` now applies the same real, cursor-based pagination as `mockCaseService.ts`, via the same shared `caseFilterUtils.ts` helper — one implementation both services call, not two that could drift.
- **`mockCaseServiceConcurrency.test.ts`** — New. Real tests run against BOTH mock services via `describe.each` (not mocked-away logic — actual writes, actual conflicts, actual version increments), covering: unconditional writes when no `expectedVersion` is given, a matching version succeeding, a mismatched version throwing and never landing, the thrown error carrying the real expected/actual versions, and that a conflict on one case never affects an unrelated case (no accidental global lock).
- ~~**`concurrencyCheck.ts`**~~ — Deleted. An earlier, superseded two-step "check then write" approach (a separate read to check staleness, then a second write) that had a real TOCTOU race window between the check and the write — something could change in between. Replaced by the atomic compare-and-swap built directly into `updateCase` itself; no consumers remained once `SynopticReportPage.tsx` was migrated to the real version, so removed rather than left as dead code.

*Corrected in the Batch 496 README audit (Oct 9, 2026): removed a stray `existingCounterFor()` sentence (it belonged to the retired case-number registry and no longer exists); `mockCaseService.ts` is now 6,000+ lines.*

## Notes

- READ PRODUCTION_MIGRATION.md FIRST when working in this folder — it's a genuinely detailed, real go-live runbook (SMART on FHIR auth options, NHS DSPT compliance by jurisdiction, GDPR Art 25 data-minimization reasoning, Caldicott Guardian approval, Firestore UK/EU residency).
- The O26-/S26- accession prefix convention (Orchestration vs LIS) is central to how this whole folder works — see CaseRouter.ts.
- **Real optimistic concurrency now exists end-to-end** (Case Hydration & Optimistic Concurrency Control spec) — schema (`Case.version` in `types/case/Case.ts`), the real compare-and-swap in all three writable services above, `ConcurrencyConflictError` as the shared contract, and `CaseRouter.ts` correctly propagating it. `firestore.rules` (repo root) enforces the same version check server-side, emulator-verified with 22 real tests. Since Batch 458 (PS-71) every case save passes a version: `CaseRouter.updateCase` requires it, system saves go through `caseWrite.ts`'s retry helpers, and `caseWriteVersion.guard.test.ts` fails on any `.updateCase(` call without one.
- **Real pool routing and claim enforcement now exist end-to-end** (found genuinely orphaned, then wired in across one session): automatic routing at grossing completion, real claim-time membership checking via `Subspecialty.userIds`, and the Worklist now sub-groups pool cases by their actual pool with real per-pool and per-urgency counts (see `components/Worklist/poolGrouping.ts`). **Updated per the FEAT-ROUT-01 rebuild:** which subspecialties are real, claimable pools (`isWorkgroup: true`) is still an admin decision, not automatic — but a performing lab now gets a working default the moment it's configured (`mockFacilityService`'s auto-provisioned catch-all pool), so "every case lands in the generic fallback pool" is no longer true by default the way it was before this pass — see `casePoolAssignmentService.ts`'s own entry above for the full account.

*Corrected in the Batch 496 README audit (Oct 9, 2026): every case save now carries its version (Batch 458), not only the report page's.*

## `ICountersignService`/`mockCountersignService.ts` — real, per direct guidance ("Yes we should scope 'Return to Trainee'/'Reject with Notes'. I think the delegation workflow might be a good method")

The resident-drafts/attending-countersigns workflow (`CountersignRecord`, `types/case/CountersignRecord.ts`) previously had exactly two real transitions — `release()` (resident submits) and `countersign()` (attending accepts, possibly with edits). No reject path existed at all. Investigated `delegateCase()`'s own real ownership-transfer mechanism (`syncPrimaryAssignee()`, `caseAssignmentSync.ts`, this same folder) first, before building anything, per direct suggestion that "the delegation workflow might be a good method."

**What got reused, and what deliberately didn't.** `syncPrimaryAssignee()` itself — the real, single-source-of-truth primitive that keeps `order.assignedTo` and `participants[]` in sync — is reused directly by the new `reject()` method below, exactly the way `delegateCase()`'s own `transfersOwnership` branch already uses it. What's deliberately *not* reused is `delegateCase()`'s own `DelegationRecord`-creation machinery — a second, parallel audit record for the same real event would just be redundant bookkeeping; `CountersignRecord` already is this specific resident↔attending relationship's own real audit trail, and now carries the rejection the same way it already carried the countersign.

**`reject(input)`** — the new, real method. `attendingFeedback` is required here, unlike `countersign()`'s own optional feedback — a rejection with no explanation gives the resident nothing to act on; the mock refuses outright (a real, validated error, not silently accepted) when it's missing or blank. Marks the `CountersignRecord` `status: 'returned'` (a new, third member of that type's own status union, alongside a new `returnedAt`), logs a real audit event, and returns the updated record — including the real `residentId`/`residentName` the caller (`useSignOutWorkflow.ts`'s new `handleReturnToTrainee()`) needs to actually reassign ownership.

**`CaseStatus.ts`'s own `'returned'` value, finally wired.** Confirmed directly, before reusing it, that this was a genuinely dormant member of the union — `mockOrchestratorCaseService.ts`'s own seed-data comment had already found and recorded "zero real consuming logic anywhere in the app" for it, including `Case.returnedBy` itself being "unread everywhere." Reusing it (rather than adding a new status value) meant real, existing infrastructure — `SearchPage.tsx`'s `CASE_STATUS_OPTIONS`/`STATUS_PILL_META`, `WorklistTable.tsx`'s status-color switch, `HeaderBar.tsx`'s `CASE_STATE_CLASS` — only needed a new *entry*, not a new status value threaded through every one of those places from scratch. `Case.returnedBy` now genuinely means what its own (previously bare) field declaration always implied: the attending who sent the case back.

**Color, chosen carefully, not just picked**: deliberately a deep brown (`#78350F`), not amber/orange — `'pending-review'` already owns that hue family (`#F59E0B`), and "Needs Review" vs. "Needs Revision" are close enough in wording already that a close color too would compound real confusion, not just risk it. Honest limitation: unlike the earlier session's own colorblind-simulation audit for the worklist tiles (real, computed Euclidean distances under simulated deuteranopia/protanopia), this color choice was not rigorously verified the same way — no equivalent tooling was available in this pass. Flagged directly in the code rather than silently assumed fine.

**Real caller**: `useSignOutWorkflow.ts`'s new `handleReturnToTrainee()` — see `pages/SynopticReportPage/hooks/README.md`'s own entry for the full real account, including why this is a genuinely separate, standalone action from `handleSignOutConfirm()`, never called from within it.

## `resolveResidentCountersignRequired.ts` — the shared resident/FPPE/cytotech countersign-interception decision

Extracted from `useSignOutWorkflow.ts`'s own inline resident/attending gate so the identical decision could be reused (not re-derived) by Cytology (`CytologyScreeningPage.tsx`) and Autopsy (`services/autopsy/signAutopsyReport.ts`) sign-out, rather than three independently-maintained copies of the same logic. Deliberately decision-only and synchronous/pure — it never itself calls `countersignService.release()`, touches `CaseStatus`, or resolves participation types/a performing lab; callers do all of that. A dual-role signer who is also an active `attending` participant on the case is never intercepted, regardless of any other real condition below — checked first, unconditionally.

Four real conditions can require interception, checked in this order once the attending exemption above has cleared: (1) `isResidentParticipant` — the signer holds an active `'resident'` participation type; (2) **PS-327 — `isConfiguredCountersignParticipant`** (new): the signer holds an active participation type whose id appears in the caller-supplied `countersignRequiredTypeIds` — real per-lab-resolved ids from `resolveCountersignRequiredTypeIds()` (`services/auth/caseAccessControl.ts`), themselves derived from each `ParticipationTypeRecord.requiresCountersign` flag via `resolveParticipationTypeAuthority()` (`services/participationTypes/IParticipationTypeService.ts`) — resolved per performing lab **and** per the lab's own jurisdiction (Sep 2026 — a country's regulatory profile, e.g. NATA/RCPath/MHW, sits between a lab-level exception and the platform default; see `services/participationTypes/README.md`) — see below for the real gap this closes; (3) `hasActiveFppeAssignment` — a provisional-hire FPPE proctorship; (4) `hasActiveCytotechCompetencyAssignment` — a cytotechnologist's first-year CLIA competency window. `countersignRequiredTypeIds` is optional and purely additive: omitting it (Cytology's and Autopsy's two real callers still do, as of this pass) reproduces the exact pre-PS-327 behavior — only the two hardcoded resident/cytotechnologist checks can ever fire.

**The real gap PS-327 closes**: `ParticipationTypeRecord.requiresCountersign` (+ its own per-lab `authorityOverrides` — see `services/participationTypes/README.md`) has had a real admin-facing checkbox (`TypeModal.tsx`) since the field was added, but until this pass its ONLY real consumer anywhere in the app was a cosmetic badge in `CaseTeamModal.tsx`'s drag-and-drop team editor — checking it never actually changed sign-out behavior for anything except the two types this function already hardcoded (`'resident'`, which already ships with `requiresCountersign: true` in real seed data, so this is additive there, not a behavior change). An admin creating a new, jurisdiction-specific junior role (UK/Ireland RCPath delegation, a country-specific personal-liability tier — see `IParticipationTypeService.ts`'s own `authorityOverrides` doc comment) and checking "Requires Countersign" on it would see the badge and reasonably expect real enforcement to follow. It now does, for `useSignOutWorkflow.ts`'s Surg Path sign-out (the primary, most fully-instrumented real call site — see `pages/SynopticReportPage/hooks/README.md`). **Deliberately NOT extended to Cytology/Autopsy in this same pass**: neither of those two call sites resolves `participationTypes`/`performingLabFacilityId` at all today (confirmed directly — neither one calls `canFinalizeCase()` either), so wiring them in for consistency is a real, separate, larger lift (pulling in `getParticipationTypeLookup()`/`resolvePerformingLabFacilityId()` end-to-end there, plus their own test coverage) rather than an incidental addition to this ticket's scope.

**Also investigated and deliberately left alone**: `deriveEligibleFinalizerIds()`'s own lab-scoping gap (`services/auth/caseAccessControl.ts`) — real, disclosed in that function's own doc comment, and NOT closed by this pass either. `CaseRouter.ts`'s `updateCase()` chokepoint only ever receives a partial `Case` patch, which usually doesn't carry `order.facilityId` — resolving the performing lab there would mean fetching the full existing case on every write that touches `participants`, a real, deliberate cost tradeoff already reasoned through once and left as-is rather than silently reversed. Doesn't matter in practice today: the repo-root `firestore.rules` (version compare-and-swap, finalized-case read-only rules) never references `Case.eligibleFinalizerIds`, so nothing server-side reads it yet. (Corrected Sep 2026 — this entry originally said no `firestore.rules` file existed at all; one does, it just has no finalize rule.) — the live, actually-enforced write guard is `canFinalizeCase()`, which IS fully lab-scoped (both dimensions this ticket's own AC#1 asked for).

**A real, more significant gap found and closed in the same pass, not asked for directly**: `getForCase()` had never actually been called anywhere in this app — confirmed directly, not assumed, before building anything further. That meant `attendingFeedback` (real since this whole countersign workflow was first built) had never been shown to a resident in context, for either the original `countersign()` (accept) path or this session's new `reject()` path — only via `CountersignTurnaroundTab.tsx`, a QA/management dashboard a resident wouldn't naturally open while actively fixing their own returned case. `getForCase()`'s own real contract now matches `'pending'` OR `'returned'`, not just `'pending'` — a new `RevisionFeedbackBanner.tsx` (`pages/SynopticReportPage/components/README.md`) is its first real caller, showing the attending's real feedback the moment the resident opens their returned case.

## On-Demand Case Fetch & Fallback (Sep 2026)

Real, per direct guidance's own full design: a case a pathologist
scans/types/speaks that isn't in PathScribe's own local cache falls
back to a real, live LIS fetch — Option A (REST/FHIR API), confirmed
directly over Option B (a direct read-only DB query — a real customer
security/access concern beyond PathScribe's own code) and Option C
(HL7 `QRY^R02`/`QBP^Q21` — a genuinely different, synchronous
request-response shape than anything else in this app's own
event-driven HL7 handling).

- **`IOnDemandCaseFetchService.ts` / `mockOnDemandCaseFetchService.ts`**
  — the real fetch, same real query pattern and TLS gate
  (`services/patientHistory/resolveIsSecureLisEndpoint.ts`, reused
  directly) as the patient-history work above. Deliberately a
  "targeted / lightweight fetch" per direct guidance — essential case
  metadata and current status only, never this patient's separate,
  cross-accession history (that's `services/patientHistory/`'s own
  job).
- **`resolveLocalCaseAvailability.ts`** — the pure Step 2 decision. A
  case with a real, pending `LisAmendmentNotice` is treated as a real
  cache miss even though it's technically still stored locally — the
  same on-demand fetch path handles a genuinely-never-seen case and a
  possibly-stale amended one, rather than needing two separate real
  mechanisms.
- **Wired into `components/Search/CaseSearchBar.tsx`** — the real
  navbar scan/type/dictate entry point (confirmed directly, not
  guessed). A zero-local-results search now falls back to the real
  fetch before ever telling the pathologist the case doesn't exist,
  with an explicit "Fetching Accession [ID] from LIS…" loading state
  distinct from the ordinary local-search spinner. A successful fetch
  calls the real, existing `caseRouter.createCase()` to cache the
  case locally, then navigates straight to it — exactly Step 4.2's
  own "so subsequent opens during that session are instant."

- **Real, new consumer (PS-287, Sep 2026):** `casePoolAssignmentService.ts`'s own `resolveCasePerformingLab()` — built for pool routing, but genuinely reusable as-is — is now also how `pages/AddOnOrderPage/hooks/useAddOnOrderStation.ts` resolves which real performing lab a pathologist's add-on order belongs to, per that ticket's own direct Jira comment ("must route to that case's own performing lab's queues — never a single, enterprise-wide queue"). Read-only; nothing in this folder's own files changed.
- **Real, new consumer (PS-288, Sep 2026):** `caseRouter.getAll(undefined, { bypassAccessControl: true, includeOrchestration: true })` — the same real call `computePendingBatchQueue.ts` already established — is now also how `services/facilityOpsDashboard/buildFacilityLookupMaps.ts` builds its own `accession -> Case.originHospitalId` and `caseId -> Case` lookup maps, shared across all five PS-288 department dashboard summary functions. Read-only; nothing in this folder's own files changed.

## `findRoutingRulePriorityConflict` (Batch 317, PS-73)

`casePoolAssignmentService.ts` exports `findRoutingRulePriorityConflict(rules, priority, excludeId?)`, used by the routing-rule editor (`components/Config/System/RuleModal.tsx`). Pass `excludeId` in edit mode only. The modal used to exclude whatever rule it was handed, which would have let a Duplicate skip the priority check. Duplicated rules take the next free priority (`services/duplication`).

## Batch 350: Search moved to `services/caseSearch/`

The Search page no longer lists cases through `getAll()`. It calls the case search service, which applies access rules before matching, sorting, counting and paging. So the short-page limitation noted under `CaseRouter.ts` above no longer affects Search; it still applies to cursor-paged `getAll()` callers.
- **`ICaseService.ts`**: `CaseFilterParams` keeps only what other callers use: `search`, `patientName`, `hospitalId`, `patientId`, `accessionNo`, `status`, `pageSize` and `cursor`. Its callers are the billing audit search and cytology patient history. The Search-only filters were removed so there is one implementation: demographics, date, status and priority lists, flags, protocols, pathologist, attending, specimen, diagnosis, codes, facility and `specialty`. Several of them never matched: diagnosis and `specialty` read fields that don't exist, and pathologist read only the assigned pathologist.
- **`caseFilterUtils.ts`**: those branches removed; pagination helpers unchanged.
- **`FirestoreCaseService.ts`**: its partial copy of those filters removed, along with the range-precedence and client-side specimen-flag code that only served them. It sorts by `updatedAt`. The stub is due to be replaced by the SQL Server API, so it wasn't extended.

## Batch 368 (PS-353)

`mockCaseService.updateCase`, its any-mode path (`updateCaseAnyMode`) and `mockOrchestratorCaseService.updateCase` call `reportChangeLog/recordCaseChange` after every write, with the case before and after and the fields written, so the report change log sees every save.

## Batch 371

`CaseRouter.getCase` checks `platform:cross-tenant-cases:view` (audited, "Capability allowed …") when PathScribe support opens a case from another organisation.

## Batch 372 (support access)

Support reaching another organisation's cases now also passes that organisation's support access policy (`services/supportAccess/supportAccessGate.ts`):
- **`getCase`:** refused without an approval (or when the organisation disabled support access), and the refusal or the open is recorded in the organisation's support audit stream, before the capability check.
- **`getAll` and `listCasesForUser`:** for a superadmin session, cases of organisations support can't reach are left out, and the case ids shown are recorded per organisation.
- **`updateCase`:** a support edit to another organisation's case needs an approval too, and is recorded.

## Batch 381: case and retention holds (`caseHolds.ts`, + test)

`placeHold(kind, …)` and `releaseHold(kind, …)` do what the two hold modals did inline, plus what they lacked. In order:
1. the note (Field Requirements, locked);
2. the capability (`case:hold:place` / `:release`, `case:retention-hold:place` / `:release`) for the case's facility;
3. the case's current holds, read fresh, refusing a second active hold;
4. a save against the case's version;
5. an audit entry ("Case hold placed (reason: …)", with no free-text note).

It returns the case's new version. **Fixed:** before, placing or releasing a hold moved the case's version on without the report page knowing, so the page's next save (a comment, a draft) was refused as someone else's change.

## Batch 395

`MOCK_VERSION` 46: S26-4405, S26-4412 and S26-4492 carry a `surgicalPeerReview.postSignOutPeerReviewFlag`, so the Surgical Post-Sign-Out QA queue has demo work for Pete Nimmo.

## Batch 396: one answer for a case you can't open

**Batch 396 (Pete's case privacy model, see `docs/architecture/CASE_PRIVACY_MODEL.md`).**
- `openCaseForView.ts` (+ `defaultOpenCaseForView.ts`) is the one decision for `/report/:caseId` and `/synoptic/:caseId`. A missing case, another organisation's case, a pool restriction, an Orchestration or pediatric restriction, and an error all return `{ caseData: null }`. The screen shows `components/CaseUnavailable`, and the reason is logged for support only. The old `?accessDenied=` redirect to the Worklist, and its toast naming the restriction, are gone.
- `CaseRouter.listLinkableAccessions()`: the accession numbers a message may link for the signed-in reader, only cases they can open. A superadmin gets only their own organisation's cases, so no support access is used or recorded to decorate a message.

**Batch 403.** `addOnOrderDemo.ts` adds demo add-on orders to S26-4401-BX-001 (Pete Nimmo's case), one at each stage: Requested, Block retrieved (a HER2 FISH send-out to Summit Molecular), Cut / pending stain, and an Exception waiting for the pathologist. `MOCK_VERSION` is now 47.

## Batch 417

The nine demo UK patients' `nhsNumber` fields became `nationalIdentifiers: [{ system: 'mrn_nhs', … verified }]` with correct check digits (the old values didn't pass mod 11).

## Batch 428: Configuration permissions

- `mockFppeAssignmentService`: `create`, `graduate` need `config:fppe:manage`. *(Batch 515: now checked by `quality/mockQaSupervisionAssignmentService.ts` for FPPE assignments.)*

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

`casePoolAssignmentService.ts`: saving the routing rules and settings needs `config:case-routing:manage`; "Run now" (`routeUnassignedCases`) needs `case:routing:run` and reports `refused` when it isn't held. FPPE assignments: `config:fppe:manage`.

## Batch 436

`mockCaseService.ts` (`MOCK_VERSION` '48', so the demo data reseeds):
- The Manchester orders MFT26-8801/8803/8805 name their facility (Manchester Royal Infirmary).
- S26-9101-CYT-001's status, 'complete', which is not a case status, becomes 'finalized'.

## Batch 441

- **The bug.** The built-in Cytotechnologist role listed no participation types, and a pool claim with none falls back to `primary`. So a cytotech claiming a pool case became its primary pathologist. Now:
  - `resolveEligibleParticipationTypeIds` drops pathologist types for a cytotech;
  - `resolveClaimParticipationType` falls back to `cytotechnologist` for one.
- **`saveCaseTeam.ts`** (`saveCaseTeam.test.ts`) is the Case Team save, moved out of `CaseTeamModal.tsx`:
  - checks the new `case:team:manage`;
  - refuses a cytotech in a pathologist slot;
  - moves `order.assignedTo` when the primary changes (`caseTeamUpdates`).
  - `withAssigneeOnTeam`: when the modal opens and the assignee isn't on the team, it adds them as primary, or as cytotechnologist for a cytotech (before this, always primary).
  - `caseTeamSaveDeps.ts` holds the real services.
- **`caseAssignmentSync.syncPrimaryAssignee`** takes an optional `isCytotech`. A cytotech who was primary is demoted to `cytotechnologist`, not the `attending` (co-signer) fallback. Delegation and the cytology review take pass it.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-71, PS-189)

`caseWriteConflictAudit.test.ts`: `CaseRouter.updateCase` writes a separate case-write-conflict audit entry. `casePoolAssignmentService.test.ts`: returning a case to the pool changes only pool, status, assignment and timestamp, never accession, patient or specimens. `mockCaseService.ts`: `updateCaseAnyMode` is exported for the test. **Open:** the two real callers of the mock case service's save still pass no expected version. *(Since closed: Batch 458 made the version required on every save, enforced by `caseWriteVersion.guard.test.ts` — checked in the Batch 496 README audit.)*

## Batch 455 — Demo baseline: people, pools, cases and the reset

- New `demoBaselineCases.ts`: 19 cases, appended to the seed (`MOCK_VERSION` 49). See its header and `docs/product/DEMO_GUIDE.md`.
- `listCasesForUser` now also returns a `pending-countersign` case to its active attending participant. Before, the case stayed assigned to the resident and the attending's Countersign tile never saw it.

## Batch 456 — Sign-in lockout, password screening, demo seeds

- `demoBaselineCases.ts`: autopsy cases A26-4660..4662, and a pending HPV co-test on S26-4650/4651/4652.
- `mockCaseService.ts` applies `withMaterialDemo` (decants and a matrix block) to the seed cases, and S26-9101's diagnosis names Fenwick's cytopathologist. `MOCK_VERSION` 50.

## Batch 457 — Metro General cancer registry, Molecular Order Queue seed

S26-4405 and S26-4490: ICD-O code, primary diagnosis and issue date, so the cancer registry submission can be rebuilt. `MOCK_VERSION` 51.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

- `caseWrite.ts`:
  - `updateCaseWithRetry` / `updateCaseWithRetryOrThrow`, for system saves: read, build the change from that read, save with its version; on a conflict read again and rebuild (3 tries). Never saves without a version.
  - `overwriteAfterConflict`, for "Save mine anyway": needs `case:edit-conflict:override`, saves against the newest version, and audits it.
  - `caseConflictRows`, for View changes.
  - `adoptSavedVersion`: a screen takes a saved version only when it was saved straight on top of its own.
- `caseWriteDeps.ts` wires these to the real services.
- `CaseRouter.updateCase` now requires the version.
- `caseWriteVersion.guard.test.ts` fails on any `.updateCase(` with fewer than three arguments. There is no allowlist: every one of the 85 unversioned saves found (39 files) was converted.
- `acceptPoolCase`: of two people accepting at once, only the first wins; the other is told "Another pathologist accepted this case first".
- `delegateCase` builds its team change from the newest case.
- `saveCaseTeam` refuses when the team itself changed since the modal opened (`teamChanged`).
- Tests: `caseWrite.test.ts`, `mockCaseServicePoolClaim.test.ts`, `saveCaseTeam.test.ts`.

## User guide: when someone else changes a case you're working on

*Written for the User Guide (Batch 458, PS-71). It applies to Assist and Orchestration cases alike, and to every save on the report page: the draft (synoptic reports, report sections, grossing) and the instant saves (specimen and case comments, flags, codes, priority, specimen and block details).*

**Your work is never lost.** PathScribe keeps a copy of what you've typed and not saved, updated every second. If your browser closes, the page reloads or you're signed out for inactivity, the next time you open the case it offers your changes back. When you restore them, they are fitted around anything saved since; they never replace someone else's newer work.

**What happens when you save after someone else did.** Every case has a version. When you save, PathScribe checks whether anyone (a colleague, or a system process such as an inbound result or a scan) saved the case after you opened it.

1. **Nobody did:** your save goes through, as always.
2. **Someone did, in other parts of the case:** nothing is saved yet. A box titled **"Someone else changed this case while you were working"** lists what they changed and what you're saving. For example: they changed *Case team, Specimens*; you're saving *Synoptic reports*. PathScribe compares down to the individual field: a comment on a specimen and a new block on the same specimen are different fields, and so are two different questions in one synoptic report. You choose:
   - **Save mine with theirs:** your change is saved and theirs stays. You can't undo another person's change from here.
   - **Not yet: show me their changes:** nothing is saved. The page now shows their changes with yours applied on top, still unsaved, so you can look them over, adjust your own, and save again. You don't need to leave the case or retype anything.
3. **Someone changed the very same field** (for example, you both edited the microscopic description): the **"Someone else changed this case"** box (Edit Conflict) opens:
   - **Keep working, decide later:** closes the box. Your change stays on the page, unsaved. Each save brings the box back until you reload or save yours anyway.
   - **View changes:** lists each part of the case that differs from the saved version, and whether saving yours would replace it ("Replaced by yours") or leave it as saved ("Kept as saved").
   - **Use their version** (Batch 577; was "Reload their version"): shows the saved case in place, without a reload. What you hadn't saved here is discarded, and the browser's draft copy with it, so it isn't offered back. To keep your work, use the notice's **Show their changes** instead (Batch 575).
   - **Save mine anyway:** saves your version of what you were saving over theirs: your draft (in Assist, all the synoptic reports; in Orchestration, the report sections, synoptic and grossing reports) and any instant change that stopped at this box. Everything else stays as saved. Only people allowed to override (Pathologist, Admin and Lab Director by default) can use it, and it is recorded in the audit log.
4. **Finalize, sign-out and amendment release** never offer "Save mine anyway". Use their version, look at their change, then sign.

**Messages you may see:**
- "Saved, together with the other person's changes."
- "Their changes are shown with yours on top, not saved yet. Save again when you're ready."
- "The case changed again while you were deciding. Nothing was saved; save again to see the latest."
- "Another pathologist accepted this case first." This appears when two people accept the same pool case at once; only the first is assigned.

**Not built yet:** the first person to open a case for editing holding it (others read-only; not specified). *Built in Batch 573:* who else has the case open, above the report's tabs, with whether they are editing and their work email and phone when the lab has them (`hooks/useCasePresence.ts`, `LIVE_UPDATES_SIGNALR.md` §15). *Built in Batch 572:* the live notice when someone saves the case you have open ("Someone else saved this case"; from Batch 575 "Show their changes" takes the newer case up in place, keeping unsaved work), from the hub's `caseReport` topic (`caseUpdateNotice.ts`, `hooks/useCaseUpdateNotice.ts`). These were planned for Batch 459 but have not been built; the report page has only an empty slot for the presence banner.

*Corrected in the Batch 496 README audit (Oct 9, 2026): case presence, the edit hold and the live update notice were listed as "coming in Batch 459"; none exists in the code yet.*

## Admin guide: concurrent editing (case versions)

*For the Admin Guide (Batch 458, PS-71).*

- **What it protects:** a save made from an old copy of a case can never silently overwrite a newer save, whether it's from a person or from a system process (interfaces, scans, batches, registry, sign-out side effects). Every save carries the version it was built from. This is the same version checking HL7 FHIR uses (ETag / If-Match), and it meets the "no silent overwrite, every change attributable" expectation of ISO 15189, CAP/CLIA, 21 CFR Part 11 and EU Annex 11.
- **System processes** never ask anyone. On a version clash they re-read the case and re-apply their own change to the newer copy, up to three times. If they still can't save, they report a failure: an interface message stays unprocessed and is redelivered. They never save without a version.
- **People** see the review box (other parts changed) or the Edit Conflict box (the same field changed), as described in the User guide above.
- **Permission:** `case:edit-conflict:override` ("Save over someone else's newer version") enables **Save mine anyway**. By default it is granted to Pathologist, Admin and Lab Director (Pete's decision: pathologists are the final clinical authority, and an admin-only override would hold up urgent addenda). You can change this in the Role Dictionary. Without it, people can still keep working, view changes, reload, or save alongside non-overlapping changes.
- **Audit log entries:**
  - `case.write.conflict` on every refused save;
  - "Concurrency conflict detected" when the Edit Conflict box opens;
  - "Concurrency conflict overridden", naming the version and the parts overwritten (not their content);
  - "Edit conflict overwrite refused" if an overwrite reaches the service without the permission (for example, the permission was removed while the box was open). For someone without it, the button is greyed out.
- **Pool cases:** of two people accepting the same pool case at once, only the first is assigned. The other is told, and the case isn't assigned twice.
- **Server requirement:** the API server must enforce the same versions (`docs/architecture/CASE_API.md`). The browser's checks protect the demo, but only the server can enforce them for everyone.

## Batch 458 — PS-71 (review before saving over someone else's save)

In `caseWrite.ts`:
- `mergeDraftParts` is field by field and record by record (by `instanceId` or `id`).
- `saveDraftParts(…, { review })` returns a `MergeReview` instead of saving a merge.
- `commitMergeReview`, `takeUpSavedCase`, `savePageChange` and `MergeReviewPendingError` are new.

The mock case stores take up saves made in another tab (`storage` event), tested in `mockCaseServiceCrossTab.test.ts`. The User guide and Admin guide sections above explain the behaviour for the guides.

## Batch 461: map answers on the prostate demo cases (`MOCK_VERSION` 52)

- **S26-4404** (needle biopsy): the Core results grid is filled from the microscopic description (cores A–C right apex/mid/base, carcinoma Gleason 3+4=7, Grade Group 2, 40/70/30 %; D–F left, benign).
- **MFT26-8804** (radical prostatectomy): the Anatomical map questions (Grade Group 3 in the right base, mid and apex peripheral zone; extraprostatic extension and a positive margin right posterolateral mid; no seminal vesicle invasion). Its other answers stay empty, so the AI suggestions demo is unchanged.

## Batch 462: breast map answers (`MOCK_VERSION` 53)

- **S26-4401-BX-001** (left mastectomy): side left; focus 1 invasive carcinoma at 2 o'clock, 3 cm, 23 mm; focus 2 DCIS at 2 o'clock, 3.5 cm, 4 mm; margins (invasive / DCIS mm): superior 15/18, inferior 40, medial 60, lateral 25, anterior 8/10, posterior 2.0/4.
- **S26-4405** (right lumpectomy, signed out): side right; DCIS 18 mm and calcifications at 10 o'clock, 4 cm; DCIS margins: superior 3, inferior 8, medial 12, lateral 5, anterior 4, posterior 6.

## Batch 463

Demo case **S26-4463** (`MOCK_VERSION` 54): Mohs, left nasal ala, parts A and B = stages 1 and 2 on one synoptic. Stage 1 (09:15, 3 blocks) residual tumour at 12 and 1 o'clock (block A, nodular BCC) and deep (block C, infiltrative BCC, perineural invasion); stage 2 (10:30, 1 block) clear; forehead flap.

## Batch 464

Demo cases (`MOCK_VERSION` 55): **S26-4464**, low anterior resection (tumour anterior and left, below the reflection, CRM 1.5 mm anteriorly, distal 25 mm, mesorectal plane); **S26-4465**, pedunculated malignant sigmoid polyp (Paris 0-Ip, Haggitt 2, stalk margin 0.8 mm).

## Batch 465

Demo case (`MOCK_VERSION` 56): **S26-4466**, a composite resection on one case — part A partial glossectomy (Oral Cavity Resection: right tongue and floor of mouth, deep margin 0.6 mm, peripheral 3 mm with high-grade dysplasia, depth of invasion 7 mm) and part B right selective neck dissection (Neck Dissection: IIa 2/6 with ENEma, III 1/5 with ENEmi, Ia, Ib, IIb and IV negative; 3 of 27).

## Batch 466

Demo case (`MOCK_VERSION` 57): **S26-4467**, a right radical nephrectomy.
- Upper pole, lateral, anterior.
- Extends into perinephric fat and the renal vein (pT3a).
- Renal vein margin involved, ureteral margin clear, soft tissue margin on ink.

## Batch 466d

`MOCK_VERSION` 58. The seeds follow the rebuilt Colorectal Local Excision margins:
- **S26-4465:** the carcinoma's margins are stored as calculated (deep, involved).
- **MFT26-8803:** map answers added, and the removed placeholder answers dropped.

## Batch 467 — In-house molecular orders

S26-4493 (lung) specimen A has block A1 with an EGFR mutation PCR add-on routed to the Molecular In-House Queue; its EGFR answers are left empty for the result to fill. MOCK_VERSION 59.

## Batch 469 — Autopsy: toxicology order seed, new GB_EW disposal-demo case (MOCK_VERSION 61)

New **A26-4664** (`demoBaselineCases.ts`): a `GB_EW` hospital-consented autopsy case with `organRetentionTier: 'tier_2_full_organ_retention'` and no disposal recorded, so the new organ-retention disposal panel has an HTA-governed case to demo against — every other seeded autopsy case is `US`, where `resolveHtaApplicability()` is false. A26-4663 (existing forensic case) gained a `toxicologyOrders` entry with `status: 'ordered'`, left with `ancillaryHold.active: false` so as not to disturb that case's own Batch 468 SLA demo narrative — disclosed, not an oversight. (MOCK_VERSION 60 → 61.)

## Batch 473 — Case-type key migration

`demoBaselineCases.ts`'s one `statutory_judicial`-authority seed case (A26-4663) updated in step with the `AutopsyCaseAuthority` rename: `'medicolegal_forensic'` → `'statutory_judicial'`. No behavior or seed-case change beyond the value itself. See `services/autopsy/README.md`.

## Batch 483 — fix: a cytology case's second specimen release was destroying the first's pending countersign record (PS-359 tracker follow-up)

`CountersignRecord`/`ICountersignService.release()` assumed one release covers a whole case at a time — true for surgical pathology (one release-everything action) and autopsy (one PAD/FAD at a time), never true for cytology, which signs out specimens independently (Batch 411). A second specimen's release was silently replacing the first specimen's still-pending record and its own `releasedAnswersSnapshot` — a genuine data-loss bug, not just a display gap.

**Fix:** `CountersignRecord` gains an optional `specimenId` field, set only by `signOutCytologyCase.ts`'s per-specimen sign-out — never by surgical pathology or autopsy, both of which always pass `undefined`. `mockCountersignService.release()`'s dedup filter (which replaces any existing `pending` record for the same case) now also requires the same `specimenId`, so `undefined === undefined` keeps every existing caller's behavior exactly unchanged, while two different cytology specimens' `specimenId`s no longer collide. New `mockCountersignService.test.ts` (no test file existed for this service before this batch) covers both the existing single-release-per-case behavior and the new per-specimen scoping.

**Disclosed, not fixed:** `getForCase(caseId)` still returns at most one record, so it only suits a case with a single pending release at a time (true for every current caller) — a future cytology caller needing more than one pending specimen's record at once should filter `getAll()` by `caseId` **and** `specimenId` instead (now documented on the interface). Also still open: no real UI/service path exists for an attending to explicitly complete a cytology specimen's countersign — see `services/cytology/README.md`'s own Batch 483 entry. *(Since closed: Batch 485 below — `signOutCytologyCase.ts` completes the specimen's record via `countersign()`; checked in the Batch 496 README audit.)*

## Batch 485 — completing a cytology specimen's own countersign (the deeper gap Batch 483 disclosed but didn't build)

Batch 483 fixed the data-loss bug (a second specimen's release destroying the first's record) but left the record itself orphaned at `'pending'` forever — nothing ever called `countersign()`/`reject()` for cytology, because `getForCase()`'s single-record contract doesn't suit a case where more than one specimen can be independently pending at once.

**Fix:** `ICountersignService.countersign()` and `.reject()` both gain the same optional `specimenId` scoping `release()` got in Batch 483 — `mockCountersignService`'s lookup for each now matches on it, so `undefined === undefined` keeps surgical pathology and autopsy (which never set one) completely unchanged, while a cytology caller completing or rejecting ONE specimen's record never touches a sibling specimen's own, separate pending record. New `getForSpecimen(caseId, specimenId)` — the per-specimen sibling of `getForCase`, for a caller (cytology) that genuinely needs to ask about one specimen rather than "the" pending record for the case.

`signOutCytologyCase.ts` now actually calls this: when a specimen being signed out has its own pending `CountersignRecord` (set when a resident or a new cytotechnologist under competency assessment was earlier intercepted — Batch 480/415), the signer completing it now (by definition not that same person, since the gate would re-intercept them) closes the record via `countersign()`, scoped to that specimen. This is the same "fires at the point every path shares" pattern `useSignOutWorkflow.ts` already uses for surgical pathology — the attending doesn't get a separate "review and countersign" screen; re-doing the normal sign-out on that specimen is what completes it.

**Also fixed:** `Case.status` no longer gets stuck at `'pending-countersign'` once nothing on the case is genuinely still pending. It was forced to that value at release time with no memory of *which* specimen caused it; once this specimen's own record closes, if no sibling specimen on the same case still has a pending record (checked via `getAll()`, filtered by `caseId`), the case reverts to `'in-progress'` — unless every cytology specimen is now signed out, in which case the existing finalize-to-`'finalized'` write takes priority as before. A sibling specimen that's still genuinely pending (its own, separate `CountersignRecord`) correctly keeps the case at `'pending-countersign'`.

**Scope note:** this closes the *completion* path (what was disclosed and asked for). The symmetric "Return to Trainee"/reject UI surgical pathology has is not built for cytology in this batch — `reject()`'s new `specimenId` parameter makes the service layer ready for it, but no cytology screen calls it yet; that would be new UI, not the disclosed gap.

Full suite and type-check: see `src/i18n/README.md`'s own Batch 485 entry for exact counts.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 511 (PS-478): full strict type-checking

`caseHolds.ts` sends the case version (`caseVersionOf`, 0 when missing) like every other case write. `CaseRouter` checks for a session before the cross-tenant support check. `getCaseAnyMode` is typed to return `null` as well as `undefined`.

## Batch 515 (PS-124)

`fppeEndCondition.ts`: `computeFppeProgress` takes any supervision assignment (`SupervisionProgressSubject`). The legacy FPPE service and type are deleted (see `DELETED_FILES.txt`).

## Batch 516

`demoBaselineCases.ts`: four Tumor Board / MDT demo cases, S26-4670..4673 (lung, colon, endometrium, pancreas). Their board listings are in `tumorBoard/tumorBoardDemoSeed.ts`.

## Batch 536 (PS-558)

The AI calls in `mockCaseService.ts` (synoptic suggestions, template assignment, grossing suggestions and template fit) pass their feature and facility to `callAi`, for the jurisdiction's AI vendor policy.

## Batch 572 (PS-539)

- `caseUpdateNotice.ts` (new): when an open case report shows that someone else saved the case (a newer version than the page knows, not dismissed), and when the notice is no longer news. `caseUpdateNoticeDeps.ts` wires the case, its support reference and the demo's cross-tab signal.
- `mockCaseService.ts`: `subscribeCasesChangedElsewhere` (another tab of this browser saved a case: the demo's stand-in for the hub's `caseReport` event).
- Reload after the notice is a full reload: with the API server the draft cache is in memory only, so unsaved changes are lost. Taking the newer case up in place is carried forward.

## Batch 573

- `caseEditingSignal.ts` (new): whether unsaved changes are the person's (not the page setting itself up after loading); the report page's unsaved-changes warning and presence's "editing" both use it.
- `caseUpdateNoticeDeps.ts`: the support reference comes from `supportReferences/caseSupportReference.ts`.

## Batch 575

- `caseWrite.ts`: `takeUpNewerCase` (stale / shown / overlap; draft parts and held changes merged, held changes rebased) and `orchestrationDiagnosticAfterTakeUp`.

## Batch 576

- `caseEditingSignal.ts`: `isPersonsDirtySection`, `isReportEditEvent` (the synoptic form), `editedAt` in `isPersonsEdit`: someone editing right after opening shows as editing.

## Batch 577

- `caseWrite.ts`: `takeTheirVersion` (the Edit Conflict dialog's "Use their version": the saved case exactly as saved, without a reload) and `selectionAfterTakeUp` (what stays open after taking up someone else's version).

## Batch 608

- `returnCaseToTrainee.ts`, `returnCaseToTraineeDeps.ts`: the attending's Return to Trainee for a cytology specimen (with `specimenId`) or an autopsy report (without). Feedback is required; the countersign record is rejected, the case becomes `returned`, and the trainee is the primary assignee again.

## Batch 615 (PS-481, PS-482)

- `httpCaseService.ts`: the API server's version of `ICaseService`, built from the shared HTTP kit: read one, list with filters and paging, a user's worklist, create, and a save with `If-Match` whose 409 becomes `ConcurrencyConflictError`. Calls: `docs/architecture/CASE_API.md` §6.
- `caseServiceInstance.ts`: `caseService` is the mock in the demo and the server's with an API address (`services/index.ts` re-exports it).
- `httpCaseService.test.ts`: 7 tests with a fake `fetch`.

## Batch 617 (part A): server versions (PS-514)

`countersignService`, `onDemandCaseFetchService` now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (the mock without an API server address, the server version with one). One route per interface method; the calls are listed in `docs/architecture/CASE_WORKFLOWS_API.md`. The mocks are unchanged. The instance file imports the mock, so a test that loads the mock first may need to load the instance first (the mock can reach `@/services`, which reaches the instance).

## Batch 651
`generateAiSuggestionsForReport` (`mockCaseService.ts`) drops suggestions below confidence 30 or off the template's option list (`aiIntegration/aiSuggestionRules.ts`).
Batch 651 (audit gaps): `poolCaseActions.ts` writes "Pool case claimed / passed" and "Pool claim hold taken / released" (the 30-second claim lock); `saveCaseTeam.ts` with the new `caseTeamAudit.ts` writes "Case team changed" (slot ids, no names); the new `postCaseComment.ts` builds, saves and audits case and specimen comments (moved out of `SynopticReportPage.tsx`, which got shorter; comment text is never audited). See `auditlog/README.md` for the event list. Tests: `poolCaseActions.test.ts`, `saveCaseTeam.test.ts`, `postCaseComment.test.ts`.

## Batch 652 — Specimen pipeline gaps

- **`poolAssignmentTimeout.ts`**: the caller for `RoutingConfig.assignmentTimeoutSec` (300 s by default). `assignmentWaitExpired` (pure), `expireUnassignedCases` and `startAssignmentTimeoutSweep` (scheduler used by the Worklist, `pages/WorklistPage/hooks/usePoolAssignmentTimeout.ts`). A case still unassigned and unpooled that long after grossing completed is routed with `routeCase`; a case a pathologist holds is never touched. Interim browser timer; a scheduled server function should replace it. Audit: "Case routed to pool after assignment timeout". Test (fake timers): `poolAssignmentTimeout.test.ts`.
- `Case.lockboxReceiptId` is written by the Lockbox link (below).

- Batch 664: `collaboratorCommand.ts` (pure) and `collaboratorVoice.test.ts`: "Add Collaborator [name]" matches one active staff member by first/last name (accents folded, titles dropped; none or several = nobody added), and `withCollaborator` adds them to the case team as a `consultant` (a removed member comes back as one record). The save is `saveCaseTeam` (case:team:manage, cytotech rule, newer-team protection), run by `pages/SynopticReportPage/hooks/useCollaboratorCommand.ts`.

- Batch 665: `collaboratorNotice` builds the message the new collaborator receives (an app notice sent through `messageService.send` after the team save; a failed send is reported and never undoes the add).

Batch 706 (Pete, Oct 28 2026, Provenance Over Confidence): grossing-assignment warnings and match tags no longer include confidence or match percentages (matchPct stays on the match record).
