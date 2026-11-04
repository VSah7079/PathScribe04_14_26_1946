# Chapter 7 open questions (Tier 6: Interface Engine and External System Integrations)

Each item needs Pete's decision, a ForMedrixAI answer, or an update to `OWNERSHIP.md` (which this chapter's author may not edit).

## Screens documented that `OWNERSHIP.md` does not list (please add)

- `screen-interface-engines` (System Logs, Interface Log, Engines sub-tab, capability `interface:engine-status:view`).
- `screen-outbound-interface-dlq` (Interface Log, Outbound Interface DLQ sub-tab, which also holds the Delivery exceptions panel).
- `screen-outbound-dispatches` (Interface Log, Outbound Dispatches sub-tab).
- `screen-outbound-queue` (Home, Quality & Compliance, Outbound Queue, `/outbound-queue`).
- `screen-mock-interface-engine` (`/dev/mock-interface-engine`, demonstration build only).
- `screen-mock-emr` (`/mock-emr`, demonstration build only).
- The Interface Exceptions sub-tab and its Review window are folded into `screen-audit-interfaces` (no separate id). Confirm.
- **Print Queue sub-tab** of the Interface Log (`PrintQueueDashboardSection`) is owned by no chapter. Chapter 7 says so and does not document it.
- **Outbound Charge DLQ** (`OutboundDlqSection`, sub-tab of System Logs, Financial) is documented by Chapter 8 under `screen-audit-financial`. Chapter 7 links to it and does not repeat it.

## Not built, as the outline words it

- **FHIR R4 endpoint and OAuth2 client credentials:** no endpoint and no setup screen. `FHIRCaseService.ts` is unwired scaffolding (placeholder base address; the token function throws). The Facility Editor's `OAuth2` authentication type is stored only. Engine-to-API OAuth2 client credentials or mTLS is Planned (`INTERFACE_ENGINE_EDGE.md`).
- **EHR connectors for Epic, Cerner, MEDITECH and AthenaHealth:** none. Epic Beaker, Cerner PathNet and MEDITECH exist only as accession and barcode identifier-format presets. AthenaHealth appears nowhere in the repo. Confirm the chapter's "never imply a certified connector" wording is acceptable for sales use.
- **Inbound HL7 listener:** the ADT, patient-management and visit processors exist and are tested, but nothing receives a live message. Inbound ORM to order is not parsed (`receiveOrder` takes a structured order).
- **"PathScribe Interface Engine (PIE)":** the name is in the outline only. The repo's engine is BridgeLink (PS-331). Decide whether the guide should adopt "PIE" or keep BridgeLink.
- **Engine heartbeat, acknowledgement-settled outcomes, retry windows, dead-letter timing and per-tenant credentials:** Planned, phase 2e (India team). Today a failed send waits for a person.
- **Reference-lab result receive-back:** a processor exists but no inbound endpoint. De-duplication is an in-memory set, so a restart forgets handled message ids.

## Source disagreements (the chapter follows the source)

- The Specimen Code Map is named **Order Types & Inbound Rules** in the menu and **Specimen Code Map** on screen.
- The Outbound Interface DLQ subtitle says "seven queues"; the screen offers eight.
- `configAssistPollingManage` says "where PathScribe polls", but the screen has no address field. The Assist HL7 adapter's status-field order is called a per-site setting in the source, but no control exists.
- The Reporting feed screen says "workstation(s)" in its loading and problem messages where it means feed tokens (a copy-paste slip).
- The Outbound Message Preview subtitle says "PathScribe never builds or sends HL7 itself", but ORM^O01 (block orders), DFT^P03 (charges) and the US electronic-pathology ORU^R01 are built in the browser.
- Mock EMR says "Production uses FHIR R4 API to sync with LIS". Nothing in the code backs it.
- The Interface Dictionary header comment calls it "Message Mapper"; no such menu name exists.
- `maxRetriesExceeded` is only displayed; the browser dispatch always sets it false, so "(max exceeded)" and the **Dead-lettered** state cannot arise from the browser's own sends today.
- The Charge DLQ subtitle says real dispatch is not built, but `dispatchCharge.ts` now posts. Chapter 8's wording should be checked against it.
- The Facility Editor's interface-engine connection and LIS routing (Chapter 2) are stored but no send path reads them. Dispatch uses the one deployment-level `VITE_INTERFACE_RECEIVER_ENDPOINT`.

## Gaps for Pete to decide

- **No capability** guards resolving, dismissing or binding an interface exception, the Charge DLQ buttons, Capture as CAPA, or the simulated-mail Clear button. Anyone who can open the screen can use them.
- **Migration Jobs** has no navigation entry (route `/migration-jobs` only). Migration field-mapping `active` has no toggle, there is no delete, and the Transform Note is not applied by any code.
- **Reporting feed:** Admin and Lab Director both hold create-token and identified-approval capabilities, so one person can do both. Decide whether a hospital should separate them by default.
- **No built-in Interface Analyst role.** The seed says a hospital grants `interface:outbound:resend` to its own. Lab Director and QA Reviewer have no `interface:*` capability.
- **Outbound Queue** is Admin-only by seed. Confirm that Lab Director should not see it.
- **Facility Dictionary versus Facility Configuration:** the Specimen Code Map and Reporting feed list the Facility Dictionary (`screen-facility-dictionary`) as the prerequisite for facilities. `OWNERSHIP.md` also lists `screen-clients` ("Facility Configuration", System / Integrations) for Chapter 3. Confirm which holds the facility roles and performing-lab setting.
