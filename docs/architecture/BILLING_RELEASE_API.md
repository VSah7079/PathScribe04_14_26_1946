# Billing release rules: the API server's calls (PS-800)

Batch 619. A charge is **generated** at its milestone (Billing Type Trigger: technical at grossing, professional -26 and Global at final sign-out, PS-336). These rules decide when a generated charge is **released** from the Outbound Queue to the billing interface or clearinghouse. PathScribe owns what and when; the interface engine owns how (translation, transport, retries, acknowledgements). Rules are set at the **enterprise** level and a **performing facility** may have its own.

Browser side (built): `services/billingRelease/` (`billingRelease.ts` rules, `IBillingReleaseService`, mock, `httpBillingReleaseService.ts`, instance, `billingReleaseFeed.ts`) and Configuration > System > Billing Release. Capability: `config:billing-release:manage` (high risk; Admin and Lab Director). Route style: `HTTP_SERVICES_PATTERN.md` §7. A refusal is a fixed code (`NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `422` with problem codes); the server decides permission and audits every change (rule id, facility, billing type only; no patient data). Nothing here was tried against a real server.

## Service `IBillingReleaseService`

`/api/billing-release/billing-release`

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/billing-release/billing-release/get-all` | none |
| `getForFacility` | `GET /api/billing-release/billing-release/get-for-facility` | `facilityId` (query) |
| `set` | `POST /api/billing-release/billing-release/set` | `{ id?, facilityId, criteria, action }` (body); no `id` creates, an `id` replaces (`NOT_FOUND` when unknown) |
| `remove` | `POST /api/billing-release/billing-release/remove` | `{ id }` (body) |

## Rule

| Field | Meaning |
|---|---|
| `facilityId` | null = enterprise rule; a facility id = that performing facility's own rule |
| `criteria.billingType` | `TC`, `26`, `Global`, or null (any) |
| `criteria.caseTypes` | specimen categories / case types; empty = every kind |
| `criteria.orderingSiteId`, `criteria.primaryPathologistId` | null = any |
| `criteria.amendment` | `any`, `original`, `amended` |
| `action.releaseMode` | `DYNAMIC_WITH_HOLD` or `SCHEDULED_BATCH` |
| `action.holdDurationMinutes` | DYNAMIC_WITH_HOLD: minutes after the milestone (0 = at once; 0 to 43,200) |
| `action.batchSchedule` | SCHEDULED_BATCH: a delivery schedule of kind `batch` (`DELIVERY_SCHEDULES_API.md`); the spec's `batchScheduleCron` is its cron view for a plain daily or weekly batch at one time (e.g. `0 22 * * 1,2,3,4,5`) |
| `action.autoReleaseOnComplete` | false = never goes on its own; a person releases it from the queue |
| `action.manualReviewRequired` | an unmapped CPT code or a missing technical-component facility parks the charge for review |

The spec's `BillingReleaseSchedule { siteId, billingType, releaseMode, holdDurationMinutes, batchScheduleCron }` is a view of one rule (`toReleaseSchedule`).

Problem codes on a refused `set`: `billingTypeInvalid`, `modeInvalid`, `holdInvalid`, `batchRequired`, `amendmentInvalid`, `caseTypesInvalid`, plus the schedule problems of `DELIVERY_SCHEDULES_API.md` for the batch.

## How the server must decide (the browser's `decideRelease` is the reference)

1. **Rule:** among the enterprise rules and the charge's performing facility's rules whose criteria match, take the most specific; a facility rule outranks any enterprise rule; ties by id. Specificity: facility 100, billing type 8, case types 4, ordering site 4, pathologist 2, amendment 1. No match: release at the milestone, review on, auto-release on.
2. **Review first:** the delta charge of an amended report is always `needsReview: amendmentDelta`. Otherwise, with `manualReviewRequired`: unmapped CPT -> `unmappedCpt`; split case with no technical-component facility -> `missingTechnicalFacility`. A charge in review is `HELD` until a person releases or retracts it.
3. **Manual:** `autoReleaseOnComplete` false -> `HELD` until a person releases it.
4. **Timing:** from the milestone: a TC charge from its generation, the others from final sign-out (until then `HELD`, awaiting sign-out). DYNAMIC_WITH_HOLD: due at milestone + hold. SCHEDULED_BATCH: due at the first batch run after the milestone (cutoff and blackout dates as in the delivery schedules).
5. **Release status** shown on a billing item: `QUEUED` (due; goes on the next sweep), `HELD`, `RELEASED` (sent), `RETRACTED`, `FAILED`.

## Outbound Queue billing feed

The Outbound Queue (`OUTBOUND_QUEUE_API.md`) shows billing charges with: `billingType`, `scheduledReleaseAt`, `needsReview`, `amendmentDelta`, `overriddenBy` (user id) and, once cancelled, state `retracted` with a reason code. The server's billing feed fills these from the rules above. The browser plugs in through `IBillingFeedAdapter` (`listBillingItems`, `hold`, `release`, `retry`, `retract`), wrapped by `withBillingRelease`.

- **Override:** a person with `interface:outbound:release` can release a held charge ahead of its rule; the server records `overriddenBy` (user id) and an audit entry naming the feed and fixed reason, never a name or patient text.
- **Amendment or retraction:** when a case is amended or retracted, the server retracts the case's charges that have not been sent (reason `caseAmended` or `caseRetracted`; terminal; audited), and corrects the ones already sent through the existing credit flow (a credit for the old charge and a new charge). The new charge is a delta charge: it arrives in review (`amendmentDelta`).
- **Facts the rules read** (the server reads them from the case and ledger): billing type, case type, performing facility, ordering site, primary pathologist, whether the report is amended, whether the charge is an amendment delta, whether its CPT code is mapped, whether a split case lacks its technical-component facility, the generation time and the final sign-out time.
