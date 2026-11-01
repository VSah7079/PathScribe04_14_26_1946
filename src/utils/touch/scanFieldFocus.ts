// src/utils/touch/scanFieldFocus.ts
// ─────────────────────────────────────────────────────────────────────────────
// Touch spec T1 (Pete, Oct 30, 2026): a station's scan field keeps focus, so the next scan from a keyboard-wedge
// scanner lands in it, without raising the on-screen keyboard (the field is `inputmode="none"` unless the person
// asks to type). These are the rules the shared field (components/Workstation/StationScanField.tsx) follows. Pure.
// ─────────────────────────────────────────────────────────────────────────────

/** What the page looks like at the moment focus might go back to the scan field. */
export interface ScanFocusState {
  /** The element that has focus now (document.activeElement). */
  active: Element | null;
  /** The page's body: focus resting there means nothing has it. */
  body: Element | null;
  /** A window (dialog) is open: it owns focus until it closes. */
  dialogOpen: boolean;
  /** The person has selected some text (copying an id, say): don't take it away. */
  selectionActive: boolean;
  /** The scan field is on screen (not hidden in a closed panel). */
  fieldVisible: boolean;
}

/**
 * Whether focus should go back to the scan field. Only when nothing else has it: focus is never taken from another
 * field, a dropdown or a window the person is using.
 */
export function scanFieldShouldReclaim(s: ScanFocusState): boolean {
  if (!s.fieldVisible || s.dialogOpen || s.selectionActive) return false;
  return s.active === null || s.active === s.body;
}

/** The selector that finds an open window on the page. */
export const OPEN_DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], .ps-overlay';

/** The `inputmode` for the scan field: none while scanning (no on-screen keyboard), text while typing an id by hand. */
export function scanFieldInputMode(typing: boolean): 'none' | 'text' {
  return typing ? 'text' : 'none';
}
