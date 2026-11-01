**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

# pages/FacilityOpsDashboard/

Real, per PS-288 (Enterprise Laboratory Operations Dashboard Engine),
fifth and final of the PS-284→285→286→287→288 workstation-build
sequence. Five real, high-contrast, wall-display department dashboard
views (Grossing & Intake, Embedding & Microtome, Staining & IHC,
Send-Out & Reference Laboratory, Diagnostic Sign-Out/Scanner) behind
one real route (`/facility-ops-dashboard`), bound via a real
[Display Profile](../../services/facilityOpsDashboard/README.md).

## Deliberate design choice: public, unauthenticated route

Same real reasoning as `pages/OrSuiteDashboardPage.tsx`/`App.tsx`'s own
routing comment: a Grossing/Staining/etc. bench wall display isn't a
per-user login — it binds once (`useCurrentDisplayProfile.ts`, same
real localStorage-persisted pattern as `useCurrentOrTerminal.ts`) and
must keep running without ever hitting this app's own normal session
timeout. `/facility-ops-dashboard` sits outside `ProtectedRoute`/
`AppShell` in `App.tsx`, exactly like `/or-suite-dashboard`.

**Where it's opened from:** there is no Home tile any more. The entry
point is the "Open Facility Ops Dashboard" button in Configuration →
System → Display Profiles (`DisplayProfilesSection.tsx`). The route
itself is unchanged and still public. A bench display can also simply
be pointed at `/facility-ops-dashboard`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): this said the page had a `Home.tsx` tile; the tile was removed ("Homepage Changes part 1", comment in `Home.tsx`) and the button in `DisplayProfilesSection.tsx` replaced it.*

## Files

- **`FacilityOpsDashboardPage.tsx`** — the entry point. Unbound →
  `ProfileSetup` (pick a Display Profile, mirrors
  `OrSuiteDashboardPage.tsx`'s own `TerminalSetup`). Bound → resolves
  the profile's own `assignedViews`/`facilityId`, carousels between
  views on a real timer when more than one is assigned
  (`carouselIntervalSeconds`, default 20s), and polls the current
  view's own `compute*Summary` function every 20s. Real "Offline /
  Stale Data" badge (`ps-opsdash-offline-badge`) whenever the last
  poll failed or is more than two poll intervals old — the one real
  gap `OrSuiteDashboardPage.tsx` itself still has; never a claim of
  true real-time push (see `services/facilityOpsDashboard/README.md`).
  **Real, closed gap (direct follow-up):** `ProfileSetup` now
  consults the selected profile's own `deviceToken` — a profile with
  one recorded requires it typed correctly before the bind completes
  (`confirmTokenTitle` step); a profile with none set still binds
  straight from the dropdown. Still not real hardware verification —
  see `services/facilityOpsDashboard/README.md`'s own full account of
  what this does and doesn't close. Covered by the new
  `FacilityOpsDashboardPage.test.tsx` — no render test existed for
  this page's binding step before.
- **`viewRegistry.ts`** — the one real place mapping each
  `DashboardViewId` to its own `compute*Summary` function and i18n
  title key.
- **`components/DashboardSummaryView.tsx`** — the one, shared
  presentational component every one of the five views renders
  through (stat tiles + alerts + queue rows), since every
  `compute*Summary` function returns the exact same real
  `DashboardSummary` shape.
- The real binding hook (`useCurrentDisplayProfile.ts`) lives in the
  app-wide `src/hooks/` folder, same placement as
  `useCurrentOrTerminal.ts`, since it's a general-purpose "what's this
  browser bound to" concern, not page-private state.

## i18n

Built with `useTranslation()`/`t()` from the start. `facilityOpsDashboard.*`
namespace (this page) plus `displayProfiles.*` (the admin registry,
`components/Config/System/DisplayProfilesSection.tsx`) and
`home.facilityOpsDashboardTile.*`, across all five locale files
(en/fr/de/nl/ko) — verified programmatically: identical key sets,
849 total leaf keys per file (up from 810 after PS-287). *(Those counts were taken at PS-288; the locale files have grown many times since, and the `home.facilityOpsDashboardTile.*` keys went with the Home tile — checked in the Batch 496 README audit.)*

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 560 (PS-539 phase 2d)

- `FacilityOpsDashboardPage.tsx`: re-reads when the hub says the facility's figures changed (topic `facilityOps`); "out of date" allows two minutes while live; only the latest read is shown; times in the user's language.

## Batch 727

`components/DashboardSummaryView.tsx` (+ new `.css`): labels, alert kinds and details shown in the display's language from the summaries' locale keys (they were English text from the services); the ADD-ON tag beside the STAT tag, the order type beneath, "Pinned"; accession numbers tagged `data-phi`. `viewRegistry.ts`: the sixth view, Stations; `compute` takes the profile's options, and the page passes X.

## Batch 728

- `FacilityOpsDashboardPage.tsx` passes the profile's purpose filter to the view.

## Batch 729

- `FacilityOpsDashboardPage.tsx` passes the profile's not-scanned time.
