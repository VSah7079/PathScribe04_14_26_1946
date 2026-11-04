# Accessioning and intake: server contract (Batch 616, PS-505)

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

The calls the browser makes for incoming orders, the specimen-code crosswalk, drafts and the accession outbound queue. Written from `src/services/orderIntake/`, `drafts/` and `accessioning/`, built to `HTTP_SERVICES_PATTERN.md`. Conventions as in `REPORTS_API.md` (list replies `{ items }`, fixed error codes, the server decides permission, no patient text in failures).

## 1. Incoming orders (`IOrderIntakeService`)

The server receives orders from the interface engine (HL7, API); the browser lists, links and resolves them. `rawMessage` is the original HL7 and is PHI.

| Call | Body | Reply |
|---|---|---|
| `GET /api/orders?status=pending&facilityId=` | | `{ items: IncomingOrder[] }` |
| `GET /api/order-intake/order-intake/get-order` | | the order |
| `POST /api/order-intake/order-intake/receive-order` | the order without id, status or received time (a manually keyed order) | the order |
| `POST /api/order-intake/order-intake/mark-order-linked` | `{ caseId }` | the order (status `linked`) |
| `POST /api/order-intake/order-intake/resolve-order` | | `{ order, warnings[] }`: facility, provider, dictionary entries and department resolved or created |

### 1a. Clinical indication mapping (Batch 714): the contract for the server

The server fills `IncomingOrder.clinicalIndication` and `IncomingOrder.clinicalIndicationSource` when it builds the order from the message. **This repo has no inbound HL7 or FHIR order parser; the rule below is implemented and tested as a pure function (`src/services/orderIntake/clinicalIndicationFromOrder.ts`) and is the contract. The server code that calls it is not built here.** First source with text wins; nothing is invented, and with no text the field is left out.

| Priority | `clinicalIndicationSource` | HL7 v2 | FHIR R4 |
|---|---|---|---|
| 1 | `obr31` | OBR-31 Reason for Study (text, else display, else code as sent; repeats joined with "; ") | |
| 2 | `orc16` | ORC-16 Order Control Code Reason | |
| 3 | `dg1` | DG1-4 description, with DG1-3 code as "description (code)"; a code alone stays a code; repeats joined with "; " | |
| 4 | `nte` | NTE-3 text the sender marks as the order reason (not every NTE) | |
| 5 | `fhirReasonCode` | | `ServiceRequest.reasonCode` (`text`, else `coding.display`, else `coding.code`) |
| 6 | `fhirReasonReference` | | text of the referenced Condition / Observation (`code.text`, else display) |

OBX is not used. The browser stores `Case.order.clinicalIndication` (what is shown and compared), `clinicalIndicationSource` (`order`, `editedFromOrder` or `entered`), `orderClinicalIndication` (the order's original text) and `orderClinicalIndicationField` (the source id above). The Clinical-Pathologic Mismatch Check reads `clinicalIndication`.

## 2. Specimen-code crosswalk

| Call | Body | Reply |
|---|---|---|
| `GET /api/order-crosswalk?clientId=` | | `{ items }` |
| `POST /api/order-intake/order-intake/add-crosswalk-entry` | the entry without id or created time | the entry |
| `POST /api/order-intake/order-intake/update-crosswalk-entry` | the changed fields | the entry |

Changing the crosswalk is configuration: the server requires the configuration capability.

## 3. Drafts (`IDraftCacheService`)

Drafts hold PHI. On a server deployment they live on the server, per user; the browser keeps nothing.

| Call | Body | Reply |
|---|---|---|
| `POST /api/drafts/draft-cache/save-draft` | `{ payload }` | `204` (the server stamps `savedAt`) |
| `GET /api/drafts/draft-cache/get-draft` | | the draft `{ entityId, payload, savedAt, userId }`; `404` means none, which the browser treats as `data: null` |
| `POST /api/drafts/draft-cache/clear-draft` | | `204` |
| `POST /api/drafts/draft-cache/clear-all-drafts-for-user` | | `204` |

A user may read and write only their own drafts (`403` otherwise).

## 4. Accession outbound queue

The shared queue calls (`REPORTS_API.md` section 5) under `/api/outbound/accessions`, plus `GET /api/accessioning/accession-outbound-queue/get-by-case-id`.
