# Delivery schedules: the API server's calls (PS-800)

Batch 619. PathScribe owns **when** something goes out; the interface engine owns **how** (translation, transport, transport retry, acknowledgements). A schedule is set per feed at the **enterprise** level, and a **performing facility** may override it. Registries use the same tool, with a schedule **per registry**.

Browser side (built): `services/deliverySchedules/` (`deliverySchedule.ts` rules, `IDeliveryScheduleService`, mock, `httpDeliveryScheduleService.ts`, instance) and Configuration > System > Delivery Schedules. Capability: `config:delivery-schedules:manage` (high risk; Admin and Lab Director). Route style: `HTTP_SERVICES_PATTERN.md` §7. A refusal is a fixed code (`NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`); the server decides permission and audits every change (feed, facility, registry and kind only, no patient data).

## Service `IDeliveryScheduleService`

`/api/delivery-schedules/delivery-schedule`

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/delivery-schedules/delivery-schedule/get-all` | none |
| `getForFacility` | `GET /api/delivery-schedules/delivery-schedule/get-for-facility` | `facilityId` (query) |
| `set` | `POST /api/delivery-schedules/delivery-schedule/set` | `{ feed, facilityId, registryKey, schedule }` (body) |
| `remove` | `POST /api/delivery-schedules/delivery-schedule/remove` | `{ feed, facilityId, registryKey }` (body) |

One stored entry per (`feed`, `facilityId`, `registryKey`). `facilityId` null is the enterprise schedule; set it to a facility id for that performing facility's override. `registryKey` is null except for feed `registry`, where it is required and names the registry as the registry go-live configuration keys it (`cancer:<id>` or `screening:<id>`, `registryTemplateKey`). `set` replaces the entry for that key. `remove` deletes a facility's override only (the facility then follows the enterprise); an enterprise schedule is changed with `set`. `set` refuses an invalid schedule (`422`, with the problem codes below) and a `registry` feed without a `registryKey` or another feed with one.

## Feeds

`report_delivery`, `billing_delivery`, `results`, `adt`, `accession`, `lis_sync`, `registry`.

## Schedule

| Field | Meaning |
|---|---|
| `kind` | `immediate`; `windows` (only inside set hours); `batch` (collected, sent at set times); `hold_until_sign_out`; `review_hold` (a set time after sign-out) |
| `windows` | `kind` windows: `{ days (0 = Sunday), start, end }`, local "HH:MM", same day, end after start |
| `batchFrequency` | `daily`, `weekly` (uses `batchDays`) or `monthly` (uses `batchMonthDays`, 1 to 28) |
| `batchDays`, `batchTimes` | weekdays and local "HH:MM" run times |
| `cutoffTime` | optional "HH:MM": an item signed out up to this time on a run day goes in that run; later ones wait for the next. Absent = the run time |
| `reviewHoldMinutes` | `kind` review_hold: minutes after sign-out (1 to 10,080); match the QA and amendment window |
| `blackoutDates` | local dates (YYYY-MM-DD) with no sending (windows and batch) |
| `timeZone` | IANA zone the times are read in |
| `reportingDeadlineDays` | optional, days from sign-out (1 to 3,650); the queue flags items near or past it (`deadlineStatus`: ok, near within 3 days, overdue) |
| `amendmentRequeues` | an amendment after sending puts the item back in the queue under this schedule (for review_hold the hold restarts from the amendment time) |

Problem codes: `kindInvalid`, `timeZoneInvalid`, `daysRequired`, `windowsRequired`, `timeInvalid`, `windowEndBeforeStart`, `batchTimesRequired`, `monthDaysRequired`, `frequencyInvalid`, `blackoutInvalid`, `holdInvalid`, `deadlineInvalid`.

## Resolving and evaluating (the server must do the same)

- **Resolve** for a feed (and registry): the performing facility's own entry, else the enterprise entry, else the feed's default. A registry never borrows another registry's. Defaults: every feed sends immediately, except `registry`, which holds 240 minutes after sign-out and re-queues on amendment.
- **Evaluate** (`evaluateSchedule`): given `now`, `signedOut`, `signedOutAt` and `lastRunAt`, answer `canSendNow`, a reason and `nextDueAt`. Windows are start-inclusive, end-exclusive; batch items follow the cutoff (`batchRunForItem`); hold until sign-out waits for `signedOut`; review hold waits `reviewHoldMinutes` after `signedOutAt`.
- The schedule only decides when an item may leave PathScribe's queue. Handing it to the interface engine, and the engine's acknowledgements, are the engine's.

## Registries: what is NOT in the schedule

Destinations, required fields, go-live approval and agreement stay in each registry's go-live and settings configuration. Transport (REST with mTLS, SFTP, portal upload) is the per-jurisdiction destination's, not the schedule's. No destination in the browser code yet carries a transport-kind label, so none is shown; one can be added to the destination when it exists.
