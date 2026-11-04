# Interface Dictionary (Message Mapper): server contract

Batch 612. The browser side is built against browser-held storage (`src/services/interfaceDictionary/`). With the API server, the same rules run there and the interface engine applies the **published** profile to live messages. The screens do not change.

## What it is

A **vendor profile** describes where a vendor's own fields are in its messages (HL7 v2 including Z-segments, JSON, FHIR) and which **extension field** (`ext.<name>`) each becomes beside the case. Staff of ForMedrixAI maintain profiles; hospitals see the result as a read-only **Vendor fields** panel on the case.

## What a mapping can and cannot reach (scope guard)

- Can: Z-segment and extra JSON/FHIR fields, code translation, date formats, display names, required and default values, versioning.
- Cannot: the case's own structure: patient identity, order and accession, specimens and material, diagnosis and report, signature and release, billing, new message types, new workflow rules. A target must be `ext.` followed by a name (`^[a-z][A-Za-z0-9]{0,39}$`) and must not start with a core root (`src/services/interfaceDictionary/scopeGuard.ts`). Those changes are code releases.
- The server MUST repeat this check on save, on test and on publish, and again when applying a message. A browser check is a convenience.

## Life of a profile

`draft → tested → published → superseded`; `retired` switches the live version off. One working copy per vendor. Editing the mappings makes the test stale. Publish needs: at least one mapping, no definition problems, a **passing test of exactly these mappings** (content hash). Roll back copies the latest earlier live version as a **new** published version (`rolledBackFrom`); history only grows. A test stores counts and the mapping hash, never the sample message.

## Endpoints (proposed)

| Method and path | Purpose | Capability |
|---|---|---|
| `GET /interface-profiles` | List profiles with versions | any signed-in user (read) |
| `GET /interface-profiles/{id}` | One profile | any signed-in user (read) |
| `POST /interface-profiles` | Create `{name, format, messageType}` | `platform:interface-dictionary:manage` |
| `POST /interface-profiles/{id}/draft` | Start a new working copy | `platform:interface-dictionary:manage` |
| `PUT /interface-profiles/{id}/mappings` | Save the working copy's mappings | `platform:interface-dictionary:manage` |
| `POST /interface-profiles/{id}/test` | Test with a sample `{sample}`; returns counts and per-mapping outcomes (not stored) | `platform:interface-dictionary:manage` |
| `POST /interface-profiles/{id}/publish` | Publish the tested working copy | `platform:interface-dictionary:publish` |
| `POST /interface-profiles/{id}/rollback` | Restore the previous version as a new one | `platform:interface-dictionary:publish` |
| `POST /interface-profiles/{id}/retire` | Switch the live version off | `platform:interface-dictionary:publish` |
| `POST /interface-profiles/{id}/simulate` | Demo only: apply a pasted message to a case | `platform:interface-dictionary:simulate` |
| `GET /cases/{caseId}/vendor-fields` | The case's extension values | the right to see the case |

All three capabilities are platform only (Superadmin, ForMedrixAI support). Refusal codes: NOT_FOUND, NAME_REQUIRED, DUPLICATE_NAME, BAD_MESSAGE_TYPE, DRAFT_EXISTS, NOT_A_DRAFT, NO_MAPPINGS, MAPPING_PROBLEM, NOT_TESTED, TEST_STALE, NOTHING_TO_ROLL_BACK_TO, NOT_PUBLISHED, EMPTY_MESSAGE, BAD_MESSAGE, WRONG_MESSAGE_TYPE, CASE_REQUIRED, NO_PUBLISHED_VERSION, CONFIG_NOT_PERMITTED.

## Extension values

One row per case, vendor, target: `{caseId, vendorId, vendorName, profileVersion, target, label, dataType, value, receivedAt, simulated}`. Values are patient data: encrypt at rest like case data, show tagged for redaction, and never write them to the audit log or logs. The engine applies the **published** version of the profile and records which version produced each value. A value that fails its type or code translation is not stored; the failure is counted.

## Audit

Literal English, no message content, no values, no paths: Interface Profile Created / Draft Started / Mappings Saved / Tested / Published / Rolled Back / Retired; Vendor Fields Applied (case id, vendor, version, count; Simulated in the demo).

## Not built here

The interface engine applying profiles to live messages, durable storage of extension values, and the endpoints above are server work. Nothing is received from a vendor in the demo; sample messages are pasted in and labelled Simulated.
