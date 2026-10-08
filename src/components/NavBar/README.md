# components/NavBar/

## Files

- **`NavBar.tsx`** (360 lines) — Top nav bar: search, voice controls,
  enhancement request button, external reference links (CAP/WHO/
  PathologyOutlines), messaging. Real, correctly wired to
  `AuthContext`/`MessagingContext`. No issues.
- **`NavBarScanStation.tsx`** — real fix, per direct follow-up: station
  identification moved out of any specific case entirely
  (`ScanStationPrompt.tsx` handles the real, one-time "identified at
  login" moment) — this is the always-visible, global place a tech can
  check or change it afterward, from anywhere in the app. Also resolves
  the effective station's own `WorkstationGroup` (PS-289) on every
  change, pushing its `functionalArea`/default action group into the
  Action Registry automatically. **Real fix (Sep 2026):** the one piece
  PS-289's own addendum named and never delivered — a real "🔬 Go to
  Bench" button now appears here whenever that group has a real
  `dedicatedPageRoute` set (and the group is Active), deep-linking
  straight to `/workstations/microtomy`, `/workstations/embedding`, or
  `/workstations/slide-distribution` in one click. No route set (the
  honest default — groups seed empty) means no button, never a
  disabled placeholder.

## Batch 362

`LanguageSwitcher.tsx` offers Belgian Dutch: the menu reads "Nederlands (Nederland)" and "Nederlands (België)", and the button shows NL-BE.

## Batch 365 (PS-347)

`LanguageSwitcher.tsx` offers Belgian French: the menu reads "Français (France)" and "Français (Belgique)", and the button shows FR-BE.

## Batch 425

A registry exceptions button with the live count (`useRegistryExceptionCount`). It sits next to Messages, appears only for people who can open the worklist and only when something needs attention, and opens Registry Exceptions.

## Batch 431

The language choice is saved to the signed-in person (`hooks/usePersonalLanguage.ts`).

## Batch 437 (PS-128)

The nav bar's own buttons (Intraop Queue, Registry Exceptions, the scan-station bench) go through the unsaved-changes guard (`hooks/useGuardedNavigate.ts`), like the logo.

## Batch 438

The support report's "Generated:" line says UTC. Open, not changed here: `NavBar.tsx` calls the AI provider straight from the browser with `VITE_AI_API_KEY`, which puts the key in the browser bundle; it belongs behind the API server. **Fixed in Batch 444** (below).

## Batch 444

System Info's AI status now comes from `checkAiProxyStatus()` (`@/services`), which asks the proxy routes; the browser sends no key. "API mode" always reads Proxy. The Gemini row shows Checking… until the answer arrives.

Found while doing this: nothing in the app currently opens System Info (`setSysInfoOpen(true)` is never called), so the old vendor call never actually ran. The exposure was the `VITE_AI_API_KEY` reference itself, which compiled the key into the bundle whenever it was set.

## Batch 447

The QA feedback button shows when `feedbackSettingsService.qaButtonShown()` says so: Configuration → System → Feedback, by default shown on a validation instance.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*

## Batch 374

- The quick case search shows only to people who may open Search (`screen:search:open`).
- The credentials under the user's name are theirs, from their staff record. It said "MD, FCAP" for everyone.
