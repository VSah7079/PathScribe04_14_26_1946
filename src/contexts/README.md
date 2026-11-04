**Batch 735:** `ScannerProvider.tsx` asks `services/scanner/scanRoutePolicy.ts` what a scanned accession opens: nothing on the station screens (they handle the scan), the grossing screen from Grossing, the report elsewhere. The PATHSCRIBE_SCAN event is always sent.

**Batch 649:** `ScannerProvider.tsx` ignores keystrokes a script sent (browser extension, autofill, the app's own shortcut code): only trusted key events feed the barcode buffer (`services/scanner/scanKeyFilter.ts`). The prop `acceptUntrustedKeyEvents` (default false, never set in the app) exists only so tests, whose events are untrusted, can drive the listener; `simulateScan()` is unaffected.

## Batch 602

`VoiceProvider`: hotkeys resolved with `pickShortcutMatch` (screen command first) and renders `<GoToPrefix />`.

# src/contexts/

App-wide React state — auth, messaging, voice, system config, scanner
input, dirty-state/navigation guards, breadcrumbs. Every file here is a
`createContext` + provider + hook triplet (`useAuth`, `useMessaging`,
etc.), consumed from many places across `pages/`/`components/`.

## Files

- **`AuthContext.tsx`**: who is signed in, for React (`useAuth()`, `roleHas`, `useIsAdmin`, `useIsSuperAdmin`). **Rewritten in Batch 343 (PS-60):**
  - **Decisions moved out.** Signing in and out now lives in `services/auth/authSession.ts`: password and SSO sign-in, the same-browser conflict check, sign-out with drafts kept on idle timeout, restore on load with the staff-field backfill. The context keeps React state only, and it's off both deployment baselines.
  - **Hard-coded accounts gone.** The eleven accounts with plain-text passwords now live in `services/auth/demo/demoAccounts.ts` as PBKDF2 hashes, left out of `VITE_AUTH_MODE=sso` builds.
  - **SSO added.** `passwordSignInEnabled`, `ssoProviders`, `beginSsoSignIn`, `completeSsoSignIn` (one completion per callback URL, since StrictMode runs the callback page's effect twice), and `resolvePendingSsoSignIn` for the conflict prompt.
  - **`User`** is now `SessionProfile` (`services/auth/sessionProfile.ts`), with the same fields plus `authMethod` and `ssoProviderId`.
  - **Earlier history** (the three-outcome login result, the supersede-vs-explicit-logout distinction, the organisationId backfill) carries over unchanged in behaviour.
- **`MessagingContext.tsx`** — unread count, urgent-flag audio alert,
  drawer open/closed (persisted to `sessionStorage`), inbox polling
  every 20s plus a reload-on-tab-visible listener. Found and fixed one
  real, small duplication: `setPortalOpen` already persists to
  `sessionStorage` synchronously on every call, but a separate
  `useEffect` also wrote the identical value on every `portalOpen`
  change — confirmed via grep that nothing else could change
  `portalOpen` without going through `setPortalOpen` first, so the
  effect was pure redundancy. Removed.

- **`ScannerProvider.tsx`** — global HID barcode/QR scanner listener,
  distinguishing scanner input from human typing by inter-keystroke
  timing. Careful, well-reasoned edge-case handling (guards against
  synthetic/extension key events, never consumes Enter when a form
  element has focus, distinguishes a slow scanner start from genuine
  human typing). One real bug found and fixed: a keydown handler had
  `if (window.location.pathname === '/' && !user) return;` intended,
  per its comment, to skip the login page — dead on two counts. The
  whole effect is already gated one level up by `if (!user) return`,
  so `!user` here was always `false` by the time this line could run;
  separately, `App.tsx`'s routing shows `/` is actually the Home page,
  not login. Removed — the outer guard already provides the real
  protection.

- **Real feature, per direct, detailed specification: "Barcode Listener
  & Form Auto-Ingestion."** A real conflict found and fixed while
  wiring it in: `handleScan()`'s own, existing auto-navigation
  (`navigate('/case/{accession}/synoptic')` on an accession-pattern
  match) fired globally, with no route awareness — including on
  `pages/AccessionPage/AccessionPage.tsx`, which now has its own,
  real, more specific handling for the exact same event (see that
  file's own README for the full feature). An accessioner scanning a
  brand-new specimen label whose payload happened to also match a
  configured accession-number pattern would have been yanked off the
  very page they were using to create the case, mid-scan. Fixed by
  suppressing the navigation specifically on `/accession` (via
  `useLocation()`, new) — the real `PATHSCRIBE_SCAN` event this file
  already dispatches on every successful scan still fires
  unconditionally either way; only the navigation side effect is
  route-gated.

- **`SystemConfigContext.tsx`** — three independently-persisted config
  layers (system/enterprise/hospital) with a documented override
  hierarchy (`isFeatureEnabled`: hospital → enterprise → false). Clean,
  well-organized. One unnecessary `(import.meta as any).env` cast
  removed — `import.meta.env.X` is read directly without casting
  elsewhere in this codebase.

- **`VoiceProvider.tsx`** (550+ lines, the largest file here) — the
  full voice command/dictation state machine: command-vs-dictate
  phase, AI-assisted refinement with a race-against-timeout fallback to
  local punctuation/capitalization, a small per-user dictation
  correction-learning store (the signed-in person's own setting, `services/userSettings/personalSettings.ts`, since Batch 430), missed-command
  shortcut-confirmation window. A lot of `useRef` mirrors of state
  (`phaseRef`, `commandPhaseRef`, `aiAvailableRef`, etc.) — a
  legitimate, standard pattern here, not a smell: they exist so the
  speech-recognition event handlers (registered once, long-lived
  closures) can read current values without stale-closure bugs, not
  duplicated state. **Real fix, later pass:** "AI refinement" was
  previously hardcoded to a literal `'gemini-2.0-flash-lite'` string,
  calling Gemini directly via its own raw fetch — completely
  disconnected from the rest of the app's AI infrastructure. Both the
  availability probe and the actual refinement call now resolve the
  real active `AIModel` (`type: 'Voice Dictation'`, see
  `services/models/README.md`) and route through the same multi-vendor
  `callAi()` the rest of the app uses — genuinely vendor-agnostic now,
  governed by the same validation-study hard-block as report models.
  Cleaned up this pass:
  - `isProcessing` and `setIsAiEnabled` were both part of the public
    `VoiceContextType` — one a hardcoded `false` literal, the other a
    literal no-op `() => {}` that silently discarded whatever caller
    passed in. Traced every consumer (`usepathscribeSpeech.ts`
    re-exports `isProcessing`; nothing downstream of that ever reads
    it — `SpeechConfigTab.tsx`, its only consumer, doesn't reference
    it at all) — confirmed genuinely dead on both ends, not just
    unused-but-reachable. Removed from the interface, the value
    object, and `usepathscribeSpeech.ts`'s re-export.
  - `window.__psRecordDictationCorrection` (a genuine global
    side-channel, not a mistake) had 3 separate `(window as any)`
    casts. Unlike `SpeechRecognition`/`webkitSpeechRecognition` a few
    lines below — which really have no TypeScript DOM lib type, and
    correctly keep their `any` here (confirmed no
    `dom-speech-recognition`-style package is installed or reachable
    in this sandbox) — this one was properly fixable: added a
    `declare global { interface Window { ... } }` block once, removed
    all 3 casts.
  - Removed a debug `console.log` that fired on every real dictation
    correction in production. Left the file's several `console.warn`
    calls alone — those report genuine failures (an AI refinement fetch
    failing, the proxy returning a bad status, a speech-recognition
    error), not debug noise.

  *Corrected in the Batch 496 README audit (Oct 9, 2026): the learned-corrections store is a per-person setting, not raw `localStorage`; the speech hook's file name is `hooks/usepathscribeSpeech.ts` (lower-case p).*

  **Real addition ("Personal Quick Text" — Enterprise then Facility
  then Staff), per direct guidance:** the real spoken-trigger
  substitution algorithm already existed (`MockVoiceMacroService.
  refineTranscript()`, `services/voicemacro/`) but had zero real call
  sites anywhere in the app, confirmed directly before wiring this —
  it was correct and complete, just never invoked from the live
  dictation pipeline. Now genuinely wired in: the algorithm was
  extracted into a pure, synchronous `applyVoiceMacroSubstitutions()`
  (`types/voiceMacros.ts`, shared by `refineTranscript()` itself so the
  two can't drift apart) and applied inside `handleDictationSegment`'s
  own real LOCAL PATH — right after punctuation/learned-corrections,
  before the AI-refinement/direct-insertion branch, so a spoken trigger
  expands the same way regardless of whether AI refinement also runs
  afterward. Filtered per-segment to exactly the real macros the
  current session user can see (`isVoiceMacroVisibleTo()`) for
  whichever real facility the current `DictationTarget` belongs to.
  `DictationTarget` gained `performingLabFacilityId?` for this —
  `OrchestratorSectionEditor.tsx`'s own `registerDictationTarget`
  passes through the case's own already-resolved performing lab, same
  value its "QT" (Personal Quick Text) button already uses. The active
  macro list is refreshed once per real dictation session
  (`startDictation`), not per spoken segment — this needed to stay
  near-instant, not add a fetch to every utterance.

- **`BreadcrumbContext.tsx`** — simple push/pop breadcrumb stack for
  the nav bar. Clean, no issues.

- **`DirtyStateContext.tsx`** / **`DirtyStateProvider.tsx`** — looked
  like a possible duplication at first glance (two similarly-named
  files), but this is a legitimate, standard split: the former defines
  just the context object, default value, and `useDirtyState` hook;
  the latter is the actual stateful provider implementation
  (`requestNavigate`/`confirmNavigate`/`cancelNavigate` — the
  "unsaved changes, are you sure you want to leave" guard used
  throughout the app). No issue.

## Real bug found and fixed separately — see `PRIORITY_FIXES.md` items #31/#32

The most significant finding from this folder wasn't in any of the
files above — it was a file that's now deleted.
`contexts/useSubspecialties.tsx` was a second, entirely disconnected
"subspecialties" data source: hardcoded, in-memory-only, 2 entries,
never persisted, with different IDs than the real, proper
`subspecialtyService` (interface/mock/real triplet, 9 entries,
actually persisted) used everywhere else in the app. The admin screen
for managing subspecialties (`SubspecialtiesSection.tsx`) was reading
and writing through this fake context — meaning any subspecialty an
admin added or edited silently vanished on refresh, with zero effect
on routing, FPPE assignments, case pooling, or anything else that
actually used the real service. Five other screens were all showing
an incomplete list as a result. Migrated all 6 consumers onto the real
service, removed the `<SubspecialtyProvider>` wrapper from `App.tsx`,
deleted the file. Full writeup in `PRIORITY_FIXES.md` item #31; the
rest of this folder's smaller findings are item #32.
*(Since then: `contexts/useSubspecialties.tsx` is present in this folder again, with the same hardcoded in-memory provider. Nothing imports it and `App.tsx` has no `<SubspecialtyProvider>`, so it is an unused leftover, not a live data source. `PRIORITY_FIXES.md` was retired on Aug 19, 2026 — see `docs/ARCHIVE.md`. Checked in the Batch 496 README audit. Batch 499: removed, and listed in the root `DELETED_FILES.txt`.)*

## Batch 328 (PS-63), reverted in Batch 329

Batch 328 added `User.staffRoles`, the staff record's role names, to the session for template approval. Batch 329 removed it again. Template rights are now read live from the staff record and the role catalog, by role id, at the moment of the action (`services/templates/templateService.ts → currentActor`). A role granted or renamed therefore takes effect without signing in again. `AuthContext.tsx` is back to its Batch 327 shape.

## React Router 7 (Batch 341, PS-344)

Every file here that used `react-router-dom` now imports the same hooks and components from `react-router` 7 (`react-router-dom` was removed from the project). Nothing else changed: the app had already opted into version 7's behaviour. See `src/i18n/README.md` → Batch 341.

## Batch 396

`MessagingContext.tsx`: the inbox is cleared as soon as the signed-in user changes (sign-out included), and a reply for an earlier account is dropped. Before, the last person's messages stayed until the next load.

## Batch 428: Configuration permissions

`SystemConfigContext.tsx`: `updateConfig` and `updateEnterpriseConfig` now resolve to whether the change was allowed. The field's capability is checked first (`services/systemConfig/systemConfigChangeChecks.ts`: voice, approved fonts, contribution settings, abnormal-result detection); a refused change isn't applied.

## Batch 430: personal settings per person; view-only fields

- `VoiceProvider.tsx`: the accent and dictation's learned corrections are the signed-in person's (`services/userSettings/personalSettings.ts`), reloaded when someone else signs in.
- `AuthContext.tsx`: `useAuthOptional()` (new) returns the context or null, for providers that may render outside `AuthProvider`.

## Batch 431

- `SystemConfigContext`: reads and saves through `services/systemConfig/systemConfigStore.ts`.
- `MessagingContext`, `VoiceProvider`: session flags (`utils/uiPreferences.ts`).

## Batch 444

Environment settings here are read by full name (`import.meta.env.VITE_X`). The previous whole-object forms made Vite copy every `VITE_` variable into the bundle (`services/security/envExposure.guard.test.ts`).

## Batch 446

Case pages are opened with `useOpenCase` (`hooks/useOpenCase.ts`), which addresses them by the case's support reference (`/case/SR-7K2Q-9MXD/synoptic`), never its accession number. See `services/caseAddresses/`.

## Batch 448

`AuthContext.login` can return `'password_change_required'`: the password was set by an administrator to be changed first, and no session has started.

## Batch 456 — Sign-in lockout, password screening, demo seeds

`AuthContext.login` can now return a `SignInRefusal` (attempts left, or locked until) from `services/auth/signInLockout.ts`.

## Batch 463

`VoiceProvider.tsx`: before the action registry, what was heard is offered to the screen (`services/voice/voiceCommandEvents.ts`) in the voice profile's language; when the screen takes it (the Mohs stage question), the status says so (`voiceProvider.status.screenCommandApplied`).

## Batch 503 (PS-474)

`MessagingContext.tsx`: the urgent-message alert sound is made in the browser (`utils/alertTone.ts`, Web Audio) instead of downloaded from `actions.google.com`, which the Content-Security-Policy blocks and which told Google whenever a user got an urgent message.

## Batch 504

- **`VoiceProvider.tsx`:** after the user changed their dictation accent, local dictation kept applying the old language's punctuation words ("comma", "Komma", "virgule"…). The segment handler didn't list the accent, and the recognizer, rebuilt on the accent change, kept the old handler.
- **`ScannerProvider.tsx`:** lists `openCasePage`, the function it actually uses; the unused `navigate` is removed.

## Batch 506 (PS-477)

`VoiceProvider` uses the shared `voiceMacroService` from `@/services` instead of building its own `MockVoiceMacroService`. The class keeps no state of its own, so nothing changes.

## Batch 511 (PS-478): full strict type-checking

`SystemConfigContext.isFeatureEnabled` reads a hospital's override for any enterprise feature, including ones the hospital type doesn't list yet. Same behaviour, now typed.

## Batch 513 (PS-269): the UI translation sweep is complete

Every visible string here now goes through `t()`, in all five languages, and `src/i18n/uiText.guard.test.ts` keeps it that way. `BreadcrumbContext`: "Home" is translated, and the Quality Assurance crumb is matched by its path instead of its English label.

## Batch 527 (PS-486): a lean first load

`AuthContext.tsx` imports what sign-in needs from `services/signIn.ts`, not the whole services barrel.

## Batch 536 (PS-558)

`VoiceProvider.tsx`: the voice refinement and its availability check pass their feature to `callAi`, for the jurisdiction's AI vendor policy.

## Batch 547

`SystemConfigContext.tsx` reads `VITE_VOICE_ENABLED` through `appEnv()` (runtime configuration).

## Batch 560 (PS-539 phase 2d)

- `MessagingContext.tsx`: the inbox re-reads when the hub says a message arrived (topic `messages`), every 20 s without a live connection. Mounted app-wide, so each signed-in window holds one hub connection while the hub is configured.

## Batch 609 (#177, #179)

`VoiceProvider` builds the AI dictation refinement instructions per language and English spelling (`services/voice/dictationRefinementPrompt.ts`; the lab's jurisdiction decides the spelling) and passes the "English fuzzy fallback" setting (`SystemConfig.voiceEnglishFuzzyFallback`) to `findActionByTrigger`.

## Batch 650 (650a)

`VoiceProvider.tsx` (657 to 646 lines): the dictation correction table, the refinement flow and the command handling moved to `services/voice/` (`dictationCorrections`, `dictationSegmentFlow`, `voiceCommandRunner`). It now sends one final insert per segment, hands the target `meta.raw`, asks for a repeat on the commands that need one, refuses commands for other screens, and audits spoken commands. `DictationTarget.onText` has a third argument `meta`. See `services/voice/README.md`.

- Batch 664: `VoiceProvider.tsx` runs Cancel (`PATHSCRIBE_VOICE_CANCEL`, and "cancel dictation" while dictating) through `services/voice/voiceCancel.ts`; `DictationTarget` has optional `uncommitted` / `discard`.

## Batch 669f

`MessagingContext`: the unread count and the urgent flag use `isUnreadFor(message, userId)`, so a person's own sent messages and replies are not counted.
