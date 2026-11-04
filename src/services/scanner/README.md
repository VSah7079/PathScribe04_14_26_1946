**Batch 740:** `/workstations/cytology-prep` handles its own scans.

**Batch 735 (touch spec T1):** `scanRoutePolicy.ts`: what an accession scanned with nothing focused opens. Accessioning and the station screens (Embedding, Microtome, Slide Distribution, Add-On Orders, Batch Management) handle their own scans, so `contexts/ScannerProvider.tsx` no longer navigates there; on Grossing it opens the case's grossing screen, elsewhere the report.

# services/scanner/

Batch 649. Which key events the global barcode listener (`contexts/ScannerProvider.tsx`) treats as scanner input.

- **`scanKeyFilter.ts`**: `shouldIgnoreScanKeyEvent(event, { acceptUntrusted })`. A handheld scanner types through the operating system, so its key events are trusted (`isTrusted === true`). An event built by script (`new KeyboardEvent(...)` plus `dispatchEvent`: a browser extension, autofill, injected code, or the app's own shortcut code) is untrusted and must never open a case or feed the scan buffer. Events with no key are ignored too.
- **Test seam.** `acceptUntrusted` (the provider's `acceptUntrustedKeyEvents` prop) exists only because jsdom and Testing Library dispatch untrusted events. The app never sets it. To test without hardware use `simulateScan()` from `useScanner`, which skips the keystroke step.
- **Side effect, intended.** The app's own scripted key events (the AppShell Enter, the config edit tracker's Escape, action-registry shortcuts) no longer reach the scan buffer.

Test: `scanKeyFilter.test.ts`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
