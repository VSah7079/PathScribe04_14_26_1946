**Batch 737:** `placeAddOnOrders` takes a matrix block id (whole block, or parts through `pieceIdsByBlock`, stored as `targetSpecimenIds`); refuses used-up tissue with `matrixExhausted`; answering, flagging and retrieval find orders on matrix blocks and save them back (`commitSpecimen`); `saveSpecimens(caseData, specimens, matrixBlocks?)`. Test: `matrixAddOnOrders.test.ts`.

**Batch 736:** `flagAddOnException` and `respondToAddOnException` take `reasonCode` (stored as `exception.reasonCode` / `responseReasonCode` on every flagged or answered slide); an order on an exhausted block carries `exhaustedChoices[block].reasonCode`; each audit detail ends `[reason code …]`.

# services/addOnOrders/

**Batch 403 (PS-287 / PS-359).** The Add-On Orders page's actions, moved out of its hook so each one is checked where the work is done.

## Files

- **`addOnOrderActions.ts`** (+ `.test.ts`):
  - `placeAddOnOrders` checks `add-on:order:place` and the organisation's Field Requirements (page "addOnOrder"), then places the order on every chosen block and saves once. A molecular or send-out line must name its reference lab (Pete: locked). If a block refuses the order (exhausted, lost, damaged, cancelled), nothing is saved, and the result says which block and why.
  - `respondToAddOnException`: approving destructive cutting checks `add-on:exception:approve-destructive-cut`. Cancelling, or modifying and resubmitting, checks `add-on:order:place`. The response note follows its switch.
  - `flagAddOnException`: a tech flags a block exception; needs `add-on:exception:flag` (Batch 669; it used to need none, "because it reports a fact"). The note follows its switch, and the ordering pathologist is emailed (an English transport message). With no ordering pathologist, or none who can be e-mailed, the notice goes to the Supervisor / Accessioning Desk (Batch 669, `blockExceptionRouting.ts`); the result says `noticeToDesk` or `noticeNotSent`.
  - `markAddOnBlockRetrieved`: needs `add-on:block:mark-retrieved` (Batch 669).
- Dependencies are passed in: `enforce`, `saveSpecimens`, `getUserEmail`, `getDeskRecipients` (Batch 669), `sendEmail`.

## Fixed

Placing an order on two blocks of the same specimen used to start each block from the case as first loaded, so the second save dropped the first block's new orders. Blocks now build on each other before a single save.

## Batch 467 — In-house molecular orders

A molecular line has a routing (in-house or send-out). Only a send-out line needs its reference lab. After an order is saved, each molecular slide order it made becomes a molecular order (`molecularOrderRequests` → the engine's ingest). Tests added.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 669 — exception permissions and desk routing (ws-3, ws-19, ws-20)

- **`blockExceptionRouting.ts`** (+ test): `exceptionDeskEmails` (active Lab Director and Accessioner staff with an address, limited to the case's facility when the person is assigned to facilities), `deskRecipientsFor` (those addresses plus the case's primary pathologist's name for the message) and `staffDisplayName` (a user id shown as the name; text that is not a user id is kept). There was no supervisor routing in the app to copy: "Supervisor" and "Accessioning Desk" are taken as those two built-in roles (there is no "Histology Supervisor" role). A dedicated exception-desk address setting is not built.
- `flagAddOnException` and `markAddOnBlockRetrieved` now take `enforce` and check their capability first. Tests in `addOnOrderActions.test.ts`.

## Batch 730

- "Print labels at" lives in `services/labelPrintRoutes/` (the order is placed here as before; the labels then print at the chosen station).

## Batch 731

- Spec §10.6: `placeAddOnOrders` takes `exhaustedChoices` (per exhausted block: each line's alternative and the reason; `placeOnExhaustedBlock` applies them; refusals `exhaustedNeedsChoice` with the line indexes and `exhaustedReasonRequired`; audited). A re-embedding line also needs `material:reembed:request`. `respondToAddOnException` adds `use_unstained`, `other_block` and `reembed` (audited; a confirmed exhaustion records the block's end state through `deps.recordEndState`). `completeReembedding` (`material:reembed:complete`) is the Embedding Station's "re-embedded". `molecularOrderRequests` counts a molecular test put on an unstained slide. Tests: `exhaustedBlockOrders.test.ts`.

## Batch 732

- Batch 732 (spec §11.4, §11.5): `placeAddOnOrders` takes `pieceIdsByBlock` (the pieces an order is for, stamped on the slides); an order for used-up pieces needs the exhausted-block choices (`pieceExhausted`), used-up and remaining together are refused (`mixedPieces`); the alternative `otherPiece`.

## Batch 733

- Batch 733 (Pete): a Block exhausted flag covers every waiting slide and e-mails each ordering pathologist once; an answer applies to all of them unless `individually`; approving destructive cutting needs a reason and is refused when the block was already exhausted. Tests in `exhaustedBlockOrders.test.ts`.
