# services/lockbox/

**Batch 648: demo seed.** `lockboxDemoSeed.ts` (`buildLockboxDemoSeed(now)`, pure) builds six receipts and two resolutions with every time counted back from the clock: matched routine, matched urgent with a callback number, matched and already accessioned, placeholder urgent, placeholder routine with a free-text client, and a placeholder already linked to its order. `mockLockboxService.ts` writes them the first time the store is read or written; Demo Reset removes both keys (the mock-prefix sweep), so the next read builds a fresh set. Two pending orders (`WSSC-ORD-71058`, `WSSC-ORD-71075`) are deliberately left without a receipt for live scanning (`LOCKBOX_DEMO_LIVE_BARCODES`). Seeds hold no patient data and are never used with the API server. Test: `lockboxDemoSeed.test.ts` (states, folder order, ids, no patient fields, agreement with the order seeds, and a reset that restores the seed).

Batch 645: **Lockbox Drop-Off.** Specimens dropped in a lockbox after hours are scanned in at a kiosk, which writes a permanent "Received in Lockbox" receipt; the morning team works from the Overnight folder. Contract for the API server: `docs/architecture/LOCKBOX_API.md`. Screen: `pages/LockboxDropOffPage/`.

| File | What it is |
|---|---|
| `ILockboxService.ts` | The interface: `lookupBarcode`, `receiveSpecimen`, `getFolder`, `markAccessioned`, `resolvePlaceholder`. No time or user in any parameter: the server stamps both. |
| `lockboxTypes.ts` | `LockboxReceipt` (state `matchedOrder` or `placeholder`), `LockboxResolution`, `LockboxLookup`, folder and QA types, `LockboxRefusal` codes. |
| `lockboxRules.ts` | Pure decisions, all unit tested: barcode and callback number normalising, matching a pending order, what a scan means (earlier receipt, order, unknown) and the kiosk step it leads to, drop-time validation, placeholder ids, building a receipt, waiting time, the folder order (urgent first, then oldest), the QA time-to-receipt figures, and what may be done to a receipt. |
| `lockboxService.ts` | `createLockboxService(deps)`: the logic with every dependency passed in (authorization, store, pending orders, dictionaries, clock, user, audit), so tests need no module mocks. Checks the capability first in every method (literal `enforce(...)` calls) and audits with no patient data. |
| `mockLockboxService.ts` | The demo: the logic above wired to order intake, the facility and physician dictionaries, the audit and authorization services and the session user. Append-only storage (`lockbox_receipts_v1`, `lockbox_resolutions_v1`, via `mockStorage`, cleared by Demo Reset). Dependencies load on first use. |
| `httpLockboxService.ts` | The API server's version, from `buildHttpService`. Base `/api/lockbox/lockbox-drop-off`; every identifier is in a POST body; only `get-folder` is a GET. |
| `lockboxServiceInstance.ts` | `chooseService('lockbox', mock, createHttpLockboxService)`. |

**Rules kept here.** The server stamps `receivedAt` and `receivedBy` from its clock and the token; a body's version of either is ignored. Receipts are append-only: linking a placeholder and accessioning are new entries. A barcode has one receipt (a second write is `CONFLICT`, 409, and the screen shows the earlier one). No patient name, date of birth or MRN is read into a receipt or returned by a lookup; a barcode with no pending order becomes a placeholder and **never gets a real accession number**. Audit text is literal English and holds no patient data, barcode or callback number.

**Demonstration only:** the demo's "server time" is the browser's clock and its "token user" is the signed-in session. Not built: the API server, and a device-bound kiosk sign-in.

Tests: `lockboxRules.test.ts` (pure rules), `lockboxService.test.ts` (the three scan outcomes, urgent, duplicate, capabilities on every call, folder, both actions, audit text), `mockLockboxService.test.ts`, `httpLockboxService.test.ts` (routes, no identifier in a URL, fixed refusal codes).

## Batch 652 — Specimen pipeline gaps

- **`accessionReceiptForCase`** (`lockbox:folder:review`): when a case is accessioned from a lockbox receipt's order, finds the open receipt (receipt id, order id or accession number), writes `Case.lockboxReceiptId`, appends the `accessioned` entry with `LockboxResolution.caseId`, and audits "Lockbox receipt linked to case", in one call. `findReceiptForCase` is the pure match. No open receipt is `ok(null)`. The manual `markAccessioned` stays. Contract: `docs/architecture/LOCKBOX_API.md`. Test: `lockboxCaseLink.test.ts`.

`accessionLinkForReceipt` (Batch 659): the Accession link that carries the receipt's order.
