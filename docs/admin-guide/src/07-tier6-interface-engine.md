---
chapter: 7
id: ch7
title: Tier 6: Interface Engine and External System Integrations
---

# Tier 6: Interface Engine and External System Integrations {#ch7}

This chapter covers how PathScribe exchanges messages with other systems: the hospital's electronic health record (EHR), a laboratory information system (LIS), reference laboratories, billing systems, registries and reporting tools. It also covers the screens an administrator uses to watch those exchanges and to deal with the ones that fail.

Read the status of each part before you plan a project around it. Much of this tier is a contract that is written and a browser side that is built, while the server and the interface engine on the other end are not yet connected. Where something is not built, the section says **Not built** or **Planned** and names the nearest thing that does exist.

**The rule of this chapter.** PathScribe decides what is sent and when. The interface engine decides how: the HL7 text, the connection, the retries on the wire and the vendor's own wording. PathScribe never translates a vendor's field names or codes, and it does not claim to be a certified connector for any EHR.

## The setup order for Tier 6 {#ch7-order}
Breadcrumb: Home > Configuration > System > Integrations

Tier 6 is mostly optional. A laboratory that runs PathScribe on its own, with no LIS, no registry feed and no reporting tool, can skip all of it. Do the steps below only for the integrations you use, in this order. Each step names the screens that must be configured first (Tiers 1 to 5), and the same information appears in the "Setup sequence" box on each screen.

1. [Specimen Code Map](#screen-crosswalk): map each sending facility's own specimen codes to your Specimen Dictionary, so inbound orders resolve. Needs the Facility Dictionary and the Specimen Dictionary.
2. [Interface Dictionary](#screen-interface_dictionary) (ForMedrixAI staff only): describe a vendor's own fields. Customers do not do this step; it is listed so the numbering is complete.
3. [Assist LIS Ingestion](#screen-assist_lis_polling): for a laboratory whose LIS owns the case and PathScribe assists with AI drafts. Needs AI Behavior and the Synoptic Library.
4. [Reporting feed (Power BI)](#screen-bi_feed): let a reporting tool read PathScribe data. Needs the performing-lab facilities in the Facility Dictionary.
5. [Migration Field Mappings](#screen-migration_field_mappings): map a legacy system's field names, before any historical import.
6. [Historical Data Migration Jobs](#screen-migration-jobs): import a legacy file and check the job. Needs step 5.
7. [Requisition ingestion](#screen-requisition_ingestion): file batch-scanned paper requisitions on their cases by the barcode on each page. Needs the scanner's drop folder (or the system that sends scans).

The monitoring screens ([System Logs: interfaces](#screen-audit-interfaces), [Interface Engines](#screen-interface-engines), [Outbound Interface DLQ](#screen-outbound-interface-dlq), [Outbound Dispatches](#screen-outbound-dispatches) and the [Outbound Queue](#screen-outbound-queue)) and the test tools ([Outbound Interface Message Preview](#screen-outbound_message_preview), [Simulated mail outbox](#screen-simulated_mail), [Mock Interface Engine](#screen-mock-interface-engine) and [Mock EMR](#screen-mock-emr)) are not setup steps. Each says `Reference, not part of setup` and lists what must exist for it to show data.

## What this tier does and does not contain {#ch7-status}
Breadcrumb: Home > Configuration > System > Integrations

| Part of the outline | Status | What exists today |
|---|---|---|
| Interface engine architecture | Partial | The message contract and the browser side are built. The engine (BridgeLink) and the server endpoints it needs are Planned. See [How the interface engine fits](#ch7-architecture). |
| Outbound HL7 v2.x (ADT, ORU, ORM) | Partial | PathScribe sends a JSON message for the engine to turn into HL7, except three messages it builds as HL7 text itself. See [Message types](#ch7-hl7-types). |
| Inbound HL7 v2.x | Partial | The processors exist, and you can test them with pasted messages. No listener receives a live HL7 message yet. |
| FHIR R4 endpoint and OAuth2 client credentials | Not built | No endpoint and no setup screen. See [FHIR R4 and OAuth2](#ch7-fhir). |
| EHR integration (Epic, Cerner, MEDITECH, AthenaHealth) | Not built | No vendor connector, certified or not. See [EHR integration](#ch7-ehr). |
| Reference laboratory send-out and receive-back | Partial | Referral manifests are sent and a result payload is processed. No inbound endpoint receives a result yet. See [Reference laboratory interfaces](#ch7-reflab). |
| Interface monitoring, error queues and reprocessing | Built (browser side) | The screens and their capabilities work. The engine heartbeat and engine-side retries are Planned. See [Monitoring](#ch7-monitoring). |

## How the interface engine fits {#ch7-architecture}
Breadcrumb: Home > Configuration > System > Integrations

**Status:** Partial

### The term "PathScribe Interface Engine" {#ch7-pie-term}
Breadcrumb: Home > Configuration > System > Integrations

The outline for this guide calls the interface layer the PathScribe Interface Engine (PIE). That name does not appear in the product, its screens or its design documents, and this guide does not invent a product name. What the product has is two things that together do the work the outline describes:

- **The PathScribe side.** Services in the application decide what to send and when, build the JSON message, queue it, record the outcome and let an administrator resend, hold or release it. Everything in this chapter that you can click is on this side.
- **The interface engine.** The design uses BridgeLink, an open-source fork of Mirth Connect, as the engine. It turns PathScribe's JSON into HL7 (or another format), holds its own message store, sends to the receiving system, and receives replies. BridgeLink is the working name in the design documents (`INTERFACE_ENGINE_EDGE.md`). Its channel templates are Planned, not built.

### Where the engine runs {#ch7-hosting}
Breadcrumb: Home > Configuration > System > Integrations

The engine is one container image used in two places, chosen per hospital (decision D6). ForMedrixAI can host it in the tenant's region, or it can be installed on a virtual machine inside the hospital. The [Interface Engines](#screen-interface-engines) screen shows which of the two each engine is (**Hosted** or **On site**). The image, its channel templates and its health endpoints are Planned, with the server team.

HL7 messages do not travel on the SQL Server message bus (decision D1). The API server hands a message to the engine as a job of kind `interface.dispatch`, and the engine keeps HL7 in its own message store.

### What runs today and what is Planned {#ch7-today}
Breadcrumb: Home > Configuration > System > Integrations

| Piece | Status | What it means for you |
|---|---|---|
| Outbound messages, JSON envelope | Built (browser side) | The browser posts `{queueEntryId, transactionType, dispatchedAt, payload}` to the address in the build setting `VITE_INTERFACE_RECEIVER_ENDPOINT`. In a production build the address must be `https`; a missing or plain-HTTP address is refused before anything is sent. The wait is 15 seconds. |
| What counts as sent | Built (browser side) | Any 2xx answer marks the message sent. There is no HL7 acknowledgement (ACK) yet. A timeout, an unreachable engine and a rejection are three different errors on the screens. |
| Demonstration build | Demonstration | With no engine address set, a simulated engine receives every message and keeps it in a list. See [Mock Interface Engine](#screen-mock-interface-engine). |
| Inbound events from instruments | Built (browser side) | Four webhooks exist for the Cassette Engine: block exception, cassette dispatch outcome, material location and engraver status. They use a shared secret in the `X-API-Key` header, with an optional HMAC signature. |
| Inbound HL7 messages | Not built | The ADT and patient-management processors exist and are tested, but nothing receives a live HL7 message and calls them. |
| Server endpoints for the engine (`POST /api/interface/inbound`, `POST /api/interface/outbound-acks`, `POST /api/interface/heartbeat`, `GET /api/interface/engines`) | Planned | Written as a contract (phase 2e). They add hand-over, acknowledgement-settled outcomes, retry windows, dead letters and engine status. |
| Per-tenant engine credentials | Planned | OAuth2 client credentials or mutual TLS per tenant engine. See [FHIR R4 and OAuth2](#ch7-fhir). |

**Planned retry windows.** The contract says inbound messages wait 10 seconds, 30 seconds, 1 minute, 5 minutes, then 15 minutes, with a dead letter after 24 hours. Outbound messages are resent at 1, 5, 15 and 60 minutes, then hourly, for 24 hours. Registry submissions are kept for 72 hours. An acknowledgement of AA is sent; CA is sent or awaiting the application acknowledgement; AR and CE are retried within the window; AE and CR fail at once. A dead-lettered result holds later messages for the same case. None of this runs yet. Today a failed send waits for an administrator to resend it.

### Facility interface settings that are stored but not used {#ch7-facility-settings}
Breadcrumb: Home > Configuration > System > Integrations

The Facility Editor (Tier 1, [Facility Dictionary](#screen-facility-dictionary)) has a **LIS Integration** tab. It stores an engine address, HL7 version, authentication type (none, basic, OAuth2 or API key), a flag that says whether a credential has been provisioned, whether the LIS owns case statuses, whether PathScribe allows post-final actions, and the routing identifiers for the sending and receiving facility and an outbound channel override. These settings are saved with the facility. No send path reads them today. A message goes to the one deployment-level address above. The credential is never stored: only a Yes/No flag is.

## Inbound and outbound HL7 v2.x {#ch7-hl7}
Breadcrumb: Home > Configuration > System > Integrations

**Status:** Partial

### Message types {#ch7-hl7-types}
Breadcrumb: Home > Configuration > System > Integrations

There is no screen that switches message types on or off. The types below are fixed by the product. This part lists only what the code supports. Anything not listed is not supported.

**Outbound.** PathScribe queues these transaction types. The engine builds the HL7 for all of them except the three marked "PathScribe builds HL7".

| Transaction type | What it carries | HL7 form |
|---|---|---|
| `A08` | Patient demographic update | Engine builds ADT^A08. Sex is sent as M, F, U or A for indeterminate in PID-8 (the code A is an assumption pending confirmation with the receiving systems). For UK sites the NHS code is M to 1, F to 2, I to 9, U to X. |
| `A40` | Patient merge | Engine builds ADT^A40 |
| `A47` | Patient identifier change | Engine builds ADT^A47 |
| `ORU_R01` | Final, amended or corrected pathology result | Engine builds ORU^R01. For US electronic pathology (Tier 7), PathScribe builds an ORU^R01 v2.5.1 itself. |
| `LIS_SYNC` | Case data and an Assist case's synoptic result, for the LIS | Engine builds it |
| `ORDER_CREATED` | A new order | Engine builds it |
| `ACCESSION_EVENT` | An order accessioned, or an accession deficiency | Engine builds it |
| `REGISTRY_REPORT`, `CANCER_REGISTRY_REPORT` | Registry submissions (Tier 7) | Engine builds it. Acknowledgements come back. |
| `REPORT_DELIVERY` | A signed report PDF for e-fax or file drop | Engine or delivery service |
| `PRINT_JOB` | A report PDF for the engine to print | Engine |
| `REFERRAL_MANIFEST` | A referral batch's manifest for a reference lab | Engine builds it. Results come back. |
| `MOLECULAR_ORDER` | A molecular assay order or an instrument order | Engine builds it |
| `WSI_SCAN_MANIFEST` | The slides loaded in a whole-slide scan batch | Engine builds it. Slide scan status comes back. |
| `BLOCK_ORDER` | One block's stain orders for an embedding or staining instrument | PathScribe builds HL7: ORM^O01 |
| `SLIDE_ORDER`, `SPECIMEN_LABEL` | A slide order; a specimen container label | Engine builds it |
| `MATERIAL_SCAN_EVENT` | A barcode scan of a cassette or slide | Engine builds it |
| `CHARGE_DFT` | A charge for the billing system | PathScribe builds HL7: DFT^P03 |
| `CHARGE_JSON` | A charge as a JSON billing webhook | JSON, no HL7 |
| `FINANCIAL_CLASS` | Financial-class payload for a billing engine | A preview payload until the formats exist |
| `CRITICAL_ALERT` | Post-launch critical alert channels | Not wired. Nothing produces it today. |

The "ORM" in the outline is therefore the ORM^O01 that PathScribe builds for block orders to an instrument. PathScribe itself builds no ORM for an EHR or a LIS. The engine decides what HL7 an order-created message becomes, and there is no screen to add a message type.

**Inbound.** These processors exist in the application. None is connected to a live listener except the instrument webhooks above. You can run a pasted message through them with the [Mock Interface Engine](#screen-mock-interface-engine) in the demonstration build.

| Family | Messages | Status |
|---|---|---|
| Admit, discharge and transfer (`adtParser.ts`) | A01, A03, A04, A08, A02, A09, A10, A05, A06, A07, A11, A12, A13, A31 | Processor built; no listener |
| Patient management (`patientManagementParser.ts`) | A40 merge, A24 link, A47 identifier change, A43 move | Processor built; no listener. A message that cannot be matched is queued as an interface exception, never guessed. |
| Visit changes (`processVisitMessage.ts`) | A45, A50, A34 | Processor built; no listener |
| LIS order status (the Assist adapter) | ORU^R01, ORM^O01, OML^O21 | Status only. You can paste one into [Assist LIS Ingestion](#screen-assist_lis_polling). |
| JSON events | HPV result, block exception, material location, referral result, molecular run results, whole-slide scan status | Processors built; the instrument webhooks are the only live route |

**Inbound orders are not parsed from HL7.** The order-intake service takes a structured order, not an ORM message, so a live HL7 order from an EHR is not accepted today. The [Specimen Code Map](#screen-crosswalk) resolves an order's codes once an order reaches the service.

**Vendor adapters.** Adapters for Cerebro and Vantage are deliberately stubs that do nothing.

### Specimen Code Map {#screen-crosswalk}
Breadcrumb: Home > Configuration > System > Integrations > Order Types & Inbound Rules

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Integrations**
**2. Maintenance item:** Order Types & Inbound Rules (the menu name). The title on the screen is **Specimen Code Map**.

**3. Business purpose and scope.** A sending system uses its own codes for specimens, and the same code can mean different things at different sending systems. This screen maps each sending facility's code to one Specimen Dictionary entry. Every incoming order is checked against this table. When no entry matches, PathScribe does not block the order. It creates an entry marked **Auto-learned: pending review**, creates a pending Specimen Dictionary entry so the order can flow, and queues an interface exception of type `unmapped_order_code` for a person to resolve. You review the auto-learned entries here, or add a real entry ahead of time so a known code never has to be learned.

**4. Prerequisites and dependencies.** The **Facility** list is the Facility Dictionary and the **Resolves to** list is the Specimen Dictionary, so both are set up first. Skip them and the lists are empty, and a mapping cannot be saved because facility, external code and specimen type are all required.

Setup step: Tier 6, step 1
Requires: [Facility Dictionary](#screen-facility-dictionary), [Specimen Dictionary](#screen-specimens)
Unlocks: [System Logs: interfaces](#screen-audit-interfaces)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-crosswalk - Specimen Code Map list with the Add Mapping, Import Spreadsheet and Export buttons]

**6. Field reference.**

The list.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Facility | Text (read-only) | Not applicable | The sending facility the code comes from. | Not applicable |
| External Code | Text (read-only) | Not applicable | The sending system's own specimen code. | Not applicable |
| Resolves To | Text (read-only) | Not applicable | The Specimen Dictionary entry the code maps to. | Not applicable |
| Source | **Admin-confirmed** or **Auto-learned: pending review** | Not applicable | **Auto-learned** entries were created by the system when no entry matched. A count banner above the list says how many are waiting for review. | Not applicable |
| Pending Review banner | Count and link | Not applicable | Shown when unmapped order-code exceptions are pending. The link **View Unmapped Stubs in Audit Queue** opens System Logs, Interfaces, filtered to `unmapped_order_code`. | Hidden when the count is 0 |
| Add Mapping | Button | Not applicable | Opens the Add a mapping panel. | Not applicable |
| Import Spreadsheet | Button, CSV file | Not applicable | Reads a CSV with the columns Facility, ExternalCode and ResolvesTo and shows a preview before anything is saved. | Not applicable |
| Export | Button | Not applicable | Downloads `SpecimenCodeCrosswalk.csv` with the columns Facility, ExternalCode, ResolvesTo and Source. The export is recorded in the audit log. | Not applicable |

The Add a mapping panel.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Facility | Picklist from the [Facility Dictionary](#screen-facility-dictionary) | Required | The sending facility. The same code at two different facilities is allowed. | Blank |
| External code | Text | Required | The code exactly as the sender uses it. Matching ignores upper and lower case. The placeholder shows `TISSUE-01`. | Blank |
| Site (optional) | Picklist of sites, or **All sites** | Optional | Limits the mapping to one site. A new mapping saved without a site applies to all sites. | All sites |
| Resolves to specimen type | Searchable picklist from the [Specimen Dictionary](#screen-specimens), searching names and synonyms | Required | The entry an order with this code becomes. | Blank |
| Save Mapping | Button | Not applicable | Refused with a message if the same facility, code and site already map to an entry ("Facility already maps external code to entry"). | Not applicable |

The spreadsheet preview.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Summary line | Text | Not applicable | Rows ready, how many update an existing mapping, how many are new, and how many are skipped with errors. | Not applicable |
| Row errors | Text list | Not applicable | A facility name that matches no facility, a blank external code, or a specimen name that matches no Specimen Dictionary entry. Names are matched by name, ignoring case. A row with an error is skipped, never guessed. | Not applicable |
| Apply Import | Button | Not applicable | Saves every row without an error. A row whose facility and code already exist updates that mapping's specimen type. Imported rows have no site. | Disabled when every row has an error |

**7. Permissions.** Open the screen: `screen:configuration:open`. Add, import and update mappings: `config:crosswalk:manage` (high risk). Admin and Lab Director hold it by default; Superadmin holds every capability except `config:ai-prompt:approve`, which is withheld for separation of duties (the Lab Director approves AI instructions; ForMedrixAI support never does). Without it the screen is view only. Resolving an unmapped-code exception from the review window creates the same entry.

**Known limits.** The menu name (**Order Types & Inbound Rules**) differs from the title on the screen (**Specimen Code Map**); both are the same screen. There is no edit or delete on the list, only add and spreadsheet update. A live HL7 order is not received by any listener yet, so entries are used when an order reaches the order-intake service, not from a wire message.

### Assist LIS Ingestion {#screen-assist_lis_polling}
Breadcrumb: Home > Configuration > System > Integrations > Assist LIS Ingestion

**Status:** Partial

**1. Navigation:** Configuration tab **System** > group **Integrations**
**2. Maintenance item:** Assist LIS Ingestion

**3. Business purpose and scope.** In Assist mode the external LIS owns the case. Its updates reach PathScribe three ways, by polling, by an HL7 v2 message or by a JSON webhook, and all three go through one staging queue. When the LIS reports Gross Complete, the AI picks the synoptic templates and drafts the fields it can from the gross text. When the LIS reports Microscopic/Diagnosis Complete, it drafts the rest from the diagnosis. This screen holds the settings, a test box for pasted messages, the staging queue and the run log.

**What is built and what is not.** Built: the settings, the status mapping, the test box, the staging queue with its retries, the run log and the AI drafting rules. Simulated in the demonstration: the schedule (the app polls at the saved interval while it is open and polling is on, and the screen shows a **Simulated schedule** note with the last and next run) and the LIS that **Poll now** asks. Not built: a live listener for HL7 or webhook messages, and a field for the address of the LIS to poll. The screen has no such field.

**4. Prerequisites and dependencies.** The AI step uses the AI Behavior switches and the synoptic templates. If **AI turned off in AI Behavior** applies, an update changes the case text only and no draft is made. Only a case in Assist mode is processed; a case that is not Assist mode is skipped with the result **Not an Assist case**.

Setup step: Tier 6, step 3
Requires: [AI Behavior](#screen-tab-ai), [Synoptic Library](#screen-tab-protocols)
Unlocks: [System Logs: interfaces](#screen-audit-interfaces)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-assist_lis_polling - Assist LIS Ingestion with Polling, status mapping, test box, staging queue and activity]

**6. Field reference.**

Polling and status mapping.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Poll the LIS on a schedule | Yes/No switch. The label reads **Scheduled polling on** or **Scheduled polling off**. | Optional | Turns the scheduled poll on. On the production server the schedule runs on the PathScribe server. **Poll now** works whether this is on or off. | Off |
| Poll every (minutes) | Whole number from 1 to 1440 | Required | The gap between scheduled polls. A value outside the range or a fraction is refused with "The interval must be a whole number of minutes from 1 to 1440." | 5 |
| LIS status (each row) | Text | Required | One of your LIS's own status words, for example `GROSSED`. Matching ignores spaces at the ends and upper and lower case. A blank status is refused. The same status cannot be listed twice. | Four rows, below |
| Milestone (each row) | Choice of **Gross Complete** or **Microscopic/Diagnosis Complete** | Required | What the status means. Gross Complete triggers a gross-stage draft. Microscopic/Diagnosis Complete triggers a full draft. A status not in the list triggers nothing. | Gross Complete on a new row |
| Remove | Button | Not applicable | Removes the row. With no rows, the screen says "No LIS statuses mapped. Nothing will trigger an AI draft." | Not applicable |
| + Add status | Button | Not applicable | Adds an empty row. | Not applicable |
| Discard changes, Save | Buttons | Not applicable | Both stay disabled until something changes. Leaving the screen with unsaved changes asks first. | Not applicable |

The four default rows are `GROSS_COMPLETE` and `GROSSED` (Gross Complete), and `MICRO_COMPLETE` and `DX_COMPLETE` (Microscopic/Diagnosis Complete).

Test an inbound message.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Message format | Choice of **HL7 v2 message** or **JSON webhook** | Required | Which adapter reads the pasted text. | HL7 v2 message |
| Load example | Button | Not applicable | Fills the box with a sample for the chosen format. | Not applicable |
| Inbound message | Free text | Required | The message as the LIS would send it. It goes through the same adapter and staging queue as a real one and is handled straight away. A message that cannot be read shows a reason, for example "This isn't an HL7 v2 message (it must start with an MSH segment)." | Blank |
| Send to staging queue | Button | Not applicable | Shows "Staged: n, Handled now: n" or the reason. | Not applicable |

What the adapters read. An HL7 message must be an ORU^R01, ORM^O01 or OML^O21; any other type is refused. One update is made per OBR segment. The accession is OBR-3, else OBR-2, else ORC-3. The status is ORC-5, else OBR-25. The time is OBR-22, else MSH-7, and a time with no offset is read as UTC, so ask the LIS to send an offset. The text comes from OBX-5 by the LOINC code in OBX-3: `22634-0` gross, `22635-7` microscopic and `22637-3` final diagnosis. A JSON body is one object or a list, with `accession`, `status` and `updatedAt` (ISO 8601) required, and `grossText`, `microscopicText`, `diagnosisText`, `placerOrderNumber` and `fillerOrderNumber` optional. The order numbers are echoed on the synoptic result.

Staging queue.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Counts line | Text | Not applicable | Waiting, Failed and Handled counts. | Not applicable |
| Retry failed | Button | Not applicable | Retries every failed entry that has had fewer than 5 attempts. Disabled when none failed. | Not applicable |
| Received, Source, Accession, LIS status, State, Result, Attempts | Read-only columns | Not applicable | Source is **Poll**, **HL7 v2 message** or **JSON webhook**. State is **Waiting**, **Failed** or **Handled**. Result is the outcome or the error. The accession is tagged as patient data for redaction. The list shows the newest 25 rows. An entry stops being retried after 5 attempts. The newest 200 handled events are kept. | Not applicable |

Activity.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Poll now | Button | Not applicable | Asks the LIS for changes immediately. | Not applicable |
| Cursor line | Text | Not applicable | "Changes up to (time) have been handled" or "The LIS hasn't been polled yet." | Not applicable |
| Run table | Read-only columns: Time, Trigger, From LIS, New in queue, AI drafts, Text only, Skipped, Failed | Not applicable | Trigger is **Poll now**, **Schedule**, **Inbound message** or **Retry**. The log keeps the last 20 runs. | Not applicable |
| Latest poll | Read-only columns: Accession, LIS status, Milestone, Result, Details | Not applicable | One row per case in the newest run. A result is one of: AI draft prepared; No change since the last draft; Case not in PathScribe; Already signed out; Failed (will retry); Status not mapped; Not an Assist case; Text updated, AI turned off in AI Behavior; Text updated, draft already completed. Details give new drafts, fields suggested and template changes to review. | Not applicable |

**7. Permissions.** Open the screen: `screen:configuration:open`. Save settings: `config:assist-polling:manage` (high risk). Poll now, test message and Retry failed: `assist:lis-message:ingest` (high risk, audited); the scheduled poll is the system's and is not checked. Admin and Lab Director hold both by default.

**Known limits.** The poll source and the schedule are simulated in the demonstration build, and no listener receives an HL7 or webhook message from a real LIS. The HL7 adapter reads the status from ORC-5, then OBR-25, and the source describes this as a per-site setting, but the screen has no control for it. A signed-out case is never changed. A late or amended gross after the full draft only updates the text.

### Outbound Interface Message Preview {#screen-outbound_message_preview}
Breadcrumb: Home > Configuration > System > Integrations > Outbound Interface Message Preview

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Integrations**
**2. Maintenance item:** Outbound Interface Message Preview

**3. Business purpose and scope.** A check tool. It builds the JSON message PathScribe would queue for the interface engine for one real patient or case, shows it, and lets you download it as a file. Use it to give an interface analyst a real example to build from, or to check what the engine will receive before a channel is built. It sends nothing and queues nothing. It previews four message types only: ADT^A08, ADT^A40, ADT^A47 and ORU^R01.

**4. Prerequisites and dependencies.** There is nothing to configure first. It needs an existing patient record (for the ADT types) or a case with a finalized synoptic report (for the result). Without one the screen says the patient was not found or the payload builder returned nothing.

Setup step: Reference, not part of setup
Requires: None, this is a starting point.
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-outbound_message_preview - Message type picker, id fields and the JSON output]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Message type | Choice of ADT^A08 Demographic Update, ADT^A40 Merge Patient, ADT^A47 Change Identifier, ORU^R01 Pathology Result | Required | Decides which fields appear below. Changing it clears the output. | ADT^A08 |
| Patient ID (A08) | Text, a patient record id | Required for A08 | The patient whose demographic update is built. Tagged as patient data. | Blank |
| Prior (merged-away) Patient ID (A40) | Text | Required for A40 | The record that was merged away. | Blank |
| Surviving Patient ID (A40) | Text | Required for A40 | The record that remains. | Blank |
| Downtime/Temporary Patient ID (A47) | Text | Required for A47 | The temporary record whose identifier is corrected. | Blank |
| Confirmed Patient ID (A47) | Text | Required for A47 | The confirmed record. | Blank |
| Reason Code (A47) | Text | Required for A47 | Why the identifier changes. | Blank |
| Notes (A47) | Text | Required for A47 | A free-text note. | Blank |
| Case ID (ORU^R01) | Text | Required for ORU | The case. Tagged as an accession. | Blank |
| Synoptic Instance ID (ORU^R01) | Text | Required for ORU | A finalized synoptic report on that case. | Blank |
| Result state (ORU^R01) | Choice of **Final**, **Corrected**, **Addendum** | Required for ORU | The state of the result being previewed. | Final |
| Preview Payload | Button | Not applicable | Builds and shows the JSON. Disabled until the required fields for the chosen type are filled. | Not applicable |
| Download JSON | Button | Not applicable | Saves the shown message as `<type>_<time>.json`. The download is recorded in the audit log. | Not applicable |

Two warnings appear on the screen and are true. For A40 and A47 the counts of cases and encounters re-pointed show as 0, because the preview does not perform the merge. For ORU^R01 the report PDF and report narrative text show as absent, because they need the report-rendering pipeline that this screen does not have. Every other field has the shape the engine would receive. The ORU preview also needs the case to be in the orchestrator reporting mode, and a missing PDF is reported as "The report PDF isn't available for this result".

**7. Permissions.** Open the screen: `screen:configuration:open`. Build a preview and download it: `config:interface-preview:view` (high risk). Admin and Lab Director hold it by default.

**Known limits.** The screen's own subtitle says "PathScribe never builds or sends HL7 itself". That is not exactly true: PathScribe builds HL7 for block orders (ORM^O01), charges (DFT^P03) and US electronic-pathology results. This screen previews the JSON only. The four types are the only ones it can preview; the other transaction types in [Message types](#ch7-hl7-types) cannot be previewed here. The sent message can be seen after the fact on [Outbound Dispatches](#screen-outbound-dispatches) for order-creation events.

### [FORMEDRIXAI INTERNAL ONLY] Interface Dictionary {#screen-interface_dictionary}
Breadcrumb: Home > Configuration > System > Integrations > Interface Dictionary

> 🔒 **ForMedrixAI Internal Restricted Setting**
> **Scope:** Internal Service & Deployment Personnel Only.
> **Explanation:** A vendor profile decides which fields of a vendor's own HL7, JSON or FHIR message are copied onto a case as extension fields. A profile that is wrong, or changed without a test, would put the wrong value on a case or drop a required one, and the case record is a medical record. Only ForMedrixAI staff build and publish profiles, so each one is tested against a real sample and versioned. The three capabilities that guard it are platform-only, held by the Superadmin role and not assignable by a hospital. The section is not visible to anyone without them.

**Status:** Partial

**1. Navigation:** Configuration tab **System** > group **Integrations**
**2. Maintenance item:** Interface Dictionary

**3. Business purpose and scope.** The Interface Dictionary holds vendor profiles. A profile says, for one vendor or device and one message type, where each of the vendor's fields is in the message and which extension field (`ext.name`) on the case it becomes, with an optional conversion, a default, a code translation and a required flag. A profile goes through a fixed life: draft, test, publish, and later roll back or switch off. The same mapping engine is meant to read live messages, so a profile can add vendor fields without a code release.

**Built and not built.** Built: creating profiles, editing mappings, the test with a sample message, publish, roll back, switch off and the scope guard. Simulated: the **Apply to a case** panel, which applies a pasted message to a case so the Vendor fields panel can be seen. A banner says "Nothing is received from a vendor in this build." No vendor profiles are seeded, so the list starts empty. A profile can only fill an extension field. Anything else needs a code release (see the scope table below).

**4. Prerequisites and dependencies.** None in this guide. A vendor's sample message is needed to test.

Setup step: Tier 6, step 2
Requires: None, this is a starting point.
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-interface_dictionary - Vendor profiles list, mappings editor, test panel and versions]

**6. Field reference.**

New vendor profile.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Vendor or device | Text | Required | The vendor's name. A name already in use is refused. | Blank |
| Message format | Choice of **HL7 v2**, **JSON**, **FHIR** | Required | Decides the syntax of the location in each mapping. | HL7 v2 |
| Message type | Text. Placeholders: `ORU^R01` (HL7), `Observation` (FHIR), optional for JSON | Required for HL7 and FHIR | An HL7 profile needs a type such as `ORU^R01`. A FHIR profile needs a resource type such as `Observation`. A message of another type is refused. | Blank |
| Create profile | Button | Not applicable | Creates the profile with no live version. | Not applicable |

A mapping (one row each in the working copy, titled **Mapping n**).

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Where in the message | Text, in the form the format uses: `ZAB-3` or `OBX[2]-5.1` (HL7), `result.lotNumber` (JSON), `Observation.component[0].valueString` (FHIR) | Required | The location of the value. A location not written in the format's form is refused. A location that ends on a group, not a value, fails the test. A chip **Vendor segment (Z)** shows when an HL7 location is in a Z-segment. | Blank |
| Extension field | Text: `ext.` then a name that starts with a lower-case letter, letters and digits only, up to 40 characters | Required | The field on the case that receives the value. A part of the case's own structure is refused ("needs a code release"). Two mappings cannot fill the same field. | `ext.` |
| Name shown on the case | Text | Required | The label a user sees in the Vendor fields panel. | Blank |
| Type | Choice of Text, Number, Date, Date and time, Yes / no, Code | Required | The value is checked against the type in the test. | Text |
| Convert | Choice of None, Trim spaces, Lower case, Upper case, HL7 date to ISO, HL7 date and time to ISO | Optional | The date conversions need the Date or Date and time type. | None |
| Default if missing | Text | Optional | Used when the message has no value. It must suit the type. | Blank |
| Code translation | Text: `vendor value = shown value`, separated by commas. Example `F=Female, M=Male` | Optional | Each entry needs both sides. A value with no translation shows **no translation for this value** in the test. | Blank |
| Required (the test fails without it) | Yes/No checkbox | Optional | A message with no value for a required mapping fails the test. | Off |
| Add a mapping, Remove, Save mappings | Buttons | Not applicable | Edits apply to the working copy only. Save before testing or publishing. | Not applicable |

Test, publish and versions.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Sample message | Free text (tagged as patient data) | Required to test | A sample from the vendor. It is not saved; only the counts are kept. | Blank |
| Run test | Button | Not applicable | Shows each mapping's extension field, value and result: **Mapped**, **Default used**, **Not in message**, **Required value missing** or **Problem**. The summary reads "Mapped n, required missing n, problems n." | Not applicable |
| Publish | Button | Not applicable | Needs a saved working copy with at least one mapping, no mapping problems and a passing test that is newer than the last change. The live version becomes the previous version. | Not applicable |
| Versions table | Read-only: Version, Status, When, By | Not applicable | Status is **Draft**, **Tested**, **Live**, **Replaced** or **Switched off**. | Not applicable |
| Start a new draft | Button | Not applicable | Copies the live version into a new working copy. Only one working copy can be open per vendor. | Not applicable |
| Roll back | Button | Not applicable | Publishes the earlier version as a new version. | Not applicable |
| Switch off | Button | Not applicable | Retires the profile so no version is live. | Not applicable |
| Case (Apply to a case) | Text, a case id (accession) | Required | The case to receive the fields from the pasted message, read with the live version. Demo only, labelled **Simulated**. | Blank |

The scope table on the screen lists what mapping can handle (the vendor's codes, date and time formats, names shown on the case, extra JSON or FHIR elements, required values and defaults, testing and versioning, a vendor's own HL7 Z-segments) and what needs a code release (patient identity, order and accession details, specimens and blocks and slides, diagnosis and report content, sign-out and amendment, billing and charge rules, workflow and routing rules, and a new kind of message).

**7. Permissions.** All three are platform-only: `platform:interface-dictionary:manage` (create, edit, test, switch off, roll back), `platform:interface-dictionary:publish` (publish; needs manage) and `platform:interface-dictionary:simulate` (apply to a case in the demonstration; needs manage). Only the Superadmin role holds them. A hospital cannot grant them to its own roles. Without manage the section is hidden. A refused change says "Only ForMedrixAI staff can change vendor profiles."

**Known limits.** No vendor profile is seeded and no live message is read through a profile yet. The section header in the code calls this a Message Mapper; there is no such menu name.

## FHIR R4 endpoint and OAuth2 client credentials {#ch7-fhir}
Breadcrumb: Home > Configuration > System > Integrations

**Status:** Not built

PathScribe has no FHIR R4 endpoint. It does not publish a FHIR server, does not accept a FHIR resource from another system, and has no screen to configure a FHIR base address, a client id, a client secret or a token address. There is no OAuth2 client credentials setup screen either. Do not plan a go-live that depends on either.

What exists nearest to it, so you know what a question might be about:

| What | What it is | Status |
|---|---|---|
| Case service for a FHIR source (`FHIRCaseService.ts`) | Scaffolding for reading cases from a FHIR server. The base address is a placeholder and the function that gets an access token throws. It is not wired to any screen or setting. | Not built |
| FHIR as a message format in the [Interface Dictionary](#screen-interface_dictionary) | A vendor profile can be written for a FHIR resource such as `Observation`, and the test reads a pasted sample. Nothing receives a FHIR message from a vendor. | Partial, ForMedrixAI only |
| Authentication type in the Facility Editor | The **LIS Integration** tab lets you choose `OAuth2` as an authentication type for a facility's engine connection. It is a stored choice. No code reads it. | Stored only |
| OAuth2 client credentials, or mutual TLS, for each tenant's engine | The contract for how the engine proves itself to the PathScribe API (`INTERFACE_ENGINE_EDGE.md`). | Planned |
| Staff sign-in by OpenID Connect (OIDC) | Single sign-on for people, not for system-to-system messages. Covered in Tier 1. | Built (browser side) |
| Tokens for the [Reporting feed (Power BI)](#screen-bi_feed) | Bearer tokens that PathScribe issues, shows once and keeps only as a fingerprint. They are not OAuth2. | Partial |

The [Mock EMR](#screen-mock-emr) page contains the note "Production uses FHIR R4 API to sync with LIS". Nothing in the code backs that sentence. Treat it as a design intention.

## EHR integration: Epic, Cerner, MEDITECH and AthenaHealth {#ch7-ehr}
Breadcrumb: Home > Configuration > System > Integrations

**Status:** Not built

PathScribe has no connector for any EHR, certified or not. It is not listed in any vendor's marketplace and has not passed any vendor's validation by this guide's evidence. Whatever an EHR sends or receives goes through the interface engine, which the hospital's interface team configures, and PathScribe sees only the messages in [Message types](#ch7-hl7-types). Do not describe PathScribe to a customer as "Epic certified", "Cerner certified" or the like.

| EHR | What exists in PathScribe | What does not exist |
|---|---|---|
| Epic | An identifier-format preset named **Epic Beaker** (accession number and a 2D slide barcode pattern). Set on the Identifier Formats tab of the Facility Editor, Tier 1. | A connector, an Epic-specific message profile, a certification, a FHIR app registration. |
| Cerner | An identifier-format preset named **Cerner PathNet**. | The same. |
| MEDITECH | An identifier-format preset named **MEDITECH**. | The same. |
| AthenaHealth | Nothing. The name does not appear in the code, the screens or the design documents. | Everything. |

The same preset list also holds Generic, CoPath, Sunquest and Custom. A preset only decides which accession and barcode patterns the scan box recognises. It does not exchange a message with anything.

**What an EHR integration looks like today.** An EHR can reach PathScribe only through the engine, as the outbound messages in [Message types](#ch7-hl7-types) (results, patient updates, order events, accession events) and as inbound processors that are not yet connected to a live listener. The [Interface Dictionary](#screen-interface_dictionary) has no seeded vendor profile for any EHR. The [Specimen Code Map](#screen-crosswalk) maps an EHR's specimen codes once an order reaches the order-intake service. The EHR keeps authority over patient identity: an A40, A24, A47 or A43 message that cannot be matched is queued as an interface exception for a person, never guessed. See [System Logs: interfaces](#screen-audit-interfaces).

### Mock EMR {#screen-mock-emr}
Breadcrumb: Home > Mock EMR

**Status:** Demonstration

**1. Navigation:** A window opened from a case in the demonstration build, at the address `/mock-emr?case=<reference>`. It is built only when the demonstration tools are on (`__DEMO_TOOLS__`); a build that talks to an API server does not include it.
**2. Maintenance item:** Mock EMR

**3. Business purpose and scope.** A stand-in for an EHR's patient view, so a demonstration can show the EMR companion window next to a case. It looks up the case's patient by record number in the demonstration cases and shows a fixed clinical summary. It reads no real EHR and is labelled **DEMO: SYNTHETIC DATA**. If the record number matches no patient, it says **No Patient Found** rather than showing a wrong patient.

**4. Prerequisites and dependencies.** None. It needs a case with a patient in the demonstration data.

Setup step: Reference, not part of setup
Requires: None, this is a starting point.
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: screen-mock-emr - Mock EMR patient view with the demo badge]

**6. Field reference.** A read-only page. Nothing on it can be changed.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Patient name, MRN, date of birth, gender | Text (read-only, tagged as patient data) | Not applicable | From the matched demonstration case. Date of birth reads "not recorded" when absent. An NHS badge shows when an NHS number is verified. | Not applicable |
| Encounter, Status, Ward | Text (read-only) | Not applicable | Fixed demonstration values (Admitted, ward 4B Urology). | Fixed |
| Clinical Summary: Active Problems, Medications | Text (read-only) | Not applicable | Fixed demonstration text, not taken from the patient. | Fixed |
| Integration Note | Text (read-only) | Not applicable | The sentence about FHIR R4. See the note under [FHIR R4 and OAuth2](#ch7-fhir). | Fixed |

**7. Permissions.** There is no capability and the route has no screen gate. The page exists only in a demonstration build.

**Known limits.** Synthetic data only, and the clinical summary is the same for every patient. It is not an integration.

## Reference laboratory interfaces {#ch7-reflab}
Breadcrumb: Home > Configuration > System > Integrations

**Status:** Partial

A reference laboratory is a facility you send specimens to for outsourced testing, for example molecular or send-out immunohistochemistry. PathScribe supports the send-out with a manifest and the receive-back with a result message. The outbound side is built; the inbound side has a processor but no endpoint.

There is no screen called "reference lab interface". The setup is split across screens you already have:

1. **Make the lab a facility.** In the [Facility Dictionary](#screen-facility-dictionary), add the laboratory and give it the role **Reference Lab (Outbound Referral Destination)**. That role makes it selectable as the destination of a referral batch. Only an active facility with the role is offered.
2. **Link it to the tests it performs.** In the [Diagnostic Catalog](#screen-stains), a **Molecular** test lists the reference labs approved to perform it and which one is the default. The default must be one of the approved labs. The link is kept only for the Molecular category, and an add-on order for that test fills in the default and offers only the approved labs.
3. **Send.** Referral batches are made in [Batch Management](#screen-batch-management) with the processing node **External Referral** and a destination facility. When the batch completes reconciliation, PathScribe queues a `REFERRAL_MANIFEST` message and creates the tracking record automatically. A failure here never blocks the batch's own completion. The manifest carries the batch id, the master barcode, the destination facility, the test requested, the priority (**STAT** or **Routine**), the items (display id, material type, case accession and specimen label) and any send-out molecular orders. PathScribe decides what and when; the engine decides the transport.
4. **Watch the send.** The message appears in the [Outbound Queue](#screen-outbound-queue) under the feed **Referrals**, and in the [Outbound Interface DLQ](#screen-outbound-interface-dlq) under the queue **Referral Manifest**, where a failed one is resent.
5. **Receive back.** A result message (`ReferralResultEventPayload`) carries the batch id and either a **discrete** result (text) or a **pdf_attachment** (a link to a PDF), never both, and optionally the results for each send-out molecular order. The processor checks the shape, finds the batch, records the result and marks the batch **result_received**, then applies coded results to the molecular orders. The status of a batch moves only forward: dispatched, in transit, delivered, result received. A person can set in transit and delivered by hand; result received is set only when a result arrives.

**What is not built.** No endpoint receives a result message, so no result arrives from a reference lab on its own. The processor remembers the message ids it has handled only in memory, so a restart forgets them. It returns one of four answers: applied, already applied, tracking not found, or invalid payload. There is no test sample for a referral result in the [Mock Interface Engine](#screen-mock-interface-engine). A reference lab's own wording (its test names and result codes) is not translated by PathScribe; the engine owns that.

## Interface monitoring, error queues and reprocessing {#ch7-monitoring}
Breadcrumb: Home > Quality & Compliance

**Status:** Built (browser side)

Everything an administrator needs to see what failed, and to resend, hold or release it, is on the screens in this part. They work today against the demonstration data and against the services for the API server. What the engine adds when it is connected (a heartbeat, acknowledgement-settled outcomes and automatic retry windows) is Planned. See [What runs today and what is Planned](#ch7-today).

### Reprocessing rules at a glance {#ch7-reprocessing}
Breadcrumb: Home > Quality & Compliance

A failed message is never discarded, and nothing is resent without a person pressing a button today. The rules below are what the code enforces.

| Situation | Where it appears | What you can do | Capability |
|---|---|---|---|
| An inbound patient message could not be matched (A40, A24, A47, A43) | [System Logs: interfaces](#screen-audit-interfaces), Interface Exceptions | Review it, bind the patients by hand or move cases, or dismiss it. The message is never guessed. | None dedicated. See the known limits there. |
| An inbound order code has no Specimen Dictionary match | Interface Exceptions, type `unmapped_order_code` | **Map & Link** creates the [Specimen Code Map](#screen-crosswalk) entry, or dismiss. | `config:crosswalk:manage` for the entry |
| An outbound message failed to send | [Outbound Interface DLQ](#screen-outbound-interface-dlq), and the [Outbound Queue](#screen-outbound-queue) as **Failed** | **Retry Dispatch** or **Dispatch Now** sends it to the engine again. | `interface:outbound:resend` |
| A message should not go yet | Outbound Queue, **Waiting** or **Failed** | **Hold** it with a reason, then **Release** it. A held message is not sent by any other action: retry says "Held on the Outbound Queue screen: release it there first." | `interface:outbound:hold`, `interface:outbound:release` |
| A message failed past its automatic retries | Outbound Queue, **Dead-lettered** | **Retry**, or **Retract charge** for a billing item. | `interface:outbound:resend`, `interface:outbound:retract` |
| A registry rejected a submission | Outbound Queue, **Rejected** | **Retry** (resubmit) with a reason, or **Mark not reportable** with a reason. | `interface:outbound:resend`, `interface:outbound:mark-not-reportable` |
| A charge should leave early or be cancelled | Outbound Queue, billing items | **Release now** or **Retract charge**. | `interface:outbound:override-release`, `interface:outbound:retract` |
| A report print, fax or file drop failed after its retries | Delivery exceptions, at the top of the Outbound Interface DLQ | Resend from its own queue (the Print Queue, or Report Delivery). It leaves the list when it goes through. | `interface:outbound:resend` for report delivery |
| A queued charge failed | The Outbound DLQ sub-tab of System Logs, Financial (Tier 7) | See [System Logs: financial](#screen-audit-financial). | See that screen |

**The built-in roles.** Admin holds all of the `interface:outbound:*` capabilities, `interface:engine-status:view` and `jobs:server-job:view`. Lab Director holds none of them and does not have the Outbound Queue screen. QA Reviewer opens the audit log screen and the exports only. Superadmin holds every capability except `config:ai-prompt:approve`, which is withheld for separation of duties (the Lab Director approves AI instructions; ForMedrixAI support never does). There is no built-in Interface Analyst role: a hospital creates one and grants it the capabilities it wants (the seed file says so).

**What a resend does.** A resend builds the message again from the record and posts it. If the record it refers to no longer exists, nothing is sent and the screen says "Not sent: the message couldn't be built". A result with no report PDF yet is held, not sent, and goes with the PDF on a later retry. Every action that changes a message is recorded in the audit log, one entry per message, and the audit text never carries a patient name. The wire-level retry (the engine retrying a connection) is the engine's, not PathScribe's.

### System Logs: interfaces {#screen-audit-interfaces}
Breadcrumb: Home > Quality & Compliance > System Logs > Interface Log

**Status:** Built

**1. Navigation:** Home > **Quality & Compliance** > **System Logs** > tab **Interface Log** (the tab name on the screen), at `/audit?tab=interfaces`.
**2. Maintenance item:** System Logs: interfaces

**3. Business purpose and scope.** The one place to see what went wrong at the boundary with other systems. It has five sub-tabs: **Interface Exceptions** (inbound messages that could not be processed), **Outbound Interface DLQ** (outbound messages that failed or are waiting), **Outbound Dispatches** (the trail of order-creation events), **Print Queue** and **Engines** (interface engine status, shown only with `interface:engine-status:view`). A line above the sub-tabs summarises the engines and opens **Engines** in one click. The tab shows a badge with the number of pending exceptions.

This chapter documents Interface Exceptions here and the other four sub-tabs on their own screens: [Outbound Interface DLQ](#screen-outbound-interface-dlq), [Outbound Dispatches](#screen-outbound-dispatches) and [Interface Engines](#screen-interface-engines). The Print Queue sub-tab is not documented in this guide; see the open questions.

**4. Prerequisites and dependencies.** Nothing is configured here. The list fills when an interface exception is raised. Unmapped order-code exceptions appear when the [Specimen Code Map](#screen-crosswalk) has no entry for a code.

Setup step: Reference, not part of setup
Requires: [Specimen Code Map](#screen-crosswalk)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: screen-audit-interfaces - Interface Log tab with Interface Exceptions sub-tab, status pills and search]

**6. Field reference.**

Interface Exceptions sub-tab.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Status pills | Choice of **All**, **Pending**, **Resolved**, **Dismissed**, each with a count | Optional | Filters the list. | All |
| Search | Text, placeholder "Search event type, reason..." | Optional | Matches the event type and the reason. The Specimen Code Map link opens this tab searched for `unmapped_order_code`. | Blank |
| Export CSV | Button | Not applicable | Downloads the filtered list. No patient name, record number or date of birth is included. Audited. | Not applicable |
| Map Patient | Button, shown when the user belongs to an organisation | Not applicable | Opens the break-glass tool to rebind a downtime patient identity. A rare, restricted action. | Not applicable |
| Timestamp | Date and time (read-only) | Not applicable | When the exception was raised. | Not applicable |
| Event Type | Text badge (read-only), for example `A40`, `A24`, `A47`, `A43`, `unmapped_order_code` | Not applicable | The kind of message. A support reference chip sits beside it. | Not applicable |
| Reason | Text (read-only, tagged as patient data) | Not applicable | The exact reason it could not be processed, for example "MRG-5 does not match any known Encounter." | Not applicable |
| Source Patient, Target Patient | Text (read-only, tagged as a record number) | Not applicable | The identifiers extracted before the failure. A dash when none could be read. | Not applicable |
| Status | **Review** button while pending; **Resolved** or **Dismissed** badge after | Not applicable | **Review** opens the window below. | Pending |
| Footer | "Showing n of n interface exceptions" | Not applicable | The shown and total counts. | Not applicable |

#### Review Interface Exception window
Breadcrumb: Home > Quality & Compliance > System Logs > Interface Log > Review Interface Exception

What the window offers depends on the event type. Dismiss is available for every type.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Source Patient, Target Patient | Text (read-only) | Not applicable | The two patients the message named. "Patient identity could not be resolved" appears with the raw identifier when matching failed. | Not applicable |
| Source patient's active cases (A43 only) | Checkbox list of cases with specimen, facility and status | Optional | Choose which cases, if any, move to the target patient. | None selected |
| Move Selected Cases (A43 only) | Button | Not applicable | Moves each selected case and records the exception as resolved with a note of how many moved and any failures. Disabled until a case is selected and both patients are known. | Not applicable |
| Search and patient picklists (A40, A24, A47) | Search box and picklist, one for each side. A47 has only the source side, "Patient whose identifier is corrected". A40 shows "Prior patient (merged away)" and "Surviving patient". A24 shows "First patient record" and "Second patient record". | Required | Choose the record(s) the message meant. "Nothing is guessed." | Blank |
| Apply (A40, A24, A47) | Button, "Apply A40" and so on | Not applicable | Applies the message by hand to the patients you chose. | Not applicable |
| Raw order code, Normalized, Coding system (`unmapped_order_code`) | Text (read-only) | Not applicable | What came in and how it was normalised. | Not applicable |
| Map to Specimen Dictionary entry (`unmapped_order_code`) | Searchable picklist | Required to map | The entry this code should resolve to. | Blank |
| Map & Link (`unmapped_order_code`) | Button | Not applicable | Creates the [Specimen Code Map](#screen-crosswalk) entry directly, so later orders with this exact code resolve and do not repeat the exception. An exception raised before facility tracking existed cannot be mapped here; add the entry on the Specimen Code Map, then dismiss. | Not applicable |
| Dismiss: No Action Needed | Button | Not applicable | Closes the exception with no change. Use it once the correct identity has been confirmed upstream, for example by a corrected re-send from the EHR. | Not applicable |

**7. Permissions.** Open the screen: `screen:audit-log:open`. Export the list: `audit:interface-log:export` (high risk). Map Patient: `patient:break-glass:rebind` (high risk; Admin holds it by default). Admin, Lab Director and QA Reviewer open the audit log screen by default. See [Reprocessing rules at a glance](#ch7-reprocessing) for the other sub-tabs.

**Known limits.** Resolving, dismissing and binding an interface exception has no capability of its own: anyone who can open the screen can do them. The exception from an inbound HL7 message can only appear when the message is processed, and no live listener exists yet, so in the demonstration build exceptions come from the [Mock Interface Engine](#screen-mock-interface-engine) simulator. Review for an event type other than the five above offers Dismiss only.

### Interface Engines {#screen-interface-engines}
Breadcrumb: Home > Quality & Compliance > System Logs > Interface Log > Engines

**Status:** Partial

**1. Navigation:** System Logs, tab **Interface Log**, sub-tab **Engines**. The sub-tab appears only for people with `interface:engine-status:view`.
**2. Maintenance item:** Interface engines (the on-screen title)

**3. Business purpose and scope.** One list of each hospital's interface engine, saying whether its listeners are up, what is waiting and what failed. It refreshes every minute and has a **Refresh** button. It is read only: channels are started and stopped on the engine itself, and failed outbound messages are resent from the [Outbound Interface DLQ](#screen-outbound-interface-dlq) (the **Open Outbound** button goes there).

**What is built and what is Planned.** The screen and the status rules are built. The data comes from the engine's heartbeat, which the engine posts every 60 seconds to an endpoint that is Planned (`POST /api/interface/heartbeat`; the list is `GET /api/interface/engines`). Until then the demonstration shows four sample engines, one for each status, with a **Simulated** badge, and says "There is no interface engine in the demo." With no engine registered, the list says "No interface engine has been registered yet."

**4. Prerequisites and dependencies.** Nothing is configured here. An engine must be installed and registered by ForMedrixAI; that is Planned.

Setup step: Reference, not part of setup
Requires: None, this is a starting point.
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: screen-interface-engines - Interface engines with status, channels, queued and dead letters]

**6. Field reference.** A read-only page.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Summary line | Text, "Interface engines: ..." | Not applicable | Counts: online, degraded, offline, needing attention, listeners down, messages waiting. | Not applicable |
| Status | **Online**, **Degraded**, **Offline**, **Needs attention** (read-only) | Not applicable | Offline: no heartbeat for 180 seconds, by the server's clock. Degraded: PathScribe cannot be reached from the engine, the certificate expires in under 14 days, free disk is under 15 percent, a channel is in error, paused or stopped, or a message has waited more than 15 minutes. Needs attention: otherwise healthy but a channel has dead letters. Online: none of these. | Not applicable |
| Hosting | **Hosted** or **On site** | Not applicable | Where the engine runs (decision D6). | Not applicable |
| Version, Last check-in | Text | Not applicable | The engine version, and "Never checked in" when none. | Not applicable |
| Reaches PathScribe | Text | Not applicable | **Reaches PathScribe**, or "Can't reach PathScribe: storing messages to forward". | Not applicable |
| Disk free, Certificate expires | Percent, date | Not applicable | The two health inputs above. | Not applicable |
| Channel | Text | Not applicable | The engine's channel. | Not applicable |
| Direction | **Inbound (listener)** or **Outbound** | Not applicable | | Not applicable |
| State | **Started**, **Paused**, **Stopped**, **Error** | Not applicable | A channel problem line explains: Waiting more than n minutes; Dead letters to resolve; In error; Paused, queue kept; Stopped. | Not applicable |
| Waiting, Oldest waiting, Dead letters | Number, minutes, number | Not applicable | Queue depth, age of the oldest waiting message and the count of dead-lettered messages. | Not applicable |
| Totals | Text | Not applicable | Messages waiting, dead letters and listeners down across engines. | Not applicable |
| Refresh, Open Outbound | Buttons | Not applicable | | Not applicable |

**7. Permissions.** `interface:engine-status:view` (standard risk; needs `screen:audit-log:open`). Admin holds it by default; a hospital can grant it to its interface analysts. A person without it does not see the sub-tab, and a refused read says "You don't have permission to see the interface engines."

**Known limits.** No engine reports yet, so the real list is empty until the heartbeat endpoint and the engine image exist (Planned, phase 2e). The health limits are fixed in code and have no setting.

### Outbound Interface DLQ {#screen-outbound-interface-dlq}
Breadcrumb: Home > Quality & Compliance > System Logs > Interface Log > Outbound Interface DLQ

**Status:** Built

**1. Navigation:** System Logs, tab **Interface Log**, sub-tab **Outbound Interface DLQ**.
**2. Maintenance item:** Outbound Interface DLQ

**3. Business purpose and scope.** A dead-letter queue (DLQ) is the list of messages that could not be sent. This screen shows failed and waiting outbound interface messages for one queue at a time and lets you send them again. **Dispatch Now** and **Retry** send the message to the interface engine. The **Simulate** buttons are a testing aid and never send. A failed charge is in the separate financial DLQ ([System Logs: financial](#screen-audit-financial)). The delivery exceptions panel (below) sits at the top.

**4. Prerequisites and dependencies.** Nothing is configured here. A message appears after an outbound send fails. If `VITE_INTERFACE_RECEIVER_ENDPOINT` is unset the demonstration engine accepts or rejects according to its response mode (see [Mock Interface Engine](#screen-mock-interface-engine)).

Setup step: Reference, not part of setup
Requires: None, this is a starting point.
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: screen-outbound-interface-dlq - Outbound Interface DLQ with queue picker, failed rows and delivery exceptions]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Queue | Choice of eight queues: Pathology Result (ORU^R01); Cytology Result (ORU^R01); Patient ADT (A08/A40/A47); Assist-Mode LIS Sync; Accession events (accessioned / deficiency); Report Delivery (E-fax, File Drop); Referral Manifest; Molecular / Instrument Order | Required | Selects the queue. The first two identifier and kind columns change with it (for example Case and Result State; Source Patient and Event Type; Batch barcode and Priority; Specimen or barcode and Assay; Accession and Channel and report). Changing the queue clears the outcome messages. | Pathology Result |
| Failed: identifier, kind | Text (read-only, tagged as patient data) | Not applicable | The record and its kind. | Not applicable |
| Failed: Error | Text (read-only) | Not applicable | One of **Dispatch rejected**, **Dispatch timeout**, **Engine unreachable** or **Unknown**, with the message below it. | Not applicable |
| Failed: Retries | Number | Not applicable | How many times it was resent. "(max exceeded)" shows when the entry carries that flag. The browser's own dispatch never sets the flag today. | Not applicable |
| Failed: Retry Dispatch | Button | Not applicable | Resends. The answer shows beside it: "Sent and accepted by the interface engine"; "Not sent: the reason is in the Error column"; "Held: the report PDF isn't available yet"; "Not sent: the message couldn't be built"; "That message is no longer in the queue"; "Held on the Outbound Queue screen: release it there first"; or "You don't have permission to resend interface messages." | Not applicable |
| Failed: Capture as CAPA | Button | Not applicable | Records the failure as a corrective and preventive action (CAPA) item. The row then shows **Captured**. | Not applicable |
| Queued: identifier, kind, Queued At | Read-only | Not applicable | Messages waiting to go. | Not applicable |
| Queued: Dispatch Now | Button | Not applicable | Sends the message now. | Not applicable |
| Queued: Simulate Rejected, Simulate Timeout, Simulate Unreachable | Buttons | Not applicable | Fabricate a failure of that kind for testing. They never reflect a real send. | Not applicable |
| Delivery exceptions (n) | Read-only list: Case, Channel, Attempts, Last error, Fallback, Gave up | Not applicable | Prints, faxes and file drops that still failed after their automatic retries. A rule's fallback channels show as "Sent by ...". Admin and Lab Director are sent a message when one is added. A delivery that goes through on resend leaves the list at the next sweep. "No delivery exceptions." when empty. | Not applicable |

**7. Permissions.** Open: `screen:audit-log:open`. Dispatch Now, Retry Dispatch and the Simulate buttons: `interface:outbound:resend` (high risk, audited). Admin holds it by default. A hospital can grant it to its own interface analyst role. Capture as CAPA has no capability of its own.

**Known limits.** The subtitle says "seven queues" but the screen offers eight. There is no automatic retry in the browser: a failed message waits for a person. The planned retry windows are in [What runs today and what is Planned](#ch7-today).

### Outbound Dispatches {#screen-outbound-dispatches}
Breadcrumb: Home > Quality & Compliance > System Logs > Interface Log > Outbound Dispatches

**Status:** Built

**1. Navigation:** System Logs, tab **Interface Log**, sub-tab **Outbound Dispatches**.
**2. Maintenance item:** Outbound Dispatches

**3. Business purpose and scope.** The trail of every order-creation event PathScribe sent to the interface engine (Category E), with its outcome. It is a record, not a failure queue. Failed sends of results and patient updates are in the [Outbound Interface DLQ](#screen-outbound-interface-dlq). Open a row to see the exact JSON that was sent. PathScribe sends JSON; the engine builds the HL7 message from it.

**4. Prerequisites and dependencies.** Nothing is configured here. Rows appear when an order-created message is sent.

Setup step: Reference, not part of setup
Requires: None, this is a starting point.
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: screen-outbound-dispatches - Outbound Dispatches table and payload drawer]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Status filter | Choice of **All**, **Delivered**, **Failed**, **Outcome unknown** | Optional | Filters the table. Outcome unknown means the message was recorded but no outcome came back. | All |
| Search | Text, "Search message ID or accession..." | Optional | Matches message id and accession. | Blank |
| Timestamp | Date and time (read-only) | Not applicable | When it was sent. | Not applicable |
| Message ID | Text (read-only) | Not applicable | The message's id. | Not applicable |
| Accession | Text (read-only, tagged as patient data) | Not applicable | The case. | Not applicable |
| Category | Text, **E: Order** | Not applicable | The category of the transaction. | Not applicable |
| Message Type | Text (read-only) | Not applicable | The transaction type. | Not applicable |
| Ordering Facility | Text (read-only) | Not applicable | The facility the order came from. | Not applicable |
| Status | **Delivered**, **Failed**, **Outcome unknown**, with "n attempts" | Not applicable | The outcome. | Not applicable |
| Outbound Payload drawer | Read-only JSON with **Copy Payload** | Not applicable | The exact JSON sent, and the error if it failed. Copy puts it on the clipboard. | Not applicable |
| Footer | "Showing n of n outbound dispatches" | Not applicable | | Not applicable |

**7. Permissions.** Open: `screen:audit-log:open`. There is no capability on the table or the copy button. Admin, Lab Director and QA Reviewer open the audit log screen by default.

**Known limits.** Only order-creation events are in this trail. Other transaction types are in the DLQ while they fail and in the [Outbound Queue](#screen-outbound-queue).

### Outbound Queue {#screen-outbound-queue}
Breadcrumb: Home > Quality & Compliance > Outbound Queue

**Status:** Built

**1. Navigation:** Home > **Quality & Compliance** > **Outbound Queue**, at `/outbound-queue`.
**2. Maintenance item:** Outbound Queue

**3. Business purpose and scope.** Every outbound message in one place: hold, release or retry it, and fix what a registry rejected. It brings together ten feeds (Results, Patient ADT, Accession, LIS sync, Billing, Report delivery, Cytology results, Referrals, Molecular orders, Registry) and shows each message's destination (Interface engine, Billing system, LIS partner, Delivery service or Registry), the transport the engine uses (REST + mTLS, SFTP, Portal upload, PHIN-MS, Direct TCP or HTTPS API, which are shown as part of the destination label only) and its state. PathScribe decides what is released and when; the engine does the transport.

**4. Prerequisites and dependencies.** The queue reads when a message goes, and its reporting deadline, from the [Delivery Schedules](#screen-delivery_schedules): the performing facility's own schedule, else the enterprise's, else the feed's default. Without a schedule a message follows the feed's default. Billing items also follow the billing release settings, and registry items the registry settings, both in Tier 7.

Setup step: Reference, not part of setup
Requires: [Delivery Schedules](#screen-delivery_schedules)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: screen-outbound-queue - Outbound Queue with feed filters, deadline tiles, state column and action bar]

**6. Field reference.**

Filters and tiles.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Filter by feed | Ten toggle chips | Optional | Shows only the chosen feeds. | All feeds |
| Facility | Picklist, **All facilities** or one facility | Optional | Limits to a facility. | All facilities |
| Search by accession number | Text | Optional | Matches the accession. | Blank |
| Needs review tile | Toggle with count | Optional | Shows billing items parked for a person (**Needs review: unmapped CPT code**, **no technical-component facility**, **delta charge from an amended case**) and registry items that need review (a required field empty, no performing facility, no state profile, a state rule such as "No ICD-O-3 code on the case"). | Off |
| Amendment deltas tile | Count | Not applicable | Charges from amended cases. | Not applicable |
| Reporting deadlines tiles | Counts, **Overdue** and **Due soon** | Not applicable | Registry reporting deadlines. | Not applicable |
| Sort by, direction | Choice of Feed, State, Queued time, Scheduled time, Attempts, Reporting deadline; ascending or descending | Optional | The default order puts rejected first, then dead-lettered, failed, held, waiting, sent, acknowledged, not reportable, retracted. | State order |

The list.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Select (row and select all) | Checkbox | Optional | Chooses messages for a bulk action. The count reads "Selected: n". | None |
| Feed, Accession, Destination | Text (read-only) | Not applicable | The feed, the case and the destination with its transport. | Not applicable |
| State | One of **Waiting**, **Held**, **Sent**, **Acknowledged**, **Failed**, **Dead-lettered**, **Rejected**, **Not reportable**, **Retracted** | Not applicable | Waiting: queued, goes at its time. Held: a person stopped it. Sent: the engine has it. Acknowledged: the receiver confirmed. Failed: a send failed. Dead-lettered: failed past its automatic retries. Rejected: a registry returned it with errors. Not reportable and Retracted are closed. | Not applicable |
| Attempts, Scheduled, Deadline, Detail | Read-only | Not applicable | Detail carries the hold reason ("Held: ..."), the error, a scheduled release date, a correction due date, "Released ahead of schedule (user id)", "Amends an earlier message", or the registry's reason. | Not applicable |

Actions, which apply to the selected messages and check the capability once for the selection. Each message gets its own result; a refusal for one does not stop the rest.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Hold | Button, then a panel | Required reason | Allowed for Waiting and Failed. Reason: Receiver downtime, Receiver maintenance, Checking the data, Billing review, Possible duplicate or Other. An optional note up to 200 characters, with the placeholder "No patient details". | Not applicable |
| Release | Button | Not applicable | Allowed for Held. Returns it to the queue. | Not applicable |
| Retry | Button, then a panel for a rejected one | Required reason when rejected | Allowed for Failed, Dead-lettered and Rejected. A rejected message needs the reason it was fixed: Data corrected, Coding corrected, Pathologist corrected or Other. | Not applicable |
| Mark not reportable | Button, then a panel | Required reason | Allowed for Rejected. Reason: Not a reportable condition, Outside the registry's jurisdiction, Already reported or Other. Nothing more is sent. | Not applicable |
| Retract charge | Button, then a panel | Required reason | Billing items only; allowed for Waiting, Held, Failed and Dead-lettered. Reason: Case amended, Case retracted, Duplicate charge or Other. Terminal. | Not applicable |
| Release now | Button | Not applicable | Billing items only; allowed for Waiting and Held. Sends ahead of the schedule and records the user's id. | Not applicable |

A refusal is reported as a count: not permitted, no longer in the queue, not holdable, not held, not retryable, not rejected, not retractable, not releasable, reason required, or not sent (see the Detail column). The summary says "Changed: n" and "Not applicable to the state: n."

**7. Permissions.** Open: `screen:outbound-queue:open`. Retry: `interface:outbound:resend`. Hold: `interface:outbound:hold`. Release: `interface:outbound:release`. Mark not reportable: `interface:outbound:mark-not-reportable`. Retract charge: `interface:outbound:retract`. Release now: `interface:outbound:override-release`. All are high risk and audited. Each of the five besides resend needs the screen capability. Admin holds all of them and the screen by default. Lab Director and QA Reviewer do not have the screen. Hold and release are checked once for a bulk selection.

**Known limits.** The queue holds the messages the PathScribe side knows about. Whether a message reached its receiver depends on the engine's acknowledgement, which is Planned: today any 2xx answer counts as sent. Acknowledged appears only for feeds that carry an acknowledgement (registry). The transport named in the destination is a label, because the engine owns the transport.

## Other integrations and test tools {#ch7-other}
Breadcrumb: Home > Configuration > System > Integrations

**Status:** Partial

These screens belong to Tier 6 but are not about the interface engine: a reporting feed for analytics tools, the import of a legacy system's history, and the demonstration tools that stand in for systems that are not connected.

### Reporting feed (Power BI) {#screen-bi_feed}
Breadcrumb: Home > Configuration > System > Integrations > Reporting feed (Power BI)

**Status:** Partial

**1. Navigation:** Configuration tab **System** > group **Integrations**
**2. Maintenance item:** Reporting feed (Power BI)

**3. Business purpose and scope.** Lets Power BI, Excel, Tableau or a script read PathScribe data through a reporting API on the API server. They never connect to the database. You choose what the feed offers (datasets and performing-lab facilities), issue one token for each tool, and keep identifying data out unless a named person has approved it. By default a token is de-identified: names, record numbers, birth dates and free text are removed, dates are reduced to the month, and ages of 90 and over show as 90+.

**What is built and what is not.** Built: the settings, the approval record, token creation, replacement and revocation, the field catalogue and the pull test. A token is shown once; PathScribe keeps only a fingerprint and cannot show it again. Not connected: the feed itself. The reading call, `GET /api/bi/v1/{dataset}` with `Authorization: Bearer psbi_...`, is a written contract and the server work item PS-787. In the demonstration build the settings and tokens are kept in the browser, and **Test a pull** only simulates how the server would answer (it returns no rows). A banner says so.

**4. Prerequisites and dependencies.** A token can only be limited to facilities that have the performing-lab role, so those facilities come first. Skip them and the screen says "No performing-lab facilities are set up", and a token cannot be created because at least one facility must be offered.

Setup step: Tier 6, step 4
Requires: [Facility Dictionary](#screen-facility-dictionary)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-bi_feed - Reporting feed settings, identified-token approval, token list, pull test and field catalogue]

**6. Field reference.**

What the feed offers.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Reporting feed is on | Yes/No switch | Optional | While it is off, every token is refused and new tokens cannot be created. | Off |
| Datasets | Checkboxes: Audit summaries, Billing events, Cases and turnaround, Quality and discordance, Specimens, Workload and productivity. The ones that can identify a patient are tagged "can identify a patient" (cases, specimens, billing, quality). | Optional | The datasets any token may read. Audit summaries are daily counts with no user or patient detail. Workload has no patient data. | None ticked |
| Performing-lab facilities | Checkboxes | Optional | The facilities the feed offers. A token can be limited to some of them and can never reach one that is not ticked. | None ticked |
| Discard changes, Save settings | Buttons | Not applicable | Disabled until something changes. | Not applicable |

Identified tokens.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Approved by | Text, up to 80 characters | Required to record | The named person who approved identified data. | Blank |
| Reason | Text, up to 500 characters | Required to record | Why identified data is needed. | Blank |
| Record approval | Button | Not applicable | Records the approval, with who recorded it and when. Identified tokens can then be created. | Not applicable |
| Withdraw approval | Button | Not applicable | Removes it. An identified token then gets nothing identifying until a new approval is recorded. Refused with "There is no approval on record to withdraw" when none. | Not applicable |

A new token.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Name | Text, up to 60 characters. Placeholder "Quality dashboard". | Required | Unique among active tokens at the facility ("Another active workstation at this facility has that name" is the wording the screen shows). | Blank |
| What the token receives | Choice of **De-identified** or **Identified** | Required | Identified is locked until an approval is on record. Identified matters only for the cases, specimens, billing and quality datasets; for other datasets it is refused. | De-identified |
| Datasets this token may read | Checkboxes of the datasets the feed offers | Required (at least one) | A dataset the feed does not offer is refused. | None |
| Facilities this token may read | Checkboxes of the facilities the feed offers | Optional | Tick none for every facility the feed offers. | None |
| Create token | Button | Not applicable | Shows the token once with Copy. The wording "Copy this token now ... It is shown only once." A token starts `psbi_` and lasts 365 days. | Not applicable |

The token list and pull test.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Name, Datasets, Facilities, Mode, Token, Last pulled, Status | Read-only columns | Not applicable | Token shows the last four characters and the expiry date. Status is **Active**, **Expires soon** (within 30 days), **Token expired** or **Revoked**. Last pulled shows the dataset, rows and time. | Not applicable |
| New token (replace) | Button on a row | Not applicable | Issues a replacement. The previous token keeps working for 24 hours so the tool can be updated. | Not applicable |
| Revoke | Button, then Reason and Note | Required reason | Reasons: May be compromised, Enrolled by mistake, Moved to another site, Machine replaced, Machine retired, Other. A note is required for Other and optional otherwise. **Revoke now** confirms. A revoked token stops working at once. | Not applicable |
| Token (Test a pull) | Text | Required | A pasted token. | Blank |
| Dataset (Test a pull) | Choice of datasets | Required | The dataset to ask for. | First dataset |
| Pull | Button | Not applicable | Shows how the server would answer: Accepted (rows and fields, and the mode), or Refused because it is not shaped like a feed token, no token matches, it is revoked, it is expired, the dataset is not allowed, the feed is off, an identified token has no approval, or the token has pulled 60 times in the last minute. | Not applicable |
| Field catalogue | Read-only table: Field, Type, De-identified feed | Not applicable | Every field of each dataset as an analyst sees the column. The last column shows **Kept**, **Removed** or **Reduced to the month**. | Not applicable |

The reading API returns 1,000 rows a page by default and at most 10,000.

**7. Permissions.** Open: `screen:configuration:open`. Settings: `config:bi-feed:manage`. Create, replace and revoke tokens and Test a pull: `config:bi-feed-tokens:manage`. Record and withdraw the identified approval: `config:bi-feed-identified:approve`. All three are high risk. Admin and Lab Director hold them by default, so the person who creates an identified token and the person who approves it can be the same person unless a hospital separates them in the Role Dictionary.

**Known limits.** The feed is not served yet; in the demonstration build only the settings and tokens work. While the data loads, and in some problem messages, the screen says "workstation" where it means a feed token (a wording slip in the text). The token's limit of 60 pulls a minute and the 365-day lifetime are fixed in code.

### Requisition ingestion {#screen-requisition_ingestion}
Breadcrumb: Home > Configuration > System > Integrations > Requisition ingestion

**Status:** Partial

**1. Navigation:** Configuration tab **System** > group **Integrations**
**2. Maintenance item:** Requisition ingestion

**3. Business purpose and scope.** Paper requisitions are scanned in batches by the department scanner into a folder on the hospital network, or into a third-party document system (an ECM, the LIS document store, a scanning service), or are sent to the PathScribe API by another system. Each folder or system is a source, configured by its address; there can be as many as needed. PathScribe reads the accession barcode on each page and links the scan to its case, by reference only: the case keeps a link to the file where it lives, the pages that belong to it, the barcode, the time and the source, and PathScribe keeps no copy. A page with no barcode joins the requisition before it; a separator sheet ends a requisition and belongs to no case. A scan that matches no case waits in the Unmatched Requisitions queue on Accession → **📥 Requisition Inbox**, where staff link it by scanning or typing the accession, or discard it with a reason.

**What is built and what is not.** Built: this setting, the matching and page-grouping rules, the Requisition Inbox, the case's **📄 Requisition** button on the report screen, and the audit trail. In the demonstration build the browser reads a demonstration folder of fictional PDFs when someone presses **Run ingestion now**. Not built: the server's scheduled job that reads your share (`requisition.ingest`), reading a printed number when there is no barcode (OCR), and the API a sending system posts to. Only PDFs are read; any other file is refused and named in the run's summary.

**Several performing facilities.** Each source belongs to one performing facility (the **Performing facility** field), or to **All facilities** for a scanner every laboratory shares. A source's scans wait in that facility's queue, and every permission below is checked for that facility: a person assigned to one laboratory (Staff → their facilities) sees, runs and resolves only that laboratory's scanners and scans, and only someone who works for every facility can add or change an all-facility source. **＋ Add source** adds another scanner; the buttons above the form switch between them. Matching is enterprise-wide: an accession number names one case, so a requisition scanned at one laboratory still finds a case performed at another.

**How it runs (serverless).** Each source is read by a scheduled job that does one batch and ends; nothing runs all the time in PathScribe's cloud. A third-party document system is read at its https address, and a sending system posts to the PathScribe API. A folder on the hospital network is read by the PathScribe **site agent** already installed there for printers and shares ([Site agents](#screen-site_agents)): it reads the barcodes on the hospital network and sends PathScribe only the file's reference, pages and barcodes, so the PDF never leaves the hospital. The site agent's requisition pickup is not built yet. The check for missing requisitions runs hourly.

**4. Prerequisites and dependencies.** The scanner saves PDFs (one file may hold many requisitions) to a folder the API server can read, and the accession labels on the requisitions carry the accession number as a Code 128 or Code 39 barcode.

Setup step: Tier 6, step 7
Requires: None, this is a starting point.
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-requisition_ingestion - the requisition source, schedule and separator barcode]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Read this source | Yes/No switch | Optional | While it is off, the job does not read this source. | On |
| Name | Text | Required | Shown on the Requisition Inbox. | Requisition scanner drop folder |
| Performing facility | Choice: **All facilities** or a performing-lab facility | Required | Whose scanner this is: its scans wait in that facility's queue, and the permissions are checked for it. | The demonstration source: Desert Valley Medical Center; a new source: the first performing lab |
| Where scans come from | Choice of **A folder on the hospital network the scanner saves to**, **A third-party document system PathScribe reads at its address** or **A system that sends scans to the PathScribe API** | Required | Decides what the next field holds. Add one source for each folder or system; there can be as many as needed. | A folder on the hospital network the scanner saves to |
| Folder address / System address (https) / Sending system | Text | Required | A folder: a network path (for example `\\server\requisitions\inbox`) or an smb://, nfs://, file:// or https:// address. A third-party system (an ECM, the LIS document store, a scanning service): its https address; the server reads new scans there with credentials set up on the API server, never in the browser. A sending system: its name, as it identifies itself to the API. An address of the wrong form is marked in red and cannot be saved. | `\\lab-scan01\requisitions\inbox` (demonstration) |
| Look every (minutes) | Whole number, 1 to 1,440 | Required | How often the job reads the source. | 15 |
| Separator sheet barcode | Text | Required | The barcode printed on the sheet put between requisitions in one batch scan. | `PATHSCRIBE-SEPARATOR` |
| Save | Button | Not applicable | Disabled until something changes or while a field is invalid. Shows "Last saved" with the time and the person. | Not applicable |

**Expected requisitions.** The second card on this screen decides which cases should have a scanned requisition, for the organisation (**Organisation default**) or for one performing facility (a facility follows the default until its own setting is saved).

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Applies to | Choice: **Organisation default** or a performing-lab facility | Required | Which setting is being edited. | Organisation default |
| A scanned requisition is expected for | Checkboxes: **Electronic HIS/LIS order**, **Typed at Accession, no imported order**, **Outside / contract case**, **Downtime accession**, **Lockbox drop** | Optional | A case is expected to have one when its order came in a ticked way. An electronic HIS/LIS order is the request on record (its order message), so by default it needs no paper. A case accessioned from an imported order counts as electronic. | All ticked except Electronic HIS/LIS order |
| Flag a case after (hours) | Whole number, 0 to 720 | Required | Hours after accession with no requisition linked before the case is flagged. 0 flags it at once. Never blocks the work. | 24 |
| Flag a scan with no case after (hours) | Whole number, 0 to 720 | Required | Hours a scan may wait in the Unmatched queue before it is marked "No case yet" in red and moved to the top: possibly a specimen not received, lost or not accessioned. | 24 |
| Save expectations | Button | Not applicable | Saves the setting shown. Audited (Requisition Expectation Saved). | Not applicable |

A flagged case appears under **Cases waiting for a requisition** on the Requisition Inbox, shows **⚠ Requisition missing** on the report screen, and gets a **Missing Requisition** case deficiency (raised by System), tracked in the deficiency workflow and the QA reports. Linking its scan closes the flag and the deficiency (resolution **Requisition Received or Not Required**); so does **No paper requisition** with a reason (Electronic order on record, Verbal order, documented, Request held in another record, Other). The check runs with ingestion: on the server as a scheduled job, in the demonstration each time the inbox opens or **Run ingestion now** is pressed. Audit events: Requisition Missing, Requisition Received, Requisition Waived, Requisition Without Case.

**The Unmatched Requisitions queue (quarantine).** A scan whose barcode matches no case, or whose barcode cannot be read, goes to the queue automatically (Requisition Quarantined). Staff open **View** to inspect the pages, then link it: scan or type the accession, or type a patient name or MRN to search (the **Cases found** list, within their own case access), or press **New case from this scan** to open Accession with the scan attached; it is linked to the new case on submit (needs `case:accession:create`). Every link is audited as Requisition Re-associated, saying whether it was typed, found by search or a new case.

**7. Permissions.** Open: `screen:configuration:open`. Change the source: `config:requisition-ingestion:manage` (high risk, audited; Admin by default). On the Requisition Inbox: `requisition:inbox:review` (open it and view a queued scan), `requisition:inbox:resolve` (link or discard), `requisition:ingestion:run` (Run ingestion now); the roles that open Accession hold all three by default. From the case: `case:requisition:view` (the roles with case access). The audit log shows Requisition Matched, Requisition Quarantined, Requisition Re-associated, Requisition Discarded, Requisition Viewed and Requisition Source Saved, with no file name and no patient name. The Requisition Inbox's commands are in the Action list (Configuration → Action Registry and Staff → Roles, group **Requisition Inbox**): Go to the Requisition Inbox, Run Requisition Ingestion Now (Alt+G or by voice on the inbox), View a Scanned Requisition, Link an Unmatched Requisition to a Case, Discard an Unmatched Requisition, Show the Case's Requisition. Accessioners hold them all by default; the roles with case access hold Show the Case's Requisition. A command grant never widens what the permissions above allow.

**Known limits.** There is no printable separator sheet yet: print the barcode from any label tool. When a file is moved or deleted where it is stored, the case's requisition can no longer be opened, because PathScribe keeps no copy.

### Migration Field Mappings {#screen-migration_field_mappings}
Breadcrumb: Home > Configuration > System > Lab Materials & Workflows > Migration Field Mappings

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Lab Materials & Workflows**
**2. Maintenance item:** Migration Field Mappings

**3. Business purpose and scope.** Maps a legacy LIS's own source field names to PathScribe's migration target fields, for each source system. A customer with several institutions may migrate from more than one legacy system, so each mapping belongs to one source system. The import of historical records reads these mappings. A source field with no mapping is reported at import and not copied.

**4. Prerequisites and dependencies.** There is nothing to configure first. The import in [Historical Data Migration Jobs](#screen-migration-jobs) needs at least one active mapping for the source system. Skip this and the import says "This source system has no active field mappings."

Setup step: Tier 6, step 5
Requires: None, this is a starting point.
Unlocks: [Historical Data Migration Jobs](#screen-migration-jobs)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-migration_field_mappings - Migration Field Mappings list with source system filter and Add Mapping]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Source system filter | Picklist, **All source systems** or one system | Optional | Filters the list. | All source systems |
| List row | Read-only: source field, target field, category, and **Inactive** when switched off | Not applicable | One mapping per row, with **Edit**. "No field mappings on file." when empty. | Not applicable |
| Legacy Source System | Text, placeholder `LegacyLIS-Cerner` | Required | The name of the legacy system. The import's source-system list is built from these names. | Blank |
| Category | Choice of Demographics, Accession Detail, Gross/Micro Text, SNOMED/ICD-O Coding, Slide/Block Inventory, PDF Report Archive, Discrete Synoptic Field | Required | Decides which target fields are offered. | First category |
| Source Field Name | Text, placeholder `PT_FNAME` | Required | The legacy field or column name, as it appears in the file header or JSON. | Blank |
| Target Field | Picklist of the fields for the category | Required | Demographics: first name, last name, date of birth, MRN, sex. Accession detail: legacy accession number, accession date, ordering physician name, facility name, specimen description. Gross/micro text: gross description, microscopic description, final diagnosis. Coding: SNOMED codes, ICD-O codes. Slide/block inventory: block ids, slide ids. PDF archive: archived report URL. Synoptic field: synoptic fields. | None selected |
| Transform Note (optional) | Text, placeholder "e.g. convert MM/DD/YYYY to ISO" | Optional | A note for the person who reads the mapping. | Blank |
| Add Mapping, Edit, Save, Cancel | Buttons and window | Not applicable | A second active mapping for the same source system and source field is refused: "A mapping for (field) already exists for (system)." | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Add and edit: `config:migration-mappings:manage` (high risk). Admin and Lab Director hold it by default. The same capability guards running an import.

**Known limits.** The Transform Note is a comment only: no code applies it, so a date in another format is not converted by writing a note. The active flag on a mapping is stored and respected by the import, but the window has no switch to change it, so a new mapping is always active. There is no delete button.

### Historical Data Migration Jobs {#screen-migration-jobs}
Breadcrumb: Home > Configuration > Migration Jobs

**Status:** Partial

**1. Navigation:** The address `/migration-jobs`, available to anyone who has the Configuration screen. There is no menu entry that opens it, so give your administrators the address.
**2. Maintenance item:** Historical Data Migration Jobs

**3. Business purpose and scope.** Status and cross-validation reporting for legacy LIS migration jobs, and the **Import legacy file** window that starts one. A job reports how many records succeeded, failed or need review, and reconciles the count against the count the source system claimed. Ambiguous patient matches found during import are sent to the existing Patient Match Review queue and are not tracked separately here.

**What is built and what is Simulated.** Built: reading a file, applying the mappings, validating, matching to patients, recording the job and its per-record results, and the reconciliation. Simulated: the import runs in the browser, and the draft cases it creates are marked **Simulated**. A banner says a server-side bulk import replaces it. The file itself is not kept.

**4. Prerequisites and dependencies.** The source system must have active field mappings, so [Migration Field Mappings](#screen-migration_field_mappings) comes first. Skip it and the system list in the window is empty ("No source system has active field mappings yet").

Setup step: Tier 6, step 6
Requires: [Migration Field Mappings](#screen-migration_field_mappings)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: screen-migration-jobs - Migration jobs list with status tags and the Import legacy file button]

**6. Field reference.**

The list and detail.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Import legacy file | Button | Not applicable | Opens the import window. Greyed out without the capability. | Not applicable |
| Job row | Read-only: source system, status tag, **Simulated** tag, **Cross-validation discrepancy** badge, counts "n ok, n failed, n review" | Not applicable | Click to open the detail. Status is **Pending**, **Running**, **Completed**, **Completed with Errors** or **Failed**. "No migration jobs on file." when empty. | Not applicable |
| Cross-validation | Text | Not applicable | **Reconciled** (processed of claimed), **Discrepancy** (claimed, processed and how many missing or extra), or "No claimed source count on file, cannot reconcile". | Not applicable |
| Counts | Text | Not applicable | Succeeded, failed, need review, of the total processed. | Not applicable |
| Records needing attention | List: draft case or error message | Not applicable | Failed records show the error; ambiguous matches show **Needs MPI review**. | Not applicable |
| Records | List of every record result, with **Succeeded**, **Failed** or **Needs MPI review** | Not applicable | The outcome of each record and its draft case id. | Not applicable |

The Import legacy file window.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Source system | Picklist of systems with active mappings | Required | "Choose a source system." | None |
| Legacy file (CSV or JSON) | File, `.csv`, `.tsv`, `.txt` or `.json`, up to 2,000 records | Required | A CSV needs a header row with the legacy field names. JSON is a list of records, or an object with a `records` list. Nested values are left out and counted. Over 2,000 records is refused. | None |
| Record count claimed by the source system (optional) | Whole number | Optional | If you know it, the job reconciles it against the records processed. | Blank |
| Create draft cases from succeeded records | Yes/No checkbox | Optional | Creates a draft case marked **Simulated** for each record that succeeds, skipping a legacy accession number that was already imported ("Already imported" fails that record). | On |
| Run import | Button | Not applicable | Runs and shows: counts, records skipped because already imported, draft cases created (Simulated), and source fields no mapping covers. A **View job** button opens the job. | Not applicable |

Other refusals: the file is empty or not valid JSON, the first row has no field names, the file has no records, and "You do not have permission to import legacy records."

**7. Permissions.** Open: `screen:configuration:open` (the route is gated by the Configuration screen). Import: `config:migration-mappings:manage` (high risk, audited). Admin and Lab Director hold it by default.

**Known limits.** The route has no navigation entry. The import is Simulated in the browser; large or production imports wait for the server-side bulk import. The 2,000-record cap is fixed in code.

### Simulated mail outbox {#screen-simulated_mail}
Breadcrumb: Home > Configuration > System > Integrations > Simulated mail outbox

**Status:** Demonstration

**1. Navigation:** Configuration tab **System** > group **Integrations**
**2. Maintenance item:** Simulated mail outbox

**3. Business purpose and scope.** No mail service is connected in the demonstration build. Every e-mail the system would have sent (a follow-up, a tumor board invite, a template review event, a support ticket) is kept here, labelled **Simulated**, so you can see what would have been sent. Nothing leaves the browser. A toast says "Simulated e-mail recorded, not sent" and points here.

**4. Prerequisites and dependencies.** None. Items appear when a feature sends e-mail.

Setup step: Reference, not part of setup
Requires: None, this is a starting point.
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-simulated_mail - Simulated mail outbox list and an opened message]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Count | Text, "n simulated e-mail(s)" | Not applicable | The kept items. The outbox keeps the newest 200. | Not applicable |
| Recorded, Type, To, Subject | Read-only columns | Not applicable | Type is **E-mail** or **Template event**. A recipient the server would choose shows "(chosen by the server)". | Not applicable |
| Open | Button | Not applicable | Shows To, Cc, Subject, body and Attachments, with the note "Simulated: this message was not sent to anyone." | Not applicable |
| Clear outbox | Button, with a confirmation | Not applicable | Removes every simulated e-mail from this browser. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. The section shows as editable to anyone holding `config:vendor-integrations:manage`; there is no capability on the Clear button.

**Known limits.** Demonstration only. A server build sends real e-mail through its mail service and keeps no simulated list.

### Mock Interface Engine {#screen-mock-interface-engine}
Breadcrumb: Home > Mock Interface Engine

**Status:** Demonstration

**1. Navigation:** The address `/dev/mock-interface-engine`, in the demonstration build only (`__DEMO_TOOLS__`). A build that talks to an API server does not include it. The page has no menu entry.
**2. Maintenance item:** Mock Interface Engine (PS-239)

**3. Business purpose and scope.** A developer and demonstration tool. It answers in place of systems that do not exist yet, so you can dispatch a molecular worklist, send a whole-slide scan batch or any other interface message and see a realistic response: success, a specific rejection, or a hung connection. The page opens with the warning "Developer tool, not real functionality." It has four parts: the response settings, an inbound message simulator, a log of what the simulated engine received, and a registry answer simulator.

**4. Prerequisites and dependencies.** None. It needs the demonstration build.

Setup step: Reference, not part of setup
Requires: None, this is a starting point.
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: screen-mock-interface-engine - Mock Interface Engine settings, inbound simulator, engine log and registry answer simulator]

**6. Field reference.**

Response settings.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Enabled switch and status | Button, with the status "intercepting real dispatch calls", "starting" or "not intercepting" | Optional | Starts or stops the in-browser interceptor for the molecular worklist call. | Off |
| Response Mode | Choice of **Always Succeed**, **Always Fail**, **Timeout** | Required | Succeed answers HTTP 200. Fail answers the status below. Timeout never answers, so the dispatch stays "Dispatching...". | Always Succeed |
| Failure HTTP Status | Whole number | Optional | Shown for Always Fail. An empty or zero value returns to 500. | 500 |
| Answer for the slide scanner | Yes/No checkbox | Optional | After a scan batch is accepted, reports each slide as scanning and then scanned, so slide scanning can be shown end to end. | On |
| Molecular instrument results | Choice of **Positive**, **Negative**, **No results** | Optional | After a molecular worklist is accepted, reports that call for every patient sample, with controls as expected. | No results |

The three panels.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Inbound message simulator: Sample message | Picklist of 14 samples: A01 admit; A01 admit with verified NHS number; A08 update; A24 link; A34 merge (older form); A40 merge; A40 with unknown patients (goes to the exception queue); A43 move a visit; A45 move a visit (visit level); A47 change identifier; A50 change visit number; and three events (block damaged or lost, HPV result received, material moved to storage) | Optional | **Load sample** fills the box. | None |
| Inbound message simulator: Message (HL7 or JSON event) | Free text, tagged as patient data | Required | A message or event to run through the same processors a live listener would use. | Blank |
| Inbound message simulator: Process message | Button | Not applicable | Shows **Processed** or **Not applied**. A message that cannot be matched is queued as an interface exception: "Open Audit, Error Log, Interfaces to bind it by hand." Labelled **Simulated**. | Not applicable |
| Received by the simulated interface engine | Read-only list: When, Message type, Outcome (**Accepted**, **Rejected**, **Timed out**), Open | Not applicable | With no engine address set, every outbound message ends up here instead of leaving the browser. **Open** shows the message; **Clear list** empties it. | Not applicable |
| Receive a registry acknowledgement: Registry, Status, Answer | Picklists | Required | Pick what the registry would say for a sent submission: Accepted, Accepted with warnings, Rejected (can be corrected), Rejected (fatal) or No answer. **Receive** runs it through the function the real inbound endpoint will use. With No answer the submission stays awaiting an answer. | None |

**7. Permissions.** The route is gated by the Configuration screen (`screen:configuration:open`). There is no capability on the controls.

**Known limits.** Demonstration only. Its settings are kept in the browser and are not shared. The Always Fail and Timeout modes affect the molecular worklist call that the interceptor handles; the simulated engine in the log follows the same response mode for other messages. It has no sample for a referral result, so the reference-lab receive-back cannot be shown here.
