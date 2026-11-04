# pages/WindowPositionPage

Batch 750. **`WindowPositionPage.tsx`** at `/window-position?window=<name>`: the "Move this window, then Save position"
page. The workstation menu (`components/NavBar/NavBarScanStation.tsx`, **Slide image window → Set position**) opens it
in the window being set up; the person drags and sizes the window and selects **Save position**, which keeps the
position with this workstation's settings (`hooks/useCompanionWindow.ts` `saveCompanionGeometry`). The windows that can
be set up this way are listed in `services/windowPlacement/windowPlacement.ts` (`WINDOW_POSITION_TARGETS`; today the
slide image window). No sign-in and no patient data: the page only records where a window sits.
