# services/fieldRequirements — which fields a page requires (PS-359, Batch 376)

Pete: "The User may need to have control over what fields on a page are required before saving. Field Configuration that is grouped by Pages … Some fields should always be required, and should be uneditable."

- **The catalog** (`FIELD_REQUIREMENT_PAGES` in `fieldRequirementRules.ts`) is the only list of configurable pages and fields. Each field is one of:
  - **locked:** always required, with a reason shown;
  - **required:** by default, and can be switched off;
  - **optional:** by default, and can be switched on.
- **Defaults reproduce what each page required before,** so nothing changes until an administrator changes it.
- **Settings are per organisation only.** There are no enterprise or performing-facility overrides (Pete). An organisation's choices are stored only where they differ from the default.
- **Changing one** (`setRequired`):
  - needs `config:field-requirements:manage` (seeded to Admin);
  - applies only to the person's own organisation;
  - refuses locked fields;
  - writes a "Field requirement changed" audit entry.
- **Screens** read the resolved requirements (`forSession(page)`) and use `missingRequiredFields` to decide whether they can save and what to list as missing. The API server applies the same rules when it saves (phase 4).

## Accession (the first page)

| Group | Field | Default |
|---|---|---|
| Patient | Given name(s), family name(s), date of birth | locked (patient identification) |
| Patient | Patient ID (MRN) | optional |
| Order | Submitting facility | locked (routing and billing) |
| Order | Requesting provider | locked (the ordering person is required by laboratory regulations) |
| Order | Location, assigned pathologist, clinical indication | optional |
| Specimens | Description | locked (a case needs at least one described specimen), checked on every specimen |
| Specimens | Date/time collected, date/time placed in fixative | optional, checked on every specimen |

The Accession page greys out Next and Submit until the required fields are filled, and lists what's still required. The Patient ID and Assign to Pathologist labels drop "(optional)" when the organisation requires them.

**Adding a page:** add its fields to the catalog with ids that never change, add their names under `fieldRequirements.fields.<page>` in all five locales, and have the page call `forSession(page)` and `missingRequiredFields`.

## Files

| File | What it holds |
|---|---|
| `fieldRequirementRules.ts` | The catalog, `resolveFieldRequirements`, `overrideProblem`, `missingRequiredFields` and the audit entry. Pure. |
| `fieldRequirementService.ts` | `createFieldRequirementService(deps)`: read and change an organisation's choices. |
| `defaultFieldRequirementService.ts` | The mock wiring. Stored under `pathscribe_field_requirements`; a Full Reset clears it back to the defaults. |
| `fieldRequirements.test.ts` | Rules and service. |
| `reportPageChecks.ts` | Batch 380: what the case report page's modals need before saving (+ `reportPageChecks.test.ts`). |
| `messagingChecks.ts` | Batch 384: what the message drawer, reply box and Secure email window need before sending (+ `messagingChecks.test.ts`). |
| `cytologyChecks.ts`, `microtomyChecks.ts`, `intraopChecks.ts`, `embeddingChecks.ts`, `slideDistributionChecks.ts`, `addOnOrderChecks.ts`, `batchChecks.ts`, `molecularBatchChecks.ts`, `molecularRackChecks.ts` | Batches 386 to 406: one per later page (each with its test); see the batch entries below. |

The catalog now has thirteen pages: Accession, Grossing, Case report, Messaging, Cytology, Microtomy, Intraop, Embedding, Slide distribution, Add-On Orders, Batch Management, Molecular plate builder and Molecular rack loading.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the Files table stopped at Batch 384; added the nine later check files and the current page count.*

## Batch 377: fields filled in automatically

A field marked `autoFilled` is filled in by the page when left blank, so a blank value still counts as supplied. Accession's Patient ID is one: left blank, it becomes `AUTO-<case number>`. If an organisation requires Patient ID and none can be generated, Submit stops with an alert (Pete). Field Requirements shows "Filled in automatically if left blank" beside such a field.

## Batch 378: Grossing

The Grossing screen saves each edit as it's made, so its requirements are checked when grossing is completed (`services/grossing/grossingCompletion.ts`).

| Group | Field | Default |
|---|---|---|
| Specimens | At least one block | locked, checked on every specimen (required by default and switchable since Batch 379) |
| Blocks | Piece count | optional, checked on every block |
| Fixation | Fixation end time | optional, checked on every specimen |
| Fixation | Fixative-to-tissue ratio confirmed | optional, checked on every specimen |

New field flag: `perBlock`. New groups: `blocks`, `fixation`.

## Batch 379: the protocol rule, switchable per organisation (Pete)

Pete: required by default, but switchable per organisation, since departments differ in how rigidly they work and how they read the regulations.

| Group | Field | Default |
|---|---|---|
| Specimens | Grossing protocol attached (`protocol`) | **required**, checked on every specimen. This is the organisation's "require protocol for grossing completion" switch. |
| Specimens | At least one block | **required** (was locked), checked on every specimen that has a protocol and isn't a cytology preparation |

- **Who can switch it:** anyone holding `config:field-requirements:manage`, for their own organisation only. Admin has it built in. A hospital that wants its quality manager to decide grants that capability to the quality manager's role in Staff → Roles; there is no built-in Quality Manager role.
- **Switched off**, a specimen without a protocol no longer stops Complete grossing. The Grossing screen says which specimens will go for review, asks for confirmation, and each one gets an open "Grossed Without Protocol" deficiency in the QA deficiency queue (`services/grossing/grossingCompletion.ts`).
- **Why the block rule changed scope:** blocks are added on the Grossing screen from the protocol's pathways, so a specimen with no protocol can't get one there, and a cytology preparation makes slides (decants), not blocks. Before this, either kind of specimen stopped its case from ever completing. The protocol rule now covers the first; the second no longer needs blocks.
- New field flag: `hint` (`blocksScope`, `protocolOff`), shown on the Field Requirements screen in place of "Checked on every specimen". The `blocks` lock reason is gone.

## Batch 380: the case report page, group 1

Pete: "move on to the Synoptic Report page and its related modals". New page **Case report** (`report`), checked when each modal saves, by `reportPageChecks.ts` (+ test):

| Group | Fields | Default |
|---|---|---|
| Add or edit specimen | Specimen label, Specimen description | locked (what the modal already required) |
| | Anatomic site, Laterality, Collection method, Container type, Complexity, SNOMED specimen type, SNOMED anatomic site | optional, switchable on |
| Amendments and addenda | Reason, Explanation or addendum text, Addendum title, Clinician notified of a major amendment | locked (CAP / RCPath; the amendment service also enforces them) |
| | Clinician notified of a minor amendment, Clinician notified of an addendum | optional, switchable on; when on, the notification section shows for that type |
| Critical findings | Clinician notified, Notification method, Notified by | locked (CLIA 42 CFR 493.1291(g)) |
| | Clinician read back the finding | optional, switchable on |

- `specimenEditProblems`, `revisionMissingFields`, `revisionNotificationShown` and `criticalNotificationMissing` return what's missing in catalog order. The modals show it as "Still required: …" and mark required labels.
- `hooks/useFieldRequirements(page)` loads a page's requirements for the signed-in user's organisation, starting from the defaults.
- A synoptic template's own required answers stay with the template (`RightSynopticPanel.validateRequired` at finalize). They aren't duplicated here.
- Group 2 (holds, comments, Delegate, biopsy arrays, block cancel/restain) came in Batch 381; group 3 came in Batches 382 (discordance and billing changes) and 383 (the autopsy forms and the date and fixative gates).

## Batch 381: the case report page, group 2

Pete chose to list each modal's fixed fields as locked, so the settings screen shows every rule a modal applies.

| Group | Fields | Default |
|---|---|---|
| Holds | Case hold note and release note; retention hold note and release note | locked |
| Comments | Comment text | locked |
| Delegation | Delegation type, recipient, the synoptic report (when handing one over) | locked |
| | Note on every delegation | optional, switchable on. A delegation type can also require a note of its own (Delegation Types); either one shows the note field. |
| Biopsy arrays | Cassette label, at least two specimens | locked |
| Block cancellation and restains | Reason for cancelling a block; stain and reason for a restain | locked (ISO 15189 traceability) |

New checks in `reportPageChecks.ts`: `holdMissing`, `commentMissing` (an editor's empty paragraph counts as empty), `delegationMissing` / `delegationNoteShown`, `biopsyArrayMissing`, `chosenReason`, `blockCancelMissing`, `restainMissing`.

## Batch 382: the case report page, group 3 (part 1)

Pete's group 2 choice again: every fixed field is listed as locked.

| Group | Fields | Default |
|---|---|---|
| Frozen-final reconciliation | Final diagnosis, final category | locked |
| | Delta, clinical impact, root cause, comment on the discordance | locked; asked only when the final category differs from the frozen one |
| | Explanation when the root cause is Other | locked; asked only for that root cause |
| Billing changes after sign-out | Reason and comment for a billing change | locked (an audit trail for the charge and credit) |
| | Corrected billing code | locked; must also differ from the code being corrected |

New checks in `reportPageChecks.ts`: `discordanceStage` (none chosen / concordant / discordant), `discordanceMissing`, `billingChangeMissing`, `correctedCodeCheck`. The record the reconciliation modal saves is built in `services/quality/discordanceRecord.ts`, from the same checks.

## Batch 383: the case report page, group 3 (part 2)

| Group | Fields | Default |
|---|---|---|
| Autopsy forms | Written order reference and date (medicolegal cases) | locked (the gross-examination gate needs them) |
| | Consent time (hospital-consented cases) | locked |
| | Consent scope | optional, switchable on |
| | Body released to, released by | locked (chain of custody) |
| Sign-out gates | Fixation time (or confirming none is possible) | locked (CAP/ASCO) |
| | Reason no fixation time is possible | optional, switchable on |
| | Collection and receipt date/time (or the administrative override) | locked (ISO 15189, CAP/CLIA and equivalents) |
| | Override justification | locked |

New checks in `reportPageChecks.ts`: `autopsyAuthorizationMissing` (by case authority) and `autopsyReleaseMissing`. The gates' checks are in `services/signoutGates/`. This completes group 3.

## Batch 384: the Messaging page

| Group | Fields | Default |
|---|---|---|
| New message | Recipient(s) | locked (a message must be routed) |
| | Subject | required, switchable off |
| | Message text | locked |
| Secure email | To (an external address) | locked |
| | Subject | required, switchable off |
| | Message text | locked |
| Reply | Reply text | locked |

`messagingChecks.ts`: `newMessageMissing`, `secureEmailMissing` (the address must contain `@`, as before) and `replyMissing`. A fourth page in the catalog; the AppShell drawer, reply box and Secure email window use it.

## Batch 386: Cytology screening (fifth page)

Page `cytology`, four groups, 20 fields (`cytologyChecks.ts`):

| Group | Field | Default |
|---|---|---|
| Cytology review (Bethesda) | Primary interpretation | locked |
| | General categorization, specimen adequacy, primary comment, additional interpretations, recommendations, notes | optional |
| | Last menstrual period | optional, gynaecologic specimens only |
| CISOE-A review | C, I, S, O, E components and A adequacy | locked |
| | Comment on every axis, notes | optional |
| 5-year retrospective review | Outcome | locked |
| | Corrective action | optional, asked for only when the outcome isn't Confirmed Negative |
| Cyto-histologic correlation | Histology diagnosis, outcome (manual entry) | locked |

`cytologyReviewMissing`, `cisoeaMissing`, `retrospectiveMissing`, `histologyCorrelationMissing` and `cytologyFieldRequired` (drives the "*"). Used by the four components in `pages/CytologyWorklistPage/components/`.

## Batch 388: Microtomy workstation (sixth page)

Page `microtomy`, two groups, five fields (`microtomyChecks.ts`):

| Group | Field | Default |
|---|---|---|
| Comments | Comment text | locked |
| Slide orders | Stain | locked |
| | Level depth (µm) | optional |
| | Reprint reason | locked |
| | Cancel reason (printed slide) | locked |

`microtomyCommentMissing`, `microtomyAddStainMissing`, `microtomyReprintMissing`, `microtomyCancelMissing` and `microtomyFieldRequired` (drives the "*"). Used by `CommentDrawer`, `SlideGridPanel` and the cancel-reason prompt on the Microtomy page. The two reason fields are locked because `utils/microtomyOperations.ts` already requires them; the workstation's lists give no way to act without choosing one.

## Batch 390: Cytology correction and addendum

The `cytology` page gains one group, **Correction / addendum**: the reason (`revisionReason`) and the addendum text (`revisionAddendumText`), both locked ("Laboratory standards require every change to a signed-out report to record what changed and why"). `cytologyCorrectionMissing` (a corrected review follows the review switches, except notes and the last menstrual period; plus the reason) and `cytologyAddendumMissing` are in `cytologyChecks.ts` and exported from `services/index.ts`. Used by `CytologyRevisionPanel`.

## Batch 397: Add Orders, matrix blocks, and the Intraop page

- **New page `intraop`** (15 fields, five groups): New session (patient name, MRN and the identity confirmation locked; OR number required but switchable; surgeon locked (the operating surgeon; corrected in Batch 398, see there); date of birth, facility and location optional), Specimens (label and Quick Gross locked, since the service refuses touch prep or a frozen cut before Quick Gross; frozen diagnosis and its category optional), Touch prep (the "Other" skip note, optional), Verbal report to the surgeon (the note, optional), Merge into a case (the case, locked). The defaults reproduce what the page required before. Checks: `intraopChecks.ts`.
- Conditional fields count as supplied where they don't apply: the date of birth when the patient came from ADT, the location for a facility with no rooms, the category without a frozen diagnosis, the skip note for any reason but "Other".
- **Report page:** group **Add Orders** (`addOrdersSpecimen`, `addOrdersCassetteLabel`, locked for material traceability). `reportPageChecks.addOrdersBlockMissing`; the appended gross sentence moved here too (`addOrdersBlockSentence`).
- **Grossing:** new `pieceDescription` rule (per block, optional). Both per-block rules now include matrix blocks (`services/grossing/grossingCompletion.ts`).
- `FIELD_GROUP_ORDER` (the settings screen's group order) moved here from `FieldRequirementsSection.tsx`; a test fails if a catalog group is missing from it. `isFieldRequired` is the generic "*" helper.

## Batch 398

The Grossing page's rules now also apply to the case report page's Gross Complete (see `services/grossing/README.md`). Correction to Batch 397: the Intraop surgeon's lock reason said the frozen result is reported to a named surgeon (CAP). That overstated it (Pete): the result may go to the surgeon or an authorized member of the surgical team. The reason now says the session records the operating surgeon, and who received the result is recorded with the report.

## Batch 399

The Intraop page's **Verbal report** group gains five locked rules: who received it, their role, the read-back, and, for a critical result given to anyone but the operating surgeon, the "Surgeon unavailable" reason and (for "Other") its note. The note on the report stays an optional switch. `intraopVerbalReportMissing` now takes the structured report.

## Batch 401: Embedding station (eighth page)

Page `embedding`, three groups, five fields (`embeddingChecks.ts`):

| Group | Field | Default |
|---|---|---|
| Comments | Comment text | locked |
| Confirm embedding | Observed piece count | locked (compared with grossing's count; a mismatch raises a Tissue Discrepancy) |
| | Base mold size | optional |
| | Orientation instructions | optional |
| Cassette label reprint | Reprint reason | locked (duplicate-label and traceability records) |

`embeddingCommentMissing`, `embeddingConfirmMissing` (an observed count that isn't a whole number of 0 or more counts as missing: `parseObservedPieceCount`), `embeddingReprintMissing`, `embeddingFieldRequired` and `EMBEDDING_DEFAULT_REQUIREMENTS`, exported from `services/index.ts`. Used by the Embedding station's panel, comment drawer and reprint dialog, and by `useEmbeddingStation.ts` (so the foot pedal is checked too). New groups `embeddingConfirm` and `cassetteReprint` are in `FIELD_GROUP_ORDER`; new lock reasons `pieceCountVerification` and `cassetteReprintReason`.

## Batch 402: Slide distribution station (ninth page)

Page `slideDistribution`, four groups, nine fields (`slideDistributionChecks.ts`):

| Group | Field | Default |
|---|---|---|
| Physical checkout | Pathologist or pool, slide folder ID, tray number, courier transit bag | optional |
| Digital scanner routing | Scanner instrument | locked (so the scan can be matched back to the slide) |
| | Rack ID, slot position | optional |
| Slide exceptions | Exception note | optional |
| Slide label reprint | Reprint reason | locked (`slideChangeReason`; new in this batch, Pete) |

`slideCheckoutMissing` also reports `checkoutTarget` when nothing says where the slide goes (not a switch: `assignPhysicalSlide` refuses that anyway). `scannerLoadMissing`, `slideExceptionMissing`, `slideReprintMissing`, `slideDistributionFieldRequired`, `SLIDE_DISTRIBUTION_DEFAULT_REQUIREMENTS`, exported from `services/index.ts`. New lock reason `scannerInstrument`.

## Batch 403: Add-On Orders (tenth page)

Page `addOnOrder` has three groups and seven fields (`addOnOrderChecks.ts`):

| Group | Field | Default |
|---|---|---|
| Placing an add-on order | Blocks, order lines | locked (`addOnOrderContent`) |
| | Level depth (µm), recut lines only | optional |
| | Microtome bench instructions | optional |
| | Reference / send-out lab, molecular/send-out lines only | locked (`sendOutRouting`, Pete) |
| Flagging a block exception | Exception note | optional |
| Pathologist's response | Response note | optional |

The exported checks are `addOnLineMissing`, `addOnSubmitMissing`, `addOnExceptionMissing`, `addOnResponseMissing`, `validLevelDepth`, `addOnOrderFieldRequired` and `ADD_ON_ORDER_DEFAULT_REQUIREMENTS`. A rule that doesn't apply to the order (no recut line, no send-out line) never counts as missing. The new hints are `recutLinesOnly` and `sendOutLinesOnly`.

## Batch 404: Batch Management (eleventh page)

Page `batchManagement` has two groups and ten fields (`batchChecks.ts`).

**New container:**
- Locked: protocol (`batchProtocol`); rack ID, reusable racks only (`rackTraceability`); target duration, decal only (`decalTiming`); reference lab destination, referral only (`sendOutRouting`); stain, cytology staining only (`batchStain`).
- Switches, off by default: the test requested (referral only) and the reagent/solution lots (staining only).

**Closing a batch out** (all locked):
- Abort reason (`batchCustodyChange`). This is new: Pete chose to require it.
- Override reason (`batchCustodyChange`).
- Cold-chain note (`coldChainRecord`).

A field that belongs to another processing node, or to a reusable rack, never counts as missing. The locked reasons are also enforced in the batch service.

## Batch 405: Molecular plate builder (twelfth page)

Page `molecularBatch` has three groups and nine fields (`molecularBatchChecks.ts`):

| Group | Field | Default |
|---|---|---|
| The run | Assay, assay name, target instrument | locked (`molecularRunRecord`) |
| | Deck slot, reagent lots | optional |
| Wells | Patient well specimen (barcode or accession) | locked (`wellTraceability`, new, Pete) |
| | Aliquot volume (patient wells) | optional |
| | Control lot and expiry (control wells) | locked (`controlTraceability`) |
| Clone & Supersede | Reason | locked (`supersedeRecord`) |

`molecularWellsMissingSpecimen` lists the patient wells that name no specimen.

## Batch 406: Molecular rack loading (thirteenth page)

Page `molecularRack` has two groups and five fields (`molecularRackChecks.ts`). This is Pete's list for Rack Loading:

| Group | Field | Default |
|---|---|---|
| The rack and its tubes | Rack identifier / barcode | locked (`rackIdentity`, new); generated when blank |
| | Sample ID for every occupied position | locked (`sampleMapping`, new). Every tube names its accession, and the rack needs at least one tube. |
| Placing the rack | Instrument | locked (`deckPlacement`, new) |
| | Deck slot | locked (`deckPlacement`), but only asked for when the instrument has more than one slot for a sample rack |
| | Assay | optional. When given, it narrows the slots to the ones its control rule allows. |

Main functions:
- `molecularRackPlacementMissing` returns the missing field ids.
- `rackPositionsMissingSampleId` lists the tubes without an accession.
- `rackDeckSlotNeeded` says whether a slot is required.
- `rackTypeOf`: racks stored before the rack type existed count as sample tube racks.

The rack service enforces the same rules again in `placeOnDeck`.

## Batch 467 — In-house molecular orders

`addOnOrderChecks.ts`: the reference-lab requirement applies to molecular lines that are sent out, not in-house ones.

## Batch 473 — Case-type key migration

`reportPageChecks.ts`'s forensic-path check now compares against `'statutory_judicial'`, not `'medicolegal_forensic'` — the local `forensic` variable name is unchanged, only the literal it compares against. No behavior change. See `services/autopsy/README.md`.

## Batch 517

`criticalNotificationMissing`: a required read-back never applies when the method is `secure_email`. A read-back is spoken, and the email is recorded once it is sent (PS-143).

## Batch 528: Staff, Facility editor and Clinical history (pages 14 to 16, PS-359)

Pete's decision (Oct 10, 2026): these requirements are configurable per organisation (the performing-lab tenant). No requirement is fixed by jurisdiction.

| Page | Group | Field | Default |
|---|---|---|---|
| `staff` | Name | First name, last name | locked (`staffIdentity`) |
| | | Middle name | optional |
| | Roles and facilities | Role | locked (`staffAccess`): what someone can do comes from their roles |
| | | Facilities, subspecialties | optional |
| | Contact | Email, phone | optional. An email, when given, must look like one. |
| | Professional details | Credentials, NPI, GMC number, licence number, signature | optional |
| `facility` | Facility | Name | locked (`facilityIdentity`) |
| | | Assigning authority | locked (`facilityRouting`). Also unique, ignoring case: inbound HL7 orders are matched by it (PS-73). |
| | Contact | Email | **required** (was always required; now an organisation can switch it off). When given, it must contain "@". |
| | | Phone, address, contact person (family names) | optional |
| | | Fax, city, region, postal code (Batch 530) | optional |
| | Interfaces | Interface engine endpoint | locked (`interfaceRouting`), only once the connection is set up |
| | | LIS sending facility ID | locked (`interfaceRouting`), only once LIS routing is set up |
| `clinicalHistory` | Clinical history entries | Case entry | optional; cytology and FNA cases only |
| | | Entry on every specimen (per specimen) | optional; with one specimen a case entry counts |
| | | Coded (no free-text entries) | optional; satisfied when there are no entries |

Fax, city, region and postcode are stored on a facility but the editor had no input for them, so Batch 528 left them out of the catalog (a required field nobody can fill in would block every save). *Batch 530 (Pete): the editor now has the four inputs, and they are in the catalog (optional by default).*

The checks:
- `services/staff/staffFormChecks.ts`: `checkStaffForm` (problems `required`, `atLeastOneRole`, `invalidEmail`).
- `services/facilities/facilityFormChecks.ts`: `checkFacilityForm` (problems `required`, `assigningAuthorityCollision`, `invalidEmail`).
- `services/clinicalHistory/clinicalHistoryRequirementChecks.ts`: `missingClinicalHistory`.

`fieldRequirementCatalogText.test.ts` checks that every page, group, field, lock reason and hint in the catalog has text in all five languages.

## Batch 530 (Pete, Oct 11, 2026: no hard blocks at intake)

The `clinicalHistory` page's requirements no longer block Accession: what's missing shows as a note ("Clinical history not yet recorded: …") and the case is accessioned. The same for every specialty. The history can be added later (`clinicalHistory/recordClinicalHistoryAfterAccession.ts`), and the mismatch check is deferred while there is no clinical information. The hints say so in the Field Requirements screen. *(Corrects Batch 528, which made them block the Case & Patient step.)* Facility editor: fax, city, region and postal code added (optional).

- Batch 661: Accession `sex` is a locked required field (lock reason: patient identification). Sex never defaults.
