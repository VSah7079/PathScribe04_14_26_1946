# Outbound Queue API (Batch 619, PS-800)

One queue screen for everything PathScribe sends out: results, patient ADT, accession messages, LIS sync, billing charges,
report delivery, cytology results, referrals, molecular orders and registry submissions. Browser side:
`src/services/outboundQueue/` (`IOutboundQueueService`), the screen `src/pages/OutboundQueuePage/`, reached from Home → Quality & Compliance
(`/outbound-queue`, capability `screen:outbound-queue:open`). Server version: `httpOutboundQueueService.ts`, chosen in
`outboundQueueServiceInstance.ts` (component `delivery`). Route style: HTTP_SERVICES_PATTERN.md §7.

## 1. Who owns what

PathScribe owns **what is sent and when**: the rules, the delivery schedule (`DELIVERY_SCHEDULES_API.md`), the queue, each message's status and the audit.
The interface engine owns **how**: translation, transport (REST + mTLS, SFTP, portal upload), transport retry and acknowledgements.
An acknowledgement from the engine (or a registry's rejection log) **updates the message's status here**, so this queue is the single source of truth.
The server is the owner of holds, releases, retractions and overrides; the browser lists and asks. The demo (no API server) keeps them in
`outboundHoldStore.ts` (browser storage key `outbound_holds_v1`, cleared by Demo Reset).

## 2. The common item

```json
{
  "ref": "registry:9f1c",            "feed": "registry",        "id": "9f1c",
  "destination": "registry",         "transport": "sftp",
  "kind": "seer",                    "state": "rejected",
  "queuedAt": "2026-10-01T09:00:00Z","scheduledFor": "2026-10-01T13:00:00Z",
  "attempts": 1,                     "errorCode": "DISPATCH_TIMEOUT",
  "accessionNumber": "S26-1234",     "facilityId": "fac-2",
  "hold":   { "reason": "dataCheck", "note": "…", "heldBy": "Dr Test", "heldAt": "…" },
  "closedReason": "duplicateSubmission",
  "rejection": { "errorCodes": ["E01", "E22"], "fatal": false, "correctionDueAt": "2026-10-19T00:00:00Z" },
  "deadline":  { "dueAt": "2026-10-31T00:00:00Z", "flag": "dueSoon" },
  "amendsRef": "registry:7a20",
  "billing": { "billingType": "TC", "scheduledReleaseAt": "…", "overriddenBy": "u-123", "needsReview": "unmappedCpt",
               "amendmentDelta": true, "retraction": { "reasonCode": "caseAmended" } }
}
```

* `ref` = `<feed>:<id>`, unique across feeds. Feeds: `result, patient_adt, accession, lis_sync, billing, report_delivery, cytology_result, referral, molecular_order, registry`.
* `destination` is a fixed id (`interfaceEngine, billingSystem, lisPartner, deliveryService, registry`); `transport` (`restMtls, sftp, portalUpload`) is shown as part of the destination label only.
* `accessionNumber` is the case's accession number (an identifier, shown with `data-phi`). It is sent only for feeds that name a case; patient, batch and barcode identifiers are not sent to the screen.
* `errorCode` and `rejection.errorCodes` are **fixed codes only**. The registry's or receiver's message text and locations can quote patient data and never reach this queue (the Registry Exceptions screen keeps them).
* `scheduledFor` is when the message goes: the delivery schedule's next time (`evaluateSchedule`); otherwise when it was queued.
* No names: `heldBy` is a display name for a hold (staff are not patient PHI); `billing.overriddenBy` and the audit text carry a user **id**, never a name.

### States

| State | Meaning | Actions allowed |
|---|---|---|
| `waiting` | queued, goes at its scheduled time | hold; billing: retract, release now |
| `held` | a person stopped it | release; billing: retract, release now |
| `sent` | the engine has it | none |
| `acknowledged` | the receiver confirmed (engine acknowledgement) | none |
| `failed` | a send failed; retries remain | hold, retry; billing: retract |
| `deadLettered` | failed past its automatic retries | retry; billing: retract |
| `rejected` | a registry returned it with validation errors | retry (fix and resubmit, with a reason), mark not reportable |
| `notReportable` | closed by a person after a rejection | none (terminal) |
| `retracted` | a queued charge cancelled before release because the case was amended or retracted | none (terminal) |

Precedence when several apply: closed (`notReportable`, `retracted`) → `rejected` → `sent`/`acknowledged` → `held` → `failed`/`deadLettered` → `waiting`.
A sent message is never shown held.

### Registry rejections

A central registry answers a submission with an acknowledgement. When it carries validation errors the **server/engine acknowledgement updates the
entry to `rejected`**: `rejection.errorCodes` (sorted, no text), `fatal` (the registry will not take a resubmission as it is) and `correctionDueAt`
(from the registry; the demo allows 14 days from the acknowledgement). The rejected item waits for a coder or pathologist:

* **fix and resubmit** = `retry` with a `reason` (`dataCorrected, codingCorrected, pathologistCorrected, other`). A rejected item without a reason is refused `reasonRequired`. The entry goes back to `waiting` and its rejection clears.
* **mark not reportable** = `markNotReportable` with a reason (`notReportableCondition, outsideJurisdiction, duplicateSubmission, other`). Terminal.

### Reporting deadlines

`deadline.dueAt` is sign-out plus the schedule's `reportingDeadlineDays` (facility override else enterprise else default). The status comes from
`deadlineStatus()` in `services/deliverySchedules/deliverySchedule.ts` and is not re-implemented: `ok` → `ok`, `near` (within 3 days) → `dueSoon`, `overdue` → `overdue`.
Only open messages (`waiting, held, failed, deadLettered, rejected`) are flagged. The list is sortable by `deadline` (overdue first) and filterable by flag; `deadlineCounts` feeds the counts tile.

### Amended reports

An amended report that the schedule re-queues (`amendmentRequeues`) is a **new item** with `amendsRef` naming the item it amends. The original keeps its state.

## 3. Routes

All `POST` (the arguments include lists or objects). Answers use the `ServiceResult` shape; failures are the fixed codes of HTTP_SERVICES_PATTERN.md §4.

| Method | Route | Body | Answer |
|---|---|---|---|
| `list` | `POST /api/delivery/outbound-queue/list` | `{ filter, sort }` | `{ items, counts, deadlineCounts, billingCounts, facilityIds }` |
| `hold` | `POST /api/delivery/outbound-queue/hold` | `{ refs, reason, note? }` | `{ results: [{ ref, ok, refusal? }] }` |
| `release` | `POST /api/delivery/outbound-queue/release` | `{ refs }` | `{ results }` |
| `retry` | `POST /api/delivery/outbound-queue/retry` | `{ refs, reason? }` | `{ results }` |
| `markNotReportable` | `POST /api/delivery/outbound-queue/mark-not-reportable` | `{ refs, reason, note? }` | `{ results }` |
| `retract` | `POST /api/delivery/outbound-queue/retract` | `{ refs, reason }` | `{ results }` |
| `overrideRelease` | `POST /api/delivery/outbound-queue/override-release` | `{ refs }` | `{ results }` |

`filter` = `{ feeds?, states?, deadlines?, facilityIds?, search?, needsReview? }` (`search` matches the accession number; an item with no known facility appears only when `facilityIds` is absent).
`sort` = `{ key: state | deadline | scheduledFor | queuedAt | feed | attempts, direction }`. `counts` are per state over the feed, facility, search and review filters but **not** the state filter.
The server applies the caller's facility scope on top of `facilityIds`.

A bulk action checks its capability **once** for the selection, then answers **one result per ref** (a refusal for one does not stop the rest). Refusals: `notPermitted, notFound, notHoldable, notHeld, notRetryable, notRejected, notRetractable, notReleasable, reasonRequired, failed`.
A write that changes nothing is not audited. A hold reason outside the list is stored as `other`; a note is cut to 200 characters and must carry no patient detail.

## 4. Capabilities and audit

| Action | Capability | Audit event (no patient text) |
|---|---|---|
| view the screen | `screen:outbound-queue:open` | – |
| `hold` | `interface:outbound:hold` | `OUTBOUND_MESSAGE_HELD` (feed, reason; not the note) |
| `release` | `interface:outbound:release` | `OUTBOUND_MESSAGE_RELEASED` |
| `retry` | `interface:outbound:resend` | `OUTBOUND_MESSAGE_RETRIED` / `OUTBOUND_MESSAGE_RESUBMITTED` (error-code count and reason) |
| `markNotReportable` | `interface:outbound:mark-not-reportable` | `OUTBOUND_MESSAGE_NOT_REPORTABLE` (reason) |
| `retract` | `interface:outbound:retract` | `OUTBOUND_CHARGE_RETRACTED` (billing type, reason) |
| `overrideRelease` | `interface:outbound:override-release` | `OUTBOUND_CHARGE_RELEASE_OVERRIDDEN` |

Each audit entry carries the accession number and facility, the acting user's display name in `user`, and no other identifier. All are high risk and seeded to Admin (AUTHORIZATION_API.md).
The Audit Log → Interfaces → Outbound view and the browser's Dispatch Now / Retry refuse a held message (`onHold`); the server's dispatcher must skip held messages too.

## 5. Billing feed adapter

Billing release runs through this queue. A billing implementation plugs in by supplying `IBillingFeedAdapter` (`billingFeedAdapter.ts`); the queue does not change.

```ts
interface IBillingFeedAdapter {
  listBillingItems(): Promise<OutboundFeedEntry[]>;                         // every charge, with its `billing` detail
  hold(id, reason, note, heldBy): Promise<boolean>;                         // stop it going out; false if gone or already sent
  release(id, options?: { overriddenBy?: string }): Promise<boolean>;       // un-hold; with overriddenBy (a user id), release NOW ahead of schedule
  retry(id): Promise<boolean>;                                              // failed → waiting
  retract(id, reason, retractedBy): Promise<boolean>;                       // cancel before release; terminal
}
```

Billing item detail (all optional): `billingType` (`TC`, `26`, `Global`); `scheduledReleaseAt` (from `resolveDeliverySchedule` + `evaluateSchedule`); `overriddenBy` (user id); `needsReview` (`unmappedCpt`, `missingTechnicalFacility`, `amendmentDelta`: parked for a person);
`amendmentDelta` (a delta charge from an amended case, always routed to review); `retraction.reasonCode` (`caseAmended, caseRetracted, duplicateCharge, other`).
The adapter reports them; the queue shows them, counts `needsReview` and `amendmentDelta` (`billingCounts`) and never works them out. The technical charge and the professional -26 line of PS-336 are two items with their own `billingType` and schedule.
The demo's adapter reads the existing charge queue and keeps hold, override and retraction in the hold store.

## 6. Tests

`outboundQueueView.test.ts` (states, filter, sort, counts, deadlines, billing fields), `outboundQueueService.test.ts` (every action, capability refusal, bulk results, audit text, registry resubmit, billing retract/override),
`registryFeedAdapter.test.ts`, `billingFeedAdapter.test.ts`, `scheduleBinding.test.ts`, `httpOutboundQueueService.test.ts` (verb, path and body of every method), `OutboundQueuePage.test.tsx`.
