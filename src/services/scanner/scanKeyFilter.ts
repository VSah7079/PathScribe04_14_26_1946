// src/services/scanner/scanKeyFilter.ts
// ─────────────────────────────────────────────────────────────────────────────
// Which keydown events the global barcode listener (contexts/ScannerProvider)
// may treat as scanner input. A HID scanner types through the operating
// system, so its key events are always trusted (`isTrusted === true`). An
// event built by script (`new KeyboardEvent(...)` + dispatchEvent: a browser
// extension, autofill, injected code, or the app's own keyboard shortcuts)
// is untrusted and must never open a case or feed the scan buffer.
//
// `acceptUntrusted` is a test seam only: jsdom / Testing Library dispatch
// untrusted events, so a test of the listener passes it explicitly. The app
// never sets it. For testing without hardware use `simulateScan()`
// (useScanner), which skips the keystroke step altogether.
// ─────────────────────────────────────────────────────────────────────────────

export interface ScanKeyFilterOptions {
  /** Test seam: accept script-dispatched (untrusted) events. Never set in the app. */
  acceptUntrusted?: boolean;
}

/** True when the listener should ignore this keydown entirely. */
export function shouldIgnoreScanKeyEvent(
  e: Pick<KeyboardEvent, 'key' | 'isTrusted'> | null | undefined,
  options: ScanKeyFilterOptions = {},
): boolean {
  if (!e || !e.key) return true;                         // extension events with no key
  if (e.isTrusted !== true && !options.acceptUntrusted) return true; // synthetic events
  return false;
}
