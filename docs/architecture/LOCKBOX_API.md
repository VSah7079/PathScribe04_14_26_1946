# Lockbox Drop-Off API (Batch 645)

After-hours specimens are dropped in a lockbox. A person (often not an accessioner) scans each container at a kiosk and a receipt is written; in the
morning the accessioning team works from the Overnight folder. Browser side: `src/services/lockbox/` (`ILockboxService`), the screen
`src/pages/LockboxDropOffPage/` (route `/lockbox-drop-off`, Home tile "Lockbox Drop-Off", capability `screen:lockbox-drop-off:open`). Server
version: `httpLockboxService.ts`, chosen in `lockboxServiceInstance.ts` (component `lockbox`). Route style: HTTP_SERVICES_PATTERN.md §7.

**What is built:** the screen, the service (interface, shared logic, demo version, server-version client), the capabilities and their seeds, the actions,
the tests. **Demonstration only:** the demo version runs the same logic in the browser, so "server time" is the browser clock and "the token's user" is the
signed-in session; append-only, the 409 and the capability checks are followed but nothing enforces them until the API server implements this contract.
**Not built:** the API server itself, and a device-bound kiosk sign-in (a lockbox tablet that holds a limited token and cannot open anything else). Today the
kiosk is the ordinary screen under an ordinary sign-in.

## 1. The contract the server must keep

1. **The server stamps the time and the user.** `receivedAt` (receipts) and `at` (entries) are the server's clock; `receivedBy` and `by` come from the
   token. A time or a user in a request body is **ignored**, not rejected. The only time a person supplies is `placeholder.reportedDropAt` (below), and it
   never replaces `receivedAt`.
2. **Append-only.** A receipt is written once and never updated or deleted. What happens later is a new `LockboxResolution` entry (a placeholder linked, or
   accessioned). There is no update or delete route and none may be added.
3. **A duplicate barcode is a `409`.** One receipt per normalised barcode. A second `receive-specimen` for the same barcode writes nothing and answers
   `409` with `{ "code": "CONFLICT", "receipt": <the earlier receipt> }`. The browser's client keeps only the code, so the screen then calls
   `lookup-barcode`, which answers `{ kind: "duplicate", receipt }`; the earlier receipt is what the person sees.
4. **Capabilities are checked on every call**, on the server, whatever the browser hid (AUTHORIZATION_API.md). Missing capability: `403`, code `NOT_PERMITTED`.
5. **Audit entries carry no patient data** (section 5).
6. **The server decides the state** (section 2). Placeholder details in a request are used only when no order matches.
7. **No identifiers in a URL.** The barcode, receipt id and accession number go in the body of a `POST`. The one `GET` takes no arguments.
8. **Errors:** an upper-case `code` in the body (`^[A-Z][A-Z0-9_]{1,39}$`), never message text. Codes in section 4.

## 2. The records

```json
{
  "id": "lbx-…",            "barcode": "FGH-ORD-1",
  "state": "matchedOrder",  "receivedAt": "2026-10-21T02:00:00.000Z",
  "receivedBy": { "userId": "u-12", "userName": "Night Tech" },
  "urgent": true,           "callbackNumber": "520-555-0100",
  "accessionNumber": "FGH-ORD-1", "orderId": "ord-77", "facilityId": "fac-2", "facilityName": "Fenwick General Hospital"
}
```

A placeholder receipt has `state: "placeholder"`, `placeholderId` (such as `LBX-PH-20261021-001`: the prefix, the server's date, a counter that restarts each
day) and, when the person gave them, `facilityId`/`facilityName` (from the client dictionary), `clientFreeText` (a client that is not listed, at most 120 characters),
`physicianId`/`physicianName` (from the physician dictionary) and `reportedDropAt`. It has **no `accessionNumber`**.

* **State A, `matchedOrder`:** a pending order (order intake: status pending) has `externalOrderNumber` equal to the barcode, or a specimen whose `containerBarcode`
  equals it, compared after normalising (below). If several match, the oldest. The receipt holds the order's accession number (`externalOrderNumber`), the order id
  and the ordering facility. **No patient name, date of birth, MRN or other patient field is read into the receipt, returned by `lookup-barcode` or shown by the kiosk.**
* **State B, `placeholder`:** no order matches, or the barcode is unknown. Never a failure: the drop is recorded so chain of custody starts at the lockbox. It follows
  the downtime / temporary-identity pattern (a flagged temporary record, later bound to the real one with an audit entry) but holds no patient at all, and **a real accession
  number is never minted**. The real number is attached later by `resolve-placeholder`.
* **State C, urgent:** `urgent: true` on either state tags the receipt high priority (shown first in the Overnight folder). `callbackNumber` is kept only when `urgent`
  is true and must look like a phone number (digits, spaces and `+ - ( ) . # * x`, 3 to 24 characters), else `INVALID`.
* **Barcode normalisation:** scanner control characters and spaces removed, upper-cased, at most 64 characters; nothing left is `INVALID`.
* **`reportedDropAt`** (placeholder only): an ISO instant, not more than 5 minutes after the server's clock and not more than 7 days before it, else `INVALID`. A placeholder's waiting
  time counts from it when it is earlier than `receivedAt`.

`LockboxResolution`: `{ id, receiptId, kind: "placeholderResolved" | "accessioned", at, by, accessionNumber?, orderId? }`.

## 3. Routes

Base `/api/lockbox/lockbox-drop-off`. Answers use the `ServiceResult` shape; failures are fixed codes.

| Method | Route | Body | Capability | Answer |
|---|---|---|---|---|
| `lookupBarcode` | `POST .../lookup-barcode` | `{ barcode }` | `lockbox:specimen:receive` | `{ kind: "duplicate", receipt }`, `{ kind: "matchedOrder", accessionNumber, facilityId?, facilityName? }` or `{ kind: "unmatched" }` |
| `receiveSpecimen` | `POST .../receive-specimen` | `{ barcode, urgent?, callbackNumber?, placeholder?: { facilityId?, clientFreeText?, physicianId?, reportedDropAt? } }` | `lockbox:specimen:receive` | the `LockboxReceipt`; `409` if the barcode already has one |
| `getFolder` | `GET .../get-folder` | none | `lockbox:folder:review` | `{ entries, summary, asOf }` |
| `markAccessioned` | `POST .../mark-accessioned` | `{ receiptId }` | `lockbox:folder:review` | the new `LockboxResolution` |
| `accessionReceiptForCase` | `POST .../accession-receipt-for-case` | `{ caseId, orderId?, accessionNumber?, receiptId? }` | `lockbox:folder:review` | the new `accessioned` `LockboxResolution` (with `caseId`), or `null` when no open receipt belongs to the case |
| `resolvePlaceholder` | `POST .../resolve-placeholder` | `{ receiptId, accessionNumber }` | `lockbox:placeholder:resolve` | the new `LockboxResolution` |

* **`lookupBarcode` writes nothing.** It exists so the kiosk can choose between receiving at once (state A), asking for placeholder details (state B) and showing an
  earlier receipt. A barcode that already has a receipt is always `duplicate`, even if an order has since arrived for it.
* **`getFolder`** lists receipts with no `accessioned` entry, ordered **urgent first, then oldest first** (a placeholder is aged from its `reportedDropAt` when earlier), each as
  `{ receipt, status, linkedAccessionNumber?, dwellMinutes }` with `status` `matched`, `placeholderOpen` (not linked) or `placeholderLinked`; `dwellMinutes` is measured to `asOf`.
  `summary` is the QA time-to-receipt: `{ accessionedCount, medianMinutes, meanMinutes, maxMinutes, urgentAccessionedCount, urgentMedianMinutes, waitingCount, oldestWaitingMinutes }`,
  drop to the `accessioned` entry, in whole minutes (null when there is nothing to measure).
* **`markAccessioned`** is refused with `PLACEHOLDER_UNRESOLVED` until a placeholder has been linked, and with `ALREADY_ACCESSIONED` the second time. The Accession screen itself is
  reached by a plain link; it does not take a prefill (a decision recorded in section 6).
* **`accessionReceiptForCase`** (Batch 652) is called when a case is created from a pending order. The server finds the open receipt (by `receiptId` if given, else by `orderId`, else by `accessionNumber`, on the receipt or on the entry that linked a placeholder), writes `Case.lockboxReceiptId`, appends the `accessioned` entry with `caseId`, and audits "Lockbox receipt linked to case", all in one transaction (the case write first: if it fails nothing is recorded). No open receipt is a normal `null` answer; an explicit `receiptId` that is not open is `NOT_FOUND`. A placeholder that has not been linked is never matched. `markAccessioned` stays for manual use.
* **`resolvePlaceholder`** trims and upper-cases `accessionNumber` (up to 64 characters; empty is `INVALID`); if it equals a pending order's number the entry also records `orderId`.
  It adds a `placeholderResolved` entry and does not edit the receipt. A second link is `CONFLICT`; a matched receipt is `NOT_A_PLACEHOLDER`.

## 4. Refusal codes

| Code | HTTP | Meaning |
|---|---|---|
| `NOT_PERMITTED` | 403 | the capability is not held |
| `INVALID` | 400 | unusable barcode, callback number, accession number or drop time |
| `NOT_FOUND` | 404 | no such receipt |
| `CONFLICT` | 409 | the barcode already has a receipt (body includes it), or a placeholder is already linked |
| `ALREADY_ACCESSIONED` | 409 | the receipt already has an `accessioned` entry |
| `PLACEHOLDER_UNRESOLVED` | 409 | accession was asked for a placeholder with no linked number |
| `NOT_A_PLACEHOLDER` | 409 | link was asked for a receipt that matched an order |

`SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT` and `UNAVAILABLE` come from the shared client as in HTTP_SERVICES_PATTERN.md §4.

## 5. Capabilities and audit

| Action | Capability | Audit event | Audit detail (literal English, no patient text) |
|---|---|---|---|
| lookup, receive | `lockbox:specimen:receive` | `Lockbox specimen received` (receive only) | `Received in lockbox, matched to a pending order. Receipt <id>.` or `Received in lockbox, placeholder <placeholder id>, urgent. Receipt <id>.` |
| mark accessioned | `lockbox:folder:review` | `Lockbox specimen accessioned` | `Marked accessioned from the Overnight folder. Receipt <id>.` |
| link a placeholder | `lockbox:placeholder:resolve` | `Lockbox placeholder resolved` | `Placeholder <placeholder id> linked to a pending order. Receipt <id>.` or `... linked to an accession number. Receipt <id>.` |
| open the screen / tab | `screen:lockbox-drop-off:open` / `lockbox:folder:review` | – | – |

Each entry's `user` is the staff member's display name, `facilityId` the receipt's facility when known, and `caseId` the accession number once there is one (a matched receipt, or a linked placeholder); otherwise null.
**The barcode, callback number and free-text client are never written to the audit text.** All three action capabilities are high risk (every check audited, allowed or denied).

Seeds (`capabilitySeeds.ts`): **Accessioner** all four (the morning team that picks up the folder, and the people who scan in on nights); **Admin** the screen and `lockbox:folder:review` only
(oversight and the QA figures; not receiving or linking); **Pathologist, Fellow, Resident, PA, Histotechnologist, Cytotechnologist, Molecular Technologist, Lab Director, QA Reviewer and hospital
roles: none** (a pathologist does not receive or accession specimens; a lab group can add it to a role in the Role editor). Custom roles are not offered the screen automatically. The role actions
follow (`defaultActionGrants.ts`).

## 6. Decisions and limits

* **What the barcode matches.** The pending-order list has no container barcode or accession number of its own, so a scan matches `externalOrderNumber` and the optional
  `containerBarcode` of an order's specimens (added to `IncomingOrderSpecimen`). "Accession number" on the kiosk is the order's `externalOrderNumber`, the number a lab already
  uses to find the order.
* **Kiosk scans.** The scan field keeps focus; the global scan handlers (material tracking and default-action-on-scan) skip this route so a scan does one thing.
* **Accession link, no prefill.** The Accession screen takes no prefilled order, so "Open Accession" navigates to it and the person imports the order there. Prefilling would touch a file
  of over 5,000 lines and is left open.
* **Reported drop time.** Kept apart from `receivedAt` and validated, so a wrong typed time cannot move the receipt's own time.
* **Demo storage.** Receipts and entries use the keys `lockbox_receipts_v1` and `lockbox_resolutions_v1` (mock storage; cleared by Demo Reset; in memory only with an API server).
