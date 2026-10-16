# src/utils/

Pure, mostly-stateless helper functions — date/time formatting, name
formatting, accession normalization, specimen labeling, device
detection, and the embedded guide-PDF assets. This is one of the
cleanest folders in the whole codebase: most files here are genuinely
excellent, carefully-reasoned, well-tested pure functions with real
edge-case handling documented inline. A few real findings turned up
anyway.

## Real findings

**1.2MB+ of dead file bloat, removed:**
- `index.css` — a stale, orphaned duplicate of the real, actually-loaded
  `src/index.css` (imported in `main.tsx`). Confirmed nothing imports
  this copy anywhere, and confirmed by direct comparison that every
  class it defines already exists in the real file, more refined.
  Deleted.
- Three stale timestamped backups of `guideAssets.ts`
  (`.bak_20260605_094452`/`.bak_20260624_132635`/`.bak_20260626_134327`,
  ~1.2MB combined), left behind by `Update-GuideAssets.ps1` with no
  cleanup step. Also fixed *why* they kept accumulating: `.gitignore`
  already had a `*.bak` rule meant to catch exactly these, but the
  real filenames the script generates have a timestamp *after* `.bak`,
  which that glob never matched. Added `*.bak_*` alongside it.

*(Batch 499: `utils/index.css` removed again, and listed in the root
`DELETED_FILES.txt` so the deletion reaches the working copy.)*

*(Since then, checked in the Batch 496 README audit: `utils/index.css`
is present again — a 2.5 KB file that differs from `src/index.css` and
that nothing imports, so it is dead again. No `guideAssets.ts.bak_*`
backups exist today, but the root `.gitignore` has only `*.bak`; the
`*.bak_*` rule described above is not there.)*

**An incomplete prior consolidation, completed:** `caseUrgency.ts`'s
own header comment claims a past fix consolidated `WorklistTable.tsx`'s
and `WorklistPage.tsx`'s independently-diverging "is this case urgent"
logic into one shared function. Checking whether that actually held:
`WorklistPage.tsx` did correctly adopt it; `WorklistTable.tsx` never
did — it still had its own separate, locally-defined copy (a
`useCallback`) reachable from 12+ call sites, implementing identical
logic in parallel, including the same redundant `any` cast the shared
version also had. Harmless today since both computed the same thing,
but it defeated the entire point of the original fix — a plausible
future change (the comment itself anticipates a facility-configurable
STAT-vs-Rush distinction) would have silently applied to only one of
the two files. Migrated `WorklistTable.tsx` to the real shared
function, removed its local duplicate and the redundant cast. Full
writeup in `components/Worklist/README.md`.

**Minor, not acted on:** `synopticFieldLabels.ts` exports
`CAP_FIELD_LABELS` as an explicitly-labeled "legacy export — kept for
backwards compatibility." Confirmed zero consumers anywhere in the
codebase. Left it alone rather than removing it — unlike undocumented
dead code found elsewhere in this review, this one is a deliberate,
self-documented choice by whoever wrote it, and it's a zero-cost
re-export, not something adding real maintenance burden.

## Files (the rest — genuinely clean, no changes needed)

- **`formatDate.ts`** (`formatAuditTimestamp` — its own dedicated test file, `formatAuditTimestamp.test.ts`) — locale/jurisdiction-aware date, datetime, age,
  and relative-time formatting. Deliberately keeps `formatAuditTimestamp`
  UTC-and-locale-independent, distinct from the other, locale-dependent
  formatters — correct for compliance logs, with the reasoning stated
  inline.
- **`facilityTime.ts`** (+ `facilityTime.test.ts`) — the most carefully-verified file in this
  folder. Real, deliberate timezone-stable date bucketing (a stored
  case belongs to the facility's calendar day, not the viewing
  device's), with the DST-safe offset math and, notably, an inline
  comment documenting a sign-flip bug in an *earlier* version of this
  exact function that was caught via direct numeric verification and
  removed before shipping — not just fixed, verified.
- **`deviceDetection.ts`** (+ `deviceDetection.test.ts`) — real device-vs-resized-window detection
  for the Intraop mobile workflow (checks viewport width *and* pointer
  coarseness together, specifically because a narrow desktop window
  isn't the same thing as a real phone). Includes a real, working
  escape-hatch pair (`setDesktopViewOverride`/`clearDesktopViewOverride`)
  — the doc comment for the latter notes it was added specifically
  because the former originally shipped with no way to reverse it.
- **`barcodeFormatMapping.ts`** (+ `barcodeFormatMapping.test.ts`) — maps this app's `BarcodeType` union to
  ZXing's real `BarcodeFormat` enum, confirmed against the installed
  package's own type declarations rather than assumed from memory.
  Deliberately restricts scanning to only the 5 formats this app
  models, not ZXing's full format list, to avoid a scanner picking up
  an incidental product barcode in frame.
- **`normalizeAccession.ts`** — infers hyphen position in a typed/spoken
  accession number from the configured pattern, with real fallback
  behavior for anything that doesn't look like an accession (returned
  unchanged, never mangled).
- **`personName.ts`** — the Prefix/Given/Family/Preferred/Suffix name
  model, explicitly designed to handle cases rigid First/Middle/Last
  fields break on (Spanish double surnames, Hungarian name order, no
  middle name). Legacy `firstName`/`lastName` bridge kept for the ~15
  not-yet-migrated consumers.
- **`specimenLabeling.ts`** — the alpha/numeric specimen-vs-block
  labeling pair (CAP/NSH alternating convention) — structured so a
  component literally cannot pick alpha for both specimen and block
  independently, since block labeling is always derived as the
  opposite of whatever the specimen style is.
- **`flagAdapter.ts`**, **`formatLabel.ts`**, **`synopticFieldLabels.ts`**,
  **`caseRevisionDisplay.ts`** — small, clean, single-purpose. No
  issues.
- **`applyGrossingRefinement.ts`** (+ `applyGrossingRefinement.test.ts`) — new, per direct follow-up: "The AI
  call can happen in the background... not necessarily going to
  serialize the accession event with Grossing immediately," plus a
  same-session follow-up: "Do we capture failed template association?
  That might be a good quality measure." The pure half of
  `AccessionPage.tsx`'s background Grossing Template refinement — two
  real, separate concerns, both extracted specifically to be
  deterministically testable without depending on the real AI's own
  non-deterministic output: (1) safety — never silently swap a
  specimen's template out from under someone who's already started
  grossing it; (2) a new, permanent quality-outcome record
  (`ai`/`fallback`/`override`/`failed`) persisted for every specimen
  with a real AI result, independent of whether its template itself
  was safe to change. 16 tests. See that page's own README for the
  full feature.
- **`labels/printRequisitionAndContainerLabels.ts`** — new, per direct
  follow-up: "Label Reprint is a real thing too. Either a batch or
  single." Real problem this closes: the original requisition/container
  print action (`AccessionPage.tsx`) only ever existed transiently,
  right after accession — no standing way to reprint for an existing
  case once you navigated away. Extracted the real logic into
  `printRequisitionLabel`/`printContainerLabel`/`printAllContainerLabels`
  so both the original accession-time flow and a new, persistent
  reprint entry point (`MaterialTreePanel.tsx`) call the same real
  functions, not two copies that could drift. **Real bug found and
  fixed while extracting this**: the original inline code hardcoded
  `DEFAULT_CONTAINER_LABEL_PRESET_ID` rather than reading
  `printSettingsService`'s own, real `containerLabelPresetId` — an
  admin's real Config choice (Step 3) was silently never applied to an
  actual print job. Fixed here, with an honest fallback if a stored
  preset id is genuinely stale/unknown. 6 tests, including one that
  directly proves the fix (a real, non-default preset is honored).
- **`labels/getAllCassetteLabelRequests.ts`** — new, per direct
  research: "Batch Print Queue Interface... 'Print All Cassettes for
  Case.'" Pure function, a real `Case` in, the full, real list of
  cassette dispatch requests out (every block, every specimen) — 5
  tests.
- **`labels/`** — per direct follow-up on the requisition/container
  label-printing architecture scope. `buildRequisitionLabelData.ts`/
  `buildContainerLabelData.ts` — pure functions, real `Case`/`Specimen`
  in, real label content out, no I/O. Deliberately scoped to
  requisition and container labels only — cassette/slide labels are,
  per direct follow-up on Cerebro's own real capabilities (CEREBRO-ID/
  CEREBRO-ID+ drives that printing natively on named hardware), likely
  not something PathScribe needs to render at all; see
  `services/hl7/adapters/cerebroAdapter.ts`. Real, named physical label
  sizes (CLSI AUTO12 as the confirmed US standard, plus researched
  preset sizes) live in `types/labels/LabelSizePreset.ts` — canonical
  mm storage, inches as a display-only conversion, never a second
  parallel data model.
  **Step 2, same session:** `generateBarcodeSvg.ts` — real barcode
  rendering via `bwip-js` (installed; imports from the explicit
  `bwip-js/browser` subpath — the bare specifier didn't resolve under
  this project's `bundler` module resolution, a real, confirmed
  TypeScript/package-exports interaction, not a version problem).
  `buildLabelHtml.ts` — pure HTML-fragment builders,
  `printLabels.ts` — the print trigger, deliberately mirroring
  `CopilotReportViewModal.tsx`'s own hard-won `window.open()` mechanics
  exactly (same blank-print-issue avoidance), with one real difference:
  `@page { size: ...; margin: 0; }` instead of a margin-only rule, the
  actual CSS mechanism that gets a label's real physical dimensions to
  the printer. Wired into `AccessionPage.tsx` as a real, user-triggered
  "Print Labels" action, deliberately independent of the background
  Grossing Template refinement's own timing (new `justAccessionedCase`
  state, set immediately on real case creation — printing needs none
  of what that background AI call produces).
  **Two real bugs found only by testing this live, not by reasoning
  about the CSS:** the first layout (one fixed design, `justify-
  content: space-between`) looked fine on paper but failed in two
  opposite, real ways — stranded with a huge empty gap on the full-page
  requisition preset, and clipped the MRN row and the entire barcode
  via `overflow: hidden` on the real 2″×1″ (50.8×25.4mm) CLSI container
  preset, since the content genuinely didn't fit at those font sizes.
  Fixed with two real, distinct layout modes (`printLabels.ts`'s own
  CSS) picked by real physical area — compact/side-by-side at or below
  55×30mm, roomy/stacked above it — confirmed live: every field and a
  correctly-rendered DataMatrix barcode now visible on the small
  preset, and the full-page preset compact and top-aligned, no gap.
  104 tests across the whole `labels/` folder as of August 2026 (grown
  substantially since this section was first written — see
  `labels/README.md` for the current, full module breakdown).
- **`guideAssets.ts`** (about 5.5MB) — auto-generated by
  `Update-GuideAssets.ps1`, embeds the Admin/User Guide PDFs as base64
  for blob-URL opening (avoids React Router intercepting a direct PDF
  route). Confirmed it's exactly what its own header comment claims —
  nothing unexpected in it.

## Files added since the original review pass (Aug 2026)

Not part of the original review above — added later, documented here
rather than left uncovered. Grouped by real, related concern.

### Cassette color routing

- **`resolveBlockCassetteColor.ts`** (+ `resolveBlockCassetteColor.test.ts`) — real feature, per direct
  follow-up on the grossing-station workflow: "Context & Protocol
  Resolution... Required cassette media attributes (e.g., PINK for
  small biopsy, GREEN/MESH for cell block)." The async wrapper that
  fetches rules/colors/protocols (`fetchCassetteRoutingData.ts`) and
  calls the pure `evaluateCassetteRouting.ts` engine (tested in `utils/__tests__/`, alongside its sibling `evaluateMicroscopicFinalizeGate.ts` — the real microscopic-description finalize gate, same "pure logic, tested separately from the hook that calls it" discipline).
- **`resolveDecantCassetteColor.ts`** (+ `resolveDecantCassetteColor.test.ts`) — the decant-level
  sibling, per direct follow-up: "cell blocks frequently use distinct
  cassette colors... to signal fragile cytopreparations to
  histotechnologists."
- **`resolveProtocolIdForSpecimen.ts`** (+ `resolveProtocolIdForSpecimen.test.ts`) — small, shared helper
  extracted while wiring block-level color routing into
  `handleAddBlock` — a real cassette-routing rule can only match on
  `protocolId`, so this is the one, real place that resolution happens.
- **`fetchCassetteRoutingData.ts`** — the one, shared fetch both
  `resolveBlockCassetteColor.ts` and `resolveDecantCassetteColor.ts`
  need (rules, colors, protocols) — extracted specifically so there's
  one real fetch, not two independently-written copies.
- **`generateDefaultMaterial.ts`** (+ `generateDefaultMaterial.test.ts`) — real, architectural
  extraction out of `AccessionPage.tsx` (where it lived as
  `generateDefaultBlocks`), per the Hybrid Model's own principle:
  "ProtocolPathway drives execution: the pathway definition always
  dictates whether a block or decant entity is instantiated." Also
  where accession-time cassette color resolution now happens (moved
  earlier from grossing-scan hydration — see its own header for the
  full "block color only correct once scanned at grossing" fix this
  closed).
- **`hydrateGrossingBlocks.ts`** (+ `hydrateGrossingBlocks.test.ts`) — real feature, per direct
  follow-up describing the real grossing-station workflow: "scanning
  the container at grossing means resolving and releasing those
  pre-created default blocks into physical assets."
- **`sharedCassetteSiblings.ts`** — real fix, per direct follow-up:
  "when creating Biopsy Arrays, I'm not sure we are dealing with that
  very well... every associated specimen gets updated simultaneously
  since they are actually a multi-source cassette." Confirmed directly
  before building, not assumed.

### Scanning & material tracking

- **`parseScannedPayload.ts`** (+ `parseScannedPayload.test.ts`) — real, standalone, pure
  parser for the "Barcode Listener & Form Auto-Ingestion" spec's own
  "Parser Logic" piece. Deliberately kept out of `ScannerProvider.tsx`
  itself, whose own real job (global keystroke-burst detection) is a
  different concern.
- **`resolveMaterialFromScan.ts`** — real, shared extraction — this
  exact resolution logic used to live only inside
  `hooks/useGlobalMaterialScanTracking.ts`; pulled out, unchanged, so
  the Batch Management module can resolve a scan the same real way.
- **`dispatchMaterialScanEvent.ts`** — real, honest stand-in for
  actually transmitting a `MaterialScanEventPayload` to an external
  LIS/middleware engine — same discipline as
  `labels/dispatchCassetteLabel.ts`: no real transport exists yet
  anywhere in this app, so this is a real, correctly-shaped stub, not
  a silent no-op.
- **`playScanBeep.ts`** — real feature, per direct spec: "play an
  optional subtle auditory cue (a soft 'beep') so the technician knows
  the scan succeeded without having to look up at the monitor."
- **`effectiveScanStation.ts`** — real, pure (non-React) implementation
  of the same fallback-chain rule `hooks/useEffectiveScanStation.ts`
  already implements reactively — needed as a plain function since
  `audit/auditLogger.ts`'s `logEvent()` isn't a hook and can't call one.
  Batch 343 (PS-60): the user's home station is read through
  `services/auth/sessionProfile.ts` instead of parsing the stored session here.
- **`blockExceptionStates.ts`** — real feature, per direct follow-up
  building a full exception-states matrix for the grossing bench
  (STAT/urgent, 0 slides, Consumed/Entirely Submitted, Damaged, Lost)
  — one, single, shared source of truth for how each state is computed.

### Patient ID & search formatting

- **`patientIdStatus.ts`** (+ `patientIdStatus.test.ts`) — the real status-dot logic behind
  `components/Common/PatientIdStatusDot.tsx`, jurisdiction-aware (per
  direct correction: "Scotland's CHI system does not use the 2-digit
  Status Indicator Code... verification in LIMS...").
- **`ukPatientIdValidation.ts`** (+ `ukPatientIdValidation.test.ts`) — NHS Number (England &
  Wales), CHI Number (Scotland), and H&C Number (Northern Ireland)
  format and checksum validation — three genuinely different real
  schemes, not one generic UK validator.
- **`normalizeIdForSearch.ts`** (+ `normalizeIdForSearch.test.ts`) — real fix, per direct
  follow-up: "Scotland and Ireland have different formats for their
  NHS number, would we do the same approach there?" Deliberately not
  the same mechanism as `isoDateForSearch.ts` below — a genuinely
  different normalization problem.
- **`normalizeOrderCode.ts`** (+ `normalizeOrderCode.test.ts`) — **NEW.** Order-type-mapping
  work, extending the existing Specimen Code Crosswalk
  (`services/orderIntake`'s own `SpecimenCodeCrosswalkEntry`) with
  real multi-coding-system matching. Same safe-normalization posture
  as `normalizeIdForSearch.ts` just above (strips formatting noise
  only, never resolves genuine ambiguity) — trims, uppercases, strips
  punctuation, collapses whitespace, so cosmetically different
  transcriptions of the same real order code compare equal.
- **`isoDateForSearch.ts`** (+ `isoDateForSearch.test.ts`) — real fix: the Accession omnibox
  search used to hardcode US-style mm/dd/yyyy for DOB matching
  (`isoDateToMDY.ts`'s own header wrongly claimed "no locale awareness
  needed" — confirmed wrong, replaced by this file). *(`isoDateToMDY.ts`
  and its test lingered until Batch 499, which removed both — listed in
  the root `DELETED_FILES.txt`.)*
- **`inferLateralityFromText.ts`** (+ `inferLateralityFromText.test.ts`) — real fix, per direct
  report: a mock order description with clear implied laterality
  ("left forearm skin excision") wasn't being reflected in the
  laterality dropdown — any data available in the record should load
  into the form, not just the structured fields.
- **`isEncounterActive.ts`** (+ `isEncounterActive.test.ts`) — real feature, per direct,
  detailed "Encounter Selector & Auto-Fill" spec's own "Strict
  Matching & Active Status Constraints" safety safeguard — extracted
  from `AccessionPage.tsx` into its own dedicated, tested utility
  since getting this specific check right matters most.
- **`sourceTextMatching.ts`** (+ `sourceTextMatching.test.ts`) — shared source-text matching,
  extracted from `LeftReportPanel`'s inline `useMemo` so the exact
  same algorithm powers both the live per-field "source not found"
  indicator and a second, related consumer.

### Grossing, admin & misc

- **`classifyGrossingComplexity.ts`** (+ `classifyGrossingComplexity.test.ts`) — real feature, per
  direct follow-up on the Grossing spec's "Smart Auto-Switching
  (Context Awareness)" section — LIS specimen/CPT code as the primary
  trigger for Routine/Simple vs. more involved grossing template
  defaults.
- **`foreignIdCollision.ts`** (+ `foreignIdCollision.test.ts`) — real feature, per direct
  follow-up: "the lab will receive outside blocks or cytology fluids
  with existing ids that we need to map to the PathScribe unique id...
  it's safer not to have to relabel specimen containers if possible."
- **`computeDraftDiff.ts`** — real feature, per direct follow-up: "I
  thought we were displaying the changes that would be applied to the
  case." Closes a gap `DraftRecoveryModal.tsx`'s own header already
  documented as a known, deliberate Phase 1 simplification.
- **`materialDisplayId.ts`** — real feature, per direct follow-up on
  unique material identification: "every asset of the material
  (specimen, block, slide, decant, fluid, etc.) should be uniquely
  identified... the ID should at least be understandable to a human."
- **`clinicalAdmins.ts`** — real feature, per direct confirmation: "I
  would send the message to Admins, or create a new entity, like
  clinical admins as a subset." Investigated the real, existing
  `Admin` role before building rather than assuming a new one was
  needed.
- **`accessRequests.ts`** — shared admin-notification helper for any
  "request access" flow. Originally lived privately inside
  `WorklistTable.tsx` (built for Pediatric Access); extracted here so
  the genuinely separate Pool-membership access-request flow could
  reuse the same real notification logic rather than duplicating it.
- **`staffSubspecialties.ts`** — real fix, per direct confirmation:
  replaces the old free-text `StaffUser.department` field, genuinely
  redundant with the real Subspecialty dictionary
  (`services/subspecialties/`), which already existed but had no way
  to be assigned from the Staff editor until this.
- **`parsePubMedInput.ts`** (+ `parsePubMedInput.test.ts`) — real feature, per direct
  follow-up: "if they access the article and then search and find a
  different article, can we update the PubMed article link... so they
  don't have to search again." Powers the research ticker's
  "paste it here" field.

### Duplicate-and-edit + uniqueness validation

Both extracted specifically to be reusable across every config
dictionary, not just the two files that first needed them — per
direct request for "a general pattern across many dictionary types."
PS-73 (Sep 2026) rolled this out to most of PathScribe's remaining
config dictionaries across several passes; this section was found
stale (left listing only the first two dictionaries, from long before
that rollout finished) and is rewritten here against a real,
current, code-verified consumer list rather than extended piecemeal
again — see each dictionary's own `Config/*/README.md` entry for
per-dictionary detail.

*Corrected in the Batch 496 README audit (Oct 9, 2026): since Batch 317, `prepareDuplicate()` takes the caller's localized copy-name formatter (no English "(Copy)" default), `preparePersonDuplicate()` is gone, and the only direct caller is `services/duplication/duplicateEntities.ts` — the dictionary screens duplicate through that service (see `services/duplication/README.md`). The consumer list below is the PS-73 picture from before Batch 317. In the `validateUnique.ts` list, `SpecimenCategoriesSection.tsx` has since been deleted (unused), `AbnormalTriggerRulesSection.tsx`'s check now runs in `services/abnormalDetection/abnormalTriggerRuleEditing.ts`, and `InkColorsSection.tsx` (`name`) is a further consumer.*

- **`duplicateEntry.ts`** (+ `.test.ts`) — `prepareDuplicate()`: given
  an existing entry, returns a copy with its display-name field
  renamed through the caller's copy-name formatter, ready to prefill an Add-mode modal. Real bug this
  was built to fix: `StainDictionarySection.tsx`'s own Duplicate button
  used to call `.add()` immediately and reload the list — the user had
  to find the silent copy afterward to edit it. Confirmed live (not
  just in code) that the fixed flow now opens the form pre-filled and
  only saves on a real, explicit Save.

  Real, current consumers (verified directly against the source, not
  carried forward from an earlier list):
  - `StainDictionarySection.tsx` — 4 separate call sites, one per
    sub-entity this one file manages: Stain Types (`name`), Protocols
    (`name`), Macros (`label`), Targets (`symbol`).
  - `ContainerTypesSection.tsx` — `name`.
  - `DelegationTypeSection.tsx` — `label`.
  - `CasePoolAssignmentSection.tsx` — `note` (a routing rule's own
    display field; not caught by the earlier list at all — found via
    a real, independent grep across the whole codebase for this pass,
    not by re-reading the old list).
  - `FacilityDictionaryPage.tsx` (**new, PS-73 Sep 2026 — the one
    dictionary this ticket's own target matrix named and that had
    genuinely never been wired**) — `name`, via
    `handleDuplicateFacility()`. Not a plain `prepareDuplicate()`
    "(Copy)"-and-done clone: `Facility` carries real person-shaped
    contact fields (`contactGivenNames`/`email`/`phone`/etc.)
    alongside its own org-level config, so `preparePersonDuplicate()`
    below doesn't fit either (deliberately scoped to person records
    only) — the handler clears those fields by hand instead, plus
    `assigningAuthority` itself (the field a real, live lookup in
    `mockOrderIntakeService.ts` keys facility resolution on — copying
    it verbatim would be an immediate, real collision, caught by
    `FacilityEditorModal.tsx`'s own new `findDuplicate()` check below
    if it somehow got through unchanged). See that handler's own
    header comment for the full field-by-field account.
  - `preparePersonDuplicate()` (companion function, same file) —
    scoped deliberately to person-shaped dictionary entries, not a
    general "clear some fields" tool other dictionaries should reach
    for (see its own header comment). One real consumer:
    `PhysiciansSection.tsx`'s `handleClonePhysician()`, via
    `PHYSICIAN_PERSON_FIELDS` (name fields, `npi`, `physicianCode`,
    `phone`/`fax`/`email`/SMS fields — `smsCarrier` cleared separately
    since it's an enum, not a string).

- **`validateUnique.ts`** (+ `.test.ts`) — `findDuplicate()`: generic
  collision check across one or more keys, case-insensitive, with an
  optional id to exclude (so editing an entry unchanged never flags
  itself). Per direct follow-up on the compound checks below ("Each
  Performing Lab will want their own types"), a collision is only real
  within the same lab's own scope (including "both undefined" as its
  own real, global scope), never against a different lab's own types.

  Real, current consumers (verified directly against the source):
  - Single-key: `PhysiciansSection.tsx` (`physicianCode`, `npi` —
    independent checks), `TypeModal.tsx` (`label`, `abbreviation` —
    the shared modal ~9 admin screens use, per
    `components/Config/README.md`'s own account),
    `StainDictionarySection.tsx` (`name` for both Stain Types and
    Protocols, `label` for Macros — Targets uses its own inline
    `symbol`+`detail` check instead of this helper, since a colliding
    `symbol` with a genuinely different `detail` is legitimately not a
    collision, a shape `findDuplicate()`'s flat key-equality doesn't
    fit as directly; real and working, just not routed through the
    shared helper), `CrosswalkSection.tsx` (`clientId` + `externalCode`
    together, confirmed against `mockOrderIntakeService.ts`'s real
    `resolveOrder()` lookup, which does exactly this compound,
    case-insensitive match — two entries colliding on it would let
    `.find()` silently resolve a real incoming specimen to the wrong
    dictionary entry), `FacilityEditorModal.tsx` (**new, PS-73 Sep
    2026** — `assigningAuthority`, the same real reasoning as
    `CrosswalkSection.tsx`'s check: `mockOrderIntakeService.ts`'s real
    Facility-resolution lookup keys directly on it).
  - Compound (lab-scoped): `CassetteColorsSection.tsx`
    (`performingLabFacilityId`+`key`, `performingLabFacilityId`+
    `displayName`), `SpecimenCategoriesSection.tsx`
    (`performingLabFacilityId`+`name`), `DeficienciesSection.tsx`
    (`performingLabFacilityId`+`name`), `SubspecialtiesSection.tsx`
    (`performingLabFacilityId`+`name` — real-lab-scoped since
    Subspecialty linking became ID-based rather than bare-name, PS-75),
    `ContainerTypesSection.tsx` (`performingLabFacilityId`+`name`,
    `performingLabFacilityId`+`aplisMapping`),
    `DelegationTypeSection.tsx` (`performingLabFacilityId`+`label`,
    `performingLabFacilityId`+`id`), `ProtocolDictionarySection.tsx`
    (`performingLabFacilityId`+`name`),
    `AbnormalTriggerRulesSection.tsx`
    (`performingLabFacilityId`+`fieldLabel`).

  Verified live, every direction independently for every real use: a
  same-scope collision is blocked, a genuinely different scope is
  correctly allowed through.

  **Deliberate, confirmed non-consumers — checked, not overlooked:**
  Governing Bodies and Participation Types (no real downstream
  `.find()`/lookup keyed on anything in either, confirmed per PS-73's
  own two-question audit) and Client Dictionary (the standalone
  `components/ClientDictionary/` fork this ticket's own original
  matrix named was itself confirmed genuinely dead — zero real imports
  anywhere — and deleted; `FacilityDictionaryPage.tsx`/
  `FacilityEditorModal.tsx` above are its real, living successor and
  are now wired, closing what was actually the same gap under its
  current name).

### Performing Lab scoping

- **`performingLabs.ts`** (+ `.test.ts`) — `getActivePerformingLabs()`:
  real, shared "fetch all active performing labs" query. Extracted
  per direct follow-up ("Performing Lab is going to be a fixture" —
  enterprise customers need their own scoped dictionary items) after
  confirming the exact same query was already independently written,
  identically, in both `ExternalResourcesSection.tsx` and
  `ContainerTypesSection.tsx` — both since refactored to use this one,
  shared version. Also used by `DelegationTypeSection.tsx`, the third
  real consumer confirming this was worth extracting, not a one-off.
  Note on placement: kept in `utils/` rather than
  folded into `services/facilities/IFacilityService.ts` alongside its
  own, real, pure `resolvePerformingLabFacilityId()` — that one takes
  a `Facility` directly and makes no service call; this one does, and
  an interface module shouldn't depend on its own mock/firestore
  implementation. Testing this surfaced a real, useful environment
  gotcha, not a bug in the function itself: importing the full
  `services` barrel transitively loads every service, including one
  with real, top-level `localStorage` access (`mockUserService.ts`) —
  failed under plain Node until the test file got the same
  `// @vitest-environment happy-dom` directive already used elsewhere
  in this codebase for exactly this reason.

### Other files (not described above)

- **`csv.ts`** (PS-48) — dependency-free CSV parsing, generation and file picking for dictionary import/export. **`csvExport.ts`** — the compliance-header CSV export shared by `AuditLogPage.tsx` and `BillingLogsSection.tsx`.
- **`formatAddress.ts`** — jurisdiction-aware address formatting.
- **`physicianDisplay.ts`** — shared physician search/display helpers, extracted from `AmendmentModal.tsx`.
- **`openComposeTo.ts`** (PS-304) — opens the messaging drawer's compose form for a person, with the case number as subject.
- **`extractCaseReferencesFromText.ts`** (PS-299) — finds case references in a message's text so the drawer can link to the case.
- **`buildWsiViewerLaunchUrl.ts`** — builds the external slide viewer's launch URL for a scan.
- **`resolveOutboundMolecularAssaysForProtocol.ts`** — the molecular orders a protocol sends out at accession.
- **`grossingScreenOperations.ts`** — the Grossing screen's pure operations (see also Batch 460 below).

*Added in the Batch 496 README audit (Oct 9, 2026): these files had no entry in this README.*

## Batch 317 (PS-73)

- **`duplicateEntry.ts`:** `prepareDuplicate(source, nameKey, copyName)` now requires the caller's localized copy-name formatter. Its English `" (Copy)"` default was being saved as data. `preparePersonDuplicate` was removed: its only user was Physicians, which no longer offers Duplicate. Entity-specific copy rules live in `services/duplication/`.
- **`downloadJson.ts`** (new): JSON counterpart of `csv.ts`'s `downloadCsv`, used by the protocol Export JSON action.

## Batch 325 (PS-52)

`labels/dispatchNetworkPrintJob.ts` (Batch 347, PS-54): unique job ids per label, slide payloads, a retry `attempt`; the engine's answers are handled by `services/networkPrint/`.

`labels/pathscribeAgent/`: PathScribe's client for the workstation PathScribe Agent (discovery, printing, job outcome matching) and the WebSocket contract the agent is built to. Batch 346 added a configurable port (tried first), the optional `PRINT_STARTED` message, and `printJobStatus.ts` for the on-screen progress line. See `labels/pathscribeAgent/README.md`.

## Batch 330 (deployment readiness)

**`uiPreferences.ts`** (+ `.test.ts`, new) is the one sanctioned place for UI code to keep per-user display preferences in the browser: `getUiPreference`, `setUiPreference`, `clearUiPreference`, stored under a `ps_ui_` prefix. Every access is wrapped, so blocked storage or bad data falls back to the default. Data must go through a service instead. See `services/deploymentReadiness/`.

## Batch 327 (HTTPS)

- **`serviceEndpoint.ts`** (+ `serviceEndpoint.test.ts`, new): HTTPS rules for back-end URLs the browser calls directly.
  - `resolveServiceEndpoint` gives a production build its configured `https://` URL. A missing, malformed or plain-HTTP value is refused with a message naming the env var to fix.
  - A development build may use `https://` or plain HTTP to this machine (localhost, 127.0.0.1, [::1]), and falls back to the local emulator default.
  - `isHttpsUrl` and `isLoopbackHttpUrl` are the checks behind it.
  - Used for the report renderer and the interface receiver, and for the grossing scale agent's address.
- **`labels/pathscribeAgent/`:** the agent connection is `wss://` only, with a per-workstation certificate. See `labels/pathscribeAgent/README.md`.

## Batch 356

**`formatList.ts`** (+ `.test.ts`): joins translated items the way the user's language does ("a, b, and c" / "a et b" / "a und b"), using `Intl.ListFormat`. This avoids English commas and "and" between translated pieces.

## Batch 360

**`facilityTime.ts`** gained `getFacilityIsoDate(input, timezone)`: the facility's calendar date as `YYYY-MM-DD`. The equipment register uses it as "today" for due dates.

## Batch 372

- **`downloadText.ts`:** `downloadText(filename, content, mime)` downloads text a service already built (the support audit's CSV or JSON export). A CSV gets a UTF-8 byte-order mark so Excel reads accents correctly.

- **Batch 375, `uiPreferences.ts`:** `getSessionFlag` / `clearSessionFlag` read and clear a per-tab, session-only flag under the exact key another screen set (the report header's "back to messages").

## Batch 389

- **`labels/resolveSlideLabelFitWarnings.ts`:** each warning also carries `requiredMm` and `faceMm`, so the screen can word it in the user's language; `message` stays English.

## Batch 391

`formatDate`: a date without a time ("1988-04-02", a date of birth or LMP) is formatted in UTC. Before, it is midnight UTC shown in the viewer's timezone, so anywhere west of UTC (all of the US) it showed the day before.

## Batch 395

`fillViewportHeight(top, viewportHeight)`: the height from a panel's top edge to the bottom of the window, less a 16 px margin, never below 200 px. Pure, with a test.

## Batch 428: Configuration permissions

Tests only: `participationTypeLookup.test.ts` and `labels/` tests allow Configuration changes in a mocked authorization service, since the services they set up are checked now.

## Batch 431

- `accessRequests.ts`: each request is now saved as a record (`accessRequestService`) before the admins are messaged; `pendingAccessRequestsFor` feeds the badges.
- `uiPreferences.ts`: `setSessionFlag` (new). The worklist filters, messages drawer, voice AI probe and preview pop-up flag use the session flags; the preview window position is a display preference (`previewWindowGeometry`).

## Batch 434

`slideDistributionOperations.ts`: `DISTRIBUTION_STATUS_KEYS` gains `Scanned`.

## Batch 437

- `formatDate.ts` `parseStoredUtc`: a stored timestamp with no zone (how the audit log stores them) is UTC. The Audit Log had shown every time shifted by the viewer's offset.
- `labels/`: label prints are audited.

## Batch 446

`detectIdentifierType.resolveIdentifierApplication`: a scanned slide now gives `{ action: 'openCase', caseId, specimen? }` instead of an address. The search page opens it by reference.

## Batch 449

`configSectionParam.ts`: `pickConfigSection(search, allowed)` gives the inner tab named in `?section=`, else the first. Tested.

## Batch 450 — test evidence for Priority 1 and 2 tickets

`labels/`: molecular label content builder and tests (PS-231, PS-243).

## Batch 451 — screen-level test evidence for Priority 2 tickets

`labels/safeBarcodeSvg.ts` (PS-256).

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

`hydrateGrossingBlocks` saves with retry.

## Batch 458 — PS-71 (continued)

`computeDraftDiff` ignores `__draftBase` and `__draftVersion`, which travel with a cached draft for merging (Batch 458, PS-71).

## Batch 458 — PS-71 (review before saving over someone else's save)

No further change.

## Batch 460

- **`microtomyOperations.ts`:**
  - `matrixBlockAsSpecimenView` / `matrixBlockFromSpecimenView` / `microtomyViewOf` / `microtomyCaseUpdates` (matrix blocks at the bench);
  - `stainsInGridOrder`;
  - `markDecantStainPrinting` / `markDecantStainPrintResult` (moved from the hook);
  - new levels from `nextSlideLevelNumber`.
- **`resolveMaterialFromScan.ts`:** slides are matched by printed level.
- **Tests:** `microtomyOperations.test.ts` (including a stale-copy save that keeps the other change) and `resolveMaterialFromScan.levels.test.ts`.

**Batch 460, after independent review:** `addOnOrderOperations.ts` and `grossingScreenOperations.ts` take the next unused level, and `markStainPrinting` refuses a slide that's gone. Test: `slideLevelReuse.test.ts`.

## Batch 467 — In-house molecular orders

`addOnOrderOperations.ts`: `resolveAddOnRouting` routes an in-house molecular line to the Molecular In-House Queue; a new molecular line starts with its default routing.

---
*Note on structure: earlier entries above this section predate the
convention of grouping by concern — they're the original, individual
per-file review. New entries since Aug 2026 are grouped, per the same
discipline `hooks/README.md` and `services/README.md` use for their
own later additions.*

### Configuration page scroll reset

- **`resetConfigScroll.ts`** (+ `.test.ts`) — real bug found and
  fixed, per direct report: "when changing across the different
  config/system settings, the page does[n't] begin at the top, so you
  have to scroll up to see the add button and column headers."
  `.ps-cfgpage-scroll` (confirmed via its own `overflow-y: auto`) is
  the real, single, shared scroll container for the whole
  Configuration page — but two of the three real state changes that
  can switch what's displayed (`Config/System/index.tsx` and
  `Config/Integrations/index.tsx`'s own internal `setActive`) happen
  two component levels below it, so a prop couldn't reach it without
  a larger refactor. Kept as a small, direct
  `document.querySelector('.ps-cfgpage-scroll')` lookup rather than
  that refactor — a real, singular, well-known container, not a
  fragile guess at an arbitrary selector. Wired into every real
  trigger path: `pages/ConfigurationPage.tsx`'s own top-level
  `handleTabChange`, both System's and Integrations' sidebar clicks,
  both tabs' URL-deep-link `useEffect`, and System's
  voice-navigation event listener — five call sites, not just the one
  originally noticed. Verified live, every path independently, with a
  forced-scrollable viewport and a confirmed non-zero scroll position
  before each switch (re-did two of these after a first attempt gave
  a false-looking "already zero" result that turned out to mean the
  content wasn't tall enough to scroll at all, not that the fix
  worked) — see `pages/README.md`'s own `ConfigurationPage.tsx` entry
  for the fuller account.

## Batch 340 (PS-344)

**`safeInternalPath.ts`** (new, + `.test.ts`): returns a navigation target only if it is a PathScribe path. It refuses `//host`, `/\host`, schemes, backslashes, whitespace and control characters. React Router 6 treated `/\evil.example` as another site (GHSA-wrjc-x8rr-h8h6, fixed in React Router 7.18), so any target read from stored data goes through this before `navigate()`. Batch 341 upgraded to React Router 7; the guard stays as a second line of defence. The first user is `AppShell`'s message config links.

## Batch 338 (PS-342)

**`labelStyleVars.ts`** (new): a report template's label formatting (`LabelConfig`: case, weight, underline, size, font) as `--label-*` CSS custom properties, set only for configured values. `OrchestratorSectionEditor.tsx`'s specimen section titles use it in place of an inline `style={labelStyle(…)}`; `.ps-ose-section-card-title--specimen` reads the properties, with the title's normal look as each fallback. `uiPreferences.ts` gained its first editor user: `PathScribeEditor`'s light/dark theme (`editorTheme`).

## Batch 335 (PS-341)

`participationTypeLookup.ts` gains `invalidateParticipationTypeLookup()`. The cached list used to last for the whole session, so a saved signing-rule change (a country profile or a lab override) didn't reach the sign-out check until a reload. `services/participationTypes/saveParticipationType.ts` and `saveCountryProfiles.ts` now clear the cache after every successful save. Tested in `participationTypeLookup.test.ts` (new).

## Batch 349 (PS-100, PS-101)

**`toastPolicy.ts`** (new, + `.test.ts`): how long a toast stays. Warnings and errors, and any message over 120 characters, stay until the user closes them; short confirmations fade after 4 to 9 seconds, depending on length. Pete's report (PS-100): complex warnings disappeared before they could be read.

**`installToastPolicy.ts`** (new, + `.test.ts`): applies that rule to every react-toastify toast. `App.tsx` calls it once; it listens for each new toast and sets its close time, so no `toast.*` call site had to change. A toast can opt out with `data: { keepAutoClose: true }`.

**`search/resolveSearchDateRange.ts`** (new folder, + `.test.ts`): the Search page's accession-date range. When the user searches by an identifier and hasn't chosen dates, every date is searched: an accession number or MRN names the case, so the hidden 30-day default only hid it (PS-101).

**`detectIdentifierType.ts`**: a value that matches no configured format now fills `anyIdentifier` (matched against name, MRN or accession) instead of filling patient name, MRN and MPI together, which all had to match, so an MRN typed alone found nothing (PS-101).

## Batch 350 (Search repair)

- **`search/`** now has its own README. It holds the Search page's decisions: building the server request, the summary, the CSV, date shortcuts, session state, specimen suggestions and picker filters.
- **`detectIdentifierType.ts`**: a requisition number now fills `orderNo` (the order-number filter). It used to fill `accessionNo`, which is compared to accession numbers only, so it never matched.
- **`caseRevisionDisplay.ts`**: `getCaseStatusLabel(status, revision, t)` returns a translated label (`caseStatusDisplay.*`). It was English only (Title Case of the status code, and "Final (Amended)"). Callers: `WorklistTable.tsx` (both views) and the report page's `HeaderBar.tsx`. The English wording is unchanged, except "Ai Assisted" is now "AI-Assisted".

**Batch 351:** `search/` gained the section 3 filters' request, labels and summary, and a sign-out column in the CSV. See `search/README.md`.

## Batch 362

`formatOrdinal.ts` treats a regional variant (nl-BE, en-GB) as its language, so Belgian Dutch gets the Dutch ordinal (3e). New `formatOrdinal.test.ts`.

## Batch 365 (PS-347)

- **`isoDateForSearch.ts`** writes and matches every jurisdiction's date format: Dutch DD-MM-YYYY and German DD.MM.YYYY join the slash and year-first forms. German dates of birth were written month first in the order lookup.
- **`formatDate.ts`:** `dateFormatHint` returns `JurisdictionDateFormat`.
- New tests in `isoDateForSearch.test.ts` check each jurisdiction's written form, and that the Dutch form matches nl-NL formatting.

## Batch 367 (PS-74)

- **`labelStyleVars.ts`** takes an optional name prefix (`--<prefix>-size`, …), so nested elements each read their own settings. It is used by the report preview's page, header, footer, headings and labels, and by the Document Style and Template Assembly previews.

- **Batch 376:** `formatList` is now also used by the Accession page (missing required fields, department conflicts).

## Batch 388

- **Batch 388, `microtomyOperations.ts`:** `MICROTOMY_REASON_KEYS` maps the stored English reprint and cancel reasons to the keys of `microtomyWorkstation.reasons.*`, so the screen shows them translated while the records keep the English value.

## Batch 401

- **`embeddingOperations.ts`:** `EMBEDDING_MOLD_SIZE_KEYS`, `EMBEDDING_DISCREPANCY_REASON_KEYS`, `CASSETTE_REPRINT_REASON_KEYS` and `BLOCK_STATUS_KEYS` map stored English values to `embeddingStation.*` locale keys; `EMBEDDING_ORIENTATION_QUICK_FILLS` are now locale keys (the field is free text, so a quick fill inserts the user's own wording); `splitBlockCandidates` moved out of the Embedding panel.

## Batch 402

- **`slideDistributionOperations.ts`:** a slide label reprint needs a reason (`SLIDE_LABEL_REPRINT_REASONS`; `recordLabelReprintRequest` refuses without one and writes it on the chain-of-custody line). Locale-key maps for exception reasons, reprint reasons, routing status and case priority; `SplitDestinationWarning.kind` for the screen's text (the English `detail` stays); `filterRoutingDirectory` moved out of the destination panel.
- **`formatDate.ts`:** `formatTime(iso, locale)`, hours and minutes in the user's locale (test: `formatTime.test.ts`).

## Batch 403

`addOnOrderOperations.ts`:
- Each order line can carry its own reference lab.
- `resolveSendOutLabChoices`: a test's approved labs, and its default.
- `withDefaultSendOutLab`: fills a line's lab from its test.
- Moved out of the page: `filterStainsForKind` and `buildAddOnLines`.
- Locale-key maps for routing queues and exception reasons.
- Refusals carry an `errorCode` for the screen.

## Batch 473 — Autopsy case-type key migration

`search/`: `caseSearchLabels.ts`'s autopsy-authority label key renamed in step with `AutopsyCaseAuthority`. No behavior change. See `services/autopsy/README.md`.

## Batch 493 — facilityTime.ts gains a real timestamp, not just a date (PS-359 follow-up)

**`facilityTime.ts`** gained `getFacilityDateTimeUtc(year, month, day, hour, minute, timezone)`: the real UTC instant for a given facility-local calendar date *and* clock time, built from the existing `getFacilityMidnightUtc` plus the hour/minute offset. First real caller: `services/tumorBoard/`'s new meeting-time field and calendar-invite generator, which need an actual point in time (for "is this meeting still in the future" and for the `.ics` `DTSTART`/`DTEND`), not just a calendar date. A DST-at-midnight edge case (the added hour/minute offset doesn't itself re-resolve against a timezone change that happens between midnight and the meeting time) is a deliberately-accepted, vanishingly rare imprecision — noted in the function's own comment.

## Batch 500

`labels/printLabels.ts` escapes its print window's title (PS-473).

## Batch 503

- **`alertTone.ts`** (+ test) — the urgent-message alert sound (two short beeps), made with Web Audio; silent where audio isn't allowed yet.

## Batch 504

- **`ageFromDateOfBirth.ts`** (+ test) — age in whole years from the calendar date written in a date of birth. Shared by the report preview and the cytology screening age bands, both of which made the age go up a day early in the Americas.

## Batch 506 (PS-477): `workstationSettings.ts`

Settings that belong to the computer rather than a person: its scan station, OR terminal, wall-display profile, foot-pedal bindings and companion-window positions. Exact keys (no prefix), so values saved before it existed are still found. Never throws: blocked or full storage just means nothing is remembered. Per-person display preferences stay in `uiPreferences.ts`. Test: `workstationSettings.test.ts`.

## Batch 508

`uiPreferences.ts` exports `UI_PREFERENCE_PREFIX` (`ps_ui_`). Full Reset (`services/demoReset/`) clears every key under it.

## Batch 511 (PS-478): full strict type-checking

See `labels/README.md`.

## Batch 514 (PS-269)

- **`formatPercent.ts`** (+ test): `formatPercent`, `formatDecimal` and `formatPercentagePointChange`, which write numbers the user's way ("12,3 %" in French). A percentage-point change also returns which form of the unit word goes with it (`one` / `other`), passed to i18next as `context`.
- **`personName.ts`**: `formatDisplayNameForLanguage(name, language)` follows Korean medical charting convention on a Korean screen: full name + 님, or 선생님 for Dr./Prof., family name first for a Hangul name, no Western title. Other languages are unchanged. `resolvePatientNameValue` returns a patient's name fields so a screen can format them itself; `resolvePatientFullDisplayName` takes an optional language.

## Batch 524 (PS-491): accessibility

New folder `a11y/` (`pressable`, `switchable`).

## Batch 543 (finding F8): CSV formula injection

`csv.ts`: `neutralizeFormula`, `csvField` (now exported) and `csvQuoted`. A text cell starting with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading apostrophe, so a spreadsheet shows it as text instead of running it (OWASP "CSV injection"). Numbers, booleans and number-like text ("-5", "+1.5") are unchanged. A value that already starts with apostrophes before such a character gets one more. `parseCsvRows` removes one apostrophe again, so an exported dictionary re-imports exactly. Every CSV writer goes through these: `toCsv`, `csvExport.buildMetaHeader`, `search/caseSearchCsv.ts`, and the Audit Log, Billing Log and Action Registry exports.

## Batch 546

`labels/printCassetteSlideLabel.ts`: header comment corrected (workstation agent routing).

## Batch 550 (PS-539 phase 2d: exports through the server)

- `downloadFromUrl.ts` (new): starts the download of a signed export link. Only https (plain http only to this computer in development), no user name or password in the link; `absoluteDownloadUrl` resolves a path against the API server and refuses `//other-site` links.

## Batch 552 (PS-539 phase 2d: site agent screens)

- `copyText.ts` (new): copies text to the clipboard; false when the browser refuses (the text stays selectable).

## Batch 565

- `chartTheme.ts` (new): `CHART_TICK_COLOR`, the colour charts draw their own text in (AA on the dark cards).

## Batch 566

- `a11y/pressable.ts`: `clickableContainer(handler)`, for a row that holds buttons of its own (a mouse shortcut only; the same action goes on a real button inside). Tests: `a11y/pressable.test.ts` (new).

## Batch 567

- `a11y/`: `.ps-row-open-btn`, the shared look for the button inside a `clickableContainer` row.

## Batch 569

- `a11y/focusAfterRemoval.ts` (new): where focus goes when the focused item leaves a list.

## Batch 570

- `a11y/focusAfterRemoval.ts`: `isNonPointerClick`, and the nearest item still in the list.

## Batch 574

- `formatDate.ts` `formatHourOfDay`: an hour of the day in the user's locale.

## Batch 580

- `selectAutoWidth.ts` (new): where the styled dropdown list is drawn (`appearance: base-select`), gives each single-choice dropdown the width of its widest option (`--ps-select-auto-width`), kept up to date; installed once in `startApp.tsx`. PS-62.
