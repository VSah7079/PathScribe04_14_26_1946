**Batch 735 (touch spec T1):** `StationScanField.tsx` (+ `.css`, test) is the one scan field every station uses: `inputmode="none"` (no on-screen keyboard), focused on arrival and after each scan (`hooks/useScanFieldFocus.ts`), **⌨ Type** to type an ID by hand, `data-scan-field` for the audit harness.

# components/Workstation/

Batch 726 (Lab Workflow & Batch spec, Decision 1): parts shared by the bench workstations.

- `StationCarrierPanel.tsx` (+ `.css`): the **Carriers at this station** card on the Embedding, Microtome and Slide Distribution workstations. Lists the open carriers for the station, shows the carrier loaded here with its unloading progress (Seal manifest, Finish unloading, Open in Batch Management), the Microtome's output tray, the warnings that need a deliberate continue (another step's carrier, an item not in the carrier) and what just happened. With no station set it offers the station picker, because nothing is recorded without one. Presentation only; `hooks/useStationCarrier.ts` does the work and `services/batches/stationCarrierRules.ts` decides.

Patient identifiers (item ids, which carry the accession) are inside `data-phi="accession"` elements.

## Batch 729

- `ScanTrailPanel.tsx` (+ `.css`, test): the case's station scan trail (spec 7.4), closed until opened, only with `station:scan-history:view`.
- `WrongCaseScanBanner.tsx`: the Grossing wrong-case warning (spec 7.3): Set it aside / Continue anyway (audited).

## Batch 731

- `ExhaustedBlockBanner.tsx` (+ `.css`, new): the exhausted-block warning at Embedding, Microtome and Slide Distribution (what remains, orders waiting for re-embedding; at Embedding, "Re-embedded: release the orders"). `ItemEndStatePanel.tsx` (+ `.css`, new): an item's end state and the inline form to record one. `ScanTrailPanel.tsx`: "from …" under a slide with its parent.

## Batch 732

- `BlockPieceMapPanel.tsx` (+ `.css`, new; spec §11): block type, slide size and piece map at Embedding, Microtome (with "Piece exhausted") and Slide Distribution.

Batch 756 (Pete: "can't the field listen but also receive keyboard data?"): `StationScanField` always takes a scanner and a physical keyboard; its keyboard and submit buttons show only with the touch layout on (`useTouchLayout`), and the keyboard button reads "⌨ Keyboard" / "⌨ Hide keyboard".

Batch 757: `StationCarrierPanel` lists a loaded carrier's items (✓ Arrived as scanned; a waiting item can be checked off by hand with a reason) and the output tray's rescan hint; the "Add printed slides to tray" button is gone. `StationScanField` clears at once and never drops a scan that arrives while the last is still being handled.

Batch 758: `StationCarrierPanel` shows the Microtome's bench counter ("Unassigned slides on bench: N", slides confirmed before a staining rack was scanned) and a hint for rack first or rack last.

Batch 759: `BenchIdentity.tsx` (+ `.css`, new): `ForeignIdTag` (an outside case's Foreign case ID and the item's Foreign ID, highlighted) and `TypedEntryCheck` (the identifiers to check after a typed entry). `StationScanField` tells a scan from a typed id, records a typed one (`useManualEntryRecorder`) and passes `{ method }` to `onScan`.

Batch 761: `StationCarrierPanel` shows the unclosed-run warning for a reusable rack, with Close last run (`batch:reconciliation:override`), Open in Batch Management and Cancel.
