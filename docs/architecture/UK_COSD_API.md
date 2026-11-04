# UK cancer registry feed (COSD): destination settings, checks and the correction loop (PS-800)

Batch 620 (part C). The UK cancer registry feed is the first registry feed built on the Outbound Queue (`OUTBOUND_QUEUE_API.md`). PathScribe owns **what is sent, when, the status and the audit**; the interface engine owns **how**: it makes the real COSD file, holds the endpoint and the credentials, sends it (REST with mutual TLS, SFTP or a portal upload) and returns the registry's acknowledgement, which updates the entry's status here.

**What is and is not modelled.** The element names in PathScribe's preview are PathScribe's own **simplified model**, not the official COSD schema, and nothing here claims COSD conformance. The checks are only the ones that can be stated without the published NHS England / NCRAS COSD specification. Each item the lab's sign-off lead must still confirm against that specification is listed in `COSD_RULES_NEEDING_SPEC` (`services/cosd/cosdModel.ts`): element names, the mandatory item list, code list values, date rules, the submission envelope, the registry's rejection codes, and when the correction window starts.

Browser side (built): `services/cosd/` (`cosdModel.ts`, `buildCosdXml.ts`, `validateCosd.ts`, `workingDays.ts`, `cosdDestination.ts`, `cosdFeed.ts`, `cosdSample.ts`, `ICosdDestinationService`, mock, `httpCosdDestinationService.ts`, instance) and Configuration > System > UK Cancer Registry (COSD). Capability: `config:cosd-destination:manage` (high risk; Admin and Lab Director). It reuses, and does not repeat, `services/cancerRegistry/` (the `cosd_uk` definition, the registry payload, the mandatory data check, the go-live gate), `services/deliverySchedules/` (per-registry schedule, reporting deadline, `deadlineStatus`) and the Outbound Queue (rejected state, retry with a reason, amended re-queue links).

## Service `ICosdDestinationService`

`/api/cosd/cosd-destination`

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/cosd/cosd-destination/get-all` | none |
| `getForFacility` | `GET /api/cosd/cosd-destination/get-for-facility` | `facilityId` (query); the facility's own entry, or null |
| `set` | `POST /api/cosd/cosd-destination/set` | `{ facilityId, transport, correctionWorkingDays, nonWorkingDates }` (body); `facilityId` null is the enterprise entry; one entry per scope, a second `set` replaces it |
| `remove` | `POST /api/cosd/cosd-destination/remove` | `{ facilityId }` (body); removes a facility's own entry (`NOT_FOUND` when it has none) |

Refusals are fixed codes (`NOT_PERMITTED`, `NOT_FOUND`) and never carry text from the request. Problem codes on a refused `set`: `transportInvalid`, `daysInvalid`, `dateInvalid`.

## Destination

| Field | Meaning |
|---|---|
| `facilityId` | null = enterprise; a facility id = that performing facility's own (the state registry follows where the work is performed) |
| `transport` | `restMtls`, `sftp`, `portalUpload`: a label shown on the Outbound Queue. Endpoints and credentials are never held in PathScribe |
| `correctionWorkingDays` | whole number 1 to 30; default 5 (the UK rule, Pete Oct 19 2026) |
| `nonWorkingDates` | `YYYY-MM-DD` list kept by the lab (bank holidays); none are assumed |

Which destination applies to a submission: the performing facility's own entry, else the enterprise entry, else the built-in default (secure API, 5 working days, no non-working dates). The facility is the case's performing facility (`resolveCosdDestination`).

## The correction loop

1. **Reject:** the registry's acknowledgement marks the submission rejected. The queue entry carries only the registry's fixed error codes and `rejection.rejectedAt` (the acknowledgement time). Registry message text can quote patient data and stays in the submission record.
2. **Due date:** for the `cosd_uk` registry the server sets `rejection.correctionDueAt` to `correctionWorkingDays` working days after `rejectedAt`: Monday to Friday in UTC, skipping `nonWorkingDates`, the time of day kept (`addWorkingDays`). The first counted day is the next working day. Other registries keep the calendar window they already had. Whether the window starts at rejection or at receipt of the registry's message is one of the items to confirm against the specification.
3. **Deadline status:** the window is read through the delivery schedule's own `deadlineStatus` (`correctionStatus`: a deadline of that many calendar days from the rejection). The registry's reporting deadline from sign-out is the per-registry delivery schedule (`reportingDeadlineDays`), unchanged.
4. **Correct and resubmit:** the Outbound Queue's retry with a reason (`dataCorrected`, `codingCorrected`, `pathologistCorrected`, `other`). A person may instead mark it not reportable. Both are audited without patient text.
5. **Amended reports:** an amendment after sending re-queues under the registry's schedule as a new item linked to the one it amends (`amendsId`); the submission names it (`type` AMENDMENT, `amends`).

## Checks PathScribe makes (fixed codes, `validateCosdPayload`)

`PATIENT_IDENTIFIER_MISSING`, `NHS_NUMBER_FORMAT` (not ten digits), `NHS_NUMBER_CHECK_DIGIT` (the public mod-11 rule), `DOB_MISSING`, `DOB_INVALID`, `DOB_IN_FUTURE`, `DIAGNOSIS_DATE_MISSING`, `DIAGNOSIS_DATE_INVALID`, `DIAGNOSIS_DATE_BEFORE_BIRTH`, `DIAGNOSIS_DATE_IN_FUTURE`, `PRIMARY_DIAGNOSIS_MISSING`, `ICDO_MISSING`, `ICDO_FORMAT` (`8500/3`), `ICD10_FORMAT` (a warning only), `ACCESSION_MISSING`, `XML_NOT_WELL_FORMED`. They are PathScribe's own codes, not NCRAS rejection codes. An error means the submission would be held back; sign-out never waits for it (`cancerRegistryMandatoryData.ts`).

## What the server must do

- Keep one destination per scope and apply the resolution above; audit every `set` and `remove` (event and fixed fields only).
- Make the real COSD file in the interface engine from the registry payload, send it, and report the acknowledgement; set `rejection.rejectedAt` from it.
- Compute `correctionDueAt` for `cosd_uk` as above, so the browser and the server agree.
- Not send a held message from any path (`OUTBOUND_QUEUE_API.md`).
- Nothing here has been tried against a real server or a real registry.
