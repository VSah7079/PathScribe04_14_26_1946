# components/Touch/

Batch 735 (Station Touch Specification v1, Pete, Oct 30, 2026; `docs/product/STATION_TOUCH.md`).

- `TouchLayoutScope.tsx`: wraps each station route (`SignedInApp.tsx`). When the touch layout is on for this computer (`hooks/useTouchLayout.ts`: Auto on a coarse pointer, or the station menu's override), the screen gets `ps-touch` and the page `ps-touch-on`. It also keeps the field being typed in and its Save button above the on-screen keyboard (`hooks/useKeyboardKeepVisible.ts`, with the Save dock) and shows a tooltip on a tap (`utils/touch/tapTitle.ts`). The wrapper takes no space (`display: contents`).
- `touchLayout.css`: the touch layout, set once: 44 px targets, 48 px primary actions, 4 px margins (8 px between targets), 16 px field text, checkbox and radio rows as 44 px labels, windows that scroll, the Save dock, the tap tooltip.
- `touchChrome.css` (imported by `NavBar.tsx`): 44 px header buttons and station chip, 16 px header search, breadcrumb hit area while a station screen is in the touch layout, windows above the header, the station picker sized for touch, a compact header below 1280 px.

Batch 736: `touchChrome.css` also sizes the header search's results to the area above the keyboard (`--ps-visible-height`), uncaps their overlay's width and makes their close button 44 px.

Held by `services/styleRules/touchLayout.guard.test.ts`.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
