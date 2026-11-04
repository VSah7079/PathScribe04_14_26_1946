# services/scanEntry/

Batch 759 (Patient Verification, Outside Case Tracking and Audit Logging spec §2.2, Pete, Nov 2, 2026): telling a barcode scan from a typed id, and the Manual Entry flag. See `docs/product/PATIENT_VERIFICATION.md`.

| File | What it does |
|---|---|
| `entryMethod.ts` | `entryMethodOf` (scan or manual, from keystroke timing, pastes, edits, the touch keyboard or dictation) and `createEntryTracker` (follows one field from empty to submit). Pure. |
| `lastEntry.ts` | The last id entered in this tab and how, in memory only (nothing stored); `typedEntryNamesCase` decides whether a screen shows the check line. |
| `manualEntryLog.ts` | `workspaceModuleOf` (the Pathology Workspace module from the address), `manualEntryAudit` (the audit entry, literal English) and `recordManualEntry` (audit trail, and the station log action `typed` when there is a station and the entry named an item). Never throws, never blocks. Not written to the case record (Pete's decision). |

Used by `components/Workstation/StationScanField.tsx` and `components/Search/CaseSearchBar.tsx` through `hooks/useManualEntryRecorder.ts`; screens show the check line with `hooks/useTypedEntryCheck.ts`.
