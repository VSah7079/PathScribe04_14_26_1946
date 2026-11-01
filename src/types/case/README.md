**Batch 741:** `Material.ts`: aliquot volume, destination, status and history, receiving accession; `SpecimenDivision`. `Specimen.ts`: `division`.

**Batch 740:** `Material.ts`: `Decant.handoff` (the cell block hand-off).

**Batch 739:** `Material.ts`: `DecantType` gains `aliquot`; `ALIQUOT_PURPOSES` / `AliquotPurpose`, `Decant.aliquotPurpose`. `MolecularOrderOutboundQueueEntry.ts`: the instrument order names the processor (`processorCode`, `processorMake`, `processorModel`), no fixed vendor.

**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

# types/case/

The core case domain model — `Case`, `Specimen`, and every real type layered onto them as the app grew. The single most important folder in `types/`: almost every service and page ultimately reads or writes through these shapes.

## Files

- **`Case.ts`** — the root entity. Case-level status, accession, participants, synoptic reports, and the accumulated arrays (`retentionHolds`, `caseHolds`, `matrixBlocks`) documented individually below.
- **`Specimen.ts`** — specimens, `HistologyBlock`, `StainOrder` — the primary material tree. `Material.ts` below extends this rather than duplicating it. Real, per direct billing-expert guidance (PS-93): `StainOrder` gained `targetSpecimenIds`/`evaluatedSpecimenIds` (only meaningful on a stain inside a shared `MatrixBlock.slides[]`), and `Specimen` gained `matrixBlockCoding` — see `MatrixBlock.ts`'s own entry below and `services/billing/README.md`'s full PS-93 account. Real, per direct guidance (Cytology & Cervical Screening module, Phase 2, Sep 2026): `Specimen` gained `cytologyScreening?: CytologyScreeningRecord` — a GYN cytology specimen is just a regular `Specimen` (`SpecimenEntry.type: 'Cytology'`/`'FNA'` already distinguishes it), not a parallel case system. References `CytologyCategoryEntry.id` (`services/cytology/`) for adequacy/general categorization/interpretation-result rather than duplicating label text. See `services/cytology/README.md` for the full account. **Protocol-Driven Workflow Infrastructure story additions (Sep 2026)**: `Specimen.protocolSnapshot?: { id, version, name }` locks the exact Protocol identity/version resolved at accession (`utils/generateDefaultMaterial.ts`) — a later edit to the master Protocol never retroactively changes what an already-accessioned specimen shows. `Specimen.triage?: SpecimenTriage` supersedes the earlier, simple retrospective `triageConfirmedAt`/`triageConfirmedBy` pair with a real, per-item checklist that genuinely gates block release (`useSpecimenBlockManagement.ts`'s `handleReleaseGrossingBlocks`) unless every item is confirmed or a supervisor override reason is recorded — see `services/protocols/README.md` for the full Part 1–2c account.
- **`CaseStatus.ts`** — the case lifecycle status enum (`draft` → ... → `finalized`/`closed`), deliberately large and mutually-exclusive; see its own header for why a status like "on hold" doesn't belong here (that's `CaseHold.ts`, layered orthogonally). **Real, per direct guidance ("Yes we should scope 'Return to Trainee'/'Reject with Notes'"): `'returned'` — a real, pre-existing member of this union previously confirmed to have zero real consuming logic anywhere in the app — is now genuinely wired**, reused deliberately rather than adding a new status value; see `services/cases/README.md`'s own fuller account of that decision and why.
- **`CaseComment.ts`** — real, append-only comment thread, replacing an earlier plain-string field that any save silently overwrote.
- ~~`CaseFlag.ts` / `SpecimenFlag.ts`~~ — removed in Batch 499 (listed in the root `DELETED_FILES.txt`). They were older flag-definition shapes with no importers: since Batch 452 (PS-57), `Case.caseFlags` and `Specimen.specimenFlags` are `FlagInstance[]` (`types/flagsRuntime.ts`). The flag catalog itself is in `services/flags/`.
- **`RetentionHold.ts`** — case-level hold gating **disposal** after finalization (litigation, patient request, research). Set at accession or later; multiple can accumulate over a case's life, none ever deleted, only released.
- **`CaseHold.ts`** — case-level hold gating **finalize** on an active, not-yet-done case ("something truly wrong" — quality issue, awaiting outside materials, clinical discrepancy, pending consultation). Deliberately a separate type from `RetentionHold` despite the shared "Hold" name — see this file's own header for the full distinction.
- **`MatrixBlock.ts`** — case-level (not per-specimen) shared/matrix blocks, pulled out of individual `Specimen.blocks[]` arrays so a block shared across specimens has one real, single identity rather than duplicated copies. Real, per direct billing-expert guidance (PS-93): `StainOrder.targetSpecimenIds`/`evaluatedSpecimenIds` (`Specimen.ts`, same file) resolve real per-specimen ancillary billing coverage for a Biopsy Array — see `services/billing/README.md`'s own PS-93 entry for the full account.
- **`Material.ts`** — the newer pieces of the material tree not already covered by `Specimen.ts` (e.g. `Decant`).
- **`CountersignRecord.ts`** — the real resident-drafts/attending-countersigns workflow record. **Real, per direct guidance ("Yes we should scope 'Return to Trainee'/'Reject with Notes'"): `status` gained a real, third member, `'returned'`**, alongside a new `returnedAt` — see `services/cases/README.md`'s own fuller account of the new `reject()` method that produces it. **Batch 483 (PS-359 tracker follow-up):** gained an optional `specimenId`, set only by cytology's per-specimen sign-out — never by surgical pathology or autopsy — fixing a real data-loss bug where a cytology case's second specimen release destroyed the first's still-pending record. See `services/cases/README.md`'s own Batch 483 entry for the full reasoning.
- **`FppeAssignment.ts`** — Focused Professional Practice Evaluation (new-hire credentialing) tracking, generalized from the countersign mechanism. **Real fix, per direct guidance:** gained a required `facilityId` — had no facility association at all before, a genuine gap; every FPPE assignment is a real, specific person practicing at one real, specific performing lab, unlike a shared network-pool printer where "no single owner" is a valid state. *(Deleted in Batch 515, PS-124: replaced by `types/quality/QaSupervisionAssignment.ts`.)*
- **`Patient.ts`** — patient demographics; medical-grade name schema (Prefix/Given/Family/Preferred/Suffix, not rigid First/Middle/Last).
- **`ErasureCertificate.ts`** — deliberate, forward-looking scaffolding for a real GDPR Article 17 compliance feature. Zero current consumers on purpose — waiting on legal counsel sign-off before being wired to a real delete. Not dead code.
- **`Margin.ts`** — margins and their ink applications (Batch 480, below).
- **`MaterialComment.ts`** — plain-text comments on blocks, slides and decants.
- **`AddOnOrder.ts`** (PS-287) — shared constants and small types for pathologist-initiated add-on orders.
- **Outbound queue entries** (one per interface message kind): `OutboundResultQueueEntry.ts` (surgical results, ORU^R01), `CytologyOutboundResultQueueEntry.ts`, `AccessionOutboundQueueEntry.ts` (accession and deficiency events), `MolecularOrderOutboundQueueEntry.ts`, `OutboundLisSyncQueueEntry.ts`, `CytologyRegistryOutboundQueueEntry.ts` and `CancerRegistryOutboundQueueEntry.ts` (see the batch entries below).
- ~~`ReportSnapshot.ts`~~ — removed in Batch 366 (PS-68): nothing used it, and `types/reports/ReportVersionRecord.ts` is the release record the app uses. See that file's header for the two points carried forward for the API server.

*Corrected in the Batch 496 README audit (Oct 9, 2026): `CaseFlag.ts`/`SpecimenFlag.ts` are no longer the stored flag shape and have no importers; added ten files missing from this list.*

## Notes

- `RetentionHold` and `CaseHold` are the two real, deliberately-separate "hold" concepts in this app. Neither gates the other; a case can have an active instance of both simultaneously (e.g. a case on hold for a quality issue *and* separately under litigation retention).

## `SynopticReportInstance.aiDraftSource` (Batch 322, PS-87)

Optional. Set when an Assist-mode LIS poll created or last refreshed a draft synoptic report. It records which LIS milestone drove it (`gross_complete` / `micro_diagnosis_complete`), when, and the AI's reason and confidence for the template. It is absent on every report a person created. Used to tell an untouched AI draft (which a later milestone may revise) from a pathologist's own work (which is only ever changed through review). See `services/assistPolling/`.

## `Case.spellingLocaleOverride` (Batch 338, PS-342)

Optional. The spelling language chosen for this one case in the report screens (an id from `services/spellcheck/spellingLocales.ts`); null or absent means "use the default": the assigned pathologist's preference, else the ordering facility's. Saved by the report screens' spelling language control.

## Batch 417

`Patient.nationalIdentifiers?: NationalPatientIdentifier[]` (`types/patient/`): the national healthcare identifiers with their check-digit verification. `mrn` is the lab's own number and is unchanged.

## Batch 418

`Patient.registryConsent?: PatientRegistryConsent` (screening opt-out, cancer registry opt-out, when, by whom). `CytologyRegistryOutboundQueueEntry.errorCode` names the two non-dispatch codes.

## Batch 419

Both registry queue entries carry `submission` (the payload header: id, version, master id, message type, environment, duplicate-retry flag).

## Batch 420

`CytologyRegistryOutboundQueueEntry` and `CancerRegistryOutboundQueueEntry` gain `registryStatus` (what the registry said), `sentAt` and `acknowledgements` (each answer with its raw text).

## Batch 421

Both registry queue entries: `contentHash` (the payload's fingerprint, for telling a resend of the same report from a new version).

## Batch 423

`CytologyRegistryOutboundQueueEntry.errorCode` and `CancerRegistryOutboundQueueEntry.errorCode` gain `REGISTRY_LIVE_NOT_APPROVED`: the registry is set to its live register without a current go-live approval.

## Batch 424

`REGISTRY_LIVE_NOT_APPROVED` entries are their own worklist kind: "Held: attestation required". They are resent in the go-live catch-up or with **Resend all**.

## Batch 425

The registry queue entries (`CytologyRegistryOutboundQueueEntry`, `CancerRegistryOutboundQueueEntry`) gain `registryRevisions[]`: a registry's revisions of data it had accepted. The cancer entry's `errorCode` gains `HOLD_MISSING_MANDATORY_DATA`.

## Batch 426

- `OrderMetadata` gains `placerOrderNumber` and `fillerOrderNumber`.
- `SynopticReportInstance` gains `reevaluations` (re-evaluated fields waiting for "keep or update?") and `additionalSpecimenIds` (parts one workup covers; no screen sets it yet).
- `OutboundLisSyncQueueEntry` gains the kind `final`, `workupVersion`, `sentObservations` (for the next correction's change list) and `signer`.

## Batch 427

`OutboundLisSyncQueueEntry.kind` gains `case_pdf` (the case's combined PDF). `SynopticReportInstance.additionalSpecimenIds` is now set from the report sidebar's "Parts covered".

## Batch 434

`Specimen.ts` → `StainOrder`:
- `distributionStatus` gains `Scanned`;
- new `wsiScanBatchId`;
- `SlideDistributionEvent.action` gains `unloaded_from_scanner`.

See `services/digitalPathology/wsiScanQueue.ts`.

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

`Decant.parentDecantId` (a decant split from another) and `Decant.coding` (billing codes, the block shape). `CytologyScreeningRecord.histologyCorrelationWindow` (PS-156).

## Batch 460

`MatrixBlock` gains `tinyTissue`, `fragile` and `requiresDecal` (Microtome alert badges, as on `HistologyBlock`). Its comments no longer point to `utils/matrixBlocks.ts` or `utils/matrixBlockIdentifier.ts`, which don't exist. The identifier is in `types/labels/LabelData.ts`.

## Batch 461

`Case.organMapFigures?: OrganMapFigure[]`: the anatomical map images a pathologist inserted into the report, one per synoptic (a snapshot: print SVG, PNG, the map's fingerprint, who and when). See `services/organMapping/organMapFigures.ts`.

## Batch 467 — In-house molecular orders

`SynopticReportInstance.resultSources`: per question, the molecular order and call that filled it. `routedQueueLabel` adds 'Molecular In-House Queue' (Specimen, AddOnOrder).

## Batch 480 — Structured Inking, Module 1: Margin and Ink Application data model (PS-359)

**`Margin.ts` (new)**: `Margin` (id, name, optional free-text `orientation`/`laterality`, `examinationStatus`, and an append-only `inkApplications: MarginInkApplication[]`) and `MarginInkApplication` (id, colorCode, colorName, appliedAt, appliedByName). Margins are modeled as discrete entities distinct from physical specimen blocks, per Pete's own requirement, with a polymorphic one-to-many of ink applications so a second colour never overwrites the first or changes the margin's own identity.

**`Specimen.ts`**: `margins?: Margin[]` added to both `HistologyBlock` and `Specimen`, since Pete's spec allows attachment "at the Tissue Block level (or parent Specimen level, depending on grossing protocol)" — never both for the same margin. See `services/grossing/recordMarginInkApplication.ts` and `services/grossing/resolveInkingValidationSeverity.ts`.

---
*See [types/README.md](../README.md) for how this folder fits the whole types/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master types/README.md if this folder's overall PURPOSE changes.*

## Batch 511 (PS-478): full strict type-checking

`Case.finalizedBy` is `string | null`; sign-out stores `null` when there is no signing user.

## Batch 512

`Specimen.lisStatus` is renamed **`lisSyncState`** (type `SpecimenLisSyncState`, was `SpecimenLisStatus`). It records whether PathScribe has changed the specimen since the LIS sent it, not the LIS's own status, and the old name read like the latter. Unset means the same as `lis_owned`. Demo data saved before the rename loses any "Pending sync" badge until the specimen is edited again or the demo is reset.

## Batch 515 (PS-124)

`FppeAssignment.ts` deleted; FPPE assignments use `types/quality/QaSupervisionAssignment.ts`.

## Batch 532

`CytologyOutboundResultQueueEntry.scope` (`'case'`): one consolidated message for the accession, since Batch 532. Entries without it are the per-specimen messages sent before.

## Batch 533

`Case.cytologyPreliminaryReleases`: urgent cytology preliminaries sent before the case report, written once. `CytologyOutboundResultQueueEntry`: `PRELIMINARY` with `scope: 'preliminary'` (signOutRecordId is then the release id).

## Batch 538

`OutboundResultQueueEntry` and `CytologyOutboundResultQueueEntry`: `reportDocumentId`, `pdfSha256` (the released report document the message carries; a retry sends it).

## Batch 559 (PS-539 phase 2d)

- `OutboundResultQueueEntry.pdfSha256` is set for a signed version's PDF too, and updated by a retry.

## Batch 588

- `Specimen.ts`: `BlockStatus` gains `Deleted`; `HistologyBlock.deletion` (`BlockDeletion`) records the reason, who, when and the billing codes released.

- Batch 608: `CytologyScreeningRecord` gains `hpvAssayName`, `hpvFollowUp`, `liquidBasedPlatform`, `priorCervicalProcedure`.

## Batch 611 (part F)

`Case.importSource` marks a case created by the simulated legacy file import (`kind: 'simulated_bulk_import'`, job id, source system, time).

## Batch 630

`HpvManualEntry.ts`: the four manual Result Sources (`MANUAL_PAPER_REPORT`, `MANUAL_DOWNTIME_OVERRIDE`, `MANUAL_PHONE_VERIFICATION`, `MANUAL_RETROSPECTIVE_ENTRY`), the entry and decision records, and (by type merging, because `Specimen.ts` is over its size limit) the screening-record fields `hpvResultSource`, `hpvManualEntries`, `hpvPendingOverride`, `hpvOverrideDecisions`.

## Batch 631

`HpvGenotype.ts`: `HpvGenotypeDetail` (the 16 / 18-or-45 / other grouping, now with optional separate `hpv18` and `hpv45`), used by the specimen's screening record and the inbound HPV result event.

## Batch 651
`Case.ts`: the `pendingProtocolChanges` and `ProtocolChange.reviewStatus` comments now say the field is written only by the Assist-mode LIS poll; the Orchestration Save Draft background re-check they described was never built (Planned).

## Batch 652 — Specimen pipeline gaps

- `Case.intraoperativeFindings` (`CaseIntraoperativeFinding[]`) and `Case.lockboxReceiptId`. `Case.ts` stays at 1058 lines.

## Batch 732

- Batch 732: `blockPieces.ts` (new) and `addOnOrderException.ts` (new, moved out of `Specimen.ts`); block type, piece map and slide fields on `Specimen.ts`; matrix participant orientation, ink and exhaustion on `MatrixBlock.ts`.
