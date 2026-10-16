# Registry acknowledgements: the intake endpoint on the PathScribe API server

**Status:** specification for the API server team (PS-345) and the interface engine (PS-331). The parsing, status rules, 72-hour escalation and a reference implementation over the mock queues are built and tested (Batch 420); the endpoint itself is not built yet.
**Batch 425 (Oct 1, 2026, Pete and his developer):** PathScribe now takes **normalised JSON only**. The HL7 v2 ACK and FHIR OperationOutcome readers built in Batch 420 were removed from PathScribe; the interface engine reads those and posts the JSON in §4. Added: a registry's **revision of data it had already accepted** (§4.2, §5), the patient detail messages (§8), and the cancer **mandatory-data hold** (§9). `services/hl7/` (the order and ADT reading, ~6,000 lines) is untouched; moving it to the engine is a later batch recorded on PS-331.
**Source:** Registry Engine SRS v2.1, FR-008.2 (acknowledgements), FR-008.3 (status lifecycle), FR-008.11 (severities), NFR-002 (72-hour retry). Release-1 boundary: PathScribe sends canonical JSON to the interface engine; the interface engine owns wire formats and transport, and passes the registry's answer back here. The engine is ForMedrixAI's and ships with PathScribe; a site's own engine is used only when the site insists, with ForMedrixAI's adapter code deployed into it. (Batch 424 correction: this line previously said "the hospital's interface engine".)
**Stack:** ASP.NET Core API server over Microsoft SQL Server (Sep 2026 decisions).

## 1. What it's for

Every registry submission carries a `submissionGuid` (Batch 419, `services/registrySubmission/registrySubmissionHeader.ts`). When the registry answers, the interface engine posts that answer here. PathScribe finds the submission, moves its status, keeps the raw message, and audits. A rejection shows on the Registry Exceptions worklist (Batch 421: Quality & Compliance → Registry Exceptions, where it can be re-validated and resent; see `services/registrySubmission/resendRegistrySubmission.ts`). The server should expose the worklist as `GET /api/registry/exceptions` (the rows of `registryExceptions.ts`) and the resend as `POST /api/registry/submissions/{queue}/{entryId}/resend`, checking `registry:submission:resend`.

## 2. What already exists in the browser build

| File | What it does |
|---|---|
| `services/registrySubmission/registryAcknowledgement.ts` | **The rules this spec describes, as code:** the JSON reader (answers and revisions), the status transition, the 72-hour rule. Pure, tested in `registryAcknowledgement.test.ts` |
| `services/registrySubmission/recordRegistryAcknowledgement.ts` | The reference implementation: parse → find by `submissionGuid` in the cytology or cancer registry queue → transition → store → audit. Also `escalateStaleRegistrySubmissions` |
| `services/registrySubmission/recordRegistryRevision.ts` | Batch 425: a revision after acceptance (store, auto-raise a CAPA deficiency, audit), `reviewRegistryRevision` (`registry:revision:review`), and `recordRegistryResponse`, which routes one posted message to the right one |
| `services/registrySubmission/registryTransmissionAudit.ts` | Batch 425: the transmission audit's rows, one column set for screening and cancer |
| `services/patients/patientRegistryDetails.ts` | Batch 425: the patient detail messages (§8) |
| `services/cancerRegistry/cancerRegistryMandatoryData.ts` | Batch 425: the mandatory-data check (§9) |
| `types/case/CytologyRegistryOutboundQueueEntry.ts`, `CancerRegistryOutboundQueueEntry.ts` | The stored fields: `registryStatus`, `sentAt`, `acknowledgements[]`, `registryRevisions[]` |

## 3. Endpoint

### `POST /api/registry/acknowledgements`

Called by the interface engine only. Authenticate it as a system client (mutual TLS or a client-credentials token scoped `registry.ack.write`); no user session, no capability.

Request body: the engine's normalised JSON itself (§4), as the message body. One endpoint takes both answers and revisions; `recordRegistryResponse` shows the routing (a body with `status: "REVISED"` is a revision).

Response `200`:

```json
{ "kind": "answer", "outcome": "applied" | "duplicate" | "conflict" | "unknownSubmission", "registryStatus": "accepted" }
{ "kind": "revision", "outcome": "recorded" | "duplicate" | "notAccepted" | "unknownSubmission", "deficiencyId": "…" }
```

Response `400` with `{ "outcome": "unparseable" | "noSubmissionGuid" | "noSubmission" }`, and `415` with `{ "outcome": "notNormalizedJson" }` for anything that isn't the engine's JSON (an HL7 ACK or a FHIR OperationOutcome posted straight to PathScribe). Either way the attempt is audited. The endpoint is idempotent: posting the same answer or revision twice returns `duplicate` and changes nothing but the stored history.

## 4. The normalised JSON (the engine's contract, PS-331)

The engine reads whatever the registry sends (HL7 v2 ACK, FHIR OperationOutcome, a registry's own JSON or XML) and posts one of these. PathScribe never parses HL7 or FHIR for registry traffic.

### 4.1 An answer

```json
{ "submissionId": "<PathScribe's submissionGuid>", "status": "ACCEPTED", "ackCode": "AA",
  "findings": [{ "severity": "WARNING", "code": "207", "message": "Optional ethnicity missing", "location": "PID-10", "tier": 2 }] }
```

- `submissionId` (or `submissionGuid`, the same thing) is required.
- `status`: `ACCEPTED`, `ACCEPTED_WITH_WARNINGS`, `REJECTED_RECOVERABLE` or `REJECTED_FATAL`.
- `ackCode` (or `responseCode`): the registry's own code, kept for the transmission audit.
- `findings[]` is optional. `severity` is `FATAL`, `CRITICAL_REJECT`, `WARNING` or `INFORMATIONAL`, and `tier` 1–4 is optional.

The engine's mapping, for reference (it was PathScribe's before Batch 425):

| Registry message | ACCEPTED | ACCEPTED_WITH_WARNINGS | REJECTED_RECOVERABLE | REJECTED_FATAL |
|---|---|---|---|---|
| HL7 v2 ACK (MSA-1) | `AA` / `CA` | `AA` / `CA` with an `ERR` of severity `W` | `AE` / `CE` | `AR` / `CR` |
| FHIR OperationOutcome | only `information` issues | a `warning`, no `error` / `fatal` | an `error` | a `fatal` |

Findings from HL7 `ERR`: ERR-4 severity F/E/W/I → FATAL/CRITICAL_REJECT/WARNING/INFORMATIONAL, ERR-3.1 code, ERR-8 or ERR-3.2 text, ERR-2 location. A rejection with no `ERR` takes MSA-3 as its finding. From FHIR issues: severity as above, `details.coding[0].code` or `code`, `details.text` or `diagnostics`, `expression[0]`. The MSA-1 value goes in `ackCode`.

### 4.2 A revision after acceptance

A registry can change data it had already accepted (a stage, a site code). Either shape:

```json
{ "submissionId": "…", "status": "REVISED", "ackCode": "AA", "revisedPayload": { "tnmStage": "pT2" }, "receivedAt": "2026-10-01T10:00:00Z" }
{ "event": "REGISTRY_RESPONSE_UPDATED", "status": "REVISED", "accessionId": "S26-100", "registryId": "naaccr_us",
  "previousStatus": "ACCEPTED", "payloadHash": "…", "updatedFields": [{ "field": "stage", "value": "II" }] }
```

- The submission is found by `submissionId`, or by `accessionId` plus `registryId` (the latest accepted version).
- `payloadHash` identifies the revision. Without it, PathScribe hashes the changed fields, so a repeat is a duplicate either way.

## 5. Status rules

`sent` → `awaitingAck` → `accepted` | `acceptedWithWarnings` | `rejectedRecoverable` | `rejectedFatal`.

- An answer moves a submission that is awaiting, overdue or rejected (a resend of a rejected one keeps its id, Batch 419, so its new answer replaces the old).
- An **accepted** submission is never reopened. A different later answer is stored and audited as a `conflict` for a person to look at.
- The same answer twice is a `duplicate`.
- Every answer is stored on the submission with its raw text, whatever the result.
- **A revision (Batch 425)** applies only to an accepted submission (`notAccepted` otherwise; nothing changes). It is stored on the submission (`registryRevisions[]`), a CAPA deficiency of type `def-registry-revised-post-acceptance` is raised on the case automatically, and the submission shows on the Registry Exceptions worklist as **Revised after acceptance** until someone with `registry:revision:review` marks it reviewed (`POST /api/registry/submissions/{queue}/{entryId}/revision-review`). Marking it reviewed doesn't close the deficiency; that follows the CAPA lifecycle in Quality Assurance.

## 6. The 72-hour rule (NFR-002)

A scheduled job runs `escalateStaleRegistrySubmissions` (the browser build also runs it when the worklist opens):

- sent and unacknowledged for 72 hours → `ackOverdue` (a late answer is still taken);
- failing to reach the interface engine (`DISPATCH_*`) for 72 hours since it was queued → retries stop (`maxRetriesExceeded`).

Both then show on the exception worklist.

## 7. SQL Server notes

Index the queue tables on `submission_guid` (unique per queue row). Store acknowledgements in a child table (`registry_submission_ack`: queue row id, received at, format, outcome, response code, findings JSON, raw text) rather than a JSON column, so the worklist can filter by finding code. Revisions likewise (`registry_submission_revision`: queue row id, received at, payload hash unique per queue row, previous status, response code, updated fields JSON, deficiency id, reviewed at/by, raw text). Raw text is patient data: same retention and encryption as the queue row.

The worklist, its count and the transmission audit are scoped to the signed-in user's organisation (resolved from the staff record, as PS-345 §3 does for every request, not from a token claim). The live badge: `GET /api/v1/quality/exceptions/count` gives the count. **Decided (Pete, Oct 14, 2026): the server does not push the count.** It sends the general `DataChanged` event with the topic `registryExceptions` on the one hub, `/hubs/live` (`LIVE_UPDATES_SIGNALR.md` §14), to the organisation's users who can open the worklist, after each committed change to the count; the badge then re-reads the count from that endpoint. This replaces the `ReceiveExceptionCountUpdate` method (payload `{ "count": n }`) and the separate `/hubs/quality-metrics` hub first proposed here, so a browser window keeps one connection and no figure travels on it. The browser side is built (`hooks/useRegistryExceptionCount.ts`, Batch 560): it re-reads on the event, with a one-minute safety re-read, and every minute when there is no live connection.

## 8. Patient details from the hospital's system (Batch 425)

The engine reads the PAS/EHR's HL7 (PID-3 national identifiers; the consent segments) and posts JSON. Both are patient-level, apply to the MPI and every case of the patient, and the newest `updatedAt` wins (per identifier system, and for the consent), so out-of-order messages settle on the latest. No A08 is sent back. Endpoints: `PATCH /api/v1/patients/demographics` and `POST /api/v1/patients/registry-consent`, system client only.

```json
{ "event": "DEMOGRAPHICS_UPDATED", "patient": { "assigningAuthority": "HOSP-A", "identifierValue": "MRN1" },
  "nationalIdentifiers": [{ "system": "mrn_nhs", "value": "9434765919" }], "updatedAt": "2026-10-01T09:00:00Z" }
{ "event": "REGISTRY_CONSENT_UPDATED", "patient": { "assigningAuthority": "HOSP-A", "identifierValue": "MRN1" },
  "screeningOptOut": true, "cancerRegistryOptOut": false, "updatedAt": "2026-10-01T09:00:00Z" }
```

- `system` is the identifier format id (`IDENTIFIER_FORMAT_LIBRARY`). Each value's check digit is run on receipt, and one that fails is kept, marked `failedChecksum`. A message adds or replaces identifiers; it never removes them.
- No research consent (Pete's answer).
- A person's change after accessioning (the Registry Exceptions page's **Patient details**, `patient:national-identifier:record`) goes the other way: PathScribe queues the existing **A08** demographic update (`sourceOperation: "recordNationalIdentifier"`), whose patient snapshot already carries the national identifiers.

## 9. The cancer mandatory-data hold (Batch 425)

Before a cancer registry report is emitted, it is checked against the registry's `mandatoryFields` (`services/cancerRegistry/cancerRegistryDefinitions.ts`):
- every registry: date of birth, diagnosis date, primary diagnosis, an ICD-O code;
- a registry keyed on a national identifier: that identifier too, verified or at least the right format.

A report missing any is queued and held (`status FAILED`, `errorCode HOLD_MISSING_MANDATORY_DATA`, the missing items in `errorMessage`). It is never sent, and shows on the worklist as **Held**. A resend re-checks it against today's data. The case's sign-out is never held for this (Pete's answer). The server runs the same check before it emits the JSON; the lists are to be confirmed against each registry's own specification at sign-off.
