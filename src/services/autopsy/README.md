**Batch 649:** `signAutopsyReport.test.ts` updated for the removal of `admin-override` from `canFinalizeCase` (`services/auth/`); no autopsy code changed.

# services/autopsy/

Autopsy Pathology Module (PS-261, RFP-APLIS-2026-GLOBAL §3.1.C) — case authority (forensic vs. hospital-consented), the legal hard-stop gate for gross examination, temporary accession, mortuary storage occupancy, and jurisdiction-specific consent/HTA rules. The core type, `AutopsyCaseDetails`, lives in `types/autopsy/` — see that folder's own README.

**Pattern:** deliberately NOT the standard interface/mock/firestore pattern — this folder is a set of small, focused pure functions (each its own file, each with its own test file), not a CRUD service. There is no `mockAutopsyService.ts`; `AutopsyCaseDetails` attaches directly to the real `Case` type (`Case.autopsy?: AutopsyCaseDetails`) and is persisted the same way any other case data is.

## What's real and built

- **`resolveHtaApplicability.ts`** — whether organ-retention tracking applies to a case's jurisdiction. Strictly scoped to the three real, named acts (Human Tissue Act 2004 → `GB_EW`/`GB_NIR`; Human Tissue (Scotland) Act 2006 → `GB_SCT`; Coroners Act 2006 → `NZ`) — `false` everywhere else, never guessed for an unnamed jurisdiction.
- **`resolveConsentingRelativePriority.ts`** — jurisdiction-specific consent priority order (US common UAGA pattern, UK HTA 2004, NZ Coroners Act 2006) plus `resolveHighestPriorityConsentingRelative()`. Explicitly decision support, never a silent gate; the US's own single `Jurisdiction` value can't capture real state-by-state variation, and this file says so.
- **`resolveAutopsyGrossExaminationGate.ts`** — the real legal hard-stop (PS-261 §2.5.1: consent/authority documentation; earlier revisions of this file cited "RFP §III.2," a sub-section numbering that doesn't appear in Pete's actual URB-2026-09 requirements text on PS-261 — corrected per the project's verify-don't-trust rule). Forensic path requires a real, non-empty written order reference and date; hospital-consented path requires real, active consent, hard-blocking only on a `status: 'revoked'` (Batch 468 — see "Batch 468" below for the structured `status`/`excludedOrgans`/`retentionPermitted` fields that replaced the old, conflated `revokedOrNarrowedAt`). Only ever gates gross examination itself — never intake/refrigeration.
- **`resolveAutopsyAccessionStatus.ts`** — `'temporary' | 'fully_authorized'`, sharing the exact same authorization criteria as the gross-exam gate (never a second, divergent definition of "authorized").
- **`resolveAutopsyIntakeFormValidation.ts` / `buildAutopsyCaseDetailsFromIntakeForm.ts`** — minimal bar for temporary accession: forensic cases need a real, logged verbal order (never the written one); hospital-consented cases need nothing beyond jurisdiction — a body is never blocked from being received while a family decides. Originally built for the now-retired standalone `components/Autopsy/AutopsyIntakeForm.tsx`; called directly by `pages/AccessionPage/AccessionPage.tsx`'s own `autopsyRelevant`-gated section instead — see that folder's own README for the retirement.
- **`resolveAutopsyAuthorizationCompletionValidation.ts` / `applyAutopsyAuthorizationCompletion.ts`** — the pure logic behind `components/Autopsy/AutopsyAuthorizationCompletionForm.tsx`. Validates exactly what `resolveAutopsyGrossExaminationGate.ts` itself requires (the real written order for forensic cases, the real consent grant for hospital-consented cases) and merges it into a case's existing `AutopsyCaseDetails`, preserving whatever was already on file from intake (the real verbal order, the real point-of-contact relative) rather than overwriting it.
- **`resolveMortuaryStorageOccupancy.ts`** — RFP §IV Tier 1 ("available storage slots"). Real, confirmed correction (per direct follow-up: "Isn't the body usually the specimen? And we track specimen level!") — an earlier version of this file invented a parallel `AutopsyStorageAssignment` log to track where a body is. That duplicated infrastructure that already existed: a body IS a `Specimen`, and `Specimen.locationHistory: MaterialLocation[]` (`types/case/Material.ts`) already tracks exactly this, fed by the same real `processMaterialLocationEvent.ts` pipeline this module's own `assetLocation/` work already wired the Asset Location Dictionary into. Occupancy is now correctly determined by whether a real `storage_slot` is some specimen's own current (most recent, by timestamp) location — matched by case-insensitive name against `assetLocation/`'s dictionary, the same matching `findOrCreateByName` already uses. No explicit "release" event needed: a specimen moving to a new location automatically frees the old one.
- **`resolveAutopsyBodyReleaseGate.ts`** — the item 4 gate (RFP §3.1.C's own "regulatory chain-of-custody tracking"; no more specific written spec exists for release mechanics, confirmed directly against PS-261 — this was scoped fresh, not looked up). Requires a real, signed `padSnapshot` (the preliminary diagnosis, never the FAD — real-world practice never holds a body for weeks-long histology/toxicology turnaround), and blocks conservatively while `ancillaryHold.active`. Deliberately does NOT block on `organRetentionTier`/`organRetentionDisposal` — real, authorized retention is a parallel process, not a release blocker.
- **`buildAutopsyBodyReleaseLocationEvent.ts`** — the actual release event: a `MaterialLocation` entry (`location` = the external destination, e.g. a funeral home; `action: 'Released'`) meant to be appended to the body's own `Specimen.locationHistory`, per this module's own "body is a specimen" architecture. Deliberately NOT run through `processMaterialLocationEvent.ts`'s own Asset Location Dictionary lookup — that dictionary is for real, governed INTERNAL locations; a funeral home or "released to family" is a real, external destination outside the facility entirely. Kept as a separate, decoupled function from the gate above — only ever called after the gate confirms release is allowed.
- **`releaseAutopsyBody.ts`** — the real orchestration wiring the two functions above together: fetches the real case via `caseRouter`, re-checks the gate server-side (never trusts a UI's own earlier check alone — the case may have changed since), appends the built event onto the real, target specimen's own `locationHistory` (every other specimen untouched), and persists via `caseRouter.updateCase()` — never a second, parallel persistence path. Returns an honest `{ ok: false, error/blockedReasons }` for an unknown case, an unknown specimen, or a failed gate, and never calls `updateCase` in any of those cases.
- **`resolveAutopsyTatSlaMatrix.ts`** — RFP §4 turnaround-time/SLA lookup table.
- **`resolveSpecimenCollectionDisplay.ts`** — collection date/time display with coronial fallback.
- **`signAutopsyReport.ts`** — the real PAD/FAD sign-out action, fetch→gate→persist. Reuses `resolveResidentCountersignRequired.ts` for the same real trainee-oversight gate the rest of this app already uses. PAD signing never changes `CaseStatus` (an interim milestone, not a case-terminal event); FAD signing transitions to `finalized`. See "Real, per direct follow-up... wire in Autopsy" below for this session's own real additions to this file.

## Real, deliberate scope not yet built

*Rewritten in Batch 495 after checking each item against the current code: four of the six bullets that stood here had since been built (Batches 456, 469, 475, 476) without this list being updated. What was closed, and where, is listed under "Closed since this list was written" below.*

Still open (all front-end, none blocked on a backend):

- **Organ/tissue retention custody chain** (PS-261 §2.4) — built in Batch 611 (#59): `organRetentionHistory` keeps every retention detail recorded (appended to, never rewritten; the first change seeds it with the earlier single record), the retention panel lists earlier records and the timeline shows each move.
- **Per-field organ tagging within the gross-exam template** — only whole grossing SECTIONS are organ-derived (`resolveActiveAutopsyGrossingSections.ts`), and only specimens carry an `AutopsyOrganCode`. The consent-scope check (`resolveExcludedOrgansPresent`, Batch 468) works at that granularity; a per-finding hard block isn't representable in the current template data model.
- **Sub-national jurisdictional appointments** — forensic sign-out authority is checked per country, not per county/state/coroner's area (see the Batch 331 section below).
- **Three-tier BI/reporting dashboards** (PS-261 §2.6.3) — not started.

### Closed since this list was written

- **Toxicology specimen barcode and custody** — Batch 475: `AutopsyToxicologyOrder.specimenBarcode` (required) and a custody-log link to a specific toxicology specimen (`custodyEventsForToxicologyOrder()`).
- **Body release unified with the custody log** — Batch 469: `releaseAutopsyBody.ts` appends the final custody entry for a forensic case in the same versioned save as the release event, and writes the audit entry.
- **One timeline for consent, custody, toxicology, retention and disposal** — Batch 476: `buildAutopsyCaseTimeline.ts`, shown by `AutopsyCaseTimeline.tsx` on the report page.
- **Autopsy case listing** — the worklist has had an Autopsy tab since Batch 456 (three seeded demo cases).
- **"Ready for Body Release" banner in English** — translated (`autopsyBodyRelease.bannerTitle`/`bannerSummary`); see `pages/SynopticReportPage/README.md`.
- **Body-release gate reasons in English** — Batch 495, below.

## Real, per direct follow-up ("wire in Autopsy"): Autopsy joins the Report_Released_Event infrastructure (Components A, B, C)

Real, per direct investigation before assuming anything needed building: unlike Cytology, Autopsy needed no separate, extracted dispatch function. `Case.synopticReports` is a universal, non-specialty-specific field (`types/case/Case.ts`) — an Autopsy case's own gross/tissue-submission specimens are real `SynopticReportInstance`s just like any Surg Path case. `services/reports/dispatchCaseInstances.ts` and `dispatchPreliminaryCaseInstances.ts`, completely unchanged, already process an Autopsy case's own specimen dispatch correctly.

The real, narrower gap: `services/reports/buildOruR01Payload.ts` never knew to look at `caseData.autopsy`'s own real snapshot data — an Autopsy case never populates `Case.diagnostic`, the only thing that function read before this change. And `signAutopsyReport.ts` never called the publish event at all — zero dispatch logic existed for Autopsy anywhere before this update.

- **`buildOruR01Payload.ts`** gained `narrative.autopsySections` — populated only when `caseData.autopsy` exists, reading the *correct* real snapshot for the dispatch's own result state: PAD's own frozen sections (`AutopsyReportSnapshot.frozenPayload.sections`) for a `PRELIMINARY` dispatch, FAD's for `FINAL` — never falls back to the other, even when both exist (directly tested). Kept as its own, dedicated field rather than force-mapped onto Surg Path's fixed `grossDescription`/`microscopicDescription` fields, since an autopsy report's own real section labels are variable, not a fixed set.
- **`signAutopsyReport.ts`** now calls `publishReportReleasedEvent` after a real PAD or FAD snapshot is genuinely persisted — never for a provisional-hire sign that gets intercepted for countersign, since there's no real snapshot yet to report in that case. PAD signs as `PRELIMINARY` (an interim milestone, matching this file's own already-established "PAD never changes CaseStatus" posture); FAD as `FINAL` (the case's own real terminal event). Accepts an optional `generatePdf` callback, same established pattern as `services/reports/releasePreliminaryReport.ts`.
- **`pages/SynopticReportPage/SynopticReportPage.tsx`**'s Sign PAD/Sign FAD handler now passes its own real `generateReportPdfSnapshot` through — the same real PDF mechanism Surg Path's own Preliminary release and Final sign-out already use, since Autopsy cases are viewed and signed on this exact same page.
- **Real, immediate effect**: an Autopsy case now genuinely passes through Component B (print) and Component C (delivery rules) for the first time, exactly like Surg Path and Cytology. Because Autopsy reuses the real, existing `SynopticReportInstance`/PDF-generation infrastructure rather than needing anything new, its print path is already fully real today — unlike Cytology, there's no separate, known PDF gap here.
- **Not verified live this pass** — no seeded Autopsy case exists in this environment (Autopsy cases are created fresh via the Accession flow), and building one from scratch through that flow just to reach a genuine PAD/FAD sign wasn't attempted. Relying on the direct, layered unit coverage instead: `buildOruR01Payload.test.ts`'s new tests confirm the right snapshot is read for the right dispatch type; `signAutopsyReport.test.ts`'s new tests confirm the publish call fires correctly (or doesn't, for a countersigned release) with the right report type and arguments.

## Signing authority for PAD/FAD (Batch 331, PS-327)

Before this batch, anyone who reached the Sign PAD / Sign FAD button could sign. `signAutopsyReport.ts` now runs the same checks as Surgical Pathology, plus a forensic one (Pete's direction).

1. **Countersign first.** A resident or provisional hire is routed for countersign rather than refused. It uses the same configured countersign types as Surgical Pathology: `resolveCountersignRequiredTypeIds`, per lab and per country.
2. **Signing authority for everyone else.** `canFinalizeCase` checks the per-lab `authorityOverrides` and the PS-341 country profiles.
   - **Country profile:** per Pete, the country profile comes from the case's legal/coroner jurisdiction (`autopsy.jurisdiction`), not the performing lab's country. It falls back to the lab's country if the case has none.
   - **Lab overrides still win.**
3. **Forensic cases** (`caseAuthority: 'statutory_judicial'`) also need an **active jurisdictional appointment**.
   - **What counts:** a provider credential that normalizes to `FORENSIC_AUTOPSY_SIGNOUT`, for the case's jurisdiction, inside its effective and expiry dates. The rule is `resolveForensicSignOutAuthority.ts` (new, pure, with tests).
   - **Where it's read:** from the signer's staff record at the moment of signing.
   - **No admin override:** an administrator account can't sign a forensic report unless it is appointed.
   - **Recording an appointment:** Staff → edit → **Jurisdictional credentials & appointments**.

- **Error codes:** results now carry an `errorCode` (`NOT_AUTHORIZED`, `NO_FORENSIC_APPOINTMENT`, `PAD_REQUIRED` and others). The page shows translated text for each.
- **Checked in the browser:**
  1. A forensic US case was refused for the demo admin with no appointment.
  2. With a US medicolegal appointment on the staff record, the PAD signed and the FAD banner appeared.
- **Tests:** `signAutopsyReport.test.ts` gains 4 tests:
  - non-participant refused;
  - attending signs a hospital case with no appointment;
  - forensic case refused without an appointment, with the wrong jurisdiction, and when expired, then allowed;
  - resident on a forensic case still routed for countersign.
- **Not done:**
  - **Sub-national appointments.** Jurisdictions are country-level, so this stops cross-country sign-out but not cross-county. A US medical examiner's county or state, or a coroner's area, would need a region on both the case and the credential. Pete agreed this is a follow-up.
  - **Still-English text.** The adjacent "Ready for Body Release" banner on the report page is still English. It's outside this change. *(Since closed: the banner is translated — see "Closed since this list was written" above.)*

## Batch 383 (PS-359)

- **`releaseAutopsyBody.ts`** needs `autopsy:body:release` for the case, before it fetches anything; a refusal returns `{ ok: false, notPermitted: true }`.
- **`resolveAutopsyAuthorizationCompletionValidation.ts`** takes the organisation's Field Requirements as an optional third argument (defaults: the same order/date/consent-time rules as before, and the consent scope optional). Its `missingFieldIds` are now Field Requirement ids (`autopsyOrderReference`, `autopsyOrderDate`, `autopsyConsentGivenAt`, `autopsyConsentScope`).

## Batch 437

`resolveAutopsyGrossingRequiredFields.ts` takes `isVisible` from `services/templates/fieldVisibility.ts` instead of a component file.

## Batch 456 — Sign-in lockout, password screening, demo seeds

Three demo autopsy cases at Metro General (`services/cases/demoBaselineCases.ts`): A26-4660 (accessioned, Pete), A26-4661 (preliminary diagnosis drafted, ready for Sign PAD, Pete, with Connor Whitlock as PA) and A26-4662 (PAD signed and body released, brain fixing, final diagnosis to sign, Sarah Johnson). They show on the worklist's Autopsy tab.

**Superseded statements above:** "No Autopsy worklist/case-listing UI exists yet" is out of date (the worklist has had an Autopsy tab since then), and "no seeded Autopsy case exists" is no longer true.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

Body release and PAD/FAD signing are versioned. A signature is refused if the report content on the newest case differs from what was signed.

## Batch 459

**Superseded statement above:** the authorization-completion form is wired. The report page opens it for an autopsy case and saves the result to the case (`handleAutopsyAuthCompletionSubmit`). What is still open is a document-backed consent record (the signed form attached, with an append-only history) and a chain-of-custody log. *(Since closed in part: the chain-of-custody log exists — `recordAutopsyCustodyTransfer.ts`, Batch 468; checked in the Batch 496 README audit.)*

**Correction (Batch 468):** this note said both were "planned for Batch 462." Batch 462, per the project's own changelog, actually shipped breast organ maps and test time limits — unrelated. Nothing happened on either item in the interim; both are addressed directly below, in Batch 468, instead.

## Batch 468 — Consent-scope enforcement, forensic chain-of-custody (PS-261 §2.4.3, §2.5.1, §3.3; Pete, Oct 6)

Closes two of the items Pete chose from PS-261's remaining gaps (toxicology ordering/results and organ-retention disposal recording followed in Batch 469 — see below).

**Consent-scope enforcement.** Before this batch, `HospitalConsentRecord.consentScope: string[]` was captured and stored but never read by any code path anywhere — pure decoration (confirmed by a repo-wide search). Two new structured fields make it real:
- **`status: 'active' | 'narrowed' | 'revoked'`** replaces the old, conflated `revokedOrNarrowedAt` timestamp. `resolveAutopsyGrossExaminationGate.ts` now hard-blocks only on `'revoked'` — `'narrowed'` consent proceeds to gross exam, with its own constraints enforced below.
- **`excludedOrgans: AutopsyOrganCode[]`** — organs the NOK's consent excludes. `resolveExcludedOrgansPresent()` (new, `resolveAutopsyConsentScopeViolation.ts`) flags any excluded organ actually present among the case's specimens; `SynopticReportPage.tsx` shows this as a warning banner. Honestly bounded: the grossing template has no per-field organ tag, only whole sections derived from specimen organ codes, so this is a clear warning, not a per-finding hard block — the file's own header comment says why.
- **`retentionPermitted: boolean`** — whether consent permits retention beyond the diagnostic gross exam. `resolveRetentionTierConsentCheck()` hard-blocks `organRetentionTier` from moving beyond `'tier_0_no_retention'` when this is false or consent is revoked — the one real write site for that field (since Batch 499 `recordAutopsyOrganRetentionTier.ts`; before that the report page's `handleOrganRetentionTierChange` wrote it directly), so the one real place this is enforced.
- Both new fields are captured on `components/Autopsy/AutopsyAuthorizationCompletionForm.tsx`, alongside the existing free-text `consentScope` (kept as the human-readable record of what the NOK actually said — not what's enforced).
- Neither check is a capability/authorization check — whether an organ is excluded or retention is permitted is a clinical fact about the consent on file, not a permission about the user, same reasoning as the gross-exam gate itself.
- **Not done (at the time of this batch; closed in Batch 469 below):** no UI yet to narrow or revoke an already-granted consent after the initial authorization-completion submit.

**Forensic chain-of-custody.** Before this batch, no custody-log data structure existed anywhere (confirmed by a repo-wide search for custody/evidence/medical examiner/law enforcement) — only `releaseAutopsyBody.ts`'s single one-shot `MaterialLocation` event, with no recipient role, no "who received it," and — a separate, pre-existing gap this batch also fixes — no audit-log write at all.
- New `AutopsyCustodyTransferEvent[]` (`AutopsyCaseDetails.custodyLog`, append-only) — item description, who held it, who it was transferred to (by `AutopsyCustodianType`: pathology department, medical examiner, law enforcement, funeral home, family, other), who released it, who received it.
- **`recordAutopsyCustodyTransfer.ts`** (new) — same orchestration shape as `releaseAutopsyBody.ts` (capability check, fetch, re-check, append, version-safe persist), plus the one thing `releaseAutopsyBody.ts` itself was missing: a real audit-log write (`AUTOPSY_CUSTODY_TRANSFER`), the same choke point (`mockAuditService.logEvent()`) every other audit trail in this app already uses. Forensic-only: refuses on a hospital-consented case.
- `resolveCurrentAutopsyCustodian()` derives "who holds it now" from the log's last entry, defaulting to the pathology department for the first transfer.
- New capability `autopsy:custody:transfer` (high risk; same default roles as `autopsy:body:release` — never reusing that capability, a distinct action).
- `SynopticReportPage.tsx` (forensic cases only): a read-only custody-log list plus a "Record Custody Transfer" form.
- **Not done:** body release (`releaseAutopsyBody.ts`) is still a separate, one-shot `MaterialLocation` event — not unified with the new `custodyLog`, so a forensic case's full custody picture today is the `custodyLog` for in-process transfers plus the specimen's own `locationHistory` for the final release. Unifying them is a real, well-scoped follow-up, not attempted here to keep this batch's risk bounded (it would mean changing `releaseAutopsyBody.ts`'s own tested behavior). *(Since closed: Batch 469, `releaseAutopsyBody.ts` appends the final custody-log entry in the same save — checked in the Batch 496 README audit.)*

**Demo seed.** `services/cases/demoBaselineCases.ts`: A26-4661's consent is now narrowed with `excludedOrgans: ['brain']`, and its body specimen's `organCodes` include `'brain'`, so the new warning banner is demoable. New **A26-4663** — a `medicolegal_forensic` case (County Medical Examiner order, no `hospitalConsent`) with one `custodyLog` entry already on record, so the new custody panel has a real forensic case to demo against (`MOCK_VERSION` bumped to `'60'`). The `retentionPermitted:false` hard block has no seeded demo path: the `organRetentionTier` control only shows for an HTA-governed jurisdiction (`resolveHtaApplicability.ts`: UK E&W/NI/Scotland, NZ), and every seeded autopsy is US — covered by `resolveAutopsyConsentScopeViolation.test.ts` instead. See `docs/product/DEMO_GUIDE.md`.

**Review fixes.** An independent review before delivery found the custody log's timestamp was shown as a raw, unlocalized ISO string (now `formatDateTime(entry.occurredAt, i18n.language)`, per the dates/times standing rule), and `recordAutopsyCustodyTransfer`'s error was shown to the user as a literal English string. The service now also returns a `reasonCode` (`notPermitted` | `caseNotFound` | `notForensic` | `conflict`); `SynopticReportPage.tsx` maps it to a translated `synopticReportPage.autopsy.custody.errors.*` key, falling back to the existing generic failure message. `error` itself stays as a developer-facing fallback string, never shown directly.

**Tests.** New: `resolveAutopsyConsentScopeViolation.test.ts`, `recordAutopsyCustodyTransfer.test.ts`. Updated: `resolveAutopsyGrossExaminationGate.test.ts`, `resolveAutopsyAccessionStatus.test.ts`, `applyAutopsyAuthorizationCompletion.test.ts`, `resolveAutopsyAuthorizationCompletionValidation.test.ts`, `buildAutopsyCaseDetailsFromIntakeForm.test.ts`, `components/Autopsy/AutopsyAuthorizationCompletionForm.test.tsx`, `services/authorization/authorization.test.ts`, `services/demoReset/demoBaseline456.autopsyMolecular.test.ts` (the new A26-4663 forensic seed and A26-4661's narrowed consent).

## Batch 469 — Toxicology, organ-retention disposal, consent narrowing/revocation UI (PS-261 §2.3, §2.4.1/§2.4.2 follow-up; PS-261 follow-up)

Closes the three items Pete selected from the folder's own "Real, deliberate scope not yet built" list: toxicology ordering/results, organ-retention disposal recording, and a write site for narrowing/revoking hospital consent after the initial grant.

**Toxicology ordering and result recording.**
- **`orderAutopsyToxicology.ts`** (new) — same orchestration shape as this folder's other write sites (capability check, fetch, re-check, append, version-safe persist via `updateCaseWithRetry`, audit-log write). Appends an `AutopsyToxicologyOrder` to `AutopsyCaseDetails.toxicologyOrders` and sets the case's `ancillaryHold` active, since the body can't release while specimens are out for analysis — same single-hold model `AncillaryHoldState` already had (one hold per case, not a list).
- **`recordAutopsyToxicologyResult.ts`** (new) — records the result against the matching order and clears `ancillaryHold` only when it's safe to: `hold.active && hold.startedAt === order.orderedAt`. A hold that's moved on to a different reason since the order was placed is never blindly cleared.
- New capabilities: `autopsy:toxicology:order` (standard risk) and `autopsy:toxicology:result` (high risk).
- `SynopticReportPage.tsx` (any autopsy case, unconditional): a read-only order/result log, an order-form toggle, and a result-form toggle per open order.
- **Not done:** cancelling an order — `AutopsyToxicologyOrder.cancelledAt`/`cancelReason` exist on the type but nothing sets them yet; a real `cancelAutopsyToxicologyOrder.ts` (its own capability) is the honestly-scoped follow-up, and it would also need to clear the ancillary hold the same careful way result-recording does. *(Since closed: `cancelAutopsyToxicologyOrder.ts`, with `autopsy:toxicology:cancel` — checked in the Batch 496 README audit.)*

**Organ-retention disposal recording.**
- **`recordAutopsyOrganRetentionDisposal.ts`** (new) — same orchestration shape again. Writes `AutopsyCaseDetails.organRetentionDisposal` (recipient, method, date, note). Only meaningful where `resolveHtaApplicability()` is true (`GB_EW`, `GB_NIR`, `GB_SCT`, `NZ`) and `organRetentionTier` is set beyond `'tier_0_no_retention'` — the UI panel is gated on both.
- New capability `autopsy:retention-disposal:record` (high risk).
- `SynopticReportPage.tsx`: inserted right after the existing `organRetentionTier` select — a read-only disposal summary (when recorded) plus a form toggle (when not).
- **Still open**, per the "Real, deliberate scope not yet built" section above: no recipient/location on the *retention* itself, only on disposal; no "reason for retention" field. *(Since closed: `recordAutopsyOrganRetentionDetail.ts` records retention recipient/location, and `organRetentionTierReason` holds the reason — checked in the Batch 496 README audit.)*

**Consent narrowing/revocation.**
- **`applyAutopsyConsentStatusChange.ts`** (new) — the write site this folder's own README had flagged as missing since before Batch 468. A pure merge function, same reasoning as `applyAutopsyAuthorizationCompletion.ts` being kept separate from its own validation: `status` only moves forward on an `active → narrowed → revoked` ladder, `excludedOrgans` is the union of current and newly-passed (never a replacement), `retentionPermitted` only moves `true → false`. Deliberately one-directional — reinstating withdrawn consent is a real, separate clinical/legal decision this module doesn't model.
- New capability `autopsy:consent:manage` (high risk).
- `SynopticReportPage.tsx` (hospital-consented cases with a `hospitalConsent` record only): inserted after the custody-transfer block — a read-only current-status summary plus a "Narrow or Revoke Consent" form, which seeds its draft fields from the case's current `hospitalConsent` record on open (status, `excludedOrgans`, `retentionPermitted`, `revocationNote`) rather than a fixed default.

**Review fix.** An independent review before delivery found that while the merge function's header comment claimed narrow-only behavior, the first cut trusted the caller's input verbatim — a UI form reopened without re-seeding from the current record would have silently widened an already-narrowed consent. Fixed in both places: the merge function now enforces the ladder/union/AND rules itself (not just assumed of the caller), and the UI form seeds from the current record on open. Four regression tests added (`applyAutopsyConsentStatusChange.test.ts`): backward status request refused, `excludedOrgans` union behavior, `retentionPermitted` one-way, and a genuine further-narrowing case still applying correctly.

**Demo seed** (`services/cases/demoBaselineCases.ts`, `MOCK_VERSION` bumped to `'61'`): new **A26-4664** — a `GB_EW` hospital-consented case (`organRetentionTier: 'tier_2_full_organ_retention'`, no `organRetentionDisposal` yet) so the disposal-recording panel has an HTA-governed case to demo against (every other seeded autopsy case is `US`, where `resolveHtaApplicability()` is `false`). A26-4663 (the existing forensic case) gained a `toxicologyOrders` entry with `status: 'ordered'`, left with `ancillaryHold.active: false` so as not to disturb that case's own Batch 468 SLA demo narrative — disclosed here rather than left silently inconsistent.

**Tests.** New: `applyAutopsyConsentStatusChange.test.ts` (8 tests), plus new tests for `orderAutopsyToxicology.ts`, `recordAutopsyToxicologyResult.ts`, and `recordAutopsyOrganRetentionDisposal.ts`. Updated: `services/authorization/authorization.test.ts` (new capabilities), `src/i18n` locale-parity suite (new keys, all 5 locales), `services/demoReset/demoBaseline456.autopsyMolecular.test.ts` (A26-4664 seed, A26-4663's new toxicology order). Full suite: 982 files / 8373 tests, 0 failures, 9 skipped (as before); `npm run type-check` clean.

## Batch 471 — Toxicology cancellation, organ-retention detail, consent reinstatement (PS-261 follow-up)

Closes all three items Pete chose from this folder's own "Real, deliberate scope not yet built" list after Batch 469, including one — consent reinstatement — that Batch 469's own narrowing function had deliberately refused to build at all ("a real, separate clinical/legal decision this module doesn't model"). Built now, at Pete's direct, explicit request, as a genuinely separate action from narrowing rather than a flag on it — see below for why that separation matters.

**Toxicology order cancellation.**
- **`cancelAutopsyToxicologyOrder.ts`** (new) — the write site `AutopsyToxicologyOrder.cancelledAt`/`cancelReason` had been waiting on since Batch 469 disclosed the gap. Same orchestration shape as the rest of this folder. Only ever moves an `'ordered'` order to `'cancelled'` — a `'resulted'` or already-`'cancelled'` order is refused. Clears `ancillaryHold` with the exact same care `recordAutopsyToxicologyResult.ts` already takes: only when it's still the hold this order itself started (matched by `startedAt`).
- New capability `autopsy:toxicology:cancel` (high risk) — its own, never reusing `autopsy:toxicology:order` or `autopsy:toxicology:result`.
- `SynopticReportPage.tsx`: a "Cancel Order" action alongside "Record Result" on each still-`'ordered'` row; a cancelled order's reason and timestamp display inline, same treatment as a resulted order's summary.

**Organ-retention detail.**
- **`recordAutopsyOrganRetentionDetail.ts`** (new) — records who holds retained organs/tissue and where, while retention is ongoing (distinct from `recordAutopsyOrganRetentionDisposal.ts`, which only covers final disposal). New `OrganRetentionRecord` type, `AutopsyCaseDetails.organRetentionDetail`. Same gate as the disposal write site: `resolveHtaApplicability()` and a tier beyond `tier_0_no_retention`. Deliberately a single current record, not an append-only log — each call overwrites the last, with its own audit entry; a real custody chain for retention itself moving between locations over time is a further, separate extension, not attempted here.
- New capability `autopsy:retention-detail:record` (high risk).
- `SynopticReportPage.tsx`: inserted between the `organRetentionTier` select and the disposal panel — disposal only makes sense once retention itself has a real record. A read-only summary once recorded, with an "Update" action that seeds the form from the current record (never a blank slate).

**Consent reinstatement.**
- **`applyAutopsyConsentReinstatement.ts`** (new, pure) / **`recordAutopsyConsentReinstatement.ts`** (new, orchestration) — restores an already-narrowed or revoked consent. Kept genuinely separate from `applyAutopsyConsentStatusChange.ts` rather than adding a "widen: true" escape hatch to it: narrowing's whole guarantee is that it never widens, enforced in the function itself (the exact guarantee an independent review of Batch 469 had to go back and add), and a flag that let it widen under some condition would have undermined that guarantee for everyone who calls the narrowing path, not just the reinstatement case. Reinstatement moves `status` to exactly what's asked (including back to `'active'`) and replaces `excludedOrgans`/`retentionPermitted` with whatever is passed — safe here because reinstatement is itself the deliberate widening action, gated by its own capability, and always carries a mandatory note (refused server-side, before the case is even fetched, if missing).
- New capability `autopsy:consent:reinstate` (high risk) — its own, never reusing `autopsy:consent:manage`. Narrowing/revoking and reinstating are opposite-direction actions a hospital may want to grant to different roles.
- `SynopticReportPage.tsx`: a "Reinstate Consent" action next to "Narrow or Revoke Consent," shown whenever the current status isn't `'active'`, with its own form and state — never sharing a submit path with the narrowing form.
- **Verified unaffected:** `applyAutopsyConsentStatusChange.ts` itself is byte-for-byte unchanged by this batch, and its own existing tests (including Batch 469's 4 widening-regression tests) still pass — the narrow-only guarantee has no new way to be bypassed through the narrowing capability.

**Review fix.** An independent review before delivery found one new line of hard-coded punctuation between translated pieces (the retention-detail panel's optional reason, appended as a raw `` ` · ${reason}` `` template literal instead of a translated key) — fixed with a new `retentionDetail.reasonSuffix` key (`" · {{reason}}"`) in all five locales, per the standing i18n rule. The review also flagged that this folder's own "not yet built" bullets and Batch 469's own entry above still claimed these three gaps were open; both are corrected in this pass, everywhere they were repeated.

**Demo.** No new seed data needed — the existing Batch 469/470 seeds already cover all three: A26-4663's toxicology order (still `'ordered'`) is cancellable; A26-4664's `GB_EW` retention tier has no retention detail recorded yet; A26-4661's narrowed consent is reinstatable. See `docs/product/DEMO_GUIDE.md`.

**Tests.** New: `cancelAutopsyToxicologyOrder.test.ts`, `recordAutopsyOrganRetentionDetail.test.ts`, `applyAutopsyConsentReinstatement.test.ts`, `recordAutopsyConsentReinstatement.test.ts`. Updated: `services/authorization/authorization.test.ts` (3 new capabilities, exact-order seed lists). Full suite: 986 files / 8401 tests passed, 3 files / 9 tests skipped, 0 failures; `npm run type-check` clean.

## Batch 472 — Capability-greying, retention-tier reason, hard-coded-punctuation sweep (PS-261 follow-up)

Pete asked for three small Front End items, deliberately scoped smaller than the four genuinely-new features (per-organ tagging, a dedicated worklist, toxicology specimen barcoding, and a unified timeline) that came up in the same conversation and still need his own scoping before any of them are built.

**Capability-greying on autopsy action buttons.** Every protected autopsy write action on the report page now uses `CapabilityButton` (`components/Common/CapabilityButton.tsx`) instead of a plain `<button>` — the same component `SearchPage.tsx`, `AuditLogPage.tsx`, and the Batch Management pages already use. Covers all eight: order/result/cancel toxicology, record retention detail, record disposal, record custody transfer, narrow/revoke consent, reinstate consent. Each is passed its own capability and `{ caseId }` context; a user who lacks the capability now sees the button greyed out with a tooltip naming it, before clicking, rather than only finding out after a rejected submit. Presentation only — the service-layer `authorizationService.enforce()` calls this was already covering are unchanged and still the real enforcement.

**Reason for the retention tier itself.** New optional `AutopsyCaseDetails.organRetentionTierReason` field and a plain text input beside the `organRetentionTier` select, closing the last of the three gaps this folder's "not yet built" list carried after Batch 471 ("a `reason for retention` field... `organRetentionTier` remains a bare tier selection"). Deliberately kept as simple as the field it extends: no new type, no new capability, no new service file — it saves through the exact same write site the tier select already uses (`SynopticReportPage.tsx`'s `handleOrganRetentionTierChange`), on blur, only when the reason text actually changed. **Disclosed, not fixed this batch:** that write site itself has no capability check and lives directly in the UI component rather than `services/autopsy/` — a pre-existing design this folder's own README has described as "the one real write site for `organRetentionTier`" since Batch 468, not something this batch introduced. Giving it a proper service function and capability (matching every other autopsy write site) is a real, separate refactor, not a one-line addition alongside a text field, and wasn't undertaken here without being asked.

**Hard-coded-punctuation sweep.** Found and fixed two pre-existing instances, both predating this batch: the custody log's "received by" line concatenated a raw `` ` · ${...}` `` template literal around a translated string (now baked into `custody.receivedBy` itself, which was only ever used with that separator); the consent panel's status line did the same around a user-entered revocation/reinstatement note (now a new `consent.noteSuffix` key, `" · {{note}}"`, the same pattern as Batch 471's `retentionDetail.reasonSuffix`). A full sweep of the autopsy section of `SynopticReportPage.tsx` for the `` ` · `` /`" · "` pattern found no further instances after these two.

**Strings.** New keys in all five languages: `synopticReportPage.autopsy.tierReasonLabel`, `synopticReportPage.autopsy.consent.noteSuffix`; `synopticReportPage.autopsy.custody.receivedBy`'s existing value updated (separator baked in, no new key).

**Tests.** No new service test files (no new service functions this batch); `locale-parity` suite covers the new/changed keys. Full suite and type-check counts below.

**Still open, disclosed.** The four genuinely-new Front End features raised in the same conversation — per-organ tagging on gross-exam findings, a dedicated autopsy worklist/case view, specimen-level toxicology barcode/chain-of-custody tracking, and a unified consent/retention/disposal/custody timeline — all need Pete's own scoping decisions before any of them are built; none were started this batch. *(Since closed: all four were built later — per-organ tagging (`recordAutopsyOrganTag.ts`, Batch 478), the worklist's Autopsy tab (Batch 456), toxicology specimen barcode and custody (Batch 475), and the timeline (`buildAutopsyCaseTimeline.ts`, Batch 476) — checked in the Batch 496 README audit.)* The `organRetentionTier` write site's missing capability check and UI-embedded business logic (noted above) is also disclosed rather than silently carried forward.

## Batch 473 — Case-type key migration: `medicolegal_forensic` → `statutory_judicial` (PS-261 follow-up)

`AutopsyCaseAuthority`'s forensic-path value renamed everywhere it appears as a literal — type definition, every gate/orchestration function that compares against it, demo seed data, tests, and the one i18n key path that used it raw. Ahead of Module 2 (the dedicated autopsy worklist, which filters on this field) and matching the international terminology this module needs (US Medical Examiner/Coroner and UK/Commonwealth statutory judicial autopsies are the same case type). `hospital_consented` unchanged. Function/file names using "forensic" as an ordinary word (`resolveForensicSignOutAuthority.ts`, `ForensicAuthorization`) deliberately left alone — this was a data-key rename, not a synonym sweep. Historical Batch 468 demo-seed notes in this and other READMEs that quote the old value as a record of what was literally built then are left as-is. Verified: zero remaining references repo-wide; 87 files / 648 tests across every touched directory, 0 failures; type-check clean.

## Batch 475 — Module 3: toxicology specimen barcode & chain-of-custody link (PS-261 follow-up)

`AutopsyToxicologyOrder` gains a required `specimenBarcode` — a real, scannable specimen identifier, distinct from the existing free-text `specimenDescription`. Available on either `caseAuthority`, same as the rest of this order type.

No new custody mechanism: `AutopsyCustodyTransferEvent` gains one optional field, `toxicologyOrderId`, so an existing (still forensic-only) custody-log entry can name which toxicology specimen it's about. `recordAutopsyCustodyTransfer.ts` gains a new pure export, `custodyEventsForToxicologyOrder(custodyLog, orderId)`, for the UI to show a specimen's own custody entries without duplicating the filter. `orderAutopsyToxicology.ts` refuses a missing/blank barcode (`reasonCode: 'missingBarcode'`) before touching the case.

Verified: `orderAutopsyToxicology.test.ts` (6/6), `recordAutopsyCustodyTransfer.test.ts` (11/11, new link-field and selector tests), type-check clean.

## Batch 476 — Module 4: unified case timeline (PS-261 follow-up)

New `buildAutopsyCaseTimeline.ts` — a pure, synchronous read-model, not a new persisted event log. It merges every dated event already recorded anywhere on an `AutopsyCaseDetails` (forensic verbal/written order, hospital consent given and its current status, every custody transfer, every toxicology order/result/cancellation, organ retention detail and disposal, ancillary hold start/end, PAD/FAD signing, every addendum) into one chronological, newest-first list. Rendered by the new `AutopsyCaseTimeline.tsx` (`pages/SynopticReportPage/components/`), shown on the report page just above the existing autopsy sections.

Deliberately not built on either of this app's two existing case-history mechanisms: the system-wide `services/auditlog/` is a compliance log of actions, not a clinical event timeline, and `DispatchHistoryTimeline.tsx`'s own history (`fetchDispatchHistoryForCase.ts`) is fed by a Firestore-backed notifications collection this module has no reason to extend — per this project's own standing rule, production is SQL Server and the `firestore*` stubs aren't extended. So this reads directly off the real fields this module already keeps, the same way `custodyEventsForToxicologyOrder()` (Batch 475) does.

**Disclosed limitation, not fixed here:** `HospitalConsentRecord` only ever keeps the *current* status and `statusChangedAt` — there's no append-only log of every narrowing/revocation/reinstatement, so the timeline can only ever show the single most recent consent status change, not the full sequence. Closing that needs its own write-site change to `recordAutopsyConsentStatusChange.ts`/`recordAutopsyConsentReinstatement.ts`, not attempted in this batch.

No new capability: the timeline is a read-only aggregation of data the signed-in user can already see elsewhere on the same autopsy section (custody log, toxicology orders, consent panel, retention/disposal records) — it draws no new access boundary.

**Tests.** New: `buildAutopsyCaseTimeline.test.ts` (11/11) — empty/no-autopsy cases, each event kind individually, a mixed-kind sort-order check. Full suite: 987 files / 8416 tests passed, 3 files / 9 tests skipped, 0 failures (one pre-existing, unrelated `window is not defined` unhandled rejection from `CytologyHistologyCorrelationSection.tsx`'s async `refresh()`, same as Batch 474's run — not a regression, not counted); `npm run type-check` clean.

## Batch 477 — Module 5: autopsy worklist badges (PS-261 follow-up)

New `resolveAutopsyWorklistBadges.ts` — a pure, read-only function resolving a case's real autopsy state (case authority, an active ancillary hold, PAD/FAD signed) into label-key badges, plus `resolveAutopsySlaHint()`, which reuses `resolveAutopsyTatSlaMatrix.ts`/`formatAutopsyTatSlaSummary.ts` verbatim for a tooltip-only "SLA" hint. Rendered by the new `components/Worklist/AutopsyWorklistBadges.tsx` in both the Worklist's table and card views. See that folder's own README for the full context — this is the module's own Pete-scoped answer to "a dedicated autopsy worklist": extend the existing Autopsy branch tab + grouping with real per-case state, not a second screen.

No new capability: read-only, same data already visible on the case's own report page.

**Tests.** New: `resolveAutopsyWorklistBadges.test.ts` (6/6) — case-authority badge always present and correctly keyed, ancillary-hold badge only while active, PAD/FAD badges independent of each other, badge ordering, and the SLA hint varying by jurisdiction. Full suite: 988 files / 8422 tests passed, 3 files / 9 tests skipped, 0 failures; `npm run type-check` clean; locale parity, inline-CSS, deployment-readiness, PHI, and capabilities guards all pass.

## Batch 478 — Module 6: the gross-exam gate becomes a real hard stop, with an audited override; per-organ tagging (PS-261 follow-up)

Two of Pete's long-standing, locked-in scoping decisions, both closed this batch.

**The gate, finally a real hard stop.** Verified before building (per this project's own "verify, don't trust" rule) that `resolveAutopsyGrossExaminationGate.ts` — the module's own documented "hard validation block" — was not actually wired to block anything: `SynopticReportPage.tsx` only used it to decide whether to show a warning banner, and `signAutopsyReport.ts` never checked it at all. Flagged to Pete directly; his answer ("make it a real hard block, then add the override") is what this batch builds. `signAutopsyReport.ts` — the one real write site a PAD/FAD sign goes through — now calls the gate itself: a blocked gate refuses the sign outright (`AUTHORIZATION_GATE_BLOCKED`), never silently proceeding as it did before this batch.

**The override.** New capability `autopsy:gross-exam-gate:override` (high risk) — same class of action as `cytology:qc-review:bypass`: nobody by default, an administrator assigns it. A caller supplies a written `overrideReason`; if the signer holds the capability, the sign proceeds and the override is recorded twice — once on the case itself (`AutopsyCaseDetails.gateOverrides`, a new, append-only `AutopsyGateOverrideEvent[]`, never replaced or reordered) and once to the shared audit trail (`AUTOPSY_GATE_OVERRIDDEN`) — never silent. An override reason supplied when the gate is already allowed is simply ignored: never a way to "pre-authorize" a sign that didn't need overriding.

`SynopticReportPage.tsx`: the existing gate-blocked warning banner gains a second button, "Override & Sign {tier}", shown only to whoever holds the new capability (`capabilities.has(...)`, the same presentation-only pattern every other protected autopsy action already uses). It opens a `ReasonPromptModal` (the same component `useGrossingCompletion`'s own correction-reason prompt uses) for the written reason, then hands off to the existing signature-confirmation flow — the override reason rides along to `signAutopsyReport.ts` unchanged.

**Disclosed, not fixed this batch:** `resolveAutopsyGrossExaminationGate.ts`'s own `blockedReasons` stay literal English (a pre-existing gap predating this batch, already visible in the warning banner this batch didn't introduce) — the new `AUTHORIZATION_GATE_BLOCKED`/`GATE_OVERRIDE_NOT_PERMITTED` toasts this batch adds are translated, generic messages rather than surfacing that raw text. Translating the gate's own reasons is a separate, larger refactor (the gate is also read by `AutopsyAuthorizationCompletionForm.tsx`'s own preview) and wasn't undertaken here without being asked.

**Per-organ tagging.** The other open item from this folder's own "Real, deliberate scope not yet built" list (first flagged after Batch 472). Pete's own scoping decision (asked directly, since the grossing template has no per-field organ association — only whole sections are organ-derived): a separate, case-level, append-only log, not an extension of the shared template engine every protocol uses. New `AutopsyOrganTag` type (`organCode`, `status: 'normal' | 'abnormal' | 'not_examined'`, optional free-text `finding`, who/when) and `AutopsyCaseDetails.organTags`. New `recordAutopsyOrganTag.ts` — same orchestration shape as every other write site in this folder — and its own capability, `autopsy:organ-tag:record` (standard risk; ordinary clinical documentation, not a legal/custody action), seeded to the roles that gross (`GROSSERS`, same as `case:grossing:complete`). Reuses the existing 31-code `AutopsyOrganCode` vocabulary and `AUTOPSY_ORGAN_LABEL_KEY` (`pages/AccessionPage/autopsyOrganLabelKeys.ts`) verbatim — Pete's earlier, locked-in decision to use that vocabulary now and defer SNOMED mapping pending PS-343 licensing.

`SynopticReportPage.tsx`: a new "Organ Tags" section (available for either `caseAuthority`, unlike the forensic-only custody log) — a read-only, append-only list plus a form (organ picker, status select, optional finding) gated behind the new capability.

**Timeline.** `buildAutopsyCaseTimeline.ts` and `AutopsyCaseTimeline.tsx` gain two new entry kinds: `organ_tag_recorded` (every tag, in order) and `gate_overridden` (every override, with its tier, reason, and who did it) — both pure derivations off the two new fields, no second, parallel event store.

**Tests.** New: `recordAutopsyOrganTag.test.ts` (9/9). Updated: `signAutopsyReport.test.ts` (7 new tests for the gate/override behavior; every pre-existing test's fixture now carries a real, gate-passing `forensicAuthorization`/`hospitalConsent`, since the gate is a real hard stop now — 31/31 passing), `buildAutopsyCaseTimeline.test.ts` (2 new tests), `services/authorization/authorization.test.ts` (2 new capabilities). Full suite and type-check counts below.

## Batch 479 — fix: the gate's `blockedReasons` are reason codes now, not literal English (PS-261 follow-up)

Closes the "disclosed, not fixed" gap from Batch 478, same batch it was flagged in rather than deferred — per Pete's standing instruction (first release: fix a disclosed gap in-batch unless it would rise to the level of a new feature; this one didn't).

`resolveAutopsyGrossExaminationGate.ts`'s `blockedReasons` were hardcoded English sentences, pushed straight from the gate into `AutopsyGrossExaminationGateResult` and read verbatim by `SynopticReportPage.tsx`'s gate-blocked banner — never through `t()`. Changed `blockedReasons: string[]` to a real union type, `AutopsyGrossExaminationBlockReason` (`'missing_judicial_authorization' | 'missing_hospital_consent' | 'consent_revoked'`), mirroring `resolveCytologySignOutGate.ts`'s own `CytologySignOutBlockReason` pattern rather than inventing a new shape. `SynopticReportPage.tsx`'s banner now translates each code via `t('autopsySignOut.blockedReasons.<code>')` and joins them with `formatList()` (the same locale-aware list join `cytologySignOut`'s own `blockReasonsText` helper already uses), instead of `gate.blockedReasons.join(' ')` on raw English.

**Scope check before touching anything else:** grepped every real UI consumer of `gate.blockedReasons` first. `AutopsyAuthorizationCompletionForm.tsx` only reads `.allowed` (never the reasons text) — untouched. `signAutopsyReport.ts`'s own internal `error` string and the audit log's `detail` text both still join the reason codes directly — acceptable: the `error` field isn't shown to a user (the sign-error toast is already keyed by `errorCode`, done in Batch 478), and audit `detail` text is required to stay literal English project-wide (CLAUDE.md). `AutopsyGateOverrideEvent.blockedReasons` (persisted on the case, part of the audit trail) keeps its `string[]` type — it stores these same codes now, a compact record, not prose; the timeline's own `gate_overridden` entry never surfaces this field as text.

**A related, not-yet-fixed gap, found by the same grep, not fixed here:** `resolveAutopsyBodyReleaseGate.ts` has the identical anti-pattern (literal English `blockedReasons` strings, read by `AutopsyBodyReleaseForm.tsx` at `gate.blockedReasons.map(reason => <div key={reason}>{reason}</div>)`). Out of scope for this batch — Pete's fix request named the gross-exam gate specifically — but flagged now rather than left for a future "disclosed, not fixed." *(Since closed: Batch 495 converted `resolveAutopsyBodyReleaseGate.ts` to reason codes — checked in the Batch 496 README audit.)*

**Tests.** `resolveAutopsyGrossExaminationGate.test.ts`: one assertion sharpened from a substring match to an exact code (`'consent_revoked'`), 2 new tests asserting the other two codes. `signAutopsyReport.test.ts`: the full suite run caught one real pre-existing assertion that still matched the old English prose (`result.error` checked against `/legal authorization/i`) — fixed to match the new code; the adjacent revoked-consent assertion happened to still pass (`consent_revoked` contains "revoked") but was tightened to check the exact code too. Full suite: 989 files / 8442 tests passed, 3 files / 9 tests skipped, 0 failures. `npm run type-check` clean.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 495 — body-release gate reasons translated (closes a gap disclosed in Batch 479)

`resolveAutopsyBodyReleaseGate.ts` returned hard-coded English sentences, which `components/Autopsy/AutopsyBodyReleaseForm.tsx` showed as-is. Batch 479 fixed the same problem in `resolveAutopsyGrossExaminationGate.ts` and named this file as having it too, but this file was never converted.

- **Gate:** `blockedReasons` are now reason codes — `AutopsyBodyReleaseBlockReason` = `'pad_not_signed' | 'ancillary_hold_active'` — translated by callers via `autopsyBodyRelease.blockedReasons.<code>`. The criteria themselves are unchanged.
- **`releaseAutopsyBody.ts`:** passes the typed codes through, and every failure now carries a `reasonCode` (`caseNotFound` | `noAutopsyRecord` | `specimenNotFound` | `conflict`), the same pattern `recordAutopsyCustodyTransfer.ts` already uses. `error` stays as a developer-facing English fallback and is no longer shown on screen.
- **Tests:** `resolveAutopsyBodyReleaseGate.test.ts` and `releaseAutopsyBody.test.ts` assert the exact codes.
- **README correction:** the "not yet built" list above was rewritten after checking it against the code; four of its six items had already been built.

## Batch 499 — the retention tier gets its own service and capability

**`recordAutopsyOrganRetentionTier.ts`** (new, with tests) saves `organRetentionTier` and `organRetentionTierReason`. Same orchestration as `recordAutopsyOrganRetentionDetail.ts`: checks `autopsy:retention-tier:record` (new capability, seeded to the same case-access roles as retention detail), fetches, re-checks on the freshest copy, saves version-safely with `updateCaseWithRetry`, and audits (`AUTOPSY_ORGAN_RETENTION_TIER_RECORDED`). `organRetentionTierRefusal()` (pure) holds both rules the page used to apply: retention tracking only where `resolveHtaApplicability` says so, and never beyond what a hospital consent permits (`resolveRetentionTierConsentCheck`, Batch 468).

This closes what Batches 472 and 468 disclosed: the tier was saved from the report page with no permission check and with its logic in the component. The page now calls this service and greys the tier select and reason field without the capability.

## Batch 534

`signAutopsyReport.ts`: the PAD (PRELIMINARY) and FAD (FINAL) go through the release delay (`reportRelease/releaseThroughDelay`). Recall that reopens them comes in Batch 535.

## Batch 535

`signAutopsyReport.ts`: the held PAD or FAD records the case status before signing, so Recall can put it back. Recall withdraws the signature's frozen snapshot (`reportRelease/heldReleaseActions.ts`). A PAD can't be recalled once the FAD is signed on it.

## Batch 610 (part A) — turnaround verdict and dashboards (#60, #61, #88, #89)

`resolveAutopsyTatStatus.ts`: clock start = body arrival; target = active Autopsy PAD/FAD entry, else the jurisdiction figure (a range counts to its upper bound); working-day targets skip weekends only (public holidays are not known: a target can only be later than shown); ancillary hold time is added to the deadline; verdicts on track, due soon (last 20%), overdue, met, met late. `dashboard/`: see its README.
