# Case workflow services: the API server's calls (PS-514)

Batch 617 (part A). The server version of each service below, which the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test, chosen by `<name>ServiceInstance.ts`); the India team's API server honours this contract. The rules are `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**Convention (`HTTP_SERVICES_PATTERN.md` §7).**
- One route per interface method: `/api/<area>/<service>/<method-name>`, kebab-case.
- Reads are `GET` with plain arguments in the query string; a read whose arguments are objects, or that carries an accession number, a token, or anything that names a patient, is a `POST` with the arguments in the body (nothing identifying goes in a URL or an access log).
- `delete`, `remove`, `clear`, `revoke` are `DELETE` with the query string; `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. One object argument is the body; several arguments are sent as an object named by the argument names.
- A call that returns a list answers `{ "items": [...] }`; a call that returns one record answers the record; a call that returns a result answers the data, and a failure is the fixed code (`403` NOT_PERMITTED, `404` NOT_FOUND, `409` CONFLICT, `400` INVALID).
- A call that returns nothing answers `200` with an empty body. A call whose answer is never "nothing" (marked *throws*) raises on a failure instead of returning a quiet default.
- *Settled* calls (code import): the business outcome (`ok: false` with `code`, `problems`, `missing`) is a `200` reply holding the interface's own union; a failed call (403, 404, no network) becomes the same union with the fixed code.

## IBatchService

Service: `services/batches/httpBatchService.ts`; chosen in `batchServiceInstance.ts`. Base `/api/batches/batch`.

Batch 726 (Lab Workflow & Batch spec): a batch is a physical carrier and keeps its id and barcode as it moves from step to step (`nodeHistory`); `sealedAt` / `sealedByUserId` / `sealedByUserName` mark a sealed manifest (no adds, removes or moves). Station scan events are written by the server in the same transaction as the batch change; see `STATION_TRACKING_API.md`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/batches/batch/get-all` | none | result |
| `getById` | `GET /api/batches/batch/get-by-id` | `id` (query) | result |
| `getByMasterBarcode` | `GET /api/batches/batch/get-by-master-barcode` | `barcode` (query) | result |
| `create` | `POST /api/batches/batch/create` | `draft` (the body) | result |
| `addItemByScan` | `POST /api/batches/batch/add-item-by-scan` | `batchId`, `scannedValue`, `byUserId`, `byUserName`, `fovCount?`, `stationId?` (body fields; Batch 726: `stationId` writes a 'loaded' station scan event; a sealed or closed batch answers `not-accepting`); Batch 737: an Exhausted block or matrix block is added with `warning: 'blockExhausted'` and audited; a large-format slide on a Staining batch without `largeFormat` answers `slide-too-large`) | record (throws) |
| `removeItem` | `DELETE /api/batches/batch/remove-item` | `batchId`, `itemId`, `byUserId`, `byUserName` (query) | result |
| `moveItem` | `POST /api/batches/batch/move-item` | `fromBatchId`, `itemId`, `toBatchId`, `byUserId`, `byUserName` (body fields) | result |
| `startReconciliation` | `POST /api/batches/batch/start-reconciliation` | `batchId`, `byUserId`, `byUserName` (body fields) | result |
| `scanItemOut` | `POST /api/batches/batch/scan-item-out` | `batchId`, `scannedValue`, `byUserId`, `byUserName`, `stationId?` (body fields; Batch 726: with `stationId`, a 'matched' or 'unexpected' event) | result |
| `completeReconciliation` | `POST /api/batches/batch/complete-reconciliation` | `batchId` (body fields) | result |
| `overrideAndComplete` | `POST /api/batches/batch/override-and-complete` | `batchId`, `byUserId`, `byUserName`, `reason`, `stationId?` (body fields; Batch 726: with `stationId`, a 'missing' event per item still missing) | result |
| `setColdChainExcursion` | `PUT /api/batches/batch/set-cold-chain-excursion` | `batchId`, `readingId`, `temperatureCelsius`, `detectedAt` (body fields) | result |
| `acknowledgeColdChainExcursion` | `POST /api/batches/batch/acknowledge-cold-chain-excursion` | `batchId`, `byUserId`, `byUserName`, `note` (body fields) | result |
| `setCytologyInstrumentStatus` | `PUT /api/batches/batch/set-cytology-instrument-status` | `batchId`, `status` (body fields) | result |
| `setStainingInstrumentStatus` | `PUT /api/batches/batch/set-staining-instrument-status` | `batchId`, `status` (body fields) | result |
| `confirmQcVisualRead` | `POST /api/batches/batch/confirm-qc-visual-read` | `batchId`, `userId`, `userName` (body fields) | result |
| `abort` | `POST /api/batches/batch/abort` | `batchId`, `byUserId`, `byUserName`, `reason` (body fields) | result |
| `releaseRack` | `POST /api/batches/batch/release-rack` | `batchId`, `byUserId`, `byUserName` (body fields) | result |
| `transferToProcessing` | `POST /api/batches/batch/transfer-to-processing` | `batchId`, `byUserId`, `byUserName` (body fields). Batch 726 (Decision 9): the same move as `advanceToNode(…, 'Processing')`; `fromBatch` and `toBatch` are the same batch; needs `batch:carrier:advance` | result |
| `sealManifest` | `POST /api/batches/batch/seal-manifest` | `batchId`, `byUserId`, `byUserName` (body fields). Batch 726; needs `batch:manifest:seal`; refusals `notActive`, `alreadySealed` | result |
| `advanceToNode` | `POST /api/batches/batch/advance-to-node` | `batchId`, `toNode`, `byUserId`, `byUserName`, `stationId?` (body fields). Batch 726: only to the next step (`stationCarrierRules.NEXT_NODE`), seals, appends `nodeHistory`, and with `stationId` writes one 'loaded' event per item marked `inferredFromCarrier`; needs `batch:carrier:advance`; refusals `notActive`, `cannotAdvance`, `noItemsToTransfer` | result |
| `recordCarrierScan` | `POST /api/batches/batch/record-carrier-scan` | `batchId`, `stationId`, `byUserId`, `byUserName`, `result` ('ok' or 'mismatch') (body fields). Batch 726: one 'received' event per item (inferred from the carrier) and, when the batch has none, records `stationId` as its Target Workstation; 'mismatch' needs `station:scan-mismatch:continue` and is audited; refusal `stationRequired` | result |

## ICaseMaskService

Service: `services/caseRegistry/httpCaseMaskService.ts`; chosen in `caseMaskServiceInstance.ts`. Base `/api/case-registry/case-mask`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getMask` | `GET /api/case-registry/case-mask/get-mask` | `scopeType`, `scopeId` (query) | result |
| `getAllMasks` | `GET /api/case-registry/case-mask/get-all-masks` | none | result |
| `saveMask` | `PUT /api/case-registry/case-mask/save-mask` | `mask` (the body) | result |
| `deleteMask` | `DELETE /api/case-registry/case-mask/delete-mask` | `scopeType`, `scopeId` (query) | result |
| `allocateNextCaseNumber` | `POST /api/case-registry/case-mask/allocate-next-case-number` | `candidates`, `timezone` (body fields) | result |
| `previewNextCaseNumber` | `POST /api/case-registry/case-mask/preview-next-case-number` | `candidates`, `timezone` (body fields) | result |

## ILabelPrintRouteService ("print labels at", Batch 730)

Service: `services/labelPrintRoutes/httpLabelPrintRouteService.ts`; chosen in `labelPrintRouteServiceInstance.ts`. Base `/api/label-print-routes/label-print-route`. An add-on order's slide labels printed at a station the pathologist chose when the order was placed (spec §5, §8), so the Microtome records the cut without printing them again. The printing itself goes to the station's slide printer like every bench label (the interface boundary, spec §8).

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `recordPrinted` | `POST …/record-printed` | `routes` (body): `{ stainOrderId, slideId, caseId, stationId, stationName, byUserId, byUserName }[]` | result: the routes with `printedAt` (server clock). Needs `print:job:redirect` (403 `NOT_PERMITTED`). |
| `getForStainOrders` | `POST …/get-for-stain-orders` | `stainOrderIds` (body) | result: the newest route for each slide that has one. |

## IItemEndStateService (item end states, Batch 731)

Service: `services/itemEndStates/httpItemEndStateService.ts`; chosen in `itemEndStateServiceInstance.ts`. Base `/api/item-end-states/item-end-state`. Every item's end state with a reason, user and time (Lab Workflow spec §10.5): `exhausted`, `returned_to_storage`, `archived`, `sent_out`, `consumed`, `discarded`. Append only; the newest record is the item's current end state. `materialType` is `block`, `slide`, `matrix_block`, `matrix_slide`, `decant`, `decant_slide` or `wet_tissue`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `record` | `POST …/record` | body: `{ itemId, materialType, caseAccession, state, reason, userId, userName, stationId? }` | result: the record with `id`, `at` (server clock) and `source: 'manual'`. Needs `material:end-state:record` (403 `NOT_PERMITTED`); a missing reason, item or user, or an unknown state, is `INVALID`. |
| `recordFromAction` | `POST …/record-from-action` | body: as `record`, plus `source`: `disposal`, `referral` or `exhaustion_flag` | result: the record. Called by the server's own disposal, referral completion and exhaustion answer, which checked their own permissions (`retention:material:dispose`, the batch completion, `add-on:order:place` / `add-on:exception:approve-destructive-cut`); `manual` is `INVALID`. On the API server these are written inside those actions, not by a separate browser call. |
| `listForItems` | `POST …/list-for-items` | `itemIds` (body) | result: every record for those items (any letter case), oldest first. |
| `listForCase` | `POST …/list-for-case` | `caseAccession` (body) | result: every record on the case, oldest first. |

### Add-on orders on an exhausted block (Batch 731, spec §10.6)

Placing an add-on order (`placeAddOnOrders`, saved through the case like every add-on order) carries `exhaustedChoices`: for each exhausted block, `{ reason, lines: { <line index>: { kind: 'useSlide', slideId } | { kind: 'reembed' } | { kind: 'otherBlock', blockId } } }`. Without it an exhausted block is refused (`blockExhausted`) as before. A recut or levels line can never use an existing slide; an unstained slide takes one line; the other block must be of the same part and cuttable. A blocked line is refused (`exhaustedNeedsChoice`, with the line indexes) and a missing reason too (`exhaustedReasonRequired`); nothing is saved. A `reembed` line also needs `material:reembed:request`; its order is placed with the exception `{ reason: 'Block exhausted', status: 'reembed_requested' }` and cutting stays held. Each exhausted block placed is audited ("Add-On Order On Exhausted Block", with the reason). The answers to a "Block exhausted" flag add `use_unstained` (with `slideId`), `other_block` (with `blockId`) and `reembed`; the Embedding Station's "re-embedded" (`material:reembed:complete`) sets the block back to Embedded and the waiting orders' exception to `reembedded`. Each is audited. The server must apply the same rules (`utils/exhaustedBlockRules.ts`).

### Block types, piece maps and slide size (Batch 732, spec §11)

Data on the case (saved with the case like every block field): `HistologyBlock.blockType` (`standard`, `megablock`, `multi_piece`; a matrix block is `matrix`) and `HistologyBlock.pieces` (`{ id, position, partLabel, description?, orientation?, ink?, exhaustedAt?, exhaustedByName? }[]`); `MatrixBlockParticipant.orientation`, `ink`, `exhaustedAt`; `StainOrder.slideSize` (`standard` or `large_format`; none: from the block type), `sectionCount`, `levelCount` and `pieceIds`. Placing an add-on order carries `pieceIdsByBlock` (stamped on the new slides); an order for pieces that are all used up needs `exhaustedChoices` (`pieceExhausted` otherwise), a mix of used and remaining pieces is refused (`mixedPieces`), and the alternative `{ kind: 'otherPiece', pieceId }` is added. A recut line's `levelCount` and `levelsPerSlide` make one slide per slide-full of levels. Marking a piece used up (`material/pieceExhaustion.ts`) needs `material:end-state:record` and is audited; the last piece sets the block Exhausted. A large-format slide's label is printed with template `ZPL-SLIDE-LF-V1` (`slide.slideSize` in the network print payload). `Equipment.supportsLargeFormat` (stainers, slide scanners) is required for a large-format slide at Slide Distribution. The server must apply the same rules (`utils/blockPieceRules.ts`). Review fixes in Batch 732: on an Exhausted block a Pending Cut slide is held unless its exception is `approved_destructive_cut` or `reembedded` (`stainCuttingBlocked`); the alternatives `use_unstained`, `other_block` and `reembed` need a `responseNote`; an order in the histology cutting queue (a recut or level) is never put on an existing slide; an item end state can be `withdrawn` (source `reembedded`) when a block is re-embedded, which leaves the item with no current end state; a piece that is used up or named on an order cannot be removed from the map. Batch 733: a `Block exhausted` flag is set on every Pending Cut, non-control slide of the block in one change (`flagBlockExhaustedOnce`); an answer to it applies to every open flag on the block unless `individually` is true; `approve_destructive_cut` is refused (`alternativeRefused: 'nothingLeft'`) when the flag's `blockStatusBefore` is Exhausted and needs a `responseNote`; a group `use_unstained` takes the block's free unstained slides in order (`notEnoughSlides`, `needsNewSection` otherwise). The result carries `answered`, the number of slides answered. Batch 736: a bench reason picked from the Reason Dictionary travels as `reasonCode` beside the text: on the flag (stored as `exception.reasonCode` on every flagged slide), on the answer (stored as `exception.responseReasonCode` on every answered slide) and on an order on an exhausted block (`exhaustedChoices[block].reasonCode`); each audit detail ends `[reason code <code>]`. A typed note with no picked reason has no code. Batch 737: `blockIds` may name a matrix block (`Case.matrixBlocks`); `pieceIdsByBlock[matrixBlockId]` lists the parts (specimen ids) an order is for, stored on each new slide as `targetSpecimenIds`; the slides are saved on the matrix block in the same case write. An order on a used-up part, or on an Exhausted matrix block, is refused (`matrixExhausted`). Marking a matrix part used up stamps `MatrixBlockParticipant.exhaustedAt` (materialType `matrix_block`); the last part sets the matrix block Exhausted. A cassette label carries `blockType`; a megablock prints with `ZPL-CASSETTE-MEGA-V1`.

## ICaseViewTrackingService

Service: `services/caseViewTracking/httpCaseViewTrackingService.ts`; chosen in `caseViewTrackingServiceInstance.ts`. Base `/api/case-view-tracking/case-view-tracking`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `recordView` | `POST /api/case-view-tracking/case-view-tracking/record-view` | `userId`, `caseId` (body fields) | result |
| `getViewedCaseIds` | `GET /api/case-view-tracking/case-view-tracking/get-viewed-case-ids` | `userId` (query) | result |

## ICountersignService

Service: `services/cases/httpCountersignService.ts`; chosen in `countersignServiceInstance.ts`. Base `/api/cases/countersign`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `getAll` | `GET /api/cases/countersign/get-all` | none | result |
| `getForCase` | `GET /api/cases/countersign/get-for-case` | `caseId` (query) | result |
| `release` | `POST /api/cases/countersign/release` | `input` (the body) | result |
| `countersign` | `POST /api/cases/countersign/countersign` | `input` (the body) | result |
| `reject` | `POST /api/cases/countersign/reject` | `input` (the body) | result |
| `getForSpecimen` | `GET /api/cases/countersign/get-for-specimen` | `caseId`, `specimenId` (query) | result |

## IOnDemandCaseFetchService

Service: `services/cases/httpOnDemandCaseFetchService.ts`; chosen in `onDemandCaseFetchServiceInstance.ts`. Base `/api/cases/on-demand-case-fetch`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `fetchCaseByAccession` | `POST /api/cases/on-demand-case-fetch/fetch-case-by-accession` | `accessionNumber` (body fields) | result |

## ICodeService

Service: `services/codes/httpCodeService.ts`; chosen in `codeServiceInstance.ts`. Base `/api/codes/code`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `search` | `POST /api/codes/code/search` | `params` (the body) | result |
| `getByCode` | `GET /api/codes/code/get-by-code` | `system`, `code`, `jurisdiction?` (query) | result |
| `getCategories` | `GET /api/codes/code/get-categories` | `system`, `subtype?`, `jurisdiction?` (query) | result |

## IConsultTokenService

Service: `services/consultAccess/httpConsultTokenService.ts`; chosen in `consultTokenServiceInstance.ts`. Base `/api/consult-access/consult-token`.

| Method | Call | Arguments | Answer |
|---|---|---|---|
| `issue` | `POST /api/consult-access/consult-token/issue` | `draft` (the body) | result |
| `getByCaseId` | `GET /api/consult-access/consult-token/get-by-case-id` | `caseId` (query) | result |
| `listAll` | `GET /api/consult-access/consult-token/list-all` | none | result |
| `resolve` | `POST /api/consult-access/consult-token/resolve` | `token` (body fields) | result |
| `revoke` | `DELETE /api/consult-access/consult-token/revoke` | `id` (query) | result |
| `openConsult` | `POST /api/consult-access/consult-token/open-consult` | `token` (body fields) | result |
| `previewIdentity` | `POST /api/consult-access/consult-token/preview-identity` | `linkId` (body fields) | result |
| `submitOpinion` | `POST /api/consult-access/consult-token/submit-opinion` | `token`, `draft` (body fields) | result |
| `getOpinionsByCaseId` | `GET /api/consult-access/consult-token/get-opinions-by-case-id` | `caseId` (query) | result |
| `assessOpinion` | `POST /api/consult-access/consult-token/assess-opinion` | `id`, `input` (body fields) | result |



## Batch 739: aliquots, liquid-based Pap protocols, cytospin (Pete's fluid decisions 4 to 6)

- `Decant.decantType` gains `aliquot` (a liquid portion set aside for a test, never embedded) and `Decant.aliquotPurpose` (`hpv`, `molecular`, `flow_cytometry`, `microbiology`, `other`). A protocol decant track says what it makes (`ProtocolPathway.decantType`, `aliquotPurpose`; a cell block when absent). An aliquot has no cassette colour.
- **Server data migration:** a stored `cell_block` decant that has slides and whose slides are all HPV tests (stain name starting "HPV") becomes `aliquot` with purpose `hpv` and loses its cassette colour (`utils/aliquotMigration.ts`; the demo applies it when it seeds, at Full Reset).
- `Batch.processorEquipmentId` (a Cytology Processing batch; an active Equipment record of kind `lbc_processor`), sent on the instrument order (see `INTERFACE_TRANSACTIONS.md`).
- The preparation suggestion gives two cytospin slides for a CSF or any fluid of 5 mL or less (a cell block too when the yield is high and it is not a CSF): `services/cytology/computeCytologyPrepSuggestions.ts`.


## Batch 740: the cell block hand-off (Pete's fluid decision 1)

`Decant.handoff` = `{ at, byId, byName, sourceItemId, stationId? }`, set at the Cytology Preparation bench after two scans: the cell block's source (its parent decant, or for a cell block with no parent any non-cell-block decant of the same specimen) and the cell block's own cassette (`displayId`), compared case-insensitively. Needs `cytology:cell-block:hand-off`; audited "Cell Block Handed Off To Histology". The Microtome refuses a residual fluid or aliquot (`prepareAtCytology`) and a cell block with no `handoff` (`notHandedOff`); the preparation bench refuses blocks (`cutAtMicrotome`). The server must apply the same rules (`services/cytology/cellBlockHandoff.ts`) and set `handoff` itself.


## Batch 741: Divide specimen and aliquot status (Pete's fluid decisions 2 and 3)

`Specimen.division` = `{ startingVolumeMl, dividedAt, dividedByName, aliquotIds, splitMl, remainingMl }`, once per specimen; the aliquots are decants `{ decantType: 'aliquot', aliquotPurpose, volumeMl, destination: { kind: 'department' | 'reference_lab', name, facilityId? }, aliquotStatus, aliquotStatusHistory[] }`. Refusals: `noStartingVolume`, `noRows`, `rowVolume`, `rowDestination`, `overStartingVolume`, `alreadyDivided`. Status moves forward only (`not_sent` → `sent` → `received` → `result_back`); `result_back` needs `receivingAccession` (stored, trimmed). Needs `material:specimen:divide` / `material:aliquot-status:update`; audited "Specimen Divided" / "Aliquot Status Changed". `Protocol.divisionPurposes` pre-fills the rows.
