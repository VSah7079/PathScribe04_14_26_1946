# services/addOnOrders/

**Batch 403 (PS-287 / PS-359).** The Add-On Orders page's actions, moved out of its hook so each one is checked where the work is done.

## Files

- **`addOnOrderActions.ts`** (+ `.test.ts`):
  - `placeAddOnOrders` checks `add-on:order:place` and the organisation's Field Requirements (page "addOnOrder"), then places the order on every chosen block and saves once. A molecular or send-out line must name its reference lab (Pete: locked). If a block refuses the order (exhausted, lost, damaged, cancelled), nothing is saved, and the result says which block and why.
  - `respondToAddOnException`: approving destructive cutting checks `add-on:exception:approve-destructive-cut`. Cancelling, or modifying and resubmitting, checks `add-on:order:place`. The response note follows its switch.
  - `flagAddOnException`: a tech flags a block exception. No permission is needed, because it reports a fact. The note follows its switch, and the ordering pathologist is emailed (an English transport message).
  - `markAddOnBlockRetrieved`.
- Dependencies are passed in: `enforce`, `saveSpecimens`, `getUserEmail`, `sendEmail`.

## Fixed

Placing an order on two blocks of the same specimen used to start each block from the case as first loaded, so the second save dropped the first block's new orders. Blocks now build on each other before a single save.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
