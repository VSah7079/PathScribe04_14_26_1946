# PathScribe Station Screens: Touch Specification

Version 1, 2026-10-30. Owner: Peter Nimmo. Companion to the Laboratory Workflow & Batch Management Specification (kept separate on purpose). Baseline source: "PathScribe station screens: touch audit", 2026-10-30.

## 1. Purpose and scope

Every interactive laboratory station screen must work with a finger, including a gloved finger, on a bench tablet.

**In scope:** Grossing, Embedding, Microtome, Slide Distribution, Add-On Order Builder, Batch Management (hub and batch detail), the station picker, and the shared app header, breadcrumb and windows (modals) on those screens.
**Out of scope for now:** read-only wall displays (nothing is tapped), and dense desktop screens such as the Worklist, Molecular batches and Cytology. Revisit these later.

Until a screen passes, no guide, video or sales material may describe it as touch-ready.

## 2. The standard

| # | Criterion | Pass | Partial | Fail |
|---|---|---|---|---|
| 1 | Target size | Every target at least 44 x 44 px (WCAG 2.5.5, Apple guideline) | Smallest target 24 to 43 px (WCAG 2.2 AA, 2.5.8) | Any target under 24 px |
| 2 | Spacing | At least 8 px between targets | A few closer | Many closer |
| 3 | No hover-only, drag-only or double-click-only | Every action works with a single tap (WCAG 2.5.7) | none | An action needs hover, drag or double-click |
| 4 | Text in fields | 16 px or larger (prevents iPad Safari zoom) | none | Under 16 px |
| 5 | No sideways scrolling | None at 1280 x 800 | none | Sideways scroll |
| 6 | Scan fields | No on-screen keyboard; focus stays in the field after a scan | One of the two | Neither |
| 7 | Preset reasons | Required reasons are tap-to-pick, note optional | Some are | Typing is the only way |
| 8 | Keyboard up | The field being typed in and its Save button are both visible | none | Either hidden |

Additions beyond the original proposal: primary actions on each screen (Complete grossing, Print, Confirm and the like) should be 48 px or larger. Also check a 1024 x 768 tablet in addition to 1280 x 800. Tooltips need a tap alternative.

## 3. Baseline (audit of 2026-10-30)

Method: demo data, case S26-4403, desktop Chromium at 1280 x 800; every visible target measured; keyboard-up simulated at 1180 x 420 (iPad Air landscape). Header and breadcrumb scored separately.

| Screen | 1 Size | 2 Spacing | 3 Hover/drag | 4 Field text | 5 Sideways | 6 Scan | 7 Reasons | 8 Keyboard | Overall |
|---|---|---|---|---|---|---|---|---|---|
| Grossing | Fail | Partial | Pass | Fail | Pass | Fail | Pass | Pass | Fail |
| Embedding | Fail | Fail | Pass | Fail | Pass | Fail | Pass | Pass | Fail |
| Microtome | Fail | Fail | Fail | Fail | Pass | Fail | Fail | Pass | Fail |
| Slide Distribution | Fail | Fail | Pass | Fail | Pass | Partial | Pass | Pass | Fail |
| Add-On Order Builder | Fail | Fail | Pass | Fail | Pass | Fail | Partial | Pass | Fail |
| Batch Management hub | Partial | Partial | Pass | Fail | Pass | Fail | n/a | Pass | Partial |
| Batch Management batch detail | Fail | Fail | Pass | Pass | Pass | n/a | Fail | Pass | Fail |
| Station picker | Partial | Pass | Pass | Fail | Pass | n/a | n/a | Pass | Partial |
| Shared header | Partial (38 to 43 px) | | | Fail (13 px search) | | | | | Partial |
| Shared breadcrumb | Fail (14 px) | Fail | | | | | | | Fail |

Totals: only 30 of 244 measured targets reach 44 px; 23 of those are the Batch Management hub tiles.

Key findings: no scan field sets inputmode="none"; focus is lost after a scan on Grossing, Embedding, Microtome and the Add-On builder (Slide Distribution restores focus and is the pattern to copy); the Microtome slide order in Batch print mode is drag-only; typed-only reasons remain in the Microtome "Block exhausted" note, the batch Abort and Override windows, and the Add-On dashboard answer to an exhausted-block flag; windows lack role="dialog" and the app header draws over the modal backdrop.

## 4. Requirements

**T1. Shared scan field.** One component used by every station: inputmode="none" (no on-screen keyboard), focused when the screen opens, focus returned after every scan, and a small keyboard button for typing an ID by hand. Pattern to copy: Slide Distribution.
**T2. Touch layout.** Station screens use a 44 px minimum for buttons, chips, badges and checkbox rows, 8 px gaps, and 16 px text in fields, set once in the stylesheet, not screen by screen. Tables that no longer fit (Slide Distribution, the Microtome slide grid) group or move their row actions.
**T3. Tap-to-pick reasons.** Preset reasons with an optional note for: the Microtome "Block exhausted" note, the batch Abort and Override reasons, and the Add-On dashboard answer to an exhausted-block flag (including Approve Destructive Cutting). Reuse the Add-On builder's quick reasons.
**T4. Tap alternative for ordering.** Move up and Move down buttons beside the drag handle for slide order on the Microtome.
**T5. Header and windows.** Raise header buttons and the station chip to 44 px; taller hit area for breadcrumb links; 16 px header search text; mark windows role="dialog"; put the header under the modal backdrop.
**T6. Keyboard.** Keep the active field and its Save button visible with the keyboard up on every screen (passes today by browser behaviour only; add explicit handling and a test).

## 5. Activation (DECIDED 2026-10-30, Pete Nimmo)

The touch layout switches on automatically on touch devices (coarse pointer), with a manual override per workstation. Nobody has to configure it, and tablets get it by default.
- Automatic: on when the device reports a coarse pointer; off otherwise.
- Override per workstation setting: Auto (default), Always on, Always off. A desktop at a bench may keep the denser layout by choosing Always off.
- Hybrid devices (touch laptops) are covered by the override. The setting is read when the workstation is set up, and the layout applies to station screens only.
- Acceptance (section 6) tests all three settings, and a tablet with a mouse attached.

## 6. Acceptance

1. Re-run the audit with the same method after the fixes; every in-scope screen is Pass on criteria 1 to 8, or any Partial is accepted in writing with a reason.
2. Confirm on a real tablet (an iPad at 1280 x 800 and 1024 x 768), not only desktop Chromium: scan with a keyboard-wedge scanner, tap with gloves, keyboard up.
3. Test more than one case and the states the audit could not reach (for example the Microtome "Block exhausted" window).
4. Check focus after a scan on the Batch Management hub (not tested in the baseline).
5. Add automated checks where possible (minimum target size and field font size in the style rules) so new batches do not regress.

## 7. Sequence

Fix (T1 to T3 first, they are shared), then test (re-audit and real tablet), then update guides, then record station videos. The Embedding, Microtome and Slide Distribution videos are already waiting on the workstation fix (see the Workflow spec); touch must be fixed first, so they are recorded once.

## 8. Limits of the baseline

Desktop Chromium, not an iPad; one demo case; scan-field keyboard behaviour inferred from the missing inputmode; keyboard-up simulated. Focus after a scan on the Batch Management hub not tested.

## 9. Build status (Batch 735, Oct 30, 2026)

Built in the demo build. Section 6's real-tablet check (acceptance 2) and the states the audit could not reach (part of acceptance 3) are still to do, so section 1's rule stands: no material may call a screen touch-ready yet.

| Requirement | Built | Where |
|---|---|---|
| T1 Shared scan field | `inputmode="none"`, focused on arrival, focus returned after every scan and whenever it falls to the page (never taken from another field or an open window), **⌨ Type** to type an ID. On Grossing (workspace), Embedding and Microtome (before and during an item), Slide Distribution, Add-On Orders (open a case, and beside the case details to open the next) and the Batch Management hub. An accession scanned with nothing focused no longer opens a report from a station screen; on Grossing it opens the grossing screen. | `components/Workstation/StationScanField.tsx`, `hooks/useScanFieldFocus.ts`, `utils/touch/scanFieldFocus.ts`, `services/scanner/scanRoutePolicy.ts` |
| T2 Touch layout | 44 px targets, 48 px primary actions, 8 px between targets, 16 px field text, checkbox rows as 44 px labels, 14 px button text; set once for every station route. | `components/Touch/TouchLayoutScope.tsx`, `touchLayout.css`, `SignedInApp.tsx` |
| T3 Tap-to-pick reasons | Microtome Block exhausted; batch Abort, complete with exceptions, cold chain; Add-On answer to a Block exhausted flag (including Approve Destructive Cutting) and the builder. Batch 736 (Pete): the reasons are the lab's own, in the Reason Dictionary (Configuration → System → Bench Reasons), with translated defaults; tapping chooses a reason, the box is an optional note; the reason's code is stored beside the text in every record and audit entry. | `components/Common/QuickReasonPicks.tsx`, `services/reasons/benchReasons.ts`, `components/Config/System/BenchReasonsSection.tsx` |
| T4 Tap alternative for ordering | **↑** / **↓** on each row in Batch print mode; the tick box is in a 44 px label. | `pages/MicrotomyWorkstationPage/components/SlideGridPanel.tsx`, `utils/listOrder.ts` |
| T5 Header and windows | Header buttons and station chip 44 px, header search 16 px, 44 px breadcrumb hit area in the touch layout, windows `role="dialog"` with `aria-modal`, the header under the window backdrop, the station picker sized for touch. Below 1280 px the header shows the logo mark only and hides the signed-in name (it overlapped at 1024 and 1180 px before this batch). | `components/Touch/touchChrome.css` |
| T6 Keyboard | The field and its Save button are brought into view when both fit above the keyboard; when the form is too tall, the field stays in view and a copy of the Save button is docked above the keyboard. Windows scroll. `interactive-widget=resizes-content` in `index.html`. | `hooks/useKeyboardKeepVisible.ts`, `utils/touch/keyboardVisibility.ts` |
| §2 Tooltips | Tapping an information element with a tooltip shows it for 4 seconds. | `utils/touch/tapTitle.ts` |
| §5 Activation | Auto (default: on for a coarse pointer), Always on, Always off, per computer, in the header's station menu (**Touch layout on this computer**). | `hooks/useTouchLayout.ts`, `utils/touch/touchLayout.ts`, `components/NavBar/NavBarScanStation.tsx` |
| §6.5 Automated checks | Station routes wrapped, sizes in the stylesheet, header sizes, shared scan field, windows as dialogs, no drag-only lists, tap-to-pick reasons. | `services/styleRules/touchLayout.guard.test.ts` |

### Re-audit (acceptance 1), same method as the baseline

Desktop Chromium, demo case S26-4403, every visible target measured (header and breadcrumb apart). Run with the touch layout Always on at 1280 × 800 and 1024 × 768, Auto on an emulated tablet (coarse pointer) at 1180 × 820, and Auto and Always off on a desktop at 1280 × 800.

| Screen | 1 Size | 2 Spacing | 3 Hover/drag | 4 Field text | 5 Sideways | 6 Scan | 7 Reasons | 8 Keyboard |
|---|---|---|---|---|---|---|---|---|
| Grossing | Pass (36/36) | Pass | Pass | Pass | Pass | Pass (workspace) | Pass | Pass |
| Embedding | Pass (28/28) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Microtome | Pass (35/35) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Slide Distribution | Pass (69/69) | Pass | Pass | Pass | Pass | Pass | Pass | Pass (Save docked for Pathologist or pool) |
| Add-On Order Builder | Pass (48/48) | Pass | Pass | Pass | Pass | Pass | Pass | Pass (Save docked for the stain search) |
| Batch Management hub | Pass | Pass | Pass | Pass | Pass | Pass | n/a | Pass |
| Batch detail | Pass (10/10) | Pass | Pass | Pass | Pass | n/a (hands-free) | Pass | Pass |
| Station picker | Pass (3/3) | Pass | Pass | Pass | Pass | n/a | n/a | Pass |

Identical at 1024 × 768 and on the emulated tablet (Auto switched the layout on). On a desktop with Auto or Always off the compact layout is kept, as decided; the scan fields still raise no keyboard and keep focus there. Focus after a scan on the Batch Management hub (acceptance 4): kept in the field after an unknown barcode; a carrier barcode opens Batch Detail, which takes further scans hands-free with nothing focused.

### Still open

- Acceptance 2: a real iPad at 1280 × 800 and 1024 × 768, a keyboard-wedge scanner, gloves, keyboard up (iPadOS Safari does not shrink the page for the keyboard; the Save dock is placed from `visualViewport`, untested on a device). A tablet with a mouse attached could only be approximated in Chromium (Auto then stays off); on iPadOS the main pointer may still report coarse.
- Acceptance 3: more cases, and windows the demo case could not open (the Microtome Block exhausted window was greyed out for this block).
- The grossing screen of a case has no scan field; a scan there with nothing focused opens the scanned case's grossing screen.
- The header search box raises the keyboard by decision (Pete, Oct 30, 2026: it is a typing field; the no-keyboard rule is for the station scan fields). Batch 736 confirmed its text is 16 px and keeps its results above the keyboard. Out of scope by the spec: wall displays, the Worklist, Molecular batches, Cytology.
- Batch 736: the preset reasons moved into the Reason Dictionary (one list for the organisation; no per-facility wording yet).
