**Batch 747:** `caseFacility.ts` (new): a case's legacy tenant id (HOSP-001) resolves to its facility, so a profile's views see the case's batches, slides and add-ons (they matched nothing before); `buildFacilityLookupMaps.ts` gains `caseFacilityById`, used by the summaries. `mockDisplayProfileService.ts`: the demo profiles (their ids in `demoDisplayProfileIds.ts`), seed profiles added when missing. Tests: `caseFacility.test.ts`, `wallDisplayVolume.test.ts`.

**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/facilityOpsDashboard/

Real, per PS-288 (Enterprise Laboratory Operations Dashboard Engine),
fifth and final of the PS-284→285→286→287→288 workstation-build
sequence. Two real, separate things live here:

1. **The Display Profile / device registry** (`IDisplayProfileService.ts`
   / `mockDisplayProfileService.ts`) — a real, data-only record a
   physical wall display "logs in as," same real shape as
   `services/intraopDashboard/IOrSuiteTerminalService.ts`. No physical
   kiosk hardware is reachable from this environment to bind against
   for real — `deviceToken` is honestly informational only, never
   validated or enforced.
2. **The five real department dashboard summary functions** — pure
   aggregation over this app's own real, existing data (Batch,
   HistologyBlock/StainOrder, ReferralTracking, WsiScanBatch), never a
   new, parallel data model.

## Files

- **`IDisplayProfileService.ts` / `mockDisplayProfileService.ts`** —
  the device registry (see above). Seeded with one real profile
  (`dispprof-seed-histology`, `c-fenwick-general`, all three
  Grossing/Embedding/Staining views carouseling every 20s) so both the
  admin registry (`components/Config/System/DisplayProfilesSection.tsx`)
  and the kiosk binding screen (`pages/FacilityOpsDashboard/FacilityOpsDashboardPage.tsx`)
  have something real to show out of the box.
- **`IFacilityOpsDashboardTypes.ts`** — the one, shared summary shape
  (`DashboardSummary`: stat tiles + queue rows + alerts) every one of
  the five `compute*Summary` functions returns, so all five dashboard
  views render through the same real presentational component
  (`pages/FacilityOpsDashboard/components/DashboardSummaryView.tsx`)
  rather than five independently-built layouts.
- **`resolveBatchFacilityId.ts`** (+ test) — real, confirmed directly
  before building: `Batch` has no direct `facilityId`. The real,
  honest join: `BatchItem.caseAccession` → `Case.originHospitalId`
  first, falling back to `Batch.stationId` → `ScanStation.facilityId`
  for a batch with no items scanned in yet. Same real "performing lab,
  never referring facility" reasoning `computePendingBatchQueue.ts`'s
  own header already established for this app — reused directly, not
  reinvented.
- **`buildFacilityLookupMaps.ts`** — builds the two real join maps
  `resolveBatchFacilityId.ts` needs (plus a shared `casesById` map),
  once per real dashboard refresh, rather than five separate,
  independent case/station fetches.
- **`computeSlaCountdown.ts`** (+ test) — real, direct generalization
  of `services/batches/DecalBatch.ts`'s own `getDecalTimerState` math
  (elapsed/remaining minutes, warning-before-target, overdue at zero),
  lifted out so every dashboard view shares one real countdown
  implementation. `DecalBatch.ts` itself is untouched; its own decal
  callers keep using it directly.
- **`computeGrossingIntakeSummary.ts`** — real, active
  `Processing`/`Decal / Special Processing`/`Checkout` batches, plus
  the real, already-facility-scoped `computePendingBatchQueue.ts`
  reused directly for the pending-intake count (never re-derived). A
  decal batch gets a real SLA countdown from its own
  `targetDurationMinutes`; other nodes show honest, uncolored age —
  no fabricated target.
- **`computeEmbeddingMicrotomySummary.ts`** — real, active
  `Embedding`/`Microtomy / Sectioning` batches. Honest scope: this app
  has no real, existing per-batch target-duration field for either
  node (unlike Decal), so no SLA countdown is invented for them —
  STAT-priority batches (`Batch.priority`, a real, existing field) are
  the real high-contrast alert source instead.
- **`computeStainingIhcSummary.ts`** — real, active
  `Staining`/`Cytology Staining` batches, plus a real, per-status
  breakdown of every `StainOrder` in this facility's own cases (QC
  Failed / Recut Requested / Ready for Review / Staining counts).
  **Deliberate scope cut**, documented in the file's own header:
  `StainOrder.stainName` is a real display-name string, not yet a real
  FK into the Stain Dictionary (`types/case/Specimen.ts`'s own
  disclosure) — a reliable Routine/Special-Stain/IHC/Molecular
  category breakdown would need that real FK; this dashboard reports
  by the real, clean `StainOrderStatus` field instead rather than
  building a name-matching heuristic on a known-unreliable join.
- **`computeSendOutReferenceSummary.ts`** — real `External Referral`
  batches joined to their own real `ReferralTracking` record
  (`services/referral/`, one per `Batch.id`) for transit-status
  counts, plus the real, existing `Batch.coldChainExcursion` field
  surfaced as a genuine critical alert — an already-real signal, not a
  fabricated one.
- **`computeDiagnosticSignOutSummary.ts`** — real `WsiScanBatch`/
  `WsiScanSlide` status counts. Confirmed directly before building:
  `WsiScanBatch` carries no direct `facilityId` — only each real slide
  has a `caseId` — so facility scoping joins per-slide through
  `Case.originHospitalId`, the same real pattern
  `resolveBatchFacilityId.ts` uses for `Batch`.
- **`facilityOpsDashboardSummaries.test.ts`** — real,
  integration-style tests seeding real cases/batches/referral
  tracking/WSI batches via the same real services these functions
  read from (same real pattern as
  `services/batches/computePendingBatchQueue.test.ts`), not mocked
  out.

## Honest, deliberate scope cuts (this Epic)

- No real-time push — `pages/FacilityOpsDashboard/FacilityOpsDashboardPage.tsx`
  polls on a real interval (20 s) instead, **plus** a real "Offline / Stale
  Data" badge whenever the last poll failed or has gone stale. It does
  not use `services/liveUpdates/` (the SignalR live-update client that
  `pages/OrSuiteDashboardPage.tsx` has used since Batch 342, with its own
  `LiveStatusBadge`).
- No fabricated SLA/target-duration numbers anywhere a real source
  doesn't exist for one (Embedding/Microtomy/Staining/Send-Out
  batches) — see each summary function's own header above.
- No Routine/Special-Stain/IHC/Molecular category breakdown — see
  `computeStainingIhcSummary.ts`'s own disclosed reason above.
- `deviceToken` on `DisplayProfile` is informational only — this
  environment cannot verify or enforce a binding to real physical
  hardware.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the OR Suite board is no longer polling-only without a status badge; it uses the live-update service (Batch 342). This dashboard still polls.*

## Real, closed gap (direct follow-up): the recorded `deviceToken` is now consulted at bind time

The disclosure above ("no physical binding is verified or enforced")
was true in a stronger sense than intended: `deviceToken` was
admin-settable in `DisplayProfilesSection.tsx` but was never once
read anywhere in the actual kiosk binding flow — any browser could
bind to any profile purely by picking its friendly `name` from a
dropdown, so a value an admin deliberately recorded for a specific
physical display did nothing at all. Closed in
`pages/FacilityOpsDashboard/FacilityOpsDashboardPage.tsx`'s own
`ProfileSetup`: selecting a profile that has a `deviceToken` recorded
now requires that exact token to be typed before the bind completes;
a profile with none set still binds straight from the dropdown,
unchanged. This is still **not** real physical hardware verification
— no MAC/IP a browser can actually read is ever compared, only one
human-entered string against another — it closes the specific,
concrete inconsistency (a recorded value nothing ever checked), not
the larger, still-honestly-disclosed "no real device binding exists"
limitation immediately above. Covered by
`pages/FacilityOpsDashboard/FacilityOpsDashboardPage.test.tsx`
(new — no render test existed for this page's binding step before).

## Batch 428: Configuration permissions

- `mockDisplayProfileService`: `add`, `update`, `deactivate` need `config:display-profiles:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

## Batch 603: Display Token device binding (replaces the typed device-token check above)

A display binds to a profile only with the Display Token an administrator issues in Configuration (Display Profiles → "Display token"). The earlier typed comparison against `deviceToken` is gone; `deviceToken` remains an optional asset note. The bound display re-checks its token every minute and blanks when it is revoked or expired. This page shows no patient identifiers. See `services/displayAccess/README.md` and `docs/architecture/DISPLAY_ACCESS_API.md`.

Batch 616 (part D, PS-510): server version of DisplayProfileService (`http<Name>Service.ts`, instance file `<name>ServiceInstance.ts`; mock in the demo, API server when an address is configured). Calls: `docs/architecture/INTRAOP_OPS_API.md`.

## Batch 727 — add-ons on the wall, time X, the Stations view (Lab Workflow & Batch spec, Decisions 2-3, §6.4, §9)

- `openAddOnOrders.ts` (pure): every add-on slide still Pending Cut across cases (controls not counted; orders without the routed stamp included), its type from the routed queue, its facility (the order's performing-lab stamp, else the case's), its colour against X (amber in the last 30 minutes, or half of X when X is an hour or less; red past X) and whether it is pinned (STAT or past X). `DEFAULT_ADD_ON_AGE_LIMIT_MINUTES` = 120.
- `computeEmbeddingMicrotomySummary.ts`: add-on rows (tag `addOn`, `subLabelKey` = order type, `slaState` against X, `pinned`) with the batch rows, pinned first then oldest; STAT add-on alerts; an "Add-Ons waiting" tile.
- `stationOverviewRules.ts` (pure) and `computeStationOverviewSummary.ts`: the new **Stations** view (`station_overview`), the live minimum set of spec section 9.
- `computeStainingIhcSummary.ts`: the stainer's reported status in each row, and a **Run Failed** alert.
- `IFacilityOpsDashboardTypes.ts`: `labelKey`, `kindKey`, `detailKey`/`detailValues`, `tags`, `subLabelKey`, `pinned`, and `DashboardViewOptions` (X). Every view's labels now carry locale keys; the English `label`/`kind`/`detail` stay as fallback.
- `IDisplayProfileService.ts`: `addOnAgeLimitMinutes` and the view id `station_overview`; `displayProfileRules.ts` checks X (15 to 1440 whole minutes; the demo service refuses anything else).
- Tests: `wallDisplayAddOns.test.ts`; `facilityOpsDashboardSummaries.test.ts` gains the add-on case.

## Batch 728

- Display Profile `batchPurposeIds` and `DashboardViewOptions.batchPurposeIds`: the five carrier views show only carriers of the chosen purposes (none chosen = all; add-ons always show). `displayProfileRules.ts`: `PURPOSE_FILTER_VIEWS`, `showsCarrierViews`, `togglePurposeId`.

## Batch 729

- `computeStationOverviewSummary.ts`: the **Not scanned recently** tile and up to ten **Not scanned** alerts, and items without a carrier on each step's row (`stationOverviewRules.ts`: `StationRow.loose`), from `stationScanEventService.activitySummary`. Display Profile `staleScanMinutes` (`displayProfileRules.ts`: 30 to 10080, default 240).

## Batch 730

- `openAddOnOrders.ts`: `TYPE_BY_QUEUE` exported (the add-on report uses the same types).
