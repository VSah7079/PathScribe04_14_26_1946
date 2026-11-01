**Batch 749:** `mockAiScreeningResultService.ts`: completed AI gallery reads for S26-5501 and S26-5503 (seed row S5); a seed result missing from storage is added.

**Batch 747:** `mockWsiScanBatchService.ts`: the wall display's scanner runs (`batches/wallDisplayDemoBatches.ts`) are added when missing; the two September runs still scanning now have times relative to the reset.

**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/digitalPathology/

Real, shared home for computational-pathology/AI vendor integration
and whole-slide-imaging (WSI) infrastructure — deliberately not
`services/cytology/`, even though cytology (Hologic Genius) was the
driving use case and `IWsiScanBatchService.ts` was relocated here from
there. Surgical pathology's own real, FDA-cleared AI products (Paige
Prostate, Ibex Prostate Detect, PathAI AISight Dx, Proscia Concentriq
AP-Dx) are the majority of this real market; cervical cytology is one,
real, additional modality this same shared infrastructure covers, not
its primary reason to exist.

## Files

- **`IDpVendorService.ts` / `mockDpVendorService.ts`** — a real,
  admin-editable dictionary of named computational-pathology vendors.
  Seeded with the five real products named above, each grounded in
  real research (FDA clearance dates, deployment scale, the specific
  modality each product actually screens) rather than invented
  placeholders. Admin UI: `Config/System/DpVendorDictionarySection.tsx`
  ("Digital Pathology / AI Vendors").
- **`IAiScreeningResultService.ts` / `mockAiScreeningResultService.ts`** —
  the real, operational record store for `AiScreeningResult`
  (`types/digitalPathology/`) — `ordered` → `completed`/`failed`/
  `timed_out`, with real findings and an optional `AiSpatialRegion`
  (a real, simple, normalized-coordinate alternative to a full geojson
  package this app has no other use for — the original integration
  plan's own "spatialRegion?: GeoJSON" note, honestly deviated from
  rather than adding a new dependency for one narrow field).
- **`processInboundAiScreeningResultEvent.ts`** — real, idempotent
  ingestion of a completed/failed/timed-out result, same
  "PathScribe ingests its own specification" split as every other
  inbound processor in this app.
- **`recordAiHumanConcordance.ts`** — the real CAPA-design decision this
  whole integration was built around: **no auto-CAPA**. Recording a
  genuine "discordant" judgment raises a real, `open`
  `SpecimenDeficiency` (a new `def-ai-discordance` type) via the
  existing deficiency mechanism — never auto-escalated, never
  auto-resolved. A human decides what happens next through the
  existing Quality Assurance page's own real Escalate-to-CAPA flow.
- **`resolveAiHumanDiscrepancyReport.ts` / `resolveAiScreeningTimeoutStatus.ts`**
  — the two real QA reports the original plan called for: per-vendor
  discordance rates (excluding results never actually reviewed by a
  human — never counted as concordant by default), and genuinely
  stalled `ordered` results past a configurable timeout window.
- **`IWsiScanBatchService.ts` / `mockWsiScanBatchService.ts`** —
  relocated here from `services/cytology/`, since it's domain-agnostic
  (surgical pathology needs whole-slide scanning equally). Every real
  caller (`buildWsiScanBatchManifestPayload.ts`,
  `resolveCaseCytologyScansCompletedMembership.ts`,
  `processInboundWsiScanStatusUpdateEvent.ts`, and their own test
  files, including dynamic `await import(...)` calls a simple
  `from '...'` pattern match wouldn't have caught) updated to the new
  path. **Real, honest correction (per direct follow-up, "it all
  needs to be wired"):** the relocation's own earlier claim of
  "confirmed zero stray references anywhere afterward" only checked
  that every real *consumer* pointed at the new path — the old
  `services/cytology/IWsiScanBatchService.ts` /
  `mockWsiScanBatchService.ts` source files themselves were never
  actually deleted, and sat as genuine, verified-unused dead code
  until now. Deleted for real this time, confirmed via a full
  before/after `tsc --noEmit` and full test-suite pass, not just a
  reference search.
- **`WsiScanSlide.acquisitionMode` / `.focalPlaneCount`** — real, per
  direct guidance's own confirmed Surgical Pathology vs. Cytology DP
  technical breakdown: surgical pathology's flat, 2-to-5-micron tissue
  sections scan at a single fixed focal plane; cytology's non-flat, 3D
  fluid suspensions/smears genuinely require either full Z-stack
  capture across multiple focal depths or dynamic focus-fusion
  compositing. Both fields optional and additive — `undefined` for
  every existing/surgical-pathology slide, populated only when the
  real interface engine's own inbound event
  (`WsiScanStatusUpdateEventPayload.ts`, extended to match) actually
  reports them. PathScribe never talks to the scanner instrument
  itself and never infers or defaults either field — same "ingest our
  own specification, the interface engine owns the real instrument
  protocol" posture as every other real inbound event in this app.

## Story 10 (Sep 2026) — Cytology Assist FOV Ingestion

Real, per the RFP-APLIS-2026-GLOBAL gap: "real ingestion of
field-of-view coordinates and triage scores directly from GYN
cytology processors (Hologic ThinPrep Genesis/Genius, BD FocalPoint),
surfaced directly in the technician's live screening queue." Prompted
directly: "since these messages are routing through the interface
engine could it process the message into a standard form for
PathScribe?" — confirmed this is exactly this folder's own,
already-established architecture (see the scope boundary below,
written before this story). No vendor-branching logic was added to
PathScribe itself; the real gap was a genuine hole in the canonical
schema plus a real, complete absence of any consumer for it.

**Real, confirmed research before designing anything**: BD FocalPoint
and Hologic Genius report genuinely different shapes of data, not the
same shape from two vendors. BD FocalPoint ranks the *whole slide*
into one of 5 real quintiles by likelihood of abnormality and gates
it into a real "Review"/"No Further Review" classification (15-25%
of slides need no human review at all) — real, confirmed via BD's own
FDA submission and product literature. Hologic Genius reports no
slide-level rank at all — instead a real, 30-tile gallery of objects
of interest per slide, grouped by cell type — confirmed via Hologic's
own FDA De Novo filing and published technical review.

**The real, canonical fix**: `AiScreeningResult` gained a new,
optional, genuinely vendor-agnostic `slideTriage` field
(`AiSlideTriageSummary` — `reviewRecommended`, `rankGroup`,
`totalRankGroups`) alongside the existing `findings[]` list — real
interface-engine territory to populate when a given vendor's own real
product reports a slide-level equivalent (BD), left honestly
undefined when it doesn't (Hologic's own real gallery-only model).
`AiScreeningResultEventPayload` and `markCompleted()` carry it
through. BD FocalPoint added to the vendor dictionary
(`mockDpVendorService.ts`) — with a real, honest regulatory nuance
recorded there: BD FocalPoint is FDA-*authorized* via a PMA
supplement, not 510(k) *cleared*, the specific pathway this
dictionary's own `fdaCleared` field (rendered in the admin UI as the
literal label "FDA Cleared") tracks — set to `false`, not because the
product lacks real authorization, but because "cleared" is the wrong
real regulatory word for it.

**The real "surfaced in the live screening queue" gap, now closed**:
confirmed directly before building — `CytologyWorklistPage.tsx` had
zero references to `AiScreeningResult` anywhere; the whole system
existed with no real consumer. Now fetches and displays a real,
per-case AI triage badge (quintile rank + review recommendation when
a vendor reports one, an AI-flagged-FOV count otherwise) in the
technician's own "My Worklist"/"Pool" queue rows.

6 new/updated tests confirm the canonical schema genuinely holds both
real shapes correctly (a BD-style slide-level rank alongside its FOV
list; a Hologic-style flat gallery with `slideTriage` honestly
`undefined`, never a fabricated default).

**Real, direct follow-up correction — the concordance loop itself was
not actually closed**: confirmed directly, per a pointed follow-up
("obviously that is a huge gap. Sort of the whole point of
concordance monitoring") — `recordAiHumanConcordance()` already
existed, already correctly required an explicit human judgment, and
already correctly raised a real, open `SpecimenDeficiency` on
discordance (never auto-escalated or auto-resolved) — but it had
**zero real callers anywhere in the UI**. `CytologyScreeningPage.tsx`
now prompts for this judgment, but only once the reviewer's own
independent finding has already been saved (so the AI result can
never bias that independent read), and only once per real AI result
(`humanConcordant === undefined` — never re-asked after a real
judgment is recorded). The prompt states the AI's own real result in
plain terms (its slide-level rank/gate when one exists, or its FOV
count otherwise) and asks a direct, explicit yes/no question — never
an automatic text-similarity guess between the AI's own finding label
and the reviewer's own dictionary term, which would be a real,
unreliable heuristic standing in for a genuine human judgment.

## Real, explicit scope boundary

None of this closes the actual FDA-cleared products' own real
integration — this is the canonical schema and workflow logic a real
vendor's own interface engine would map onto, matching this app's own
established "PathScribe owns the schema; the interface engine owns
vendor-specific translation" posture throughout.

## WSI Viewer Launch (Sep 2026)

Real, per direct guidance on RFP-APLIS-2026-GLOBAL §3.4.1 ("Native
launch of Whole Slide Images... via DICOM Web standards... or
vendor-agnostic APIs"): "my plan was to connect to vendors that
actually deal with the WSI. We just pass info and launch the app and
route the unique id so that the correct scan is placed in their
viewer." Confirmed directly first: `IWsiScanBatchService.ts` tracks
scan-batch status; nothing launched a real vendor's actual viewer.

- **`IWsiViewerVendorService.ts` / `mockWsiViewerVendorService.ts`** —
  a real, admin-editable dictionary, deliberately separate from
  `IDpVendorService.ts` above: that dictionary's own real job is
  tracking WHICH vendor's algorithm produced a given `AiScreeningResult`
  (QA/discordance), a genuinely different concern from "where do I
  click to open this slide." Seeded with the three real scanner
  vendors RFP §3.4 itself names (Leica, Roche, Hamamatsu) plus four
  more real, launchable platforms confirmed via current research —
  Paige IMS, PathAI PathOS, Proscia Concentriq, Philips IntelliSite —
  per direct follow-up ("many DP vendors actually have their own AI or
  they allow other AI to connect"). Paige and PathAI legitimately
  exist in *both* dictionaries — not a data inconsistency, an accurate
  reflection of these being real companies with two genuinely
  different real roles (Paige IMS bundles a real third-party AI
  marketplace; PathAI's PathOS "orchestrates both their own and
  partner models"). Per direct guidance's own framing ("contextual
  launch of the application, similar to the EMR approach"), this
  dictionary's one real job is that mechanism for any real, launchable
  DP platform, regardless of what runs inside it. All real
  `launchUrlTemplate` values ship empty — no real customer URL to ship
  — plus one `[DEMO ONLY]` entry with a real, working synthetic
  template. Admin UI: `Config/System/WsiViewerVendorDictionarySection.tsx`
  ("WSI Viewers" category within the consolidated "Vendor
  Integrations" screen, `VendorIntegrationsSection.tsx` — per direct
  guidance: "why not a main Vendor Integration and then have
  categories on the left," consolidating what had been four separate
  flat vendor-dictionary nav entries) — real, per the earlier, direct
  follow-up ("where is the url to the vendor configured?"); the data
  layer and launch button existed with no admin screen to actually
  set it until this, mirroring `DpVendorDictionarySection.tsx`'s own
  established list/add-edit-modal/deactivate pattern exactly.
- **`utils/buildWsiViewerLaunchUrl.ts`** — the entire real mechanism:
  substitutes one real identifier (`StainOrder.displayId`, the same
  barcode a real scanner already reads) into an admin-configured URL
  template. PathScribe never implements DICOMweb, never renders an
  image, never needs the vendor's own API credentials — the vendor's
  real viewer owns everything after the browser navigates there.
- **`pages/SynopticReportPage/components/WsiViewerLaunchButton.tsx`**
  — the real UI, wired into `BlockStainEditorModal.tsx`'s existing
  per-stain chip row. Only renders once a stain has genuinely reached
  `'Coverslipped'`/`'Ready for Review'` — no real slide to route to
  before that. Built as its own small, separately-translated
  component rather than converting that 1,300+-line host file
  wholesale, same boundary already established for `GrossingReleasePanel.tsx`
  and the OR Suite Live Board's own nav button.

## Real, new consumer (PS-288, Sep 2026)

`services/facilityOpsDashboard/computeDiagnosticSignOutSummary.ts` reads `mockWsiScanBatchService.getAll()` for the Diagnostic Sign-Out/Scanner department dashboard's real pending/scanning/completed/failed slide counts, plus a real "Scan QC Failed" alert whenever a completed slide's own `qcPassed` is `false`. Confirmed directly before building: `WsiScanBatch` carries no direct `facilityId` — only each real slide has a `caseId` — so facility scoping joins per-slide through `Case.originHospitalId`, the same real pattern `services/facilityOpsDashboard/resolveBatchFacilityId.ts` uses for `Batch`. Read-only; nothing in this folder's own files changed.

## Batch 428: Configuration permissions

- `mockDpVendorService`: `add`, `update`, `deactivate`, `reactivate`, `remove` need `config:vendor-integrations:manage`.
- `mockWsiViewerVendorService`: `add`, `update`, `deactivate`, `reactivate`, `remove` need `config:vendor-integrations:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

## Batch 434 — WSI scan batches have a screen (PS-359, PS-345)

Pete: a scan batch takes its slides from the scanning queue; scanners come from the Equipment register; the Batch Management roles load, send and unload.

| File | What it does |
|---|---|
| `wsiScanQueue.ts` | Pure. `buildScanQueue` (slides the Slide Distribution Station routed to Digital, not in a batch; STAT first), `planScanLoad` (positions: rack-slot when recorded, else the order chosen), `stainLoaded` / `stainUnloaded` (the slide record and its chain-of-custody line), `scanBatchProgress`, `scanBatchActions`. |
| `wsiScanBatchWorkflow.ts` | `loadScanBatch` (`wsi:scan-batch:load`), `sendScanBatch` (`wsi:scan-batch:send`; the manifest goes through `dispatchInterfaceMessage` as `WSI_SCAN_MANIFEST`; a failed send keeps the batch loaded with `sendError`), `unloadScanBatch` (`wsi:scan-batch:unload`; slides that scanned and passed image QC become `Scanned`, the rest go back to the queue). Each checks the permission against the scanner's lab and writes one audit entry. |

**The unload bug is fixed.** `markUnloaded` used to set the batch to `completed` or `failed` and never `unloaded`. Now the inbound status updates move a scanning batch to `completed` (or `failed`) once every slide has its outcome, and unloading sets `unloaded`. A batch that was never sent can be unloaded as it is. The two seeded batches with an unload time are now `unloaded`, and seeded batches name scanners by their register code (`APERIO_GT450_01`, `APERIO_GT450_02`, `GENIUS_01`).

`IWsiScanBatchService.ts` gains: per-slide `blockId`, `stainId`, `slideLabel`; per-batch `facilityId`, `loadedBy`, `sentBy`, `unloadedBy`, `sendError`; `recordSendFailure`; the helpers `allSlidesScanned` and `slideScannedOk`.

Tests: `wsiScanQueue.test.ts`, `wsiScanBatchWorkflow.test.ts`; `mockWsiScanBatchService.test.ts` rewritten for the corrected lifecycle (its old tests expected the bug).

## Batch 435

`mockWsiScanBatchService.ts` publishes `WsiScanBatchChanged` after every write (as the API server will after its commit), so the Slide scanning page updates when the scanner reports.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

WSI scan batch stain updates are versioned; the count of slides sent back comes from the save that landed.

## Batch 610 (#78)

`aiStalledResultRule.ts` and `mockAiStalledResultSettingsService` (how long an AI result may wait before it counts as stalled), and `aiQaReportRows.ts` (discordance and concordance rows for the AI Discordance tab).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

Batch 616 (part D, PS-502): server versions of AiScreeningResultService, AiStalledResultSettingsService, DpVendorService, WsiScanBatchService, WsiViewerVendorService (`http<Name>Service.ts`, instance file `<name>ServiceInstance.ts`; mock in the demo, API server when an address is configured). Calls: `docs/architecture/DIGITAL_PATHOLOGY_API.md`.

## Batch 624

`resolveWorklistDpBadges.ts`: each badge also returns a translatable label (`summaryLabel`, `primaryLabel`: a key plus values) for the wording PathScribe writes, and `dpLabelText` picks it or the received text. Scanner and AI vendor wording is never translated: `primaryLabel` is absent when the headline is the vendor's, and a scanner failure reason is only inserted as a value. The English `summaryText` / `primaryText` stay (voice summaries, tests).

## Batch 750

PathScribe has no slide viewer (Pete, Oct 31, 2026). `slideImages.ts` (new, pure): the slide image settings (`EnterpriseConfig.slideImages`: viewer and preview address templates with `{{slideId}}` and `{{accession}}`, per facility), which address applies (facility, laboratory, the WSI Viewers list for opening only, the deployment's `VITE_SLIDE_*`), the image state from the slide's scanner fields (No image yet, Queued, Scanning, Scan failed, Failed image quality, available), and the thumbnail (a delivered preview, else the template; never altered). `slideImageOpen.ts` (new): `case:slide-image:open`, the address, the audit event Slide Image Opened. `ISlidePreviewService.ts`, `mockSlidePreviewService.ts` (no seed), `httpSlidePreviewService.ts`, `slidePreviewServiceInstance.ts` (new): previews the interface delivers (feed Planned). `wsiScanQueue.stainUnloaded` now records `lastScanOutcome`. `mockWsiViewerVendorService.ts`: the example.com demo entry removed. `buildWsiViewerLaunchUrl.ts` and `WsiViewerLaunchButton.tsx` (described above) are deleted; the launch is `components/SlideImage/SlideImagePreview.tsx`. Contract: `docs/architecture/SLIDE_IMAGES.md`.
