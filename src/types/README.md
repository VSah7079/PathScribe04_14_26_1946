**Batch 742:** `caseAttachments/CaseAttachment.ts` (new): a case attachment is a pointer (object key or permanent URL), never a file; Pete's `source_type` enum and the three accepted file types.

**Batch 739:** `case/Material.ts` (aliquot decants), `case/MolecularOrderOutboundQueueEntry.ts` (processor on the instrument order).

**Batch 736:** `reasons/ReasonDictionaryEntry.ts` gains the `BENCH_*` categories and `sortOrder`; `case/addOnOrderException.ts` gains `reasonCode` and `responseReasonCode`.

**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

# src/types/

Pure TypeScript type/interface definitions (a few files also carry
small pure helpers, e.g. `voiceMacros.ts`). 28 subfolders (15 with
their own `README.md`, linked below; 13 without) plus 12 root-level
`.ts` files and two root-level tests. 126 non-test `.ts` files in total.

*Corrected in the Batch 496 README audit (Oct 9, 2026): was "14 subfolders, 13 root-level files, 40 files total".*

## Folder index

| Folder | What it is |
|---|---|
| [access/](./access/README.md) | Real, tracked access-request tickets (Pediatric, Pool, Orchestration) |
| [assetLocation/](./assetLocation/README.md) | **NEW (Sep 2026)** — governed physical/asset location dictionary entry shape (mortuary storage, workstations, archive shelves) |
| [autopsy/](./autopsy/README.md) | **NEW (Sep 2026)** — Autopsy Pathology Module core data model: case authority, forensic/consent records, PAD/FAD snapshots, organ retention, ancillary holds |
| [case/](./case/README.md) | **Central folder** — the core case domain model (`Case`, `Specimen`, `RetentionHold`, `CaseHold`, `MatrixBlock`, and more) |
| [config/](./config/README.md) | Org-hierarchy config shapes (CaseMask, Enterprise, Hospital tier) |
| [events/](./events/README.md) | PathScribe-owned internal event contracts for the LIS/middleware integration seam |
| [footPedal/](./footPedal/README.md) | Hands-free grossing-bench peripheral control config |
| [intraop/](./intraop/README.md) | Intraop Pre-Check "Unlinked Intraoperative Entries" queue data model |
| [labels/](./labels/README.md) | Real label identifiers + physical label-size presets used by every label-printing feature |
| [patient/](./patient/README.md) | A patient's national healthcare identifiers and registry consent (Batches 417–418) |
| [patients/](./patients/README.md) | Break-Glass rebind reason-code taxonomy (MPI Interface Exception module) |
| [printing/](./printing/README.md) | Real network-print job dispatch + callback event contract (slide labels and retry attempts since Batch 347) |
| [quality/](./quality/README.md) | The QA Activity Framework's types (activity types and records, supervision assignments, peer review, CAPA recommendations, discordance trends, TAT targets); the old Frozen-to-Permanent `ReconciliationRecord` is retired from use |
| [reports/](./reports/README.md) | Real report lifecycle beyond the synoptic itself — amendment/addendum, version history, informal review, LIS-side correction tracking |
| [specimen/](./specimen/README.md) | Input shape for adding a specimen mid-workflow |

Subfolders with no README of their own: `billing/` (billing rule versions, code import jobs, charge queue, payment mappings, NCCI edits and more), `clinical/` (critical result notifications and alert dispatch), `clinicalHistory/`, `cytology/` (review, sign-out, ROSE, workload ledger and report content records), `cytologyQc/`, `delivery/`, `digitalPathology/`, `imageAssociation/`, `migration/`, `patientHistory/`, `printRouting/`, `reasons/` and `staff/`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): added `patient/`, which has a README but was missing from this index, listed the 13 subfolders that have none, and updated the `quality/` description (it described only the retired `ReconciliationRecord`).*

## Root-level files (not in a subfolder)

- **`index.ts`** — barrel re-exports.
- **`systemConfig.ts`**, **`template.ts`**, **`ProtocolDefinition.ts`**, **`reportPart.ts`**, **`smarttag.types.ts`**, **`voiceMacros.ts`**, **`flagsRuntime.ts`**, **`FlagDefinition.ts`**, **`AuditEvent.ts`**, **`SynopticAuditEvents.ts`**, **`ContributionDashboard.ts`** — standalone domain types not yet folded into a dedicated subfolder. **`voiceMacros.ts` grew real substance this pass** ("Personal Quick Text" — Enterprise then Facility then Staff): `VoiceMacro` gained the same `performingLabFacilityId?`/`ownerUserId?` three-tier ownership model `Macro` (`services/macros/`) already has, plus `isVoiceMacroVisibleTo()` (the matching resolution rule) and `applyVoiceMacroSubstitutions()` — the real spoken-trigger substitution algorithm, now shared by `mockVoiceMacroService.ts`'s `refineTranscript()` and `contexts/VoiceProvider.tsx`'s own live dictation pipeline (see that folder's own README for the full account of wiring a previously-orphaned function into real, live use).
- **Tests:** `voiceMacros.test.ts`, `removedTypes.guard.test.ts`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): `templateTypes.ts` no longer exists (deleted with the `TemplateRenderer.tsx` schema fix — see that file's header); `ProtocolDefinition.ts` was missing from this list.*

## Real findings

**Resolved in Batch 348 (PS-67):** `serviceResult.ts` is deleted. The `aiIntegration/` services and `mockVoiceMacroService.refineTranscript` now return `ServiceResult` from `services/types.ts` (`{ ok, data } | { ok: false, error }`), the one shape used everywhere, and `tsc` confirms nothing else imported the old one. Correction to the paragraph below: by Batch 348 the live caller of `PathScribeAIService` was `pages/SynopticReportPage/hooks/useSignOutWorkflow.ts` (AI synoptic suggestions and narrative generation), not `OrchestratorSectionEditor.tsx`, whose use ended when its AI spelling check was retired in Batch 338.

**A genuinely instructive near-miss, worth recording honestly (history):**
`serviceResult.ts` (deleted in Batch 348 — see above) defined an older `ServiceResult<T>` shape
(`{success, data, error}`). An initial grep for direct import paths
found zero consumers, so it was deleted as apparently-dead — matching
several other confirmed-dead duplicate types found elsewhere in this
review. `tsc` immediately caught what the grep missed: 3 files
(`services/aiIntegration/IAIIntegrationService.ts`,
`PathScribeAIService.ts`, and the since-removed mock AI service) import it
indirectly through `types/index.ts`'s barrel re-export, a path the
initial search didn't check. Traced further before just restoring it
blindly: confirmed `PathScribeAIService` is genuinely instantiated by
a real, live component (`OrchestratorSectionEditor.tsx`, part of
`SynopticReportPage`) — not dead code. Restored the file, with the
real finding documented in it directly: **two different
`ServiceResult` conventions genuinely coexist in this codebase right
now** — this older `{success, data, error}` shape (used by the
`aiIntegration/` subsystem) and the newer `{ok, data, meta, error}`
shape in `services/types.ts` (used by essentially everything else,
e.g. `caseRouter`). Each is internally consistent within its own call
chain but inconsistent with the other. Worth consolidating at some
point — not something to guess at or force through a folder review.
The broader lesson, since it's the reason this is written up in this
much detail: a `grep` returning zero hits is evidence, not proof —
worth verifying against `tsc`'s actual, complete picture (which
resolves barrel exports, type-only imports, and every other path a
simple text search can miss) before deleting anything based on it.

**`template.ts`'s `TemplateStatus` vs `templateService.ts`'s own
`TemplateStatus`** — flagged in an earlier pass of this review as a
possible duplicate-type collision. Checked properly this time: these
are genuinely different, unrelated concepts that happen to share a
name coincidentally — `types/template.ts`'s version belongs to
`ReportTemplate` (the Tiptap-based report-*building* templates, a
completely different system from CAP/RCPath protocols). Confirmed no
file imports both into the same scope, so there's no actual collision
risk despite the shared name. Not a bug — just a naming coincidence
worth being aware of, not worth "fixing" (renaming either one is a
clarity nice-to-have, not a correctness issue).

**Four apparently-unused exported types, checked individually rather
than bulk-flagged** (after the `serviceResult.ts` lesson above, each
was verified by its actual exported name, not just file path):
- `DigitalAsset`/`Decant` (`case/Material.ts`) — false positive, both
  genuinely used (`Specimen.ts`, `MaterialTreePanel.tsx`).
- `ErasureCertificate` (`case/ErasureCertificate.ts`) — confirmed zero
  consumers, but this is deliberate, well-documented, forward-looking
  scaffolding for a real GDPR Article 17 compliance feature, not
  abandoned code. The file's own header explicitly notes it's waiting
  on legal counsel sign-off before being "wired to a real delete."
  Left alone.
- `AddSpecimenPayload` (`specimen/AddSpecimenPayload.ts`) — confirmed
  zero consumers, but references a real, existing service
  (`services/hardware/ModeAInterfaceService.ts`) by name in its own
  header with specific, confident integration reasoning — reads as
  planned-but-not-yet-wired, similar to the erasure certificate above,
  not confirmed dead. Left alone.
- `ReportSnapshot`/`ReportSnapshotHistory` (`case/ReportSnapshot.ts`)
  — confirmed zero consumers, and *this* one looks genuinely
  superseded rather than merely not-yet-built. `types/reports/
  ReportVersionRecord.ts` (confirmed live and "already relied on by
  SynopticReportPage.tsx" per its own header) covers materially the
  same concern — tracking original/corrected/addendum report release
  events — with an overlapping `trigger: 'initial_signout' |
  'amendment'` field. Reads like an earlier design that was reworked
  into `ReportVersionRecord`'s different, actually-implemented
  approach, with the old one never removed. **Removed in Batch 366
  (PS-68)** after a whole-repo check found no code using it. Its
  release types live on in `ReportVersionRecord.trigger` and
  `AmendmentRecord.type`. Its two unbuilt points (store the PDF by
  reference, and keep a SHA-256 of it to detect a swapped file) are now
  notes for the API server in `ReportVersionRecord.ts`.
  `removedTypes.guard.test.ts` keeps it from coming back.

## Not exhaustively reviewed

The remaining ~30 files (`case/Case.ts` and its siblings, `config/`,
`reports/`, `intraop/`, `quality/`, `systemConfig.ts`, `template.ts`,
etc.) were spot-checked for the specific patterns above (duplicate
types, orphaned exports) rather than read field-by-field in full. Pure
type-definition files are lower-risk for the kind of business-logic
bugs this review has focused on elsewhere — no `any` casts or runtime
logic live here to find.

## Batch 333 (PS-89)

`billing/BillingRuleVersion.ts`:
- **New fields:** `vocabulary` (`CodeVocabulary`: CPT, HCPCS, NHS_OPCS4, LOCAL_LAB), `importJobId` and `rollbackNotes`.
- **`effectiveTo` doc:** it now describes natural sunset.

`billing/CodeImportJob.ts` (new) is the append-only import-job ledger. See `services/billing/codeEngine/README.md`.

## Batch 317

`quality/TatConfigEntry.ts` is new: the TAT/escalation target types, moved out of a component. See `quality/README.md`.

- **Batch 322 (PS-87):** `case/Case.ts` gained `SynopticReportInstance.aiDraftSource`, which marks drafts created by Assist-mode LIS polling. See `case/README.md`.

- **Batch 365 (PS-347):** `systemConfig.ts` — new `JurisdictionDateFormat` type; `JURISDICTION_LOCALE.NL.dateFormat` is `DD-MM-YYYY` (was `DD/MM/YYYY`), and the comment claiming slashes across BE/NL/FR is corrected.
- **Batch 366 (PS-68):** `case/ReportSnapshot.ts` removed (unused earlier design); `ReportVersionRecord` is the one release record. New `removedTypes.guard.test.ts`.

## Batch 399

`intraop/`: the structured verbal report and the critical results dictionary entry. `reasons/`: the SURGEON_UNAVAILABLE category. `clinical/`: the critical result record's recipient role, critical decision and reason.

## Batch 400

`intraop/`: the verbal report records which fields were filled from dictation.

## Batch 410

`cytology/CytologyReviewRecord.ts`: `agreementWithInitial` and `priorAgreements` (type `CytologyReviewAgreement`). Each is a later review's agreement with the initial screen as stored when saved: level, subtype, adequacy flag, added and missed interpretations and recommendations, what was compared, and who assessed it and when.

## Batch 411

`case/Case.ts`: `cytologyEarlyFinalization` records a cytology case finalized before every cytology specimen was signed out: who, when, the reason, and the unsigned specimens.

## Batch 412

- `cytology/CytologyReviewRecord.ts`:
  - `priorVersions` (`CytologyReviewVersion`): each earlier save.
  - `CytologyReviewNote` and `CytologyReviewSection`: a note on part of a review, and its status.
- `case/Specimen.ts`: `cytologyScreening.reviewNotes`.

## Batch 417

`patient/NationalPatientIdentifier.ts` (new), carried on `case/Patient.ts` as `nationalIdentifiers`. The MRN stays the lab's; registries key on these.

## Batch 418

`patient/PatientRegistryConsent.ts` (new), carried on `case/Patient.ts` as `registryConsent`. `case/CytologyRegistryOutboundQueueEntry.ts`: `errorCode` gains `REGISTRY_NOT_READY` and `EXCLUDED_BY_CONSENT`.

## Batch 419

`case/CytologyRegistryOutboundQueueEntry.ts` and `case/CancerRegistryOutboundQueueEntry.ts`: `submission?: RegistrySubmissionHeader`.

## Batch 420

Both registry queue entries: `registryStatus`, `sentAt`, `acknowledgements` (see `services/registrySubmission/registryAcknowledgement.ts`).

## Batch 421

Registry queue entries carry `contentHash`.

## Batch 423

`case/`: registry queue entries can be held with `REGISTRY_LIVE_NOT_APPROVED` (registry go-live gate).

## Batch 424

`case/`: a held-for-attestation entry (`REGISTRY_LIVE_NOT_APPROVED`) now shows on the worklist as its own kind.

## Batch 425

`case/`: registry queue entries carry `registryRevisions[]`; cancer entries can be held `HOLD_MISSING_MANDATORY_DATA`. `patients/`: the A08 source operation `recordNationalIdentifier`.

## Batch 426

`case/`: order numbers, re-evaluations and further parts on a workup, and the Assist LIS-sync entry's version and observations.

## Batch 427

`case/`: the LIS-sync kind `case_pdf`; the parts a workup covers are now editable.

## Batch 430: personal settings per person; view-only fields

Test only: `voiceMacros.test.ts` adds its macro as the signed-in person's own (shared macros need `config:macros:manage`).

## Batch 433

`billing/BillingDeficiencyRecord.ts`: types `MISSING_CHARGE` and `POST_SIGNOUT_CORRECTION`, trigger `MANUAL_BILLING_CORRECTION`, and `missingCharge` (a deficiency names its charge or says one is missing).

## Batch 434

`case/Specimen.ts`: a slide's link to its WSI scan batch, the `Scanned` status and the `unloaded_from_scanner` event.

## Batch 438

`quality/CapaRecommendation.ts` (new); `quality/QaActivityRecord.ts` `consensus`; `reasons/ReasonDictionaryEntry.ts` `clinicallySignificant`.

## Batch 439

`quality/PeerReview.ts` (new); `quality/QaActivityRecord.ts` `reviewedPathologist`, `postSignOut`; `quality/QaActivityType.ts` `postSignOutOnly`.

## Batch 442

`quality/QaTrend.ts`: site-configurable discordance-pattern policy and recommendations (PS-147).

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

`case/`: `Decant.parentDecantId` and `Decant.coding`, plus the stored correlation window.

## Batch 460

`case/MatrixBlock.ts`: alert-badge fields; comments corrected.

## Batch 461

`case/Case.ts`: `organMapFigures`. `reports/ReportVersionRecord.ts`: `organMapFigures`, `pdfSha256`.

## Batch 467 — In-house molecular orders

`case/`: synoptic `resultSources`; the Molecular In-House Queue.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

`events/`: order ids on molecular worklists and results; referral manifests and results name molecular orders.

## Batch 468 — Autopsy: consent-scope enforcement, forensic chain-of-custody

`autopsy/`: `HospitalConsentRecord` redesigned (`status`, `excludedOrgans`, `retentionPermitted` replace the old conflated `revokedOrNarrowedAt`); new `AutopsyCustodianType`/`AutopsyCustodyTransferEvent`; `AutopsyCaseDetails.custodyLog`.

## Batch 469 — Autopsy: toxicology, organ-retention disposal, consent narrowing/revocation (PS-261 follow-up)

`autopsy/`: new `AutopsyToxicologyOrder`/`AutopsyToxicologyResult` on `AutopsyCaseDetails.toxicologyOrders` (with a disclosed, not-yet-written `cancelledAt`/`cancelReason` pair — now written by Batch 471, see below); `AutopsyCaseDetails.organRetentionDisposal` (method, timestamp, certificate reference, who recorded it — not a recipient; final disposal only). No new types for consent narrowing — reuses the existing `HospitalConsentRecord` shape from Batch 468.

## Batch 471 — Autopsy: toxicology cancellation, organ-retention detail, consent reinstatement (PS-261 follow-up)

`autopsy/`: `cancelledAt`/`cancelReason` on `AutopsyToxicologyOrder` are now written (`services/autopsy/cancelAutopsyToxicologyOrder.ts`), closing the gap Batch 469 disclosed. New `OrganRetentionRecord` type on `AutopsyCaseDetails.organRetentionDetail` — who holds retained organs/tissue and where, while retention is ongoing; a single current record, distinct from the final-disposal record above. Consent reinstatement adds no new type — a second write site (`services/autopsy/applyAutopsyConsentReinstatement.ts`) is allowed to widen the same `HospitalConsentRecord` fields Batch 469 made narrow-only, gated by its own separate capability. See `autopsy/README.md` for the full account.

## Batch 472 — Autopsy: retention-tier reason (PS-261 follow-up)

`autopsy/`: new optional `AutopsyCaseDetails.organRetentionTierReason` — a free-text reason for the `organRetentionTier` selection itself, distinct from `OrganRetentionRecord.reason`. No new write site; set alongside the tier by the same existing handler. See `autopsy/README.md`.

## Batch 473 — Autopsy case-type key migration (PS-261 follow-up)

`autopsy/`: `AutopsyCaseAuthority`'s forensic-path value renamed, `'medicolegal_forensic'` → `'statutory_judicial'` — same shape, no new type. See `autopsy/README.md`.

## Batch 475 — Autopsy Module 3: toxicology specimen barcode & chain-of-custody link (PS-261 follow-up)

`autopsy/`: `AutopsyToxicologyOrder.specimenBarcode` (new, required) and `AutopsyCustodyTransferEvent.toxicologyOrderId` (new, optional) — no new type. See `autopsy/README.md`.

## Batch 478 — Autopsy Module 6: gross-exam gate override, per-organ tagging (PS-261 follow-up)

`autopsy/`: two new types on `AutopsyCaseDetails` — `AutopsyGateOverrideEvent` (`gateOverrides`, append-only: every time the gross-exam authorization gate was overridden, with its tier, the gate's own blocked reasons, a required reason, who and when) and `AutopsyOrganTag` (`organTags`, append-only: a per-organ gross-exam finding — organ code, normal/abnormal/not-examined status, optional free-text finding, who and when). See `autopsy/README.md`.

## Batch 479 — fix: gross-exam gate `blockedReasons` are reason codes now, not literal English (PS-261 follow-up)

`autopsy/`: `AutopsyGateOverrideEvent.blockedReasons` now holds `AutopsyGrossExaminationBlockReason` codes rather than hardcoded English sentences — the disclosed-not-fixed gap from Batch 478, fixed in the next batch rather than deferred. No type shape change (still `string[]`); only what's stored in it changed. See `autopsy/README.md`.

## Batch 483 — fix: a cytology data-loss bug (PS-359 tracker follow-up)

`case/CountersignRecord.ts` gains an optional `specimenId`, set only by cytology's per-specimen sign-out, fixing a case where a second cytology specimen's countersign release destroyed the first's still-pending record. See `case/README.md` and `services/cases/README.md`.

## Batch 511 (PS-478): full strict type-checking

`case/Case.ts`: `finalizedBy` is `string | null`; sign-out really stores `null` when there is no signing user.

## Batch 512

`case/Specimen.ts`: `lisStatus` is renamed `lisSyncState`; see `case/README.md`.

## Batch 513 (PS-269)

`labels/LabelData.ts`: `barcodePayloadForStation()` takes just `{ barcodeCode }` so the Scan Stations screen can use it (same output).

## Batch 515 (PS-124)

`case/FppeAssignment.ts` deleted; FPPE assignments use `quality/QaSupervisionAssignment.ts`.

## Batch 519 (PS-273)

`cytology/SynopticTemplate.ts` is now aliases for the shared Synoptic Library template model (`components/Config/Protocols/SynopticEditor.tsx`), which gained Cytology's narrative, tier and standard properties.

## Batch 520 (PS-280)

- `delivery/DeliveryRule.ts`: `DeliveryChannel`, and `DeliveryChannelPlan` (primary / secondary / fallback); a rule's optional `channels`, `faxNumber` and `fileDropTargetId`.
- `delivery/ReportDeliveryQueueEntry.ts` (new): one e-fax or file-drop delivery.

## Batch 521 (PS-281)

`delivery/DeliveryRetryRecord.ts` (new): one failed automatic delivery and its retries, dead-letter, fallback and transmission report. `ReportDeliveryQueueEntry` gains the release's fallback channels and the transmission report.

## Batch 532

`cytology/CytologyCaseReport.ts` (new): the consolidated cytology case report. `case/CytologyOutboundResultQueueEntry.ts`: `scope?: 'case'`.

## Batch 533

`cytology/CytologyPreliminaryRelease.ts` (new); `Case.cytologyPreliminaryReleases`; `CytologyReportContent.preliminary`; `CytologyOutboundResultQueueEntry` resultState `PRELIMINARY` and scope `'preliminary'`.

## Batch 534

`reportRelease/HeldRelease.ts` (new); `cytology/CytologySignOutRecord.recalled`; `cytology/CytologyPreliminaryRelease.recalled`.

## Batch 535

`reports/AmendmentRecord.recalls`; `reportRelease/HeldRelease.subject.instanceId` / `previousRevisionType`.

## Batch 538

- **Queue entries record the released report document they carry:**
  - `case/OutboundResultQueueEntry` and `case/CytologyOutboundResultQueueEntry`: `reportDocumentId` and `pdfSha256`;
  - `printing/PrintJob`: `reportDocumentId` and `pdfSha256`;
  - `delivery/ReportDeliveryQueueEntry`: `release.documentId`, and `pdfSha256` when sent.
- **Elsewhere:** `delivery/DeliveryRetryRecord.DeliveryReleaseContext.documentId`. (`HeldRelease` is unchanged: a held report's PDF stays on the hold and is stored when the delay ends.)

## Batch 539

`cytology/CytologyReportContent.imageAssociations`: documented as not drawn (nothing sets it; the server's cytology template doesn't draw it).

## Batch 546

`printing/PrintJob.ts`: the error code `NEEDS_SITE_AGENT` (F3).

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

- Batch 553: `printRouting/PrintDestination.ts` is a union, a site agent printer (`AgentPrintDestination`) or a printer address (`NetworkPrintDestination`); `printing/PrintJob.performingFacilityId`. *(Batch 552's `PrintJob.confirmation` wasn't noted here in Batch 552.)*

## Batch 558 (PS-539 phase 2d: report versions through the API)

- Batch 558: `reports/ReportVersionRecord.ts` (the `pdfSha256` correction).

## Batch 559 (PS-539 phase 2d)

- Batch 559: `case/OutboundResultQueueEntry.ts` (`pdfSha256` set for signed versions and on retry).

## Batch 572

- `cytology/CytologyScreeningHoursSignOff.ts` (new): a person's end-of-day sign-off of their screening hours, and its reasons.

## Batch 574

- `cytology/CytologyScreeningHoursSignOff.ts`: `dayStartHour` on a sign-off; `SCREENING_HOURS_NOTE_MAX`.

## Batch 588

- `case/Specimen.ts`: `BlockStatus` `Deleted`, `BlockDeletion`. `billing/BillingDeficiencyRecord.ts`: type `BLOCK_DELETED`, trigger `BLOCK_DELETION`, `BlockDeletedDetail`.

## Batch 612 (part C)

`LabelConfig.units` (`FontUnits`: `pt` or `legacy_px`) in `template.ts`; `ReportTemplate.fontUnits` in `reportPart.ts`. Missing means `legacy_px` (saved before points).

## Batch 610 (part A) — TATType, TATEntry, IntraopSpecimen

`TATType` gains `AUTOPSY_PAD`/`AUTOPSY_FAD`; `TATEntry.warningMinutes`; `IntraopSpecimen.urgency`.

## Batch 651: AI answers checked in code
See `services/aiIntegration/aiSuggestionRules.ts`, `services/coding/aiCodeSuggestions.ts`, `orchestrator/narrativeProvenance.ts` and `docs/product/GUIDE_UPDATES.md` (Batch 651).

## Batch 652 — Specimen pipeline gaps

`case/Case.ts`: `intraoperativeFindings`, `lockboxReceiptId`; `intraop/CaseIntraoperativeFinding.ts` (new).

**Batch 715:** `case/CaseLabelStyle.ts` adds `Case.labelStyle` (the letters/numbers style in force at accessioning) to `Case`.

## Batch 729

- `case/MatrixBlock.ts`: the Embedding Station fields (mold, orientation, discrepancy, cassette reprint), as on `HistologyBlock`.

## Batch 731

- `case/Specimen.ts`: the add-on exception statuses and events gain `used_unstained`, `moved_to_other_block`, `reembed_requested`, `reembedded` (edited in place; the file does not grow).

## Batch 732

- Batch 732: `case/blockPieces.ts` (new): `BlockType`, `SlideSize`, `BlockPiece`. `case/Specimen.ts`: `HistologyBlock.blockType` / `pieces`; `StainOrder.slideSize` / `sectionCount` / `levelCount` / `pieceIds`; `AddOnOrderException` and `AddOnOrderExceptionEvent` moved to `case/addOnOrderException.ts` (re-exported) so the file shrinks (1,840 lines). `case/MatrixBlock.ts`: a participant's `orientation`, `ink`, `exhaustedAt`.
