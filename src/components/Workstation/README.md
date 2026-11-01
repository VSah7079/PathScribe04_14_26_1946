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
