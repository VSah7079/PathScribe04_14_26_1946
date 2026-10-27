**Batch 668:** `useGuideWindow.ts` opens the User or Administrator Guide in a remembered window (`useCompanionWindow`) and falls back to a new tab when refused.

**Batch 649:** `useScreenCapture.ts` covers every `data-phi` and `data-pii` element (see `services/phiSelectors.ts`) and gives an element matching several selectors one overlay. `useHeldReports.ts` reports whether the person can recall a held report only if they also hold `report:release:recall`.

## Batch 645 — Lockbox Drop-Off

`useDefaultActionOnScan.ts` and `useGlobalMaterialScanTracking.ts` skip a scan on `/lockbox-drop-off`, where a scan means "receive this container" (one line each, beside the existing Disposal Queue exclusion). The screen's own hooks live in `pages/LockboxDropOffPage/hooks/`.

## Batch 619 (part Q) — Outbound Queue (PS-800)
- `useOutboundQueue.ts`: loads the Outbound Queue for `OutboundQueuePage` (rows, per-state, deadline and billing counts) and holds the filters, sort, selection and last action result. Which actions a state allows and how a bulk action went come from `services/outboundQueue/outboundQueueView.ts`.

## Batch 613 (part B)
- `useRelatedCaseCandidates.ts`: the related released cases the user may choose from. `useAmendedRelatedCases.ts`: attached cases amended since sign-out. Both are thin over `src/services/relatedCases/`.

## Batch 610 (part A) — autopsy dashboards, TAT chips (#60, #61, #88, #89)

New `useAutopsyDashboard.ts` (loads cases and TAT entries, holds tier, period, department, case and the Simulated switch for `AutopsyDashboardPage`) and `useTatEntries.ts` (the active TAT entries for the autopsy chip). Decisions live in `services/autopsy/dashboard/` and `services/autopsy/resolveAutopsyTatStatus.ts`.

## Batch 609 (part A)

- `useCaseReportImages.ts`: the Attach images window's state (the images linked to a report, link one, remove one).

## Batch 603

`useDisplayBinding`: the wall display's Display Token (kept in workstation settings) and a standing check, on open, every 60 s and on window focus. A display shows data only while the status is `valid`.

## Batch 602

`useGoToPrefix`: Alt+J (physical J) opens the "Go to" panel, the next key runs the always-on command with that key; Esc, Ctrl/Meta, unknown keys cancel; 3 s timeout. Capture-phase listener, never takes focus.

# src/hooks/

Reusable stateful logic used across pages/components — session
timeout, draft caching, screen capture, companion windows, voice,
audit logging, and a few smaller single-purpose hooks.

## Files

- **`useLiveIntraopUpdates.ts`** (Batch 342, PS-262): keeps an intraoperative screen current across devices.
  - **Subscribes** to live updates for a scope (OR locations, or everything), through `liveUpdateService` from `@/services`.
  - **Re-reads** through the screen's own function when a change arrives (bursts coalesced) and after every reconnection.
  - **Polls** every 15 s without a live connection, and every 60 s while live.
  - **Returns** the connection state for the badge.
  - **Used by** `OrSuiteDashboardPage` and `IntraopQueuePage`. See `services/liveUpdates/README.md`.

- **`useCaseSpellCheck.ts`** (Batch 338, PS-342): spell checking for one case, for a report screen to pass to `<SpellCheckProvider>`. It resolves the case's language and facility dictionary (`services/spellcheck/resolveCaseSpellingContext.ts`), loads the personal and facility word lists through `customDictionaryService`, keeps the Web Worker in step, and exposes add-to-dictionary, ignore-for-this-session and set-the-case's-language. Returns null until the case is known. Used by `SynopticReportPage`, `CytologyScreeningPage` and `IntraopQueuePage`; see `components/SpellCheck/README.md`.

- **`useIdleTimeout.ts`** — session inactivity warning/expiry
  countdown. Genuinely excellent: correctly handles background-tab
  `setTimeout`/`setInterval` throttling by re-deriving state against
  `Date.now()` on tab-visibility-change rather than trusting however
  many ticks a throttled timer happened to fire, and carefully avoids
  a stale-closure bug (a ref mirrors `showWarning` specifically so the
  activity listener — registered once, not on every warning-state
  toggle — always reads the current value). One unnecessary `any`
  cast removed (`caseData?.order?.clientId` — `caseRouter.getCase()`
  already returns a properly typed `Case | undefined`).

- **`useDraftCache.ts`** — debounced draft auto-save +
  restore-on-mount, backing the Inactivity Timeout & Draft Recovery
  spec. **Real, severe bug found and fixed** — per direct report,
  "timeout worked, but no restore dialog appeared on re-entry."
  Reproduced precisely: the underlying service call always succeeded
  at finding the draft, but a redundant `checkedKeyRef` guard (meant
  to prevent re-checking, already handled correctly by this effect's
  own dependency array) actively broke React 18 Strict Mode's mount →
  cleanup → re-mount cycle — this app's real root (`main.tsx`) renders
  inside `<React.StrictMode>`. The first invocation started the real
  `getDraft()` call and set the ref; Strict Mode's cleanup marked that
  same closure `cancelled`; the second, surviving invocation saw the
  ref already set and skipped calling `getDraft()` again entirely; the
  first call's promise then resolved successfully but was discarded
  because its own closure had been cancelled. The draft was being
  found and silently thrown away on every single re-entry. Fixed by
  removing the redundant guard. Verified the fix is real, not just
  compiled: reproduced the bug live with a genuinely injected draft
  first, confirmed the modal failed to appear, fixed it, confirmed the
  identical reproduction now works end-to-end (including clicking
  Restore), then proved the new regression test
  (`useDraftCache.test.ts`) actually catches this specific bug by
  temporarily reintroducing it and confirming exactly the
  Strict-Mode-rendered test case fails. `confirmRestore`/`discardDraft`
  are currently identical implementations but semantically distinct
  actions from the caller's perspective — left as two separate
  functions rather than merged, since collapsing them would cost
  future extensibility (e.g. logging restore vs. discard rates
  separately) for no real benefit today.

- **`useScreenCapture.ts`** — PHI-redacted screenshot capture for the
  Enhancement Request support-ticket modal. **Found and fixed the
  most serious issue in this whole review — see `PRIORITY_FIXES.md`
  item #34.** The `html2canvas` capture's `ignoreElements` option
  excluded the PHI redaction overlay divs themselves from the render,
  which (confirmed by reading `html2canvas`'s own clone-tree logic,
  and then confirmed *empirically* with an isolated reproduction
  rendered through the real library) meant the overlay never actually
  painted — the real PHI content underneath, a separate DOM node the
  overlay was never attached to, rendered fully visible in every
  captured screenshot. Fixed and re-verified with the same empirical
  method, not just re-compiled. One more small cleanup alongside it:
  `catch (err: any)` changed to the `unknown`-plus-cast pattern already
  established elsewhere in this codebase.

- **`useCompanionWindow.ts`** — the "keep a reference window open
  alongside the app, reuse it across clicks, remember where the user
  dragged it" hook (Clinical Links, PubMed ticker). Two `any` casts on
  `getScreenDetails()` (the Window Management API) are correctly
  left as-is — confirmed no TypeScript DOM lib type exists for this
  API, same situation as `SpeechRecognition` in `VoiceProvider.tsx`.

- **`usePreviewChannel.ts`** — **removed entirely, see
  `PRIORITY_FIXES.md` item #33.** Implemented a real, sophisticated
  cross-window live-preview system (BroadcastChannel sync,
  window-geometry persistence, popup-blocked handling) whose sender
  half had zero consumers anywhere in the app. Traced what actually
  serves the two things it was meant to do — printing
  (`SynopticReportPage.tsx`'s own working `handleOrchPrint`, a real
  server-PDF-plus-fallback mechanism) and live-updating preview while
  editing (`SynopticReportPage.tsx`'s inline `ReportPreviewRenderer`,
  updating automatically via ordinary React re-rendering, no
  cross-window messaging needed) — confirmed with Pete this was
  superseded, dead architecture, and removed along with
  `ReportPreviewPage.tsx`, the `/report-preview/:caseId` route, and a
  dormant event listener that could never fire once the only thing
  that dispatched its event was gone.
  **Since restored:** `usePreviewChannel.ts` is back in this folder
  (Batch 431 entry below) with two exports. `usePreviewReceiver` is used
  by `pages/ReportPreview/ReportPreviewPage.tsx`, whose
  `/report-preview/:caseId` route was added back to `App.tsx` in Batch
  495. `usePreviewSender` (which opens that window) is not called from
  any page or component today, so nothing in the app opens the preview
  window.

- **`usepathscribeSpeech.ts`** — thin, intentionally-narrow wrapper
  over `VoiceProvider`'s full context (see
  `contexts/VoiceProvider.tsx`). Documents itself as "the primary hook
  for all voice interactions across the app," but only 1 of 12 actual
  voice-consuming files uses it (`components/Voice/SpeechConfigTab.tsx`)
  — the other 11, including
  `OrchestratorSectionEditor.tsx` (exactly where the wrapper's own
  usage example says dictation happens), call `useVoice()` directly
  instead. Not a bug — both paths correctly read the same underlying
  context — but a real, confirmed drift between documented and actual
  usage. Flagged rather than force-migrated, since some of those 11
  files clearly need fields the narrower wrapper doesn't expose
  (`accent`, `voiceEnabled`, `aiAvailable`). Removed its `isProcessing`
  re-export as part of `VoiceProvider.tsx`'s own dead-code cleanup
  (see `contexts/README.md`).

- **`useSynopticAudit.ts`** — wraps `logEvent()` +
  `sendSynopticNotification()` for synoptic template audit events. The
  hook itself was clean (one unnecessary `any` cast removed — the
  notification service already accepts `SynopticAuditEvent` directly).
  Its only real consumer, `TemplateRenderer.tsx`, had a more
  significant issue: **every real field-edit audit call
  (`set_single_answer`, `set_text_answer`, both multi-answer variants,
  and the lifecycle-transition notification) omitted `user` entirely**,
  meaning every one of them fell through to this hook's hardcoded
  `DEFAULT_USER = 'Dr. Reviewer'` fallback — real edits by real
  pathologists were being logged under a fake placeholder name in a
  compliance-relevant audit trail. `TemplateRenderer.tsx` already had
  the real user resolved and available (`currentUser`, derived from
  `useAuth()`, already correctly used two lines below for a *different*
  call) — just never threaded through to these specific calls. Fixed
  by passing `user: currentUser` to all four. Found and removed 9
  more unnecessary `any` casts in the same file while there (every
  action-string literal genuinely matches the real
  `SynopticAuditAction` union — confirmed by reading the full type,
  not assumed), and one inconsistent duplicate fallback string
  (`user?.name ?? 'Dr. Reviewer'` re-derived inline a few lines below
  the already-correct `currentUser` variable) consolidated to reuse
  the existing one.

- **`useTerminologyAlerts.ts`** — debounced SNOMED/ICD
  deprecated-code scanning for the synoptic template editor. Clean.

- **`useSessionSupersedeDetection.ts`** — detects same-user login from
  another tab via the native `storage` event (which the browser
  correctly never fires in the tab that made the write, avoiding any
  self-triggered false positive). Small, clean, correct.

- **`useFocusTrap.ts`** — WCAG 2.1 SC 2.1.2 keyboard focus trap for
  modals. The hook itself is correct and clean. Worth flagging: only
  one component in the entire app (`FlagConfigPage.tsx`) actually uses
  it, despite dozens of modals existing across the codebase. Not
  confirmed as a gap — verifying that would mean auditing every modal
  individually, out of scope for this pass — but worth a dedicated
  look given the WCAG relevance.

- **`useLogout.ts`**, **`useLatestResearch.ts`** — small, clean,
  properly adopted (3 and 1 consumers respectively — `AppShell.tsx`,
  `WorklistPage.tsx`, `SynopticReportPage.tsx`; `PubMedTicker.tsx` — no
  bypasses found).

- **`useCurrentOrTerminal.ts`** — binds this browser to one OR
  location (stored per device, same pattern as
  `useCurrentScanStation.ts`) so a wall-mounted intraoperative display
  reconnects to the same OR after a reload. Used by
  `OrSuiteDashboardPage.tsx`.

- **`useCurrentDisplayProfile.ts`** (PS-288) — the same per-device
  binding for a wall-mounted Facility Ops Dashboard display. Used by
  `FacilityOpsDashboardPage.tsx`.

- **`useEnabledIdentifierFormats.ts`** — the identifier formats enabled
  across all enterprises (falls back to `IDENTIFIER_FORMAT_LIBRARY` when
  none are configured), for consumers with no single facility context:
  `ScannerProvider`, `CaseSearchBar`, `SearchPage`, and the facility
  dictionary's identifier formats tab.

*Corrected in the Batch 496 README audit (Oct 9, 2026): `usePreviewChannel.ts` is back (receiver used, sender unused); voice-consumer counts now 1 of 12; `useLogout` has 3 consumers, not 5; added four hooks missing from this list (`useCurrentOrTerminal`, `useCurrentDisplayProfile`, `useEnabledIdentifierFormats`, and `useDefaultActionOnScan` below).*

## Scan station & material scanning (Aug 2026)

- **`useCurrentScanStation.ts`** — real, per-device/per-browser
  station setting (`localStorage`, deliberately not part of any Case
  or user record) — the real, physical terminal at "Grossing Station
  3" stays configured as that station regardless of which tech logs
  in and works there during a given shift; a tech switching benches
  switches this setting, not their own profile. Real bug found and
  fixed while live-verifying the scan pipeline end to end.
- **`useEffectiveScanStation.ts`** — a real, separate, higher-level
  hook implementing the fallback chain during session initialization
  (device storage → user profile default → none), deliberately kept
  separate from `useCurrentScanStation.ts` so that hook's own
  `stationId` stays exactly what it already is: the real, explicit,
  device-persisted value set only by a genuine user action.
- **`useGlobalMaterialScanTracking.ts`** — real fix, per direct
  follow-up: "the tracking event should occur no matter what page
  you're on in PathScribe." The original `useMaterialScanTracking.ts`
  (`SynopticReportPage/hooks/`) only listened while a specific case's
  own Synoptic page was mounted — a tech scanning a cassette from the
  Worklist, Search, or any other page was silently ignored, even
  though `ScannerProvider`'s own `PATHSCRIBE_SCAN` event is already
  genuinely global (window-level, mounted once at the app root).
  *(The page-scoped `useMaterialScanTracking.ts` no longer exists;
  `useGlobalMaterialScanTracking.ts` is mounted app-wide through
  `components/MaterialScanTrackingBridge.tsx` in `App.tsx`. Checked in
  the Batch 496 README audit.)*
- **`useDefaultActionOnScan.ts`** (PS-289) — fires the scan station's
  default action (e.g. "Log Slide/Block" at a microtomy desk) on the
  next scan, with no click. Same global `PATHSCRIBE_SCAN` listener and
  `STATION:` guard as the hooks above; skips the Disposal Queue route.
  Mounted app-wide through `components/DefaultActionOnScanBridge.tsx`.
  Tested in `__tests__/useDefaultActionOnScan.test.ts`.
- **`useGlobalStationSwitch.ts`** — real feature: "MVP Station-Switching
  via Barcode Label" — detects the `STATION:` prefix from the scanner
  input stream and triggers a station switch, even mid-dictation or
  mid-grossing. A real, separate listener from
  `useGlobalMaterialScanTracking.ts` — deliberately two independent
  listeners on the same real, global `PATHSCRIBE_SCAN` event rather
  than one listener trying to disambiguate both concerns. Has its own
  dedicated test file, `__tests__/useGlobalStationSwitch.test.ts` —
  safety-critical guardrail logic (never switches station mid-write).

## Foot pedal & audio (Aug 2026)

- **`useFootPedal.ts`** — real feature: "Foot pedal support
  specifically (the one part confirmed to not exist at all)." Detects
  both real HID/Gamepad-class pedals (via the Gamepad API's
  animation-frame poll loop — it has no "button pressed" event, so
  polling is the standard, only way to read live button state) and
  keyboard-emulating pedals (a common, simpler approach many pedal
  vendors use instead of true HID). Bindings are captured live from
  whatever hardware is actually connected — never a hardcoded guess
  at a specific pedal model's button index or keycode. Originally
  wired only into `SynopticReportPage.tsx`'s dictation controls.
  **Real fix (Sep 2026):** the same hook is now also called from
  `MicrotomyWorkstationPage.tsx` (Pedal 2 → Print/Etch Next) and
  `EmbeddingStationPage.tsx` (Pedal 1 → piece-count confirmation) —
  both pages had previously (incorrectly) disclaimed foot-pedal
  support as unreachable from a browser; each call site passes only
  the `actions` it actually uses, since a physical pedal is bound
  once per workstation, not per page. See
  `types/footPedal/README.md` for the full per-page action mapping.
- **`useAudioSegmentRecorder.ts`** — real feature, Foot Pedal 3
  ("Pause Audio / Replay Last Segment"). The existing dictation system
  (`VoiceProvider`, via the Web Speech API's `SpeechRecognition`) only
  ever returns transcribed text — never the raw audio — so "replay"
  had no real audio to replay from anywhere in this codebase before
  this. Deliberately a self-contained `MediaRecorder`-based recorder,
  kept independent from `VoiceProvider`'s own `SpeechRecognition`
  internals rather than deeply interleaved with them — lower risk than
  modifying that existing, working system.

## Cassette Engine integration (Aug 2026)

- **`usePendingEngineNotifications.ts`: removed in Batch 549** (finding F1 of the readiness review, open since Batch 537). It polled Firestore for the engine's notifications, but no page ever mounted it. The webhooks still write the notification record; the browser will hear about engine events through the hub's case event (phase 2d/2e). `services/hl7/notifyBlockExceptionApplied.ts` and `notifyMaterialLocationApplied.ts` stay, for that handler.

*Corrected in the Batch 496 README audit (Oct 9, 2026): this hook is not called anywhere, and its Firestore source is legacy.*

## Real findings this pass, ranked by severity

1. **Draft recovery completely non-functional** (`useDraftCache.ts`) —
   confirmed and fixed. See `PRIORITY_FIXES.md` item #109. A React 18
   Strict Mode interaction silently discarded every found draft before
   it ever reached the UI — the entire Inactivity Timeout & Draft
   Recovery feature's core promise (don't lose a pathologist's unsaved
   work on session timeout) never actually worked. See this file's own
   entry above for the full mechanism.
2. **PHI redaction silently non-functional** (`useScreenCapture.ts`) —
   confirmed and fixed. See `PRIORITY_FIXES.md` item #34.
3. **Audit trail attributing real edits to a fake user**
   (`TemplateRenderer.tsx`, via `useSynopticAudit.ts`) — confirmed and
   fixed. See `PRIORITY_FIXES.md` item #32 (folded in alongside the
   contexts/ review since it was found while auditing that hook).
4. **Disconnected dead feature removed** (`usePreviewChannel.ts`) —
   confirmed with Pete and removed. See `PRIORITY_FIXES.md` item #33.
5. **Documented-vs-actual API drift**
   (`usepathscribeSpeech.ts`/`useVoice()`) — flagged, not fixed, not a
   bug.
6. **Possible focus-trap coverage gap** (`useFocusTrap.ts`) — flagged,
   not verified further, out of scope for this pass.

*(`PRIORITY_FIXES.md` has since been retired (Aug 19, 2026); its open items became Jira PS-57 to PS-71 — see `docs/ARCHIVE.md`.)* *(Since this list: `usePreviewChannel.ts` (item 4) was restored — see its entry above. `useFocusTrap` is still used only by `FlagConfigPage.tsx`. Checked in the Batch 496 README audit.)*

## React Router 7 (Batch 341, PS-344)

Every file here that used `react-router-dom` now imports the same hooks and components from `react-router` 7 (`react-router-dom` was removed from the project). Nothing else changed: the app had already opted into version 7's behaviour. See `src/i18n/README.md` → Batch 341.

## useSignerConfirmation (Batch 344, PS-60 follow-up)

**`useSignerConfirmation(action, caseRef)`** holds a signing screen's confirmation state: username, password, error and busy. It calls `signerConfirmation` from `@/services`, which makes every decision:
- which method applies;
- the two-component rule;
- the lockout;
- the SSO popup.

**`confirm()`** must be called straight from the click: for an SSO session it opens the identity provider's popup, which browsers only allow during the click. It resolves with the `SignatureConfirmation`, or null with a translated `error`. **`confirmBiometric()`** is the demo-only simulated biometric.

## useCapabilities (Batch 369, PS-355)

`useCapabilities()` returns `{ loading, has(capability) }` for the signed-in user, from `authorizationService.grantedCapabilities()`. It is deny-until-known: `has()` is false while loading. It is presentation only; the action's service enforces.

## Batch 370 (PS-356)

`useCapabilities()` now returns `{ loading, has(capability, context?), decide(capability, context?) }`. It evaluates against `authorizationService.snapshot()` with the pure `evaluateCapability`, so facility scope is reflected on screen.

## Batch 380 (PS-359)

`useFieldRequirements(page)`: a page's (or modal's) Field Requirements for the signed-in user's organisation. It starts from the page's defaults, so nothing is looser than the default while the settings load. The decisions stay in `services/fieldRequirements/`.

## Batch 395

`useFillViewportHeight` keeps a panel reaching the bottom of the window. It re-measures on resize and whenever anything above it changes size (a `ResizeObserver` on the page body), on the next animation frame. The number comes from `utils/fillViewportHeight.ts`. Used by the Search result table. (Batch 395 also used it for the Worklist, and said it fixed the empty space there. It didn't: the Worklist page is exactly window-height, so its body never changes size, the observer never fires, and the height could stay at its 400 px start. Batch 416 replaced it on the Worklist with CSS flex layout. A panel on a fixed-height page should fill with `flex: 1; min-height: 0` rather than this hook.)

## Batch 396

- `useSurgicalQaReview.ts`: surgical post-sign-out QA items, for the queue or one case, with record and dismiss.
- `useCytologyQcActions.ts`: take a cytology QC review and record its verdict (queue and case screen); `useCytologyQcCaseReview` for one case.
- `useReviewQueueCounts.ts`: the counts on the Worklist's two review-queue tiles.

## useRegistryGoLive (Batch 423)

`useRegistryGoLive(domain, registryId, user)` provides the go-live panel's state:
- the view;
- the evidence fields and live pre-check preview;
- the approver's capacities;
- the credential prompt's open state;
- `request`, `approve(confirmation)`, `withdraw`, `toTest` and `saveGovernance`.

Every decision is in `services/registryGoLive/`.

## useRegistryGoLive (Batch 424)

The hook now covers both instances:
- **Validation instance:** `recordAgreement`, `runSuite`, `exportValidation`.
- **Production instance:** `importValidation(text)`, `request`, `approve`, `withdraw`, `stopLive` (this replaces `toTest`).
- **Both:** `addRule`, `removeRule`, `confirmLocalChanges`, `saveGovernance`.

## Batch 425

- `useRegistryExceptionCount`: the live registry exception count for the nav and tile badges. It reads on mount, every minute and on window focus, scoped to the user's organisation, and returns null without `screen:registry-exceptions:open`. A SignalR push replaces the minute poll when the API server has it (PS-345).
- `usePatientRegistryDetailsEditor`: loads and saves a case's patient identifiers and opt-outs after accessioning.

## Batch 431

- `usePersonalLanguage.ts` (new): applies and saves the signed-in person's language.
- `usePreviewChannel.ts`: window position as a display preference; pop-up flag as a session flag.

## Batch 432

`useCytologyQcActions`: `escalate` and `bypass`. `useCaseSpellCheck`: `canManageFacility` from the capability.

## Batch 434

`useCytologyQcActions.ts` → `useCytologyQcCaseReview`: the review bar's buttons follow `cytology:qc-review:record`.

## Batch 435

`useLiveWsiScanBatches.ts`: re-reads the Slide scanning page when a scan batch changes. It also re-reads after a reconnection, and polls every 15 s offline and every 60 s live. It returns the state for `LiveStatusBadge`.

## Batch 437 (PS-128)

- `useConfigEditTracking.ts`: notices edits in Configuration's editor dialogs (any dialog fixed on screen, or marked as a dialog) and forgets a dialog once it closes.
- `useGuardedNavigate.ts`: navigation through the app-wide unsaved-changes guard, for header controls.

## Batch 438

`useConfigEditTracking.ts` takes a third argument, `onOutsideClose(dialog, replay)`. A backdrop click or Escape on a dialog with edits is held and handed to the page; "Discard changes" replays it, so the dialog closes exactly as it would have. Escape with focus outside every dialog goes to the newest open dialog with edits (some dialogs listen for Escape on the whole window). Edits are now noticed after React has handled them (Batch 437 lost the first keystroke).

## Batch 445

`useGlobalMaterialScanTracking.ts`: the grossing-hydration scan event sends `resolvedCassettes` as a number. The report page words the toast in the user's language; it used to receive an English "(N cassettes resolved)".

## Batch 446

- `useOpenCase.ts`: `openCase(caseId, view?, options?)` opens a case page at its reference address. `useOpenCaseGuarded` does the same through the unsaved-changes guard, for the header search.
- `useRouteCaseId.ts`: the case a case page's address names. A reference resolves to its case; an unknown one shows the neutral "case unavailable" screen; an old accession address is replaced with the reference.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

`useGlobalMaterialScanTracking` marks only the engraved slides, by id, on the newest case. `useSurgicalQaReview` forwards the version.

## Batch 460

- **`useCaseBillingReview.ts`** (new, with tests): the billing panel's changes for screens other than the report page. For each change it checks the permission, asks for the post-sign-out reason, saves through the screen's own writer, then charges or credits through `services/billing`. A refused or failed save changes and charges nothing.
- **`useGlobalMaterialScanTracking.ts`:** slide ids from the printed level (`material/slideLevels.ts`).

## Batch 461

`useOrganMapConfig.ts`: Configuration → Organ maps. Loads the colour layers, bindings, facilities and templates; saves through `services/organMapping/organMapConfig.ts` (checked, validated, audited).

## Batch 465

`useOrganMapConfig.ts`: saving a facility's colour layer passes the facility's jurisdiction, so its thresholds are validated with what it inherits.

## Batch 465b

- `useOrganMapConfig.ts`: passes every facility's jurisdiction, so a save can report conflicts.
- `useGlobalStationSwitch.ts`: its messages are translated (`stationSwitch.*`). "Not saved" no longer claims a newer version exists, since a check can also stop the save. It uses the services barrel and is off the deployment baseline.

## Batch 489

`useTumorBoardWorkspace.ts`: orchestrates `tumorBoardService`/`caseService`/`userService` for `TumorBoardWorkspacePage.tsx` — loads listings with the resolved filter, resolves each listing's patient display name, loads eligible presenters, and saves status/presenter/meeting-date changes. Sticky filter state via `utils/uiPreferences.ts`. No decision logic of its own beyond orchestration; filtering/sorting live in `services/tumorBoard/tumorBoardWorkspaceFilters.ts`.

## Batch 491 — new useMarginExceptionReview.ts; dismissListing on useTumorBoardWorkspace.ts (PS-359 follow-up)

`useTumorBoardWorkspace.ts` gains `dismissListing(id, reason, byUserId, byUserName)`, calling `tumorBoardService.dismiss()` and reloading — kept separate from the existing `updateListing` (`case:tumor-board:dismiss`, never `case:tumor-board:manage`).

New **`useMarginExceptionReview.ts`**: orchestrates `marginExtractionService`/`caseService` for `MarginExceptionReviewPage.tsx` — loads every `Pending` exception, resolves each one's case accession/patient display name, and exposes `resolve`/`dismiss` (reloading after either). No decision logic of its own beyond orchestration; the extraction/exception rules live in `services/marginExtraction/`.

## Batch 493 — Residents as presenters; meeting time passed through (PS-359 follow-up)

`useTumorBoardWorkspace.ts`:
- Presenter list now filters to `pathologist | fellow | resident` (was pathologist/fellow only) — Pete confirmed residents genuinely present at Tumor Board too; PA stays excluded.
- `updateListing` now passes the facility `timezone` through to `tumorBoardService.update()`, which uses it to decide whether a presenter/date/time change is still in the future (and so whether to fire the new assignment notification — see `services/tumorBoard/README.md`'s own Batch 493 entry). No decision logic added here; the notification decision itself is a pure function in the service layer.

## Batch 494 — self-service claiming; the batch-lock cut-off (PS-359 follow-up — MDT Self-Service Assignment & Batching redesign)

`useTumorBoardWorkspace.ts`:
- New `claimListing(id, byUserId, byUserName)` — a thin convenience over the existing `updateListing`, setting the acting (claiming) user as their own presenter. Goes through the exact same `case:tumor-board:schedule`, batch-lock, and presenter-eligibility checks as any other presenter change (`mockTumorBoardService.ts`'s own `update()`); no decision logic added here.
- New `cutoffHours` in the returned state — fetched once on mount from `tumorBoardBatchSettingsService.get()` (defaulting to `DEFAULT_TUMOR_BOARD_BATCH_SETTINGS.cutoffHours` until that resolves), passed straight through to `TumorBoardWorkspacePage.tsx`'s own `groupTumorBoardRowsBySession()` call so each rendered session can show its real locked/open state.
- The presenter-list filter now calls the shared `isPresenterEligibleRoles()` (`services/tumorBoard/tumorBoardPresenterEligibility.ts`) instead of an inline role check, so this filter and the service's own new server-side enforcement can't drift apart.

## Batch 495

**`useReportRevisionStatus.ts`** (new): loads a case's amendment records (`amendmentService`) and returns `resolveReportRevisionStatus()` for the printed report's revision header. Re-fetches when the case id, record version or `finalizedAt` changes. Used by `SynopticReportPage.tsx`, `ReportPreviewPage.tsx` and `CopilotReportViewModal.tsx`.

## Batch 497

`usePreviewChannel.ts` is deleted again, this time with its page. It had been removed once before (Pete confirmed the cross-window preview was superseded); the file came back because a zip can't express a deletion, and its sender never had a caller. The route and `pages/ReportPreview/ReportPreviewPage.tsx` are gone too — see `pages/ReportPreview/README.md`. Listed in `DELETED_FILES.txt` for removal by hand.

## Batch 505 (PS-475): `useGuideAssets`

**Removed in Batch 669c.** `useGuideAssets` and the embedded guide PDFs it loaded are gone; the guides open from the top-bar Help buttons (`useGuideWindow`).

## Batch 506 (PS-477)

- The workstation hooks (`useCurrentScanStation`, `useCurrentOrTerminal`, `useCurrentDisplayProfile`, `useFootPedal`, `useCompanionWindow`) keep their settings through `utils/workstationSettings.ts`. The keys are unchanged, so saved settings carry over.
- `usePendingEngineNotifications` reads through `services/engravers/fetchNewEngineNotifications.ts` and no longer imports Firebase. It is still not mounted anywhere.
- `useDefaultActionOnScan`, `useDraftCache`, `useEnabledIdentifierFormats`, `useGlobalMaterialScanTracking` and `useIdleTimeout` import their services from `@/services`.

## Batch 511 (PS-478): full strict type-checking

`useCompanionWindow` checks both the left and top positions before centring a window. `usePendingEngineNotifications` narrows the case id for its poll. No behaviour change.

## Batch 514 (PS-269)

`useTumorBoardWorkspace` and `useMarginExceptionReview` return `patientName` (the name fields) instead of a formatted `patientDisplayName`; the page formats it in the screen's language.

## Batch 521

`useDeliveryBackgroundWork.ts` (new): starts the delivery retries and fax transmission reports while someone is signed in (PS-281).

## Batch 522

`useConsultLinkToken.ts` (new): reads an outside consult link's token from after `#` (or the old path form), removes it from the address bar, and sets `no-referrer` while the page is open (PS-290).

## Batch 530 (PS-554)

`useMismatchSecondaryReview.ts`: the deferred clinical mismatches awaiting secondary review. `useReviewQueueCounts.ts` counts them on the Surgical QA tile.

## Batch 531

`useClinicalMismatchCheck.ts`: the background mismatch check (two seconds after the text stops changing, again on change), shared by the report page (`useClinicalMismatchAlert`) and the Cytology Workspace.

## Batch 534

- `useReleaseBackgroundWork.ts` (new): while PathScribe is open, it sends held reports when their release delay ends, from any screen. It is mounted by the app shell.
- `useHeldReports.ts` (new): a case's held reports, refreshed every 5 seconds, and Recall.

## Batch 544

- `useQaCaseScope.ts` (new): the scope a QA report is filtered and exported by.
  - Someone assigned to one facility opens on it.
  - It loads the cases rows are placed by, and audits a cross-tenant read.
  - It returns `filter`, `facilityIds`, `filename` and the export's capability `context`.
  - The decisions are in `services/qualityAssurance/qaScopeRows.ts`.

## Batch 548

- `useLoadingPhase.ts` (new): how long the component has been waiting, as hidden, skeleton or slow.
- `useConnectionBanner.ts` (new): what the connection banner shows, from the browser's network and the live-updates hub.

The rules for both are in `services/connectivity/latencyStates.ts`.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `useConnectionBanner.ts`: on the browser's `online` event, calls `liveUpdateService.retryNow()` before re-evaluating.
- `usePendingEngineNotifications.ts` removed (readiness review F1, open since Batch 537): no page mounted it.

## Batch 550 (PS-539 phase 2d: exports through the server)

- `useMyExports.ts` (new): the My exports list (latest read only), Download and Cancel through the export service; `useReadyExportCount` for the top bar's badge.

## Batch 551 (PS-539 phase 2d: the Server jobs view)

- `useServerJobs.ts` (new): the Server jobs view's data: health, recurring jobs and dead letters (latest read only; the kind filter clears the list while it reads), and Requeue, whose outcome is kept for the message above the list.

## Batch 552 (PS-539 phase 2d: site agent screens)

- `useSiteAgents.ts` (new): the Site agents section for one site (answers for another site, after a switch, are dropped; a revoke keeps unsaved edits; the agents refresh every minute); `useSiteAgentCounts` for the Print Queue line.

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

- `useAgentPrinters.ts` (Batch 553, new): a site's report printers for the screen asking; an answer for a site no longer chosen is dropped. `useSiteAgents.ts`: coded revoke reasons, the update window (both blank is none), channel suggestions.

## Batch 554 (PS-539 phase 2d: interface monitoring)

- `useInterfaceEngines.ts` (Batch 554, new): the engines' status, read every minute with the API server (not while the browser tab is hidden), latest read only; a refusal clears what was shown.

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: `useDeliveryBackgroundWork` and `useReleaseBackgroundWork` don't start once the server runs `delivery.retrySweep` / `release.dueSweep`.

## Batch 560 (PS-539 phase 2d: push instead of polling)

- `useLiveData.ts` (new): a screen re-reads when the live-update hub says its topic changed, with a safety poll; only SSO sessions subscribe. Imports the transport module directly (as `useConnectionBanner.ts` does), so tests that replace `@/services` keep working. Test: `useLiveData.test.tsx`.
- Switched to it: `useRegistryExceptionCount.ts`, `useHeldReports.ts` (also drops answers for another case), `useSiteAgents.ts` (per site; `useSiteAgentCounts` keeps its minute poll), `useInterfaceEngines.ts`.

## Batch 561 (PS-539 phase 2d)

- `useLiveData.ts`: the timed read is due an interval after the last read (not restarted when the connection flaps); a running read counts as the timed one; event reads keep a second after a timed read. New tests: `useHeldReports.test.tsx`, `useRegistryExceptionCount.test.tsx`.

## Batch 562 (PS-539 phase 2d)

- `useLiveData.ts`: `dataKeys` (several keys) and `pollMs: null` (events only). `useSiteAgents.ts` `useSiteAgentCounts`: live for every site it counts.

## Batch 563 (PS-622)

- `useLoadingPhase.ts`: an optional `startedAt` (the page loader's shared clock).

## Batch 570 (WCAG 2.1 AA, 2.4.3)

- `useFocusAfterRemoval.ts` (new): after an item's own Delete (or Restore), pressed from the keyboard or a screen reader, removes it from a list, focus goes to the nearest item still there, or a fallback, never to the page. A mouse click leaves focus alone; focus is moved only from the page or the pressed button; a removal that never happens is forgotten. Used by the inbox and the saved-search chips. Tests: `useFocusAfterRemoval.test.tsx`.

## Batch 572 (PS-539)

- `useCaseUpdateNotice.ts` (new): an open case report hears that someone else saved the case: the hub's `caseReport` topic (keyed by the support reference; events only) or, in the demo, another tab. Returns the newer version to show, or null; the page's own saves show nothing. Rules: `services/cases/caseUpdateNotice.ts`.

## Batch 573 (PS-539)

- `useCasePresence.ts` (new): who else has the open case report open, and whether they are editing; tells others whether this page has unsaved changes. Hub only for a signed-in (SSO) session; other windows in the demo. One message for screen readers per change, none for the first list or a dropped connection.

## Batch 575

- `useCaseUpdateNotice.ts`: `dismiss(throughVersion)`, so a version the page has taken up never shows the notice again.

## Batch 583

- `useConfigEditTracking.ts`: `dismissConfigDialog` — after Discard replays the held click or Escape, a dialog still open is closed through its own Cancel/Close control (`services/configDirty/configDirtyRegistry.ts`).
- `useCaseBillingReview.ts`: specimen-level add / remove / apply-block on a signed-out case ask for the post-sign-out reason first (`services/billing/postSignoutBillingReason.ts`).

## Batch 605

Batch 605: `useAutoBlockOrderDispatch` hands newly created blocks to the simulated engine with a toast; `useSimulatedAssistSchedule`.

## Batch 608

- `useCytologyQcActions.ts`: `useMyQcReviewerRoles` (the signed-in person's reviewer pools) feeds the queue and the case bar.

## Batch 612

- `useWorkstationRegistry.ts`: state and actions for the Workstations screen (load, register or change, rotate, revoke, Simulated test, "Use this computer"). A new token is held in memory only until the person presses Done.

## Batch 642

`useSignerConfirmation(action, caseRef, orderingFacilityId?)` resolves the case's performing facility, applies its sign-out policy (`sessionValid`, `buttonLabel(base)`, `buttonTitle`) and passes the facility to the confirmation, so the audit names it.

## Batch 652 (defect fixes)

`useGlobalMaterialScanTracking.ts`: `processMicrotomyScan` takes the scanned station and produces labels through `dispatchScanSlideLabel` (print and/or engrave); unproduced slides stay Pending Cut. Test: `useGlobalMaterialScanTracking.test.ts`.

`useViewerResourceLinks` (Batch 659): the admin-managed Quick Links for Search and Audit Log.

- Batch 669d: the top-bar Help buttons now appear on Configuration (the page publishes its open tab and section through `services/help/helpAnchorStore.ts`, `hooks/usePublishHelpAnchor.ts`), the ? shows on every screen, and the Administrator Guide re-scrolls to the section as screenshots load (`scripts/admin-guide/guide.js`).

## Batch 669 — useMarginExceptionReview

Now also returns `decidedRows` (resolved and dismissed items, read-only history) and `notices` (the inline messages after a decision). Resolve and Dismiss go through `services/marginExtraction/reviewMarginException.ts`, which audits and re-runs the tumor board margin rules.

`useWorkstationSave` (Batch 669): the screen side of `services/workstationSave/runCaseAction.ts` for the Embedding, Slide Distribution and Add-On Order stations: runs a save through the real case services (retry on a conflict) and keeps the translated "Not saved" message (`saveError`). Test: via `pages/*/hooks/use*Station.test.tsx`.

## Batch 669f

`useCytologyQcCodeCategories`: the active cytology categories for the QC Record Discrepancy window's divergence check.

## `useSystemStatus.ts` (Batch 669h)

The Home footer's system status: one check when the page loads and one when the tab becomes visible after five minutes; no timer. A failed check is `statusUnavailable`. Rules in `services/healthStatus`.
