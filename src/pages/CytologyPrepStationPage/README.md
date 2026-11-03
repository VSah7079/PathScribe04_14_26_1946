**Batch 759:** no patient name or date of birth in the context bar; Foreign ID; typed-entry check line.

**Batch 741:** Divide specimen and aliquot tracking on the bench.

# pages/CytologyPrepStationPage

**Batch 740 (Pete, fluid decision 1, Oct 30, 2026):** the Cytology Preparation bench (`/workstations/cytology-prep`). Fluids, aliquots and cell blocks are prepared here; a cell block goes to the Microtome only after its hand-off scan.

- `CytologyPrepStationPage.tsx` (+ `.css`): reuses `useMicrotomyWorkstation({ bench: 'cytologyPrep' })` and the Microtome's CytologyPanel, SlideGridPanel and HardwarePrintPanel.
- `hooks/useCellBlockHandoff.ts`: make a cell block, print its label, hand it off (rules in `services/cytology/cellBlockHandoff.ts`).
- `components/CellBlockHandoffPanel.tsx`: the specimen's cell blocks and the two-scan hand-off.
