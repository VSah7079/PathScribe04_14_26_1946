# services/delivery/

Component C of the "Decoupled Dispatch & Print Management System" spec — the Delivery Configuration Rules Engine. Decides, for a given real release, whether it goes out electronically, physically, both, or neither, before either real subscriber (electronic dispatch in `services/reports/`, print in `services/printing/`) ever runs.

**Pattern:** standard interface/mock pattern for the rules themselves (`IDeliveryRuleService`/`mockDeliveryRuleService`), plus two pure resolver functions kept deliberately separate from each other and from the data layer.

## What's real and built

- **`types/delivery/DeliveryRule.ts`** — the rule shape. All four real criteria the source spec names (Provider ID, Ordering Facility, Patient Location, Report Type) are optional on a rule — an unset criterion is a wildcard, never a mismatch. `action` is exactly the source spec's own four options: `ELECTRONIC_ONLY | PRINT_ONLY | DUAL | SUPPRESS`. Checked directly before building this type: `services/routingRules/RoutingRule` (template routing's own rule shape) maps one entity dimension to one target — a genuinely different, incompatible shape from a rule combining up to four criteria to one of four actions, so this is a new type, not a forced reuse.
- **`IDeliveryRuleService.ts` / `mockDeliveryRuleService.ts`** — real CRUD for admin-defined rules, `localStorage`-backed like every other mock service in this app.
- **`resolveDeliveryAction.ts`** — the pure, testable resolver. Real, most-specific-wins scoring, same precedence convention `services/reportTemplates/TemplateRoutingService.ts`'s own passes already establish: a rule disqualifies itself the moment any criterion it specifies doesn't match the real input; the rule matching the most real criteria among the remaining, qualifying ones wins; ties broken by whichever was updated more recently. Defaults to `ELECTRONIC_ONLY` — the source spec's own stated default ("Default for EHR-integrated providers") — only when no real, active rule qualifies at all. 10 tests, including the source spec's own Use Case 2 (a facility-scoped rule) and Use Case 3 (an OR/Preliminary-scoped rule) as direct scenarios.
- **`resolveRealDeliveryDecision.ts`** — resolves the real, live criteria for an actual case (`Case.order.orderingPhysicianId`/`facilityId`, and — the one criterion with no obvious source — `pointOfCare`, which turned out to already exist as `Location.pointOfCare`, HL7 PV1-3.1, reachable via the case's own `order.locationId`; no new `Case` field was needed for this engine at all) and hands them to the pure resolver above, never duplicating its matching logic. 5 tests.

## Where this is wired in

`services/reports/publishReportReleasedEvent.ts` calls `resolveRealDeliveryDecision` **before** either real subscriber (electronic dispatch, print) runs at all, then gates both behind the resolved action — `ELECTRONIC_ONLY`/`PRINT_ONLY` run exactly one subscriber, `DUAL` runs both concurrently (`Promise.all`, not sequential), `SUPPRESS` runs neither (the event is still logged — suppressed means no dispatch, never "this release never happened"). See `services/reports/README.md`'s own entry on `publishReportReleasedEvent.ts` for the full account, including a real bug found and fixed there: a transient failure resolving the delivery decision itself must degrade to the same `ELECTRONIC_ONLY` default, never abort the whole publish call and block both real subscribers over an incidental lookup failure.

## Real, deliberate scope not yet built

- **Closed — stale claim corrected.** This line previously said no admin UI existed. Found, while addressing an external release-readiness review, that this was no longer true and had gone uncorrected: **`components/Config/System/DeliveryRulesSection.tsx`** is a real, wired admin UI (rule table, Add/Edit modal, live Test panel calling `resolveDeliveryAction.ts` directly), registered under `'delivery_rules'` in the System tab. It predates this correction — the README simply never caught up with the actual codebase. `services/printRouting/README.md`'s own equivalent gap for `PrintRoutingRule` is now closed the same way (`PrintRoutingRuleSection.tsx`), copying this file's exact three-part pattern.
- **This engine itself applies to every real source uniformly** — it runs inside `publishReportReleasedEvent.ts` at the event level, before any source-based branching, so a Cytology or Autopsy release is gated by the same real rules as Surg Path. Cytology's own former gap, its lack of an amendment mechanism, has since been closed (`services/cytology/releaseCytologyCorrection.ts`, `releaseCytologyAddendum.ts`, `dispatchCytologyAmendedCaseInstance.ts`; see `services/cytology/README.md`) — it was never something this engine itself was missing.

*Corrected in the Batch 496 README audit (Oct 9, 2026): Cytology now has corrections and addenda; the line said it had no amendment mechanism.*

## Batch 428: Configuration permissions

- `mockDeliveryRuleService`: `create`, `update`, `remove` need `config:delivery-rules:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

## Batch 520 (PS-280): channels by role, e-fax and file drop

- **Channel plans** (`deliveryPlan.ts`, new, pure). A rule's `channels` sets each of electronic, print, e-fax and file drop as primary, secondary, fallback or off:
  - primary and secondary go at once;
  - fallback goes only when a primary print, fax or file drop fails or has nowhere to go;
  - a rule from before Batch 520 has only `action`, and its plan follows it, so nothing configured earlier changes;
  - `action` is kept in step with the plan for older readers.
  The resolver (`resolveDeliveryAction.ts`) hands back the winning rule's plan, fax number and file-drop target.
- **E-fax and file drop** (`deliverReport.ts`, new). Each delivery is queued (`mockReportDeliveryQueueService.ts`, new; Full Reset clears it) and sent to the interface server as `REPORT_DELIVERY`, which delivers it (`functions/report_delivery.py`; contract `docs/architecture/REPORT_DELIVERY_API.md`). The entry is marked sent or failed with the server's reason, and a failure can be resent from Audit Log → Interfaces → Outbound.
  - The fax goes to the rule's number, else the ordering physician's, else the ordering facility's. With none, the entry fails saying so, and a resend looks again.
  - The PDF is the release's own, or the case's signed report (for cytology, rebuilt from its sign-out record). It isn't stored in the queue.
  - Real services are wired in `reportDeliveryDeps.ts`.
- **Known limit.** The electronic channel reports through its own result queue, so a failed result message doesn't trigger a fallback (it shows, and is resent, in the Outbound view as before). Retries at intervals before falling back are PS-281.
- **Tests.** `deliveryPlan.test.ts`, `deliverReport.test.ts`.

## Batch 521 (PS-281): retries, dead-letter, confirmation

- **Retries** (`deliveryRetryPolicy.ts`, `deliveryRetries.ts`, new).
  - A failed print job, e-fax or file drop from a release is retried after each of the lab's waits (default 1, 5, 15 minutes; `mockDeliveryRetrySettingsService.ts`, saving needs `config:delivery-rules:manage`).
  - A sweep makes each retry when it falls due: `runDeliveryRetrySweep`, every 30 seconds while someone is signed in (`deliveryRetryDeps.ts` → `startDeliveryBackgroundWork`, mounted by the app shell). Overlapping sweeps run once.
  - Records: `mockDeliveryRetryService.ts`; Full Reset clears them.
- **Dead-letter.** After the last retry:
  - the entry is marked "retries exhausted";
  - it is listed in the delivery exception queue (Outbound view);
  - active Admin and Lab Director staff are messaged;
  - a primary channel's release falls back, once per release (`sendReleaseFallback` in `services/reports/publishReportReleasedEvent.ts`).
  A delivery resent by hand meanwhile counts as delivered.
- **Changed from Batch 520.** A primary channel that **fails** now falls back only after its retries run out; one with **nowhere to go** still falls back at once (`deliveryPlan.fallbackChannels`).
- **Fax confirmation.** A `ReportDeliveryStatus` from the server (TRANSMITTED / TRANSMISSION_FAILED) confirms the fax, or fails it into the retries (`applyReportDeliveryStatus`).
- **Print.** Automatic retries use `retryPrintJobAutomatically` (`services/printing/redispatchPrintJob.ts`); no person acts, so no person's permission applies.
- **Tests.** `deliveryRetries.test.ts`, `mockDeliveryRetrySettingsService.test.ts`.


## Batch 538

`deliverReport.ts`: a resend reads the release's own document (`release.documentId`, through `ReportDeliveryDeps.documentPdf`). Before:
- a correction's resend sent the case's newest signed PDF, which is the pre-correction sign-out;
- a preliminary's resend was held for good.

`REPORT_DELIVERY` now carries `reportDocumentId` and `pdfSha256`, and `markSent` records the hash (also in the audit text).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 532

`reportDeliveryDeps.ts`: a cytology delivery's PDF is the consolidated case report. Before, it rebuilt the newest sign-out record on the case, which could be another specimen's.

## Batch 546

`scheduleDeliveryRetry` takes `retriable: false` for a failure retrying can't help (a network print attempted from the browser, F3). Such a delivery is dead-lettered at once: marked, the fallback sent (once per release), and Admin and Lab Director alerted.

## Batch 556 (PS-539 phase 2d: report documents through the API)

- Batch 556: a delivery's stored document is read through `reportDocuments/reportDocumentInstance.ts` (the API server's store when there is one).

## Batch 617 (part B): server version (PS-514)

The delivery rule, retry setting and retry services now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are in `docs/architecture/DELIVERY_PRINTING_API.md`.

## Batch 728

- `deliverReport.ts`: a research case's report is not delivered by fax or file drop (`not_configured`, nothing queued).
