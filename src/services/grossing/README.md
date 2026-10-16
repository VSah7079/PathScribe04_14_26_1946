# services/grossing/

Grossing: template routing evaluation types, plus the grossing workflow rules added since Batch 378 (Complete grossing, the report page's Gross Complete, margin/ink recording and the inking gates; see the batch entries below).

**Pattern:** The template *evaluation* has no mock implementation file here — this is intentional, not a gap (see below). The other files in this folder are pure rules and protected actions, not a mock service.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the folder is no longer types only; it also holds `grossingCompletion.ts`, `reportGrossComplete.ts`, `recordMarginInkApplication.ts`, `resolveInkingValidationSeverity.ts`, `inkingSiteSettings.ts`, `evaluateInkingGate.ts`, `jurisdictionInkingGateMessages.ts` and `recordInkingGateOverride.ts`.*

## Files

- **`IGrossingEvaluationService.ts`** — Its own comment explains: the real implementation is a plain function (evaluateGrossingTemplateAssignment) living in services/cases/mockCaseService.ts, matching the same pattern as evaluateSynopticAssignment. Only the types live here.
  - **NEW (August 2026)** — also holds `GrossingFitEvaluationInput`/`GrossingFitEvaluationResult`/`GrossingFitEvaluationSpecimen`, for a real, separate, later-stage evaluation: `evaluateGrossingTemplateFit` (same file in mockCaseService.ts). Real feature, per direct follow-up: "there is kind of a workflow that allows the Gross to be dictated and on submission, the AI reads the Text, and updates the template... Not sure if there is bearing here." Confirmed real bearing —
    `generateGrossingFieldSuggestionsFromDictation` already existed and already re-populates whatever template's fields it's given from the case's real dictated Gross text; what was missing was a trigger to re-evaluate which Grossing Template fits best once that real text exists (accession-time `evaluateGrossingTemplateAssignment` only ever runs once, before any dictation, from a much thinner signal). Mirrors `evaluateSynopticAssignment`'s own proven Stage 1 pattern exactly, one stage earlier in the pipeline — see `pages/SynopticReportPage/hooks/README.md` for the full, real, live-verified feature this powers.

## Notes

- Don't 'fix' this by adding a mockGrossingEvaluationService.ts — that would duplicate real logic that deliberately lives in mockCaseService.ts instead.

## Batch 397: matrix blocks and piece descriptions

`grossingBlocks` lists every block a per-block rule applies to: each specimen's own blocks, then the case's matrix blocks (by their own label). Matrix blocks used to be left out of the piece-count rule. The Grossing field requirements gain `pieceDescription` (optional). `blockGrossingFieldsMissing` gives one block's missing grossing fields for the block editors, which mark them; Complete grossing is what stops on them.

## Batch 398: the case report page's Gross Complete follows the Grossing rules

- `reportGrossComplete.ts`: `checkReportGrossComplete` applies the organisation's Grossing field requirements and `case:grossing:complete` to the report page's Gross Complete / Update Gross (orchestration cases), as `completeGrossing` does on the Grossing screen. Before, that button checked only that each specimen had some grossing entered, and had no permission check.
- Pete's choice: on the report page a specimen with a **Grossing template report** meets the "Grossing protocol attached" rule (`reportPageProtocolSatisfied`), since that page records grossing on templates. Blocks are still expected only of specimens with an attached protocol.
- With the protocol rule switched off, specimens with neither ask for confirmation and are routed for secondary review, as on the Grossing screen. An update never asks again.
- `specimensWithoutGrossEntry`: the page's existing "no grossing entered" rule, moved out of the hook.
- `grossingCompletion.ts`: the protocol test is now a parameter (`ProtocolSatisfied`, default: an attached protocol), and the deficiency raising is shared (`raiseGrossedWithoutProtocol`).

## Batch 480: Structured Inking, Module 1 — margin/ink data model, recording, severity (PS-359)

Pete's "Margin and Ink Application Data Model" requirement: margins are discrete entities (not physical specimen blocks), hierarchically attached at either the Tissue Block or the parent Specimen (see `types/case/Margin.ts`, `types/case/Specimen.ts`), each holding a polymorphic, append-only list of ink applications.

- **`recordMarginInkApplication.ts`**: checks `grossing:margin-ink:record`, then either creates a new `Margin` (with its first `MarginInkApplication`) on a specimen or block, or appends a new application to an existing margin by id — never overwriting a prior application or renaming/re-orienting the margin once created. Saves via `updateCaseWithRetry`; audits `MARGIN_INK_APPLICATION_RECORDED`.
- **`resolveInkingValidationSeverity.ts`**: the severity engine, mirroring `services/autopsy/resolveAutopsyGrossExaminationGate.ts`'s `{ allowed/blocked, reasons }` shape but as `{ issues, blocked }` since several issues can coexist on one case. Three tiers per Pete's own table: Severity 1 (Advisory, never blocks), Severity 2 (Corrective Warning — blocks only when the site's `inking_validation_mode` is `STRICT_ENFORCE`; `margin_not_examined` and `margin_no_ink_applied` are the two checks implemented this batch, both Severity 2), Severity 3 (Compliance Critical — always blocks, never site-configurable; reserved for a real structural export failure such as an unmapped ink colour code, not yet triggerable since there's no ink-colour palette to validate against yet).
- **`inkingSiteSettings.ts`**: `getInkingValidationMode(siteId)` (unrestricted read, defaults `WARN_ONLY`) / `setInkingValidationMode(siteId, mode)` (checks `config:inking-validation-mode:manage`), over the new `services/siteSettings/siteSettingsStore.ts`.

**Deliberately out of scope this batch** (per Pete's own choice when asked how much to build at once): the grossing-screen UI for recording margins/ink, and the ink-colour admin palette that would let Severity 3 actually trigger. Both are later batch(es), mirroring the autopsy module's own multi-batch (Modules 1–6) pattern.

## Batch 481: Structured Inking, Module 2 — the grossing-screen UI (PS-359)

The UI deferred above. `pages/GrossingScreenPage/GrossingScreenPage.tsx` gets a "Margins & Ink Applications" section per specimen, listing every margin (grouped by whether it lives on the specimen or a block) with its ink history, plus inline "+ Add margin" / "+ Add ink application" forms calling `recordMarginInkApplication.ts` through a new `useGrossingScreen.ts` handler, `handleRecordMarginInk`. See `pages/GrossingScreenPage/README.md`'s own Batch 481 entry for the full detail.

**Still deliberately out of scope (as of Batch 481):** the severity engine's advisory display (no real `Case` → `Site` link exists yet to read a site's `inking_validation_mode` from) and the ink-colour admin palette (needed for Severity 3 to ever trigger). Both resolved — see the Structured Inking Module 3 entry below.

## Batch 482 — Structured Inking, Module 3: the severity/palette follow-ons (PS-359 follow-up)

Both items Batch 480/481 deferred, per Pete's own explicit "Proceed to severity/palette follow-ons" instruction:

- **`services/inkColors/`** — the new ink-colour admin palette (`IInkColorService.ts`/`mockInkColorService.ts`), a flat/lab-wide dictionary (`InkColor`: id, name, code, active, createdAt, updatedAt) modeled on `services/cassetteColors/`'s own shape but deliberately simpler — no `key`/fallback-policy/performing-lab-scope fields; see that file's own header for why a margin ink colour doesn't need them. Admin UI: `components/Config/System/InkColorsSection.tsx`, capability `config:ink-color:manage` (`configLab` group, picked up by Admin/Lab Director through the `CONFIG_SECTIONS` auto-sweep — no `capabilitySeeds.ts` entry needed).
- **`resolveInkingValidationSeverity.ts`** gains the Severity 3 `margin_ink_color_unmapped` check, wired exactly as that file's own Batch 480 header comment promised: additive, via an optional `activeInkColorCodes` parameter, assigned severity 3 directly (never through `DEFAULT_SEVERITY`). Omitting the parameter reproduces Batch 480's behavior exactly.
- **`inkingSiteSettings.ts` re-scoped from Site to Facility.** Batch 480/481 kept `inking_validation_mode` keyed by a real `Site.id`, which turned out to be a real, confirmed architecture gap: nothing in this app ever resolves a real `siteId` for a case. Asked (via `AskUserQuestion`) whether to re-scope to `facilityId` now — mirroring the one real, working facility-scoped precedent already in this app, `services/organMapping/organMapConfig.ts`'s `OrganMapSchemeScope` — or defer the whole advisory display again until the Organisation/Site admin UI exists, Pete chose to re-scope now. `getInkingValidationMode`/`setInkingValidationMode` now take a `facilityId` (`Case.order?.facilityId`, the real, current ordering-facility link); the underlying generic store (`services/siteSettings/siteSettingsStore.ts`) needed no change — it was already keyed by whatever id string is passed in.
- `pages/GrossingScreenPage/GrossingScreenPage.tsx`'s margin/ink forms now pick from the active ink-colour palette via a `<select>`, and show the severity engine's real, current issues per margin plus the site's own WARN_ONLY/STRICT_ENFORCE mode notice. **Display only** — this does not change what blocks Complete grossing (`grossingCompletion.ts`); wiring Severity-3/STRICT_ENFORCE enforcement into the actual sign-out gate is further, separate scope, not attempted this batch.

**Noted, not built this batch:** a much larger Severity-3 ink-colour validation spec was proposed mid-batch (facility-scoped `InkColourPaletteEntry` with jurisdiction rules, FHIR export coding, a separate `CaseInkUsage` entity, real `POST /inking/validate`/`POST /inking/override` REST endpoints with RBAC, and an immutable override audit trail). Per Pete's own choice, this batch ships the simpler palette/severity-3 wiring above instead; the larger spec is logged as its own future Jira item (see PS-359's own tracker) for when the real ASP.NET Core/SQL Server API server exists to hold its migrations and endpoints — this frontend repo has no server project to put them in today.

## Batch 484 — Structured Inking Sign-Out & Grossing Gate Logic Engine (PS-519 follow-up)

The larger spec Batch 482 deferred (see its own note above), now built for its frontend-buildable half — the real `POST /inking/validate`/`POST /inking/override` REST endpoints, server-side RBAC on them, and the real `dbo.InkOverrideAuditLog` SQL table remain genuinely backend-only (no API server exists yet).

- **`evaluateInkingGate.ts`** (+ test) — the real gate-engine decision, a pure function wrapping `resolveInkingValidationSeverity.ts` with a genuine `GateActionContext` split (`'GROSSING_COMPLETE'` | `'SIGN_OUT'`) and fail-closed `PALETTE_UNAVAILABLE` handling (a palette that couldn't be read, or wasn't supplied, blocks both gates — never silently treated as clean). Gate A (`GROSSING_COMPLETE`): Severity 3 hard-blocks with no bypass, ever; Severity 2 is a soft "Proceed with Advisory Note" warning, never a hard block, regardless of `inking_validation_mode`. Gate B (`SIGN_OUT`): Severity 2 never blocks (advisory only, in either mode); Severity 3 hard-blocks a standard role, or offers `OVERRIDE_REQUIRED` to an override-eligible one (`admin`/`lab-director` — "Clinical Admin, Lead Pathologist" in Pete's own spec, mapped onto this app's real role ids).
- **`jurisdictionInkingGateMessages.ts`** — maps this app's real, existing `Jurisdiction` type onto the spec's six regulatory profiles (`US_CAP`/`KR_MFDS`/`UK_RCPATH`/`CA_IQMH`/`ANZ_RCPA`/`EU_IVDR`) rather than inventing a second jurisdiction vocabulary, plus each profile's regulatory citation (data, not translated prose) and the translated blocking-message i18n key.
- **`recordInkingGateOverride.ts`** (+ test) — the real enforcement + audit half of the Administrative Override action (`case:inking-gate:override`, new capability — `capabilityCatalog.ts`/`capabilitySeeds.ts`, seeded to Admin and Lab Director only). Records an `InkOverrideAuditLogEntry`-shaped, PHI-safe audit entry via `mockAuditService`. Only ever reachable for Severity 3 at Gate B.
- **Gate A wired for real**, closing the gap Batch 481/482's own README entries both flagged ("display only — this does not change what blocks Complete grossing"): `pages/GrossingScreenPage/hooks/useGrossingScreen.ts`'s `handleCompleteGrossing` now runs `evaluateInkingGate` before `completeGrossing` — see `pages/GrossingScreenPage/README.md`'s own Batch 484 entry.
- **Gate B wired for real**: `pages/SynopticReportPage/hooks/checkInkingSignOutGate.ts` (new, mirrors `checkStainQcGate.ts`'s own shape) is checked at both Sign-Out call sites in `useSignOutWorkflow.ts`, alongside the existing stain-QC/mismatch/peer-review gates — see `pages/SynopticReportPage/README.md`'s own Batch 484 entry.
- **`inkingSiteSettings.ts`**: `setInkingValidationMode` now takes an optional `actorName` and records an audit entry when the mode actually changes — its own capability catalog description already promised "Audited," never wired until this batch's own first real UI caller (`components/Config/System/InkingValidationModeSection.tsx` — see `components/Config/System/README.md`'s own Batch 484 entry) surfaced the gap.

**Also in this batch (tracker Section B, "previously scoped gaps"):** the "Case tile photo" quick fix (`pages/PathologyWorkspacePage/PathologyWorkspacePage.tsx` — see `pages/README.md`) and the "Organisation/Site admin UI, full build" (resolved to the `inking_validation_mode` settings screen above — the only genuinely missing piece, per this batch's own research; Facility already has a comprehensive admin UI). **Dropped from this batch:** "Sign-out gate bug" — an exhaustive, fresh search of every sign-out gating code path, test and doc found no locatable, disclosed bug matching that description (170/170 gate tests passing, no matching deficiency note anywhere); Pete's own clarifying answer turned out to be further Structured Inking spec detail (the ink-colour dictionary/severity-tier/jurisdiction-messaging content folded into the items above), not a bug description, so this item needs Pete's own description of the actual bug before it can be worked.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 378: Complete grossing (PS-359)

`grossingCompletion.ts` (+ test):
- **`completeGrossing(case, requirements, version, deps)`** moves a case from Accessioned (or Draft) to Gross Complete. First it checks the organisation's Grossing field requirements; then it checks `case:grossing:complete` for the case's facility. Finally it saves the status and writes a "Grossing completed" audit entry. A version conflict is passed back for the page to show.
- **`missingGrossingItems`** lists what's still required, and where: specimens (A, B) or blocks (A1, A2).
- **`canCompleteGrossingFrom(status)`** says whether the case is still waiting for grossing.

Before this, no code moved a case to Gross Complete; only demo data had that status.

## Batch 379: the protocol rule, switchable per organisation (PS-359, Pete)

- **`protocol`** is a new Grossing field requirement, required by default. An organisation can switch it off in Field Requirements.
- **`completeGrossing(…, options)`**: with the rule off and specimens lacking a protocol, the first call returns `needsConfirmation` with their labels. This happens before any capability check or change. Called again with `{ confirmedWithoutProtocol: true }`, it checks `case:grossing:complete`, completes, and audits "Completed without a protocol: specimen(s) B; routed for secondary review". Then it raises an open `def-grossed-without-protocol` deficiency for each such specimen through the injected `raiseDeficiency`.
  - A deficiency that can't be raised doesn't undo the completion. The result lists it in `reviewNotRaised`, the page tells the user to raise one by hand, and a "Secondary review not raised" audit entry records it.
- **`blocksExpected(specimen)`**: the block rule applies only to a specimen with a protocol and no decants.
- **`specimensWithoutProtocol`**, **`protocolRequired`** and **`specimensForSecondaryReview`**: pure helpers the page uses to say, before completing, which specimens will be routed.
