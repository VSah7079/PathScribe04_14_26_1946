# pages/MolecularBatchPage/components/

Pieces of the molecular pages that are big enough to stand on their own.

- **`RackPlacementPanel.tsx`** (Batch 406): Rack Loading's "Place on instrument" panel.
  - Offers the instrument, the assay (optional), and a deck-slot list filtered to the slots that take a sample rack and suit the assay.
  - "Scan deck position" reads the deck's `LOC-INST-<instrument>-<slot>` label, fills the slot, and warns when it's wrong.
  - Shows "Still required" and places the rack by button or by saying "place rack".
  - Decisions live in `services/molecular/deckSlots.ts` and `services/fieldRequirements/molecularRackChecks.ts`, and the rack service checks everything again.
  - Tested in `RackPlacementPanel.test.tsx`.

---
*See [../README.md](../README.md) for the pages that use these.*
