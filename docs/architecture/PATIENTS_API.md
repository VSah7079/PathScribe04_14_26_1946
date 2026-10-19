# Patients, encounters and patient history: server contract (Batch 616, PS-503)

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

The calls the browser makes for the master patient index, encounters, patient history and the patient ADT queue. Written from `src/services/patients/`, `encounters/` and `patientHistory/`, built to `HTTP_SERVICES_PATTERN.md`. Conventions as in `REPORTS_API.md`.

**Nothing that identifies a person is in a URL.** Search terms, identifier values, MRNs and encounter numbers travel in the POST body, so they are not left in access logs, proxies or browser history. Only opaque ids appear in paths.

**Matching is the server's.** The server holds the full index and decides who matches whom, what a merge changes and which cases move. The browser sends the candidate and gets the outcome. A refusal is a thrown fixed code (these methods return records, and a made-up default would hide a refused merge).

## 1. Master patient index (`IPatientIndexService`)

| Call | Body | Reply |
|---|---|---|
| `POST /api/patients/patient-index/resolve-or-create-patient` | the candidate | `PatientMatchResult` (matched, created, or provisional for review) |
| `POST /api/patients/patient-index/resolve-patient-without-matching` | the candidate | `PatientMatchResult` |
| `GET /api/patients/patient-index/get-by-id` | | the record; `404` → null |
| `GET /api/organisations/{org}/patients?review=pending` | | `{ items }` |
| `GET /api/organisations/{org}/patients?downtime=true` | | `{ items }` |
| `POST /api/patients/patient-index/search-patients` | `{ query }` | `{ items }` |
| `POST /api/patients/patient-index/confirm-as-new-patient` | | `204` |
| `POST /api/patients/patient-index/flag-for-review` | `{ reason }` | `204` |
| `POST /api/patients/patient-index/merge-into-existing-patient` | `{ confirmedPatientId, suppressAdtEnqueue }` | `{ casesRepointed, caseIds, encountersRepointed }` |
| `POST /api/patients/patient-index/move-case-to-patient` | `{ sourcePatientId, targetPatientId, eventTimestamp }` | `{ moved, reason?, encounterOutcome? }` |
| `POST /api/patients/patient-index/break-glass-rebind` | `{ downtimePatientId, confirmedPatientId, reasonCode, notes, performedBy }` | `{ rebound, reason?, casesRepointed?, caseIds? }`; the server audits it as a high-risk action |
| `POST /api/patients/patient-index/update-demographics` | `{ demographics, eventTimestamp }` | `{ record, applied }` (`applied: false` when the event is older than the stored data) |

## 2. Links, identifiers, registry consent

| Call | Body | Reply |
|---|---|---|
| `POST /api/patients/patient-index/link-patients` | `{ patientIdA, patientIdB, relationshipType, linkedBy, reason? }` | the link |
| `GET /api/patients/{id}/links?relationshipType=` | | `{ items: string[] }` linked patient ids |
| `GET /api/patients/patient-index/list-links` | | `{ items }` |
| `POST /api/patients/patient-index/resolve-by-identifier` | `{ assigningAuthority, identifierValue }` | `{ patientId }` or `{ patientId: null }`; `404` also means none |
| `GET /api/patients/patient-index/list-identifiers-for-patient` | | `{ items }` |
| `POST /api/patients/patient-index/add-identifier` | `{ assigningAuthority, identifierValue, source }` | the identifier |
| `POST /api/patients/patient-index/get-national-identifier-status-code` | `{ system, value }` | `{ statusCode }` or null |
| `POST /api/patients/patient-index/record-national-identifier` | the national identifier | the identifier |
| `GET /api/patients/patient-index/list-national-identifiers` | | `{ items }` |
| `POST /api/patients/patient-index/remove-national-identifier` | | `204` |
| `POST /api/patients/patient-index/set-registry-consent` | `{ consent }` (`null` clears it) | `204` |

## 3. Encounters (`IEncounterService`)

Every update carries the event time of the message that caused it. The server applies it only if it is newer than the last applied event (`applied: false` otherwise), the same rule as the mock.

| Call | Body | Reply |
|---|---|---|
| `GET /api/encounters/encounter/get-by-id` | | the encounter; `404` → `data: null` |
| `GET /api/encounters/encounter/list-for-patient` | | `{ items }` |
| `POST /api/encounters/encounter/get-by-encounter-number` | `{ encounterNumber }` | the encounter; `404` → `data: null` |
| `POST /api/encounters/encounter/resolve-or-create-encounter` | the encounter fields | the encounter (found or created) |
| `PATCH /api/encounters/{id}/status` | `{ status, eventTimestamp, dischargeTime?, dischargeDisposition? }` | `{ encounter, applied }` |
| `PATCH /api/encounters/{id}/location` | `{ locationId, eventTimestamp }` | `{ encounter, applied }` |
| `PATCH /api/encounters/{id}/class` | `{ encounterClass, eventTimestamp }` | `{ encounter, applied }` |
| `PATCH /api/encounters/{id}/metadata` | `{ changes, eventTimestamp }` | `{ encounter, applied }` |
| `PUT /api/encounters/{id}/diagnoses` | `{ diagnoses, eventTimestamp }` | `{ encounter, applied }` |
| `POST /api/encounters/{id}/cancel-transfer` | `{ eventTimestamp }` | `{ encounter, applied }` |
| `POST /api/encounters/{id}/reassign` | `{ sourcePatientId, targetPatientId, eventTimestamp }` | `{ encounter, reassigned, reason? }` |
| `POST /api/encounters/{id}/number` | `{ newEncounterNumber, eventTimestamp }` | `{ encounter, changed, reason? }` |

## 4. Patient history

Prior reports are PHI. The per-case cache lives on the server. The lookup in the lab or hospital system is made by the **server** (it holds the credentials and applies the secure-endpoint rule); the browser never calls the LIS.

| Call | Body | Reply |
|---|---|---|
| `GET /api/patient-history/patient-history-cache/get-all` | | `{ items }` all entries the caller may see |
| `GET /api/patient-history/patient-history-cache/get-by-case-id` | | the entry; `404` → `data: null` |
| `POST /api/patient-history/patient-history-cache/ensure-pending` | `{ patientId }` | the entry (status pending) |
| `POST /api/patient-history/patient-history-cache/mark-fetched` | `{ reports }` | the entry (fetched) |
| `POST /api/patient-history/patient-history-cache/mark-failed` | `{ errorMessage }` (technical text, no patient text) | the entry |
| `POST /api/patient-history/patient-history-cache/destroy` | | `204` |
| `POST /api/patient-history/patient-history-lis/fetch-patient-history` | `{ mrn }` | `{ items: PatientHistoryReport[] }` |

## 5. Patient ADT outbound queue

The shared queue calls (`REPORTS_API.md` section 5) under `/api/outbound/patient-adt`, plus `GET /api/patients/outbound-patient-adt-queue/get-by-patient-id`.

## 6. Still on the browser in a server build

Inbound HL7 processing, the dispatchers and the inbound simulator (`services/hl7/`, `reports/dispatch*`, `cytology/dispatch*`, `mockInterfaceEngine/`) import the mock patient index and encounter services directly. In production that work runs on the server (the interface engine); in the demo it runs in the browser against the mocks. They are deliberately not switched.
