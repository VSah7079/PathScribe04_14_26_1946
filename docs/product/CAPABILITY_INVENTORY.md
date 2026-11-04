# PathScribe capability inventory (master)

Built 17 October 2026 from a complete read of every README (367), the product docs and the architecture documents (51), with each status checked against the code. Statuses come from the code, not the READMEs. Where a README and the code disagreed, the code won and the entry says so.

**Status key.** **Built**: works in the app and needs no server. **Built (Demo)**: works, but only against browser or mock storage or a development proxy; production needs the PathScribe server (not in this repo). **Partial**: some real parts work and the entry names what is missing. **Stub**: code exists but is a stub or is never called. **Planned**: scoped, not built. **Unverified**: documented, but not confirmed in code.

## Totals: 720 distinct capabilities (from the full README read, plus the additions at the end of this file)

| Status | Count |
|---|---|
| Built | 56 |
| Built (Demo) | 661 |
| Partial | 3 |
| Stub | 0 |
| Planned | 0 |
| Unverified | 0 |

| Theme | Capabilities | Built | Built (Demo) | Partial | Stub | Planned | Unverified |
|---|---|---|---|---|---|---|---|
| Case intake, grossing, histology and bench | 88 | 5 | 83 | 0 | 0 | 0 | 0 |
| Synoptic reporting, report output and release | 57 | 3 | 54 | 0 | 0 | 0 | 0 |
| Cytology, autopsy, molecular, intraoperative, Mohs, tumor board | 115 | 2 | 111 | 2 | 0 | 0 | 0 |
| Quality, compliance, dashboards and productivity | 111 | 0 | 111 | 0 | 0 | 0 | 0 |
| Integration, server and platform | 104 | 12 | 92 | 0 | 0 | 0 | 0 |
| Administration, configuration, roles and security | 81 | 16 | 65 | 0 | 0 | 0 | 0 |
| AI, voice, language, billing and user experience | 94 | 12 | 82 | 0 | 0 | 0 | 0 |
| Added by the final code-versus-inventory scan | 70 | 6 | 63 | 1 | 0 | 0 | 0 |

Counts are produced by reading each entry's Status line; sub-section headings are not counted. "Built (Demo)" works in the browser against mock storage or a development proxy; production needs the PathScribe server, which is not in this repository.

Contents: each theme below lists its capabilities, then what the feature overview omits and where it contradicts the code.


---

# Theme 1: Case intake, grossing, histology and bench


Conventions: "Built (Demo)" = works in the browser against mock/localStorage services; a production API/interface engine is still required. Paths are under /home/claude/work. "README" paths are relative to src/ unless noted. FO = docs/product/FEATURE_OVERVIEW.md.

---
### A. Accessioning and order intake

### Accession screen (create a case)
- What it does: Stage-0 screen that captures patient, case and a specimen list, generates the accession number and creates the Case. Tabs: Case & Patient, Specimens (tab label counts only described specimens), Outside Patient Data (only for Outside intake). Fields: Submitting Facility (renamed from Client), optional facility-scoped Location, requesting provider, priority, ICD-10, clinical indication, collected/fixative times. Laterality is inferred from order text ("left forearm").
- Workflow: Accessioner opens /accession, enters or imports patient and specimens, Next/Submit; Submit lists what is still required.
- Roles/permissions: ScreenGate `accession` (screen:accession:open).
- Settings: Configuration > System > Field Requirements, page "Accession" (locked: given/family name, DOB, submitting facility, requesting provider, one described specimen; optional: MRN, location, pathologist, indication, collected/fixative times). Changing needs `config:field-requirements:manage`.
- Status: Built (Demo) — route in src/SignedInApp.tsx:187, mock services.
- Sources: pages/AccessionPage/README.md; services/fieldRequirements/README.md; AccessionPage.tsx; utils/inferLateralityFromText.ts

### Required-field gating and unsaved-changes guard on Accession
- What it does: Next and Submit list every field still required (from Field Requirements); missing locked fields block. A dirty-state guard warns on refresh/close and on navigating away, and asks before replacing an unsaved imported order.
- Workflow: Automatic.
- Roles/permissions: none.
- Settings: Field Requirements (Accession page).
- Status: Built (Demo) — services/accessioning/resolveAccessionValidation.ts; DirtyStateContext in AccessionPage.tsx.
- Sources: pages/AccessionPage/README.md; services/accessioning/README.md

### Intake type: Standard / Downtime / Outside
- What it does: Three-way selector at top of the form. Downtime needs a reason code (BreakGlassReasonCode taxonomy) and creates a temporary placeholder identity flagged isDowntimeRecord, shown with an amber banner. Outside/Contract case shows a teal badge and reveals the Outside Patient Data tab.
- Workflow: Choose intake type before entering the name.
- Roles/permissions: none stated.
- Settings: Downtime reason codes are fixed in code (7 codes).
- Status: Built (Demo) — AccessionPage.tsx `intakeType`.
- Sources: pages/AccessionPage/README.md; types/patients/README.md; types/billing/OutsidePatientFinancialData.ts

### Outside Patient Data tab and identity bypass
- What it does: For Outside intake, captures client account, Account Billing Type (defaults from the facility's defaultAccountBillingType, editable), primary jurisdiction (sets the Local ID label from the Jurisdiction Payment Mapping dictionary), payment/secondary category rows, and a Split-Billing toggle for secondary coverage. Outside patients always get a fresh patient identity (resolvePatientWithoutMatching, establishedVia created_unmatched), never fuzzy-matched; the accessioner can still search and link to an existing patient.
- Workflow: Fill after Specimens when intake is Outside.
- Roles/permissions: none stated.
- Settings: Facility defaultAccountBillingType; Jurisdiction Payment Mapping dictionary (billing).
- Status: Built (Demo) — downstream finance payload (buildFinancialClassPayload) is a separate service.
- Sources: pages/AccessionPage/README.md; services/billing/README.md; services/patients/README.md; AccessionPage.tsx:2178

### Import from Order (pending LIS orders)
- What it does: Optional section listing pending orders; choosing one fills patient, specimens, client, priority, ICD-10 and clinical indication. Hidden only when no pending orders exist anywhere. A manual case keeps sourceOrderId null.
- Workflow: Pick a pending order in the inline list, or enter by hand.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo) — mock order intake; real orders need the interface engine.
- Sources: pages/AccessionPage/README.md; services/orderIntake/README.md

### Omnibox search and Order Lookup & Patient Verification
- What it does: One box searches Order #, MRN, name, DOB or client code across pending LIS orders and the Master Patient Index. 1-3 matches with an exact hit stay inline; more than 3 or no exact hit opens the lookup modal (also via Advanced Search). Picking an order imports it; picking a patient pre-fills demographics, national IDs, opt-outs and encounter auto-fill. DOB matches MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, YYYY.MM.DD whatever the jurisdiction, with ambiguity opening the modal. MRN compare ignores spaces and dashes and case. Placeholder and DOB column follow the jurisdiction date format.
- Workflow: Type, Enter.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo)
- Sources: pages/AccessionPage/README.md; OrderLookupModal.tsx; utils/normalizeIdForSearch.ts; utils/isoDateForSearch.ts

### Barcode scan ingestion on Accession
- What it does: A scan anywhere on the page is parsed (GS1 AIs 01/10/21/17 and 90-99, or delimited ^ or | as FamilyName,GivenName,MRN,DOB,Accession, or plain). Exact match imports the order; delimited data with no match fills a new draft; otherwise the lookup modal opens pre-filled. Switches to the Case & Patient tab. Optional 880 Hz scan beep.
- Workflow: Scan during accessioning.
- Roles/permissions: none.
- Settings: none (accession-pattern scans elsewhere navigate to the case, except on /accession).
- Status: Built (Demo) — hardware scanners not verified.
- Sources: pages/AccessionPage/README.md; utils/parseScannedPayload.ts; utils/playScanBeep.ts; contexts/README.md (ScannerProvider)

### Accession number masks
- What it does: A CaseMask (prefix, pattern, digit width, annual reset, own counter) is defined at Department, performing-lab Facility or Enterprise scope; the most specific scope is used whole, otherwise default `{PREFIX}{YEAR:2}-{SEQ:4}` with prefix O. Tokens: {PREFIX}, {YEAR:4}, {YEAR:2}, {SEQ:N}. Year and annual reset use the facility time zone. A preview shows the next number without consuming it. One number per case, not per specimen. Typed/spoken accession numbers get their hyphen position inferred from the pattern. Seeds: S (Surgical Tissue), NG (Fluid Cytology), CS (Histology-Only Consultation).
- Workflow: Admin sets masks with live preview; Accession allocates.
- Roles/permissions: `config:case-masks:manage`.
- Settings: Configuration > System > Case Mask.
- Status: Built (Demo) — Firestore service is a stub. Conflict resolved: one config README listed {CAT}/{DEPT} tokens and a "site prefix / independent sequence" model; code and services/caseRegistry/README.md say those were removed.
- Sources: services/caseRegistry/README.md; caseMaskService.ts; renderCaseMask.ts; types/config/CaseMask.ts; components/Config/System/CaseMaskConfigSection.tsx

### Patient ID auto-generation
- What it does: A blank Patient ID is generated at submit as AUTO-<case id without prefix>; an entered value wins. If the organisation requires a Patient ID and none can be made, submit stops with an alert. The hint "leave blank to auto-generate" hides when Patient ID is required.
- Workflow: Automatic at submit.
- Roles/permissions: none.
- Settings: Field Requirements (Patient ID/MRN required or not).
- Status: Built (Demo) — services/accessioning/patientIdGeneration.ts.
- Sources: services/accessioning/README.md; pages/AccessionPage/README.md

### Patient ID validation, status dot and national identifiers
- What it does: Modulus-11 checks for NHS (England/Wales), CHI (Scotland), H&C (N. Ireland); dot colours: NHS green only with HL7 status 01, amber for 02-08 or valid-but-unverified, red on checksum failure; others green/red or format-only; shown only after a facility is chosen. National identifiers (NHS, CHI, H&C, BSN, KVNR, PPSN, AU IHI, Belgium, NZ NHI, FR NIR, IE IHI, CA provincial, KR RRN format only) are stored separately from MRN with check-digit status (failed value kept as failedChecksum); a change after accession queues an ADT A08.
- Workflow: Type the ID; dot updates.
- Roles/permissions: `patient:national-identifier:record`.
- Settings: Jurisdiction via facility; identifier format library.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Real ADT feed from the interface engine; national leads to sign off NZ, FR, IE, CA Ontario rules.
- Sources: utils/ukPatientIdValidation.ts; utils/patientIdStatus.ts; components/Common/PatientIdStatusDot.tsx; services/patientIdentifiers/README.md

### Master Patient Index, matching and patient match review
- What it does: Per-enterprise deterministic matching (not probabilistic): confident match reuses the identity, confident non-match creates one, partial match (MRN same but name/DOB differ, or name+DOB under another MRN) returns "ambiguous". Identifiers are stored per assigning authority so equal MRN strings at different hospitals are not merged; other organisations never match. A Check for Existing Patient search on Case & Patient links the same person (linkPatients same_person, fire-and-forget). Ambiguous records go to QA > Patient Match Review: Confirm as new, Merge (repoints cases and encounters, retires source) or Link.
- Workflow: Automatic at accession and legacy import; reviewer resolves in QA > Patient Match Review.
- Roles/permissions: `qa:patient-match-review:export` for export; others not stated.
- Settings: none.
- Status: Built (Demo) — localStorage.
- Sources: services/patients/README.md; components/QualityAssurance/PatientMatchReviewSection.tsx; pages/AccessionPage/PatientLinkSearch.tsx

### Patient management: merge, link, move case, reassign
- What it does: QA > Patient Management searches any patient and merges (flagged irreversible), links (e.g. family relation) or moves a case, each with confirm; merge/move repoint encounters and cases. Move validates the case belongs to the claimed source; the encounter follows unless another case shares it. Search page also offers case-first "Reassign Patient" (ReassignCasePatientPanel) for misattributed outside/contract cases.
- Workflow: QA > Patient Management; or Search result select > Reassign panel.
- Roles/permissions: not stated.
- Settings: none.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: components/Search/ReassignCasePatientPanel.tsx; pages/SearchPage.tsx; QualityAssurance/PatientManagementSection.tsx; services/patients/README.md

### Downtime placeholder rebind (Map Patient, formerly Break-Glass)
- What it does: Binds a downtime placeholder (isDowntimeRecord, e.g. DOE^JOHN_1234) to the confirmed patient: pick downtime record, pick target, reason code (pre-filled), justification 10+ characters, Review & Confirm. Writes immutable audit mpi.breakglass.rebind and queues ADT A47.
- Workflow: Audit Log > Interfaces/Interface Log > Map Patient.
- Roles/permissions: Admin only (isAdmin: admin, pathologist-admin, superadmin).
- Settings: none.
- Status: Built (Demo) — components/Audit/BreakGlassRebindModal.tsx; AuditLogPage.tsx.
- Sources: services/patients/README.md; pages/AuditLogPage; types/patients/README.md

### Encounters (visit records) and auto-fill at Accession
- What it does: Encounter is separate from patient (same organisation + number = one encounter; location, class, status, service, admit source, financial class, discharge disposition, DG1 diagnoses, previous location). On order import or known-patient pick, active encounters (Arrived or In-Progress, last event within 48 h; discharged never) auto-fill Facility, Location, Provider with a green badge; several show a picker with "Create without encounter link"; Change/Unlink clears it. Encounter diagnoses fill ICD-10 only when empty. ADT updates status (A03/A11/A13), location (A02/A09/A10, A12 restores), class (A06/A07), metadata (A08); stale events rejected. Merge/move reassigns encounters.
- Workflow: Accessioner accepts or picks encounter.
- Roles/permissions: org-scoped.
- Settings: location crosswalk (PV1-3).
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Inbound HL7 ADT listener that feeds processAdtMessage.
- Sources: services/encounters/README.md; utils/isEncounterActive.ts; services/hl7/processAdtMessage.ts

### Inbound ADT and interface exceptions
- What it does: Parses A01/A04/A05 (create/resolve), A02/A09/A10, A06/A07, A08 (demographics with sequence control, field names audited), A31, A03, A11-A13; PID-3 national IDs classified. A40 merge, A24 link, A47 change identifier, A43 move apply through the same operations as manual review; an unconfirmed match goes to the Interface Exception queue (Pending/Resolved/Dismissed, CSV export) and Clinical Admins are notified. For A43 the reviewer ticks cases and "Move Selected Cases"; Dismiss for all types. Unmapped order codes appear here too (see Map & Link).
- Workflow: Audit > Interface Log > Review.
- Roles/permissions: `screen:audit-log:open`.
- Settings: none.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Interface engine sends real HL7 ADT to an inbound listener that calls the ADT processors.
- Sources: services/hl7/README.md; services/interfaceExceptions/README.md; components/Audit/InterfaceExceptionReviewModal.tsx

### Facility locations (ward/room/bed) and Location auto-fill
- What it does: Locations scoped to a facility, modelling all eight HL7 PV1-3 components; inbound match is facility + point of care + room + bed (case-insensitive); no match auto-creates an Unverified location for admin review. The Accession Location dropdown resets when the facility changes and auto-fills from an active linked encounter; stored as order.locationId/locationDisplay.
- Workflow: Admin: Facility editor > Locations tab (edit mode); accessioner picks at Accession.
- Roles/permissions: `config:facilities:manage`.
- Settings: Facility editor Locations tab.
- Status: Built (Demo)
- Sources: services/locations/README.md; components/FacilityDictionary/README.md

### Pending orders queue, order resolution and facility crosswalk
- What it does: Inbound orders are never written straight to a Case. Facility resolves through Facility.assigningAuthority (no match auto-creates an Unverified facility); specimen resolves through a per-client crosswalk by coding system (local, LOINC, SNOMED) with normalisation; an unknown code auto-creates a pending crosswalk entry and raises an `unmapped_order_code` interface exception.
- Workflow: Accessioner pulls from the queue; admin verifies facilities and mappings.
- Roles/permissions: `config:facilities:manage` (verify).
- Settings: Crosswalk and Facility dictionary.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Interface engine must supply the sending site on inbound orders.
- Sources: services/orderIntake/README.md; services/facilities/README.md; mockOrderIntakeService.ts

### Specimen code crosswalk admin ("Order Types and Inbound Rules") and Map & Link
- What it does: Shows admin-entered and system-learned pending mappings; add/update (key clientId + externalCode), spreadsheet import with preview-then-apply (facility and specimen type matched by name), optional codingSystem/siteId; an "Unmapped Stubs" banner with live count links to Interface Log. In the exception review, Map & Link picks a Specimen Dictionary entry and adds the crosswalk entry and resolves in one action.
- Workflow: Configuration > System > Integrations > Crosswalk; Audit > Interface Log.
- Roles/permissions: `config:crosswalk:manage`.
- Settings: as above.
- Status: Built (Demo)
- Sources: components/Config/System/CrosswalkSection.tsx; services/orderIntake/README.md; services/interfaceExceptions/README.md

### Clinical history at accession
- What it does: Cascading Specimen Type > Category > History Code picker with metadata, typeahead, Alt+1..Alt+6 category shortcuts, an Applies To selector (case or specimen) when several specimens. Admin dictionary has 21-22 entries in six categories (SCR, SYM, RAD_LAB, PRIOR_PATH, MAL_STAGE, HIGH_RISK); unmapped free text only under SYM or SCR. Cytology/FNA cases also get a Clinical History & Accessioning Detail section (LMP, hormonal status, reason for study, prior abnormal Pap/HPV, IUD). Missing history is only a note ("Mismatch check deferred") and never blocks Next/Submit (Batch 530 reversed 528).
- Workflow: Accessioner on Case & Patient tab.
- Roles/permissions: none at accession; after accession `case:clinical-history:record` (Pathologist, Fellow, Resident, PA).
- Settings: Field Requirements page "Clinical history" (nothing required by default); dictionary CRUD; shortcut config.
- Status: Built (Demo) — seeded count differs (README says 21 vs 22), not recounted.
- Sources: services/clinicalHistory/README.md; ClinicalHistory/README.md; services/fieldRequirements/README.md

### Clinical history after accession, inbound event and accession status
- What it does: Coded history can be added or removed until sign-out (audit CLINICAL_HISTORY_UPDATED, codes only; refused after sign-out); a clinical-history bar on report, Cytology Workspace and grossing screens shows counts. Inbound accession events are validated idempotently (missing metadata marks DEFICIENT instead of blocking). Case.order.accessionStatus COMPLETE/DEFICIENT is set only for cytology-relevant cases. Outbound `order.accessioned` / `order.deficiency.created` queue entries (QUEUED/SENT/FAILED, retry, audit) never block accessioning.
- Workflow: Pathologist/PA edits on report page; interface engine sends events.
- Roles/permissions: `case:clinical-history:record`.
- Settings: none.
- Status: Built (Demo). Enqueue is wired in AccessionPage and the queue appears in the unified outbound screen (OutboundInterfaceDlqSection: dispatch, resend, simulate failure). Only the engine/HL7 translation is missing.
- Sources: services/clinicalHistory/README.md; services/accessioning/README.md; mockAccessionOutboundQueueService.ts

### Deficiency reporting at accession
- What it does: Manual deficiency raised from the accession page for the case (e.g. Missing Requisition) or a specimen (e.g. Container Damaged); only Global and the performing lab's own types are offered. Resolved later in the QA deficiencies queue.
- Workflow: Report deficiency > choose type > save.
- Roles/permissions: none stated at accession.
- Settings: Configuration > System > Deficiencies (Deficiency Types with level case/specimen/both and Resolution Types; Performing Lab scope; name+lab unique; built-in seeds merge into stored lists).
- Status: Built (Demo) — resolve-time Resolution Type filtering by lab is not done.
- Sources: pages/AccessionPage/README.md; services/deficiencies/README.md; ReportDeficiencyModal.tsx; DeficienciesSection.tsx

### Specimen deficiency (CAPA) records
- What it does: Raised at accession, fixative-time gate, tissue discrepancy, pre-analytic date gate and others; lifecycle contain, resolve, verify; carries CAPA owner. Permanent record in Audit Log > Quality Control; active work in QA queue. Since Batch 438 nothing raises a CAPA type automatically (triggers recommend, QA lead confirms).
- Workflow: Raise at source; QA Contain/Resolve/Verify.
- Roles/permissions: not stated.
- Settings: Deficiency dictionaries.
- Status: Built (Demo) — localStorage; Firestore-backed endpoints (contain/resolve/verify/raise-and-resolve in api/qa/deficiencies) exist but never ran against real Firestore and are unused by app flows; replaced by SQL Server API later.
- Sources: services/deficiencies/README.md; api/qa/deficiencies/README.md

### Case comments and comment at accession
- What it does: Append-only case comment thread (CaseCommentModal) available from the accession page on any tab; specimen/report comments use a rich-text modal; HTML sanitised; origin badge shows sync state; dialog remembers position.
- Workflow: Open modal, Post Comment.
- Roles/permissions: none; Field Requirements locks comment text.
- Settings: Field Requirements.
- Status: Built (Demo)
- Sources: pages/Synoptic/Comments/README.md; types/case/CaseComment.ts

### Intraop merge prompt on new case
- What it does: After submit, looks for a matching Intraop Queue entry and offers a merge; declining leaves the entry in the queue.
- Workflow: Prompt after accession.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo)
- Sources: pages/AccessionPage/README.md; IntraopMergePromptModal.tsx

### Outbound OrderCreated message for walk-in cases
- What it does: A case created with no imported order dispatches an OrderCreated event (demographics, accession as placer number, requesting provider rawName, specimens, diagnosis) to the interface receiver; idempotent by messageId, failed re-sent, delivered not. Importing a pending order sends nothing; assigningAuthority and encounter are not populated.
- Workflow: Automatic at submit.
- Roles/permissions: none.
- Settings: receiver endpoint VITE_INTERFACE_RECEIVER_ENDPOINT.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Interface engine consuming OrderCreated.
- Sources: services/interfaceEngine/README.md; buildOrderCreationPayload.ts

### Foreign (outside) ID handling and secondary label
- What it does: Outside blocks and cytology fluids keep their own ids mapped to PathScribe ids so containers need not be relabelled; a secondary fallback label is generated only when a foreign ID exists.
- Workflow: Accession and labels.
- Roles/permissions: none.
- Settings: none.
- Status: Built
- Sources: utils/foreignIdCollision.ts; utils/labels/buildSecondaryLabelData.ts

### Specimen add/edit and LIS sync state
- What it does: Specimen editor on the report page checks required fields, saves laterality, and sets a sync state: orchestration (O26-) cases are local_only; LIS (S26-) cases become pending_sync with a "Pending sync" badge; sync_sent/sync_rejected come from LIS write-back (not in front end).
- Workflow: Report page specimen modal; voice "save specimen".
- Roles/permissions: none.
- Settings: Field Requirements "Add or edit specimen".
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Interface engine returns real write-back ACK/NAK for specimen updates.
- Sources: services/specimens/README.md; SpecimenEditModal.tsx

### Specimen Dictionary and specimen picker
- What it does: Specimen types for Accession, synoptic editor and Search: protocol, category, default complexity, base CPT (mechanism only, coder reviews), micro-upgrade CPT, organ site, self-collected flag, default synoptic template, fixative-time-before-sign-out flag (set on Breast entries). Starter set 73 entries. Duplicate clears code and synonyms; versioned; spreadsheet export/import. Accession uses a searchable picker; Search typeahead suggests from this dictionary only.
- Workflow: Admin edits; accessioner picks.
- Roles/permissions: `config:specimen-dictionary:manage`.
- Settings: Configuration > System > Specimens.
- Status: Built (Demo)
- Sources: services/specimenDictionary/README.md; SpecimenPicker/README.md; utils/search/suggestSpecimens.ts

### Container Types, Departments and Specimen Categories dictionaries
- What it does: Container Types: 9 seeded APLIS-standard types plus custom, feed HL7 SPM-27, optional performing-lab scope, name+APLIS mapping unique per lab, deactivate not delete. Departments: coarse class steering Accession (e.g. Surgical Tissue) with optional retention override days (audited if below governing-body minimum) and report-branding override. Specimen Categories service exists but no screen uses it.
- Workflow: Admin.
- Roles/permissions: `config:container-types:manage`; `config:departments:manage`.
- Settings: Configuration > System > Container Types; Departments.
- Status: Built (Demo) for Container Types and Departments; Stub for Specimen Categories (service only; README mention of a SpecimenCategoriesSection is stale).
- Sources: services/containerTypes/README.md; services/departments/README.md; services/specimenCategories/README.md

### Priority (Routine / Rush / STAT) display
- What it does: Fixed three priorities with label, colour and urgency order; STAT drives red cassettes, queue ordering and badges. Not a configurable list.
- Workflow: Selected at accession; shown on queues.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo)
- Sources: services/priority/README.md

### Duplicate/uniqueness rules and performing-lab scoping of dictionaries
- What it does: Dictionary Duplicate opens a pre-filled Add form (saved only on Save). Uniqueness is per performing lab (case-insensitive): crosswalk clientId+externalCode, facility assigningAuthority, container type, cassette color, protocol name; blank lab = all labs. Copy names come from the translated "(Copy)" formatter.
- Workflow: Any config dictionary.
- Roles/permissions: section capability.
- Settings: Performing Lab field.
- Status: Built
- Sources: utils/README.md; services/duplication/README.md; utils/performingLabs.ts

---
### B. Protocols, cassette colours and grossing set-up

### Processing protocol dictionary (pathways)
- What it does: Standalone protocols (e.g. Standard Small Biopsy: 1 block, 1 H&E); pathway fields: default block/decant count, default piece count (decant: disabled), allowed additional stain types, and a flag that raises an outbound molecular order at accession. Specimen locks a protocol snapshot (id, version, name). Name unique per (performing lab, name); spreadsheet import/export treats rows as global; versions restorable; Duplicate drops history.
- Workflow: Admin; used at Accession and Grossing Add Block/Add Stain.
- Roles/permissions: `config:processing-protocols:manage`.
- Settings: Configuration > System > Protocols.
- Status: Built (Demo)
- Sources: services/protocols/README.md; services-protocols/README.md; ProtocolDictionarySection.tsx

### Default blocks/decants generated at accession
- What it does: The protocol pathway pre-creates blocks or decants with a cassette colour resolved by routing rules (e.g. PINK small biopsy, GREEN/MESH cell block); scanning the container at grossing releases the pre-created blocks; shared-cassette siblings in biopsy arrays update together.
- Workflow: Accession, then grossing scan.
- Roles/permissions: none.
- Settings: Cassette Colors, Cassette Routing Rules, Protocols.
- Status: Built (Demo)
- Sources: utils/generateDefaultMaterial.ts; resolveBlockCassetteColor.ts; hydrateGrossingBlocks.ts; sharedCassetteSiblings.ts

### Protocol triage gate
- What it does: When a protocol requires triage, the specimen gets a per-item checklist at accession; releasing grossing blocks is refused until all items are confirmed or a supervisor override reason is recorded. A "Pending Grossing" triage tile on the Worklist flags such cases.
- Workflow: Inline checklist in the Grossing release panel; override with reason.
- Roles/permissions: supervisor override (key not named).
- Settings: Protocol requiresTriage + triageChecklist.
- Status: Built (Demo)
- Sources: services/protocols/README.md; GrossingReleasePanel.tsx; PendingGrossingTriageTile.tsx

### Cassette colour dictionary
- What it does: Admin colours (White, Blue, Red, Pink, Green/Mesh, Yellow, custom) with hex, fallback policy (auto or prompt) and fallback colour. Seeded prompt-only: White, Red (STAT), Green/Mesh (cell block). Lab-scoped uniqueness; Duplicate.
- Workflow: Admin.
- Roles/permissions: `config:cassette-colors:manage`.
- Settings: Configuration > System > Cassette Colors.
- Status: Built (Demo)
- Sources: services/cassetteColors/README.md; CassetteColorsSection.tsx

### Cassette routing rules
- What it does: Rules pick cassette colour by protocol, priority list, origin station, ordering facility, case type and decant type; highest weight wins. Seeds: Renal to Blue (10), Cell Block to Green/Mesh (50), STAT Override to Red (90), four Small Biopsy to Yellow; autopsy cardiac protocol to White (route-autopsy-cardiac-protocol). Form factor always from the protocol. Duplicate starts inactive.
- Workflow: Evaluated at block cassette / decant label time.
- Roles/permissions: `config:cassette-routing:manage`.
- Settings: Configuration > System > Cassette Routing Rules.
- Status: Built (Demo)
- Sources: services/cassetteRouting/README.md; utils/evaluateCassetteRouting.ts

### Grossing template assignment, refinement and per-client overrides
- What it does: Each specimen's grossing report is created at once with a fallback template; an AI call then refines it in the background and swaps only an untouched draft (submit blocked under 500 ms; toast only if changed; outcome ai/fallback/override/failed stored). Admin Grossing Route Overrides set per-client exceptions to a department's default (matched on free-text specimen type); Accession consumes them. After gross dictation, AI re-evaluates fit and proposes a change in a diff modal (invalid specimen ids dropped).
- Workflow: Automatic; accept in ProtocolChangeModal at Gross Complete.
- Roles/permissions: `config:grossing-routes:manage` for overrides.
- Settings: Configuration > System > Grossing Route Overrides; client override and confidence threshold in routing config; AI provider.
- Status: Built (Demo) — AI parts need the AI proxy; re-evaluation function (evaluateGrossingTemplateFit) marked Unverified in one README.
- Sources: utils/applyGrossingRefinement.ts; services/grossing/README.md; services/grossingRoutingOverrides/README.md

### Case pool routing at grossing completion
- What it does: When grossing completes, an unassigned case is routed to a pool by specimen type (dictionary id) plus performing lab; keyword fallback; lab rule beats Global; each lab gets a catch-all "<Facility> - General Pathology" pool. "Run now" and a preview tool are on the admin screen.
- Workflow: Automatic on grossing complete.
- Roles/permissions: `config:case-routing:manage`; `case:routing:run`.
- Settings: Configuration > System > Case Pool Assignment; Subspecialties (catch-all toggle, workgroup membership).
- Status: Built (Demo)
- Sources: services/cases/README.md; CasePoolAssignmentSection.tsx; services/subspecialties/README.md

---
### C. Grossing

### Grossing screen (blocks, stains, decants)
- What it does: Grossing-tech page showing protocol header (name, version, "Protocol Modified" badge), block table (ID, piece count, stains, status), cytology decant table, Add/Remove Block (remove only Pending), Add/Remove Stain (removing a protocol default needs confirm and is audited), piece-count changes always logged, per-specimen override audit panel. Required-field notices ("Needed before grossing can be completed") and asterisks mark piece count and description.
- Workflow: /case/:caseId/grossing from "Open Grossing Screen" on the report Material tab.
- Roles/permissions: same case access as the synoptic page.
- Settings: Grossing Field Requirements; allowed additional stains per protocol.
- Status: Built (Demo)
- Sources: pages/GrossingScreenPage/README.md; utils/grossingScreenOperations.ts; SignedInApp.tsx:259

### Complete grossing / Gross Complete / Update Gross
- What it does: Checks Grossing Field Requirements (missing items named by specimen A,B or block A1,A2), then permission, then moves the case to Gross Complete with audit; bar lists what is missing and button stays grey until clear. "Protocol attached" is required by default and switchable per organisation; with it off, confirming routes unprotocolled specimens to secondary review and raises an open `def-grossed-without-protocol` deficiency each. At least one block required (skipped for cytology preparations/no protocol). Report-page Update Gross needs a reason (logged gross_updated). Voice "complete grossing" (Alt+Shift+F9); version conflict returned to page.
- Workflow: Grossing screen or report page.
- Roles/permissions: `case:grossing:complete` (Pathologist, Fellow, Resident, PA).
- Settings: Field Requirements (Grossing; protocol rule; piece count/description/fixation end/ratio optional).
- Status: Built (Demo) — voice/hotkey ids confirmed only in the action registry.
- Sources: services/grossing/README.md; grossingCompletion.ts; reportGrossComplete.ts; pages/GrossingScreenPage/README.md

### Scan-triggered grossing release panel
- What it does: Scanning the container hydrates and releases the pre-created blocks (with triage gate where required).
- Workflow: Scan at grossing.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo)
- Sources: pages/SynopticReportPage/GrossingReleasePanel.tsx; utils/hydrateGrossingBlocks.ts

### Fixation tracking on grossing and pre-analytic gates
- What it does: Fixation end time ("Record now"), fixative ratio "Confirm adequate ratio", "Raise deficiency". At sign-out two hard gates: fixative gate (unmet fixation requirements; resolve with documented/estimated time or confirm none possible with reason) and pre-analytic gate (missing collection/receipt dates; override needs justification, jurisdiction-labelled). Specimen Dictionary can flag fixative time (Breast).
- Workflow: Grossing fixation fields; sign-out modals.
- Roles/permissions: not stated.
- Settings: Field Requirements (report page, Sign-out gates; grossing fixation); fixative rules.
- Status: Built (Demo)
- Sources: pages/GrossingScreenPage/README.md; services/signoutGates/README.md; FixativeTimeGateModal.tsx

### Structured inking (margins, ink colours, Gate A and Gate B)
- What it does: Margins are discrete entities (name, orientation, laterality, examined) on a specimen or a block (not both) with append-only ink applications (colour, time, who). Severity: 1 advisory; 2 (not examined / no ink) blocks only in STRICT_ENFORCE; 3 (unmapped colour) always blocks; palette failure fails closed. Gate A at Complete grossing (Sev 3 no bypass; Sev 2 "Proceed with Advisory Note"); Gate B at sign-out (Sev 3 needs Administrative Override with reason; six jurisdiction message profiles).
- Workflow: Grossing Margins & Ink section; gates fire automatically.
- Roles/permissions: `grossing:margin-ink:record`; `case:inking-gate:override` (Admin, Lab Director); `config:ink-color:manage`; `config:inking-validation-mode:manage`.
- Settings: System > Ink Colors; System > Inking Validation Mode per facility (WARN_ONLY default / STRICT_ENFORCE).
- Status: Built (Demo) (Batch 610). The organ-map legend and synoptic margin labels show each margin's recorded ink colour. Waiting on the server side: POST /inking/validate, /inking/override and the SQL override audit table.
- Sources: services/grossing/README.md; docs/architecture/ORGAN_MAPPING_API.md; services/siteSettings/README.md; services/inkColors

### Decants and the material tree
- What it does: Decants (sub-specimens, multi-level, e.g. residual fluid to cell blocks) are added, split, edited, removed as one atomic versioned change returning the whole tree and affected billing lines; applies locally first, rolls back on failure (MATERIAL_ROLLED_BACK), conflict dialog on stale version; duplicate id, missing parent and deleting a decant with children refused; labels never reused.
- Workflow: Report page Material tab, Cytology Workspace, Microtome.
- Roles/permissions: delete needs `case:decant:delete`.
- Settings: print behavior (printSettings defaultPrintBehavior).
- Status: Built (Demo) — server endpoint CASE_MATERIAL_API.md Planned.
- Sources: services/material/README.md; docs/architecture/CASE_MATERIAL_API.md; caseMaterialStore.ts

### Block and stain editor, matrix blocks and comments
- What it does: Modal for block/decant status, stain ordering, foreign ID fields, cassette colour, audited secondary-label printing, cancel block and restain forms with required reasons, piece count/description when rules require. Plain-text (never HTML) comments on blocks, stains and decants. Matrix/shared block editor: Details (status, piece tracking) and Array Mapper.
- Workflow: Open on a block.
- Roles/permissions: not stated.
- Settings: Field Requirements; grossing rules.
- Status: Built (Batch 611). The matrix block editor Details tab has a plain-text Comments list and composer (author, time, audited without the comment text), like ordinary blocks.
- Sources: SynopticReportPage/modals/BlockStainEditorModal.tsx; MatrixBlockEditorModal.tsx; types/case/MaterialComment.ts

### Delete a block while in process
- What it does: "Delete this block" (reason list, note required for Other): soft delete (status Deleted, reason/who/when kept), unfinished stains cancelled, cassette position and billing codes released, one BLOCK_DELETED billing deficiency raised, one audit entry. Refused if already deleted or case signed out; no message or auto-credit.
- Workflow: Tech opens block editor, deletes; billing resolves in Financials > Billing deficiencies (CHARGE_REVERSED = credit).
- Roles/permissions: `material:block:delete-in-process` (bench roles; facility changes in role grants).
- Settings: role grants.
- Status: Built (Demo) (Batch 610). Authorised users delete a block after sign-out (marked Invalidated with reason, billing deficiency and audit entry), and a pathologist or QM flags a block on an amended report; deleted blocks show in the case material list. Waiting on the server side: 409 on a stale case version (BLOCK_DELETION_API.md).
- Sources: docs/product/BLOCK_DELETION.md; docs/architecture/BLOCK_DELETION_API.md; services/material/deleteBlockInProcess.ts; DeleteBlockControl.tsx

### Slide levels by printed label, Manage Reprints, material tracking history
- What it does: Slide level ("L3") comes from the printed displayId, never position, for scans, disposal, pending batch queue, reprints and stain QC; next level never reuses a removed one. Manage Reprints is a cascading four-column reprint manager. Material Tracking History shows the nested Specimen > Block > Slide scan log and location history (print audited), including dispatch outcomes.
- Workflow: Material tab modals.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo) — dispatch history reads Firestore (placeholder config), see Engraver Monitor.
- Sources: services/material/README.md; utils/slideLevels.ts; ManageReprintsModal.tsx; MaterialTrackingHistoryModal.tsx

### Case flags (dictionary, apply/remove, printing restriction)
- What it does: Admin flags (administrative or computational; case or specimen level; severity; LIS code; colour). Flag manager modal assigns at Case / All Specimens / one specimen with undo and Save-only commit; instances record applied-by. LIS-reported flags are resolved to a definition (added if new) and applied; auto-created flags show a banner. Seed f37 "Confidential - Restricted Printing" restricts printing to `report:restricted-case:print`; "Restricts printing" switch on any case flag. Search results show up to four flag chips.
- Workflow: Report page flag manager; admin Flags config.
- Roles/permissions: `config:case-flags:manage`; `report:restricted-case:print`.
- Settings: Configuration > System > Flags.
- Status: Built (Demo)
- Sources: services/flags/README.md; components/Flags/README.md; FlagConfigPage.tsx

### Case hold and retention hold
- What it does: Case Hold gates finalize on an active case (quality issue, awaiting outside materials, clinical discrepancy, pending consultation); Retention Hold gates disposal after finalization (litigation, patient request, research). Both can be active; one active hold of a kind; holds are released, never deleted; note required via Field Requirements; audit has no free text. "Cases on Hold" worklist tile.
- Workflow: Hold modals in the report page sidebar (voice "place hold"/"release hold").
- Roles/permissions: `case:hold:place`/`release`; `case:retention-hold:place`/`release`.
- Settings: Field Requirements (hold note).
- Status: Built (Demo)
- Sources: services/cases/README.md (Batch 381); caseHolds.ts; CaseHoldModal.tsx; RetentionHoldModal.tsx

### Active retention holds queue
- What it does: A queue page of retention holds. Not built: no page, route or service; holds are only per case and enforced by the disposal queue.
- Workflow: n/a
- Roles/permissions: n/a
- Settings: n/a
- Status: Built (Demo) (Batch 610). A Retention Holds queue page lists every active hold with case, reason, who and when, release with a note, and CSV export. Waiting on the server side: 409 on a stale case version when two people release at once.
- Sources: services/retentionPolicy/README.md; services/batches/README.md

### Grossing hardware: camera, scale, profiles and gross photo
- What it does: Hardware profiles per station for camera (browser or agent) or scale (agent or manual entry), with agent address (https only), station and linked Equipment device (wrong kind refused). Camera capture previews and takes stills in-browser (denied/none/error distinguished); photo uploads through the Gross Imaging vendor service and only the URL is stored ("Add Photo" on block cards, "Capture Gross Photo" in intraop Quick Gross). Scale weight read from `GET {agent}/scale/weight` (unstable rejected, http refused) with manual fallback.
- Workflow: Admin sets profiles; grosser clicks photo/weight.
- Roles/permissions: `config:grossing-hardware:manage`.
- Settings: Configuration > System > Workstation & Hardware > Grossing Hardware; Gross Imaging vendor base URL.
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Gross Imaging vendor upload endpoint; real PathScribe Agent and scale at site.
- Sources: services/grossingHardware/README.md; CameraCaptureControl.tsx; services/imageAssociation/README.md

---
### D. Scan stations, workstation set-up and shared bench behaviour

### Scan station registry and global station selector
- What it does: Facility-scoped stations with barcode (`STATION:...`), workflow stage, lifecycle Active/Inactive/Unverified, printer profile; deactivate only. Station is identified once at login (ScanStationPrompt) and shown in the nav bar selector; it resolves the workstation group and pushes the functional area and default action group to the Action Registry. "Go to Bench" appears only if the group is Active with a dedicated route (microtome, embedding, slide-distribution). Scanning a `STATION:` barcode switches station (not mid-write). Station labels print from Scan Stations. Facility fallback: scan station facility scopes a batch when no item resolves one. Fallback chain: device storage, then user profile default.
- Workflow: Admin defines stations; tech sets station at sign-in.
- Roles/permissions: `config:scan-stations:manage`.
- Settings: Configuration > System > Scan Stations (facility required, list of performing labs); Workstation Groups (`config:workstation-groups:manage`) and Action Groups (`config:action-groups:manage`).
- Status: Built (Demo) — station label printing has no test file.
- Sources: services/scanStations/README.md; components/NavBar/README.md; utils/labels/printStationLabels.ts; services/workstationGroups; services/actionGroups

### Scanner listener, material scan tracking and scan beep
- What it does: Global listener detects HID scanners by keystroke timing, ignores synthetic events, never eats Enter in a form; an accession-pattern scan navigates to the case (not on /accession). Scans resolve to specimen/block/slide (slide by printed level) from any page; the station's default action (e.g. Log Slide/Block at microtome) fires on the next scan. Block exception states (STAT, 0 slides, consumed, damaged, lost) computed in one place; scan formats limited to five modelled barcode types; optional beep. Camera barcode capture via @zxing/browser (intraop queue).
- Workflow: Any bench page with a scanner.
- Roles/permissions: none.
- Settings: Scan station; identifier formats per enterprise (Facility editor Identifier Formats tab with simulate-scan).
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Receive MaterialScanEventPayload from the interface engine/middleware.
- Sources: contexts/README.md; hooks/README.md; utils/README.md; BarcodeScanner/README.md; pages/MicrotomyWorkstationPage/README.md

### Foot pedals
- What it does: Three bindings per workstation (HID/Gamepad or keyboard-emulating pedals) used for dictation, Microtome (Pedal 2 Print/Etch Next) and Embedding (Pedal 1 confirm piece count); Pedal 3 pause/replay. Slide Distribution has no pedal support. Embedding "advance to next cassette" pedal is not built (no queue).
- Workflow: Bind in Voice settings, then hands-free.
- Roles/permissions: personal; deployment voice switch `config:voice:manage` does not affect pedals.
- Settings: Configuration > Voice > Foot Pedal (stored per computer).
- Status: Built — hardware not verified; Slide Distribution pedal and Embedding next-cassette pedal Planned. Conflict resolved: embedding README "pedal not built" refers only to next-cassette; confirm-count pedal is wired (useFootPedal in embedding page; none in slide-distribution page).
- Sources: types/footPedal/README.md; hooks/useFootPedal.ts; pages/EmbeddingStationPage/README.md

### Voice commands for bench stations
- What it does: Station-page-only commands: Microtome add comment/add stain; Embedding confirm piece count/add comment; Slide Distribution confirm physical checkout / confirm digital scanner; Add-On submit; Batch create container; Molecular create plate/place rack; Accession print labels (stale-closure limit). Abort batch, force reconciliation, cold-chain acknowledge, Clone & Supersede, block cancel/restain deliberately have none.
- Workflow: Say phrase on the page; same checks as the button.
- Roles/permissions: same as buttons.
- Settings: none.
- Status: Built (Demo) — BATCH_CREATE_CONTAINER confirmed in NewContainerModal.tsx and action registry; Accession voice effect only mentioned in passing (Unverified).
- Sources: services/actionRegistry/README.md; pages/BatchManagement/NewContainerModal.tsx

### Per-computer workstation settings
- What it does: Scan station, OR terminal, display profile, foot-pedal bindings and companion-window positions are kept per computer (workstationSettings.ts), separate from per-user display prefs; neither throws on blocked storage.
- Workflow: Automatic.
- Roles/permissions: none.
- Settings: n/a
- Status: Built
- Sources: utils/README.md; utils/workstationSettings.ts; utils/uiPreferences.ts

---
### E. Embedding, microtome, slide distribution

### Embedding station
- What it does: /workstations/embedding: scan a cassette (global listener or scan box) to show all blocks of its specimen with status, centre controls and print panel; works cassette by cassette. Piece-count verification: expected (from grossing) vs observed whole number >=0, Confirm records it; mismatch raises Tissue Discrepancy deficiency (def-tissue-discrepancy). One-touch discrepancy buttons: Missing Tissue/Empty Cassette, Extra Tissue Found, Unopened Cassette/Unprocessed Tissue, Damaged Cassette/Broken Hinge. Alert badges: Tiny Tissue, Fragile, Decal Required (toggle, shared with Microtome); Biopsy and Needle Core read-only from the Specimen Dictionary. Mold size chips 7x7, 15x15, 24x24, 24x30, Mega; orientation free text with quick-fills. Split-block grouping (A1/A2/A3 embedded together). Block comments (no "prints on label" option). Cassette label reprint with reason (Wax Buildup, Faded Barcode, Mechanical Jam, Other).
- Workflow: Home tile > scan > work > scan next; voice "confirm count", Ctrl+Alt+Shift+C; comment Ctrl+Alt+Shift+A.
- Roles/permissions: `screen:embedding:open`.
- Roles/permissions: `screen:grossing:open` (Batch 720: the Grossing tile under Pathology Workspace; seeded to Pathologist, Fellow, Resident and Pathologists Assistant).
- Settings: Field Requirements page "embedding" (observed count, reprint reason, comment text locked; mold size/orientation optional switches); printer profile/print settings.
- Status: Built (Demo) — no printer telemetry; matrix blocks refused ("Embedding takes block cassettes only") and next-cassette pedal Planned.
- Sources: pages/EmbeddingStationPage/README.md; utils/embeddingOperations.ts; SignedInApp.tsx:216

### Microtome workstation
- What it does: /workstations/microtomy: scan a block, matrix block, slide or cytology decant to see every slide to cut/stain (context, slide grid or cytology panel, hardware/print). Grid columns Level, Stain, Print Status, Actions; per-row "+ Level"; Add Stain picker (category search, duplicate count, level depth in microns, control-slide pairing); reorder; remove (cancel reason once printed). Slide printing: On-demand (next unprinted) or Batch with progress (Pending/Printing/Printed/Failed); label prints only after the Printing mark is saved; schematic preview and fit warnings. Reprint needs reason (Jam, Scratched Glass, Misprint, Other). Alert flags and a unified comment drawer (prints on label vs LIS-only). Matrix blocks: stains/levels apply to every core; billing waits for pathologist core confirmation. Cytology panel: dynamic prep suggestions (Direct Smear, Cytospin, ThinPrep, Cell Block) from decant volume and yield (strict >20 mL rule). Billing box shows suggested codes.
- Workflow: Microtome tile > scan > print slides; foot pedal 2 prints next; voice add comment/add stain.
- Roles/permissions: `screen:microtomy:open`.
- Settings: Field Requirements "microtomy" (stain and cancel reason locked); printer profiles; print settings.
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: pages/MicrotomyWorkstationPage/README.md; utils/microtomyOperations.ts; utils/labels/resolveSlideLabelFitWarnings.ts; services/printSettings/README.md

### Slide distribution station
- What it does: /workstations/slide-distribution: always-on scan input queues a slide, or a block/cassette barcode queues every slide cut from it. Header shows queue count, destination mode, carrier/scanner, tech. Physical destination: pathologist or pool quick-pick grid (active Pathologist-role staff and pools), slide folder, tray, courier bag, default pre-filled from case assignedTo/subspecialty; statuses Assigned, Checked Out. Digital destination: pick active slide scanner from Equipment register, rack/slot; statuses In Scanning Queue, Loaded on Scanner, Scanned; failed/QC-failed slides return with an unloaded_from_scanner custody line. One-touch scan exceptions on append-only distributionEvents; replacement label print needs reason (Damaged label, Unreadable barcode, Smudged print, Other) on the custody line. Queue shows STAT/Rush/Routine badge.
- Workflow: Scan slides, choose Physical or Digital, confirm (voice Ctrl+Alt+Shift+P / D).
- Roles/permissions: `screen:slide-distribution:open`; `wsi:scan-batch:*` for scanning.
- Settings: Field Requirements "slideDistribution" (scanner locked; folder, tray, courier, rack, slot, exception note optional switches).
- Status: Built (Demo) — matrix-block slides and the foot pedal are Planned.
- Sources: pages/SlideDistributionStationPage/README.md; utils/slideDistributionOperations.ts; services/digitalPathology/wsiScanBatchWorkflow.ts

### Slide scanning (WSI) batches (bench hand-off)
- What it does: Scan queue of Digital-routed slides (STAT first); a batch takes slides, Load assigns positions, Send dispatches `WSI_SCAN_MANIFEST`, Unload marks slides passing image QC as Scanned and returns the rest. Page re-reads on change/reconnect and polls (15 s offline, 60 s live).
- Workflow: /batch-management/wsi-scan.
- Roles/permissions: `wsi:scan-batch:load|send|unload` (checked against scanner's lab).
- Settings: scanners come from the Equipment register.
- Status: Built (Demo) — scanner traffic needs the interface engine. (Digital-pathology theme covers detail.)
- Sources: services/digitalPathology/README.md; pages/BatchManagement/WsiScanBatchesPage.tsx

---
### F. Add-on orders

### Add-on order page
- What it does: Case-scoped page (search/scan an accession, or the report header "Add-on order" button with case preloaded via ?case=): pathologist orders recuts/deep levels, special stains, IHC (single or preset panel: Breast, Lynch-MMR, Renal-IF), and molecular/send-out on the case's real blocks. Panels: block context (levels already cut, Tiny Tissue/Fragile; Exhausted/Lost/Damaged/Cancelled blocks disabled and refused), order builder (kind toggle, category-filtered stain search, level depth, control pairing), summary/routing. Lines split by stain category and route to scan stations by workflow stage, scoped to the performing lab. Priority, slide media/charge, cutting instructions, stamped with ordering pathologist. Molecular/send-out lines name an approved reference lab (in-house lines go to the Molecular In-House Queue). If any block refuses, nothing saves and the block and reason are named.
- Workflow: Pathologist opens from report page, picks blocks, builds lines, submits (voice add to order / submit).
- Roles/permissions: `screen:add-on-orders:open`; `add-on:order:place` (Pathologist, Fellow, Resident).
- Settings: Field Requirements "addOnOrder" (level depth and bench instructions off by default); Stain Dictionary; test send-out labs.
- Status: Built (Demo) — IHC panel presets are a starter set with no admin dictionary (Partial for panels).
- Sources: pages/AddOnOrderPage/README.md; services/addOnOrders/README.md; types/case/AddOnOrder.ts

### Add-on order tracking dashboard
- What it does: Every add-on order on the case with a derived 5-stage status (Requested, Block Retrieved, Cut/Pending Stain, Stained/QC, Checked Out/Scanned) and a "Mark Block Retrieved" action.
- Workflow: Bottom of the add-on page.
- Roles/permissions: none stated.
- Settings: none.
- Status: Built (Demo)
- Sources: OrderTrackingDashboard.tsx; computeAddOnTrackingStage

### Block exhaustion exception and pathologist response
- What it does: A tech flags "Block exhausted" (block set Exhausted, append-only exceptionEvents) and the ordering pathologist is emailed (transport-only English message). Pathologist cancels, Modifies & Resubmits, or Approves Destructive Cutting (decision recorded only; does not reverse block status or gate the microtome page).
- Workflow: Tech flags on the add-on page; pathologist responds on the dashboard.
- Roles/permissions: tech flag needs `add-on:exception:flag` (Batch 669); `add-on:exception:approve-destructive-cut`; cancel/modify `add-on:order:place`. Mark Block Retrieved needs `add-on:block:mark-retrieved`. When the slide has no ordering pathologist (or none who can be e-mailed) the notice goes to the Supervisor / Accessioning Desk (Lab Director and Accessioner roles) instead.
- Settings: Field Requirements (exception and response notes).
- Status: Built (Demo) (Batch 610). A Block exhausted button on the Microtome workstation flags the block and e-mails the pathologist (Simulated outbox without a mail server); cutting is blocked until the decision is recorded, and Cancel/Modify restore the block. Waiting on the server side: mail transport.
- Sources: pages/AddOnOrderPage/README.md; services/addOnOrders/README.md; addOnOrderActions.ts

---
### G. Batch management, chain of custody, cold chain, retention

### Batch Management hub, new container and batch detail
- What it does: /batch-management hub with node tiles (Decal/Special Processing, Processing, Embedding, Microtome/Sectioning, Staining, Checkout), stage filter with counts, open/closed list. New Container: container type, target node, protocol/run parameters, priority, identifier mode (disposable CONT- vs reusable RACK-); audited label print; locked fields protocol, rack ID, decal duration, referral lab, cytology stain. Batch Detail: scan items in (items enter only by scan), remove, move, release rack, reconciliation (missing and unexpected scans block Complete), transfer to Processing; control slides auto-appended. Refusals are coded (BATCH_ERRORS) and localized. Decal batches carry acid type, target duration, countdown.
- Workflow: Hub > New Container > Generate (voice "create container", Ctrl+Alt+Shift+N) > scan items > reconcile > Complete.
- Roles/permissions: `screen:batch-management:open`.
- Settings: Field Requirements page "batchManagement" (referral test, reagent lots optional).
- Status: Built (Demo) — mock batch service; demo seeds for each override type.
- Sources: pages/BatchManagement/README.md; services/batches/README.md

### Batch close-out actions (abort, reconciliation override, cold-chain acknowledge)
- What it does: Three actions need a locked reason via BatchReasonModal; service checks reason and permission.
- Workflow: Batch detail > action > reason > confirm.
- Roles/permissions: `batch:run:abort`, `batch:reconciliation:override`, `batch:cold-chain-excursion:acknowledge`.
- Settings: none.
- Status: Built (Demo)
- Sources: BatchReasonModal.tsx; services/batches/README.md

### Pending Batch Load queue
- What it does: Read-only list of every block/slide (Grossed/Embedded/Exhausted) printed or engraved but not in any active batch manifest, searchable, grouped by case, slides by printed level; not facility-scoped.
- Workflow: /batch-management/pending-load.
- Roles/permissions: `screen:batch-management:open`.
- Settings: none.
- Status: Built (Demo)
- Sources: services/batches/computePendingBatchQueue.ts

### Cold chain: smart containers, storage and excursion gate
- What it does: A genuine temperature excursion on a smart container checked out to a batch sets coldChainExcursion, blocks Complete until acknowledged (a later normal reading does not clear it) and raises one `def-cold-chain-excursion` deficiency per distinct case. Reading exactly at threshold is not an excursion. Storage condition types (seeded Frozen Tissue max -20 C, Fresh Tissue max 8 C) and storage units (fixed equipment) exist as services. Hardware container registry tracks reusable racks (Available/In Use; a rack cannot be on two batches) with optional smart-container fields.
- Workflow: Supervisor acknowledges on the batch.
- Roles/permissions: `batch:cold-chain-excursion:acknowledge`.
- Settings: HardwareContainer isSmartContainer + storageConditionTypeId (admin create/update; no UI found for storage condition types or units).
- Status: Built (Demo) (Batch 610). Storage Units, Condition Types and smart containers have an admin section, and a labelled Simulated reading control feeds the telemetry processor and shows the excursion. Waiting on the server side: MQTT/REST telemetry ingestion endpoint from smart containers.
- Sources: services/coldChain/README.md; services/hardwareContainers/README.md; pages/BatchManagement/BatchDetailView.tsx

### External referral batches and inter-laboratory referral
- What it does: Referral node with destination reference lab and test requested; on completion builds a referral manifest (QUEUED/SENT/FAILED, retry, audit) and a tracking record; transit moves forward only (dispatched, in transit, delivered, result received). Molecular send-out orders are named in the manifest. Inbound results are discrete or a PDF, never both. Counts feed the Send-Out dashboard.
- Workflow: Create referral batch, scan specimens, complete; "Mark in transit" / "Mark delivered".
- Roles/permissions: `referral:transit-status:update`.
- Settings: reference_lab facility role.
- Status: Built (Demo). Referral manifest queue is in the unified outbound screen (dispatch, resend, simulate failure) with tracking and inbound result processors built. Delivery to the reference lab needs the engine.
- Sources: services/referral/README.md; services/batches/README.md

### Disposal queue (scan-to-dispose) and retention eligibility
- What it does: Computed (not stored) list of blocks, slides, decants and decant slides past retention with no active retention hold, per facility; scanning disposes; refusals coded (notPermitted, noMatch, notFound, alreadyDisposed, notSignedOut, onHold, notEligible, wrongFacility). Retention days per material type per jurisdiction (RCPath, CAP/CLIA), most conservative date, with Department.retentionOverrideDays override.
- Workflow: /batch-management/disposal > scan.
- Roles/permissions: `retention:material:dispose` at station facility.
- Settings: Departments retention override; jurisdiction defaults.
- Status: Built (Demo)
- Sources: services/retentionPolicy/README.md; computeDisposalQueue.ts; disposeItemByScan.ts

### Disposal (waste) report
- What it does: Filterable log (facility, material type, date) with disposer name; XLSX/CSV export audited as DOCUMENT_EXPORTED; CSV cells starting = + - @ are apostrophe-prefixed. Eligibility date is recomputed with today's rules.
- Workflow: /batch-management/disposal-report.
- Roles/permissions: `retention:disposal-report:export`.
- Settings: none.
- Status: Built (Demo)
- Sources: services/retentionPolicy/README.md; utils/csv.ts

### Retention policy setting (administrative data)
- What it does: Records how long AI suggestions, audit log, case snapshots and report archives are kept. Distinct from material retention above. Nothing purges by it.
- Workflow: Configuration screen.
- Roles/permissions: `config:retention-policy:manage`.
- Settings: Configuration > System > Retention.
- Status: Built (Demo). Retention setting screen is built and saved with permission check; nothing purges, which is a scheduled server job (PS-345).
- Sources: services/retention/README.md; RetentionSection.tsx

### Engraver Monitor, engine webhooks and dispatch history
- What it does: Read-only fleet dashboard (online/engraving/warning/fault/offline counts, device cards, supply warnings: cassette low/depleted, colour unavailable, Launch Diagnostics link; refresh on `engravers` topic or 30 s). Four inbound webhooks: cassette dispatch outcome (error raises CAPA def-cassette-dispatch-failure), block exception Lost/Damaged (CAPA def-block-lost/-damaged + notification), material location (all 8 levels), engraver status (stale-timestamp guard); shared-secret/HMAC auth, idempotent by messageId. Report page dispatch-history timeline reads the same data.
- Workflow: /batch-management/engraver-monitor.
- Roles/permissions: `screen:batch-management:open`.
- Settings: env ENGINE_WEBHOOK_SECRET / HMAC secret; scripts/seedEngraverDevices.ts.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Engine webhooks (api/webhooks/engine), real engraver feeds and SQL Server API.
- Sources: api/webhooks/engine/README.md; services/engravers/README.md; pages/BatchManagement/EngraverMonitorPage.tsx; src/firebase/config.ts

### Inbound canonical events (block exception, material location)
- What it does: Applies block-exception (Lost/Damaged/Exhausted) and material-location events through the normal case write path, idempotent on messageId; location is a "last known location" badge on specimen, block, slide, decant. Dev-only "Sim Block Exception / Sim Location Update" buttons on the report page.
- Workflow: Interface engine to case.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo). Block exception and location events are applied through the normal write path, with Sim buttons in the report page Dev Tools menu and location badges. Vantage/Cerebro translation awaits vendor guides.
- Sources: services/hl7/README.md; docs/architecture/VENDOR_NEUTRAL_EVENTS.md

### Asset location dictionary
- What it does: Governed hierarchy of locations (building, room, storage unit, storage slot, workstation, archive shelf, other) with Active/Inactive/Unverified; an unknown location from the LIS auto-creates an Unverified entry (exact match only). Feeds mortuary capacity.
- Workflow: Admin reviews and verifies.
- Roles/permissions: `config:asset-locations:manage`.
- Settings: Configuration > System > Lab Materials & Workflows.
- Status: Built (Demo)
- Sources: types/assetLocation/README.md; services/assetLocation/README.md

---
### H. Labels and printing hardware

### Label building and printing
- What it does: Builders produce requisition, container, decant, cassette, slide, molecular, station and secondary-overlay labels (GS1 DataMatrix via bwip-js, Code 128, QR); output to browser print window, QZ Tray (connection opened first; warning toast if it fell back to the browser dialog), PathScribe Agent, or network via Interface Engine. Missing MRN/DOB print "Not Recorded"; blank patient prints blank, not "Patient undefined undefined". Fit warnings for cassette/slide; every print audited. Size presets (CLSI AUTO12, LabTAG). "Print All Cassettes for Case"; reprints from the material tree; unreadable-barcode secondary label.
- Workflow: Print Labels at accession; reprint from material tree.
- Roles/permissions: `label:batch:reprint` for batch; print settings capabilities.
- Settings: Printer Profiles, Print Settings, label size presets.
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: POST /api/print/jobs; PathScribe Agent / BarTender / Zebra Browser Print programs (other team); real QZ printer test on hardware.
- Sources: utils/labels/README.md; docs/product/QZ_TRAY_CERTIFICATE_GUIDE.md; services/printerProfiles/README.md

### Batch label reprint by case range
- What it does: Find cases by accession date and/or number range (empty filter finds nothing), untick any, choose requisition, container and/or cassette labels (cassettes need a printer; on-demand guardrail blocks cassettes); prints one at a time (250 ms pause), shows "X of Y", failed list and Retry failed; run log keeps newest 200. Without a hardware bridge each label opens the browser print dialog.
- Workflow: /batch-management/label-reprint.
- Roles/permissions: `label:batch:reprint` (Histotechnologist, Admin).
- Settings: lab print settings (guardrail, GS1 GTIN, cassette layout), printer profiles.
- Status: Built (Demo) — real hardware needs manual check.
- Sources: pages/BatchManagement/LabelReprintPage.tsx; services/labels/batchLabelReprint.ts; services/labels/README.md

### Requisition sticker sheet and station/container labels
- What it does: 4x6 in multi-zone thermal sheet: main tracking sticker plus peel-offs (logs, tubes, cassettes/slides) with configurable counts, all carrying the accession barcode; ZPL layout checked for overlaps. Container label size uses an admin preset (`requisitionLabelPresetId`).
- Workflow: Printed at requisition.
- Roles/permissions: none.
- Settings: Print Settings (presets, printer profile per label family).
- Status: Built (Demo). Sticker sheet prints end to end with ZPL overlap checks and an admin preset; hard-coded field order is not a dead end. Configurability is covered by entry 27 wiring.
- Sources: services/molecular/README.md; utils/labels

### Print Settings (system and facility override)
- What it does: Lab-wide label print defaults: default behavior (on-demand default / batch), guardrail enforcement, scan-verification requirement, container label size preset, editable cassette label layout (CassetteLabelLayoutEditor), optional "require reason when reprinting a report". A facility overrides only chosen fields; inherited values show read-only with "+ Create Facility Override" / "Revert to System Default".
- Workflow: Admin.
- Roles/permissions: `config:print-settings:manage`.
- Settings: Configuration > System > Print Settings.
- Status: Built (Demo)
- Sources: services/printSettings/README.md; components/Config/System/PrintSettingsSection.tsx

### Printer profiles and bridge types
- What it does: Registry of label printers: vendor, ZPL support, DPI, DataMatrix module size, bridge type, facility (blank = shared), linked equipment (label-printer kind), Agent Port 1024-65535. Bridge availability: QZ Tray and OS dialog available; Direct via Interface Engine PathScribe side built (engine not); PathScribe Agent client built, agent not; BarTender and Zebra Browser Print Planned.
- Workflow: Admin at onboarding.
- Roles/permissions: `config:printers:manage`.
- Settings: Configuration > System > Workstation & Hardware > Printer Profiles.
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Site agent, BarTender REST, Zebra Browser Print and engine print route specs.
- Sources: services/printerProfiles/README.md; utils/labels/pathscribeAgent/README.md

### Network label print status and PathScribe Agent status line
- What it does: For "Direct via Interface Engine" printers, a bottom-left list shows sent (waiting), printed (5 s), failed with reason + Retry/Dismiss, no answer after two minutes (retryable); retry is manual only with attempt number and kept idempotency key. Agent labels show sending, queued with jobs ahead, "Printing on ZD421". Demo buttons simulate engine answers when no API server.
- Workflow: Any label print to such a printer.
- Roles/permissions: none.
- Settings: printer profile bridge type.
- Status: Built (Demo). Print status list, retry/dismiss and agent status line are built, with Simulate buttons when no API server. Real send needs POST /api/print/jobs and the agent.
- Sources: services/networkPrint/README.md; components/Printing/README.md

### Label Designer
- What it does: Drag-and-drop designer for nine label types (requisition, specimen, decant, block, slide, molecular types): palette, to-scale canvas, mm inspector, 8 handles, fields clamped in-bounds (Fit to label), real barcode preview, save/reset, ZPL export for Labelary checks (sample barcode value). One layout per type with Enterprise default; facility overrides only for requisition, specimen, decant.
- Workflow: Configuration > System > Label Designer (no standalone route/tile).
- Roles/permissions: `config:label-layouts:manage`.
- Settings: Workstation & Hardware group.
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: pages/LabelDesignerPage/README.md; services/labelDesigner/README.md; systemSections.ts

### Dynamic label rules, template store, printer-agnostic payload
- What it does: Show/hide fields by rule, versioned template store, one payload to ZPL/EPL/DPL.
- Workflow: n/a
- Roles/permissions: n/a
- Settings: n/a
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: services/labelDesigner/README.md

### Site agents and print destinations (label-relevant)
- What it does: Admin enrols per-lab site agents (single-use 24 h code, revoke with reason, update window, printers and Windows file shares with validation); routing rules, a facility default and Print Queue Redirect can target a lab's agent printer; label printers are ZPL on Raw 9100. Print routing rules choose destination by workstation > location > client account > facility tiers (RAW_9100, LPR_LPD, IPP) with a Test panel.
- Workflow: Configuration > System > Site agents / Print Routing Rules.
- Roles/permissions: `config:site-agents:enroll`, `config:site-agent-config:manage`, `config:print-routing:manage`, `print:job:*`.
- Settings: as listed; browser CSP allows loopback print bridges (QZ ports 8181-8484, agent wss 127.0.0.1:9100-9102) unless `workstationBridges:false`.
- Status: Built (Demo). Enrolment, revoke, update window, shares and routing-rule screens exist with tests; only the agent and its endpoints are external. Printing outcome is covered under print routing (#128).
- Sources: services/siteAgent/README.md; services/printRouting/README.md; deploy/security-headers/README.md

---
### I. Equipment, displays and bench metrics

### Equipment register and maintenance/calibration log
- What it does: One register of devices (analyser, stainer, tissue processor, slide scanner, camera, scale, label printer, engraver, storage unit, other): unique code, make, model, serial, performing lab, scan station, status; never deleted. Optional maintenance/calibration intervals (1-3650 days); append-only log (maintenance, calibration, function check, repair, malfunction; no future dates; failure needs notes); open malfunction/overdue shown red, non-blocking. Analysers get a deck-layout editor. Linked from printer profiles, grossing hardware, WSI batches, slide distribution.
- Workflow: Admin edits; bench staff log at /batch-management/equipment-log or the register's Log action.
- Roles/permissions: `config:equipment:manage`; `equipment:maintenance:record`.
- Settings: Configuration > System > Workstation & Hardware > Equipment.
- Status: Built (Demo) — reminders and cross-device report Planned; engravers and cold-chain storage not linked to the register.
- Sources: services/equipment/README.md; pages/BatchManagement/EquipmentServiceLogPage.tsx

### Facility Ops wall-display dashboards and Display Profiles
- What it does: Five department views (Grossing & Intake, Embedding & Microtome, Staining & IHC, Send-Out & Reference, Diagnostic Sign-Out/Scanner) as stat tiles and queue rows; carousel (default 20 s), polls every 20 s, "Offline / Stale Data" badge. Display Profiles (facility, assigned views, interval, optional device token typed at binding; bookkeeping, not hardware verification) bind a kiosk per browser.
- Workflow: Admin creates profile; kiosk opens /facility-ops-dashboard (public route by design) and binds.
- Roles/permissions: `config:display-profiles:manage` (Admin, Lab Director); route has no ScreenGate.
- Settings: Configuration > System > Display Profiles.
- Status: Built (Demo) — route verified at SignedInApp.tsx:179; computed from mock data; no push, no category breakdown.
- Sources: pages/FacilityOpsDashboard/README.md; services/facilityOpsDashboard/README.md

### Bench Contribution dashboard
- What it does: /bench-contributions for bench roles: accessioning rate, batch throughput and queue aging per node, stage-to-stage TAT, cytology processing/staining and molecular QC pass/fail/rerun.
- Workflow: Home tile.
- Roles/permissions: `screen:bench-contributions:open`.
- Settings: none.
- Status: Built (Demo) — route at SignedInApp.tsx:238, capability in catalog. Conflict resolved: Contribution README says a bench page is "Planned"; Batch 488 built it.
- Sources: pages/BenchContributionDashboardPage; pages/README.md; services/contribution

### Stain Dictionary, sectioning protocols, order macros and reagent lots
- What it does: Three tabs: stain types (category, optional coder-entered default billing code, control tissue flags, Diff-Quik/Wright-Giemsa for cytology), sectioning protocols, quick-order macros; molecular tests tab with approved reference labs, default lab and in-house labs. Category drives add-on order splitting to bench queues. Reagent and solution lots (stain reagent lots) are maintained separately. Name uniqueness; Duplicate.
- Workflow: Admin.
- Roles/permissions: `config:stain-dictionary:manage`; `config:reagent-lots:manage`.
- Settings: Configuration > System > Stains; Reagent & Solution Lots.
- Status: Built (Demo)
- Sources: services/stains/README.md; services/reagentLots/README.md; StainDictionarySection.tsx

### Hardware order dispatch and ORM^O01 builder
- What it does: Builds an ORM^O01 per block with an OBR per stain and BLOCK_ORDER dispatch through a vendor adapter. Slide-order and specimen-label dispatch return "not implemented".
- Workflow: none (no caller).
- Roles/permissions: none.
- Settings: facility timezone.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Verified Vantage/Cerebro integration guide and endpoint mapping.
- Sources: services/hl7/README.md; services/hardware/README.md

---

#### Not yet in FEATURE_OVERVIEW.md
(Grepped docs/product/FEATURE_OVERVIEW.md; zero or only incidental mentions.)
- Order intake and crosswalk: pending-orders queue behavior, Specimen Code Crosswalk admin screen, Map & Link, facility auto-create (0 mentions of crosswalk, unmapped).
- Accession number masks / Case Mask configuration (0 mentions of "mask").
- Patient ID auto-generation (AUTO-), walk-in OrderCreated message (0 mentions).
- Patient match review, Patient Management merge/link/move and Search "Reassign Patient" (0 mentions of Reassign).
- Encounter selector rules (48 h active window) and Facility Locations dictionary (only incidental).
- Intraop merge prompt at accession; downtime/outside intake detail (only brief MPI mentions).
- Scan Station registry, Workstation Groups, Action Groups, Go to Bench (0 mentions of scan station).
- Foot pedals (0).
- Protocol triage gate and Pending Grossing tile (0 mentions of triage).
- Structured inking, ink colours, inking validation mode, Gate A/B (0 mentions of inking).
- Fixative-time and pre-analytic sign-out gates (no mention of fixative).
- Grossing camera/scale hardware profiles and gross photo capture (0 camera/scale).
- Case flags dictionary and "restricts printing" flag (only incidental).
- Container Types dictionary (0), Department dictionary retention/branding override.
- Label Designer (0), Print Settings override and cassette label layout editor, label reprint by case range (only "Label reprint" incidental).
- Engraver Monitor and engine webhooks (0 mentions of engraver).
- Equipment register and maintenance/calibration log (only deck layout mention).
- Cold-chain telemetry, storage units, hardware container (rack) registry (only one cold-chain excursion line).
- Facility Ops wall displays and Display Profiles (0).
- Bench Contribution dashboard (0).
- Block exhaustion tracking dashboard stages (Add-On entry omits the 5-stage tracker).
- Retention policy setting (administrative data) vs material retention.
- Slide levels by printed label; Manage Reprints; Material Tracking History.
- Voice commands for bench stations.

#### Status in FEATURE_OVERVIEW.md that the code contradicts
- Bench workstations "Live (Sep 2026)": Embedding and Slide Distribution refuse matrix blocks; Slide Distribution has no foot pedal; Microtome slide-label layout setting is not wired to ZPL and has no editor; Microtome page has no block-exhausted flag (Add-On entry says "a tech flags insufficient tissue" but the flag exists only on the Add-On page).
- Batch Management "Live": the Engraver Monitor sub-page reads Firestore with placeholder credentials (cannot work in a real browser) and engine webhooks have never run live; cold-chain telemetry has no ingestion path.
- Cassette Color Routing & Printing "Live — full label-printing architecture": Label Designer layouts are not consumed by print output; slide label layout is partially wired; PathScribe Agent program not built.
- Label Printing "Partial": consistent, but "Local Bridge Agent path" is now the PathScribe Agent (client built, agent not); dispatchContainerLabelPrint is referenced yet absent.
- Case Accessioning "Live": Demo only (mock storage); no encounter lookup for a freshly typed manual patient; patient-ID status dot cannot read the HL7 status from inbound ADT; order intake cannot scope by site.
- Grossing "Live ... matrix/shared-block support": matrix blocks are not carried through Embedding or Slide Distribution; matrix block comment UI missing; hardware (camera upload, scale, engraver print) is simulated or stub.
- Master Patient Index "Live": inbound A40/A24/A47 manual identity-binding UI not built; no live ADT transport; cross-organisation merge/link unreachable.
- Retention Hold & Disposal "Live": correct, but the separate "Retention policy" setting (admin data) has no purge job.

---

# Theme 2: Synoptic reporting, report output and release


Paths: README paths are relative to /home/claude/work/src unless they start with docs/. "SR" = src/pages/SynopticReportPage. "CCS" = src/components/Config/System.

### Report page: header bar and tabs
- What it does: The report page for a case. Header shows accession (opens by support reference, not accession), patient info with DOB in the user's locale, progress steps, a support-reference chip (click creates/reveals and copies it), status pill, registry opt-out badge, a "N recorded saves" chip (change history), a version chip (Version History), a signature-count chip (Signature History), breadcrumb back to Search or Worklist. Required-fields banner, AI badge (counts Must Have fields only), spelling-language control. Organ-map and synoptic panels are crash-isolated (Try again).
- Workflow: Open a case from Worklist or Search; the page is `/case/:caseId/synoptic`.
- Roles/permissions: case access checks (pediatric, Outreach); individual buttons are capability-gated.
- Settings: Field Requirements (Config > System) govern most modals on the page.
- Status: Built (Demo) - route and components exist; server-backed parts (presence, push) need the API server.
- Sources: SR/README.md, SR/components/HeaderBar.tsx, SR/SynopticReportPage.tsx; docs/product/FEATURE_OVERVIEW.md.

### Report page: sidebar, material tree and side panels
- What it does: Left sidebar: specimen list, case-level actions (Case Comment, Retention Hold, Case Hold), delegation/team/flags entry, "Parts covered" button on draft synoptic workups, LIS-sync badge per specimen, "changes to review" dot when collapsed. Material tree (specimens, blocks, slides, decants, cassette colours, slide printed level, Assign Code). Markers panel (biomarkers grouped by marker, template-driven from `markerGroup`; the AI prompt's biomarker list is still breast-shaped). EMR sidecar drawer, Sequencer panel (navigation with report preview cards), Full Patient Report panel (Preliminary and Intraoperative Diagnosis rows), Dispatch history timeline, internal case-notes drawer, clinical-history bar.
- Workflow: Pathologist works from these panels while answering the synoptic.
- Roles/permissions: none stated.
- Settings: none.
- Status: Built (Demo) - EMR data is from a mock service; dispatch-history and deficiency reads from Firestore readers cannot succeed until the SQL Server API exists (Partial for that timeline).
- Sources: SR/components/Sidebar.tsx, MaterialTreePanel.tsx, MarkersPanel.tsx, EMRSidecarDrawer.tsx, SequencerPanel.tsx, DispatchHistoryTimeline.tsx; services/reports/fullPatientReportRows.ts; components/InternalNotes; components/ClinicalHistory.

### Bottom action bar
- What it does: Previous/Next, Save Draft / Save & Next, Gen. Report, Finalize / Finalize & Next (Assist mode only), Sign Out Case (Orchestration mode), Flags/Codes, Consult, Req. Review (peer review), Print (Assist mode once finalized or pending release), Flag for Tumor Board/MDT, Mark follow-up expected.
- Workflow: Pathologist uses the bar at the foot of the report page; keyboard and voice commands mirror the buttons.
- Roles/permissions: `report:case-report:print`, `case:tumor-board:flag`, `case:follow-up:expect` (button greyed with tooltip without it).
- Settings: release settings (Post-Sign-Out Release Buffer).
- Status: Built (Demo).
- Sources: SR/components/BottomActionBar.tsx; capabilityCatalog.ts.

### Synoptic answering panel (right panel)
- What it does: Main answering panel: required-field validation, AI suggestions with confidence and source quote, template resolution, progress bar, Next unanswered / Next required, "Cannot finalise" list, spell-checked free text. Results grid (partGrid) with one row per part; Mohs stage question; node-count hints (not a count, exceeds limit, below sum); molecular result tag "Result differs" with "Use result"; re-evaluated field prompt "Keep mine / Accept new value"; approving an AI suggestion applies template-embedded SNOMED/ICD codes (inert until licensed CAP/RCPath content). Fields typed or verified by a person are never overwritten by Assist redrafts.
- Workflow: Pathologist answers; AI and molecular results pre-fill; confirm field.
- Roles/permissions: none.
- Settings: Synoptic templates (Config > Synoptic Library).
- Status: Built (Demo) - AI parts need a configured AI provider.
- Sources: SR/components/RightSynopticPanel.tsx; services/assistPolling (assistMilestoneRules.ts); services/molecularOrders.

### Add synoptic, workup parts and protocol change review
- What it does: Add Synoptic modal (two-panel) adds synoptic workups to a case. Workup Parts modal chooses Independent or Combined workup across specimen parts and explains refusals (released workup, part already covered). After the microscopic description AI may re-evaluate the protocol; Protocol Change modal shows a diff with per-change checkboxes and Select all. Grossing-template fit is re-evaluated separately at Gross Complete.
- Workflow: Report page sidebar / Add Synoptic; after microscopic submit.
- Roles/permissions: none stated.
- Settings: protocol templates.
- Status: Built (Demo); the grossing-template evaluation function in mockCaseService was not individually opened (Unverified).
- Sources: SR/modals/AddSynopticModal.tsx, WorkupPartsModal.tsx, ProtocolChangeModal.tsx; services/reports/workupParts.ts.

### Request a new synoptic template
- What it does: Pathologist fills a form asking for a template that does not exist; it goes by in-app message to the admin pool (subject/body in English). When the template is later published the requester gets an in-app message.
- Workflow: Add Synoptic modal or a Home tile.
- Roles/permissions: not stated.
- Settings: none.
- Status: Built (Demo).
- Sources: components/TemplateRequest/TemplateRequestModal.tsx; Config/Protocols README.

### Microscopic description entry
- What it does: Free-text microscopic narrative entered after gross, independent of the grossing checklist (draft, then saved, never "finalized"), per specimen, with spelling control. Critical findings in the typed text are detected and highlighted in the Report Draft and Full Patient Report rows.
- Workflow: Microscopic panel after Gross Complete.
- Roles/permissions: none stated.
- Settings: none.
- Status: Built (Demo).
- Sources: SR/hooks/useMicroscopicEntry.ts; SR/components/MicroscopicEntryPanel.tsx.

### Rich-text narrative editor (Orchestrator section editor)
- What it does: Tiptap editor with toolbar (formatting, tables, alignment, macros), macro hotkeys, shared toolbar across instances, user tab width, formatting-marks toggle, approved fonts. Orchestration mode edits narrative per section; the "QT" button turns selected text into a personal voice macro (owner and performing lab auto-filled; only the spoken trigger is asked).
- Workflow: Pathologist types or dictates into sections.
- Roles/permissions: none (personal macro tier).
- Settings: approved fonts (Config > System > Fonts); tab width (personal).
- Status: Built.
- Sources: components/Editor/README, PathScribeEditor.tsx; SR/components (OrchestratorSectionEditor.tsx).

### AI narrative generation and review
- What it does: Orchestrator builds context from case data ("(not recorded)" for gaps), streams AI text into sections by anchor without overwriting user-edited text, supports single-section regenerate, cancel, accept / keep version / accept all, Regen All one at a time, auto-generate once after 2 s, Suggest Synoptic from Narrative, Generate Narrative with review and insert, AI narrative review modal. Results grid answers become one line per part; hidden questions are omitted. Four configured sections (admin_header, gross_description, synoptic_summary, ancillary_and_diagnosis). Each completion/error is written to the AI audit log; each section is checked against the case jurisdiction's AI vendor policy. Draft stored on the case only.
- Workflow: Orchestration tab buttons or voice/keyboard.
- Roles/permissions: not stated; AI vendor policy can refuse by jurisdiction.
- Settings: Config > AI Behavior (instructions, models, vendor policy, narrative auto-draft on/off org-wide with per-facility override, `config:ai-behavior:manage`).
- Status: Built (Demo) - needs a configured AI provider via the AI proxy. Removed: the AI spelling check (replaced by dictionary spell check).
- Sources: src/orchestrator/; Editor/tiptapBridge; SR/hooks/useReportGeneration.ts, useOrchestratorDraft.ts; Config/NarrativeTemplates README; Config/AI.

### Critical-finding detection and highlighting in the report
- What it does: AI reads gross, microscopic and ancillary narrative (no name/MRN/DOB) and flags critical/abnormal terms with severity and confidence; negation is handled by prompt plus a code check (NegEx-style; "cannot be ruled out" is not negation). Synoptic discrete rules also produce suggestions (case-insensitive exact match per multi-select component; never auto-applied). Only Critical or Malignant opens the sign-out prompt. Flagged findings are highlighted in the narrative editor, kept per case, and disappear when the words go; the saved text is not changed.
- Workflow: Runs when the pathologist attempts e-signature; highlight shown on the report page.
- Roles/permissions: sign-out users.
- Settings: enterprise/facility switch for the AI feature; abnormal trigger rules (Config > System).
- Status: Built (Demo) - AI detection needs a provider.
- Sources: services/clinical/detectCriticalFindings.ts, negatedFindingCheck.ts, findingHighlight.ts, criticalFindingStore.ts; services/abnormalDetection.

### Critical result notification record
- What it does: Pathologist records how a critical finding was communicated (who was notified, method, read-back confirmed, recipient role, decision, surgeon-unavailable reason); append-only, several per case allowed; intraop verbal reports merge into it. Secure-email option opens a pre-filled message (subject with accession, each finding with quote, request to acknowledge) only where a BAA/DPA gateway applies; recorded only once sent; read-back hidden for email.
- Workflow: Critical-findings window at sign-out; or soft-dismiss without recording.
- Roles/permissions: none stated.
- Settings: Field Requirements "Critical findings" (clinician notified, method, notified-by locked per CLIA 42 CFR 493.1291(g); read-back optional); voice "record notification".
- Status: Built (Demo) - email send needs a configured gateway.
- Sources: SR/modals/CriticalFindingsModal.tsx; services/clinical/mockCriticalResultNotificationService.ts, criticalFindingEmail.ts.

### Automated critical alerts (SMS, secure email, EHR push) and reference page
- What it does: Resolves physician contact and channel by severity, dispatches, and keeps a per-case record. SMS/email carry no PHI (generic text plus opaque link); EHR push carries detail. Public page `/critical-alert/:token` shows only accession, physician, link status and time, records access and "Acknowledge Reviewed". Internal Audit Log > Critical Alerts tab joins dispatch to token history. The link's token is an opaque random string made in the browser and is not cryptographically signed; anyone who has the link can open it until it expires (Planned: server-issued, validated tokens, with the physician reaching the finding through their own EHR sign-in). The SMS, e-mail and EHR sends are stubs that only log (demonstration).
- Workflow: Fires at sign-out when the human notification is recorded; physician taps link.
- Roles/permissions: reference page unauthenticated by design; audit tab needs audit access.
- Settings: physician contact and SMS carrier (Config > System > Physicians).
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: SMS gateway, secure e-mail relay and EHR push endpoint; EHR SSO hand-off for the reference link.
- Sources: services/clinical/dispatchCriticalAlerts.ts, alertChannels/*.ts; pages/CriticalAlertReferencePage; clinical/postGaAlertChannels README.

### Clinical-pathologic mismatch check at sign-out
- What it does: Background AI check after the diagnosis is written; above threshold shows "AI suggests possible mismatch" on the report; Review decides in one click (quick reasons optional). Only a Block-rated mismatch stops sign-out until Resolved or Unresolved is recorded (Unresolved recommends corrective action). Re-runs on change, alerting again only if worse. Covers surgical, autopsy (before FAD), cytology (pathologist track, per specimen).
- Workflow: Pathologist at sign-out; QA works deferred cases.
- Roles/permissions: `case:clinical-mismatch:record`.
- Settings: Config > System > Clinical Mismatch Rules; AI instructions.
- Status: Built (Demo) (Batch 609). Amendments, corrections and addenda run the mismatch check; whether a high-risk mismatch holds release is a setting. The browser side is complete; nothing waits on another team.
- Sources: docs/product/CLINICAL_MISMATCH_CHECK.md; components/ClinicalMismatch*; services/cytology/cytologyClinicalMismatch.ts.

### Peer review before sign-out
- What it does: Optional gate (off by default; department, then performing lab, then organisation, inherit/on/off) blocks sign-out of a first-time malignancy until a different active pathologist records an independent read and consensus. Urgent-care override (note) leaves review owed in 24 h. Writes a "Pre-Sign-Out Peer Review" QA record; unresolved disagreement recommends CAPA. Report banner and gate modal share the request/read/consensus/withdraw dialogs.
- Workflow: Signer requests ("Req. Review"); reviewer records read; either records consensus.
- Roles/permissions: `case:peer-review:request`, `:record`, `:override`; `config:peer-review:manage`.
- Settings: Config > System > Peer Review Before Sign-Out (audited PEER_REVIEW_GATE_CHANGED).
- Status: Built (Demo); endpoints Planned.
- Sources: services/quality/peerReviewService.ts; SR/components/PeerReviewBanner.tsx, modals/PeerReviewGateModal.tsx; docs/architecture/AUTHORIZATION_API.md.

### Sign-out sequence and gates
- What it does: In order: pre-analytic date gate, fixative-time hard block, stain QC gate, inking Gate B, clinical-mismatch decision, peer-review gate, stale organ-map image check, Mohs block gaps, invasive-carcinoma margins warning, free-text node-count check, molecular-answer-differs warning, unmatched grid totals warning. Fixative/pre-analytic gates resolve with documented/estimated time or a jurisdiction override with justification. Inking: Severity 3 blocks (override by Admin/Lab Director with reason); Severity 2 advisory; jurisdiction wording by profile. Sign-out modal shows stain types and a coding summary with a non-blocking missing-base-code warning. After sign-out: QA, margin-distance extraction, Tumor Board auto-flag toast.
- Workflow: Sign Out Case (Orchestration) or Finalize (Assist) > gates > signature confirmation.
- Roles/permissions: `case:inking-gate:override`; signing authority below.
- Settings: Field Requirements (Sign-out gates group), jurisdiction rules, peer-review switch.
- Status: Built (Demo); stain-QC gate modal exists but its rules were not read (Unverified rules).
- Sources: SR/hooks/useSignOutWorkflow.ts; services/signoutGates; SR/modals/FixativeTimeGateModal.tsx, PreAnalyticDateGateModal.tsx, InkingGateModal.tsx, StainQcGateModal.tsx, CaseSignOutModal.tsx.

### Sign-out authority, signature confirmation and signature history
- What it does: Who may sign out vs be routed to countersign is decided per case from the performing lab and jurisdiction (lab exception, country profile, platform default) using participation types. Every signed state change needs signer confirmation (password session, SSO identity-provider popup, or biometric device check). Signature History modal lists action, outcome, signer, method, SSO issuer, browser vs server verification. Pre-finalisation modal reviews/reorders specimens and synoptics; all required fields must be complete (no "Deferred" bypass). "Sign Out Case" is hidden and refused while a report is pending release. Finalize synoptic has a lighter confirmation.
- Workflow: Sign Out Case > confirm identity > signature recorded.
- Roles/permissions: `canFinalizeCase` via participation types; `config:session-security:manage` for biometric policy.
- Settings: Config > System > Participation Types ("can finalise", "requires countersign"; per-lab overrides with justification); Session security > biometric policy (off/every sign-out/once per session/every N days).
- Status: Built (Demo) - biometric is simulated in the browser (device-based demo).
- Sources: SR/hooks/useSignOutWorkflow.ts, useSignerConfirmation.ts; SR/modals/PreFinalisationModal.tsx, SignatureHistoryModal.tsx; CCS/ParticipationTypesSection.tsx; Profile BiometricSigningModal.tsx.

### Countersign and Return to Trainee
- What it does: A signer is routed to countersign (not final sign-out) if a resident participant, a participation type flagged Requires Countersign, an active FPPE proctorship, or a first-year CLIA-competency cytotechnologist. Attending can Return to Trainee with required feedback: countersign record becomes returned, case status "returned", ownership back to the resident, who sees a banner. Cytology has per-specimen pending countersign.
- Workflow: Resident submits; attending countersigns or returns on the sign-out modal.
- Roles/permissions: participation type `requiresCountersign`; attending participant.
- Settings: Participation Types.
- Status: Built (Demo) (Batch 608). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: services/cases (mockCountersignService.ts, resolveResidentCountersignRequired.ts); SR/components/RevisionFeedbackBanner.tsx.

### Amendment, correction and addendum
- What it does: Amendment modal with reason dictionary (type: major amendment, minor amendment, addendum); draft Amendment Summary Box with live Changed Items; N-column version matrix per synoptic; minor amendment needs Clinical Notification Log; addendum needs an explanation; per-pathologist draft lifecycle (open-draft worklist); field-override lineage; two-stage unlock/release; protocol-change review; LIS amendment notice pending review. Corrected re-sign-out is labelled Final (Corrected/Amended) and goes out as CORRECTED (with "previously reported as") or ADDENDUM. Clinically significant amendment/correction recommends CAPA (not addenda).
- Workflow: Pathologist opens the modal from a signed case; releasing passes the release delay.
- Roles/permissions: sign-out authority; voice "save amendment".
- Settings: Config > System > Revision Reasons (`config:revision-reasons:manage`, "clinically significant" switch); Field Requirements "Amendments and addenda".
- Status: Built (Demo).
- Sources: SR/modals/AmendmentModal.tsx, AmendmentDraftBanner.tsx, hooks/useAmendmentWorkflow.ts; services/reports/mockAmendmentService.ts, publishReleasedRevision.ts.

### Amended and addenda triage tile and worklist grouping
- What it does: Worklist tile shows inbound LIS amendment notices awaiting review plus open amendment/addendum drafts; amended-case filter groups Amendment and Correction first, then Addenda. Quality tab lists amended and discordant cases.
- Workflow: Worklist tile; Contribution > Quality.
- Roles/permissions: not stated.
- Settings: none.
- Status: Built (Demo).
- Sources: pages/WorklistPage AmendedAddendaTriageTile.tsx, amendmentGrouping.ts; Contribution qualityCalculations.ts.

### Report revision status and banner
- What it does: Printed/previewed/PDF reports carry a revision banner (AMENDED REPORT / REPORT WITH ADDENDUM / CORRECTED REPORT) with original sign-out date (Case.finalizedAt, never rewritten) and latest revision date; drafts excluded; footer flag repeats.
- Workflow: Automatic on print/preview/PDF.
- Roles/permissions: none.
- Settings: none.
- Status: Built - verified in functions/main.py (Batch 498 revision banner, footer reference).
- Sources: services/reports/resolveReportRevisionStatus.ts, buildReportRenderRevision.ts; hooks useReportRevisionStatus; functions/main.py.

### Report versions and Version History
- What it does: Every sign-out or amendment creates an immutable version (PDF, patient/encounter snapshot as at that moment, organ-map figures with hashes, PDF SHA-256); never blocks sign-out. Version History modal (header chip) opens historical signed PDFs and lists Released documents. With an API server, server versions are merged in and PDFs hash-checked.
- Workflow: Header chip > Version History.
- Roles/permissions: `report:case-report:print` for opening PDFs.
- Settings: none.
- Status: Built (Demo). Version History modal, immutable versions with hashes and mock/http services are built; only server version endpoints are missing.
- Sources: SR/modals/VersionHistoryModal.tsx; services/reports (mockReportVersionService.ts, httpReportVersionService.ts).

### Released report documents ("View as sent")
- What it does: A released report is rendered once, stored with SHA-256 (no update/delete); every read rechecks the hash; every channel (result message, print, fax, file drop, Assist, fallbacks, retries) sends the stored bytes; an unreadable document is held, never replaced. Version History > Released documents lists type, time, method, short hash; "View as sent" opens the bytes (audited).
- Workflow: Automatic at release; view in Version History.
- Roles/permissions: `report:case-report:print`.
- Settings: none.
- Status: Built (Demo) - browser store `report_documents`; server store and endpoints Planned. Some old entries and per-specimen cytology messages have no document id.
- Sources: services/reportDocuments (httpReportDocumentService.ts); docs/architecture/REPORT_DOCUMENT_STORE_API.md.

### Report change log (change history)
- What it does: One entry per case save: user, time, workstation, every changed field old to new (synoptic answers, narrative, codes, specimens, blocks, case details); long text as word diff; edits made and undone leave no trace; append-only. Modal has area filter and PHI tags. CSV export is audited and neutralises cells starting `= + - @`.
- Workflow: Header chip > Change history; admin/QA export.
- Roles/permissions: anyone who can open the case reads; export `report:change-history:export` (Admin, QA Reviewer).
- Settings: none.
- Status: Built (Demo); server same-transaction append-only table Planned. Limits: demo attributes background writes to the signed-in user; non-synoptic fields show stored keys.
- Sources: services/reportChangeLog; SR/modals/ChangeHistoryModal.tsx; docs/architecture/REPORT_CHANGE_LOG_API.md.

### Release delay (buffer), countdown and recall
- What it does: Every report output (final, preliminary, correction, addendum, autopsy PAD/FAD, all cytology outputs) waits out the lab's delay; STAT bypass is configurable; resends after failure are not delayed. Pending-release: status pill with MM:SS, banner, tiled on-screen watermark, print confirmation naming the watermark, PDF diagonal watermark. Only the person who released may recall; recall reopens without sending (preliminary attestation cleared, corrections/addenda back to draft, autopsy PAD/FAD withdrawn, early finalization undone) and is not undone for CAPA recommendation, countersign, signature. Held Reports banner lists waiting items. "Queued for Release" worklist tile (own cases).
- Workflow: Sign out > delay > auto release; releaser clicks Recall in banner.
- Roles/permissions: releaser only; `config:release-buffer:manage` for the org default.
- Settings: Config > System > Post-Sign-Out Release Buffer (org default); facility override (enabled, duration, STAT bypass) in Facility editor; watermark text and "restrict hardcopy printing" (enterprise).
- Status: Built (Demo) - a browser sweep (about 15 s) releases while the app is open; server job `release.dueSweep` Planned. Frozen-section bypass not built. Conflict resolved: one README says Partial, newer READMEs and code (reportRelease service, hooks) are Live Demo.
- Sources: services/reportRelease (releaseReport.ts, heldReleaseRules.ts: "only the person who released it"); hooks/useReleaseBackgroundWork.ts; components/ReportRelease/HeldReportsBanner.tsx; SR/components/ReleaseBufferBanner.tsx; docs/product/REPORT_RELEASE_DELAY.md.

### No correction or addendum during the delay
- What it does: While a report is held or pending release a correction or addendum is refused with a message (surgical, Assist, cytology); recall instead. A held revision or preliminary does not count as "in delay". Released PDFs never carry the buffer watermark; a print during the delay still does.
- Workflow: Pathologist attempts a revision, is told to recall.
- Roles/permissions: all.
- Settings: none.
- Status: Built.
- Sources: services/reportRelease/revisionDuringDelay.ts (+test).

### Release as Preliminary
- What it does: Manual action releasing a preliminary surgical report; refused on non-orchestration and already-final cases; writes a Preliminary Reviewer Attestation; never changes case status; several allowed; passes the delay and is recallable (recall clears the attestation). Preliminary result message includes `preliminaryImpression`. Not shown for closed cases or LIS Assist cases.
- Workflow: Pathologist clicks Release as Preliminary on the report page.
- Roles/permissions: not stated.
- Settings: release delay.
- Status: Built (Demo).
- Sources: services/reports/releasePreliminaryReport.ts (+test).

### Report release event and delivery decision
- What it does: One publish point for every release (PRELIMINARY, FINAL, CORRECTED, ADDENDUM; surgical, cytology, autopsy). Resolves the delivery decision first (electronic, print, e-fax, file drop, dual), runs primary/secondary channels at once, fallback only when a primary fails or has nowhere to go, schedules retries, stores the PDF once before any channel runs. A failure resolving the decision falls back to ELECTRONIC_ONLY.
- Workflow: Automatic at release.
- Roles/permissions: none.
- Settings: delivery rules, print routing.
- Status: Built (Demo).
- Sources: services/reports/publishReportReleasedEvent.ts; services/delivery/deliverReport.ts, deliveryPlan.ts.

### Delivery rules (channels and recipients)
- What it does: Rules match up to four criteria (provider, ordering facility, point of care, report type; unset = wildcard); action ELECTRONIC_ONLY, PRINT_ONLY, DUAL or SUPPRESS (still logs); most specific wins, default electronic. Channel plan sets electronic/print/e-fax/file drop each as primary, secondary, fallback or off; fax number from rule, else ordering physician, else facility; file-drop target; validation (fallback needs a primary; file drop needs a target; fax must be a number). Test panel.
- Workflow: Admin builds rules and tests; engine runs at every release.
- Roles/permissions: `config:delivery-rules:manage`.
- Settings: Config > System > Delivery Rules; retry waits on the same screen.
- Status: Built (Demo) for rules, plans and test panel; transports need the server.
- Sources: CCS/DeliveryRulesSection.tsx; services/delivery; docs/architecture/REPORT_DELIVERY_API.md.

### E-fax and file-drop delivery
- What it does: E-fax goes by email-to-fax gateway (SMTP); file drop writes `<name>.pdf` and `.json` to a named folder or SFTP target atomically (.part then rename), never overwriting, SFTP host key checked; PDF max 20 MB; provider transmission report confirms or fails a fax; record keeps size and SHA-256.
- Workflow: Automatic as a REPORT_DELIVERY transaction; failures resent from Audit Log > Interfaces > Outbound.
- Roles/permissions: `interface:outbound:resend`.
- Settings: server settings FAX_SMTP_*, FAX_FROM_ADDRESS, FAX_TO_PATTERN, FILE_DROP_TARGETS.
- Status: Built (Demo). Browser rules, queue, REPORT_DELIVERY dispatch, retry and dead-letter view are built; dev receiver and tests exist. Real fax gateway, SFTP target and production receiver are server work.
- Sources: functions/report_delivery.py, test_report_delivery.py; docs/architecture/REPORT_DELIVERY_API.md.

### Delivery retries, dead-letter and delivery exceptions
- What it does: Failed print, fax or file drop retries after waits (default 1, 5, 15 min; up to 10 waits of 1-1,440 min). After the last retry: "retries exhausted", listed in the Delivery exception queue, Admin and Lab Director messaged, primary's fallback sends once. Non-retriable failure (browser network print) dead-letters at once. A manual resend counts as delivered; a changed or missing stored document fails permanently.
- Workflow: Automatic; admin works Audit Log > Interfaces > Outbound (Delivery exceptions panel on top; Retry Dispatch, Dispatch Now, Simulate Failure, Capture as CAPA).
- Roles/permissions: waits `config:delivery-rules:manage`; resend `interface:outbound:resend`.
- Settings: Delivery Rules > Retries.
- Status: Built (Demo) - sweep every 30 s only while a browser session is open; server scheduled sweep Planned.
- Sources: services/delivery/deliveryRetries.ts, deliveryRetryPolicy.ts; hooks/useDeliveryBackgroundWork.ts; pages/DeliveryExceptionsPanel.tsx, OutboundInterfaceDlqSection.tsx.

### Outbound result message (ORU^R01) and structured synoptic result
- What it does: At release one JSON result per finalized instance is dispatched with the report PDF (held and retried if PDF or workup version unknown); type FINAL, CORRECTED (with "previously reported as") or ADDENDUM; carries diagnosis comment, severity, hash `reportPdfSha256`, autopsy PAD/FAD. Assist cases send a versioned v1.0.0 synoptic result (`PSR-{caseId}-{instanceId}`; codes, staging pT/pN/pM/FIGO, observations, suggested CPT without modifiers) with PDF and text block on finalize/correction/addendum, optional one combined PDF per case. PathScribe sends JSON; the interface engine builds HL7.
- Workflow: Automatic; failures in the outbound/DLQ view.
- Roles/permissions: none.
- Settings: interface endpoint; Facility Dictionary > LIS Integration > "Send one combined PDF per case" (`consolidateOutboundPdfs`).
- Status: Built (Demo) - actual sending through server/engine Planned; `reportNarrativeText` is still undefined in practice (no caller supplies it).
- Sources: services/reports (buildOruR01Payload.ts, prepareOruR01Dispatch.ts, synopticResultPayload.ts, dispatchAssistSynopticResult.ts); docs/architecture/SYNOPTIC_RESULT_API.md.

### Outbound message preview
- What it does: Builds example outbound JSON for ADT^A08/A40/A47 and ORU^R01 and DFT charge messages, downloadable; the ORU preview is exactly what a release sends, including PDF (a result without PDF is shown as held).
- Workflow: Admin picks type and case/patient id.
- Roles/permissions: `config:interface-preview:view`.
- Settings: Config > System > Outbound Interface Message Preview / DFT Export Preview.
- Status: Built (Demo); DFT builder has no transport (Partial).
- Sources: CCS/OutboundMessagePreviewSection.tsx, DftExportPreviewSection.tsx; services/hl7/dftBuilder.ts.

### Report printing, preview and print audit
- What it does: Print checks `report:case-report:print`; restricted (VIP) cases additionally need `report:restricted-case:print` (any case flag can be marked "Restricts printing"). Before print: reprint-reason prompt if the lab requires one and a warning about the Pending Release watermark. Preview uses the release payload builder, differing only by the PRELIMINARY - SUBJECT TO CHANGE watermark. Every print, reprint, preview print, stored-PDF open and export is audited (DOCUMENT_PRINTED, REPRINTED, PREVIEW_PRINTED, FAXED, EXPORTED). Without `VITE_REPORT_PDF_ENDPOINT` (https in production) print falls back to screen print. Assist-mode Print opens the CoPilot report view (revision line in header). The detachable `/report-preview/:caseId` window is retired.
- Workflow: Print button on the bottom bar, preview, version history.
- Roles/permissions: as above; `print:job:*` for queue actions.
- Settings: Config > System > Print Settings ("Ask for a reason when a report is reprinted"; facility override), Case Flags.
- Status: Built (Demo) - needs the report renderer; server enforcement of print permission (PS-358) Planned.
- Sources: services/printing (reportPrintGate.ts, documentOutputAudit.ts); SR/modals/ReportPrintPromptModal.tsx, CopilotReportViewModal.tsx; pages/ReportPreview.

### Report PDF renderer and PDF content rules
- What it does: `render_report` (Python, functions/main.py) makes surgical and autopsy report PDFs/text in the report's language: sections, synoptic answers (long answers wrap), organ-map figures after the body, boxed pre-analytic disclaimer, diagonal watermark (during release buffer only), amber revision banner, Code 128 accession barcode with document reference and record version on every page, Korean in Pretendard. Workup (Assist) PDFs show parts, protocol, status, signer, "Changed in this version"; several workups can share one PDF.
- Workflow: Browser posts the request; preview and release share one payload.
- Roles/permissions: none.
- Settings: `VITE_REPORT_PDF_ENDPOINT`; report language per lab.
- Status: Built (Demo) (Batch 609). The Report PDF function reads page size, document style and header and footer parts, with Python tests; the functions folder must be redeployed. Waiting on the server side: production renderer (Playwright/headless Chromium) in the API server; PDF/A and deterministic output (PS-333).
- Sources: functions/main.py, functions/README.md; services/reports/reportRenderer.ts, workupPdf.ts.

### Document style and page setup
- What it does: Lab default report font (Arial), page size and margins (5-50 mm; unknown size falls back to A4) and default header/body/footer text styles; the template preview opens at that page size. Font sizes are in points, the printed size (8 pt minimum; defaults body 10, header 11 bold, footer 10), with the printed size shown. Styles saved in pixels (before Batch 612) print as before until an author presses Convert to points (lab styles and per template), which lists each change and is audited. A points template previews at the paper's width and side margins.
- Workflow: Admin saves in Document Style.
- Roles/permissions: `config:report-appearance:manage`.
- Settings: Config > System > Document Style.
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Renderer (functions/main.py, cytology_report.py) must honour page size and margins.
- Sources: CCS/DocumentStyleSection.tsx; services/reportAppearance/pageSetup.ts, fontUnits.ts, convertToPoints.ts, previewPage.ts; Common/FontSizeField.tsx, ConvertToPointsPanel.tsx; functions/report_layout.py.

### Report language, date format and letterhead branding
- What it does: Report written in the performing lab's language (`Facility.reportLanguage`, else jurisdiction default: Dutch, German, French, Korean, Belgian Dutch, English) with dates in the lab's jurisdiction format; stamped at sign-out. Header logo, director name and CLIA number resolve Facility, then Department, then Enterprise; director/CLIA fields only for Performing Lab facilities and withheld on technical-component-only billing reports.
- Workflow: Automatic at generation; admin sets fields in Facility editor.
- Roles/permissions: `config:facilities:manage`.
- Settings: Facility Dictionary (report language, logo https link, director, CLIA/ISO).
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Deploy the report renderer for the PDF layout steps.
- Sources: services/reports/reportLanguage.ts; services/facilities/resolveFacilityPrintBranding.ts.

### Report template builder (templates, parts, routing)
- What it does: Report layout builder: Report Parts (headers, footers, body blocks; 14 protected built-in standard parts, six Preliminary body parts) assembled in order into a Report Template on a shared canvas (18 node types, palette, inspector, drag-to-reorder, page-zone validation) with Word-style paginated preview at the lab's page size. Parts can be tied to a performing lab. "Use Standard Template" copies a default. Clone needs a name.
- Workflow: Config > Report Templates > Templates / Parts / Routing; author edits, approver publishes.
- Roles/permissions: `config:report-template:manage` (edit), `config:report-template:publish`; view-only otherwise.
- Settings: as listed.
- Status: Built (Demo).
- Sources: components/TemplateBuilder (TemplateAssemblyPage.tsx, PartBuilderPage.tsx); services/reportTemplates, reportParts.

### Report template routing
- What it does: Chooses a report template by pass: -1 preliminary gate, 0 client override, 0a Enterprise parent rule (one hop), 0b physician preference, then synoptic protocol, subspecialty, Gold Standard fallback. Facility beats Enterprise; archived protocols not offered for new rules. Test panel. Separate admin rules (`config:template-routing:manage`) can override Pass 0-3.
- Workflow: Report Templates > Routing; applies when a case report opens.
- Roles/permissions: `config:report-template:manage`; `config:template-routing:manage`.
- Settings: Routing Rules tab.
- Status: Built (Demo).
- Sources: services/reportTemplates/TemplateRoutingService.ts; services/routingRules; RoutingRulesTab.tsx.

### Declared Final Diagnosis field
- What it does: Template author marks one field as the Final Diagnosis; its concatenated value feeds the ORU diagnosis comment and "previously reported as" on corrected dispatches. Validator allows at most one, Final templates only.
- Workflow: Template Inspector toggle.
- Roles/permissions: template authors.
- Settings: Inspector toggle.
- Status: Built (Demo) (Batch 609). Publishing a Final template with more than one Final Diagnosis field is refused and the builder shows why. Nothing waits on another team.
- Sources: services/reportTemplates/resolveFinalDiagnosisText.ts, validateFinalDiagnosisDesignation.ts.

### Synoptic Library (templates and lifecycle)
- What it does: Lists templates by lifecycle (Active = published, Review Queue, All with Archived filter; status/group filters). 31 seeded JSON templates: 22 surgical (breast, colorectal, kidney, lung, Mohs, neck dissection, oral cavity, prostate, melanoma, Wilms), 5 cytology, 3 grossing, 1 autopsy; US CAP and UK RCPath live together. About 1,500 "Field N"/"Option N" placeholder labels remain on 19 templates pending a CAP/RCPath licence (-generic suffix). Row actions: Duplicate, New Version (published only; bumps minor, publish archives old), Export JSON (audited), Archive/Restore (restore needs re-review). Upload Protocol modal exists.
- Workflow: Config > Synoptic Library > Build / Customise.
- Roles/permissions: `config:protocol:draft`, `:approve`, `:publish`, `:retire`; read-only otherwise.
- Settings: lifecycle overrides in lab settings.
- Status: Built (Demo) (Batch 609). Every template lifecycle step writes an Audit Log entry; Upload Protocol shows a format result labelled unverified against CAP/RCPath. Waiting on others: CAP/RCPath licence for about 1,500 placeholder field labels, and sample files to import CAP eCC XML and Excel.
- Sources: components/Config/Protocols; data/templates (README, generic/README); services/templates/protocolLifecycle.ts.

### Synoptic template editor
- What it does: Add/reorder/delete sections and fields (dropdown, radio, checkboxes, numeric, text, longtext; built-in partGrid and spatialStageCanvas). Required flag, helper text, answers, metadata (unique name, source CAP/RCPath/ICCR/RCPA/Custom, category, version). Visibility OR/NOT, "unless" conditions, numeric rules (decimal/whole, "can't exceed" another question, grid column totals via sumOf with checked hand-entered total, free-text node counts with ceilings and "cannot be determined"). SNOMED CT/ICD-10/11 coding per field and answer, coverage panel, terminology deprecation alerts. Readiness checklist (name, category, a section and field, SNOMED coverage 80%+), Preview, cytology narrative sentence/tier per question, autopsy grossing organ-driven sections. Final Diagnosis toggle.
- Workflow: Editor > Save Draft > Submit for Review; new at `/template-editor/new`.
- Roles/permissions: `config:protocol:draft` (Template Author; Admin inherits); others get a read-only editor.
- Settings: none.
- Status: Built (Demo). Conflict resolved: README says sumOf has no editor control; code now has grid-total options in SynopticEditor.tsx (lines ~569-577), so Built.
- Sources: components/Config/Protocols/SynopticEditor.tsx; services/templates/templateCountRules.ts; Protocols README.

### Template review, governance and lifecycle e-mails
- What it does: Reviewer screen shows the form as pathologists see it, trial answers (go into no case), per-field comments (add/resolve, audited), lifecycle bar (Needs Changes with reason, Approve, Publish, Reset to Draft clearing approvals), labels follow source (CAP Accept/Release, RCPath Ratify/Publish), "how to review" guide. Rules: approver role, no self-approval unless allowed, required reviewers 1-3, SNOMED coverage 80%+; any save clears approvals. Publishing notifies a requesting pathologist in-app. Built-in roles Template Author, Template Approver, Lab Director (renameable). E-mails: browser posts only the event; server picks recipients.
- Workflow: Author submits; reviewers approve; approver publishes.
- Roles/permissions: protocol capabilities above; `config:template-governance:manage`.
- Settings: Config > System > Template Review (Allow Template Self-Approval default off; Required Reviewers default 1).
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Server picks recipients and sends template lifecycle e-mails; comments saved with the template version (PS-345).
- Sources: services/templates (templatePublishingRules.ts, templateReviewWork.ts); services/communications/notificationService.ts; docs/architecture/TEMPLATE_NOTIFICATIONS_API.md.

### Protocol dictionary (processing protocols)
- What it does: Standalone protocols (e.g. Standard Small Biopsy: 1 block, 1 H&E) with stain multiselect; pathway defaults (block/decant count, piece count, allowed additional stains, outbound molecular order flag); names unique per (performing lab, name) with optional lab scope; spreadsheet import/export treats rows as global; history and restore; Duplicate drops history. Specimen locks a protocol snapshot at accession; triage checklist gates grossing block release.
- Workflow: Admin in Config > Protocols; Grossing uses defaults.
- Roles/permissions: `config:processing-protocols:manage`.
- Settings: Config > System > Protocols.
- Status: Built (Demo).
- Sources: services/protocols; CCS/ProtocolDictionarySection.tsx; docs sources svc2/misc2 inventories.

### Anatomical organ maps in the report
- What it does: Collapsible Map panel above the synoptic drawn from synoptic answers each time (nothing stored): prostate (41 PI-RADS sectors), breast (clock face, foci, margins), colorectal polyp/rectum, oral cavity and 20-level neck dissection, renal, Mohs stages. Click a sector jumps to the question; open state remembered per user. "Insert into report" stores a snapshot (SVG+PNG, report language, SHA-256); if answers change it is "out of date" and blocks sign-out until reinserted or removed; locked after sign-out except by amendment; Mohs maps are always in the report. Derived margin answers are locked; sign-out stops on a Mohs positive sector lacking a block and warns for invasive carcinoma with margins unreported.
- Workflow: Press Map > insert.
- Roles/permissions: `report:organ-map:insert` (Pathologist, Fellow, Resident).
- Settings: see organ-map configuration.
- Status: Built (Demo); server enforcement of Mohs block rule and node-count checks Planned.
- Sources: services/organMapping; components/OrganMap; SR/hooks/useOrganMap.ts; docs/architecture ORGAN_MAPPING_API.md.

### Organ map configuration
- What it does: Colours and patterns by level (enterprise, jurisdiction, facility; every colour keeps a pattern) and thresholds (breast close margin default 2 mm, range 0.1-10; polyp and rectal involved margin; oral involved/close; renal) with conflict warnings; map bindings per template for lab-authored templates (PathScribe's own prostate/breast templates self-bind). Unsaved changes prompt "Discard changes?".
- Workflow: Admin in Organ Maps (Colours & patterns / Map bindings).
- Roles/permissions: `config:organ-map-scheme:manage` (Admin, Lab Director), `config:organ-map-bindings:manage`.
- Settings: Config > System > Organ Maps.
- Status: Built (Demo).
- Sources: CCS/OrganMapsSection.tsx; services/organMapping/organMapBindings.ts.

### Mohs micrographic surgery template and node-count/grid checks
- What it does: PathScribe-authored Mohs synoptic (site, tumour type, stages on spatial canvas, defect, closure, billing reference); sign-out stops on a missing or uncut block. Grid rows over limit flagged; grid-derived totals read-only; node counts whole numbers >= 0; free-text node counts (seven templates) checked at draft save and sign-out; molecular results fill EGFR/BRAF/KRAS/NRAS/MSI/HER2 with source recorded and delta tag.
- Workflow: Mohs case reporting; synoptic panel.
- Roles/permissions: none.
- Settings: copy and change in library; `molecularResult` binding.
- Status: Built (Demo); server-side enforcement Planned. Guide docs/product/MOHS_GUIDE.md.
- Sources: data/templates/generic (mohs_micrographic_surgery.json); SR/README Batches 463-467.

### Cytology report (sign-out, case report, preliminary, PDF)
- What it does: Cytology Workspace sign-out sequence (gate, signature, authority, countersign, 5-year lookback, QC rules, correlation, release event, registry). One consolidated case report per accession once all specimens close or the case is finalized early (reason; unsigned listed "not reported"); urgent preliminary per specimen (reason click, optional note) marked PRELIMINARY, not sent to registries; correction (CORRECTED REPORT banner, mandatory reason, CAPA recommended) and addendum (own page by policy) create new linked records; Non-GYN uses published Synoptic Library protocols with narrative compile; seven-section GYN content. All PDFs from the server renderer (template "cytology": A4, 15 mm margins, embedded Liberation Sans/Pretendard, accession barcode, "Page X of Y"); a PDF lacking the cytology marker holds the release.
- Workflow: Cytology Workspace (`/cytology-worklist/:caseId`).
- Roles/permissions: `cytology:report:sign-out`, `cytology:ct-report:sign-out`, `:report:correct`, `:report:addend`, `:case:finalize`, `:preliminary:release` (none by default), `:revision:request`.
- Settings: Config > Cytology (e-signature for preliminary, CLIA workload cap, lookback), facility print policy.
- Status: Built (Demo) - needs the `functions/` renderer redeployed; embedded images not drawn. Conflict resolved: older README (jsPDF generator, worker) is superseded - src/services/cytology/generateCytologyReportPdf.ts is absent (verified; only the Snapshot adapter remains).
- Sources: services/cytology (signOutCytologyCase.ts, releaseCytologyCorrection.ts, cytologyCaseReportForPrint.ts, renderCytologyPdf.ts); functions/cytology_report.py; CW/README.md.

### Autopsy report sign-out (PAD/FAD) and body release
- What it does: Preliminary (PAD) and final (FAD) signing; PAD never changes case status; residents route to countersign; forensic cases need jurisdictional appointment; held through the release delay and recallable (PAD not after FAD). PAD publishes PRELIMINARY, FAD FINAL release events. Body release form needs signed PAD and no ancillary hold; who received/released required.
- Workflow: Report page Sign PAD / Sign FAD; Ready for Body Release banner.
- Roles/permissions: signing authority, credential FORENSIC_AUTOPSY_SIGNOUT, `autopsy:body:release`.
- Settings: Field Requirements (Autopsy forms), staff credentials.
- Status: Built (Demo); release-event payload covered by unit tests only; sub-national appointments Planned.
- Sources: services/autopsy (signAutopsyReport.ts, releaseAutopsyBody.ts); SR/components autopsy sections.

### Comments and notes on the report
- What it does: Case-level comment thread (append-only) and specimen/report comment with rich text editor; HTML sanitised; Post disabled for empty drafts; origin badge shows sync status; dialog position remembered (`cmnt-modal-pos`). Internal case-notes drawer with coloured note types.
- Workflow: Sidebar > Case Comment, or specimen comment on the report page > Post Comment (voice "post comment").
- Roles/permissions: none stated.
- Settings: Field Requirements (comment text locked).
- Status: Built (Demo).
- Sources: pages/Synoptic/Comments (CaseCommentModal.tsx, ReportCommentModal.tsx); components/InternalNotes.

### Text macros (report) and voice macros
- What it does: Typed shortcut macros in tiers Enterprise, Facility, Personal (user sees the union); admins see an All tab and alone create Enterprise macros; import from Word AutoText/Building Blocks (.dotx/.dotm/.docx; preview, pick tier, auto `;` shortcuts, plain text only). Voice macros substitute spoken phrases during dictation; QT button creates one from selected text.
- Workflow: Config > Macros; Config > Voice > Speech Processing Rules.
- Roles/permissions: `config:macros:manage` for shared or others' macros.
- Settings: Macro panel font list is hard-coded (Arial, Times New Roman, Courier New, Roboto) and does not read the Fonts section (drift).
- Status: Built (Demo).
- Sources: services/macros, voicemacro; Config/Macros MacroPanel.tsx.

### Spell check in report text
- What it does: Hunspell in a Web Worker after a 300 ms pause; tiers personal, facility, regional (UK vs US), jurisdiction, clinical vocabulary, base; codes/acronyms skipped. Red squiggle = misspelling, blue = other English convention. Right-click: suggestions, Ignore this session, Add to my dictionary, Add to facility dictionary. Language: case choice, assigned pathologist's Staff spelling language, ordering facility default. Languages: en-US/GB/AU/CA, French, Dutch, Korean, German. Active in report editor, synoptic text boxes, cytology screening notes/ROSE, intraop forms.
- Workflow: Automatic; Spelling language control in report header.
- Roles/permissions: facility dictionary `config:facilities:manage` (audited); personal words removable by owner.
- Settings: Staff > Spelling language; Facility editor > Spelling tab; `npm run spellcheck:build` for licensed vocabularies.
- Status: Built (Demo). Hunspell worker, tiers, menu and dictionaries work in the browser. Open items are licensed SNOMED/LOINC data, native-speaker review and the GPL source-offer address (a data file).
- Sources: services/spellcheck; components/SpellCheck; spellcheck-data/README.md; public/spellcheck.

### External consult links and consultant opinion
- What it does: Staff issue time-limited links (default 24 h, 72 h across a weekend; scope Full Case or specific slides; 256-bit token, SHA-256 stored, in `#`, removed from address bar, no-referrer); revocable; one signed opinion per link; uniform refusal for unknown/expired/revoked. Pathologist rates the signed opinion (agrees / minor / major discordance, note) which writes an "Outside Consult Correlation" QA record; major discordance on a released report recommends CAPA. Clinical history is deliberately not shown (Planned). Audit Log > Consult links lists all links with Revoke.
- Workflow: Consult button > issue; consultant opens `/consult`.
- Roles/permissions: `case:consult-link:issue`, `:revoke`, `case:outside-consult:assess`, `audit:consult-links:view`.
- Settings: default lifespan.
- Status: Built (Demo). Issue, view, opinion, rating and audit all work on the mock token service; banner already says link opens only in the issuing browser. Real tokens, media proxy and identity check are server.
- Sources: services/consultAccess; components/ExternalConsult; pages/ExternalConsultViewPage; docs/architecture CONSULT_ACCESS_API.md.

### Billing on the report page after sign-out
- What it does: Billing review panel (pending/applied codes, confirm/override/dismiss, manual add; decants included). After sign-out any billing change asks a reason (reason dictionary) and comment; "Correct code" credits the original and bills the corrected code (must differ); charges wait PENDING_APPROVAL when the lab requires approval. QA > Financials dialog finds cases by id or accession. Deleting a block-level applied code after sign-out still credits without asking a reason.
- Workflow: Billing tab; Correct code modal (voice "correct billing code").
- Roles/permissions: `billing:applied-code:review`, `billing:applied-code:correct`, `billing:charge:approve`.
- Settings: reason dictionary category; billing approval; Field Requirements.
- Status: Built (Demo) with the stated gap.
- Sources: services/billing (billingCorrection.ts, postSignoutBillingReason.ts); Billing components.

### Edit conflict, merge review and presence
- What it does: Versioned saves; stale save first tries field-by-field merge ("Someone else changed this case": Save mine with theirs / Not yet); Edit Conflict dialog only when the same field changed (Keep working, View changes, Use their version, Save mine anyway); sign-out/finalize/amendment never offer Save mine anyway. "Someone else saved this case" banner (Reload / Show their changes / Later). Presence strip shows who has the case open.
- Workflow: Automatic on save.
- Roles/permissions: `case:edit-conflict:override` (Pathologist, Admin, Lab Director).
- Settings: Role Dictionary.
- Status: Built (Demo) - conflict and merge work in the browser; live push and presence across users need the SignalR server (Partial).
- Sources: services/cases/caseWrite.ts; SR/components/MergeReviewDialog.tsx, CaseUpdatedBanner.tsx, CasePresenceStrip.tsx.

### Print routing, print queue and site agents (report printing)
- What it does: Print routing rules pick a printer by tier (workstation, location, client account, facility), specimen/case type and trigger; protocols RAW 9100, LPR, IPP; Test panel. Print Queue lists jobs with Hold, Release, Retry, Redirect, Cancel and bulk actions; "Sent to printer" for Raw/LPR vs Printed for IPP. Presentation by report type (FINAL/CORRECTED tray 1 letterhead duplex; ADDENDUM tray 1 simplex; PRELIMINARY tray 2 simplex). Facility Printing tab sets mode (QZ Tray, interface engine, direct network), paper size, default printer. A report prints only at its performing lab; a network print from the browser fails at once with NEEDS_SITE_AGENT. Batch print aggregation is manual only.
- Workflow: Admin configures; releases print automatically; Audit Log > Interfaces > Print Queue.
- Roles/permissions: `config:print-routing:manage`, `config:print-settings:manage`, `print:job:hold|cancel|redirect|retry`.
- Settings: System > Print Routing Rules, Print Settings, Printer Profiles, Site agents; Facility > Printing.
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Site agent and API server sending; real-hardware tests of RAW/LPR/IPP.
- Sources: services/printing, printRouting, siteAgent; CCS/PrintRoutingRuleSection.tsx, SiteAgentsSection.tsx; pages/PrintQueueDashboardSection.tsx.

### Follow-up, tumor board and QA bars on the report page
- What it does: "Mark follow-up expected" after sign-out (becomes "due <date>" from the biopsy-to-resection window); Flag for Tumor Board/MDT modal; Surgical QA bar with Record Review / Not Relevant; Discordance reconciliation (frozen vs permanent); Signature, Deficiency and Management-review views.
- Workflow: Report page bar and modals.
- Roles/permissions: `case:follow-up:expect`, `case:tumor-board:flag`, `surgical:qa-review:record`.
- Settings: facility window; QA configuration.
- Status: Built (Demo).
- Sources: services/followUp; SR/components/SurgicalQaCaseBar.tsx; SR/modals/DiscordanceReconciliationModal.tsx.

### Image embedding in report PDFs
- What it does: pdf-lib embed of image associations (PNG/JPEG, below-300-DPI warnings).
- Workflow: none currently.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built (Demo) (Batch 609). Images are attached as links (no image bytes are stored) and are fetched and drawn into surgical and cytology report PDFs, with a below-300-DPI warning. Waiting on the server side: fetching linked images through the API server instead of the browser.
- Sources: services/imageAssociation/embedImageAssociationsIntoPdf.ts.

#### Not yet in FEATURE_OVERVIEW.md
- Anatomical organ maps (panel, insert into report, configuration), Mohs template
- Peer review before sign-out
- Critical findings detection, highlighting, notification record, automated alerts and reference page
- Sign-out gates (fixative, pre-analytic, inking, stain QC), signature confirmation, Signature History, biometric signing
- Release as Preliminary; Return to Trainee (only "Countersign & FPPE" generic line)
- Delivery rules (channels, test panel), delivery retries and delivery exception queue (e-fax and file drop appear only as bullet words)
- Outbound message preview, ORU result message and structured synoptic result
- Report PDF renderer, content rules, Document Style, report language, letterhead branding resolution
- Report template routing and Report Parts, Declared Final Diagnosis
- Synoptic Library lifecycle actions, template editor, template review rules
- Protocol dictionary, text macros and voice macros, spell check, comments, Version History/Change history detail, Revision Reasons, print gate and restricted-case print, print audit, Print Queue actions, bottom action bar, Tumor Board flag, Request a new synoptic template, autopsy PAD/FAD signing

#### Status in FEATURE_OVERVIEW.md that the code contradicts
- Outside consult links: overview says "Live"; code is a mock token service, links open only in the issuing browser, no consultant identity check - Partial (Demo).
- Amendment, Correction & Addendum "Live" and Template Builder "Live": true in the demo; omits that server version endpoints and template e-mails are Planned (e-mails are listed as Partial elsewhere in the overview).
- Cytology "Live once the report renderer is redeployed": consistent, but the renderer still hard-codes A4 and ignores Document Style and header/footer parts, so the Document Style page-size setting does not reach any PDF.
- Template Builder "seeded templates ... Live": about 1,500 placeholder field/option labels remain on 19 templates; they are not usable clinical content.
- Release delay "Live (all outputs)": browser sweep only while the app is open; no server job (overview does say server scheduler comes with the API server).

---

# Theme 3: Cytology, autopsy, molecular, intraoperative, Mohs, tumor board


Notation: "Batch N" = changelog batch in the READMEs. "Built (Demo)" = works in the app against browser/mock storage; a production server (API/SignalR/interface engine) is still required for the real thing. Keys like `cytology:report:sign-out` are capability keys in `src/services/authorization/capabilityCatalog.ts`. Entries are grouped: Cytology workflow, Cytology configuration, Cytology QC and QA, Screening/cancer registries, Autopsy, Molecular, Intraoperative/frozen/OR suite, Mohs and organ maps, Margins and inking, Tumor board/MDT.

# A. CYTOLOGY WORKFLOW

### hrHPV result inbound from a molecular platform
- What it does: An hrHPV result (Positive, Negative or Invalid) from the molecular platform is applied to the cytology specimen, drives HPV-first triage, and is audited. An Invalid result keeps the case in HPV Triage with a "repeat test" label.
- Workflow: Cytology Worklist > HPV Triage; interface engine inbound.
- Roles/permissions: system event (no user); manual entry is a separate permission (see the next entry).
- Settings: Cytology screening strategy (co-testing or primary HPV with reflex).
- Status: Partial (Batch 629). Handling and contract built; the server route and engine channel are not.
- Sources: docs/architecture/HPV_RESULT_INBOUND.md.


### Manual hrHPV result entry with Result Source and second sign-off
- What it does: Record Positive / Negative on the HPV Triage tile, for results that do not arrive by the interface. The person picks a required Result Source (paper report, interface downtime, telephoned result, back-entry); the entry is audited with who, when, the source and the earlier result. An entry that would replace an interface result waits for a different authorised person to approve or reject it.
- Workflow: Cytology Worklist > HPV Triage.
- Roles/permissions: `cytology:hpv-result:record-manual` (Pathologist, Lab Director; a lab grants it to others).
- Settings: none.
- Status: Built (Demo) (Batch 630). The browser side is complete and works against browser-side services. Waiting on the server side: the API server repeats the permission check, writes the audit entry and holds the pending state.
- Sources: docs/architecture/HPV_RESULT_INBOUND.md section 7.

### Self-collected HPV recall (Australia and New Zealand)
- What it does: A self-collected hrHPV Positive or Invalid result goes to Recall needed with a priority (Urgent for HPV 16/18 or unreported type, Routine for other oncogenic types), a target window, the programme's recall wording and a recommendation code; an Invalid result asks for a repeat collection. The recall closes when the same patient has a later clinician-collected cervical sample. The data for a register message (collection method, 16/18/other genotype, recall recommendation) is assembled for the interface engine.
- Workflow: Cytology Worklist > Recall needed.
- Roles/permissions: view of the cytology worklist.
- Settings: the performing lab's jurisdiction (AU or NZ), then the institution-wide Jurisdiction setting; cytology screening strategy (HPV-first).
- Status: Partial (Batch 631). The recall rules, display and register content are built; the codes, windows and wording await programme sign-off; sending to NCSR / the NZ register is interface-engine work and is not built.
- Sources: docs/architecture/HPV_RESULT_INBOUND.md section 8.
### Reactive changes sign-out setting
- What it does: One switch in Cytology Categories sets whether a cytotechnologist may sign out a negative GYN case with only reactive cellular changes, or a pathologist must review it.
- Workflow: Configuration > System > Cytology Categories; cytology sign-out gate.
- Roles/permissions: config:cytology-categories:manage.
- Settings: the switch (stored on the three reactive-change categories).
- Status: Built (Demo) (Batch 626). Applies to reviews recorded afterwards.
- Sources: src/services/cytology/README.md.

### Cytology Workspace entry points and access
- What it does: Cytology worklist at `/cytology-worklist` and per-case screening page at `/cytology-worklist/:caseId`. Both sit behind the `cytologyWorkspace` screen gate. The structured cytology workflow (review, sign-out, dispatch) opens only for cases in Orchestrator reporting mode; an Assist-mode case shows a blocking message. The workspace loads every Cytology/FNA specimen on the case (Draft or Signed out), opens the requested specimen or the first unsigned one, and falls back to jurisdiction US / modality WSI if none is set.
- Workflow: Home > Pathology Workspace hub > Cytology Workspace > pick case. Legacy `/cytology-qc-queue` redirects to `/worklist?view=cytologyQc`.
- Roles/permissions: `screen:cytology-workspace:open`; `screen:cytology-qc-queue:open` for the QC view.
- Settings: none.
- Status: Built (Demo) — routes verified in `SignedInApp.tsx` lines 197-198, 222; hub membership verified in `services/screens/screenAccess.ts` (older README says a Home tile; code now puts it inside the Pathology Workspace hub).
- Sources: `src/services/cytology/README.md` (Phases 8, 20); `src/pages/CytologyWorklistPage/README.md`; `SignedInApp.tsx`; `screenAccess.ts`.

### Cytology worklist tabs, tiles and flags
- What it does: Stat tiles and tabs with counts: My Worklist (assigned/urgent), Pool (unassigned, claim or pass inline), QC, HPV Triage, Recall Needed, CSMS QA (flag f36), 5-Year Lookback, Peer Review, Histology Correlation, Scans Completed, Follow-up Due, plus ROSE-active and Decant-pending memberships. Rows carry hasFinalDiagnosis, QC reason and organ-site chips; patient name is a button that opens the case; selected tile is announced to screen readers; Korean names show with honorific. Each AI-screened row shows an AI triage badge (quintile rank and review recommendation, or count of flagged fields of view).
- Workflow: Cytotechnologist opens a tile, claims or passes a pool case, opens it. Manage Flags and Ask a Colleague buttons work independently of the row click.
- Roles/permissions: `screen:cytology-workspace:open`.
- Settings: facility routing and screening-strategy settings decide membership.
- Status: Built (Demo)
- Sources: `src/pages/CytologyWorklistPage/README.md` (Batches 440, 441, 446, 454, 514, 566); `cytologyWorklist.ts`, `cytologyWorklistLive.ts`; `docs/architecture` digitalPathology README (AI badge).

### Cytology worklist membership and routing rule
- What it does: A case belongs on the cytology worklist when any specimen's dictionary type is Cytology or FNA. GYN (isGynCytology) always qualifies. Non-GYN follows the effective routing setting (default: surgical pathology worklist). Under primary-HPV strategies, cases awaiting or negative for HPV are left off. Cytotechnologists who claim a pool case become participation type `cytotechnologist`, never primary pathologist; pathologist participation types are refused for cytotechnologists in case-team save, delegation and role save.
- Workflow: Automatic.
- Roles/permissions: `config:cytology-routing:manage` (setting); `case:team:manage`, `config:roles:manage`.
- Settings: Configuration > Cytology > Routing (enterprise default plus performing-facility override).
- Status: Built (Demo)
- Sources: svc cytology README Phases 7, 9, 23; `resolveCaseCytologyWorklistMembership.ts`; `docs/architecture/AUTHORIZATION_API.md` (Batch 441); `resolveClaimParticipationType.ts`.

### Screening page: review entry
- What it does: Two-column page with type-to-filter single/multi pickers for specimen adequacy, general categorization, primary interpretation (one) plus additional interpretations, and recommendations, each with comments; read-only HPV block; LMP date; full Review History. Each review is its own record (primary screen, QC random, QC targeted high-risk, secondary reviewer, pathologist review). Reviewer role is assigned automatically (no reviews yet = primary screener; pathologist = pathologist review). Only one primary screen per specimen. A user can edit only their own review (button reads Update Review). Clone copies another review's selections as a new draft and drops comments. Unsaved-change warning on tab close, Back to Worklist and Clone. Field Requirements page "cytology" drives the starred labels and "Still required:" line; Save stays off until complete.
- Workflow: Cytotechnologist or pathologist fills the form and saves. Voice "save review" does what the button does.
- Roles/permissions: `cytology:review:record`.
- Settings: Configuration > System > Field Requirements > cytology.
- Status: Built (Demo)
- Sources: svc cytology README Phases 3, 5, 10, 16, 28; `saveCytologyReview.ts`, `resolveCytologyReviewerRole.ts`, `cloneCytologyReviewAsDraft.ts`; pages README Batches 386, 410.

### Review save sequence and stored agreement level
- What it does: Saving a review checks permission, validates CISOE-A, checks the CLIA workload cap (reassigns pending cases; refuses new reviews over the cap but lets escalations through), creates or updates the review, applies high-risk QC or else random QC to a new initial screen, writes the secondary-screening QA record for QC/secondary reviews, then the workload ledger entry. Each later review is compared to the latest initial screen and stores an agreement level (exact, minor, major) with categories added/missed; an edit re-assesses and keeps prior results.
- Workflow: Automatic on Save.
- Roles/permissions: `cytology:review:record`.
- Settings: none.
- Status: Built (Demo)
- Sources: svc cytology README Batch 410; `saveCytologyReview.ts`, `resolveCytologyReviewAgreement.ts`.

### Review notes, Requires Revision, Revise and sign out, version history
- What it does: Non-authors leave notes on parts of a review. Plain notes are advisory. A "Requires revision" note (audited) puts the specimen in Revision requested and blocks a cytotechnologist (never a pathologist) from final diagnosis and sign-out until the author acknowledges and saves a revised review, or a pathologist records their own review (resolved by pathologist). A pathologist's Revise and sign out copies the CT review into their own (CT review never edited), makes it final, resolves requests, audits, and opens the signature prompt. Authors can load earlier versions back into the form.
- Workflow: Review History > add note; author Acknowledge; pathologist Revise and sign out.
- Roles/permissions: `cytology:revision:request`; only the author acknowledges; `cytology:final-diagnosis:select` and `cytology:review:record` for revise-and-sign-out.
- Settings: none.
- Status: Built (Demo)
- Sources: pages README Batch 412; `cytologyReviewNotes.ts`, `reviseCytologyReviewForSignOut.ts`, `CytologyReviewNotes.tsx`.

### Final diagnosis selection, QC flag removal and permissioned workspace actions
- What it does: Exactly one review is chosen as the Final Diagnosis (snapshot of interpretations, adequacy, who/when). A pathologist may choose any review; a cytotechnologist only one the sign-out gate allows (GYN, no pathologist requirement, satisfactory, not QC-flagged), otherwise Set as Final is disabled with a tooltip. Other permissioned actions: remove a QC flag (audited; adding a flag needs no permission), record 5-year retrospective outcome, record or dismiss a histology correlation, manual QC flag, Code Manager changes (audited), LMP, decants, stains, print.
- Workflow: Set as Final on a review in history.
- Roles/permissions: `cytology:final-diagnosis:select`, `cytology:qc-flag:remove`, `cytology:retrospective-review:record`, `cytology:histology-correlation:record` (seeded Pathologist, Fellow, Resident, Cytotechnologist).
- Settings: Role Dictionary.
- Status: Built (Demo)
- Sources: svc cytology README Phases 4, 52, Batch 410; `cytologyCaseActions.ts`; pages README Batch 410.

### Cytotechnologist independent sign-out gate and advanced-CT exception
- What it does: A cytotechnologist may sign out alone only if the specimen is GYN, the review does not require a pathologist, no adequacy selection is unsatisfactory, and the case is not QC-flagged. Badge reads CT Sign-Out Eligible or Pathologist Required. Advanced-cytotechnologist independent abnormal sign-out is allowed only where the lab's jurisdiction permits it (GB nations, NL, DE) and the signer holds the normalized capability CYTO_ADVANCED_SPECIALIST (mapped from credentials such as IBMS_ASD, NL_KCA_ADVANCED, DE_ZYTO_ASSISTENT_ADV); unresolved jurisdiction defaults to US (no exception). The CLIA credentialed-CT exception and first-year competency countersign stay on the CT track.
- Workflow: Shown per review; sign-out button disabled with the reason when blocked.
- Roles/permissions: `cytology:ct-report:sign-out` (removable where cytotechnologists may not sign) in addition to `cytology:report:sign-out`; staff `providerCredentials` (`config:staff-access:assign`).
- Settings: Staff > Jurisdictional credentials and appointments; Role Dictionary.
- Status: Built (Demo) — jurisdiction policy file `resolveAdvancedCytologySignOutJurisdictionPolicy.ts` exists; its per-jurisdiction detail is Unverified.
- Sources: svc cytology README Phases 12, 13, Batches 332, 410, 415; svc cytologyQc README; `resolveCytologySignOutGate.ts`, `resolveCytologySignOutAuthority.ts`.

### Cytology sign-out (sequence, permission, outcomes)
- What it does: Sign-out runs: gate, signature confirmation, signing authority (lab/country countersign types, `canFinalizeCase`; consultant or second-opinion participants cannot sign unless granted), countersign release (and e-mail), translation audit, 5-year lookback, ROSE discrepancy QC, post-sign-out peer review selection, correlation candidates, immutable sign-out record (screenedBy and signedBy kept separately), release event, registry dispatch (CSMS flag once per case). Outcomes: notPermitted, gateBlocked, signatureRefused, releasedForCountersign, authorityRefused, ctNotPermitted, signedOut, failed. The case becomes Final only when every cytology specimen has a sign-out record. Each specimen has its own countersign record; completing it returns the case from pending-countersign to in-progress when nothing else is pending. The report is stamped with the performing lab's language and date format.
- Workflow: Screening page > Sign Out > (mismatch window if high risk) > signature.
- Roles/permissions: `cytology:report:sign-out` (Pathologist, Fellow, Resident, Cytotechnologist, hospital case-access roles); `cytology:ct-report:sign-out`.
- Settings: signing authority per lab/country; Participation Types "Requires Countersign".
- Status: Built (Demo) — countersign "Return to Trainee" is built for surgical pathology; there is no cytology reject UI (service ready), and cytology/autopsy use only hard-coded resident/cytotechnologist countersign checks.
- Sources: pages README Batches 391, 409, 523, 530; svc cytology README Batches 409, 411, 332; svc cases README Batches 455, 483, 485; `signOutCytologyCase.ts`.

### Multi-specimen cytology cases and early finalization
- What it does: Tabs "Specimen A/B..." with Draft/Signed out status; progress line ("1 of 3 specimens signed out"); unsaved-change prompt when switching. Queue, review tray and worklist treat the case as one row (OR across specimens). "Finalize case now" mid-way requires a reason and records who, when, why and the unsigned specimens (audited); unsigned specimens can still be signed later and then go out as an addendum.
- Workflow: Specimen tabs on the screening page; Finalize case now button.
- Roles/permissions: `cytology:case:finalize` (Pathologist by default).
- Settings: none.
- Status: Built (Demo)
- Sources: pages README Batch 411; `CytologySpecimenTabs.tsx`, `cytologyCaseFinalization.ts`; svc cytology README Batches 411, 483.

### One consolidated cytology case report per accession
- What it does: Specimens are signed one by one but nothing leaves until the case closes. Then one case report (cover page listing every specimen and status, then each signed report) and one HL7 ORU^R01 (scope case, one result per specimen) go out. Early finalization releases at once listing unsigned specimens as "Not reported" with the reason. Corrections and addenda reissue the whole report and mark the changed specimen. Registry results go per sample, together. Print/fax/file-drop use the case report; a "Print case report" button appears on released multi-specimen cases and opens the stored document byte for byte.
- Workflow: Sign the last specimen (or finalize early); Print case report afterward.
- Roles/permissions: sign-out and finalize rights (above).
- Settings: none.
- Status: Built (Demo) — `cytologyCaseReportForPrint.ts` and `generateCytologyCaseReportPdf.ts` exist (the older "no combined PDF yet" note from Batch 411 is superseded by Batch 532).
- Sources: `docs/product/FEATURE_OVERVIEW.md`; svc cytology README Batch 532; pages README Batches 411, 532; `buildCytologyCaseOruR01Payload.ts`.

### Urgent per-specimen preliminary report
- What it does: A specimen with a chosen final diagnosis and not yet signed out can be sent ahead of the case report. One quick pick of reason (Critical finding, Clinician request, Urgent clinical management), optional note, then Send, or Sign and send where the lab requires the e-signature. It goes to clinician, EMR, print and fax marked PRELIMINARY REPORT with "Preliminary released by", is never sent to a screening registry, is never de-duplicated, is audited (CYTOLOGY_PRELIMINARY_RELEASED), waits out the release delay, and can be recalled. The case report later supersedes it. Sent preliminaries are listed under the button.
- Workflow: Preliminary panel on the screening page.
- Roles/permissions: `cytology:preliminary:release` (no built-in role has it; the lab grants it).
- Settings: Configuration > Cytology > Country and laboratory rules > e-signature on preliminary (Automatic = required everywhere, On, Off).
- Status: Built (Demo) — delivery through real channels needs the server.
- Sources: GUIDE_UPDATES Batch 533; `releaseCytologyPreliminary.ts`, `CytologyPreliminaryPanel.tsx`.

### Correction and addendum on a signed-out cytology report
- What it does: Under the "signed out" banner. Correct diagnosis starts from the signed review, creates a new corrected review and a new sign-out record linked by amendsRecordId (original never edited); the correction becomes the specimen's Final Diagnosis; the PDF carries a CORRECTED REPORT banner with what was reported before; ORU state CORRECTED. Add addendum creates a record linked by addsToRecordId with addendum text; ORU state ADDENDUM; own page if the facility print policy says so. Both need a reason and signer signature; the reason prints. The released version goes to the screening registry as CORRECTION/AMENDMENT (a registry failure does not undo the release). A released correction recommends a CAPA to the QA lead. During the release delay both are refused with a message (recall instead).
- Workflow: Signed-out banner > Correct diagnosis / Add addendum > reason > signature.
- Roles/permissions: `cytology:report:correct`, `cytology:report:addend` (Pathologist only).
- Settings: facility print policy (addendum on own page).
- Status: Built (Demo) — registry submission goes to the mock registry service.
- Sources: pages README Batches 390, 419, 532, 540; `releaseCytologyCorrection.ts`, `releaseCytologyAddendum.ts`, `useCytologyRevision.ts`.

### Release delay and recall for cytology outputs
- What it does: Case report, post-closure specimen addition, early finalization, corrections, addenda and preliminaries wait out the laboratory release delay (STAT bypasses). The person who released can recall until it ends. Recall marks the sign-out recalled (never edited or deleted), returns the case to its earlier status so it can be signed again, and hides recalled records from normal queries. Registry submissions go with it. A "held reports" banner lists waiting items with Recall.
- Workflow: Banner > Recall.
- Roles/permissions: releaser only.
- Settings: release delay (enterprise and performing lab).
- Status: Built (Demo) — a server-side scheduler comes with the API server.
- Sources: pages README Batch 534; `docs/product/REPORT_RELEASE_DELAY.md`; svc cytology README Batches 534, 540.

### Cytology PDF rendering, preview and printing
- What it does: Every cytology PDF (sign-out snapshot, preliminary, consolidated case report, correction, addendum, workspace print/preview, per-specimen retry) is made by the server report renderer with template "cytology" (A4, 15 mm margins, embedded Liberation Sans, Pretendard for Korean, accession barcode on each report's first page, "Page X of Y" in the document's language, optional addendum on its own page). Pre-sign-out previews carry "PRELIMINARY - SUBJECT TO CHANGE". A PDF lacking the cytology marker is refused and the release held. Embedded images are not drawn. The old browser jsPDF generator, worker and font helpers were deleted in Batch 539.
- Workflow: Print / Print case report on the screening page; automatic at release.
- Roles/permissions: print capabilities.
- Settings: `VITE_REPORT_PDF_ENDPOINT`; facility letterhead and print policy.
- Status: Built (Demo). Client payload, renderCytologyPdf and functions/cytology_report.py all exist; generateCytologyReportPdf.ts is intentionally gone. Only deployment of the renderer is missing.
- Sources: pages README Batch 539; `functions/README.md`; `DELETED_FILES.txt`; FEATURE_OVERVIEW (Batch 539).

### Cytology report content and language
- What it does: Structured report with seven sections: administrative/patient identifiers, specimen type, adequacy, general categorization, interpretation, adjunctive testing (HPV, computer-assisted screening), notes/comments/sign-off, using dictionary description text. Content stores the performing lab's language and locale; titles, labels, banners, dates localised; corrections/addenda keep the original language; dictionary wording and free text print as stored. Clinical history captured at accession flows in. The ORU carries structured JSON plus base64 PDF; CISOE-A reviews add a native six-component score extension.
- Workflow: Assembled at sign-out.
- Roles/permissions: none.
- Settings: performing lab language/jurisdiction.
- Status: Built (Demo)
- Sources: svc cytology README Phases 19, 37, Batches 391-392; `resolveCytologyReportContent.ts`, `buildCytologyOruR01Payload.ts`.

### Cytology result dispatch and report-released event
- What it does: After sign-out the app enqueues a tracked, retryable outbound result (structured JSON plus PDF) for the external interface engine, which builds the HL7. Cytology joins the shared Report_Released_Event (source CYTOLOGY) so the ORU dispatch passes through print and delivery rules like surgical pathology; dispatch is idempotent per sign-out record. National-registry dispatch stays separate.
- Workflow: Automatic; retry from the outbound queue.
- Roles/permissions: none stated.
- Settings: interface endpoint, delivery and print rules.
- Status: Built (Demo). Cytology result queue and event publish are built and appear in the unified outbound screen with dispatch/resend/simulate. Only the real interface-engine endpoint is missing.
- Sources: svc cytology README Phase 20 and Report_Released_Event section; `dispatchCytologyCaseInstances.ts`, `publishReportReleasedEvent.ts`.

### Pathologist review tray and Take-and-open
- What it does: GYN specimens whose primary, QC or secondary screen asked for pathologist review (and no pathologist has reviewed or signed) appear as open or mine. Shown on the main Worklist only to capability holders and only when non-zero. Take makes the caller the primary pathologist (a claiming cytotechnologist stays `cytotechnologist`), is audited (CYTOLOGY_REVIEW_TAKEN), and opens the workspace; no auto-assignment; refusals ALREADY_TAKEN / NOT_AWAITING. A QC rescreen finding abnormality goes to the tray. The server must make the take atomic.
- Workflow: Worklist Cytology Review tile > case > Take and open.
- Roles/permissions: `cytology:pathologist-review:take` (Pathologist, Fellow).
- Settings: none.
- Status: Built (Demo) — atomic take is a server requirement.
- Sources: WL README Batch 440; `cytologyQueuesLive.ts` (`takeCytologyReview`, `loadCytologyReviewTray`); AUTHORIZATION_API.md.

### Clinical-pathologic mismatch check (cytology and autopsy)
- What it does: On the pathologist track, once per specimen, the AI-assisted check compares clinical history with the final diagnosis, running in the background two seconds after the diagnosis stops changing with an inline alert. At sign-out only a high-risk mismatch opens a decision window (Resolved/Unresolved); low-risk is logged for QA. Autopsy runs it before FAD (not PAD). Missing clinical history defers the check with a notice. The Specimen Dictionary entry picks the rule.
- Workflow: Automatic; decide in the window.
- Roles/permissions: not separately stated.
- Settings: Configuration > System > Clinical Mismatch Rules; AI Instructions.
- Status: Built (Demo)
- Sources: `docs/product/CLINICAL_MISMATCH_CHECK.md`; pages README Batches 523, 530, 531; `cytologyClinicalMismatch.ts`, `useClinicalMismatchCheck.ts`.

### Cytology billing drawer
- What it does: "$ Billing" next to "# Codes" opens the case billing review in a wide drawer (approve, decline, override, add, delete, correct codes; Approve all across decants). Changes are saved via cytology unit coding/specimen billing, then charged or credited; only the orchestration case is charged; charge date of service is Date Collected else Date Received.
- Workflow: Screening page $ Billing.
- Roles/permissions: `billing:applied-code:review`.
- Settings: Role Dictionary.
- Status: Built (Demo)
- Sources: CW README Batch 460; billing README Batch 460.

### Decants, material view and slide-preparation suggestions
- What it does: Decant panel records Total Volume (mL), Appearance and Decant Yield and suggests a preparation slate with Accept (over 20 mL with high yield = 2 ThinPrep, 2 Cell Block, 1 Direct Smear); per-slide preparation method; Pap / Diff-Quik / H&E quick toggle; Diff-Quik/Wright-Giemsa in the Cytology stain category. Decant adds and stain changes are atomic versioned saves that publish MATERIAL_DECANTED; a decant tree supports multi-level decants. A save conflict shows a message and reloads. Suggestions also appear on the Microtome workstation.
- Workflow: Scan decant container; screening page Material drawer.
- Roles/permissions: `case:decant:delete` for deleting.
- Settings: rules in `computeCytologyPrepSuggestions` (not configurable).
- Status: Built (Demo)
- Sources: pages README (decant panel); svc cytology README Phases 79, Batches 453, 460; `CytologyPanel.tsx`, `materialTree.ts`.

### Cytology clinical history and high-risk factors at accession
- What it does: When a cytology/FNA specimen is present, the Accession page adds LMP, hormonal status, reason for study (NHS programme invited / private or opportunistic), prior abnormal Pap/HPV, IUD/contraception, and a Structured Clinical History picker (21 entries in six categories; case or specimen level; Alt+1-6 jump to categories). A "persistent contact bleeding" Yes/No/Not recorded answer is stored per cytology/FNA specimen. Diagnosis codes from encounters feed high-risk criteria (Z87.410/Z86.001 prior procedure, Z91.B DES exposure, N93/N95.0 bleeding, N84.1/N88.8 exam findings); procedure codes are not parsed. Accession status is COMPLETE or DEFICIENT.
- Workflow: Accessioner completes at accession.
- Roles/permissions: none.
- Settings: Field Requirements > Clinical history (cytology); Structured Clinical History Dictionary.
- Status: Built (Demo) (Batch 608). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: svc cytology README Phases 41, 55-57, 76; accessioning README Batches 451, 452; `resolveAccessionSpecimenCytologyScreening.ts`.

### Cytology batch nodes (ThinPrep processing, staining, imaging)
- What it does: Batch nodes Cytology Processing (ThinPrep run status inbound), Cytology Staining (stain type from the Stain Dictionary), Cytology Imaging (field-of-view count per slide). On completion, Cytology Staining moves slides to Ready for Screening and Cytology Imaging triggers an AI screening order (vendor resolved by modality `cervical_cytology`). Creating a Cytology Processing batch also queues an outbound instrument order to the ThinPrep processor.
- Workflow: Tech scans containers into the batch, reconciles, completes.
- Roles/permissions: see Batch Management.
- Settings: AI vendor by modality; Stain Dictionary.
- Status: Built (Demo) — instrument HL7 needs the interface engine.
- Sources: batches README; `mockBatchService.ts`, `mockBatchService.readyForScreening.test.ts`; molecularOrders README.

### AI screening results for cytology
- What it does: Records AI results ordered, completed, failed or timed_out with findings, optional normalized region and slide-level triage (review recommended, rank group of N); idempotent ingestion of inbound events; supports BD-style slide rank and Hologic-style FOV gallery with no vendor logic in PathScribe. Surfaces as the AI badge on the worklist.
- Workflow: Interface engine delivers; screeners see the badge.
- Roles/permissions: none stated.
- Settings: none.
- Status: Built (Demo) — real vendor integration is Planned.
- Sources: `digitalPathology/README.md`; `mockAiScreeningResultService.ts`, `processInboundAiScreeningResultEvent.ts`.

### ROSE (rapid on-site evaluation) tracking
- What it does: A ROSE drawer on the screening page records an evaluation with location (radiology, clinic, operating room, other) and one or more passes, each with adequacy (adequate, inadequate, indeterminate) and a free-text preliminary impression; prior evaluations are listed. At sign-out the last pass is compared with the final adequacy (disagreement in either direction = discrepancy). A discrepancy always creates a top-tier (high_escalation) QC assignment with a 4 hour SLA; this trigger is fixed, not configurable.
- Workflow: Proceduralist/screener records passes; sign-out evaluates automatically.
- Roles/permissions: none stated.
- Settings: none.
- Status: Built (Demo) — verified `CytologyRoseView.tsx` is mounted in `CytologyScreeningPage.tsx` and `resolveCytologyRoseDiscrepancy` is called by `signOutCytologyCase.ts`; the svc README marked it Partial/Unverified.
- Sources: svc cytology README Batches 410, 501; svc cytologyQc README; `resolveCytologyRoseEvaluationAdded.ts`.

### HPV result display, inbound HPV event and recording
- What it does: Each specimen carries HPV status (Negative, Positive, Pending, Not Performed), genotype (HPV16, 18/45, other high-risk), abnormal flag, reference range and order reason; read-only on the screening page, positive shown with a border change, formatted into the report; HPV 16/18/45 feeds high-risk factors. The inbound HPV result event is idempotent on messageId, rejects flag/result contradictions, and returns applied / already-applied / case-not-found / specimen-not-found / invalid-payload. The worklist "Record Positive/Negative" buttons simulate delivery. A positive standalone high-risk result enqueues reflex genotyping (st-hpv-genotyping) in the outbound order queue.
- Workflow: Interface engine delivers; demo buttons on the HPV Triage tile.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo). Processor is idempotent and tested; the worklist 'record HPV result' button is a labelled simulation of the inbound event (handleRecordHpvResult). Only the real molecular interface is missing.
- Sources: svc cytology README Phases 21, 24, 27, 28; `processInboundHpvResultEvent.ts`; `CytologyWorklistPage.hpvResult.test.tsx`.

### Screening strategy, HPV Triage and self-collection routing
- What it does: Strategy per facility: co_testing, primary_hpv_reflex (cytology only after a positive HPV), or cytology_only, with an optional age rule (Germany under 35 cytology only, 35+ co-testing; France/Belgium under 30 cytology only, 30+ primary HPV; falls back to the base strategy if age unknown). HPV Triage tile lists cases awaiting a result; states awaiting_hpv_result, hpv_negative_complete (no screening), reflex_triggered, reflex_requires_new_specimen (self-collected positive). A specimen-dictionary flag marks Self-Collected Vaginal Swab; a positive self-collected HPV never reflexes to cytology and shows on a Recall Needed tile for clinician-collected LBC.
- Workflow: Admin sets; applied per patient on the worklist.
- Roles/permissions: `config:cytology-screening-strategy:manage`.
- Settings: Configuration > Cytology > Screening Strategy (enterprise + facility).
- Status: Built (Demo) — pre-analytic container tracking for self-collection is Planned (PS-177).
- Sources: svc cytology README Phases 23, 26, 31, 32; `resolveEffectiveCytologyScreeningStrategyForPatient.ts`, `resolveCytologyTriageState.ts`.

### CISOE-A (PALGA) scoring form and reflex suggestion
- What it does: Dutch six-component entry panel (composition, inflammation, squamous, other/endometrium, endocervical axes 0-9 each with comment, plus 3-tier adequacy where suboptimal counts as satisfactory), shown when the facility nomenclature is palga_cisoea. Auto-maps to Bethesda primary/additional interpretations (never ASC-H) for gating and QA. Mandatory components; unsatisfactory adequacy with an abnormal finding warns but does not block. A live suggestion (never auto-applied): highest of S/O/E at 5 or more suggests colposcopy; 2-4 suggests HPV genotyping.
- Workflow: Reviewer fills the form; "save CISOE-A review" by voice.
- Roles/permissions: `cytology:review:record`.
- Settings: facility nomenclature `palga_cisoea`.
- Status: Built (Demo)
- Sources: svc cytology README Phases 30, 33, 37, 38; `resolveCisoeAToBethesda.ts`, `resolveCisoeAReflexRecommendation.ts`; pages README.

### German triage recommendation
- What it does: For Munchner Nomenklatur reviews, suggests colposcopy when diagnostic rank is 2 or more, or repeat co-testing in 12 months when HPV positive with Pap I/IIa. Suggestion only.
- Workflow: Shown to the reviewer.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo)
- Sources: svc cytology README Phase 31; `resolveGermanCytologyTriageRecommendation.ts`.

### Non-GYN cytology synoptics and classification dictionaries
- What it does: Five bundled Non-GYN templates (lymph node FNA, pancreaticobiliary, salivary gland FNA, thyroid FNA, urine) live on the shared template model and are edited in the Synoptic Library like any other (duplicate, new version, review, publish); screens use published versions, retired versions still read, bundled files are the fallback. Sign-out runs the template translation check and compiles a narrative; the editor shows each question's narrative sentence and each answer's phrase. Separate admin dictionaries: Milan System (salivary FNA, seven tiers with risk-of-malignancy figures) and Paris System second edition (six categories). Non-GYN and FNA specimens are never sent to screening registries.
- Workflow: Choose protocol in the synoptic drawer of a Non-GYN review; admin edits in Synoptic Library and Configuration > Cytology.
- Roles/permissions: template governance capabilities; `config:cytology-categories:manage` likely for dictionaries (not separately stated).
- Settings: Synoptic Library; Configuration > Cytology > Non-GYN categories.
- Status: Built (Demo) — whether review/report entry consumes the Milan/Paris dictionaries is not stated and not verified.
- Sources: `src/data/templates/Cytology/README.md`; Protocols README Batch 519; svc cytology README Batch 519; `cytologySynopticTemplateRegistry.ts`, `compileCytologySynopticNarrative.ts`, `mockNonGynCytologyCategoryService.ts`.

### Cytology permissions (capability keys)
- What it does: Separate keys for each action: report sign-out, CT sign-out, report correct and addend (Pathologist), review record, final-diagnosis select, QC-flag remove, retrospective review, histology correlation, revision request, case finalize before all specimens are signed (Pathologist only, reason and audit), pathologist-review take, QC-review record, QC-review bypass (nobody by default; also opens the QC queue), preliminary release (nobody by default), screening-hours sign-off. Buttons are greyed without the key; services re-check. Config writes need matching `config:cytology-*:manage` keys (seeded Admin, Lab Director) and are audited.
- Workflow: Role Dictionary assigns.
- Roles/permissions: as listed.
- Settings: Configuration > Roles / Role Dictionary.
- Status: Built (Demo)
- Sources: authorization README Batches 390, 396, 409-415, 440, 533, 572; `guardConfigWrites.ts`.

# B. CYTOLOGY CONFIGURATION

### Configuration > Cytology tab (sections)
- What it does: One tab with twelve sections: Interpretation and Recommendations (category dictionary), Non-GYN categories (Milan, Paris), Nomenclature, Screening Strategy, Routing, Registry Reporting, QC Settings, Workload Cap, Instrumentation, SNOMED cyto-histologic severity mapping, Country and laboratory rules, Cyto-histology correlation window. Each is view-only without its capability, warns on unsaved changes, and is findable in Configuration search. Cascades are enterprise + facility, except QC and Workload Cap (+ staff). QC assignment rules live under System > Cytology QC Rules.
- Workflow: Admin opens Configuration > Cytology.
- Roles/permissions: `config:cytology-categories|nomenclature|routing|screening-strategy|histology-correlation|instrumentation|qc-rates|workload-cap|severity-mapping|qc-rules:manage`, `config:cytology-compliance:manage`.
- Settings: as above.
- Status: Built (Demo)
- Sources: Config/Cytology README; svc cytology README Phase 75; `cytologySections.ts`, `capabilityCatalog.ts`.

### Cytology category dictionary (Bethesda 2014)
- What it does: Admin dictionary in four sections (Specimen Adequacy, General Categorization, Interpretation/Result, Recommendations including ASCCP-style intervals, colposcopy, endometrial biopsy). Each entry has requiresPathologistReview (false only for NILM and sub-findings), suggestedAbnormalSeverity, diagnosticRank (0-5), isUnsatisfactory, and description text used in reports; interpretations carry usage primary / secondary / both (7 definitively malignant entries are primary-only). The review requirement is snapshotted onto the screening record so later edits don't change past cases. Specimen type and ancillary tests are deliberately excluded. Seeded: 46 Bethesda-system entries in code (README says 45 plus the HPV genotyping recommendation added in Phase 38).
- Workflow: Admin edits; screeners pick from it.
- Roles/permissions: `config:cytology-categories:manage`.
- Settings: Configuration > Cytology > Interpretation and Recommendations.
- Status: Built (Demo)
- Sources: svc cytology README Phases 1-6, 17; `mockCytologyCategoryService.ts`, `CytologyCategoriesSection.tsx`.

### Multiple nomenclature systems (Bethesda, BSCC/RCPath, Munchner III, SFCC, CISOE-A)
- What it does: Each category entry belongs to one system with its own rank and calibration. BSCC/RCPath has 17 entries (borderline, dyskaryosis grades, glandular neoplasia, NHSCSP recommendations); Munchner Nomenklatur III has 28 entries (Groups I-V; verified in code, one README says 27); SFCC (France) returns the Bethesda records with French label/description (46 entries; read-only view, French text editable on Bethesda entries, CSV/XLSX import/export); PALGA CISOE-A is a separate form, not in the dictionary. The screening page shows only the case facility's effective system. Munchen-to-Bethesda cross-mapping exists for analytics only and never drives clinical logic.
- Workflow: Admin picks the system per enterprise or facility with a selector; screener sees only that system.
- Roles/permissions: `config:cytology-nomenclature:manage`, `config:cytology-categories:manage`.
- Settings: Configuration > Cytology > Nomenclature (enterprise default Bethesda, facility override, no staff tier).
- Status: Built (Demo)
- Sources: svc cytology README Phases 22, 29, 74; `resolveEffectiveCytologyNomenclatureSettings.ts`, `resolveCytologyTbsEquivalent.ts`; Batch 582 (PS-328).

### Cytology instrumentation modality
- What it does: Assisted-instrumentation modality (wsi vs traditional_guided) set as an enterprise default with a facility override, resolved from the case's performing facility (fallback wsi); controls Imager vs Manual workload split.
- Workflow: Admin adds/lists/removes facility overrides.
- Roles/permissions: `config:cytology-instrumentation:manage`.
- Settings: Configuration > Cytology > Instrumentation (two-tier since Phase 83; Phase 75 text said single global).
- Status: Built (Demo)
- Sources: svc cytology README Phase 83; `CytologyInstrumentationSection.tsx`.

### Country and laboratory rules (CLIA cap, CAP 5-year lookback, preliminary signature)
- What it does: Three features, each Automatic / On / Off per enterprise with optional facility override: US-only CLIA daily workload cap (default on for US labs only), CAP 5-year retrospective lookback (sign-out and on-screen card), and electronic signature on preliminary release (Automatic = required everywhere). With the cap Off, workload is still recorded in the ledger but doesn't block or reassign.
- Workflow: Admin; audited.
- Roles/permissions: `config:cytology-compliance:manage`.
- Settings: Configuration > Cytology > Country and laboratory rules.
- Status: Built (Demo)
- Sources: Config/Cytology README Batches 415, 533; `cytologyComplianceFeatures.ts`.

### CLIA workload cap with Screening Credit Units
- What it does: Each review gets a weight by review mode (primary manual 1.0, liquid non-GYN 0.5, FOV-assisted 0.5, FOV manual rescreen 1.5, pathologist review 0.0). Limit = assigned cap x active hours / 8, never above the cap (default 100; whole slides 1-100, clamped on read; 42 CFR 493.1274(d)(2)). A soft-brake banner appears when approaching; a save is refused when exceeded; a cap block returns the user's remaining in-progress cases to the pool; an escalation to a higher-weight mode is allowed over cap. Editing a saved review doesn't count the slide again. Ledger entry per save, audited.
- Workflow: Screener chooses Review Mode (hidden for pathologists); a hard block returns to the worklist.
- Roles/permissions: `config:cytology-workload-cap:manage` (also needed to change a person's own cap).
- Settings: Configuration > Cytology > Workload cap: enterprise default, facility override (can only lower), staff override; invalid values refused beside the field; add pickers hide existing overrides.
- Status: Built (Demo)
- Sources: svc cytology README Phases 34-36, Batches 574, 576, 578; `resolveCytologyWorkloadCapacity.ts`, `CytologyWorkloadCapSettingsSection.tsx`.

### Cytology workload counter
- What it does: On the worklist and screening page: slides counted against the cap over rolling 24 hours, number of reviews, slides left now and in a full 8 hour day, a bar marked at the limit so far, and words (Approaching / At / Over your limit). Computed exactly like the save-time check, rounded down to half a slide; refreshed after each save, every minute and when shown. Hidden when no jurisdiction rule applies (worklist uses the strictest cap).
- Workflow: Automatic.
- Roles/permissions: anyone with counted screening.
- Settings: cap cascade.
- Status: Built (Demo)
- Sources: i18n README Batches 572, 574; `cytologyWorkloadSummary.ts`, `CytologyWorkloadCounter.tsx`.

### Screening hours sign-off and screening-day start
- What it does: A "Today's screening hours" panel (once time is recorded; facility time zone) confirms in one click or Correct (hours, reason: screened at microscope / slide left open / other with note up to 200 chars). A correction more than 0.5 h away, or one turning an exceeded day into within-limit, is flagged for the supervisor. A sign-off made before more screening was recorded stops counting until re-confirmed. Yesterday can be signed off too (night shifts). Append-only and audited. The lab sets "screening day starts at" (0-23) with history. The browser timer is display only; the server will record screening events with its own clock.
- Workflow: Cytotechnologist or pathologist confirms at day end; supervisor reviews CYT-QA-05.
- Roles/permissions: `cytology:screening-hours:sign-off` (Pathologist, Fellow, Resident, Cytotechnologist); `config:cytology-workload-cap:manage` for day start.
- Settings: Configuration > Cytology > Workload cap.
- Status: Built (Demo). ScreeningHoursPanel, rules, saveScreeningDayStart and settings are wired in the cytology worklist; only server screening events and endpoints remain.
- Sources: `docs/architecture/CYTOLOGY_QC_API.md` §5; FEATURE_OVERVIEW (Batch 572, 574); `screeningHoursRules.ts`, `ScreeningHoursPanel.tsx`, `saveScreeningDayStart.ts`.

### Cytology-histology correlation window and SNOMED severity mapping
- What it does: Window anchored on collection date (fallback receipt, then sign-out; records which), default 180 days, set at enterprise, per jurisdiction rule and facility override (same screen is reused as the biopsy-to-resection window in System). Stored on the specimen at sign-out; a sweep (runs when the workspace loads) picks up later biopsies; a backfill gives older sign-outs a window. A System sub-tab maps histology SNOMED codes to a cervical severity (starts empty; duplicates refused; code not editable; no licensed SNOMED content shipped).
- Workflow: Admin sets; automatic.
- Roles/permissions: `config:cytology-histology-correlation:manage`, `config:cytology-severity-mapping:manage`, `config:biopsy-resection-correlation:manage`.
- Settings: Configuration > Cytology > Correlation window; SNOMED mapping sub-tab.
- Status: Built (Demo) — server sweep job (`cytology.histologyCorrelationSweep`) and customer-supplied SNOMED content Planned.
- Sources: Config/Cytology README Batches 452-453; svc cytology README Phases 63-65, Batches 452-453, 555.

### Cytology QC settings and QC rate cascade
- What it does: Random QC selection rates: one for negative results, one for non-negative, at enterprise, performing facility and staff level (staff beats facility beats enterprise) to raise QC for new hires. An override that sets no rate shows as inherited.
- Workflow: Admin edits.
- Roles/permissions: `config:cytology-qc-rates:manage`.
- Settings: Configuration > Cytology > QC Settings.
- Status: Built (Demo)
- Sources: svc cytology README Phases 7, 18, Batch 512; `resolveEffectiveCytologyQcSettings.ts`, `describeQcOverrideRates.ts`.

# C. CYTOLOGY QC AND QA

### High-risk patient algorithm and automatic random QC selection
- What it does: A specimen is high risk if any of 8 criteria: prior abnormal Pap (5 year lookback), prior cervical procedure, recent hrHPV positive, HPV 16/18/45, immunocompromised, in-utero DES exposure, abnormal bleeding, abnormal exam findings. Criteria with no data source stay undefined, not false. On a new primary screen: high risk sets a targeted_high_risk QC flag and skips random QC; otherwise the system rolls the negative or non-negative random rate and sets a random_selection flag with a toast. Not run on edits or later reviews; no manual random flag. A manual "Flag for High-Risk QC" button exists.
- Workflow: Automatic after primary save.
- Roles/permissions: none; `cytology:qc-flag:remove`.
- Settings: QC rate cascade.
- Status: Built (Demo)
- Sources: svc cytology README Phases 13, 18, 53-57; `resolveCytologyHighRiskStatus.ts`, `resolveCytologyRandomQcSelection.ts`.

### Cytology QC pool and shared rescreen queue
- What it does: A specimen qcFlag (random or targeted high-risk, who/when) keeps it in the QC pool until a matching QC review is recorded; the two reasons never cross-clear. The QC tile is a shared list of every flagged GYN specimen awaiting rescreen; cases the viewer primary-screened carry a "needs another screener" badge and an Ask a Colleague button (message drawer); a rescreen by the primary screener is refused (`QC_BY_PRIMARY_SCREENER`).
- Workflow: QC-bench cytotechnologist opens the QC tile (Worklist ?view=cytologyQc) and rescreens.
- Roles/permissions: `screen:cytology-qc-queue:open`, `cytology:qc-review:record`, `cytology:qc-review:bypass`.
- Settings: none.
- Status: Built (Demo)
- Sources: svc cytology README Phases 14, 18, Batch 440; `cytologyQueues.ts`, `resolveCytologyQcPoolMembership.ts`.

### Cytology QC rules engine and layered QC assignment
- What it does: Admin rules with criteria (jurisdiction, facility, provider, specimen, clinical risk, diagnostic scope), sampling mode (percentage, interval, fixed volume), tier, SLA and eligible reviewer roles. Evaluated by priority (higher number first); first match and sample wins; unset criteria never exclude; cases in formal consultation are skipped by the engine; sampling counters persist between sign-outs. Layering at sign-out: ROSE discrepancy, then the rules engine, then peer-review selection (passive flag only). One open QC assignment per specimen; a second trigger upgrades it (higher tier, earlier SLA, reason added, history line); a resolved assignment opens a new one. Eight seed rules in code (US 10% CT rescreen, 100% high-risk negatives, UK HPV+ 20%, EU path-to-path 2%, EU CT sign-out 10%, EU advanced-CT abnormal, AU/NZ 100% high-grade, onboarding first 50 cases shipped inactive, 100% unsatisfactory — README lists 8-10).
- Workflow: Automatic at sign-out; admin builds rules (add, update, deactivate, reactivate, remove, duplicate; duplicate starts inactive).
- Roles/permissions: `config:cytology-qc-rules:manage`.
- Settings: Configuration > System > Cytology QC Rules.
- Status: Built (Demo) — counters are in browser storage; server must own them and make the transaction atomic. Verified `signOutCytologyCase.ts` calls `resolveQcRuleEvaluation` and the upsert (older README said unused until Batch 501).
- Sources: `src/services/cytologyQc/README.md`; `CYTOLOGY_QC_API.md`; Batch 501; `CytologyQcRulesSection.tsx`, `mockCytologyQcRuleService.ts`.

### Cytology Peer Review Queue and QC review bar
- What it does: Unified reviewer queue sorted by urgency tier with tabs All / Escalations and Discrepancies / Routine and Random; shows "Selected by" reasons and SLA status (on time / approaching at 80% of window / breached). Actions: Assign to Me (not for the signer), Concurrence, Discrepancy (form in a shared modal), Open Case, Escalate (SLA-breached case back to queue, reason required), Supervisor bypass (justification, logged). The same verdict bar appears on the screening page and returns to the originating queue. The person who signed a case can never take or review its QC (always on). Eligible reviewer roles are stored and displayed but taking a review checks only self-review.
- Workflow: Worklist ?view=cytologyQc, or the case bar.
- Roles/permissions: `cytology:qc-review:record` (Pathologist, Fellow), `cytology:qc-review:bypass` (only holders see bypass).
- Settings: tier SLA on rules.
- Status: Built (Demo) (Batch 608). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: svc cytologyQc README; `CytologyQcQueuePage.tsx`, `CytologyQcCaseBar.tsx`, `useCytologyQcActions.ts`.

### Post-sign-out peer review (random and targeted)
- What it does: After sign-out, targeted selection (result rank 4 or more) takes priority; otherwise random selection uses the same 3-tier QC rate cascade. The flag clears only on a matching peer-review role review. A pathologist cannot peer review a case they signed. The reviewer enters an independent interpretation with the normal form.
- Workflow: Peer Review tile on the cytology worklist.
- Roles/permissions: `cytology:pathologist-review:take`, `cytology:review:record`.
- Settings: QC rates.
- Status: Built (Demo)
- Sources: svc cytology README Phases 59-60; `resolveCytologyPeerReviewTargetedSelection.ts`.

### 5-year retrospective lookback (CAP)
- What it does: When a patient is signed out with rank 4 or more (HSIL, AIS, malignant), every truly negative (rank 0) GYN cytology in the prior 5 years is flagged for re-review. Outcome categories: confirmed_negative, screening_error, interpretation_error, sampling_error, with corrective-action text. A 5-Year Lookback tile lists flagged cases; a banner on the case records the outcome and clears the flag.
- Workflow: Sign-out triggers; reviewer works the tile.
- Roles/permissions: `cytology:retrospective-review:record`.
- Settings: Country and laboratory rules switch (on for US by default).
- Status: Built (Demo)
- Sources: svc cytology README Phases 58, 60; `resolveCytologyFiveYearRetrospectiveLookback.ts`.

### Cytology-to-histology correlation
- What it does: At sign-out of rank 1 or more (ASC-US or worse) the app finds the patient's cases within the window (default 180 days, forward only) with a non-cytology specimen, stores them as candidates and lists them on the Histology Correlation tile. On the screening page each candidate shows computed cytology and histology diagnoses and outcome (concordant, minor, major, unresolvable) for one-click confirm, or a manual form; saved as a QA activity "Cytology-Histology Correlation"; Dismiss uses dismissedAsNotRelevant.
- Workflow: Reviewer confirms or dismisses on the screening page.
- Roles/permissions: `cytology:histology-correlation:record`.
- Settings: correlation window, SNOMED severity mapping.
- Status: Built (Demo)
- Sources: svc cytology README Phases 63-66; `resolveCytologyHistologyCorrelationCandidates.ts`, `sweepCytologyHistologyCorrelationCandidates.ts`.

### Follow-up tracking (cytology to histology, biopsy to resection)
- What it does: Tracks expected follow-up specimens. Abnormal cytology sign-out sets the window; for surgical, the pathologist ticks "follow-up specimen expected" at sign-out (or later on the report). Received = another case of the same patient has a matching specimen in the window (same site and side; no recorded site gives a "possible match" for lab confirmation). Status pending, due soon (default 30 days, 0 = off), overdue; closed by a recorded outcome (received elsewhere, patient declined, not clinically indicated, deceased, lost to follow-up, other with note). A daily sweep messages the signing pathologist, Lab Directors and QA Reviewers once for due soon and once for overdue. Clinician e-mail is manual only, if the facility allows. "Follow-up due" tiles on the pathologist worklist (own signed cases, hidden when zero) and the cytology worklist.
- Workflow: Sign-out modal / report page; Quality Assurance > Operations > Follow-up not received.
- Roles/permissions: `case:follow-up:expect`, `qa:follow-up:record`, `qa:follow-up-clinician:email`, `qa:follow-up:export`, `config:follow-up-tracking:manage`.
- Settings: Configuration > System > Follow-up tracking: warning days, clinician e-mail on/off and wording, enterprise + facility.
- Status: Built (Demo) — the browser runs the sweep when screens load; server job and endpoints are Planned; clinician e-mail delivery not verified.
- Sources: `FOLLOW_UP_API.md`; `src/services/followUp/README.md`; `followUpActions.ts`.

### Cytology QA reports (pillar)
- What it does: Quality Assurance has a top-level Cytology pillar; each report is a tile loading only when opened, with scope switching and cross-tenant audit logging. Reports: cytotechnologist statistical comparison CYT-QA-01 (±2 SD from peer ASCUS/LSIL ratio); 10% random rescreen, directed/high-risk rescreen, CT vs pathologist (overall agreement, major concordance, false-negative rate, upgrades/downgrades); Primary vs Final Diagnosis; Post-Sign-Out Peer Review; Secondary Screening Audit; Cyto-histologic correlation (Correlation_Rate, PPV_HSIL; CSV/XLSX and print; MRN column); 5-Year Retrospective Lookback (CYT-QA-03; view only); Unscreened slide backlog and TAT US-QA-02; workload tracking and CYT-QA-05; registry transmission audit. Agreement is classified exact / minor / major (false negative, false positive, high-grade skip) plus a separate adequacy discrepancy.
- Workflow: QA > Cytology.
- Roles/permissions: `qa:cytology-histology-correlation:export`, `qa:registry-transmission-audit:export`, other `qa:*` capabilities.
- Settings: scope and registry selector.
- Status: Built (Demo) — server-side aggregation Planned (`ICytologyQaReportService` boundary).
- Sources: QualityAssurance README Batches 425, 450, 451, 459, 483, 572, 574; svc cytology README Phases 6, 48-51, 61, 63-67, Batch 459; `CytologyQaTab.tsx`.

### Secondary screening audit
- What it does: Each QC and secondary-reviewer review writes a QA activity (GYN Cytology Secondary Screening) with concordance versus the primary screen, shown on a Secondary Screening Audit tile. No automatic CAPA from a single discordance.
- Workflow: Automatic on QC review save.
- Roles/permissions: QA capabilities.
- Settings: QA activity type configuration.
- Status: Built (Demo)
- Sources: svc cytology README Phases 3, 62; `gynCytologySecondaryScreeningQa.test.ts`.

### HPV and molecular QA reports
- What it does: ASC-US/HPV reflex concordance MOL-QA-03 (per CT, share of ASC-US that were HPV positive; 30-60% normal, below 30 under-calling, above 60 over-calling); HPV positivity monitor MOL-QA-01 (by testing site and indication with genotype breakdown, variance in percentage points; assay name not captured); molecular QC failure-rate MOL-QA-02 (default 5% threshold) and lot-to-lot Ct trend MOL-QA-04 (default about 1.0 delta-Ct); UK primary-HPV failsafe audit UK-QA-01 (HPV positivity, triage counts, inadequate rate per GB jurisdiction).
- Workflow: QA > Cytology tiles.
- Roles/permissions: QA capabilities.
- Settings: thresholds are defaults.
- Status: Built (Demo) (Batch 608). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: svc cytology README Phases 49, 68-71; `resolveCytologyHpvPositivityMonitorReport.ts`, `resolveCytologyMolecularQcFailureRateReport.ts`.

### Compliance and proficiency QA reports (EU matrix, PT/APAC)
- What it does: Trans-national compliance matrix EU-QA-01 (per country HPV primary vs co-test and internal non-conformity count; omits registry ID, specimen type and interval adherence). Proficiency testing: a challenge case is an ordinary case with `proficiencyTestContext`; an outbound PT submission payload is built (no known answer) and an inbound graded result (satisfactory, unsatisfactory, no_response) is validated against it; the APAC-QA-01 report applies "two unsatisfactory/no-response out of three consecutive events per provider triggers a deficiency". Three synthetic PT cases S26-PT001-003.
- Workflow: QA tiles; results arrive by event.
- Roles/permissions: QA capabilities.
- Settings: none.
- Status: Built (Demo) (Batch 608). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: svc cytology README Phases 68-69, 73; `resolveCytologyEuComplianceMatrixReport.ts`, `resolveCytologyApacProficiencyTestReport.ts`.

### Cytology QC compliance report
- What it does: Function aggregates tier/trigger breakdowns and per-reviewer discrepancy rates (shows undefined, not 0%, with no resolved data).
- Workflow: no screen found.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo) (Batch 608). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: svc cytologyQc README; `resolveCytologyQcComplianceReport.ts`.

### Abnormal severity flag from Bethesda review
- What it does: Reduces a review's interpretations to the highest suggestedAbnormalSeverity (advisory; shares the ranking used by synoptic abnormal trigger rules). Not displayed on a badge.
- Workflow: none.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo) (Batch 608). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: svc cytology README Phase 80; grep of `src/`.

# D. SCREENING AND CANCER REGISTRIES

### Cervical screening registry engine and dispatch at sign-out
- What it does: Signed-out GYN cytology is reported to national/regional programmes: 12 definitions (CSMS England/Wales, NICSP N. Ireland, SCCRS Scotland, CervicalCheck Ireland, PALGA Netherlands, oKFE Germany, CRCDC France, Cyto-Histo Register Belgium, NCSR Australia, NCSP Register NZ, KNCSP/KCCR Korea, provincial Canada via facility override; US has none). Only GYN specimens go; Non-GYN/FNA never. The engine decides eligibility, holds, readiness, mapping rows and payload; a result not ready is held and queued failed `REGISTRY_NOT_READY` (unmapped categories, missing/invalid patient identifier) rather than sent half-coded. Same path serves sign-out, correction (CORRECTION) and addendum (AMENDMENT). CSMS reason-for-study flag on first submission only. PALGA and Korea carry registry extensions (native CISOE-A score; MRN used where national ID not captured).
- Workflow: Automatic at sign-out; admin maps codes; fix holds in Registry Exceptions.
- Roles/permissions: `config:screening-registry:manage` (audited).
- Settings: Configuration > Cytology > Registry Reporting: per-registry code mappings, `requireMappedCodes` (on by default for mapping-table registries), `requirePatientIdentifier` (off by default).
- Status: Built (Demo). Engine, settings, queue, payloads and go-live panel are built and send through the dev receiver. Real endpoints and wire specs are external (verified or configurable).
- Sources: screeningRegistry README; svc cytology README Phases 27, 39-47, Batches 413, 414, 421; `screeningRegistryDefinitions.ts` (12 ids verified), `submitScreeningRegistryResult.ts`.

### Screening registry reporting settings and code mapping
- What it does: Per registry: jurisdictions, national identifier, coding, wire format, built-from-spec vs lab-configured, two hold settings, and a code-mapping table (category, field, registry code, text; "N of M mapped"; sent vs held). Code mappings are stamped with the template baseline version and flagged for review when a newer version touches them. Enterprise default plus facility override.
- Workflow: Admin Configuration > Cytology > Registry Reporting.
- Roles/permissions: `config:screening-registry:manage`.
- Settings: as above.
- Status: Built (Demo)
- Sources: Config/Cytology README Batches 414, 419, 423, 424; facilities README Batch 414; `resolveEffectiveRegistrySettings.ts`.

### Patient national identifiers and registry opt-out
- What it does: At Accession one input per national identifier of the facility jurisdiction (NHS number, BSN, PPSN, IHI; none for US) with a check-digit result; a failed checksum is kept as failedChecksum. Two opt-out checkboxes: screening programme (always excludes) and cancer registry (honoured only where Configuration says the jurisdiction honours it; otherwise overridden by statute with an audit note). Excluded cases are audited and queued failed `EXCLUDED_BY_CONSENT` (sign-out stands, never resent). A badge shows the opt-out on the patient line. Editable after accession (A08 sent to the engine) via Patient Registry Details from Registry Exceptions. Screening submissions key on the verified national ID, MRN (format-checked) as fallback. MPI intake from DEMOGRAPHICS_UPDATED / REGISTRY_CONSENT_UPDATED, newest wins.
- Workflow: Accessioner enters; edit later in the modal.
- Roles/permissions: `patient:national-identifier:record`, `patient:registry-consent:record`.
- Settings: Configuration > System > Cancer Registry Reporting `honoursPatientOptOut` (default false).
- Status: Built (Demo). Identifier inputs, checksum, two opt-outs, statute override and audit are built; only an HL7 consent source (an interface engine specification) is missing. REGISTRY_CONSENT_UPDATED handler exists.
- Sources: Common README Batches 417, 418, 425; registryConsent README; patients README; `evaluateRegistryConsent.ts`, `recordNationalPatientIdentifier.ts`.

### Registry go-live gate (validation vs production)
- What it does: Each registry moves Pending (needs data-sharing agreement) > Testing (synthetic suite: screening 3 cases, cancer 2; NILM, HSIL, unsatisfactory; breast 8500/3, colon 8140/3; patient ids `SYN-`) > Validated (validation record exported, JSON, audited). Instance role comes from `VITE_APP_ENV` (production = real data; unset = validation). A validation instance never sends a real case; production holds results ("Held: attestation required", `REGISTRY_LIVE_NOT_APPROVED`) until approved, then resends. Production: import the record, request go-live with eight pre-checks, approver acts in stated capacities with credential re-entry (signing action `registry-go-live`), permanent statement; can withdraw or Stop live reporting. A last boundary check refuses wrong-environment payloads (`DISPATCH_REJECTED`). Registry template versions vYYYY.Q.X: breaking changes hold from the effective date; minor changes hold 30 days only if the site customised something touched; local overlay (code mappings, identifier hold, adapter rules) needs Confirm reviewed.
- Workflow: Admin on the validation instance runs the suite; approver on production approves.
- Roles/permissions: `registry:live-register:approve` (Admin, Lab Director), `registry:test-suite:run`, `config:registry-go-live:manage`.
- Settings: approval settings (self-approval allowed by default, approvals required 1-3).
- Status: Built (Demo). RegistryGoLivePanel, send gate, synthetic suite and payload boundary are wired in the browser. Engine-side check, ForMedrixAI template publishing and real transmission are other-team work.
- Sources: `REGISTRY_GO_LIVE_API.md`; registryGoLive README; Config/RegistryGoLive README Batches 423, 424, 437; `registrySendGate.ts`, `syntheticTestSuite.ts`, `registryPayloadBoundary.ts`.

### Registry Exceptions worklist, resend and acknowledgements
- What it does: `/registry-exceptions` lists screening and cancer submissions needing a person: held (identifier/codes), held attestation required, delivery failed, rejected fixable/outright, ack overdue (no answer in 72 hours; escalation runs on load; undeliverable 72 h stops retries), conflict, revised after acceptance; latest version only; excludes consent exclusions and accepted. Filter chips with counts, findings and raw acknowledgement, Open case, nav and tile badge (read on mount, each minute and on focus). Re-validate and resend rebuilds from current data (still held: nothing queued; same content the registry rejected: refused as `unchanged`; same content otherwise: duplicate retry; changed: new version); Resend all runs the same checks; approving go-live resends held rows. Submission header carries submissionGuid, version, master transaction id, NEW / CORRECTION / AMENDMENT, environment. Capture as CAPA creates one open `def-registry-submission-failure` deficiency per submission. A REVISED message on an accepted submission raises `def-registry-revised-post-acceptance` until reviewed. Transmission audit CSV/export with no patient identifiers.
- Workflow: Open the page (nav badge), filter, fix identifiers/mappings, resend.
- Roles/permissions: `screen:registry-exceptions:open`, `registry:submission:resend`, `registry:revision:review`, `qa:registry-transmission-audit:export`.
- Settings: none.
- Status: Built (Demo) — registry delivery needs the server/engine; acknowledgement endpoint spec `REGISTRY_ACKNOWLEDGEMENT_API.md`, `registry.escalateStale` server job Planned.
- Sources: RegistryExceptionsPage README; registrySubmission README Batches 419-425, 550, 551, 555; `registryExceptionsService.ts`, `captureRegistryExceptionAsCapa.ts`.

### Cancer registry reporting at surgical sign-out
- What it does: At surgical sign-out only (never cytology), each specimen's ICD-O behavior digit is checked against implemented NAACCR exclusions (cervical CIS/CIN III, PIN III, skin BCC/SCC) and reportable cases are queued and dispatched as `CANCER_REGISTRY_REPORT` through the interface engine; sign-out is never blocked by a failure; mandatory-data holds. Thirteen registry definitions (NAACCR, CPAC, COSD, INCa, ADT/GEKID, AIHW, NZ, KCCR, NCRI, Public Health Scotland, NICR, NKR/IKNL, Belgian Cancer Registry) with jurisdictions, identifier, wire format, mandatory fields. A second dispatch for the same case is a CORRECTION version 2.
- Workflow: Pathologist signs out; dispatch is automatic.
- Roles/permissions: `config:cancer-registry:manage`.
- Settings: Configuration > System > Cancer Registry Reporting: enterprise registry, facility overrides, opt-out rule, per-registry go-live.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Registry wire formats per registry; licensed ICD-O-3 / ICD-11 terminology proxy.
- Sources: cancerRegistry README Batches 418-422, 456; `cancerRegistryDefinitions.ts` (13 verified); `dispatchCancerRegistryReportIfApplicable.ts`.

# E. AUTOPSY

### Autopsy case authority, temporary accession and authorization completion
- What it does: Two authority paths: forensic `statutory_judicial` (verbal order allows intake and refrigeration; a written order reference and date are needed before gross examination) and `hospital_consented` (jurisdiction only at intake; active consent needed for gross). The body can be received before authorization; accession status is temporary vs fully_authorized by the same criteria as the gate. The Authorization Completion form (modal, opened from a banner on the report page when the gate blocks) adds the written order or consent grant, shows what is on file and a live preview of whether submitting unblocks gross exam, and lists "Still required" fields. Autopsy intake fields appear inside the Accession page only when an autopsy specimen is picked.
- Workflow: Accession page autopsy section; report page banner > form > Submit (versioned `caseRouter.updateCase`). Voice "record authorization".
- Roles/permissions: none (clinical fact); fields via Field Requirements.
- Settings: Field Requirements > report page > Autopsy forms (locked: written order and date, consent time; scope optional).
- Status: Built (Demo)
- Sources: `src/components/Autopsy/README.md`; svc autopsy README Batches 456, 478-479, 383; `AutopsyAuthorizationCompletionForm.tsx`, `resolveAutopsyGrossExaminationGate.ts`, `resolveAutopsyAccessionStatus.ts`.

### Autopsy gross-examination legal hard stop and audited override
- What it does: Only a revoked consent hard-blocks gross examination; a narrowed one proceeds. The gate never blocks intake or refrigeration. Signing PAD/FAD is refused if the gate blocks (`AUTHORIZATION_GATE_BLOCKED`). A holder of the override capability supplies a written reason to sign past a blocked gate; recorded append-only (`gateOverrides`) and in the audit log (`AUTOPSY_GATE_OVERRIDDEN`); reason ignored if the gate is already open.
- Workflow: Banner button "Override & Sign" > reason prompt > signature.
- Roles/permissions: `autopsy:gross-exam-gate:override` (nobody by default).
- Settings: Admin assigns the capability.
- Status: Built (Demo)
- Sources: svc autopsy README Batches 478-479; AUTHORIZATION_API.md.

### Autopsy consent scope, narrowing, revocation and reinstatement
- What it does: Hospital consent status active > narrowed > revoked moves forward only (excluded organs union; retention permission only true to false). Two structured fields besides the free-text scope: Excluded Organs (matched to the organ code list) and "retention permitted". A warning banner shows when excluded organs appear among the specimens; a consent-scope check enforces them. Reinstatement is a separate action with a mandatory note and can restore active. Only the latest change is kept (no full history).
- Workflow: Report page of a hospital-consented case: Narrow or Revoke Consent / Reinstate Consent forms.
- Roles/permissions: `autopsy:consent:manage`, `autopsy:consent:reinstate`.
- Settings: none.
- Status: Built (Demo) — forms wired in `SynopticReportPage.tsx` (the DEMO_GUIDE sentence saying no screen exists is stale).
- Sources: svc autopsy README Batches 468, 469, 471; components/Autopsy README Batch 468; `recordAutopsyConsentStatusChange.ts`, `recordAutopsyConsentReinstatement.ts`.

### Consenting-relative priority hint
- What it does: Next to the free-text Relationship field at accession, shows the jurisdiction's priority order of consenting relatives (US UAGA pattern, UK HTA 2004, NZ Coroners Act 2006). Decision support only; US state variation not modelled.
- Workflow: Accession page autopsy section.
- Roles/permissions: none.
- Settings: none (fixed).
- Status: Built
- Sources: svc autopsy README; `resolveConsentingRelativePriority.ts`, `formatConsentingRelativePriorityHint.ts`.

### Autopsy forensic chain of custody
- What it does: Append-only custody log of transfers (item, holder, recipient type: pathology, medical examiner, law enforcement, funeral home, family, other; released by, received by) for forensic cases; current custodian derived from the last entry; entries can link to a toxicology order; audited (`AUTOPSY_CUSTODY_TRANSFER`).
- Workflow: Report page custody list and Record Custody Transfer form.
- Roles/permissions: `autopsy:custody:transfer`.
- Settings: none.
- Status: Built (Demo)
- Sources: svc autopsy README Batches 468, 475; `recordAutopsyCustodyTransfer.ts`.

### Autopsy toxicology orders
- What it does: Order toxicology with a required specimen barcode; the order sets the case ancillary hold, a result clears it only if it is still the hold that order started, cancel only 'ordered' orders. Log shown on the report page.
- Workflow: Report page order form, Record Result, Cancel Order.
- Roles/permissions: `autopsy:toxicology:order`, `:result`, `:cancel`.
- Settings: none.
- Status: Built (Demo) — SNOMED mapping deferred.
- Sources: svc autopsy README Batches 469, 471, 475; `orderAutopsyToxicology.ts`.

### Autopsy organ retention (HTA jurisdictions)
- What it does: Only for HTA/NZ jurisdictions (GB_EW, GB_NIR, GB_SCT, NZ). Retention tier select with reason; cannot exceed tier 0 if consent forbids retention or is revoked. Retention detail (recipient/location) is one current record; disposal records recipient, method, date, note and certificate. There is no history of retention-location changes.
- Workflow: Report page organ-retention section.
- Roles/permissions: `autopsy:retention-tier:record`, `autopsy:retention-detail:record`, `autopsy:retention-disposal:record`.
- Settings: none.
- Status: Built (Batch 611). Autopsy organ retention keeps a custody history of every holder or location change with who and when; earlier records keep their single entry.
- Sources: svc autopsy README Batches 468-472, 499; `resolveHtaApplicability.ts`.

### Autopsy organ tags and organ-driven grossing template
- What it does: Case-level append-only organ tags: organ (31-code vocabulary), status normal / abnormal / not_examined, optional finding, who/when. The Autopsy Grossing synoptic (7 sections, 98 fields, lexicon term keys) shows only sections for the organs picked at accession (Organ(s) Included; keyword fallback on Import from Order; head-and-neck scope narrows External Examination); tiered required fields hard-block sign-out. The template is registered in_review (not clinically reviewed). BMI recomputes from weight and height (field disabled). The cardiac sectioning protocol gets a white cassette by routing rule `route-autopsy-cardiac-protocol`. The first specimen (A) is treated as the body.
- Workflow: Accession picks organs; report page Organ Tags section.
- Roles/permissions: `autopsy:organ-tag:record` (Pathologist, Fellow, Resident, PA).
- Settings: Protocol Dictionary; cassette routing rules.
- Status: Built (Demo) — template content not expert reviewed.
- Sources: Protocols README (PS-272); svc autopsy README Batch 478; `autopsy_gross_examination.json`, `recordAutopsyOrganTag.ts`, `getMainBodySpecimen.ts`, `calculateAutopsyBodyMassIndex.ts`.

### Autopsy PAD/FAD sign-out and signing authority
- What it does: PAD (preliminary) never changes case status; FAD (final) finalizes. Residents and provisional hires route to countersign; others are checked with `canFinalizeCase` (lab overrides win; country profile from the case's legal jurisdiction). Forensic cases also need an active jurisdictional appointment (credential FORENSIC_AUTOPSY_SIGNOUT, from MEDICOLEGAL_APPOINTMENT or UK_HO_REGISTERED_FORENSIC_PATHOLOGIST) with no admin override. Held through the release delay with Recall (PAD cannot be recalled after FAD is signed). Versioned: refused if content changed. Mismatch check runs before FAD. PAD publishes a PRELIMINARY and FAD a FINAL report-released event (print/delivery rules apply); the ORU R01 carries autopsy sections from the matching snapshot; countersign-pending signs don't publish.
- Workflow: Report page Sign PAD / Sign FAD with signature confirmation.
- Roles/permissions: signing authority; staff credentials via `config:staff-access:assign`.
- Settings: Staff > Jurisdictional credentials and appointments; countersign types; release delay.
- Status: Built (Demo) — sub-national (county/state) appointments Planned; autopsy release events covered by unit tests only, PAD release not covered by tests.
- Sources: svc autopsy README Batches 331, 458, 534-535; svc staff README; `signAutopsyReport.ts`, `resolveForensicSignOutAuthority.ts`, `buildOruR01Payload.ts`.

### Autopsy body release
- What it does: Release requires a signed PAD (not FAD) and no active ancillary hold; it does not block on organ retention. Records who released and who received (required), appends an external release location to the body specimen history and a final custody entry (forensic) in one versioned save; audited. A "Ready for Body Release" banner appears only when the gate allows and the body isn't already released; blocked reasons (pad_not_signed, ancillary_hold_active) are shown translated.
- Workflow: Report page Autopsy Body Release form; voice "release body".
- Roles/permissions: `autopsy:body:release`.
- Settings: Field Requirements > Autopsy forms.
- Status: Built (Demo)
- Sources: svc autopsy README Batches 469, 495; `releaseAutopsyBody.ts`, `AutopsyBodyReleaseForm.tsx`.

### Autopsy case timeline
- What it does: Read-only, newest-first timeline merging 16 event kinds: orders, consent changes, custody, toxicology, retention, disposal, hold, PAD/FAD, addenda, organ tags and gate overrides.
- Workflow: Report page above the autopsy sections.
- Roles/permissions: none extra.
- Settings: none.
- Status: Built (Demo)
- Sources: svc autopsy README Batches 476, 478; `AutopsyCaseTimeline.tsx`, `buildAutopsyCaseTimeline.ts`.

### Autopsy worklist tab, badges and TAT/SLA target
- What it does: Autopsy branch tab on the Worklist grouping autopsy cases with divider labels; each row shows case authority, active ancillary hold, PAD/FAD signed, and an "SLA" tooltip chip with the jurisdiction's static turnaround target (range or fixed figure) also next to the report-page status badge. There is no elapsed-time or on-track/overdue calculation, the lookup is not configurable and the formatter text is English-only. Three demo autopsy cases (A26-4660..4664).
- Workflow: Worklist > Autopsy tab.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo) (Batch 610). The autopsy worklist chip and report status badge show On track / Due soon / Overdue for PAD then FAD against the jurisdiction target, and admins override autopsy targets in TAT configuration. Public holidays are not counted in working-day targets.
- Sources: Worklist README Batch 477; svc autopsy README Batches 456, 477; `AutopsyWorklistBadges.tsx`, `formatAutopsyTatSlaSummary.ts`, `resolveAutopsyTatSlaMatrix.ts`.

### Mortuary storage occupancy and Asset Location Dictionary
- What it does: Admin defines locations (mortuary racks/freezers, workstations, archive shelves; two mortuary slots seeded). A "Mortuary Storage Occupancy" tab shows real-time occupancy: a slot is occupied when it is a body specimen's most recent location; moving the specimen frees it. A location unknown to an inbound LIS event creates an Unverified auto-created entry (exact case-insensitive match only) for admin review.
- Workflow: Configuration > System > Lab Materials and Workflows.
- Roles/permissions: `config:asset-locations:manage`.
- Settings: Asset Location Dictionary.
- Status: Built (Demo) — verified `resolveMortuaryStorageOccupancy` is used by `AssetLocationDictionarySection.tsx` and the Occupancy tab key exists.
- Sources: assetLocation README; svc autopsy README; `mockAssetLocationDictionaryService.ts`.

### Autopsy permissions and configuration search
- What it does: Separate keys per action (body release, custody transfer, toxicology order/result/cancel, retention tier/detail/disposal, consent manage/reinstate, organ tag, gross-exam gate override); granted to every case-access role except gate override (nobody) and organ tag (Pathologist, Fellow, Resident, PA). Configuration search for "autopsy" or "mortuary" finds Protocol Dictionary, Asset Location Dictionary and Specimens.
- Workflow: Role Dictionary.
- Roles/permissions: `autopsy:*`.
- Settings: Role Dictionary.
- Status: Built (Demo)
- Sources: authorization README Batches 383, 468, 469, 478, 499; `constants/configSearchIndex.ts`.

### Autopsy three-tier BI/reporting dashboards
- What it does: PS-261 section 2.6.3 dashboards.
- Workflow: n/a
- Roles/permissions: n/a
- Settings: n/a
- Status: Built (Demo) (Batch 610). Autopsy dashboards at case, department and enterprise level show turnaround, consent, organ retention and cause of death from browser-side demo data labelled Simulated. Waiting on the server side: autopsy data from the API server.
- Sources: svc autopsy README.

# F. MOLECULAR

### Molecular Workspace (tabbed home)
- What it does: Single `/molecular` entry (Home > Pathology Workspace > Molecular Workspace) with five tabs: Order Queue, Worklist (draft batches and plates), Active (active and awaiting results; default), History (completed, aborted, superseded), QC and Specimen Association. Back to Batches from the plate builder lands on the matching tab. Worklist header actions: + New Batch, Extraction Racks, Control Rules. A batch whose instrument has an open malfunction or overdue maintenance/calibration is shown red-tinted.
- Workflow: Choose tab.
- Roles/permissions: `screen:molecular:open`.
- Settings: Equipment register.
- Status: Built (Demo) — instrument is simulated; real instrument interface needs the server/vendor spec.
- Sources: MolecularWorkcenterPage README; `SignedInApp.tsx` lines 199-203; `MolecularWorkcenterPage.tsx`.

### Plate builder: batch creation and well layout
- What it does: `/molecular-batch/:batchId`. Create a batch: assay (Diagnostic Catalog category Molecular), name, analyser (equipment register), deck slot, reagent lots; click a well to assign type (NTC, PTC high/low, calibrator, patient), enter control lot and expiry, scan or type specimen barcode, aliquot volume; auto-fill row- or column-major. Plate formats 6/12/24/48/96/384/1536 and 8/12-well strips (no rotors); row labels continue AA, AB past Z. A patient well without a specimen is refused; Create stays disabled until complete. A created batch opens view-only (filled wells can be selected to view sample, accession, order, control). Manual specimen entry when a scan fails. Demo seeds: HPV runs on Panther 2 (running, failed positive control low), a rack, an EGFR draft plate.
- Workflow: Pick assay, build layout, scan specimens, Create; voice "create plate".
- Roles/permissions: `screen:molecular:open`.
- Settings: Field Requirements > Molecular plate builder (locked: assay, name, instrument, control well lot/expiry, patient-well specimen; switchable: deck slot, reagent lot, aliquot volume).
- Status: Built (Demo)
- Sources: MolecularBatchPage README; molecular README Phases 1-2, 16, 22, 23, Batches 356, 358, 405; `plateBuilderWells.ts`.

### Assay control rules and reagent-lot gating
- What it does: Per assay (chosen from the catalog), required controls are marked fixed (specific well) or random (presence only), optional allowed sample-rack deck slots; batches are checked live and at create; seeds include HPV and EGFR rules. A batch is blocked if any reagent lot is expired, failed or lacks QC sign-off (reagent types: extraction buffer, master mix, primer/probe, detection reagent, positive and negative control), with specific reasons; every control/calibrator well needs a non-empty lot and unexpired expiry. The instrument picker flags an analyser with an open malfunction or past-due maintenance in red (flag only, not blocked); a wrong deck slot is refused.
- Workflow: Admin on `/molecular-control-rules` (delete asks first); live feedback while building.
- Roles/permissions: `config:molecular-control-rules:manage` (Admin default).
- Settings: Molecular Control Rules page.
- Status: Built (Demo)
- Sources: molecular README Phases 16, 22, Batches 356-361, 406, 467; `resolveMolecularReagentLotGating.ts`, `MolecularControlRulesPage.tsx`.

### Scan-verified worklist dispatch and inbound run results
- What it does: Dispatch requires both the plate and deck-location barcodes to match and the device's station to match the instrument's station, then POSTs the worklist to `/api/v1/events/molecular-worklist`, sets `worklistDispatchedAt` and marks orders IN_RUN. Network and non-2xx errors are shown honestly. Inbound results (per-well Ct/RFU) are matched by `batch_uuid` (idempotent); `controls_passed` is authoritative (false forces BLOCKED even if review_status says AUTO_PASSED); a blocked run shows a warning banner and per-well table; results go to the order engine. Dispatch is hidden on superseded batches.
- Workflow: Dispatch Worklist > scan both > Confirm Dispatch; technologist views results; run Trace on a specimen.
- Roles/permissions: none stated.
- Settings: instrument station linkage in the equipment register.
- Status: Built (Demo) (Batch 608). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: POST /api/v1/events/molecular-worklist endpoint; interface engine posts inbound run results.
- Sources: molecular README Phases 3, 9, 17, Batches 356-358, 450, 467; `dispatchMolecularWorklist.ts`, `processInboundMolecularRunResults.ts`.

### Specimen movement history and trace
- What it does: Each scan into a well records a movement (vial to well, or vial to rack to well) with user and station. "Trace" assembles plate UUID, deck location, instrument, reagent lots, batch creator, movement history and result for a specimen UUID or accession.
- Workflow: Trace on the results table.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo)
- Sources: molecular README Phases 8, 10; `resolveMolecularHistoricalTrace.ts`.

### Plate Clone and Supersede
- What it does: Replaces editing a created batch: clones the layout (control wells with lot info carry over; patient specimens and movement history cleared and must be re-scanned), runs the same gating, marks the original `superseded` with who/when/why. Reason required; one-shot; all-or-nothing; deck slot dropped if no longer valid; banners link both ways.
- Workflow: Clone and Supersede panel with typed reason.
- Roles/permissions: `molecular:batch:supersede`.
- Settings: Field Requirements (reason locked).
- Status: Built (Demo)
- Sources: molecular README Phase 20, Batch 405; `mockMolecularBatchService.cloneAndSupersede`.

### Extraction racks: list, loading and placement on instrument
- What it does: `/molecular-rack` lists racks (loading, needs sample IDs, on an instrument and slot). New rack takes a physical barcode (3-40 chars, unique; blank auto-generates `RACK-MOLE-`). Scan or type tubes into linear positions (occupied refused, auto-advance), recording primary_vial to secondary_rack movement; a tube without accession is amber and a line names positions missing one. Place on instrument: choose instrument, optional assay, deck slot (required only where more than one fits); "Scan deck position" reads `LOC-INST-<instrument>-<slot>`; wrong slot, a tube scanned, or an inactive/unknown analyser warns and blocks. Re-place allowed; shows where/who/when. Reusable hardware racks are tracked Available / In Use so a rack cannot be on two active batches.
- Workflow: Create rack, load, place; "place rack" by voice.
- Roles/permissions: `screen:molecular:open`.
- Settings: Field Requirements "molecularRack" (rack barcode, sample ID per tube, instrument, slot); equipment deck layouts; control rule allowed sample-rack slots.
- Status: Built (Demo)
- Sources: MolecularBatchPage README Batches 406, 407; molecular README Phase 10; hardwareContainers README; `deckSlots.ts`, `RackPlacementPanel.tsx`.

### Molecular barcodes and labels
- What it does: Generates SPEC-YYYYMMDD-XXXXXXXX, RACK-MOLE-XXXXX, PLT-[Assay]-YYYYMMDD-XXX, PLT-[UUID]:[RowCol], BATCH-YYYYMMDD-XXXX, LOC-INST-[ID]-[POSITION]. Labels: specimen container (2.0x1.0 in DataMatrix), plate and rack (3.0x2.0 Code128), deck location; QZ Tray (ZPL) with browser-print fallback; printer profiles chosen per label type.
- Workflow: Print buttons in the plate builder view-only mode.
- Roles/permissions: `config:print-settings:manage` (settings).
- Settings: Print Settings: molecular, container and requisition printer-profile dropdowns.
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: PathScribe Agent program (PS-52).
- Sources: molecular README Phases 4-7; utils/labels README.

### Molecular in-house order engine and Order Queue
- What it does: Orders move ORDERED, QUEUED, PLATE_ASSIGNED, IN_RUN, RESULTED, CANCELLED with routing IN_HOUSE or SEND_OUT (in-house only if the test lists the lab). Order Queue tab: select queued orders of one test, pick a draft plate, Assign (binds to free wells in row order skipping control positions, all or nothing); per row Remove from plate, Re-route (to send-out), Cancel. Results fill the bound synoptic question; on a signed-out case they create an addendum draft, not a change. Re-validation forces re-route if the lab stops running the test. The queue re-reads live (topic `molecularQueue`), keeps the selection, and drops orders that left. Demo buttons (positive/negative, reference-lab result) only in demo builds.
- Workflow: Order Queue tab > select > Assign.
- Roles/permissions: `molecular:order:assign-plate`, `molecular:order:cancel`.
- Settings: test `inHouseFacilityIds` in the Stain Dictionary.
- Status: Built (Demo) — instrument simulated, server contract `MOLECULAR_ORDERS_API.md` Planned. Note: the standalone `/molecular-order-queue` route is gated by the `configuration` screen and reached from Configuration > Demo Reset (older READMEs say Home tile; code moved it, Home.tsx comment).
- Sources: molecularOrders README Batches 467, 562; MolecularOrderQueuePage; `molecularOrderEngine.ts`; `SignedInApp.tsx` line 220.

### Send-out molecular orders and reference labs
- What it does: A send-out line names its reference lab, chosen from the test's approved labs or any active reference-lab facility; default from the Stain Dictionary test default or its single approved lab (no per-lab preferred mapping). Dispatch moves the order to IN_RUN "At the reference lab"; a referral batch carries an order only when destination, requested test and accession match; coded results apply by order id or accession+test with identity check, else report-only. Add-on molecular lines choose in-house (only where the performing lab runs the test) or send-out. External Referral batch completion enqueues the outbound manifest and tracking record. Demo labs: Summit Molecular, Pacific Genomics, Great Lakes Cytogenetics.
- Workflow: Order Queue Set lab; referral batch scan > complete.
- Roles/permissions: `molecular:order:set-lab`.
- Settings: Stain Dictionary molecular tests (approved labs, default lab, "Run in-house at"); facilities with `reference_lab` role.
- Status: Built (Demo). Add-on molecular lines ingest into the molecular order engine; lab choice, referral dispatch to IN_RUN and a demo send-out result (simulateSendOutResult) exist. Inventory text is stale; engine queue is external.
- Sources: molecularOrders README Batch 467b; pages AddOnOrderPage README; facilities README; batches README Batch 467b.

### Molecular outbound order queue (HPV and instrument)
- What it does: Queue of outbound orders `order.molecular` (HPV co-test, reflex genotyping) and `order.instrument` (the liquid-based processor chosen from Equipment when a Liquid-Based Cytology Processing batch is made; Batch 739: no fixed vendor). Triggers: accession of a specimen whose protocol task has `sendOutboundOrder`; a positive standalone high-risk HPV result; creating a Cytology Processing batch. Fire-and-forget, statuses QUEUED / SENT / FAILED with retry codes. Viewer lists newest first with a demo panel (queue an HPV co-test order, simulate an inbound HPV result on seeded case S26-5003); no retry button.
- Workflow: Automatic; viewer at `/molecular-order-queue`.
- Roles/permissions: `configuration` screen gate.
- Settings: Protocol PathwayTask `sendOutboundOrder`.
- Status: Built (Demo) — HL7 delivery needs the interface engine.
- Sources: molecularOrders README Batches 406, 457; `mockBatchService.ts`.

### Molecular QC and specimen association view; inbound batch event
- What it does: Read-only tab listing externally sourced (HL7) molecular instrument QC runs and, per run, the cytology specimens linked via `Specimen.cytologyScreening.molecularRunId`. Created only by the inbound batch event (idempotent; per-specimen outcomes applied / case-not-found / specimen-not-found); never by hand. MRN column is PHI-tagged.
- Workflow: Molecular Workspace > QC tab.
- Roles/permissions: `screen:molecular:open`.
- Settings: none.
- Status: Built (Demo) — inbound feed simulated (mock `MolecularQcRunRecord` service); the svc README's `/molecular-batch-management` route and Home tile are stale (no such route; it is the QC tab).
- Sources: MolecularBatchManagement README; svc cytology README Phase 72; `processInboundMolecularBatchEvent.ts`.

### Molecular result binding to synoptic questions and sign-out warning
- What it does: A choice question can be bound to an in-house molecular test ("Filled from in-house molecular test", with positive and negative meanings). Bundled: lung adenocarcinoma EGFR from EGFR PCR; colorectal BRAF V600E, KRAS, NRAS, MSI (positive = MSI-H, negative = MSS, MSI-L by hand); breast HER2 ISH from HER2 FISH. A result fills only an empty question; a different existing answer is never overwritten and shows a delta notice; source recorded per question. Sign-out warns when answers still differ from their molecular result. A template-driven biomarker panel shows marker groups on the synoptic page (the AI prompt's biomarkers remain breast-only).
- Workflow: Admin binds in the Synoptic Editor; answers pre-fill when the result lands.
- Roles/permissions: draft/template capability.
- Settings: Synoptic Editor field settings; `markerGroup` metadata.
- Status: Built (Demo) — AI narrative biomarkers breast-only (Partial for non-breast).
- Sources: Protocols README Batch 467; templates README Batches 467/467b; molecularOrders README (`molecularSignOutCheck.ts`); orchestrator README.

### Molecular add-on orders from the case
- What it does: Pathologist add-on order page lets a molecular line be in-house or send-out; each saved in-house line becomes a molecular order in the Molecular In-House Queue; send-out lines need a reference lab. Order tracking dashboard derives a 5-stage status (Requested, Block Retrieved, Cut/Pending Stain, Stained/QC, Checked Out/Scanned) with Mark Block Retrieved.
- Workflow: Report header Add-on order > pick blocks > build lines > submit.
- Roles/permissions: `screen:add-on-orders:open`, `add-on:order:place` (Pathologist, Fellow, Resident).
- Settings: Field Requirements "addOnOrder".
- Status: Built (Demo)
- Sources: AddOnOrderPage README; addOnOrders README Batch 467.

# G. INTRAOPERATIVE, FROZEN SECTION AND OR SUITE

### Intraop pre-check queue (frozen section capture)
- What it does: Bench-side capture before formal accession. One session = patient / OR / surgeon; specimens in a session progress separately. Mobile start (facility and room pickers, OR, surgeon, Quick Gross, frozen diagnosis, touch-prep skip note); desktop merge queue for unlinked sessions; spell check in the pathologist's language. Phone vs narrow desktop is detected (desktop-view override). Frozen diagnosis rendered time is recorded. Gross photo capture in the Quick Gross step uploads to the active Gross Imaging vendor and stores only the returned URL; refuses if no vendor has a base URL.
- Workflow: Home > Intraop Queue (`/intraop-queue`) capture form.
- Roles/permissions: `screen:intraop-queue:open`.
- Settings: Field Requirements > Intraop (locked: patient name, MRN, identity confirmation, surgeon, specimen label, Quick Gross; OR number switchable); Gross Imaging vendor base URL.
- Status: Built (Demo). Queue and capture work; the camera barcode scanner is now wired (BarcodeScanner), so the inventory note is stale. Photo upload goes to the mock vendor service.
- Sources: intraop README; pages README (IntraopQueuePage, Batches 342, 397, 399); imageAssociation README; `IntraopQueuePage.tsx`, `deviceDetection.ts`.

### Intraop merge on accessioning
- What it does: After a new case is accessioned, the app looks for a matching Intraop Queue entry (fuzzy: same surname, same surgeon, within 90 minutes; high confidence first, then closest in time) and offers a merge; non-blocking, declining leaves the entry in the queue. Merge carries receiver, role, read-back, critical decision and reason into the case's critical result record.
- Workflow: Prompt after submit; Accession page auto-suggests.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo)
- Sources: intraop README; `IntraopMergePromptModal.tsx`.

### Verbal report of frozen results and read-back
- What it does: Logs recipient (type-to-search: session surgeon, then physician directory; any name accepted), role (large buttons), mandatory read-back, critical-result tick (suggested by the dictionary, decided by the pathologist), system-clock time. A critical result to anyone other than the operating surgeon needs a "Surgeon unavailable" reason (quick buttons; "Other" needs a note of at least three real words). Incomplete input is refused (`VERBAL_REPORT_INCOMPLETE`); audited.
- Workflow: Pathologist fills the form on the Intraop page (also on phone) and taps Log.
- Roles/permissions: no capability of its own; anyone who can use the Intraop page.
- Settings: Field Requirements > Intraop.
- Status: Built (Demo)
- Sources: intraop README Batch 399; `VerbalReportForm.tsx`, `verbalReport.ts`.

### Dictating the verbal report
- What it does: "Dictate the report" box (mic or typing) and "Fill in from dictation" propose recipient, role, read-back and a reason. AI first (the organisation's model; patient name, MRN, DOB replaced with [PATIENT] before sending; jurisdiction AI vendor policy applies), keyword rules as fallback. Read-back is proposed only if stated and not negated; reasons are only highlighted; nothing entered is overwritten; time never taken from speech. Filled fields are tagged "From dictation" / "Mentioned"; log records the engine used.
- Workflow: Pathologist dictates, reviews, logs.
- Roles/permissions: none extra.
- Settings: organisation AI model.
- Status: Built (Demo)
- Sources: intraop README Batches 400, 536; `parseVerbalReportDictation.ts`.

### Intraoperative critical results dictionary and critical notification record
- What it does: Admin dictionary of critical findings (name, description, match terms, preliminary categories; add, edit, deactivate). Session frozen results are matched by category or term, negation- and uncertainty-aware (negation within four words in the same clause clears it; "cannot be ruled out", "suspicious", "possible" keep it); in doubt it flags and the pathologist decides. At sign-out the critical-findings window records an append-only critical result notification (who, method, read-back, recipient role, decision, surgeon-unavailable reason); several per case allowed (frozen callback then final). A public link page `/critical-alert/:token` shows only accession, physician name and link status (token expires, 7 days in seed).
- Workflow: Admin edits in Configuration; pathologist records.
- Roles/permissions: `config:intraop-critical-results:manage`.
- Settings: Configuration > System > Intraoperative critical results.
- Status: Built (Demo) — the link page is a simulation; production flow is the physician's EHR SSO.
- Sources: intraop README Batch 399; clinical README; `matchIntraopCriticalResults.ts`, `CriticalAlertReferencePage`.

### OR Suite dashboard (wall display)
- What it does: Public unauthenticated kiosk page `/or-suite-dashboard` listing active OR requests: tissue arrival, pathologist assignment, workflow step from milestones, frozen diagnosis. Visual only, no audio. Four row states (In Progress, Completed awaiting dismissal, Dismissal pending, Dismissed); 3-pulse flash when a diagnosis first appears; Multi-Suite Overview excludes other locations and merged sessions. A Start demo mode seeds four fake sessions (normal, warning, overdue, completed) advancing every 25 s, labelled "Demo mode - not real patient data".
- Workflow: Terminal bound to a location shows rows.
- Roles/permissions: public by design.
- Settings: OR Suite Terminals.
- Status: Built (Demo) — route verified as `/or-suite-dashboard` (a page README says `/or-suite`; no such route).
- Sources: intraopDashboard README; `SignedInApp.tsx` line 169; `OrSuiteDashboardPage.tsx`.

### OR terminals, quick PIN and case dismissal
- What it does: A physical display logs in as a Station Identity bound to one location (remembered in the browser). Dismiss Case is two-step with a mandatory surgeon read-back checkbox and is refused without a rendered frozen diagnosis; PIN resolves an OR-staff user for attribution (refuses lab-staff PINs; role `or-staff`); logs `case_dismissed` with accession/OR number, sign-off time, dwell time, read-back, final preliminary text and total turnaround. Every OR event goes to a timestamped OR event log and the audit log. Badge/RFID reader is not built.
- Workflow: Admin creates a terminal (facility, then location); staff enter PIN in the dismiss modal.
- Roles/permissions: `config:or-suite-terminals:manage`.
- Settings: Configuration > System > OR Suite Terminals; `quickAuthPin` on the Staff screen.
- Status: Built (Demo). PIN, station identity, two-step dismissal and event log are built (OrSuiteDashboardPage, dismissFromBoardWithAudit). Only badge/RFID reader hardware is missing.
- Sources: intraopDashboard README Batch 589; `resolveStaffByQuickAuthPin.ts`, `dismissFromBoardWithAudit.ts`, `mockOrEventLogService.ts`.

### Intraop live updates and OR status badge
- What it does: Each intraop write announces an event (session.created, specimen.added, specimen.progressed, diagnosis.rendered, verbal.reported, specimen.dismissed, session.merged) carrying ids only. With the server hub every board updates (target under 500 ms); without it, other windows of the same browser update instantly and others by polling every 15 s (60 s when live). A header badge shows Live, Local updates, Connecting/Reconnecting or Offline; larger on the wall display; visual only.
- Workflow: Automatic.
- Roles/permissions: none.
- Settings: SignalR hub address in deployment config.
- Status: Built (Demo). Badge, local cross-window updates and 15 s/60 s polling work with no server; the SignalR hub is the only missing piece.
- Sources: intraop README Batch 342; LiveUpdates README; `useLiveIntraopUpdates.ts`.

### Frozen section STAT turnaround clock
- What it does: Each active specimen row on the OR Suite board shows elapsed time as MM:SS since the specimen's tissue arrival, coloured normal, warning (5 minutes or less remaining) or overdue (target of 20 minutes reached). It is computed in the browser from the absolute arrival timestamp by a one-second per-row timer, so a dropped connection never freezes it. When a frozen diagnosis is entered the row freezes at the arrival-to-diagnosis time, flashes three times once, and shows as completed until dismissed. Merged sessions and dismissed specimens are not on the board. The same arrival-to-diagnosis interval feeds the Quality tab of My Contribution.
- Workflow: (1) Intraop staff or the pathologist adds a specimen to a frozen section session in the Intraop Queue (the specimen's arrival time is stamped then; `addSpecimen` verified, first-specimen stamp on session creation Unverified). (2) The OR terminal's board (`/or-suite-dashboard`, bound to a theatre) lists the specimen with a running clock. (3) The pathologist renders the frozen diagnosis in the Intraop Queue; the clock stops at that moment and the row turns to completed. (4) OR staff dismiss the row after the surgeon's read-back (see OR board dismissal).
- Roles/permissions: viewing: none (public wall route, bound to a terminal; see OR terminals). Dismissal uses a quick-auth PIN by OR staff. Entering the diagnosis follows the intraop capabilities (not checked in this entry, Unverified).
- Settings: no admin screen; target 20 minutes and warning 5 minutes are code defaults (`DEFAULT_INTRAOP_TARGET_MINUTES`, `DEFAULT_INTRAOP_WARNING_MINUTES_BEFORE_TARGET`); the functions accept overrides but the board calls them without any.
- Status: Built (Demo) (Batch 610). Admins set the frozen section target and warning minutes per facility, read by the OR dashboard clock. Nothing waits on another team.
- Sources: services/intraopDashboard/resolveIntraopTatStatus.ts, resolveOrBoardRowDisplayState.ts, resolveActiveIntraopRequestsForLocations.ts; pages/OrSuiteDashboardPage.tsx; services/intraop/mockIntraoperativeService.ts.

### Frozen-versus-final discordance and reconciliation
- What it does: At sign-out a case with a merged intraop frozen specimen (not deferred) opens the reconciliation modal and holds sign-out until resolved, if facility concordance settings allow. Concordant stores categories and diagnoses; discordant adds delta, impact, root cause, comment; high impact needs escalation. Recorded as a QA activity "Frozen vs Final Correlation"; shows under Contribution > Quality and Quality Assurance > Intraoperative Linkage / Discordance and Reconciliation. Fields follow Field Requirements; voice "record discordance".
- Workflow: Pathologist resolves the modal at sign-out.
- Roles/permissions: none stated.
- Settings: Field Requirements; facility concordance review settings; Configuration > QA activity types.
- Status: Built (Demo)
- Sources: quality README Batch 382; intraopDashboard README; `DiscordanceReconciliationModal.tsx`, `discordanceRecord.ts`.

### Frozen section billing suggestion
- What it does: Would suggest CPT 88331 for the first frozen block and 88332 for each additional, counting one frozen_section_cut milestone as one block (unconfirmed assumption; RVU unverified).
- Workflow: none reachable.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: billing README; grep of `src/`.

# H. MOHS AND ORGAN MAPS

### Mohs micrographic surgery template and stage map
- What it does: PathScribe-authored Mohs synoptic (site, tumour type, pre-op size, stain, Mohs stages question required, defect size, closure, billing reference). Each stage (up to 8) has a time stamp, blocks cut, Mark stage clear, and a disc of 12 clock sectors plus a deep margin with a checklist beside the map (map click and checkbox do the same). Each positive sector takes a block (Unassigned or A up to Blocks cut; A-Z until entered), a histology defaulting from the tumour type (editable), and a perineural invasion tick. Sign-out stops while a positive sector lacks a block within blocks cut; stage maps are always in the report (no insert button, never stale) with per-stage text and result observations in the payload. Voice in en / fr / de / nl / ko ("Stage 1, positive at 12 o'clock, block A"; ambiguous commands ignored). A lab copies the template in the Synoptic Library; "Default histology from" is set on the Mohs question and a broken source blocks submit/review/publish. Routing: Mohs goes to dermatology; oral cavity and neck dissection route to `tmpl-gold-standard`.
- Workflow: Mohs surgeon or pathologist records stages in the synoptic; admin copies the template.
- Roles/permissions: whoever can edit the synoptic; admin colours/bindings `config:organ-map-scheme:manage`, `config:organ-map-bindings:manage`.
- Settings: Configuration > Synoptic Library; System > Organ maps (Mohs binding, colours for residual tumour and PNI).
- Status: Built (Demo) — server enforcement of the block rule is Planned; voice relies on browser speech (not verified end to end).
- Sources: `docs/product/MOHS_GUIDE.md`; generic templates README Batches 463/463b; Protocols README Batch 463; organMapping README; `mohs_micrographic_surgery.json`, `MohsStagesInput.tsx`, `mohsStages.ts`.

### Anatomical organ maps beside the synoptic
- What it does: Collapsible Map panel above the synoptic, drawn from synoptic answers each time (stores nothing): prostate (41 PI-RADS sectors, Grade Group, seminal vesicle, biopsy cores grid), breast (clock face, quadrant lines, up to six numbered foci that jump to the Tumour foci question, six-face margin diagram), colorectal (polyp Paris/Haggitt/Kikuchi, rectal CRM, mesorectal plane, distal margin), kidney (compartments, partial nephrectomy margins), oral cavity and neck dissection (20-level grid, ENE), Mohs. Hover for details; click or Enter on a sector jumps to and highlights its question. Open state is remembered per user; colours always carry a pattern.
- Workflow: Pathologist presses Map above the synoptic.
- Roles/permissions: none to view.
- Settings: Configuration > System > Organ Maps.
- Status: Built (Demo) — layout code for breast, colorectal, head and neck, renal not individually opened; server contract `ORGAN_MAPPING_API.md` Planned.
- Sources: OrganMap README Batches 461-466; organMapping README; `OrganMapPanel.tsx`, `useOrganMap.ts`.

### Insert organ map into the report
- What it does: Optional snapshot (SVG+PNG, report language, SHA-256) inserted as a picture; the panel shows "In the report", "out of date - insert again" or "locked at sign-out" with Insert / Insert again / Remove. A stale image blocks sign-out until reinserted or removed; locked after sign-out except via amendment. Mohs maps are always in the report.
- Workflow: Insert into report on the panel.
- Roles/permissions: `report:organ-map:insert` (Pathologist, Fellow, Resident).
- Settings: none.
- Status: Built (Demo)
- Sources: organMapping README; `organMapFigures.ts`, `organMapAutoFigures.ts`.

### Organ map configuration (colours, thresholds, bindings)
- What it does: Two tabs. Colours and patterns by level (enterprise, jurisdiction, facility; Override / Use inherited; preview). Thresholds with operator: breast close margin default 2 mm (range 0.1-10), colorectal polyp involved margin 1.0 mm (<=), rectal CRM, oral involved (<1) and close (<=5 mm), renal parenchymal/soft tissue (0 mm, =); conflicting rules warn and fall back to defaults. Map bindings per synoptic template (PathScribe's own bind themselves; lab templates bind each input to a question and answer meaning). Audited; "Discard changes?" on unsaved switches.
- Workflow: Admin.
- Roles/permissions: `config:organ-map-scheme:manage`, `config:organ-map-bindings:manage` (Admin, Lab Director).
- Settings: Configuration > System > Organ Maps.
- Status: Built (Demo)
- Sources: Config/System README Batches 461-466d, 499, 516; organMapping README; `OrganMapsSection.tsx`.

### Derived margin answers and map-driven sign-out checks
- What it does: The map calculates the template's Margin status and Margin(s) involved (invasive) and precursor equivalents (polyp adenoma, DCIS, oral dysplasia; low-grade oral dysplasia counts as not involved); those questions are locked. Colorectal local excision margins follow CAP's invasive carcinoma and adenoma blocks. Sign-out stops on a stale report image or a Mohs positive sector without a block; warns (not blocks) when invasive carcinoma is recorded but margins are incomplete; node counts and grid totals are validated (unmatched totals warn).
- Workflow: Automatic on the report page and at sign-out.
- Roles/permissions: none.
- Settings: binding derived part.
- Status: Built (Demo)
- Sources: organMapping README Batches 466b-466e; generic README Batch 466d; `organMapDerived.ts`, `organMapLive.ts`.

# I. MARGINS AND INKING

### Structured inking (margins, ink applications, gates)
- What it does: Margins are discrete entities (name, orientation, laterality, examination status) on a specimen or a block (never both), each with an append-only list of ink applications (colour, time, who); a second colour never overwrites the first; a margin cannot be renamed or re-oriented. Ink-colour dictionary (name, code, hex, active; seven common colours seeded; old applications keep their colour). Severity tiers: 1 advisory; 2 (margin not examined, no ink applied) blocks only in STRICT_ENFORCE; 3 (unmapped colour code or unreadable palette, fail closed) always blocks. Gate A at Complete grossing (Sev 3 hard stop; Sev 2 "Proceed with Advisory Note", logged). Gate B at sign-out (Sev 2 advisory; Sev 3 blocks, or an Administrative Override with reason: pre-inked foreign object, emergency intraop consultation, specimen consumed, other). Jurisdiction-specific messages for six profiles (US_CAP, KR_MFDS, UK_RCPATH, CA_IQMH, ANZ_RCPA, EU_IVDR). Ink beside synoptic margin labels and in organ-map legends is not built.
- Workflow: Grossing screen Margins and Ink Applications (+ Add margin, + Add ink application); gates at Complete grossing and sign-out.
- Roles/permissions: `grossing:margin-ink:record`; `case:inking-gate:override` (Admin, Lab Director); `config:ink-color:manage`; `config:inking-validation-mode:manage`.
- Settings: Configuration > System > Ink Colors; Inking Validation Mode (per facility, WARN_ONLY default or STRICT_ENFORCE; audited).
- Status: Built (Demo). Gate, ink applications, dictionary, modal and override record are built in the browser (evaluateInkingGate, InkingGateModal). Server /inking/validate, /inking/override and SQL audit table are server work.
- Sources: grossing README Batches 480-484; inkColors README; AUTHORIZATION_API.md; ORGAN_MAPPING_API.md §7; `evaluateInkingGate.ts`, `recordMarginInkApplication.ts`, `InkingGateModal.tsx`.

### Margin-distance extraction and Margin Exception Review
- What it does: At sign-out, free-text margin fields (ids ending `_mm`/`_cm`) are parsed to millimetres when confident (explicit unit, or bare number using the field suffix); text around the number is flagged. The result is a hidden shadow attribute and feeds Tumor Board auto-flagging. Unconfident parses open a Pending exception; a reviewer tags the distance or dismisses with a reason. Re-running replaces earlier values.
- Workflow: Pathology Workspace > Margin Exception Review (`/margin-exception-review`): Resolve or Dismiss.
- Roles/permissions: `case:margin-exception:resolve` (Pathologist, Fellow, Resident, PA); `screen:margin-exception-review:open`.
- Settings: none.
- Status: Built (Demo) — route and page verified; no dedicated Home tile (hub only).
- Sources: marginExtraction README; pages README Batch 491; `MarginExceptionReviewPage.tsx`, `mockMarginExtractionService.ts`.

# J. TUMOR BOARD / MDT

### Flag a case for Tumor Board / MDT
- What it does: Modal records a nomination: board (Breast MDT, GI MDT, Thoracic MDM, Gyn-Onc; fixed list), optional meeting date and time (time enabled after a date; no date = "Unscheduled"), status (Pending Presentation, Presented, Deferred, Cancelled, Dismissed). The presenter is left blank until claimed. Refuses a date inside the board's batch lock window, a second active listing for the same case, or an ineligible presenter. Reachable from a bottom-bar button and the "Submit to Tumor Board" voice/keyboard action; the Tumor Board delegation type is deactivated.
- Workflow: Grosser or pathologist uses Flag for MDT on the report page.
- Roles/permissions: `case:tumor-board:flag` (Pathologist, Fellow, Resident, PA).
- Settings: none (board list fixed).
- Status: Built (Demo)
- Sources: TumorBoard README Batches 489, 491, 492, 494; `FlagForMdtModal.tsx`, `BottomActionBar.tsx`, `ITumorBoardService.ts`.

### Tumor Board workspace (claim, schedule, batch lock)
- What it does: `/tumor-board` groups listings into board+date sessions (soonest first, "Unscheduled" last) with locked/open and unassigned badges. Filters by board, meeting window, status (default Pending Presentation), presenter; source badge Manual / Rule. Pathologists, Fellows and Residents (PAs excluded) claim cases or a coordinator assigns; claim audit stores who and when. A session locks a set number of hours before the meeting (default 48): board/date/time changes into a locked session are refused, presenter/status still allowed. Dismiss needs a reason. Print checklist (window print with controls hidden). A presenter assigned to a future meeting gets an in-app message and an e-mailed .ics invite (no PHI).
- Workflow: Home > Tumor Board tile; presenters claim; coordinators schedule.
- Roles/permissions: `case:tumor-board:schedule` (board, date, time, presenter; can be given alone to a custom non-clinical role), `case:tumor-board:manage` (status), `case:tumor-board:dismiss` (grossing roles), `case:tumor-board:flag`; `screen:tumor-board:open`.
- Settings: batching cut-off hours (Tumor Board Auto-Flag Rules page).
- Status: Built (Demo) — e-mail invite needs server mail; demo listings seeded across all four boards and every status (one claimed, one unclaimed, one unscheduled, one rule-flagged).
- Sources: tumorBoard README Batches 489-494, 516; `TumorBoardWorkspacePage.tsx`, `notifyTumorBoardAssignment.ts`, `buildTumorBoardInviteIcs.ts`, `tumorBoardBatchLock.ts`.

### Tumor Board auto-flag rules (margin distance)
- What it does: Four default rules (one per board), each flags when the closest margin is under 1 mm (strict less-than), active by default. At sign-out, margin attributes are extracted from all synoptic instances and, if a rule trips and no active listing exists, a listing is created with source Rule and a trigger reason (e.g. "Distance to closest margin 0.6mm (threshold < 1mm)"), with a toast. Enterprise baseline plus per-facility override of threshold and/or active flag.
- Workflow: Admin Configuration > System > Tumor Board Auto-Flag Rules (baseline card, batching cut-off card, facility overrides card).
- Roles/permissions: `config:tumor-board-rules:manage`.
- Settings: threshold mm, active, facility overrides, cut-off hours.
- Status: Built (Demo) (Batch 610). Admins add diagnosis, biomarker and margin rules (up to six criteria) that list a signed case for the rule's tumor board with a trigger reason, with per-facility board overrides. Nothing waits on another team.
- Sources: tumorBoardRules README; `tumorBoardRuleEvaluation.ts`, `runMarginRuleEvaluation.ts`, `TumorBoardRulesSection.tsx`.

#### Not yet in FEATURE_OVERVIEW.md
(checked by Grep of `docs/product/FEATURE_OVERVIEW.md`; it covers only the cytology case report, release delay, cytology screening hours, mismatch check, frozen-to-permanent reconciliation, add-on orders, the molecular workcenter in one paragraph, Field Requirements pages and the seeded template counts)
- Cytology Workspace as a whole (worklist tabs/tiles, screening page, review records, final diagnosis, CT sign-out gate, advanced-CT exception, review notes/Requires revision, Revise and sign out, multi-specimen tabs and early finalization as a screen workflow, pathologist review tray)
- Cytology QC (high-risk algorithm, random QC, QC pool, QC rules engine, Peer Review Queue, ROSE discrepancy, post-sign-out peer review) and the Cytology QA reports list
- ROSE tracking; HPV display/triage/screening strategy/self-collection recall; CISOE-A form; German triage suggestion
- Nomenclature systems (BSCC/RCPath, Munchner III, SFCC), category dictionary, Non-GYN dictionaries (Milan, Paris), Non-GYN cytology synoptics workflow, instrumentation modality, cytology routing, Configuration > Cytology tab
- CLIA workload cap with credit units, Country and laboratory rules (CLIA/CAP/preliminary signature), 5-year lookback, post-sign-out peer review, cyto-histologic correlation and SNOMED severity mapping, proficiency testing
- Cytology correction/addendum workflow, cytology permissions, cytology billing drawer, decant panel and prep suggestions, cytology clinical-history capture, cytology batch nodes, AI screening results
- Follow-up tracking (cyto-to-histology, biopsy-to-resection) beyond the one-line QA tile mention
- Screening registries (12 programmes), cancer registries (13), registry go-live, Registry Exceptions worklist, national identifiers, registry opt-out
- All of Autopsy (authority and gate, consent narrowing/revocation/reinstatement, custody, toxicology, HTA retention, organ tags, grossing template, PAD/FAD, body release, timeline, worklist badges, mortuary occupancy, permissions); the overview mentions autopsy only in the release delay, mismatch check and a template count
- Intraoperative: Intraop Queue, merge on accession, verbal report with read-back, dictation, critical results dictionary, OR Suite dashboard, OR terminals/PIN/dismissal, live badge, frozen TAT clock, gross photo capture
- Mohs template and stage maps; organ maps (insertion, configuration, derived margins)
- Structured inking, ink colours, inking gates; margin-distance extraction and Margin Exception Review
- Tumor Board / MDT (flag, workspace, auto-flag rules, invite e-mails)
- Molecular depth beyond one paragraph: in-house order engine and queue, send-out orders and reference labs, outbound HPV/instrument queue, QC and specimen association, result binding to synoptics, molecular QA reports

#### Status in FEATURE_OVERVIEW.md that the code contradicts
- Molecular — "Live (Sep 2026)": the plate builder, racks, orders and results are Built (Demo) only; worklist dispatch has no backend endpoint (dev-only mock), inbound run results need the interface engine, labels use QZ Tray only. It also lists `/molecular-order-queue` as part of the workcenter: that route is gated by the `configuration` screen and reached from Configuration > Demo Reset, while the Order Queue tab is inside `/molecular`.
- Cytology case report and prints "Live (Batch 532/539)": accurate only once the Python renderer (`functions/`) is redeployed; until then prints and releases are held, so Partial in a fresh deployment.
- "Seeded templates: 31 (22 surgical, 1 autopsy, 5 cytology, 3 grossing)": code has the 1 autopsy and 5 cytology files as stated; the autopsy template is registered in_review and not clinically reviewed.
- "Quality Assurance: Frozen Linkage ... Live" and Cytology QA pillar listed as Live: the Cytology QC compliance report and abnormal-severity badge exist only as unused functions (Stub), and several QA reports run on seeded or partial data (UK-QA-01, MOL-QA-01/02/04, EU-QA-01, APAC-QA-01 are Partial).
- Registry statements ("registry" appears only inside the release-delay paragraph): the overview implies registries receive results; real registry transmission is not built (engine handoff, wire formats and endpoints Planned).

---

# Theme 4: Quality, compliance, dashboards and productivity


Status key used below: Built = works in the app; Built (Demo) = works against browser/mock storage, production server still required. Paths are relative to /home/claude/work/src unless they start with docs/.

### Quality & Compliance hub
- What it does: Hub page at /quality-compliance with one card per screen the user may open: Audit, Quality Assurance, Registry Exceptions. The registry card and the Home tile show a live count of registry submissions needing attention.
- Workflow: Home > Quality & Compliance tile > pick a card.
- Roles/permissions: card shown only with its `screen:audit-log:open`, `screen:quality-assurance:open`, `screen:registry-exceptions:open`; routes re-check through ScreenGate. Admin, Lab Director, QA Reviewer start with Audit/QA/Configuration.
- Settings: Role Dictionary (Configuration > Staff).
- Status: Built (Demo) - page, hook useRegistryExceptionCount and route in SignedInApp.tsx exist.
- Sources: pages/QualityComplianceHubPage/README.md; services/screens/README.md; docs/architecture/AUTHORIZATION_API.md.

### Quality Assurance page: eight pillars and tabs
- What it does: /quality-assurance has eight pillars. Operations: Case-Specimen Deficiencies, Follow-up not received, Intraoperative Linkage, Discordance & Reconciliation, Countersign Turnaround, FPPE, Post-Final Drift, Patient Match Review, Patient Management, Access Requests. CAPA Engine: Recommended, Discordance Patterns, Escalated, Closed, Management Reviews. Financials: Open, Resolved, Code Review Pool, Charges awaiting approval. Plus Cytology QA, Enterprise Rollup, QA Dashboard, Inspection Mode, Activities.
- Workflow: Open page; `?pillar=<name>` opens that pillar's first tab; `?open=<deficiency id>` deep-links one item (also used by My Contribution quality flags). Failed Dispatches tile links to Audit Log outbound queue.
- Roles/permissions: `screen:quality-assurance:open`; per-tab export and view capabilities (see QA exports).
- Settings: scope picker (see next entry).
- Status: Built (Demo) - PILLAR_TABS in pages/QualityAssurancePage.tsx lists all eight.
- Sources: pages/README.md; pages/QualityAssurancePage.tsx; components/QualityAssurance/README.md.

### QA scope picker and cross-tenant QA permission
- What it does: QA tabs can be scoped to enterprise, one organisation, one client (matches ordering facility) or one facility (FPPE: facilities only). A row is placed by its own facility, else the case's ordering facility; unplaceable rows show enterprise-wide only. A user assigned to one facility opens on it. Enterprise rollup, management reviews and patient match review stay "all".
- Workflow: QaScopeSwitcher on each tab; list, counts and export follow the scope.
- Roles/permissions: reports spanning organisations need `canAccessCrossTenantQa` (or Superadmin); each cross-tenant read audited as qa.cross_tenant_access_executed.
- Settings: facility assignment on the staff record.
- Status: Built (Demo) - client-side control only; server enforcement Planned. Organisation-scope export check withdrawn until the Organisation-to-Facility migration.
- Sources: components/QualityAssurance/QaScopeSwitcher.tsx; services/qualityAssurance/qaScopeRows.ts; hooks/useQaCaseScope.ts; services/auth/caseAccessControl.ts.

### Specimen deficiency queue and CAPA lifecycle
- What it does: Deficiencies raised at accession and other gates are listed as Case-Specimen Deficiencies (case/specimen level). Lifecycle: contain (open to closed), resolve (open to pending-verification, needs resolution type, corrective action, root cause; due date defaults 14 days), verify (effective closes; recurred reopens and counts reopens). Pending-verification items show under CAPA Engine > Escalated; closed under Closed. Nothing raises a CAPA type automatically since Batch 438.
- Workflow: QA reviewer opens an item and uses Contain/Resolve/Verify; case Deficiency History modal is read-only.
- Roles/permissions: `screen:quality-assurance:open`; deficiency export `qa:deficiencies:export`.
- Settings: Configuration > System > Deficiencies (types, resolutions).
- Status: Built (Demo) - localStorage mock; Firestore/SQL path being replaced by the API server (PS-358).
- Sources: services/deficiencies/README.md; pages/QualityAssurancePage.tsx; pages/modals (DeficiencyHistoryModal).

### Deficiency server endpoints (contain, resolve, verify, raise-and-resolve)
- What it does: Vercel functions in api/qa/deficiencies move a deficiency through the same lifecycle with transactional state guards (transitionDeficiency refuses stale or racing transitions). resolve requires deficiency id, resolution type, corrective action, root cause, resolvedBy; verify takes effective/recurred. raise-and-resolve creates a deficiency already closed; no in-app flow calls it.
- Workflow: backend only.
- Roles/permissions: none enforced; caller identity is taken from the request body.
- Settings: none.
- Status: Built (Demo). In-app deficiency flows run on the mock service and work; the Vercel endpoints exist with unit tests. Real Firestore run and OIDC caller authentication are server-side.
- Sources: api/qa/deficiencies/README.md; contain.ts, resolve.ts, verify.ts, raise-and-resolve.ts, _lib/transitionDeficiency.ts.

### Deficiency and resolution type dictionaries
- What it does: Two tabs: Deficiency Types (level case/specimen/both) and Resolution Types; performing-lab column/filter/selector; uniqueness by name plus lab.
- Workflow: Admin edits in Configuration.
- Roles/permissions: section capability under `config:*:manage` (view-only without it).
- Settings: Configuration > System > Deficiencies.
- Status: Built (Demo).
- Sources: components/Config/System/DeficienciesSection.tsx; Config/System/README.md.

### Management review of closed deficiencies (ISO 15189)
- What it does: Periodic batch review: all closed, unreviewed deficiencies in scope are pre-selected, reviewer deselects, records one findings note for the batch. Exported as management-reviews CSV.
- Workflow: QA > CAPA Engine > Management Reviews > start review.
- Roles/permissions: export capability for management reviews.
- Settings: none.
- Status: Built (Demo).
- Sources: pages/modals/ManagementReviewModal.tsx; services/deficiencies/mockManagementReviewService.ts.

### CAPA recommendations queue
- What it does: PathScribe records recommendations (never opens a CAPA itself) for QA discordances (unless consensus), unresolved peer-review disagreement, post-sign-out discordance, clinically significant corrections/amendments, clinical mismatch Unresolved, outside-consult major discordance on a released report, and every released cytology diagnosis correction. A recommendation for a problem with a live one is linked; dismissed ones never absorb events.
- Workflow: QA lead: Confirm (owner required, optional note; opens a deficiency assigned to the owner) or Dismiss (reason required); "Open the CAPA" jumps to it.
- Roles/permissions: `qa:capa-recommendation:decide` (Admin, Lab Director, QA Reviewer).
- Settings: per-activity CAPA trigger (severities, deficiency type, "only for reviews after release") in QA Configuration Center; `config:revision-reasons:manage` "clinically significant" switch.
- Status: Built (Demo); endpoints Planned.
- Sources: services/quality/capaRecommendationService.ts; components/QualityAssurance/CapaRecommendationsTab.tsx; docs/architecture/AUTHORIZATION_API.md.

### Discordance trend policy (setting)
- What it does: Organisation policy plus per-lab own policy: watched pathologists/specimen types, window (1-36 months; default 3), minimum reviews (20), major severities (high), count (3 majors) or rate (10%), outcome on crossing (review task or notify only). Validated and audited.
- Workflow: Admin sets policy.
- Roles/permissions: `config:qa-trend-policy:manage`.
- Settings: Configuration > System > Discordance Trend Policy.
- Status: Built (Demo).
- Sources: components/Config/System/QaTrendPolicySection.tsx; services/quality/qaTrendRules.ts.

### Pathologist discordance patterns (trend reviews)
- What it does: Groups completed reviews per pathologist and per specimen type per performing lab and judges them against that lab's policy. Never opens a CAPA itself. Demo seed (5 peer reviews, 181 QA records) is too small to trip the rule, so the tile stays empty.
- Workflow: Lab Director opens QA > CAPA Engine > Discordance Patterns (evaluates on open); starts a review; concludes with CAPA (note required, only after a review) or dismisses (reason); "Show every pathologist and specimen type" lists all groups.
- Roles/permissions: `qa:pathologist-trend:view` and `:decide` (Lab Director only; tab hidden without view).
- Settings: Discordance Trend Policy.
- Status: Built (Demo); server evaluation Planned.
- Sources: components/QualityAssurance/QaTrendReviewsTab.tsx; services/quality/qaTrendService.ts; services/quality/demoDiscordanceSeed.ts.

### QA Configuration Center (QA activity types)
- What it does: Standard and Custom QA activity types and supervision archetypes. Standard types (Frozen vs Final Correlation, Cytology-Histology Correlation, Abnormal/Critical Finding Confirmation, GYN Secondary Screening, Pre-Sign-Out Peer Review, Clinical-Pathologic Correlation, Outside Consult Correlation, Surgical biopsy-resection and peer review) cannot be switched off. Editable: sampling %, TAT, CAPA trigger, jurisdictions, review fields (relabel, required/optional, options; never removed or retyped), surgical peer-review risk weights by subspecialty (blank 1x, up to 10). Duplicate always lands in Custom.
- Workflow: Admin edits in Configuration.
- Roles/permissions: `config:qa-types:manage`.
- Settings: Configuration > System > QA Configuration Center.
- Status: Built (Demo) - 176+ seed records.
- Sources: components/Config/System/QAConfigurationCenterSection.tsx; QaFieldSchemaEditor.tsx; services/quality/qaFieldSchemaRules.ts; types/quality/README.md.

### QA Activities board
- What it does: One tile and table per active QA activity type plus Countersign: pending, completed in the last 30 days, within-TAT %, discrepancy rate (dash when unknown), table columns from the activity's review fields. Clinical-Pathologic Correlation board is here.
- Workflow: QA > Activities.
- Roles/permissions: screen QA access.
- Settings: TAT target per activity type.
- Status: Built (Demo).
- Sources: components/QualityAssurance/QaActivityBoardTab.tsx; services/quality/README.md (Batch 518).

### Surgical post-sign-out QA review
- What it does: Queue of items waiting (correlation candidates, retrospective peer reviews, deferred clinical mismatches). Reviewer records a review (QA record plus specimen link, reviewedPathologist stored) or marks Not Relevant/dismisses. Selection is weighted by subspecialty risk weight.
- Workflow: Worklist Surgical QA tile (`?view=surgicalQa`) or the review bar on the report page (Record Review / Not Relevant, returns to queue after the last).
- Roles/permissions: `surgical:qa-review:record` (Pathologist, Fellow); `screen:surgical-qa-worklist:open`.
- Settings: risk weights in QA Configuration Center; review fields.
- Status: Built (Demo).
- Sources: services/quality/surgicalQaReview.ts; components/QualityAssurance/SurgicalQaCaseBar.tsx, SurgicalQaReviewModal.tsx; pages/SurgicalQaWorklistPage.tsx.

### Frozen-to-permanent reconciliation record
- What it does: At sign-out a case with a merged intraop frozen specimen (not deferred) opens the reconciliation modal and holds sign-out until resolved. Every reconciliation writes a QA record: concordant stores categories/diagnoses; discordant adds delta (including minor variance), impact, root cause, comment; high impact needs escalation. Required fields come from Field Requirements.
- Workflow: Pathologist resolves modal at sign-out (voice "record discordance"); QA > Operations > Discordance & Reconciliation reports the full population.
- Roles/permissions: Field Requirements; export capability for reconciliation CSV.
- Settings: Concordance review settings (next entry); Field Requirements.
- Status: Built (Demo).
- Sources: services/quality/discordanceRecord.ts; pages/SynopticReportPage/hooks/useSignOutWorkflow.ts; components/QualityAssurance/ReconciliationTab.tsx.

### Concordance review settings
- What it does: Two independent switches: automatic frozen-vs-final comparison/flagging, and a mandatory review screen at sign-out showing intraop vs final vs AI. Cascade staff override, then facility override, then organisation default.
- Workflow: Admin sets org default; facility override on Facility Configuration edit; sign-out reads the effective value.
- Roles/permissions: `config:concordance-review:manage`.
- Settings: Configuration > System (Concordance Review Settings); Facility edit modal.
- Status: Built (Demo) - section is wired in Config/System/index.tsx and read by useSignOutWorkflow.ts.
- Sources: services/qualitySettings/README.md; components/Config/System/ConcordanceReviewSettingsSection.tsx.

### Intraoperative Linkage tab
- What it does: Department-wide frozen-to-permanent merge tracking: merged entries (match type, confidence, whether a human overrode the suggestion) and pending entries with time since created as a safety flag; trend chart.
- Workflow: QA > Operations > Intraoperative Linkage.
- Roles/permissions: export capability for intraop linkage.
- Settings: scope picker.
- Status: Built (Demo).
- Sources: components/QualityAssurance/IntraopLinkageTab.tsx.

### Countersign Turnaround tab
- What it does: Department-wide resident countersign turnaround (countersignedAt minus releasedAt), changed-field delta and attending feedback; pending tile highlighted; trend chart. Department counterpart of My Contribution for one resident.
- Workflow: QA > Operations > Countersign Turnaround.
- Roles/permissions: export capability for countersign turnaround.
- Settings: scope picker.
- Status: Built (Demo).
- Sources: components/QualityAssurance/CountersignTurnaroundTab.tsx.

### Post-final drift correction tab
- What it does: Lists post-finalization drift events (a finalized grossing report edited after sign-out and automatically reverted to draft): detected, auto-corrected, deferred, failed. Highlights unresolved entries (deferred/failed with no later correction).
- Workflow: QA > Operations > Post-Final Drift; read-only view over the audit log.
- Roles/permissions: drift export capability.
- Settings: none.
- Status: Built (Demo).
- Sources: components/QualityAssurance/DriftCorrectionTab.tsx.

### FPPE and supervision assignments
- What it does: Supervision assignments (FPPE, credentialing review, cytotechnologist competency) with supervisor, cases-reviewed count, end condition, auto-completion, graduate, progress %, overdue, tracking CSV. A provisional hire or competency-assessed cytotechnologist is routed to countersign while an assignment is active. Replaces the retired legacy FPPE service.
- Workflow: Admin creates assignments in Staff > Credentialing; QA > Operations > FPPE tracks progress; Audit Log FPPE log.
- Roles/permissions: `config:fppe:manage`, `config:cytotech-competency:manage`; `config:qa-types:manage` for archetypes.
- Settings: Staff > Credentialing Review sub-tab; QA Configuration Center.
- Status: Built (Demo).
- Sources: services/quality/fppeAssignmentForm.ts; components/QualityAssurance/FppeTrackingTab.tsx; components/Config/Staff/StaffTab.tsx.

### Jurisdictional credentials and appointments
- What it does: Staff rows with credential type, issuing body, jurisdiction, effective/optional expiry; validated; each add/remove audited. Active credentials map to capabilities CYTO_ADVANCED_SPECIALIST (UK/NL/DE advanced cytology sign-out) and FORENSIC_AUTOPSY_SIGNOUT.
- Workflow: Staff edit modal > Jurisdictional credentials & appointments.
- Roles/permissions: `config:staff-access:assign`.
- Settings: Configuration > Staff.
- Status: Built (Demo).
- Sources: services/staff/resolveNormalizedCredentialCapabilities.ts; Config/Staff/README.md.

### QA Dashboard tab
- What it does: Cross-specialty rollup of every QA activity record by activity type, organ system (subspecialty) and reviewer: volume, discordance/concordance rate, trend chart, CSV. Reports discordance rate and volume only (no fabricated completion rate).
- Workflow: QA > QA Dashboard.
- Roles/permissions: `qa:qa-dashboard:export`; cross-tenant rule.
- Settings: scope picker.
- Status: Built (Demo).
- Sources: components/QualityAssurance/QaDashboardTab.tsx; services/quality/resolveQaActivityDashboardReport.ts.

### Inspection Mode and evidence binder
- What it does: One-click CSV export of all QA evidence for the last 24 months with drill-down to cases, mapping each activity to its regulatory clause per jurisdiction (CAP/CLIA, ISO 15189 and others). "CAPA triggered" is a threshold proxy, not a traced link. No patient columns; file name names the scope. CSV only; no print layout.
- Workflow: QA > Inspection Mode.
- Roles/permissions: `qa:inspection-evidence:export`.
- Settings: scope picker.
- Status: Built (Demo).
- Sources: components/QualityAssurance/InspectionModeTab.tsx; services/quality/resolveQaEvidenceBinder.ts.

### Enterprise Rollup
- What it does: Groups cases by performing-lab jurisdiction and computes operational, financial, diagnostic and TAT aggregates per jurisdiction, then combines aggregates (volume-weighted rates, summed volumes); unresolvable cases counted separately.
- Workflow: QA > Enterprise Rollup.
- Roles/permissions: `qa:enterprise-rollup:export`; cross-tenant audit.
- Settings: none.
- Status: Built (Demo). EnterpriseRollupTab and resolveJurisdictionRollup are wired into the QA page and aggregate locally; true per-jurisdiction hosting is the backend's.
- Sources: components/QualityAssurance/EnterpriseRollupTab.tsx; services/quality/resolveJurisdictionRollup.ts.

### QA exports (one capability per report) and trend charts
- What it does: Each QA report exports CSV through the export service with its own `qa:<report>:export` capability, checked against the chosen facility; every export audited as DOCUMENT_EXPORTED (report, file, row count, facility). Fourteen listed (deficiencies, management reviews, billing deficiencies, intraop linkage, reconciliation, countersign turnaround, FPPE, drift, patient match review, access requests, cytology-histology correlation, QA dashboard, evidence binder, enterprise rollup). Buttons grey out with reason. Last-6-month charts bucket by facility calendar month.
- Workflow: Export button on each tab.
- Roles/permissions: Admin and QA Reviewer hold QA exports.
- Settings: none.
- Status: Built (Demo); server-built exports Planned (phase 2e).
- Sources: services/qualityAssurance/qaExport.ts, runQaExport.ts; docs/architecture/AUTHORIZATION_API.md.

### Access request tickets and response report
- What it does: Pediatric, pool and Orchestration access requests create a tracked ticket (pending, granted, denied) besides messaging admins; duplicates reuse the pending ticket. Granting access (pool member, user flag, facility list) auto-closes the ticket. Report lists status and turnaround, average and monthly trend, CSV.
- Workflow: Requester clicks Request Access on worklist/pool modal; admin grants in Staff/Facility or Denies (reason required, requester messaged) in QA > Operations > Access Requests.
- Roles/permissions: deny needs `config:staff:edit` (pool) or `config:staff-access:assign` (pediatric/Orchestration); export `qa:access-request-response:export`.
- Settings: none; no per-admin metric.
- Status: Built (Demo).
- Sources: services/access/README.md; components/QualityAssurance/AccessRequestResponseTab.tsx.

### Patient match review and patient management (QA tabs)
- What it does: Queue of MPI matches the matcher could not resolve, shown with candidates: Confirm as new, Merge (repoints cases and encounters, retires source) or Link (two valid identities kept). Patient Management covers merge/link/move case.
- Workflow: QA > Operations > Patient Match Review / Patient Management; organisation picker.
- Roles/permissions: `qa:patient-match-review:export`.
- Settings: none.
- Status: Built (Demo).
- Sources: components/QualityAssurance/PatientMatchReviewSection.tsx, PatientManagementSection.tsx; services/patients/README.md.

### Follow-up expected mark
- What it does: Signer ticks "follow-up specimen expected" at sign-out, or uses Mark follow-up expected on the action bar later (window anchors on sign-out). Button then shows "Follow-up expected, due <date>" and who marked it; failure never undoes sign-out.
- Workflow: Sign-out modal checkbox or report action bar.
- Roles/permissions: `case:follow-up:expect`.
- Settings: facility biopsy-to-resection window.
- Status: Built (Demo).
- Sources: services/followUp/followUpActions.ts; pages/SynopticReportPage/components (BottomActionBar, CaseSignOutModal).

### Follow-up not received tab and dispositions
- What it does: Tracks cytology-to-histology and biopsy-to-resection follow-up. Status pending, due soon (warning default 30 days, 0 off) or overdue; auto-closed when a matching case arrives (same patient, window, matching site and side; no recorded site gives "possible match"). Manual close needs a disposition (done elsewhere, declined, not indicated, deceased, lost, other with note) and can reopen. Tiles, filters, CSV.
- Workflow: QA > Operations > Follow-up not received; worklist Follow-up due tile (own cases) and cytology Follow-up Due tile.
- Roles/permissions: `qa:follow-up:record`, `qa:follow-up:export`.
- Settings: Follow-up tracking section (next entries).
- Status: Built (Demo); server daily job Planned.
- Sources: services/followUp/README.md; components/QualityAssurance/FollowUpTab.tsx; docs/architecture/FOLLOW_UP_API.md.

### Follow-up internal alerts
- What it does: Each follow-up item (biopsy-to-resection or cyto-to-histology) gets at most two internal messages: one when it enters the warning period ("due soon") and one when overdue; an item that goes straight to overdue gets only the overdue one. Overdue messages are urgent. Recipients are the pathologist who signed the case out plus every active Lab Director and QA Reviewer, once each. Delivered to the Messages inbox with the accession; nothing goes outside the lab. Each alert is marked as sent before it is sent, so it is never repeated, and a refused message is not retried (the Follow-up tab still lists the item).
- Workflow: (1) A surgical case is signed out and marked "follow-up expected" with its window. (2) Later, when anyone opens the pathologist Worklist's Follow-up tile, the cytology worklist, or Quality Assurance > Follow-up, a background sweep checks all items. (3) For each item newly due soon or overdue it sends the message to the recipients above. (4) Recipients see the unread badge, open Messages and follow the case link. (5) The item is then worked in the Follow-up tab (see Follow-up not received tab and dispositions).
- Roles/permissions: no capability gates the sweep or receiving the message (recipients chosen by sign-out user and role names Lab Director and QA Reviewer). Seeing the Follow-up tab needs the QA screen (`screen:quality-assurance:open`) and the `qa:follow-up:*` capabilities.
- Settings: warning days (Configuration > System > Follow-up tracking, default 30, 0 means alert only once overdue, enterprise with facility override).
- Status: Built (Demo). Browser stand-in runs when a screen loads and hands over to the server job when VITE_SERVER_JOBS is on (browserStandIns.ts). Server job is backend only.
- Sources: services/followUp/followUpAlerts.ts, followUpLive.ts; services/serverJobs/browserStandIns.ts, serverJobsContract.ts; components/QualityAssurance/FollowUpTab.tsx; services/cytology/cytologyWorklistLive.ts.

### Clinician follow-up e-mail
- What it does: Lab drafts, edits and sends an e-mail to the ordering clinician only when the facility allows it, follow-up is due soon or overdue, address valid and no placeholder left. Template carries no patient name or diagnosis. Never automatic; send recorded and audited only if mail accepts.
- Workflow: Follow-up tab > e-mail dialog > review > Send.
- Roles/permissions: `qa:follow-up-clinician:email`.
- Settings: per facility on/off and wording.
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Mail service endpoint /notifications/email.
- Sources: services/followUp/followUpClinicianEmail.ts.

### Follow-up tracking settings
- What it does: For the enterprise, with an optional override per facility: (1) warning days before the due date (whole number 0 to 365, default 30; 0 means warn only once overdue); (2) whether "Email ordering clinician" is offered (default off, the lab's choice); (3) the lab's own e-mail subject (up to 200 characters) and body (up to 4000), or the built-in wording when empty. Placeholders are validated against the allowed set: accession, windowStart, dueDate, clinicianName, labName, senderName. An invalid draft shows problems and is not saved. Unsaved edits trigger the configuration leave-page guard.
- Workflow: (1) Admin opens Configuration > System > Follow-up tracking. (2) Sets the enterprise warning days, ticks clinician e-mail if wanted and edits the wording; saves. (3) To differ at one site, presses Add override in the facility card, picks the facility, sets its own values and saves; Remove returns that facility to the enterprise settings. (4) Effects: the Follow-up tab status (due soon, overdue), internal alerts, and the "Email ordering clinician" button follow the effective settings for the case's facility.
- Roles/permissions: `config:follow-up-tracking:manage` (group configQuality; seeded to Admin and Lab Director via the configuration sweep); saves are checked in the service. The related window rule for biopsy-to-resection is `config:biopsy-resection-correlation:manage`.
- Settings: Configuration > System > Follow-up tracking (this entry is the setting).
- Status: Built (Demo): browser mock storage.
- Sources: components/Config/System/FollowUpTrackingSection.tsx; services/followUp/followUpSettings.ts; services/screens/configSectionAccess.ts.

### Financial QA: billing deficiencies, corrections, charge approval
- What it does: Financials pillar lists non-blocking billing deficiencies raised at sign-out (modifier mismatch, NCCI bundling, zero-fee mapping, unsupported CPT level, unattached ancillary, missing charge, post-sign-out correction, block deleted) with statuses open/under review/resolved/overridden. Start correction dialog (change CPT/modifier, reverse, add missing charge; reason and comment required). Charges awaiting approval and Code Review Pool tabs.
- Workflow: QA > Financials.
- Roles/permissions: `billing:applied-code:correct`; billing deficiency export.
- Settings: billing dictionaries (Billing theme).
- Status: Built (Demo).
- Sources: services/billing/README.md; components/Billing/BillingCorrectionDialog.tsx; pages/QualityAssurancePage.tsx.

### Registry exceptions worklist
- What it does: Lists screening and cancer registry submissions needing a person: held, held attestation required, delivery failed, rejected (fixable/fatal), no answer in 72 hours (escalation runs on load), conflicting, revised after acceptance. Latest version only; filter chips with counts; findings and raw acknowledgement; Open case; own organisation only. Nav and tile badges.
- Workflow: Quality & Compliance > Registry Exceptions; filter, open details.
- Roles/permissions: `screen:registry-exceptions:open`.
- Settings: none.
- Status: Built (Demo) - actual registry delivery needs server/registry connections.
- Sources: pages/RegistryExceptionsPage/README.md; services/registrySubmission/registryExceptions.ts; hooks/useRegistryExceptionCount.ts.

### Capture registry exception as CAPA
- What it does: Row action creates one open case-level deficiency (def-registry-submission-failure) naming registry, version, environment and findings; row then shows "CAPA open"; one open CAPA per submission; audited.
- Workflow: Row button on the exceptions worklist; handled in QA.
- Roles/permissions: `screen:registry-exceptions:open` (enforced in the service).
- Settings: none.
- Status: Built (Demo).
- Sources: services/registrySubmission/captureRegistryExceptionAsCapa.ts.

### Registry transmission audit export
- What it does: One row shape for screening and cancer: sent time, registry status, response code, answered time, revision count; no patient identifiers (MRN not shown). Cytology QA tile has a registry selector.
- Workflow: Toolbar on Registry Exceptions or QA > Cytology tile > Download.
- Roles/permissions: `qa:registry-transmission-audit:export`.
- Settings: none.
- Status: Built (Demo); server-built file Planned.
- Sources: services/registrySubmission/registryTransmissionAudit.ts; services/cytology (cytologyTransmissionAuditCsvRows).

### Cytology QA pillar (tile host)
- What it does: Top-level Cytology pillar (formerly an Operations tile) holding the cytology QA reports as tiles, with scope and registry selectors; only the active tile loads data.
- Workflow: QA > Cytology.
- Roles/permissions: `qa:*` cytology capabilities.
- Settings: scope.
- Status: Built (Demo); server-side aggregation Planned.
- Sources: components/QualityAssurance/CytologyQaTab.tsx; services/cytology/ICytologyQaReportService.ts.

### Cytology agreement classification and aggregate QA reports
- What it does: Each later review is compared to the primary screen and stored as Exact Agreement, Minor Discrepancy or Major Discrepancy (false negative, false positive, high-grade skip) plus adequacy discrepancy; threshold is diagnostic rank 3, unresolvable defaults to Major. Three aggregate reports (10% random rescreen, directed/high-risk rescreen, CT vs pathologist) show overall agreement, major concordance, false-negative rate, upgrade/downgrade counts and detail table.
- Workflow: QA > Cytology tiles; review history colours green/amber/red.
- Roles/permissions: QA capabilities; scope.
- Settings: none (threshold constant).
- Status: Built (Demo).
- Sources: services/cytology/classifyCytologyAgreement.ts, resolveCytologyQaAggregateReport.ts.

### Primary vs Final Diagnosis, Post-Sign-Out Peer Review and Secondary Screening Audit reports
- What it does: Primary vs Final pairs each specimen's first primary screen with the chosen Final Diagnosis review. Peer Review report compares peer review with the Final review. Secondary Screening Audit lists QC/secondary reviews written as QA records. None auto-raises a CAPA.
- Workflow: QA > Cytology tiles.
- Roles/permissions: QA capabilities.
- Settings: scope.
- Status: Built (Demo).
- Sources: services/cytology/resolveCytologyFinalDiagnosisDiscordancePairs.ts, resolveCytologyPeerReviewComparisonPairs.ts.

### CT statistical comparison (CYT-QA-01) and ASC-US/HPV reflex concordance (MOL-QA-03)
- What it does: CYT-QA-01 buckets each cytotechnologist's reviews by diagnostic rank and flags outliers beyond +-2 SD of the peer ASC-US/LSIL ratio. MOL-QA-03 shows share of ASC-US calls HPV positive per CT: 30-60% normal, below under-calling, above over-calling, insufficient data when no reflexed cases.
- Workflow: QA > Cytology tiles.
- Roles/permissions: QA capabilities.
- Settings: none.
- Status: Built (Demo).
- Sources: services/cytology/resolveCytologyCtStatisticalComparisonReport.ts, resolveCytologyAscusHpvReflexReport.ts.

### Cyto-histologic correlation report (CYT-QA-04)
- What it does: Aggregates recorded correlations (concordant/minor/major/unspecified) with Correlation_Rate and PPV_HSIL; includes patient MRN column.
- Workflow: QA > Cytology > Histology Correlation tile; Download (XLSX/CSV) and Print.
- Roles/permissions: `qa:cytology-histology-correlation:export`.
- Settings: none.
- Status: Built (Demo).
- Sources: services/cytology/resolveCytologyHistologyCorrelationReport.ts; components/QualityAssurance/CytologyHistologyCorrelationPrintView.tsx.

### 5-Year Retrospective Lookback report and workload tracking report
- What it does: Lookback tile: rows, totals, pending/completed, completion rate, corrective-action rate and per-outcome tally; view only, no export. CYT-QA-05 workload report: per-CT counted workload vs cap (manual vs imager split) plus recorded hours, sign-off status and correction reason/note flags by lab day.
- Workflow: QA > Cytology tiles.
- Roles/permissions: QA capabilities (supervisors).
- Settings: enterprise default cap used for all CTs (stated simplification).
- Status: Built (Demo).
- Sources: services/cytology/resolveCytologyFiveYearRetrospectiveLookbackReport.ts, resolveCytologyWorkloadTrackingReport.ts.

### Unscreened backlog/TAT report (US-QA-02)
- What it does: Unscreened specimens vs Pending Path Review with turnaround from received/collected time.
- Workflow: QA > Cytology tile.
- Roles/permissions: QA capabilities.
- Settings: none.
- Status: Built (Demo).
- Sources: services/cytology/resolveCytologyUnscreenedBacklogReport.ts.

### Jurisdiction cytology QA reports: UK HPV failsafe, EU matrix, HPV positivity monitor
- What it does: UK-QA-01: per UK nation HPV positivity, triage counts, inadequate rate; failsafe referral and non-response columns missing. EU-QA-01: per country HPV-primary vs co-test and audit non-conformities; omits registry ID, specimen type, interval adherence. MOL-QA-01: positivity by site and indication with genotype and variance vs mean; assay name not captured.
- Workflow: QA > Cytology tiles.
- Roles/permissions: QA capabilities.
- Settings: none.
- Status: Built (Demo) (Batch 608). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: services/cytology/resolveCytologyPrimaryHpvFailsafeAuditReport.ts, resolveCytologyEuComplianceMatrixReport.ts, resolveCytologyHpvPositivityMonitorReport.ts.

### Molecular QC and proficiency-testing reports
- What it does: MOL-QA-02 per-run invalid/inhibitor failure rate (threshold 5%); MOL-QA-04 lot-to-lot Ct trend (about 1.0 Ct); read 13 synthetic seeded runs, not facility-scoped. APAC-QA-01 proficiency testing: PT cases carry Case.proficiencyTestContext; outbound submission payload built, graded inbound result validated; two unsatisfactory/no-response of three consecutive events triggers a deficiency.
- Workflow: QA > Cytology tiles 15-16.
- Roles/permissions: QA capabilities.
- Settings: thresholds are defaults.
- Status: Built (Demo) (Batch 608). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: PT provider exchange.
- Sources: services/cytology/resolveCytologyMolecularQcFailureRateReport.ts, resolveCytologyApacProficiencyTestReport.ts.

### AI/human discordance and stalled-result reports
- What it does: Per-vendor discordance rate (unreviewed results excluded) and list of ordered AI results stuck past a timeout.
- Workflow: intended QA reports; after saving a review the screening page asks once whether human and AI agree; "discordant" raises an open def-ai-discordance deficiency (no auto-escalation).
- Roles/permissions: not stated.
- Settings: timeout window.
- Status: Built (Demo) (Batch 610). The stalled-AI-result rule has a configurable timeout, and a QA AI Discordance tab shows per-vendor concordance and the stalled list with export. Nothing waits on another team.
- Sources: services/digitalPathology/resolveAiHumanDiscrepancyReport.ts, recordAiHumanConcordance.ts.

### Cytology QC assignment engine (layered selection)
- What it does: At cytology sign-out one open QC assignment per specimen. Precedence: ROSE/FNA discrepancy (fixed, top tier, 4 h SLA), QC Rules engine, then QC Settings random/high-risk peer-review selection (passive flag only). A second trigger upgrades the assignment (higher tier, earlier SLA, reason added); resolved ones reopen new. Formal consultation cases skipped by rules. Engine is called at sign-out (README claim that it was unused is stale).
- Workflow: Automatic at sign-out; reviewers work the queue.
- Roles/permissions: `config:cytology-qc-rules:manage`, `config:cytology-qc-rates:manage`.
- Settings: Configuration > System > Cytology QC Rules; Cytology > QC Settings (enterprise/facility/person rates).
- Status: Built (Demo) - counters in browser storage; transactional server rules Planned.
- Sources: services/cytologyQc/README.md; resolveQcAssignmentUpsert.ts; signOutCytologyCase.ts; docs/architecture/CYTOLOGY_QC_API.md.

### Cytology QC rules builder
- What it does: Rules with criteria (jurisdiction, facility, provider, specimen, clinical risk, diagnostic scope), sampling (percentage, interval, fixed volume), tier, SLA, eligible reviewer roles; evaluated by priority (higher first); unset criteria never exclude; counters persist; Duplicate starts inactive.
- Workflow: Admin builds rules.
- Roles/permissions: `config:cytology-qc-rules:manage`.
- Settings: Configuration > System > Cytology QC Rules.
- Status: Built (Demo).
- Sources: components/Config/System/CytologyQcRulesSection.tsx; services/cytologyQc/resolveQcRuleEvaluation.ts.

### Cytology peer review queue (QC)
- What it does: Shared unassigned queue sorted by urgency tier; tabs All / Escalations & Discrepancies / Routine & Random; shows selection reason and reviewer pool; SLA on time / approaching (80%) / breached. Actions: Assign to Me, Record Concurrence, Record Discrepancy, Open Case, Escalate (SLA-breached, reason required), Supervisor bypass (justification, logged). Same actions on the cytology screening page review bar.
- Workflow: Worklist `?view=cytologyQc` (old /cytology-qc-queue redirects).
- Roles/permissions: `cytology:qc-review:record` (Pathologist, Fellow); `cytology:qc-review:bypass` (nobody by default; also opens the queue); `screen:cytology-qc-queue:open`.
- Settings: QC rules.
- Status: Built (Demo).
- Sources: pages/CytologyQcQueuePage.tsx; components/CytologyQc/CytologyQcCaseBar.tsx; services/cytologyQc/README.md.

### Cytology QC safeguards: no self-review, reviewer pool, QC flag
- What it does: The signer or primary screener cannot take or record their own QC (always on). Eligible reviewer roles are stored and shown but not enforced when taking a review. A specimen qcFlag (random or targeted) keeps it in the QC pool until a matching review; Remove Flag is audited, adding a flag needs no permission. QC tile shows a "needs another screener" badge and Ask a colleague.
- Workflow: Worklist QC tile.
- Roles/permissions: `cytology:qc-flag:remove`.
- Settings: none.
- Status: Built (Demo) (Batch 608). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: services/cytologyQc/resolveQcReviewerEligibility.ts; services/cytology/resolveCytologyQcPoolMembership.ts.

### Cytology post-sign-out peer review and 5-year lookback
- What it does: After sign-out, targeted (rank 4 or more) takes priority, otherwise random using the QC rate cascade; a different pathologist reviews (not the signer). Separately, sign-out of rank 4+ result flags every negative GYN cytology in the prior 5 years for re-review (outcomes confirmed negative, screening/interpretation/sampling error, corrective action text).
- Workflow: Worklist Peer Review and 5-Year Lookback tiles; banner on screening page.
- Roles/permissions: `cytology:review:record`, `cytology:retrospective-review:record`.
- Settings: lookback on/off per country rules (see compliance features); reuses QC rates.
- Status: Built (Demo).
- Sources: services/cytology/resolveCytologyFiveYearRetrospectiveLookback.ts, resolveCytologyPeerReviewTargetedSelection.ts.

### Cytology-histology correlation
- What it does: At sign-out of rank 1+ cytology, finds the patient's other cases with a non-cytology specimen inside a window (default 180 days from collection, then receipt, then sign-out); sweep re-checks open windows; backfill for older sign-outs. Reviewer confirms (auto-resolved or manual diagnosis, concordant/discordant) or dismisses; saved as a QA record.
- Workflow: Histology Correlation tile; screening page cards.
- Roles/permissions: `cytology:histology-correlation:record`; `config:cytology-histology-correlation:manage`.
- Settings: Cytology > Correlation window (enterprise, jurisdiction rule, facility override).
- Status: Built (Demo); server sweep job Planned.
- Sources: services/cytology/sweepCytologyHistologyCorrelationCandidates.ts; components/Config/Cytology (CytologyHistologyCorrelationSection).

### Biopsy-to-resection correlation window
- What it does: Surgical correlation window length and start per enterprise, jurisdiction and facility (default 180 days from collection).
- Workflow: Admin.
- Roles/permissions: `config:biopsy-resection-correlation:manage`.
- Settings: Configuration > System > Biopsy-to-resection correlation.
- Status: Built (Demo).
- Sources: components/Config/System/BiopsyResectionCorrelationSection.tsx.

### Pathologist review tray for GYN cytology
- What it does: GYN specimens where a screen asked for pathologist review appear until a pathologist review is recorded. Take and open makes the caller primary pathologist (a cytotech stays cytotechnologist), audited; refusals ALREADY_TAKEN, NOT_AWAITING.
- Workflow: Worklist Cytology Review tile (only when non-zero) > Take and open.
- Roles/permissions: `cytology:pathologist-review:take` (Pathologist, Fellow).
- Settings: none.
- Status: Built (Demo); atomic take needs server.
- Sources: services/cytology/cytologyQueuesLive.ts.

### Cytology workload cap, Screening Credit Units and counter
- What it does: Each review has a weight (manual GYN 1, imager-assisted 0.5, manual rescreen 1.5, pathologist review 0). Limit = cap x hours screened / 8, never above the cap. Save refused when exceeded (escalations allowed); remaining in-progress cases return to the pool. Counter shows 24-hour use, reviews, left now and in a full day, bar and approaching/at/over wording. Editing does not double count.
- Workflow: Cytotech sees counter on worklist and screening page; Review Mode picker hidden for pathologists.
- Roles/permissions: none to see; cap changes need manage capability.
- Settings: see next two entries.
- Status: Built (Demo); server-recorded screening time Planned (phase 2e).
- Sources: services/cytology/cytologyWorkloadSummary.ts, resolveCytologyWorkloadCapacity.ts, resolveCytologyScuWeight.ts.

### Cytology workload cap settings
- What it does: Caps whole slides 1-100 (CLIA 42 CFR 493.1274(d)(2)) at enterprise, facility (can only lower) and person level; invalid values refused beside the field; add pickers hide existing overrides; "Screening day starts at" 0-23 with history, audited.
- Workflow: Admin.
- Roles/permissions: `config:cytology-workload-cap:manage` (also for a person's own cap).
- Settings: Configuration > Cytology > Workload Cap.
- Status: Built (Demo).
- Sources: components/Config/Cytology/CytologyWorkloadCapSettingsSection.tsx; services/cytology/cytologyWorkloadCapRules.ts.

### Screening hours sign-off
- What it does: Panel "Today's screening hours" (and yesterday's): one click confirms recorded hours or Correct with reason (microscope off screen, slide left open, other) and note up to 200 characters. Corrections over 0.5 h, or turning an exceeded day within limit, are flagged for supervisors; sign-off goes stale if more is recorded. Append-only, audited.
- Workflow: Cytology worklist panel; supervisor reads CYT-QA-05.
- Roles/permissions: `cytology:screening-hours:sign-off` (Pathologist, Fellow, Resident, Cytotechnologist).
- Settings: day start, tolerance, idle limit.
- Status: Built (Demo). Panel is mounted on the cytology worklist with confirm/correct, reasons, supervisor flags and append-only audit; server events and endpoints are the only gap.
- Sources: pages/CytologyWorklistPage/components/ScreeningHoursPanel.tsx; services/cytology/screeningHoursRules.ts.

### Country and laboratory compliance rules (cytology)
- What it does: Three features On/Off/Automatic (default on for US only): CLIA daily workload cap, CAP 5-year lookback, electronic signature on preliminary release. With the cap Off, workload is still recorded but never blocks.
- Workflow: Admin; audited.
- Roles/permissions: `config:cytology-compliance:manage`.
- Settings: Configuration > Cytology > Country and laboratory rules (enterprise plus facility override).
- Status: Built (Demo).
- Sources: services/cytology/cytologyComplianceFeatures.ts; CytologyComplianceFeaturesSection.tsx.

### Peer review before sign-out
- What it does: Optional gate (off by default; department, then lab, then organisation) blocks sign-out of a first-time malignancy until a different active pathologist records an independent read and consensus. Urgent-care override (immediate surgery, treatment, other with note) leaves review owed within 24 hours. Completion writes a Pre-Sign-Out Peer Review QA record; unresolved disagreement recommends a CAPA.
- Workflow: Signer requests review (reviewer never the signer, with note); reviewer agrees or disagrees and how far; consensus step; request can be withdrawn; banner on report shows recommended/required, waiting, disagreement, overridden, complete.
- Roles/permissions: `case:peer-review:request`, `:record`, `:override`; `config:peer-review:manage`.
- Settings: Configuration > System > Peer Review Before Sign-Out.
- Status: Built (Demo); endpoints Planned.
- Sources: services/quality/peerReviewService.ts; components/PeerReview; Config/System/README.md.

### Clinical-pathologic mismatch check
- What it does: AI compares clinical indication/history to findings and diagnosis (unexpected malignancy, expected malignancy not found, site/organ, cause of death, other); only narrative text is sent. Inline alert "AI suggests possible mismatch" with confidence and source; re-runs when compared text changes. High-risk (Block rule) holds sign-out until Resolved or Unresolved is recorded (Unresolved recommends CAPA); low risk is logged or Deferred. No clinical info defers the check. Falls back to a rule-based check if AI is not allowed. Writes a Clinical-Pathologic Correlation QA record. Amendments after sign-out are not checked.
- Workflow: Surgical report, autopsy before FAD, cytology pathologist track; deferred cases in Surgical QA > Deferred clinical mismatches.
- Roles/permissions: `case:clinical-mismatch:record` (Pathologist, Fellow).
- Settings: rules and AI instructions (next entries).
- Status: Built (Demo) - needs AI service; server must recompute risk.
- Sources: docs/product/CLINICAL_MISMATCH_CHECK.md; services/clinical/clinicalMismatchService.ts, clinicalMismatchDecision.ts; hooks/useClinicalMismatchCheck.ts.

### Clinical mismatch rules table
- What it does: Per kind and specimen type: alert-from threshold (starts 60%), action-at threshold, action Block/Warn/Log. Start rules: unexpected malignancy and cause of death block at 70%, site/organ blocks at 65%, other two logged. Every change audited (CLINICAL_MISMATCH_RULE_CHANGED).
- Workflow: Admin; saved on leaving field.
- Roles/permissions: `config:clinical-mismatch-rules:view` / `:manage` (no built-in role holds manage).
- Settings: Configuration > System > Clinical Mismatch Rules.
- Status: Built (Demo).
- Sources: components/Config/System/ClinicalMismatchRulesSection.tsx; services/clinical/clinicalMismatchRuleService.ts.

### Governed AI instructions for the mismatch check
- What it does: Instructions are versioned; an edit is pending, the check uses only the last approved text, editor cannot approve (SELF_APPROVAL).
- Workflow: edit, then Lab Director approves or rejects with reason.
- Roles/permissions: `config:ai-prompt:view`, `:edit` (none by default), `:approve` (Lab Director; never Superadmin).
- Settings: Configuration > System > AI Instructions; AI vendor policy.
- Status: Built (Demo).
- Sources: services/clinical/aiInstructionService.ts; components/Config/System/AiInstructionsSection.tsx.

### Frozen section verbal report and critical result record
- What it does: Logs the verbal report: received by (session surgeon first, then directory), role, mandatory read-back, critical flag; a critical result to anyone but the operating surgeon needs a "Surgeon unavailable" reason ("Other" needs a real note). Merge carries it into the case's append-only critical result notification record. Sign-out critical findings window records who, method, read-back, decision; secure e-mail option only where a BAA/DPA gateway exists.
- Workflow: Pathologist on Intraop page or sign-out window.
- Roles/permissions: no capability of its own for verbal report.
- Settings: Intraoperative critical results dictionary; Field Requirements.
- Status: Built (Demo).
- Sources: services/intraop/verbalReport.ts; services/clinical/mockCriticalResultNotificationService.ts; pages/SynopticReportPage CriticalFindingsModal.tsx.

### Critical alert dispatch and reference page
- What it does: Resolves physician channel by severity and persists a dispatch record; SMS/secure e-mail carry no PHI (generic text plus opaque link). Public /critical-alert/:token page shows only accession, physician, status; Acknowledge Reviewed is audited. Channel adapters only log to console (stubs). The link's token is an opaque random string made in the browser and is not cryptographically signed; anyone who has the link can open it until it expires (Planned: server-issued, validated tokens, with the physician reaching the finding through their own EHR sign-in).
- Workflow: fires when the human notification is recorded; Audit Log > Critical Alerts joins dispatch to access history.
- Roles/permissions: reference page unauthenticated; audit tab needs audit screen access.
- Settings: Physicians config.
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: SMS gateway, secure e-mail and EHR push via the engine.
- Sources: services/clinical/dispatchCriticalAlerts.ts; pages/CriticalAlertReferencePage; pages/CriticalAlertAuditSection.tsx.

### Outside consult links (issue, view, opinion, assess)
- What it does: Staff issue a scoped (case or slides), expiring (default 24 h, 72 h over a weekend), revocable link; token 256-bit, only hash stored, carried after #. Consultant opens /consult with no login, sees only the covered slides (clinical history omitted), may submit one signed opinion. Pathologist rates the opinion (agrees / minor / major discordance, note required) and writes an Outside Consult Correlation record; major discordance on a released report recommends CAPA.
- Workflow: Report page Consult button; Audit Log > Consult links lists and revokes.
- Roles/permissions: `case:consult-link:issue`, `:revoke`, `case:outside-consult:assess`, `audit:consult-links:view`.
- Settings: default lifespan.
- Status: Built (Demo). Same as consult links entry: issue, view, opinion, rating, audit work on mock token service; UI banner discloses browser-only links. Real tokens, media proxy, identity check are server.
- Sources: services/consultAccess/README.md; pages/ExternalConsultViewPage; components/ExternalConsult.

### Consult audit events
- What it does: PHI-safe events consult.link.created/accessed/access_denied/expired/revoked, consult.opinion.submitted/assessed; expiry recorded once.
- Workflow: Audit Log > Interfaces > Consult links.
- Roles/permissions: `audit:consult-links:view`.
- Settings: none.
- Status: Built (Demo).
- Sources: services/consultAccess/mockConsultTokenService.ts; pages/ConsultLinksAuditSection.tsx.

### Informal review request
- What it does: Sends an internal message with the case to a chosen active pathologist (not the sender); no ownership transfer; counted in consultation TAT outliers; Worklist Informal Review tile.
- Workflow: From a case, Request Informal Review modal.
- Roles/permissions: not stated.
- Settings: none.
- Status: Built (Demo).
- Sources: components/RequestReview/RequestReviewModal.tsx; services/delegations (InformalReview).

### Case delegation
- What it does: Delegate to a user or pool by type; per type: synoptic-assign gives the recipient the chosen synoptic, ownership-transfer types make recipient primary, POOL clears assignee, others add a participant. Cytotechnologist recipients refused. Note required when the type says or org setting "Note on every delegation".
- Workflow: Delegate modal drag staff onto lanes, Confirm; Worklist "Delegated to me" tile; Search "delegated to".
- Roles/permissions: `case:delegation:create`.
- Settings: Delegation Types; Field Requirements.
- Status: Built (Demo) (Batch 610). Signing out delegated work completes the delegation, and the spoken peer review, formal consult and full transfer open the Delegate dialog preset. A consult answered without sign-out needs the server workflow.
- Sources: services/delegations/README.md; pages/Synoptic/Delegate/DelegateModal.tsx; docs/architecture/TAT_AND_DELEGATION_API.md.

### Delegation type dictionary
- What it does: Types (Peer Review, Second Opinion, Subspecialty Referral, MDT Discussion); system types toggle-only, custom full CRUD; performing-lab scope; unique id and label per scope; TUMOR_BOARD seed deactivated.
- Workflow: Admin.
- Roles/permissions: `config:delegation-types:manage`.
- Settings: Configuration > System > Delegation Types.
- Status: Built (Demo).
- Sources: services/delegationTypes/README.md; DelegationTypeSection.tsx.

### Subspecialties and case pools
- What it does: Subspecialty list; pool per performing lab with member physicians; Catch-All toggle (one per lab scope); "Create Workgroup" turns on membership enforcement; read-only General Pathology fallback. Adding a lab auto-creates "<Facility> - General Pathology" pool. Membership grants close matching access requests.
- Workflow: Admin.
- Roles/permissions: `config:subspecialties:manage`; membership needs `config:staff:edit`.
- Settings: Configuration > System > Subspecialties. Enforcement is off by default; seed marks only oncology-pool as a workgroup.
- Status: Built (Demo).
- Sources: services/subspecialties/README.md; mockFacilityService.ts.

### Case routing to pools
- What it does: At grossing completion an unassigned case goes to a pool by specimen type plus performing lab (keyword fallback); lab beats Global; catch-all is fallback. Rules priority-ordered with conflict warning; built-in toggle-only; preview tool; Run now.
- Workflow: Admin; automatic at grossing complete.
- Roles/permissions: `config:case-routing:manage`, `case:routing:run`.
- Settings: Configuration > System > Case Pool Assignment, Routing Rules.
- Status: Built (Demo).
- Sources: services/cases/casePoolAssignmentService.ts; CasePoolAssignmentSection.tsx.

### Pool display, claim and request access
- What it does: Worklist groups pool cases by pool name (urgent pools first); pools the viewer cannot claim show Restricted, collapsed, remembered per user; "+N in pool" marker. Click opens Accept/Pass; first accepter wins; membership checked when enforcement is on. Non-members get Request Pool Access (one ticket per pool, admins messaged).
- Workflow: Worklist pool rows.
- Roles/permissions: pool membership.
- Settings: pool isWorkgroupEnabled.
- Status: Built (Demo).
- Sources: components/Worklist/PoolClaimModal.tsx, poolGrouping.ts; utils/accessRequests.ts.

### Case team
- What it does: Drag staff onto participation-type lanes; only roles valid for the case's jurisdiction, local titles, Countersign/Finalise badges; versioned save refuses if changed since opened; assignee joins team; primary change moves the assigned pathologist. Cytotechnologists cannot hold pathologist slots anywhere.
- Workflow: Report header > Case Team.
- Roles/permissions: `case:team:manage`.
- Settings: Participation Types.
- Status: Built (Demo); endpoint Planned.
- Sources: services/cases/saveCaseTeam.ts; participationTypes/cytotechParticipationRules.ts.

### Participation types, facility sign-out authority and countersign routing
- What it does: Master list of case-team roles with flags (can finalize, requires countersign, can view whole case); per-lab facility override with provenance, justification, revert, audit. Sign-out routed to countersign for resident, Requires-Countersign type, active FPPE, or first-year cytotech. Attending can Return to Trainee with required feedback (surgical).
- Workflow: Admin edits type; attending returns case.
- Roles/permissions: `config:participation-types:manage`.
- Settings: Configuration > System > Participation Types.
- Status: Built (Demo) (Batch 608). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: services/participationTypes/README.md; resolveResidentCountersignRequired.ts; mockCountersignService.ts.

### Worklist table and filter tiles
- What it does: Core case list: sort/filter, card/table switching, divider rows, personal sort. Filter tiles: Urgent, Physician, Pool, Delegated, In Progress, Draft, Finalizing, Accessioned, Gross Complete, Countersign, Pending Release, Needs Revision, Informal Review, Peer Review, Cytology Review, On Hold, Follow-up Due, Amended (Amendment first, then Addenda), Completed, Pending Grossing, DP, GYN/non-GYN cytology, Autopsy, new cases. Some tiles hide at zero. LIS and Outreach branch tabs.
- Workflow: /worklist; click a tile to filter, click a case (opened by support reference).
- Roles/permissions: case access rules; restricted cases show redacted rows and are counted.
- Settings: personal sort order.
- Status: Built (Demo).
- Sources: pages/WorklistPage/README.md; services/worklist/worklistTileCounts.ts.

### Worklist queue views and indicators
- What it does: Cytology QC Peer Review and Surgical QA are worklist views; abnormal dot/badge from confirmed abnormal finding; Autopsy tab with authority, hold, PAD/FAD badges and static SLA chip; Queued for Release tile (own signed cases); Resources panel of admin links.
- Workflow: Worklist tiles.
- Roles/permissions: view allowance; `config:external-resources:manage`.
- Settings: Configuration > System > External Resources.
- Status: Built (Demo).
- Sources: components/Worklist; services/abnormalDetection/README.md; services/externalResources.

### Report page "Data as of / Check now" indicator
- What it does: Correction: this is not on the Worklist. It is the "Data as of <time> (<n> min ago)" label with a "Check now" button in the report page's header bar, shown only for cases whose reporting mode is `assist` (the app reports on top of the LIS record). Check now asks the LIS service for the case's current state, moves the "as of" time to now and returns any flags the LIS has added since; those are applied to the case as real flag instances (source `lis`, at the specimen or case level, de-duplicated, auto-creating an unknown LIS code in the flag catalogue).
- Workflow: (1) A pathologist opens an assist-mode case on the report page. (2) Reads "Data as of ..." in the header bar. (3) If the LIS may have moved on, presses Check now (button shows a checking state). (4) New LIS flags appear on the case and the time resets. (5) Continues reporting.
- Roles/permissions: no capability found on the button (Unverified whether the service gates it); it is visible to whoever can open the report page.
- Settings: none.
- Status: Built (Demo). HeaderBar indicator and Check now work against the mock LIS sync service and apply flags; only the real LIS call is missing.
- Sources: pages/SynopticReportPage/components/HeaderBar.tsx; services/lisSync/mockLisSyncService.ts; services/flags/applyLisSyncFlags.ts.

### Global case search bar
- What it does: NavBar search by MRN, name, accession, national identifiers or support reference (SR-...); flag chips (up to four); opens through unsaved-changes guard.
- Workflow: Type in NavBar.
- Roles/permissions: `screen:search:open`.
- Settings: none.
- Status: Built (Demo).
- Sources: components/Search/README.md; searchHitFlags.ts.

### Case Search page
- What it does: Server-paged search (25/50/100) with a large filter set: identifiers, status, priority, flags, pathologist with role, ICD, synoptic protocols, case type, date basis, revisions, holds, result flag, pending work, Past TAT, subspecialty, performing lab, intake, payer/CPT, autopsy. Access rules applied first; parent organisation includes sites; last search kept per tab; Back/breadcrumb returns to Search.
- Workflow: /search; set filters, Search.
- Roles/permissions: `screen:search:open`.
- Settings: page size per user.
- Status: Built (Demo) - loads all accessible mock cases; API contract Planned.
- Sources: services/caseSearch/README.md; docs/architecture/CASE_SEARCH_API.md.

### Saved searches, search export, reassign patient
- What it does: Per-user saved searches keep all filters. CSV of up to 5,000 matches, audited. Reassign Patient moves a selected case to another patient in the organisation.
- Workflow: Search toolbar.
- Roles/permissions: `search:case-results:export`.
- Settings: none.
- Status: Built (Demo).
- Sources: services/savedSearches/README.md; ReassignCasePatientPanel.tsx.

### Search audit and support recording
- What it does: Every case search is audited: the case router writes a "Case Search" entry (success or failure) to the audit log each time it fetches the list, and a search export is recorded as a document export with the row count and no patient data. When the searcher is a ForMedrixAI Superadmin, the search also writes a `searchRun` entry to the support audit stream of each organisation that support can currently reach, naming only the criteria that were filled in (for example "accession, dateFrom"), never their values, which can be patient names. List and report loads that disclose another organisation's cases are recorded too (`casesListed`, with case ids).
- Workflow: (1) A user searches from the navigation bar search box or the Case Search page. (2) Behind the scenes the criteria are counted by name and the match runs. (3) The audit entry is written; for support users the entry is added to each reachable organisation's support audit. (4) The organisation's Admin later reads it on Configuration > System > Support Access (support audit) and Quality & Compliance > Audit (case search entries).
- Roles/permissions: `screen:search:open` to search; `search:case-results:export` to export results. Support recording applies only to Superadmin sessions reaching an organisation they are not staff of, and only where the organisation's policy allows access; viewing the support stream needs `config:support-audit:view`.
- Settings: organisation support access policy (Disabled / Approval required / Always allowed) decides whether a support user can search that organisation at all.
- Status: Built (Demo).
- Sources: services/caseSearch/README.md (Batch 372); createCaseSearchService.ts (`usedCriteria`, `auditSearch`); mockCaseSearchService.ts; services/supportAccess/supportAccessGate.ts (`recordSearch`); services/cases/CaseRouter.ts.

### My Contribution dashboard
- What it does: Pathologist KPI page, tabs Overview, Productivity, Quality, AI Contribution, Mentor. Overview: KPIs, case mix, RVU, TAT vs target, Quality Flags, Teaching Cases. Follows facility time zone; exports checked and audited.
- Workflow: Home > My Contribution.
- Roles/permissions: `screen:my-contributions:open`; export capabilities.
- Settings: TAT targets, RVU Code Map.
- Status: Built (Demo).
- Sources: pages/ContributionDashboardPage.tsx; components/Contribution/README.md.

### Productivity tab
- What it does: Monthly case counts from cases finalised by the user, RVU totals and monthly chart, peer comparison from the RVU Code Map; printing audited.
- Workflow: My Contribution > Productivity.
- Roles/permissions: plain pathologists see peer averages only if enabled; other roles always.
- Settings: Contribution Settings (showPeerAveragesToPathologists).
- Status: Built (Demo).
- Sources: components/Contribution/ProductivityTab.tsx, productivityCalculations.ts.

### Quality tab and TAT outliers
- What it does: Discordant cases from Frozen-vs-Final records, amended cases with severity, and TAT outliers over eight types: total case, first touch, grossing, sign-out, frozen section, cold ischemia, consultation response, consultation awaiting. Target is most specific TAT entry, fallback 24 h routine / 4 h STAT.
- Workflow: My Contribution > Quality; flag opens QA item.
- Roles/permissions: n/a.
- Settings: TAT Configuration.
- Status: Built (Demo).
- Sources: components/Contribution/qualityCalculations.ts.

### AI Contribution tab
- What it does: AI acceptance/override by workflow, per-user feedback, department breakdown and monthly trend; override examples and synoptic dataset are hardcoded demo data.
- Workflow: My Contribution > AI.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built (Demo). Per-user and workflow numbers are real; override examples and synoptic comparison are hardcoded but badged with DemoDataBadge. Department/peer aggregates across users need the server.
- Sources: components/Contribution/AIContributionTab.tsx.

### Mentor tab
- What it does: Supervisor's view of supervisees: case mix by subspecialty; for cytotech competency supervisors, clean countersign rate (returned counts as not clean, pending excluded).
- Workflow: My Contribution > Mentor.
- Roles/permissions: Pathologist, Fellow, Resident; bench roles none.
- Settings: competency assignments.
- Status: Built (Demo).
- Sources: components/Contribution/MentorTab.tsx.

### Contribution settings and exports
- What it does: Toggle peer averages for plain pathologists; trainee case log and case-mix summary exports each have own capability and are audited.
- Workflow: Admin; export buttons.
- Roles/permissions: `contribution:*:export`.
- Settings: Configuration > System > Contribution Settings.
- Status: Built (Demo).
- Sources: ContributionSettingsSection.tsx; docs/architecture/AUTHORIZATION_API.md.

### RVU Code Map
- What it does: Versioned effective-dated CPT-to-work-RVU table (seed 88302, 88304, 88305, 88307, 88312, 88342); a case's RVU uses the version in effect at finalization. Spreadsheet upload with preview, add/edit entry.
- Workflow: Admin; changes create a new active version.
- Roles/permissions: `config:billing-rvu:manage`; `config:billing-tables:approve`.
- Settings: Configuration > System > Financial lookups > RVU Code Map.
- Status: Built (Demo).
- Sources: services/billing/mockRvuCodeMapService.ts; RvuCodeMapSection.tsx.

### Bench Contribution dashboard
- What it does: /bench-contributions for bench roles: accessioning rate, batch throughput, queue aging, stage-to-stage TAT, molecular QC pass/fail and rerun rate.
- Workflow: Home tile.
- Roles/permissions: `screen:bench-contributions:open` (Accessioner, Histotech, Cytotech, Molecular Tech).
- Settings: none.
- Status: Built (Demo) - route, page and tests exist; older note saying Planned is stale.
- Sources: pages/BenchContributionDashboardPage.tsx; pages/benchContributionCalculations.ts.

### Performance targets and client SLA targets
- What it does: Targets per period (cases/RVU) and per-client first-touch/total TAT hours with STAT variants.
- Workflow: none; no screen or caller.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo) (Batch 610). Performance Targets and Client Service Levels screens save, and the Productivity and TAT dashboards show actual against target and SLA. Waiting on the server side: SQL Server store through the API server.
- Sources: services/performanceTargets; services/clientSLA/README.md.

### TAT targets configuration
- What it does: Targets resolve most-specific-wins across ordering facility, performing lab, specimen, subspecialty, urgency and role; system defaults cannot be deleted; no duplicate active scope. Used by Search past-TAT, Quality tab, dashboards, rollup.
- Workflow: Admin.
- Roles/permissions: `config:tat-targets:manage`.
- Settings: Configuration > System > TAT Configuration; Facility editor Reporting and TAT tabs.
- Status: Built (Demo).
- Sources: services/tatConfig/README.md.

### Autopsy TAT/SLA target display
- What it does: Static jurisdiction target as chip and tooltip; no elapsed or overdue calculation.
- Workflow: Report page and Worklist.
- Roles/permissions: n/a.
- Settings: fixed lookup.
- Status: Built (Demo) (Batch 610). Elapsed time against the target shows On track / Overdue on the chip and tooltip. Public holidays are not counted in working-day targets.
- Sources: services/autopsy/formatAutopsyTatSlaSummary.ts.

### Autopsy BI dashboards
- What it does: Intended three-tier BI and reporting dashboards for autopsy (PS-261 section 2.6.3). Nothing is built: the autopsy README lists it as "not started" and a search of the source finds no dashboard, route or capability for it. What the three tiers are is not stated in code (Unverified; the specification text is not in the repository). This entry duplicates "Autopsy three-tier BI/reporting dashboards" in Theme 3 and should be merged with it.
- Workflow: Not applicable until built. Expected, not verified: an Autopsy lead or Lab Director opens a dashboard from Quality & Compliance or the Autopsy worklist. (Unverified)
- Roles/permissions: none defined; no `autopsy:*` or `qa:*` dashboard capability exists in the catalog (checked by search).
- Settings: none.
- Status: Built (Demo) (Batch 610). Same dashboards as entry 61 (case, department, enterprise). Waiting on the server side: autopsy data from the API server.
- Sources: services/autopsy/README.md ("Still open" list).

### Facility Ops wall displays
- What it does: Public wall-display route `/facility-ops-dashboard` (outside sign-in and the session timeout, by design, like the OR board) with five high-contrast views of the bound facility: Grossing & Intake (active batches, decal SLA countdown, pending intake), Embedding & Microtome (active batches, STAT alerts), Staining & IHC (active batches and stain-order counts by status: QC Failed, Recut Requested, Ready for Review, Staining), Send-Out & Reference (referral transit counts, STAT referrals and cold-chain excursions as critical alerts), Diagnostic Sign-Out/Scanner (WSI batch counts with Scan Failed critical and Scan QC Failed warning alerts). Header shows profile name, view, facility, a clock, "last updated" or an Offline / Stale Data badge, and carousel dots. Re-reads when the hub reports a change in the facility (topic `facilityOps`); polls every 20 s without a live connection; stale after two poll intervals (about two minutes while live). Only the latest read is shown.
- Workflow: (1) Admin creates a Display Profile (see Display profiles). (2) At the bench, a person opens `/facility-ops-dashboard` on the wall computer and picks the profile (typing the token if one is set). (3) The screen loads the profile's views, cycles through them at the carousel interval and refreshes automatically. (4) Staff read counts and alerts from across the room; nobody signs in or clicks afterwards. (5) A failed refresh shows the Offline / Stale Data badge instead of an error.
- Roles/permissions: none for the display itself (public route, no session). Creating the profiles needs `config:display-profiles:manage`. Data is scoped to the profile's facility, not enterprise-wide.
- Settings: Display Profiles (facility, views, interval, token). Poll interval 20 s and default carousel 20 s are constants in the page.
- Status: Built (Demo): figures are computed from the app's own batch, stain-order, referral and WSI data in the browser; hub push is Planned phase 2e (until then polling). The old Home tile no longer exists; entry is the button in Display Profiles.
- Sources: pages/FacilityOpsDashboard/README.md and FacilityOpsDashboardPage.tsx; services/facilityOpsDashboard/README.md and compute*Summary.ts files; SignedInApp.tsx (route).

### Display profiles
- What it does: Registry of wall displays. Each profile has a name, a performing-lab facility, one or more of five views (Grossing & Intake, Embedding & Microtome, Staining & IHC, Send-Out & Reference, Diagnostic Sign-Out/Scanner), a carousel interval in seconds (only shown with more than one view; default 20 s, minimum 5 s at run time), an optional device token and Active/Inactive status. At least one view is required. One profile is seeded (`dispprof-seed-histology`, Fenwick General, three views). A browser binds to a profile once; the binding is remembered per computer and survives reload.
- Workflow: (1) Admin opens Configuration > System > Display Profiles. (2) Add: types the name, picks the facility, ticks the views, optionally sets the interval and a device token (an asset tag, MAC or IP for bookkeeping), saves. Edit, Deactivate and Reactivate from each row. (3) Admin presses "Open Facility Ops Dashboard" (or points a wall browser at `/facility-ops-dashboard`). (4) On the wall computer, setup lists the active profiles; the person picks one; if the profile has a token they must type it correctly before the bind completes. (5) The display then runs that profile's views.
- Roles/permissions: `config:display-profiles:manage` for add, update, deactivate (checked in the service; section visible only with it; seeded to Admin and Lab Director). The binding step on the wall display needs no login.
- Settings: Configuration > System > Display Profiles. No unbind control was found in the UI; changing the bound profile means clearing the workstation setting `pathscribe_current_display_profile_id` (Unverified how an operator does this).
- Status: Built (Demo): profiles are stored in browser mock storage; the token is a typed shared secret, not hardware verification, and is never enforced elsewhere.
- Sources: components/Config/System/DisplayProfilesSection.tsx; services/facilityOpsDashboard/IDisplayProfileService.ts, mockDisplayProfileService.ts; hooks/useCurrentDisplayProfile.ts; services/screens/configSectionAccess.ts.

### OR Suite live board
- What it does: Public kiosk /or-suite-dashboard listing active frozen-section requests by location: status, pathologist, step, frozen diagnosis; STAT clock; visual only.
- Workflow: Terminal bound to a location.
- Roles/permissions: no signed-in user; needs an admin-issued Display Token (Batch 603); staff PIN to dismiss. Rows show surgical case ID and room, never patient name or MRN.
- Settings: OR Suite Terminals (`config:or-suite-terminals:manage`), Display token button.
- Status: Built (Demo) - token binding, revocation (display blanks within a minute) and masking built in the browser; server-side 401 check and server-side masking Planned.
- Sources: pages/OrSuiteDashboardPage.tsx; services/intraopDashboard/README.md.

### OR board dismissal, event log and terminal identity
- What it does: Two-step DISMISS CASE with surgeon read-back, requires diagnosis rendered; records dwell and total turnaround; PIN identifies OR staff; terminals bind to a location; sales demo mode.
- Workflow: OR staff.
- Roles/permissions: OR Staff role via PIN.
- Settings: `quickAuthPin` on staff.
- Status: Built (Demo). Duplicate of OR terminals entry: dismissal, PIN, terminal binding and demo mode are built. Only badge/RFID hardware is missing.
- Sources: services/intraopDashboard/dismissFromBoardWithAudit.ts, resolveStaffByQuickAuthPin.ts.

### Frozen section STAT turnaround clock
- What it does: Elapsed time vs target from arrival; normal/warning/overdue.
- Workflow: Visible per board row.
- Roles/permissions: none.
- Settings: default 20 minutes with 25% warning window; no admin screen.
- Status: Built (Demo) (Batch 610). Admins set the frozen section target and warning minutes per facility, read by the OR dashboard clock. Nothing waits on another team.
- Sources: services/intraopDashboard/resolveIntraopTatStatus.ts.

### Live updates and live status badge
- What it does: Keeps screens current without reload through one hub connection per browser window (`/hubs/live`, SignalR on the ASP.NET Core API server). Events carry identifiers only, never patient data, and a screen re-reads through its normal authorised call, so an event never grants access. Two kinds: (a) intraop scope events (`IntraopChanged`) for the OR Suite Live Board and Intraop Queue, with a badge; (b) `DataChanged` events by topic for screens that used to poll: registryExceptions, messages, facilityOps, heldReleases, engravers, siteAgents, interfaceEngines, molecularQueue, caseReport. Also carries print-job status, WSI scan batch changes, report delivery (fax) status and export status. Bursts coalesce (100 ms); a screen reads at most once a second. Polling is the fallback: 15 s without a connection, 60 s safety poll while live. Reconnect back-off 0, 2, 5, 10, 20, then 30 s with jitter, never giving up. Only signed-in (SSO) sessions use the hub; password/demo sessions and wall boards stay on polling. Without a hub address, a local transport shares changes between this browser's windows. The badge shows Live, Connecting, Reconnecting, Offline or Local updates (hidden when idle), with a hover hint.
- Workflow: Automatic. (1) A user opens a live screen (OR Suite board, Intraop Queue, Facility Ops board, Engraver Monitor, Molecular Order Queue, Interfaces > Engines, Site agents, held reports, report page). (2) The screen subscribes to its scope or topic and does its own first read. (3) When another user or device changes data, the hub sends an event and the screen re-reads. (4) The user sees the badge on the OR board and Intraop Queue headers change state when the connection drops; the screen keeps updating by polling and re-reads on reconnect.
- Roles/permissions: no capability; the connection needs a valid SSO access token and the hub must refuse unauthenticated connections. Data returned is whatever the screen's own authorised read allows. OR terminals and demo password sessions have no token yet, so they use polling.
- Settings: `VITE_LIVE_UPDATES_HUB_URL` (https in production, loopback http in development; also read from the deployment's `config.json`). No admin screen.
- Status: Built (Demo). LiveStatusBadge is on OR board, intraop queue and WSI pages; localLiveUpdateService gives same-browser updates in the demo. Only the SignalR hub is server work.
- Sources: services/liveUpdates/README.md; liveUpdateContract.ts; liveUpdatePolicy.ts; dataTopics.ts; signalRLiveUpdateService.ts; localLiveUpdateService.ts; hooks/useLiveData.ts; hooks/useLiveIntraopUpdates.ts; components/LiveUpdates/LiveStatusBadge.tsx.

### Case presence
- What it does: A strip in the tab bar of an open case report shows who else has the same case open, with their name, "editing" (they have unsaved changes) or "viewing", and mailto and tel links to their work e-mail and phone when the lab has them. The same person in another window shows as "You, in another window". One polite screen-reader announcement describes the latest change; nothing to click or dismiss; with nobody else it takes no space. A companion notice ("Someone else saved this case", with Show their changes) comes from the `caseReport` topic. The save version check stays as the safety net.
- Workflow: (1) A user opens a case on the report page (Worklist or Search > case). (2) The page asks the server for the case's support reference (never the case number) and joins presence. (3) Another user opens the same case; the first user sees a chip with that name and "viewing". (4) When that user types an unsaved change, the chip changes to "editing" (setup-time changes are not counted as editing). (5) The first user can e-mail or phone them before saving to avoid a refused save. (6) Leaving the page or closing the window removes the presence; a dropped connection shows nobody until it rejoins.
- Roles/permissions: no capability; the server must check the user may open the case (a reference for a nonexistent or forbidden case gets the same refusal). Identity, name and contact details come from the token and user record, not the browser. Only SSO sessions join the hub.
- Settings: none.
- Status: Built (Demo). Presence strip, hooks and announcements are built; demo shows this browser's other windows via BroadcastChannel. Cross-user presence needs the hub.
- Sources: hooks/useCasePresence.ts; hooks/useCaseUpdateNotice.ts; pages/SynopticReportPage/components/CasePresenceStrip.tsx; services/liveUpdates/casePresence.ts; docs/architecture/LIVE_UPDATES_SIGNALR.md section 15.

### Audit Log / System Logs viewer
- What it does: Page titled "System Logs" (route behind `screen:audit-log:open`) with tabs Audit Log, Error Log, Interface Log, Quality Assurance, Financial, Critical Alerts, Consult links and (only with `jobs:server-job:view`) Server jobs. Audit Log tab: type pills (All, AI, User, System), search over event, detail and case id, date range (default last 7 days, custom range, "all" when opened from a case link), "Patient Management Only" filter, and a user filter for Superadmin only. Error Log: severity and open/resolved filters, tab badge with open count, Resolve button. Interface Log: exceptions, outbound dead letters, outbound dispatches, print queue and (with `interface:engine-status:view`) Engines sub-tabs. Quality Assurance tab merges eight record groups (deficiency, intra-op linkage, reconciliation, countersign, credentialing/FPPE, drift, patient match, management review) into one searchable, exportable list. Financial: billing logs and the outbound charge dead-letter queue. Support-reference lookup box finds what a support reference names. CSV exports are formula-safe, carry a requester and filter header, and are themselves audited.
- Workflow: (1) Home > Quality & Compliance > Audit (or a deep link such as `/audit?tab=financial&view=outbound_dlq`). (2) Pick a tab; badges show open errors, pending interface exceptions and open quality items. (3) Filter, search or paste a support reference. (4) On an open error, a user with the capability presses Resolve (records who and when). (5) On an interface exception, open the review modal, or use Map Patient to bind a downtime or unmatched patient (modal `BreakGlassRebindModal`; its own gate not checked here, Unverified). (6) Export CSV with the tab's Export button.
- Roles/permissions: `screen:audit-log:open` to open the page (default Admin, Lab Director, QA Reviewer). Exports: `audit:audit-log:export`, `audit:error-log:export`, `audit:interface-log:export`, `audit:qa-log:export`, `audit:billing-log:export` (granted with the screen). `audit:error:resolve` to resolve errors (Admin, Lab Director, QA Reviewer). `audit:consult-links:view` for the cross-case consult link list (Admin, Lab Director, QA Reviewer). `interface:engine-status:view` for Engines; `jobs:server-job:view` and `jobs:server-job:requeue` for Server jobs. A user with role Pathologist sees only entries with a case id plus their own activity, and validation-study events are hidden from everyone but Admin and Superadmin (role checks in the page, not capabilities).
- Settings: none.
- Status: Built (Demo). Tab list corrected: there is no separate "FPPE" tab (credentialing review is one group inside the Quality Assurance tab).
- Sources: pages/AuditLogPage.tsx; services/auditlog/README.md (Batches 432, 499); services/authorization/capabilityCatalog.ts and capabilitySeeds.ts.

### Audit logging, unique ids and case audit
- What it does: Every audited action is written to one shared audit store that the System Logs page reads. `useAuditLog().log(action, payload)` builds a readable, PHI-free detail sentence, takes the case id and facility id from the payload when present, and stamps the acting user's e-mail; the store adds a unique id (`al-<UUID>`; errors use `el-<UUID>`), a timestamp and the workstation's scan-station id on every write. Case reads, lists, searches, writes, write conflicts, creates and deletes are written by `AuditLogger` as "Case Read", "Case List", "Case Search", "Case Write", "Case Write Conflict", "Case Created", "Case Deleted". An audit write that fails never fails the action it describes (fire-and-forget, errors swallowed).
- Workflow: (1) A user does something audited on any screen (save a protocol, finalize a case, open a case, change a setting). (2) The screen's code calls `log(...)` or the case service calls `AuditLogger.log(...)`; the user sees nothing and does no extra step. (3) The entry is stored with its unique id and appears on Quality & Compliance > Audit > Audit Log (type AI, User or System) for anyone allowed to view that page; for a case, the same entries appear when the page is opened from a case link with the case id filter (see the viewer entry). (4) If the write fails the action still completes.
- Roles/permissions: no capability gates writing; every signed-in user's actions are logged. Reading is gated by `screen:audit-log:open` (see "Audit Log / System Logs viewer"). Client IP is not recorded (a frontend-only app cannot record it truthfully; needs the API server).
- Settings: none found. Entry types are fixed in code (`AuditAction` catalogue in `components/Audit/useAuditLog.ts`, about 80 actions).
- Status: Built (Demo): entries live in browser mock storage; server-side primary-key uniqueness and client IP Planned. Not confirmed: whether every screen's actions are routed through `log`; only the call sites listed in `audit/auditLogger.ts` and `services/cases/AuditLogger.ts` were checked (Unverified for the rest).
- Sources: components/Audit/useAuditLog.ts; audit/auditLogger.ts; services/cases/AuditLogger.ts; services/auditlog/auditIds.ts, mockAuditService.ts, IAuditService.ts; services/auditlog/README.md.

### Report change history
- What it does: One entry per case save: user, time, workstation, fields old to new; word-level diff; CSV export audited.
- Workflow: Report page chip opens modal.
- Roles/permissions: `report:change-history:export`.
- Settings: none.
- Status: Built (Demo); server transaction Planned.
- Sources: services/reportChangeLog; docs/architecture/REPORT_CHANGE_LOG_API.md.

### Print and export audit
- What it does: Every document output writes one entry into the same audit log (not a separate log): `DOCUMENT_RENDERED` (stored PDF opened), `DOCUMENT_PRINTED`, `DOCUMENT_REPRINTED`, `DOCUMENT_EXPORTED`, `DOCUMENT_FAXED` (and legacy `DOCUMENT_PREVIEW_PRINTED`, no longer produced). The detail holds document name, id, version, destination, status (success, failed or pending), UTC time with offset, reason, format and row count, with no patient identifiers. A browser print dialog cannot say whether paper came out, so a print handed to it is recorded `pending`; a download the browser accepted is `success`; a renderer or network failure is `failed`. Values are cleaned of `;` and line breaks so entries cannot be forged. A report counts as a reprint when the audit log already shows it printed.
- Workflow: (1) A user presses Print on the report page (or Export on a list, Case Search, QA, Audit, Disposal report, Report change history, Productivity tab, Validation studies). (2) For a report already printed, the print prompt becomes a Reprint prompt; when the lab requires a reason the Print button stays disabled until a reason is typed. (3) If the report is Pending Release and hard copies are restricted, the prompt warns the copy carries the watermark. (4) The document opens or downloads and the entry is recorded for the outcome (PDF opened, popup blocked so downloaded, renderer unavailable so browser print dialog). (5) The entry is seen on Quality & Compliance > Audit > Audit Log, and exports of the log carry it.
- Roles/permissions: printing a case report needs `report:case-report:print` (plus `report:restricted-case:print` for a restricted case); each export needs its own capability checked by the export gate before the audit entry (for example `audit:audit-log:export`, `audit:error-log:export`, `audit:interface-log:export`, `audit:qa-log:export`, `audit:billing-log:export`, `search:case-results:export`, `report:change-history:export`, `retention:disposal-report:export`). Automatic routing is recorded with user "SYSTEM". Viewing the entries needs `screen:audit-log:open`.
- Settings: Configuration > System > Print Settings > "require a reason for reprint" (`requireReprintReason`, default off; changing it needs `config:print-settings:manage`; system setting with facility override).
- Status: Built (Demo). Fax entries depend on the fax path (see E-fax and file-drop delivery); network label prints keep their own separate entries.
- Sources: services/printing/documentOutputAudit.ts, recordDocumentOutput.ts, reportPrintAudit.ts, exportGate.ts; components/Config/System/PrintSettingsSection.tsx; services/printSettings/IPrintSettingsService.ts.

### Support audit stream
- What it does: Each organisation has its own append-only, SHA-256 hash-chained record of what ForMedrixAI support did in its data, separate from the main audit log. Every entry has time, actor, ticket, action, the case ids disclosed and a PHI-free English detail. Each entry's hash covers its fields and the previous hash, so a changed, removed or reordered entry breaks the chain (`verifySupportAuditChain`); the screen shows "chain intact (n entries)" or the sequence number where it broke. Recorded: policy changes; requests, approvals, rejections, expiries, early ends, revocations; refused opens; case opens and edits; lists, searches and reports that disclosed cases; searches (criteria names only); audit exports. Export is CSV or JSON with columns Timestamp, Support agent name, Originating IP, Originating country, Ticket ID, Action taken, Case IDs, Detail; cells starting `= + - @` are neutralised.
- Workflow: (1) A hospital Admin opens Configuration > System > Support Access. (2) The Support audit card loads the organisation's stream and shows the chain check. (3) The Admin reads the entries (what support did, on which ticket, which cases). (4) Export CSV or JSON from the card; the export is recorded in the main audit log. (5) Separately, a Superadmin from ForMedrixAI whose access is approved works under a ticket and every action they take is appended without any step by them.
- Roles/permissions: `config:support-audit:view` to see and export the stream (seeded to Admin; a hospital may move it to another role). Related, same screen: `config:support-access:policy` (set policy and access window), `config:support-access:approve` (approve, reject, revoke; approver must belong to that organisation and not be the requester).
- Settings: Configuration > System > Support Access (policy Disabled / Approval required / Always allowed; access window 30 min, 1, 2, 4 or 8 hours). The stream itself is in `DELIBERATELY_NOT_RESET`, so it survives a demo Full Reset.
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Capture originating IP/country; end access on ticket close; tenant-isolated audit table (PS-358); real e-mail/webhook.
- Sources: services/supportAccess/README.md; supportAccessService.ts; supportAccessRules.ts; supportAccessGate.ts; components/Config/System/SupportAccessSection.tsx.

### Interface engine monitor and server jobs view
- What it does: Engines heartbeat and channel health with status line; Server jobs health, dead letters and Requeue.
- Workflow: System Logs > Interfaces > Engines; Server jobs.
- Roles/permissions: `interface:engine-status:view`, `jobs:server-job:view`, `:requeue`.
- Settings: VITE_SERVER_JOBS.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Engine status and server-jobs API endpoints.
- Sources: pages/InterfaceEnginesSection.tsx, ServerJobsSection.tsx.

### Exports through the server and My exports
- What it does: Export buttons go through one service; with server, notices and My exports page (7-day retention, 3 open).
- Workflow: Export, download from /my-exports.
- Roles/permissions: one capability per kind.
- Settings: API server address.
- Status: Built (Demo) (Batch 611). A Simulated export server lets long exports show Preparing, appear in My exports and download. Waiting on the server side: /api/exports endpoints, worker, signed links and hub status events.
- Sources: services/exports/README.md.

### Internal messages (staff notifications)
- What it does: Messages drawer available app-wide from the navigation bar: inbox list with unread count, urgent pill and an audible alert tone while any urgent message is unread, thread view with reply, compose with recipient chips, subject, urgent toggle, a Secure email button, soft delete to a Deleted view with Restore and permanent delete, bulk mark-read and delete, links to a case (accession) or a configuration page. The inbox reloads on push (hub topic `messages`, to the recipient only) with a safety poll, polls every 20 s without a hub, and reloads when the browser tab becomes visible. Signing out clears the previous person's inbox. Linkable accessions are limited to cases the reader may open (support-access-only cases excluded).
- Workflow: (1) A user clicks Messages in the navigation bar (drawer open state is remembered for the session). (2) Reads a message; opening it marks it read. (3) To write, clicks Compose, searches or browses recipients from the organisation directory, fills subject and body (fields marked required by the lab are enforced), optionally marks Urgent, and sends. (4) Reply from the thread. (5) For patient or finding details the sender uses Secure email, which goes through one of the lab's configured gateways. (6) The recipient sees the unread badge, and the tone for urgent messages.
- Roles/permissions: `message:internal:send` to send or reply as a person (seeded to every built-in role; refusal shows "not permitted" and the error `MESSAGE_NOT_PERMITTED`); `message:secure-email:send` for Secure email, which also needs a gateway set up and, for patient data, a BAA or data processing agreement in force. Reading one's own inbox needs no capability. Notices the app sends itself do not need the send capability.
- Settings: Configuration > Field Requirements > Messaging (which of recipient, subject, body are required); the lab's secure gateways (secureMessaging).
- Status: Built (Demo): message store is browser mock storage; the secure e-mail send itself is simulated (PS-143, PS-332 open). Message sent to a physician from patient history matches by name (imperfect).
- Sources: services/messages/README.md; contexts/MessagingContext.tsx; components/AppShell/AppShell.tsx; services/messages/IMessageService.ts.

### System-generated staff notices
- What it does: The app sends in-app messages to staff on its own (sender "System" or "System Admin"), with no step by the recipient's colleague. Verified senders: access requested / access denied (to the Admins of the requester's organisation, and back to the requester on denial); follow-up due-soon and overdue alerts; tumor board presenter assignment to a future meeting (board name, time and accession only, with an `.ics` calendar invite e-mailed when the presenter has an address); ForMedrixAI support access requests (urgent, to each approver, with a link to Support Access); report delivery exceptions after automatic retries are exhausted (urgent, to Admin and Lab Director); inbound ADT messages that cannot be auto-processed (urgent, to clinical admins, with a link to Audit > Interface Log); a requested synoptic template becoming available (to the requester); a block-exhaustion e-mail to the ordering pathologist. The Home tile and Registry card badge show a live count of registry submissions needing attention.
- Workflow: (1) A triggering event happens (a user requests access, a follow-up passes its warning date, a presenter is assigned, a delivery fails, an ADT message is rejected, a template is published, a technologist flags a block exception). (2) The service posts the message to each recipient's inbox in the background; a failed send never undoes the action. (3) The recipient sees the unread badge in the navigation bar (urgent ones add the alert tone), opens Messages and follows the link in the message (case, Audit page or Configuration section).
- Roles/permissions: none needed to receive. The message is addressed by role or relationship: Admin (access requests, support approvals), Lab Director and Admin (delivery exceptions), the pathologist who signed out plus Lab Directors and QA Reviewers (follow-up), the requester, the presenter, clinical admins (ADT exceptions). Sending does not need `message:internal:send` (not composed by a person).
- Settings: follow-up warning days (Configuration > System > Follow-up tracking); otherwise none found. The claim that toasts are redacted for PHI could not be confirmed in code checked (Unverified).
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Server mail service and hub inbox push.
- Sources: utils/accessRequests.ts; services/access/mockAccessRequestService.ts; services/followUp/followUpLive.ts; services/tumorBoard/notifyTumorBoardAssignment.ts; services/supportAccess/defaultSupportAccessService.ts; services/delivery/deliveryRetryDeps.ts, deliveryRetries.ts; services/hl7/processPatientManagementMessage.ts; services/templates/templateService.ts; services/communications/README.md.

### Template lifecycle e-mail notifications
- What it does: When a synoptic template changes lifecycle state, the browser sends only the event (`POST /api/notifications/template-events`) and the server chooses recipients, writes the e-mail in each recipient's language (en, fr, de, nl, ko) and sends it from no-reply. It never blocks the user and never retries. Events that send e-mail: `template.submitted_for_review` (to Template Approvers and Lab Directors), `template.needs_changes`, `template.approved`, `template.published` (to everyone who saved the template), and `sync.new_template_found`, `sync.template_updated`, `sync.auto_failed`, `sync.manual_upload` (to Admins). No patient data in any e-mail.
- Workflow: (1) A template author submits a template for review; a reviewer returns it with a reason (changes requested), approves it, or an approver publishes it, in the template editor's lifecycle confirm dialog (Configuration > Protocols, Review Queue). (2) After the transition succeeds the editor records the audit event and sends the notification event in the background. (3) The server resolves recipients and sends. (4) Recipients open the link in the e-mail (Review Queue, or the template editor for "changes requested"). The four `sync.*` events have no caller in the browser code (checked by search); the server's sync job is expected to raise them (Unverified).
- Roles/permissions: the transition is gated by the template governance capabilities (`config:protocol:draft` to submit, `config:protocol:approve`, `config:protocol:publish`; exact per-transition mapping Unverified here). Receiving needs no capability; recipients are chosen by role id `template-approver`, `lab-director`, `admin`.
- Settings: none (no opt-out, no digest in the first release). Template governance settings (required reviewers) are separate.
- Status: Built (Demo). Browser posts the event from the template lifecycle (templateLifecycleEvent.ts) and never blocks; built and tested. The server picks recipients, writes localised e-mails and sends them.
- Sources: services/communications/templateLifecycleEvent.ts, notificationService.ts, synopticNotificationService.ts; hooks/useSynopticAudit.ts; components/Config/Templates/TemplateRenderer.tsx; types/SynopticAuditEvents.ts; docs/architecture/TEMPLATE_NOTIFICATIONS_API.md.

### QA feedback button and enhancement request
- What it does: NavBar buttons for enhancement and QA feedback with PHI-redacted screenshot; recipients and visibility set by admin.
- Workflow: NavBar > modal > send.
- Roles/permissions: `config:feedback:manage`.
- Settings: Configuration > System > Feedback.
- Status: Built (Demo) - delivery needs server mail.
- Sources: components/EnhancementRequest/README.md.

### QA oversight and access permissions
- What it does: Separate capabilities for QA actions and Role Dictionary dependencies.
- Workflow: Admin edits roles.
- Roles/permissions: `qa:capa-recommendation:decide`, `qa:pathologist-trend:view/decide`, `qa:follow-up:*`, `audit:*`.
- Settings: Role Dictionary.
- Status: Built (Demo); server enforcement Planned.
- Sources: services/authorization/README.md.

#### Not yet in FEATURE_OVERVIEW.md
- My Contribution, Productivity, Quality, AI Contribution and Mentor tabs.
- Bench Contribution dashboard.
- Facility Ops wall displays and Display Profiles.
- OR Suite board, OR terminals, PIN dismissal.
- Peer review before sign-out.
- CAPA recommendations queue.
- Cytology QC (assignments, rules, peer review queue).
- 5-year lookback and cyto-histology correlation.
- Pathologist review tray.
- Tumor Board notices.
- Access request tickets.
- Registry Exceptions worklist.
- Follow-up tracking beyond tab name.
- QA Activities pillar and configuration center.
- Surgical post-sign-out QA review.
- Concordance review settings.
- Worklist tiles, pools, saved searches, Case Search, global search bar.
- Informal review requests.
- Critical alert dispatch and reference page.
- Internal messages drawer.
- Client SLA and performance targets (stubs).

#### Status in FEATURE_OVERVIEW.md that the code contradicts
- Quality Assurance: overview says seven pillars; code has eight (Activities missing).
- Outside consult links: overview says Live; code uses a browser-only mock token service, so Partial (Demo).
- Delegation, Pools & Case Team: overview says Live; delegation voice actions unwired and delegation never completes; pool enforcement off by default.
- Countersign: overview says Live; cytology reject UI and cytology/autopsy rules are partial.

---

# Theme 5: Integration, server and platform


Reading guide. "Server" means the planned PathScribe API server (ASP.NET Core over SQL Server, with SignalR; phase 2e / PS-539 / PS-358). No server code exists in the repo. What exists is browser code that talks to it, written contracts in docs/architecture/*.md, and Python and Vercel stand-ins in functions/ and api/. PathScribe sends JSON; the interface engine (ForMedrixAI's, BridgeLink-based) builds HL7. All paths are relative to /home/claude/work.

### Integration modes: Assist (CoPilot) and Orchestration
- What it does: Each case has a reporting mode. Assist (CoPilot): PathScribe is a synoptic data-capture layer over a host LIS; LIS cases are numbered S26-. Orchestration: PathScribe owns the report lifecycle for outreach cases, including AI narrative; cases are numbered O26-. One facade (CaseRouter) sends each case to the right data source; Orchestration cases show only to users with canViewOrchestration. "Finalize" remains for Assist; Orchestration uses "Sign Out Case". Structured cytology review, sign-out and dispatch work only on Orchestration cases; an Assist case shows a blocking message.
- Workflow: Admin turns Orchestrator mode on for the organisation and may override per internal client (Configuration > AI). A pathologist without access uses "Request Orchestration access" (creates a ticket, messages admins, admin grants in Staff or Facility Configuration or denies in QA > Access Requests).
- Roles/permissions: config:ai-provider:manage (AI service and default reporting mode); canViewOrchestration; access-request ticket flow.
- Settings: Configuration > AI (org toggle, Facility.internalAiOrchestratorEnabled); default reporting mode in AI settings.
- Status: Built (Demo) — mock case services; FHIRCaseService is an unwired scaffold and FirestoreCaseService a stub (production is the SQL Server API).
- Sources: docs/product/FEATURE_OVERVIEW.md; src/services/cases/README.md (CaseRouter.ts); src/services/aiConfig/README.md; src/components/Config/AI/orchestratorModeConfig.ts; src/services/access/README.md; src/services/cytology/README.md.

### Assist LIS ingestion (inbound LIS status feed)
- What it does: Adapters normalise HL7 v2 (ORU^R01, ORM^O01, OML^O21; one update per OBR) and a PathScribe JSON webhook ({accession, status, updatedAt, grossText, microscopicText, diagnosisText}) into a staging queue. Accession from OBR-3/OBR-2/ORC-3; status from ORC-5 then OBR-25 (order configurable per site); time from OBR-22 then MSH-7 (no offset means UTC); text from OBX LOINC 22634-0 gross, 22635-7 microscopic, 22637-3 final diagnosis. Duplicates dropped; placer and filler order numbers kept. Failed events retry each run up to 5 attempts, then wait for admin "Retry failed"; queue keeps all pending/failed plus newest 200.
- Workflow: Admin opens Configuration > System > Integrations > Assist LIS Ingestion: sets polling on/off, interval (1 to 1440 min) and the LIS status mapping (Gross Complete, Microscopic/Diagnosis Complete); pastes a test HL7 or JSON message; Poll now; sees counts, 25 latest events, last 20 runs (trigger manual, scheduled, push, retry).
- Roles/permissions: config:assist-polling:manage; assist:lis-message:ingest.
- Settings: as above; one LIS per deployment.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Scheduled poll job, inbound HTTPS endpoint, message authentication, real LIS source.
- Sources: src/services/lisIngestion/README.md, adapters/README.md; src/services/assistPolling/README.md; src/components/Config/System/AssistLisPollingSection.tsx.

### Assist AI drafting from LIS milestones
- What it does: When the LIS reports Gross Complete, AI picks synoptic templates and fills what gross text supports (never sees microscopic). At Microscopic/Diagnosis Complete it rechecks templates and completes the draft. All AI output is a draft. Fields a person typed or verified are never overwritten; a differing suggestion goes to "keep or update?" in the synoptic panel. A new specimen gets a new draft; an untouched AI draft changes in place; a pathologist's own change goes to pending protocol changes. Unchanged LIS text is skipped, amended text redrafted. Signed-out cases are never touched. The worker saves against the newest case version and redrafts next run if the case moved. LIS diagnosis goes to diagnostic.primaryDiagnosis. Each draft records which milestone drove it.
- Workflow: Automatic after ingestion; pathologist opens a case with a draft waiting and confirms or overrides.
- Roles/permissions: system process; AI vendor policy applies.
- Settings: AI Behavior toggles; AI vendor policy per jurisdiction.
- Status: Built (Demo) — depends on the AI service and on the ingestion feed above.
- Sources: src/services/assistPolling/README.md (assistMilestoneRules.ts); src/types/case/README.md; src/services/reports/README.md.

### Assist synoptic result back to the LIS (workup, PDF, text block)
- What it does: On Assist finalize, each workup's structured synoptic result (v1.0.0: codes, suggested CPT without modifiers, staging from pT/pN/pM/FIGO tags, observations with unit, SNOMED, block and AI-override data, Mohs stage and sector observations), its PDF and a text block go onto the LIS-sync queue; again on each correction or addendum. A missing PDF holds the message. A workup PDF shows parts, protocol and version, status, signer, answers and "Changed in this version". Optional single combined case PDF (PSR-{caseId}-CASE-V{n}) when the performing lab sets consolidate outbound PDFs. Release time is the sign-out time when the signer is the pathologist who signed out.
- Workflow: Pathologist finalizes; LIS-sync queue and dead-letter queue show state. Setting lives in Facility editor > LIS Integration (performing labs).
- Roles/permissions: interface:outbound:resend for resend.
- Settings: Facility.consolidateOutboundPdfs.
- Status: Built (Demo) — queue and builders work; LIS write-back and the transport need the interface engine/server.
- Sources: src/services/reports/README.md (dispatchAssistSynopticResult.ts, synopticResultPayload.ts, workupPdf.ts); docs/architecture/SYNOPTIC_RESULT_API.md; functions/README.md.

### CoPilot report view (print in Assist mode)
- What it does: In Assist mode "Print" sends the completed synoptic data back to the LIS as the print; a modal shows the report instance with a revision line.
- Workflow: Report page > Print in Assist mode.
- Roles/permissions: report:case-report:print (checked and audited).
- Settings: none.
- Status: Built (Demo).
- Sources: src/pages/SynopticReportPage/components/CopilotReportViewModal.tsx; src/hooks/README.md (useReportRevisionStatus).

### LIS-side case data: on-demand fetch, prior reports, flags, amendment notices, specimen sync state
- What it does: (1) An accession not in the local cache is fetched live from the LIS (metadata and status only), cached and opened; a case with a pending LIS amendment notice counts as a cache miss. (2) Prior reports for Assist cases are fetched by patient (FHIR DiagnosticReport) when a case is routed to a pool, cached as summaries only, https only, 3 attempts per case. (3) Flag codes reported by the LIS are added to the flag catalog if new and applied to the case or specimen. (4) A specimen edited in PathScribe on an LIS case shows "Pending sync"; sync_sent and sync_rejected await LIS write-back. (5) Inbound "Disconnected Modification" LIS notices need pathologist review.
- Workflow: (1) scan, type or speak accession in the nav search bar; (2) automatic at pool routing; (3) automatic on LIS sync; (4) report-page specimen editor.
- Roles/permissions: none stated.
- Settings: LIS endpoint (https gate).
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Nightly refresh job and LIS FHIR/HL7 write-back.
- Sources: src/services/cases/README.md (CaseSearchBar.tsx, mockOnDemandCaseFetchService.ts); src/services/patientHistory/README.md; src/services/flags/README.md; src/services/specimens/README.md; src/services/reports/README.md (mockLisAmendmentNoticeService.ts).

### Interface engine connection and LIS routing per facility
- What it does: interfaceEngineConnection is set once per Enterprise and never overridden per facility. lisRouting (sending and receiving facility ids, outbound channel override) is per facility; non-enterprise facilities have an "Override Enterprise routing" toggle, off by default. Affiliates inherit through resolvers. Identifier Formats tab: per-format enable toggles with a live test and simulate-scan tool; enablement per Enterprise with facility override; scanner, nav search and Search page use the union of enabled formats.
- Workflow: Admin edits in Facility editor > LIS Integration and Identifier Formats tabs. The older global LIS, Identifier Formats and Facility Setup sections are retired.
- Roles/permissions: config:facilities:manage.
- Settings: Facility record fields above; VITE_INTERFACE_RECEIVER_ENDPOINT for the engine address.
- Status: Built (Demo) — a real engine is deployment config.
- Sources: src/services/facilities/README.md; src/components/Config/FacilityDictionary/README.md; src/components/Config/System/README.md.

### Vendor-neutral outbound events and interface transaction types
- What it does: PathScribe publishes one neutral message per event and the engine maps it to Roche Vantage or Leica Cerebro. Types: ORDER_CREATED, ACCESSION_EVENT, REFERRAL_MANIFEST, MOLECULAR_ORDER, REPORT_DELIVERY, PRINT_JOB, CRITICAL_ALERT, WSI_SCAN_MANIFEST, REGISTRY_REPORT, CANCER_REGISTRY_REPORT, plus patient ADT (A08, A40, A47), ORU result and LIS_SYNC. Order payloads carry ids, department, stain code, urgency and site and no patient name or date of birth by default (patientDataScope). A guard test keeps the code list, docs/architecture/INTERFACE_TRANSACTIONS.md and functions/main.py in step.
- Workflow: none for users.
- Roles/permissions: none.
- Settings: patientDataScope.
- Status: Built (Demo). Contracts, builders, queues and the stand-in receiver are built; vendor translation is the engine's job and no engine ships here.
- Sources: docs/architecture/VENDOR_NEUTRAL_EVENTS.md, INTERFACE_TRANSACTIONS.md; src/services/interfaceDispatch/README.md (interfaceTransactions.guard.test.ts).

### Interface message dispatch (envelope, timeout, error codes)
- What it does: One function wraps every outbound payload in an envelope (queueEntryId, transactionType, dispatchedAt, payload) and POSTs it to the interface engine. Timeout 15 s. Failures: DISPATCH_REJECTED (non-2xx), DISPATCH_UNREACHABLE, DISPATCH_TIMEOUT, each with a plain message and technical detail, audited at the moment they happen. Production needs an https receiver. A queue entry is marked SENT only on success; unbuildable or held messages are marked FAILED with the reason and never posted.
- Workflow: Used by every outbound queue.
- Roles/permissions: n/a.
- Settings: VITE_INTERFACE_RECEIVER_ENDPOINT.
- Status: Built (Demo) — receiver is deployment config; the repo stand-in is a Python function.
- Sources: src/services/interfaceDispatch/README.md (dispatchInterfaceMessage.ts, DISPATCH_TIMEOUT_MS = 15000).

### Outbound result messages (ORU^R01 as JSON)
- What it does: At release, one JSON result per finalized instance (not per case) is queued with the report PDF and dispatched. Type: first sign-out FINAL; amendment of a prior record CORRECTED; otherwise ADDENDUM. Carries diagnosis comment, "previously reported as", confirmed abnormal-finding severity, structured synoptic result and, for autopsy, the case-level result (PAD preliminary, FAD final). The message is held and retried if the PDF is unavailable or the workup version (count of signed versions) cannot be read; it carries reportPdfSha256 and a retry records the hash actually sent. Assist cases are excluded (they use LIS sync). Cytology publishes one consolidated result per accession.
- Workflow: Automatic at release (after any release delay); failures appear in the outbound queues view.
- Roles/permissions: n/a; resend needs interface:outbound:resend.
- Settings: interface endpoint.
- Status: Built (Demo) — no HL7 string is produced in PathScribe; reportNarrativeText is still undefined in practice.
- Sources: src/services/reports/README.md (buildOruR01Payload.ts, prepareOruR01Dispatch.ts, oruWorkupVersion.ts); src/services/cytology/README.md; src/services/autopsy/README.md.

### Outbound queues, dead letters and resend (eight queues)
- What it does: Review and act on patient ADT, results, Assist LIS sync, accession events, cytology results, referral manifests, molecular orders and report delivery. Actions: Retry Dispatch, Dispatch Now, Simulate Failure (timeout, unreachable, rejected; messages labelled "Simulated"), Capture as CAPA. Result retry sends the held PDF; cytology entries are rebuilt from the sign-out record; report-delivery resend re-reads the signed PDF and re-looks up the fax recipient. A delivery exceptions panel sits on top.
- Workflow: Audit Log > Interfaces > Outbound. QA "Failed Dispatches" tile deep-links to /audit?tab=financial&view=outbound_dlq.
- Roles/permissions: interface:outbound:resend (Admin).
- Settings: none.
- Status: Built (Demo) — real sends need the engine; failures are simulated in the demo.
- Sources: src/services/interfaceDispatch/README.md (outboundQueueActions.ts); src/pages/OutboundInterfaceDlqSection.tsx; src/services/hl7/simulateInterfaceDispatchFailure.ts.

### Outbound Dispatches trail
- What it does: Read-only trail of OrderCreated sends: time, message id, category, type, accession, facility, outcome (delivered, failed, error code, attempts), filter pills, search and a JSON payload drawer with Copy. No HL7 view (the engine builds HL7). Older events read "outcome unknown". Demo seeds none.
- Workflow: Audit Log > Interfaces > Outbound Dispatches.
- Roles/permissions: administrators.
- Settings: none.
- Status: Built (Demo) — phase 1 covers category E (order creation) only.
- Sources: src/services/interfaceEngine/README.md (buildDispatchTrail.ts); src/pages/OutboundDispatchTrailSection.tsx.

### Outbound OrderCreated and accession events
- What it does: For a walk-in case with no imported order, submit builds an OrderCreated event (demographics, accession as placer order number, requesting provider as raw name, specimens, diagnosis) and sends it fire and forget; idempotent by messageId; importing a pending order sends nothing. A separate accession-events queue (QUEUED/SENT/FAILED, retry, audited) sends order.accessioned (with full clinical history) after the case saves, or order.deficiency.created with validation errors on failure. Neither blocks accessioning.
- Workflow: Automatic on Accession submit.
- Roles/permissions: n/a.
- Settings: VITE_INTERFACE_RECEIVER_ENDPOINT.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Interface engine translates to HL7/FHIR.
- Sources: src/services/interfaceEngine/README.md (buildOrderCreationPayload.ts); src/services/accessioning/README.md; src/pages/AccessionPage/AccessionPage.tsx.

### Outbound message preview
- What it does: Builds example outbound JSON for ADT A08/A40/A47 and ORU^R01 from a typed case or patient id and lets an admin download it. ORU preview is exactly what a release sends, including the PDF (a result without PDF says it would be held).
- Workflow: Configuration > System > Outbound Interface Message Preview.
- Roles/permissions: config:interface-preview:view (shows patient data).
- Settings: none.
- Status: Built (Demo).
- Sources: src/services/interfacePreview/README.md; src/components/Config/System/OutboundMessagePreviewSection.tsx.

### Outbound patient ADT messages (A08, A40, A47)
- What it does: JSON for demographics update (A08), merge (A40) and break-glass rebind (A47) with full identity and crosswalk identifiers, queued with retry and dead letter. An A08 also goes out when a national identifier or registry opt-out is added or changed after accessioning. Link (A24) and Move (A43) deliberately queue nothing outbound.
- Workflow: Automatic on those operations.
- Roles/permissions: n/a.
- Settings: interface settings.
- Status: Built (Demo). Queue, builders, retry and dead letter work and Audit Log > Interfaces > Outbound can dispatch, resend or simulate failure through the dev receiver. Only a real engine is missing.
- Sources: src/services/patients/README.md; src/types/patients/README.md (OutboundPatientAdtQueueEntry.ts).

### HL7 ORM^O01 builder and Mode A hardware dispatch
- What it does: ormBuilder builds one ORM^O01 per block with an OBR per ordered stain, timestamps in the facility UTC offset, behind a vendor-adapter seam. ModeAInterfaceService wraps it for BLOCK_ORDER; slide-order and specimen-label dispatch return "not implemented".
- Workflow: none; nothing transmits.
- Roles/permissions: none.
- Settings: facility time zone.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Vendor HL7 field layout (IHL7VendorAdapter) and engraver endpoint.
- Sources: src/services/hl7/README.md; src/services/hl7/ormBuilder.ts; src/services/hardware/README.md, ModeAInterfaceService.ts.

### Vendor HL7 adapters (Vantage, Cerebro)
- What it does: identityAdapter passes standard HL7 through unchanged. vantageAdapter (Roche navify Pathology Lab Advantage) and cerebroAdapter (Leica) deliberately throw "not implemented" until a verified vendor integration guide exists.
- Workflow: none.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built (Demo). identityAdapter works; Vantage and Cerebro adapters deliberately throw until a verified vendor integration guide exists.
- Sources: src/services/hl7/adapters/README.md; docs/architecture/VENDOR_NEUTRAL_EVENTS.md.

### DFT^P03 charge message builder and preview
- What it does: Builds a professional-pattern DFT^P03 with one FT1 per service charge (CPT, description, modifiers in FT1-26, quantity, transaction id) and DG1 from the case ICD-10. No institutional segments (no PR1, DRG, revenue codes, FT1-25). A Configuration preview shows the message without sending.
- Workflow: Configuration > System > DFT Export Preview.
- Roles/permissions: config:interface-preview:view.
- Settings: facility time zone.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Interface engine endpoint for charge messages.
- Sources: src/services/hl7/dftBuilder.ts; src/services/billing/README.md; src/components/Config/System/DftExportPreviewSection.tsx.

### Billing JSON webhook and financial-class payloads
- What it does: ChargeCaptureEventPayload (performing facility CLIA/ISO number resolved through the ordering facility) and a financial-class payload (local scheme, outbound format name, payer, policy, secondary coverage) for a downstream billing engine. No adjudication or amounts.
- Workflow: none; no caller.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Downstream billing engine; X12 837P, KVDT, SESAM-Vitale specifications.
- Sources: src/services/billing/README.md (jsonWebhookBuilder.ts, buildFinancialClassPayload.ts).

### Inbound ADT processing and encounter updates
- What it does: Parses and applies A01/A04 (create or resolve patient and encounter), A02/A09/A10 location change, A06/A07 class change, A08 demographics and visit data (PID-9/11/13/16/29/30, DG1 diagnoses), A31, A03 discharge, A11/A12/A13 cancellations (A12 restores previous location). PV1-3 maps to a Location. PID-3 national identifiers are classified with check digit (bad checksum kept as failedChecksum). A08 uses sequence control: an event older than the last is rejected and logged; every applied change is audited with field names only. Aliases are replaced wholesale. A05 is Planned; A45, A50, A34 not handled; A21/A23 deliberately not built. Feeds cytology high-risk factors from DG1 codes.
- Workflow: Needs a per-facility facilityId and a transport.
- Roles/permissions: n/a (interface feed).
- Settings: location crosswalk (PV1-3).
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Interface engine inbound listener for ADT.
- Sources: src/services/hl7/README.md (adtParser.ts, processAdtMessage.ts); src/services/encounters/README.md; src/services/patients/README.md.

### Inbound patient merge, link, change-identifier and move (A40, A24, A47, A43)
- What it does: Applied through the same operations as the human match review. If either side is not a confirmed match the message goes to the interface exception queue and Clinical Admins are notified; nothing is created or moved on a guess. A43 moves one case (and its encounter unless another case shares it) from a wrongly attached patient; neither patient is retired.
- Workflow: Audit > Interface Log > open exception: A43 offers "Move Selected Cases" (nothing preselected); any type can be dismissed ("No Action Needed"). Manual move also in Patient Management and Search "Reassign Patient".
- Roles/permissions: audit access (screen:audit-log:open); Clinical Admin notified.
- Settings: none.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Live HL7 transport from the engine.
- Sources: src/services/hl7/README.md (processPatientManagementMessage.ts); src/services/interfaceExceptions/README.md; src/components/Audit/InterfaceExceptionReviewModal.tsx.

### Interface exception queue (Interface Log tab)
- What it does: Holding queue for inbound messages that cannot be safely resolved: A43/A40/A24/A47 with unmatched identities or no or unmatched MRG-5, and unmapped_order_code orders. Each entry has a reason, the raw message and a status (pending, resolved, dismissed). For unmapped order codes an admin picks a Specimen Dictionary entry in a searchable list and "Map & Link" adds the crosswalk entry and resolves in one step.
- Workflow: Audit > Interface Log (?tab=interfaces): Pending/Resolved/Dismissed pills with counts, search, CSV export; Review opens the modal. The "Unmapped Stubs" banner on the Crosswalk screen links here.
- Roles/permissions: screen:audit-log:open.
- Settings: none.
- Status: Built (Demo) — see the A40/A24/A47 gap above.
- Sources: src/services/interfaceExceptions/README.md; src/services/orderIntake/README.md.

### Map Patient (break-glass rebind of downtime placeholders)
- What it does: Merges a downtime placeholder patient (isDowntimeRecord) into the confirmed patient. Needs one of 7 reason codes and a note of 10+ characters, then Review & Confirm. Writes immutable audit mpi.breakglass.rebind and queues ADT A47. Refused for non-downtime records.
- Workflow: Audit Log > Interface Log > Map Patient: pick downtime record, pick target, reason (pre-filled), note, confirm.
- Roles/permissions: admin, pathologist-admin or superadmin (the isAdmin test in AuditLogPage; broader than "admin" only).
- Settings: reason taxonomy (BreakGlassReasonCode).
- Status: Built (Demo).
- Sources: src/services/patients/README.md; src/components/Audit/BreakGlassRebindModal.tsx; src/pages/AuditLogPage.tsx.

### Inbound canonical events (block exception, material location, instruments, results)
- What it does: PathScribe-owned event contracts (not raw HL7), applied through the normal case write path and idempotent on messageId; handlers rebuild from the newest case on version conflict. Block exception updates block status (Lost or Damaged raises a CAPA). Material location keeps a last-known-location cache on specimen, block, slide, decant (badge in the Material Tree). Positive HPV result fires a genotyping order. Also: cassette dispatch outcome, engraver status, molecular batch and run results, ThinPrep processor and stainer status, WSI scan status, cytology proficiency scores, AI screening results, clinical-history accession, referral results, cold-chain telemetry. Toasts for these events are PHI-redacted and translated.
- Workflow: Engine posts events; bench sees a toast. Dev-only "Sim Block Exception" and "Sim Location Update" buttons on the report page.
- Roles/permissions: system credentials.
- Settings: none.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Receiving endpoint plus real vendor connections.
- Sources: src/services/hl7/README.md; src/types/events/README.md; docs/architecture/INTERFACE_ENGINE_EDGE.md.

### Engine webhooks (Vercel/Firestore implementation)
- What it does: Four inbound functions: cassette-dispatch-outcome (audit trail; error raises CAPA def-cassette-dispatch-failure), block-exception (Lost/Damaged updates the block, raises CAPA, notifies), material-location (updates all 8 levels), engraver-status (upsert, ignores stale reports). Shared secret and/or HMAC, fail closed, constant-time compare; idempotent by messageId claimed in the same transaction as the write; refusals logged to integration_errors.
- Workflow: External engine POSTs.
- Roles/permissions: shared webhook secret (per-tenant credentials come with the API server).
- Settings: ENGINE_WEBHOOK_SECRET, ENGINE_WEBHOOK_HMAC_SECRET, FIREBASE_SERVICE_ACCOUNT_KEY.
- Status: Built (Demo). api/webhooks/engine functions are real and unit-tested but are server code, to be replaced by the SQL Server API; browser side has no missing screen.
- Sources: api/webhooks/engine/README.md, _lib/; src/firebase/README.md.

### Engraver Monitor and dispatch history (engine-fed screens)
- What it does: Engraver Monitor lists engraver devices (online, engraving, warning, fault, offline) with coarse supply warnings; material tracking history shows cassette-dispatch outcomes and block exceptions per case. Both read Firestore collections (engraver_devices, pending_engine_notifications).
- Workflow: Batch Management > Engraver Monitor (/batch-management/engraver-monitor); Material tracking history modal on a case. Live via the engravers topic with a 30 s fallback.
- Roles/permissions: screen:batch-management:open.
- Settings: seed script scripts/seedEngraverDevices.ts.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: SQL Server API and engine feeds.
- Sources: src/services/engravers/README.md; api/webhooks/engine/README.md; src/firebase/README.md.

### Stand-in interface message receiver (Python)
- What it does: receive_interface_message in functions/main.py accepts every outbound transaction type (ORDER_CREATED, REGISTRY_REPORT, CANCER_REGISTRY_REPORT, PRINT_JOB, CRITICAL_ALERT, WSI_SCAN_MANIFEST with batch, scanner and slide checks, ACCESSION_EVENT, REFERRAL_MANIFEST, MOLECULAR_ORDER, REPORT_DELIVERY, A08/A40/A47, ORU_R01, LIS_SYNC). A guard test keeps its list in step with the docs.
- Workflow: Dev/demo target for the dispatcher.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo). receive_interface_message exists in functions/main.py with a guard test covering all transaction types; it needs deploying and is later replaced by the real engine.
- Sources: functions/README.md; functions/main.py (lines 1273-1384).

### Mock interface engine (developer tool)
- What it does: Browser-level mock (MSW) of the engine's receiving end with modes always succeed, always fail (configurable status) and hang. Optionally plays the slide scanner (scanning then scanned with QC passed after a WSI_SCAN_MANIFEST) and the molecular instrument (Positive or Negative after a few seconds, default off).
- Workflow: Developer opens /dev/mock-interface-engine by address; not in navigation; demo-tools build only.
- Roles/permissions: screen:configuration:open gate.
- Settings: enabled flag (default off), mode, failure status, scanner and instrument options.
- Status: Built (Demo). Built dev tool: MSW handlers with succeed/fail/hang modes plus slide-scanner and molecular-instrument simulators, routed at /dev/mock-interface-engine. 'Stub' is its intended nature, not a gap.
- Sources: src/services/mockInterfaceEngine/README.md; src/pages/MockInterfaceEnginePage/README.md; src/mocks/README.md; src/SignedInApp.tsx:62,204.

### Interface engine edge contract (BridgeLink)
- What it does: Design of the HL7 edge: hosted by ForMedrixAI or on site from one image; per-tenant credentials; normalised JSON envelope; apply-once keyed by tenant, sender and MSH-10; ordering; 24 h retry; ACK modes per MSH-15/16; engine-owned resends and dead letters alert Admin and Lab Director; health endpoints; HL7 over VPN or MLLP over TLS; a message is acknowledged only after durable storage.
- Workflow: n/a.
- Roles/permissions: system credentials.
- Settings: engine settings.
- Status: Built (Demo). Design contract only; the edge is the interface engine (hosting, ACK, retry, dead letters). TypeScript contract exists and the monitor screen reads it.
- Sources: docs/architecture/INTERFACE_ENGINE_EDGE.md; src/services/interfaceEngine/engineEdgeContract.ts, README.md.

### Interface engine monitoring (Engines view and status line)
- What it does: Each engine posts a heartbeat each minute. The view lists engines (worst first) with status online, attention, degraded (a stopped channel counts as degraded) or offline (unreadable time), last check-in, whether it reaches PathScribe, free disk, certificate expiry, listeners and channels with queue depth, oldest wait (over 15 min flagged) and dead letters. A line above the Interfaces sub-tabs reads e.g. "1 offline, 1 listener down and 2 online" and opens the view. Read-only; 15 s timeout; refresh by live topic with a 60 s fallback, paused when the tab is hidden.
- Workflow: Audit Log > Interfaces > Engines; "Open Outbound" for dead letters.
- Roles/permissions: interface:engine-status:view (Admin; needs screen:audit-log:open). No audit entry per poll.
- Settings: none.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: GET /api/interface/engines and engine heartbeat.
- Sources: src/services/interfaceMonitoring/README.md; src/pages/InterfaceEnginesSection.tsx; src/components/Interfaces/EngineStatusLine.tsx.

### Order intake: pending orders and specimen code crosswalk
- What it does: Incoming external orders are never written straight to a case. The facility is resolved through the Facility.assigningAuthority crosswalk (an unknown code auto-creates an Unverified facility an admin can verify); the specimen through a per-client crosswalk matching by coding system (local, LOINC, SNOMED) with normalisation. An unknown code auto-adds a pending crosswalk entry and raises an unmapped_order_code exception. The crosswalk screen shows admin-entered and system-learned entries, adds entries ahead of time (unique on clientId + externalCode), shows an Unmapped Stubs banner with a live count, and imports/exports spreadsheets with preview (facility and specimen type by name, per-row errors). Accession "Import from Order" is optional and fills patient, specimens, client, priority, ICD-10 and indication.
- Workflow: Accessioner picks from the pending queue; admin maintains Configuration > System > Integrations > Crosswalk.
- Roles/permissions: config:crosswalk:manage; config:facilities:manage (verify facility).
- Settings: optional codingSystem and siteId on a mapping.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Engine must send the sending site on orders.
- Sources: src/services/orderIntake/README.md; src/components/Config/System/CrosswalkSection.tsx; src/services/facilities/README.md; src/pages/AccessionPage.

### Physician master file sync
- What it does: Interface-engine JSON roster updates physicians, matched by sourceSystem + sourceRecordId, then NPI; a first record without NPI always creates a new physician (never merged by name). Bypasses the configuration permission because it is an interface feed.
- Workflow: Engine posts a record.
- Roles/permissions: system.
- Settings: none.
- Status: Built (Demo) — needs the engine.
- Sources: src/services/physicians/README.md (applyPhysicianMasterFileUpdate.ts).

### Inter-laboratory referral manifests and results
- What it does: Completing an External Referral batch (reconciliation or override) with a reference lab builds a referral manifest, queues it (QUEUED/SENT/FAILED, retry, audit) and creates a tracking record. Transit status moves forward only (dispatched, in transit, delivered, result received). Inbound results are discrete data or a PDF, never both; molecular send-out results pass to the molecular order engine. Counts feed the Send-Out & Reference Laboratory dashboard. Reference labs are facilities with the reference_lab role.
- Workflow: Batch detail > "Mark in transit" / "Mark delivered".
- Roles/permissions: referral:transit-status:update.
- Settings: reference lab facility role.
- Status: Built (Demo). Duplicate of referral entry: manifest queue, tracking, transit rules and inbound result processor are built and in the unified outbound screen. Only delivery to reference labs needs the engine.
- Sources: src/services/referral/README.md; src/services/facilities/README.md.

### Molecular worklist dispatch and instrument results
- What it does: After both plate and deck-location barcodes match (and the station matches the instrument's), the worklist is POSTed to /api/v1/events/molecular-worklist with sending and receiving facility ids; network and non-2xx errors are reported; sets worklistDispatchedAt and marks orders IN_RUN. Inbound run results gate on run validation. Outbound molecular order queue and in-house order engine feed the same engine contract.
- Workflow: Molecular Workcenter > Dispatch Worklist, scan both, Confirm Dispatch.
- Roles/permissions: none stated.
- Settings: instrument station linkage via the Equipment register.
- Status: Built (Demo). Dispatch, validation gates and run results work end to end in demo: MSW handler plus Mock Interface Engine page and instrument simulator answer the POST.
- Sources: src/services/molecular/README.md (dispatchMolecularWorklist.ts); src/services/molecularOrders/README.md; docs/architecture/MOLECULAR_ORDERS_API.md.

### Digital pathology integration: WSI scan batches, viewers, AI screening
- What it does: Scan queue lists slides routed to Digital (STAT first); a batch takes slides, Load assigns rack positions, Send dispatches a WSI_SCAN_MANIFEST (failure keeps the batch loaded with the error, "Send again" shows why), Unload marks slides that scanned and passed image QC as Scanned and returns the rest to the queue. Scanners come from the Equipment register. WSI viewer dictionary (Leica, Roche, Hamamatsu, Paige, PathAI, Proscia, Philips, one demo entry) holds a URL template with the stain barcode substituted; a launch button appears on a coverslipped stain chip (no DICOMweb, no vendor credentials; real templates ship empty). AI screening results (ordered, completed, failed, timed out; findings, regions, slide-level triage) ingest idempotently and show as a rank badge on the cytology worklist. Scanner dashboard shows pending, scanning, completed, failed and a "Scan QC Failed" alert.
- Workflow: /batch-management/wsi-scan; Config > System > Vendor Integrations (four dictionaries: Digital Pathology/AI, WSI Viewers, Image Management Systems, Gross/Macro Imaging and Telepathology).
- Roles/permissions: wsi:scan-batch:load/send/unload (checked at the scanner's lab); config:vendor-integrations:manage.
- Settings: launchUrlTemplate per vendor; scanner entries in Configuration > System > Equipment.
- Status: Built (Demo). WSI scan batches, viewers, AI screening: Mock scan batch service, simulated scanner, mock WSI viewer page and AI screening result store/processor exist; real scanners, vendor viewer URLs and AI traffic are external.
- Sources: src/services/digitalPathology/README.md; src/services/imageAssociation/README.md; src/pages/BatchManagement/README.md; src/components/Config/System/VendorIntegrationsSection.tsx.

### Critical alert delivery channels (SMS, secure email, EHR push)
- What it does: At sign-out the dispatcher resolves the physician's channel by severity and persists a dispatch record. SMS and secure email carry no PHI (fixed text plus an opaque reference link); EHR push carries finding and severity. Each channel's network call only logs to the console (method 'stub'). A generic-transport version (CRITICAL_ALERT through the engine, email-to-SMS gateway via physician carrier fields) is written but not wired (activation = three import swaps). Production EHR SSO hand-off from the reference link is not built. The reference link's token is an opaque random string made in the browser, not cryptographically signed (Planned: server-issued, validated tokens).
- Workflow: Admin sets physician carrier in Configuration > System > Physicians.
- Roles/permissions: config:physicians:manage.
- Settings: Physician.smsCarrier and smsCarrierOtherDomain.
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: SMS gateway, secure e-mail, EHR push and SSO hand-off.
- Sources: src/services/clinical/README.md, postGaAlertChannels/README.md; src/pages/CriticalAlertReferencePage/README.md.

### Secure messaging gateways
- What it does: One setup per performing-lab tenant from a catalogue: email (NHSmail, Egress, Accurx, Paubox, Virtru, Zix) and clinical networks (HealthLink, Medical-Objects, ReferralNet for AU/NZ; Korea health information exchange, CDA). Patient or finding details go only through a gateway with a BAA (US) or data processing agreement in force. A send is refused with noGatewayConfigured, gatewayNotAvailable or noAgreementForPatientData.
- Workflow: Admin sets gateways, sending address, staff allowed, default, BAA/DPA reference, signed date and optional expiry in Facility editor > Secure messaging (enterprise facilities); users send from the secure message window.
- Roles/permissions: config:secure-messaging:manage; message:secure-email:send; message:internal:send.
- Settings: as above.
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Real gateway transports for each catalogue entry (PS-332/PS-143) and per-site gateways.
- Sources: src/services/secureMessaging/README.md; src/services/messages/README.md; src/components/Config/FacilityDictionary/README.md.

### Cold-chain telemetry ingestion
- What it does: One reading shape for smart containers and storage units, classified at record time (strictly above max or below min is an excursion; exactly at threshold is not). Seeded condition types: Frozen Tissue max -20 C, Fresh Tissue max 8 C. Storage units and condition types have services but no admin screen.
- Workflow: Inbound telemetry event.
- Roles/permissions: n/a.
- Settings: thresholds.
- Status: Built (Demo) (Batch 610). Admin screens, a Simulated telemetry feed through the ingestion service, and readings and excursion status on storage unit, container and batch views, with batch hold and CAPA. Waiting on the server side: MQTT/IoT/REST ingestion endpoint and reading store.
- Sources: src/services/coldChain/README.md (processInboundTelemetryReadingEvent.ts, resolveColdChainExcursion.ts).

### Material scan event dispatch
- What it does: Barcode scans resolve to specimen, block or slide; the scan event is meant to go to an external LIS or middleware but only a shaped stub exists.
- Workflow: Any bench page with a scanner.
- Roles/permissions: n/a.
- Settings: scan station.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: LIS/middleware endpoint.
- Sources: src/utils/README.md; src/types/events/MaterialScanEventPayload.ts.

### Report release event, delivery channels and retries
- What it does: One publish point for every release (PRELIMINARY, FINAL, CORRECTED, ADDENDUM; surgical, cytology, autopsy). The delivery decision comes first (electronic, print, e-fax, file drop, dual, suppress). Rules match up to four criteria (provider, ordering facility, patient location, report type; unset = wildcard), most specific wins, ties by most recently updated, default ELECTRONIC_ONLY; SUPPRESS still logs the release. Each channel is primary, secondary, fallback or off: primary and secondary go at once, fallback only when a primary print, fax or file drop fails or has nowhere to go. Fax number: rule, then ordering physician, then facility. The PDF is made once, stored with its SHA-256, and every channel, retry and fallback sends those bytes. Failed print, fax or file drop retry after waits (default 1, 5, 15 min; up to 10 waits of 1 to 1,440 min). After the last retry the entry goes to Delivery exceptions, Admin and Lab Director are messaged, and fallback sends once. A non-retriable failure (browser network print) dead-letters at once. E-fax uses an email-to-fax gateway with a transmission report; file drop writes name.pdf and name.json to a folder or SFTP target atomically without overwrite, host key checked; PDF max 20 MB.
- Workflow: Admin builds rules in Configuration > System > Delivery Rules (Add/Edit modal and Test panel). Failures: Audit > Interfaces > Outbound > Delivery exceptions, then resend.
- Roles/permissions: config:delivery-rules:manage; interface:outbound:resend.
- Settings: Delivery Rules (channels, fax number, file-drop target, retry waits); server settings FAX_* and FILE_DROP_TARGETS.
- Status: Built (Demo). Rules, plan, queue, retries and DeliveryExceptionsPanel are built; the stand-in receiver functions/report_delivery.py exists. Production server and scheduled sweep are backend.
- Sources: src/services/delivery/README.md; src/services/reports/README.md (publishReportReleasedEvent.ts); docs/architecture/REPORT_DELIVERY_API.md; functions/report_delivery.py.

### Stored report documents and version PDFs through the API
- What it does: A released report is made once and never changed. Reads are hash-checked (X-Content-SHA256 and version hash); a failing PDF is refused and the result or release is held with the reason, never an older version. Version History lists "Released documents" with "View as sent" (audited) and says when the list may be incomplete (cytology print then refuses). With an API server, documents are read via GET /api/report-documents/{id}?purpose=view|send and versions via /api/cases/{caseId}/report-versions/{n}/pdf.
- Workflow: Automatic at release; Report page header chip > Version History.
- Roles/permissions: view/send purposes; errors notPermitted, unavailable.
- Settings: none.
- Status: Built (Demo). Browser store, HTTP clients, hash checks and Version History 'View as sent' are built (reportDocuments, VersionHistoryModal). Server store/endpoints and ids for older entries are backend.
- Sources: src/services/reportDocuments/README.md (httpReportDocumentService.ts); src/services/reports/httpReportVersionService.ts, reportVersionPdf.ts; docs/architecture/REPORT_DOCUMENT_STORE_API.md.

### Report renderer (server-side PDF)
- What it does: PDFs come from the render_report function (functions/main.py; outputFormat pdf or text) at VITE_REPORT_PDF_ENDPOINT (https in production). Since Batch 539 cytology PDFs also come from it (functions/cytology_report.py) and the browser jsPDF generator was deleted; release is held if the renderer returns a PDF without the cytology template marker. Workup PDFs for Assist cases come from it too. Footer Code 128 of accession plus version on every page.
- Workflow: Automatic on release, preview, print.
- Roles/permissions: n/a.
- Settings: VITE_REPORT_PDF_ENDPOINT.
- Status: Built (Demo) (Batch 609). The renderer draws document style, header and footer parts and page setup, with tests; the functions folder must be redeployed. Waiting on the server side: production renderer endpoint (https VITE_REPORT_PDF_ENDPOINT) in the API server.
- Sources: src/services/reports/README.md; src/services/cytology/README.md; docs/architecture/REPORT_RENDERING_SERVICE.md; functions/README.md.

### Print routing and print queue delivery modes
- What it does: A release print job goes by Mode 1 QZ Tray (PDF to a printer), Mode 2 interface-engine hand-off (PRINT_JOB), or Mode 3 direct network print (RAW 9100, LPR/LPD, IPP), with printers chosen by hierarchy workstation, location, client account, facility, facility default. Print failure never blocks electronic dispatch. A network print attempted from the browser fails at once with NEEDS_SITE_AGENT (no retry; dead-lettered with fallback and alert). Failed release prints retry automatically; a changed or missing stored document fails permanently, an unreachable server stays retryable; stored hash checked before reprint. Print Queue: status filter, Hold (queued, printing, failed), Release, Retry, Redirect, Cancel, bulk actions; "Sent to printer" for Raw 9100/LPR, "Printed" for IPP/IPPS.
- Workflow: Facility editor > Printing tab (printDeliveryConfig); Audit Log > Interfaces > Print Queue.
- Roles/permissions: print:job:hold, cancel, redirect, retry; config:print-routing:manage; config:print-settings:manage; report:restricted-case:print.
- Settings: Facility Printing tab; print routing rules.
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Site agent or POST /api/print/jobs; real hardware tests (PS-750).
- Sources: src/services/printing/README.md; src/services/printRouting/README.md; src/pages/PrintQueueDashboardSection.tsx; docs/product/FEATURE_OVERVIEW.md.

### Site agents (on-site print and file-share bridge)
- What it does: Admin screen for the per-site .NET agent (a site = performing-lab facility): list with status (online, needs attention, offline; refresh each minute), one-time enrolment code (single use, 24 h, shown once, Copy), revoke with quick-pick reason (note only for "other", max 500 characters), update window (both times or neither, may cross midnight), the site's agent printers and Windows file shares, pickup import of orders or results. Rules: printer id unique; IPv4 or host name (no IPv6); IPPS default port 631; label printer is ZPL on Raw 9100; shares only \\server\share (no local, device or admin shares); pickup patterns are file names only, never PDFs or images. Print destinations may be an agent printer (site + printer id) or an address; a report prints only at the lab that performed it; Redirect to another lab's printer is refused (PRINT_JOB_WRONG_SITE). Print Queue shows an agent status line (live "siteAgents" topic plus minute poll).
- Workflow: Configuration > System > Site agents; routing rule window, facility default printer, Print Queue Redirect.
- Roles/permissions: config:site-agents:enroll, config:site-agent-config:manage (either to view; checked at the site; Admin and Lab Director).
- Settings: Site agents screen; demo store site_agent_config.
- Status: Built (Demo). SiteAgentsSection, status line and routing are built against fake agent data; the .NET agent and its endpoints are another team's work.
- Sources: src/services/siteAgent/README.md (siteAgentAdmin.ts); src/components/Config/System/SiteAgentsSection.tsx; src/components/Printing/SiteAgentStatusLine.tsx; src/i18n/README.md.

### Site agent contract (design)
- What it does: Mutual TLS with enrolment by one-time code + CSR; local allow-list set by the hospital; outbound WebSocket /hubs/agent; 120 s job lease on the server clock; at-most-once printing (IN_DOUBT never resent); expiry 4 h for reports and 10 min for labels; labels never auto-retried; store and forward; file drop and file-share pickup (7-day de-dup); signed updates (Authenticode + Ed25519); heartbeat. Version 1 covers printers and shares; instruments are version 2.
- Workflow: n/a.
- Roles/permissions: n/a.
- Settings: n/a.
- Status: Built (Demo). Contract and admin screens are built (SiteAgentsSection, siteAgentAdmin, demo API; print routing uses AgentPrinter), so 'nothing uses it' is stale. The .NET agent and hub are other-team work.
- Sources: docs/architecture/SITE_AGENT_API.md; src/services/siteAgent/siteAgentContract.ts.

### Label printing bridges and PathScribe Agent client
- What it does: Per-printer Bridge Type: QZ Tray (available), OS print dialog (not for thermal barcode labels), Direct via Interface Engine, BarTender (Planned), Zebra Browser Print (Planned), PathScribe Agent. The Agent client finds the agent on wss://127.0.0.1 ports 9100-9102 (or the printer's Agent Port 1024-65535) by PING/PONG, uses GET_PRINTERS, GET_CAPABILITIES, PRINT_LOCAL_LABEL with idempotency key and a FIFO queue per workstation, and shows sending/queued/printing status; the same agent would serve scale weight (https only). Network label jobs show Sent, Printed (5 s), Failed with manual Retry/Dismiss, or no answer after 2 min; retry keeps the idempotency key. Demo buttons "Simulate: printed / out of labels" appear only with no API server. Printer profiles record vendor, ZPL, DPI, bridge type, facility and linked equipment.
- Workflow: Admin sets Configuration > System > Workstation & Hardware > Printer Profiles; users see status at bottom left.
- Roles/permissions: config:printers:manage.
- Settings: Bridge Type, Agent Port; workstationBridges in the security-headers origins file; Chrome/Edge local-network prompt can be pre-approved by IT.
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: PathScribe Agent program (PS-52); Direct-print API (PS-53); BarTender and Zebra Browser Print are vendor work.
- Sources: src/services/printerProfiles/README.md; src/utils/labels/pathscribeAgent/README.md; src/services/networkPrint/README.md; src/components/Printing/README.md.

### Master Patient Index: deterministic matching and multi-authority identifiers
- What it does: Per-enterprise identity. A confident match reuses the identity; a confident non-match creates one; a partial match (same MRN with different name or birth date, or same name and birth date under another MRN) is "ambiguous" and goes to review. Identifiers are stored per assigning authority; an exact (authority, MRN) hit still needs birth date and name to agree. Records in another organisation never match. Not probabilistic. Outside/contract cases always get a fresh identity (never matched, "created_unmatched"); the accessioner may still link manually. Patient History lists real cases by patient id plus linked ids and shows nothing for cases without one.
- Workflow: Automatic at accession, legacy import and ADT intake.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built (Demo) — localStorage mock index; production is the API.
- Sources: src/services/patients/README.md (mockPatientIndexService.ts); src/services/accessioning/README.md.

### Patient match review queue (Confirm as new, Merge, Link)
- What it does: Admin resolves ambiguous matches with candidate records. Merge repoints all cases and encounters to the target and retires the source (later orders under the old MRN resolve to the target). Link joins two valid identities from different EMR systems without retiring either. Confirm as new accepts the record.
- Workflow: Quality Assurance > Patient Match Review (organisation picker).
- Roles/permissions: qa:patient-match-review:export for export.
- Settings: none.
- Status: Built (Demo).
- Sources: src/services/patients/README.md; src/components/QualityAssurance/PatientMatchReviewSection.tsx.

### Downtime intake placeholders
- What it does: Accession intake type Standard / Downtime / Outside. Downtime needs a reason code and creates a temporary placeholder identity (isDowntimeRecord) with an amber banner, later rebound by Map Patient. Outside shows a teal badge and the Outside Patient Data tab. This is the only downtime support: there is no offline mode (no service worker; checked).
- Workflow: Accession page, choose intake type first.
- Roles/permissions: none.
- Settings: downtime reason taxonomy.
- Status: Built (Demo) — identity handling only; the app does not work offline.
- Sources: src/pages/AccessionPage/README.md; src/services/patients/README.md.

### National identifiers with check digits
- What it does: Records national IDs (NHS, CHI, H&C, BSN, KVNR, PPSN, AU IHI, Belgium, NZ NHI, FR NIR, IE IHI, CA provincial) separate from MRN, runs the check digit (shown as typed); a failed value is kept as failedChecksum, blank removes it (also from the MPI). Some rules (NZ, FR, IE, CA Ontario) are from memory and unconfirmed; KR RRN is format only. Accession shows one input per identifier of the facility jurisdiction; HL7 PID-3 identifiers are classified on ADT; editable later from Registry Exceptions (Patient details); a change after accessioning sends an A08. Search normalises identifiers and date formats per jurisdiction.
- Workflow: Accession page; Registry Exceptions > Patient details modal.
- Roles/permissions: patient:national-identifier:record.
- Settings: facility jurisdiction; Facility.identifierFormats.
- Status: Built (Demo) — sign-off by each national lead pending.
- Sources: src/services/patientIdentifiers/README.md; src/components/Common/NationalIdentifierFields.tsx; src/utils/README.md.

### Patient and encounter event bus
- What it does: In-app publish/subscribe: Patient.Created, Matched, Merged, Linked, Updated, CaseMoved; Encounter.Created, StatusChanged. A failing subscriber never blocks others. No event for entry into the review queue.
- Workflow: Internal only.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built (Demo) — in memory, not a broker.
- Sources: src/services/events/README.md (mockPatientEventBus.ts).

### Legacy data migration pipeline
- What it does: Admin-editable field mapping per legacy source system; maps a flat record to a draft, validates minimum fields, resolves the patient through the MPI (ambiguous goes to the review queue), counts succeeded, failed and needs-review per job and cross-checks against what the source claimed. Does not build full cases. OCR of scanned reports is left to the interface engine.
- Workflow: /migration-jobs lists jobs and results; Configuration > System > Migration Field Mappings.
- Roles/permissions: config:migration-mappings:manage.
- Settings: field mappings.
- Status: Built (Demo) (Batch 611). Migration Jobs has an Import legacy file action: choose source system and a CSV/JSON file, run the saved mappings, validation and patient matching, see counts, and create draft cases labelled Simulated bulk import. Waiting on the server side: bulk import jobs and OCR in the interface engine.
- Sources: src/services/migration/README.md; src/pages/MigrationJobsPage.tsx.

### Cancer registry definitions and settings
- What it does: Thirteen registries as data (NAACCR, CPAC, COSD, INCa, ADT/GEKID, AIHW, NZ, KCCR, NCRI, Public Health Scotland, NICR, NKR/IKNL, Belgian Cancer Registry), each with jurisdictions, national identifier, wire format and mandatory fields; "confirm with the registry" badge. Enterprise registry with facility overrides; the "honours patient opt-out" rule; per-registry go-live.
- Workflow: Admin: Configuration > System > Cancer Registry Reporting.
- Roles/permissions: config:cancer-registry:manage.
- Settings: enterprise registry, facility overrides, honoursPatientOptOut (default off).
- Status: Built (Demo) — definitions only; wire formats Planned.
- Sources: src/services/cancerRegistry/README.md (cancerRegistryDefinitions.ts); src/components/Config/System/CancerRegistrySettingsSection.tsx.

### Cancer registry report at surgical sign-out
- What it does: At surgical sign-out only (never cytology) each specimen's ICD-O behavior digit is checked against implemented NAACCR exclusions (cervical CIS/CIN III, PIN III, skin BCC/SCC) and reportable cases are queued and sent as CANCER_REGISTRY_REPORT through the engine (fire and forget; sign-out never blocked). A report missing a mandatory field (DOB, diagnosis date, primary diagnosis, ICD-O code, national identifier where keyed) is queued FAILED with HOLD_MISSING_MANDATORY_DATA, never sent, rechecked on resend. Not a full NAACCR rule set.
- Workflow: Automatic; staff fix data and resend from Registry Exceptions.
- Roles/permissions: n/a.
- Settings: Cancer Registry Reporting settings.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Registry wire formats and ICD-O terminology proxy.
- Sources: src/services/cancerRegistry/README.md (dispatchCancerRegistryReportIfApplicable.ts, cancerRegistryMandatoryData.ts); src/services/interfaceDispatch/README.md.

### Cervical screening registry engine and settings
- What it does: Reports signed-out GYN cytology to programmes: 12 definitions (CSMS England/Wales, NICSP, SCCRS, CervicalCheck, PALGA, oKFE, CRCDC, Belgian Cyto-Histo, NCSR, NCSP NZ, KNCSP/KCCR, provincial Canada; US none). Engine decides eligibility, holds, readiness, mapping rows and payload; GYN only; one path for sign-out, correction (CORRECTION) and addendum (AMENDMENT). Per-registry code-mapping tables (adequacy, primary, secondary, recommendation) with "N of M mapped"; requireMappedCodes (on by default for mapping-table registries) and requirePatientIdentifier (off by default) hold settings. Submission is keyed on a verified national identifier first, MRN (format-checked) as fallback. A result is held REGISTRY_NOT_READY for unmapped categories or a missing, failed-checksum or wrongly formatted identifier. Registry-specific content (CSMS action codes, NCSR codes, PALGA) is in the Cytology master.
- Workflow: Admin: Configuration > Cytology > Registry Reporting; dispatch automatic at sign-out.
- Roles/permissions: config:screening-registry:manage (audited).
- Settings: enterprise registry with facility override (resolveEffectiveRegistrySettings), the two hold settings, code mappings.
- Status: Built (Demo) — "configurable" registries not checked against live specifications; real transmission Planned.
- Sources: src/services/screeningRegistry/README.md (screeningRegistryDefinitions.ts, screeningRegistryEngine.ts); src/services/facilities/README.md; src/components/Config/Cytology/README.md.

### Registry submission header, versioning, resend and revision
- What it does: Every registry payload carries submissionGuid (hash of facility, case, specimen, sign-out time, version), submissionVersion, masterTransactionId, messageType (NEW; CORRECTION; AMENDMENT; NEW if the prior was only held or rejected), environment, isDuplicateRetry, templateVersion and registryContentHash. Re-validate and resend rebuilds from current data: still held means nothing queued; same content the registry rejected is refused (unchanged); same content otherwise reuses the id as a duplicate retry; changed content is a new version. Resend all applies the same checks. A REVISED message about an accepted submission is stored, raises CAPA def-registry-revised-post-acceptance and shows as revisedPostAcceptance until reviewed.
- Workflow: Registry Exceptions row action or Resend all; reviewer marks revisions reviewed.
- Roles/permissions: registry:submission:resend; registry:revision:review.
- Settings: go-live approval.
- Status: Built (Demo).
- Sources: src/services/registrySubmission/README.md (registrySubmissionHeader.ts, resendRegistrySubmission.ts, recordRegistryRevision.ts).

### Registry acknowledgements and escalation
- What it does: Reads normalised JSON answers from the engine (HL7/FHIR parsing is the engine's; other formats refused notNormalizedJson). Status: awaitingAck, accepted, acceptedWithWarnings, rejectedRecoverable, rejectedFatal, ackOverdue. Accepted is never reopened (a different answer is a conflict; the same twice is a duplicate). Sent and silent for 72 h becomes ackOverdue; undeliverable for 72 h stops retries.
- Workflow: Engine posts an answer; escalation runs on page load in the demo.
- Roles/permissions: none stated.
- Settings: none.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Engine posts normalised acknowledgement JSON; registry.escalateStale server job.
- Sources: src/services/registrySubmission/README.md (registryAcknowledgement.ts); docs/architecture/REGISTRY_ACKNOWLEDGEMENT_API.md.

### Registry Exceptions worklist, badge and CAPA capture
- What it does: Lists screening and cancer submissions needing a person: held (identifier or codes not ready), held "attestation required" (REGISTRY_LIVE_NOT_APPROVED), delivery failed, rejected (fixable or outright), no answer in 72 h, conflict, revised after acceptance. Latest version only; consent exclusions and accepted rows are excluded; own organisation's visible cases only. Filter chips with counts; details show findings and the raw acknowledgement; Open case; "Capture as CAPA" raises one open deficiency def-registry-submission-failure per submission. Patient details modal edits identifiers and opt-outs then resends. Nav and tile badge counts (read on mount, each minute, on focus, or by the registryExceptions live topic).
- Workflow: /registry-exceptions.
- Roles/permissions: screen:registry-exceptions:open; registry:submission:resend.
- Settings: none.
- Status: Built (Demo) — actual delivery needs the server and registry connections.
- Sources: src/pages/RegistryExceptionsPage/README.md; src/services/registrySubmission/README.md (captureRegistryExceptionAsCapa.ts); src/hooks/README.md.

### Registry go-live gate and validation versus production instance
- What it does: Instance role comes from VITE_APP_ENV (production only if exactly "production"; otherwise validation, failing closed). Each registry moves Pending (needs data-sharing agreement) to Testing (synthetic suite: screening 3 cases, cancer 2; patient ids SYN-) to Validated (validation record exported as JSON, audited). A validation instance never sends a real case; production sends only to a registry with a current approval, otherwise holds and later resends in a catch-up. Production requests go-live with eight pre-checks (latest template, codes mapped, identifier hold, agreement, valid record, local changes reviewed, test sign-off reference) and an approver states their capacity and re-enters credentials (signing action registry-go-live; default one approver, self-approval allowed, 1 to 3 required); a permanent statement is written; can Stop live reporting. A final payload boundary check refuses test payloads to live registers and real data to test systems (DISPATCH_REJECTED).
- Workflow: Validation instance records agreement, runs suite, exports record; production imports it, requests, approver approves.
- Roles/permissions: registry:live-register:approve (Admin, Lab Director), registry:test-suite:run, config:registry-go-live:manage.
- Settings: approval settings (shared with Template Review); the environment is no longer set in the Configuration screen.
- Status: Built (Demo). Go-live panel, gate, synthetic suite, validation export and audit are built on a mock service. Remaining: server endpoints, engine boundary copy, vendor template publishing, signing.
- Sources: src/services/registryGoLive/README.md; docs/architecture/REGISTRY_GO_LIVE_API.md; src/services/interfaceDispatch/registryPayloadBoundary.ts; src/components/Config/RegistryGoLive/README.md.

### Registry consent, opt-out and statutory override
- What it does: Two opt-outs at Accession: cervical screening programme (always excludes) and cancer registry (overridden by statute unless the lab's honoursPatientOptOut is on). Excluded cases are audited and queued FAILED EXCLUDED_BY_CONSENT, never resent; an override is audited "Registry opt-out overridden by statute". Stored on the patient and mirrored to the MPI; badge on the patient card; inbound REGISTRY_CONSENT_UPDATED from the engine (newest updatedAt wins).
- Workflow: Accession checkboxes; edit later in Patient details.
- Roles/permissions: patient:registry-consent:record.
- Settings: honoursPatientOptOut on Cancer Registry Reporting.
- Status: Built (Demo). Accession checkboxes, statute override, audit, FAILED/EXCLUDED queueing, patient badge and a REGISTRY_CONSENT_UPDATED handler are built; only an HL7 consent source is missing.
- Sources: src/services/registryConsent/README.md; src/components/Common/RegistryConsentFields.tsx; src/services/patients/README.md.

### Registry template versions and local overlay
- What it does: Registry definitions are versioned vYYYY.Q.X from v2026.4.1. A breaking change holds from its effective date; a minor change holds 30 days only if the site customised something it touches. Site code mappings, identifier hold and adapter rules are stamped with their baseline version, never overwritten, flagged for review when a newer version touches them; go-live waits until confirmed.
- Workflow: Admin confirms flagged local changes on the connection panel.
- Roles/permissions: config:registry-go-live:manage.
- Settings: overlay settings.
- Status: Built (Demo) — template publishing is by release only.
- Sources: src/services/registryGoLive/README.md (registryTemplateVersions.ts, registryOverlay.ts).

### Registry transmission audit export
- What it does: One row shape and CSV for screening and cancer: sent time, registry status, response code, answered time, revision count; no patient identifiers (MRN omitted). With an API server it goes through the export service.
- Workflow: Registry Exceptions toolbar download; QA > Cytology > Transmission audit tile (ANZ-QA-01).
- Roles/permissions: qa:registry-transmission-audit:export.
- Settings: none.
- Status: Built (Demo) — server path Partial.
- Sources: src/services/registrySubmission/README.md (registryTransmissionAudit.ts); src/services/cytology/README.md.

### Code systems policy per jurisdiction
- What it does: For each jurisdiction, each code system (ICD-10, ICD-11, ICD-O, SNOMED CT and others) is off, optional or required from a start date; checks reject bad system, role, date, duplicates. Default asks for nothing and keeps ICD-11 off. Saves are audited (CODE_SYSTEM_POLICY_CHANGED). Intended to drive the Add Code window, sign-out checks and outbound messages.
- Workflow: Admin: Configuration > System > Code Systems.
- Roles/permissions: config:code-systems:manage (Admin, Lab Director).
- Settings: per jurisdiction and system.
- Status: Built (Demo) (Batches 607, 614). Applied on Add Code, case coding display, sign-out, outbound messages, case search, specimen edit and the accession order message (a system that is off is hidden with a note). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: src/services/coding/README.md; docs/architecture/DIAGNOSIS_CODING.md, KNOWN_GAPS.md; src/components/Config/System/CodeSystemsSection.tsx.

### Licensed terminologies and real codes on abnormal rules
- What it does: The customer records the SNOMED CT and ICD-O-3 licences it holds (on/off, holder, edition, reference, last valid day). An abnormal-result rule can hold a SNOMED CT and an ICD-O-3 code and term (shape checked: 6-18 digits; 4 digits, slash, 1 digit). At confirmation the rule's real code is attached only while that licence is on and unexpired; otherwise the TEST- code is attached. A real and a test code are never mixed for one code system. PathScribe ships no code sets.
- Workflow: Admin: Configuration > System > Code Systems (card), Abnormal Trigger Rules (rule form); the pathologist confirms a finding at sign-out.
- Roles/permissions: config:code-systems:manage (Admin, Lab Director) for the licence; config:abnormal-triggers:manage for the rule codes.
- Settings: enterprise terminologyLicences; per-rule licensedCoding.
- Status: Built (Demo) (Batch 623). The browser side is complete and works against browser-side services. Real codes for AI-narrative findings and per-facility licences are Planned.
- Sources: src/services/terminologyLicence/README.md; src/services/abnormalDetection/README.md; src/components/Config/System/TerminologyLicencesCard.tsx.

### Worklist digital-pathology wording and flag names in six languages
- What it does: The digital readiness line, PathScribe's own AI lines (finding count, Review Recommended, No Further Review) and the 34 shipped flag names show in the user's language. Scanner failure reasons, AI vendor headlines and biomarker values are shown as received and never translated (Pete, Oct 19, 2026). Admin-made flags show as typed.
- Workflow: Worklist (table and card views) and the slide detail drawer.
- Roles/permissions: none beyond opening the Worklist.
- Settings: none.
- Status: Built (Demo) (Batch 624). Spoken summaries and flag description tooltips remain English; native review of the new text is pending.
- Sources: src/services/digitalPathology/README.md; src/services/flags/README.md; src/components/Worklist/README.md.

### Shared discordant review section
- What it does: The sign-out Discordance window and the generic QA review form use one component for delta, severity (with hint), root cause, "other" note and narrative comment. The generic form shows its validation messages in the user's language.
- Workflow: Sign-out Discordance window; Surgical Post-Sign-Out QA review.
- Roles/permissions: unchanged.
- Settings: Field Requirements (sign-out window).
- Status: Built (Demo) (Batch 625). The sign-out window is not yet the generic form itself.
- Sources: src/components/QualityAssurance/README.md.

### Uniform coded entry model (ICD-10/11 side by side)
- What it does: One shape for a code in any system: system, release, code, display, source (typed, mapped, AI, rule, legacy), AI detail, mapped-from; ICD-11 clusters kept as one value; an adapter reads and writes the older CaseCoding fields. Terminology server, ICD-10 to ICD-11 maps, SNOMED/WHO licences and nightly terminology monitoring are not built.
- Workflow: Internal.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built (Demo) (Batch 607). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Terminology server, ICD-10 to ICD-11 maps, SNOMED/WHO licences, nightly monitoring.
- Sources: src/services/coding/README.md (codedEntry.ts, caseCodingAdapter.ts); docs/architecture/DIAGNOSIS_CODING.md.

### Clinical code search (SNOMED CT, ICD-10, ICD-11, LOINC, ICD-O, CPT)
- What it does: Add Code window searches NLM Clinical Tables and UTS live; the UMLS key stays server-side (Vite dev proxy). Left panel lists applied codes per case or specimen (strike/undo, "Applied elsewhere" with "Move here"); right system tabs with hierarchy filters; the same SNOMED code may repeat. AI suggestions are verified against the search (hallucinated codes dropped; CPT re-verified against the billing table) and checked against the AI vendor policy. OPCS-4 is stubbed (NHS TRUD licence); CPT search reads the curated billing table. Specimen SNOMED, ICD-10 and ICD-O codes stay on their specimen and reopen intact; per-jurisdiction coding config (US/CA/GB/IE) of SNOMED/ICD-10 variants/ICD-11.
- Workflow: Codes button on the synoptic report page (Code Manager); Search page lookups.
- Roles/permissions: none.
- Settings: UMLS key in env; VITE_NLM_BASE_URL.
- Status: Built (Demo) (Batch 607). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Production UMLS proxy; NHS TRUD and full CPT licences.
- Sources: src/services/terminologySearch/README.md (codeSearchService.ts); src/components/Synoptic/Codes/AddCodeModal.tsx; src/services/codes/README.md.

### ICD-O-3 code capture gap
- What it does: Per-specimen coding.icdO exists, but the ICD-O tab searches UMLS for SNOMED morphology concepts stored as system ICDO, not ICD-O-3 morphology/behavior codes (8500/3), so the behavior digit cannot be parsed from searched codes. The cancer registry check therefore cannot rely on it.
- Workflow: Code Manager modal.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built (Demo) (Batch 607). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: src/services/cancerRegistry/README.md; src/services/terminologySearch/codeSearchService.ts:260-280.

### Terminology services configuration and health monitor
- What it does: Lists endpoints for SNOMED CT, ICD-10-CM, ICD-11, LOINC, ICD-O and CPT with a health check on open and "Test All". Free systems go via NLM; CPT and non-US ICD-10 variants need a licensed backend proxy. The ICD-10 variant maps to the governing body (CAP to ICD-10-CM, RCPath/ICCR to ICD-10 WHO, RCPA to ICD-10-AM). Health check goes through the server-side UMLS proxy.
- Workflow: Configuration > System > Terminology Services; endpoint details shown to superadmin (ForMedrixAI support) sessions only.
- Roles/permissions: superadmin session.
- Settings: VITE_NLM_BASE_URL, VITE_CPT_PROXY_URL, VITE_ICD10_PROXY_URL.
- Status: Built (Demo). Endpoint list, health check, Test All and ICD-10 variant mapping are built; CPT and non-US ICD-10 need licensed backend proxies.
- Sources: src/components/Config/Terminology/README.md (terminologyConfig.ts, TerminologyServicesSection.tsx); src/components/README.md.

### Template coding and terminology deprecation alerts
- What it does: Synoptic templates carry SNOMED CT and ICD-10/11 codes at field and answer level, with a coding coverage panel (template publish gate: SNOMED coverage 80% by default) and inline deprecation alerts (banner and badge with Re-check).
- Workflow: Template editor side panel; answer coding button; Synoptic Library cards.
- Roles/permissions: draft capability; config:template-governance:manage for the threshold.
- Settings: template governance settings.
- Status: Built (Demo).
- Sources: src/components/Protocols/README.md (TerminologyAlertBanner.tsx); src/services/templates/README.md (templatePublishingRules.ts).

### SNOMED cervical histology severity mapping
- What it does: Admin-supplied table maps histology SNOMED codes to severity so cyto-histologic correlation can classify concordant, minor (1 step) or major (2+ steps) discrepancy. Starts empty (no SNOMED content shipped; customer supplies licensed content); duplicates refused; a code cannot be edited.
- Workflow: Configuration > Cytology tab.
- Roles/permissions: config:cytology-severity-mapping:manage.
- Settings: the mapping table.
- Status: Built (Demo) — licensed content Planned (customer supplied).
- Sources: src/services/cytology/README.md (resolveCytologyHistologySeverityFromSnomed.ts); src/components/Config/Cytology/README.md.

### Licensed terminology build for spell check
- What it does: npm run spellcheck:build builds word lists from the SPECIALIST Lexicon, SNOMED CT RF2 editions and LOINC (PATH, CYTO, MOLPATH, CELLMARK, HEM/BC, MICRO classes) into public/spellcheck/ with attribution; only derived lists ship; release files are never committed. Works offline from /public/spellcheck.
- Workflow: Developer places licensed files in spellcheck-data/licensed/ and runs the build.
- Roles/permissions: developer.
- Settings: spellcheck-data/licensed-sources.json.
- Status: Built (Demo). Build tool and tests exist; derived lists ship in public/spellcheck. Only the licensed SNOMED/UMLS/LOINC release files (a licence) are missing.
- Sources: spellcheck-data/licensed/README.md; src/services/spellcheck/README.md.

### Diagnosis code on requisition
- What it does: Holds the referring physician's order-time diagnosis code from the requisition separately from the case-level multi-standard coding near sign-out.
- Workflow: Accession.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo) — README gives no UI detail.
- Sources: src/services/diagnosisCodes/README.md.

### Production architecture direction and server contracts (what exists versus is specified)
- What it does: Production database is SQL Server behind a PathScribe API server (ASP.NET Core) with SignalR (Azure SignalR Service for shared SaaS, Redis backplane for private cloud); jobs and events in SQL tables behind IMessageBus. Swapping mocks for real services is meant to be a change in src/services/index.ts. The repo contains contracts only: docs/architecture/*.md (authorization, case API, report document store, blob storage links only, message bus, async export, interface engine edge, site agent, runtime config, live updates, OIDC, report rendering and delivery, consult access, cytology QC, organ mapping, AI proxy, template notifications, registry go-live and acknowledgement, deployment readiness review) plus TypeScript contracts and guard tests. No .cs or .sql files exist.
- Workflow: n/a.
- Roles/permissions: n/a.
- Settings: n/a.
- Status: Built (Demo). Architecture statement: the SQL Server API with SignalR is the backend team's build. Browser services are swappable behind src/services/index.ts.
- Sources: src/services/README.md; src/services/index.ts; docs/architecture/README.md, SYSTEM_ARCHITECTURE.md.

### Shared HTTP client for the API server
- What it does: One client sends the signed-in token and returns fixed failure codes (SIGNED_OUT, NOT_PERMITTED, NOT_FOUND, CONFLICT, INVALID, TOO_MANY_REQUESTS, TIMED_OUT, UNAVAILABLE, short server codes such as CASE_CHANGED); never shows server message text (PHI); 30 s default timeout; selectByConfiguration picks the server or mock service per service from the API address. The address must be https (http only to localhost in a dev build); invalid or absent means demo mode. Each service still has to be moved onto it (PS-482 onward).
- Workflow: n/a.
- Roles/permissions: n/a.
- Settings: VITE_API_BASE_URL (server root, no /api).
- Status: Built (Demo). apiHttpClient and selectByConfiguration are built; the demo correctly uses mock services, and each service moves onto the client when its server exists.
- Sources: src/services/apiServer/README.md (apiHttpClient.ts, apiServerUrl.ts).

### Runtime configuration (config.json) and start-up error screen
- What it does: One server build serves every site. Settings (same names as VITE_*) come from config.json beside index.html (served no-store), else the build's values. Known names only; server addresses must be https; no secrets. A server build needs VITE_API_BASE_URL and VITE_AUTH_MODE=sso; a demo build refuses server addresses and VITE_APP_ENV=production. A bad file stops start-up and the error screen lists each problem by setting name, never the value (also ADDRESS_NOT_FROM_SERVER, NOT_FROM_SERVER). Build adds modulepreload tags so app code downloads while config is read. Order: config.json, then server /api/config, then build. Count differs by document (36, 37, 38, 39); runtimeSettings.ts defines about 41 names (AI, API, app env/version, auth for Microsoft/Google/OIDC, hub, report renderer, interface receiver, proxies, server jobs, error monitoring, voice, pwned-password check, two e-mail addresses).
- Workflow: IT copies deploy/runtime-config/config.example.json, edits, re-runs the headers generator if an address changed, reloads.
- Roles/permissions: deployment/IT.
- Settings: config.json; docs/architecture/RUNTIME_CONFIG.md.
- Status: Built — browser side; the server's /api/config side is Planned.
- Sources: src/services/runtimeConfig/ (runtimeSettings.ts, loadRuntimeConfig.ts); deploy/runtime-config/README.md; src/components/RuntimeConfigError/README.md.

### Server-supplied settings (/api/config) and hosting regions card
- What it does: With an API server, start-up also reads {VITE_API_BASE_URL}/api/config (5 s limit; a 404 means config.json alone) for AI model, managed deployment, token limit, region and voice settings and databaseRegion and blobRegion. Administrators see "Where PathScribe keeps data" (database, file storage and AI regions) in AI provider settings. config.json wins; sign-in and security settings stay in config.json.
- Workflow: Automatic; admin opens the card in Configuration > AI.
- Roles/permissions: administrators.
- Settings: server /api/config.
- Status: Built (Demo). runtimeConfig client and HostingRegionsCard are built and say plainly that the demo has no server; values come from /api/config.
- Sources: src/services/runtimeConfig/hostingRegions.ts; src/components/Config/AI/HostingRegionsCard.tsx.

### Production versus validation instance, server build versus demo build
- What it does: VITE_APP_ENV decides production or validation (fails closed to validation); release version is recorded and a validation record names it. Sign-in page shows an environment badge; QA feedback button default follows it. npm run build:server builds without demo accounts, Demo Reset, mock EMR, mock WSI viewer and mock interface engine (__DEMO_TOOLS__ false), then measures first load and fails if a demo/developer module or demo accounts are in the bundle (--require-no-mocks also fails on mock services). The demo build refuses server addresses.
- Workflow: Set by deployment, not in-app.
- Roles/permissions: none.
- Settings: VITE_APP_ENV, VITE_APP_VERSION.
- Status: Built.
- Sources: src/services/deployment/README.md (deploymentInstance.ts); scripts/README.md (check-production-bundle.mjs); package.json.

### Browser security headers and CSP
- What it does: One policy (securityHeaders.mjs) generates header files for nginx, IIS/Azure App Service, Azure Static Web Apps, Azure Front Door, a plain list, and Vercel. Headers: CSP (self only, no inline script or eval, wasm allowed for the spell checker), HSTS, nosniff, no-referrer, Permissions-Policy (camera, microphone, display-capture for self), CORP same-origin, frame-ancestors none + X-Frame-Options DENY; COOP deliberately not set (sign-in pop-ups). --runtime-config adds every config.json address (API, renderer, receiver, AI/terminology, identity providers, hub wss, error-monitoring DSN origin). Loopback workstation print bridges (agent wss://127.0.0.1:9100-9102, QZ Tray ports) are allowed unless workstationBridges is false. A guard test fails if generated files drift.
- Workflow: Copy origins.example.json to origins.json, run node scripts/generate-security-headers.mjs origins.json outDir [--runtime-config config.json], install for the host.
- Roles/permissions: IT.
- Settings: origins.json keys connect, hub, formAction, frame/img, https, workstationBridges.
- Status: Built — generated files exist; check on a real host still manual (PS-732).
- Sources: deploy/security-headers/README.md; src/services/security/securityHeaders.guard.test.ts; deploy/README.md.

### HTTPS-only endpoints and links; bundled fonts; no secrets in bundle
- What it does: Production builds refuse missing, malformed or plain-HTTP renderer, interface receiver and scale agent URLs, naming the setting. Stored links (staff signature, facility and department letterhead logo, gross imaging vendor address) must be https URLs to a named host with no credentials, spaces or data:/javascript: schemes; PathScribe stores links only for images and attachments. Inter and Pretendard fonts and the urgent-alert sound are served from PathScribe; only PubMed and NLM Clinical Tables are external reference calls. Guards fail on secret-looking VITE_ names, direct-to-vendor AI calls, XSS-unsafe HTML (DOMPurify used), and the removed xlsx package; VITE_AUTH_* and interface settings are read by full name so .env values do not enter the bundle.
- Workflow: Validation messages on those fields; build-time guards.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built.
- Sources: src/utils/serviceEndpoint.ts; src/services/links/README.md; src/services/security/README.md; deploy/security-headers/README.md.

### Server jobs view
- What it does: Shows each job kind's health, recurring jobs (needs attention when over 5 min past due, by server time) and dead letters (filtered to the viewer's facilities) with one-click Requeue (audited). Interface and print jobs are resent from their own screens.
- Workflow: Audit Log (System Logs) > Server jobs.
- Roles/permissions: jobs:server-job:view, jobs:server-job:requeue (Admin; checked at the job's facility or case).
- Settings: none.
- Status: Built (Demo). Screen and hook are built and the demo says the browser does the work itself (demoNote). Needs the /api/jobs endpoint only.
- Sources: src/services/serverJobs/README.md; src/pages/ServerJobsSection.tsx; docs/architecture/MESSAGE_BUS_API.md.

### Browser stand-ins for server jobs (VITE_SERVER_JOBS)
- What it does: While someone is signed in the browser runs delivery retries (every 30 s), release-delay releases, consult-link expiry, registry 72-hour escalation, follow-up alerts, support-access expiry and the cytology-histology sweep. A deployment lists the jobs the server runs (e.g. delivery.retrySweep, release.dueSweep) and the browser stops exactly those; unknown names are reported in the console and the browser keeps running that job.
- Workflow: IT edits config.json when the server takes over a job.
- Roles/permissions: IT.
- Settings: VITE_SERVER_JOBS.
- Status: Built (Demo) — server jobs themselves Planned.
- Sources: src/services/serverJobs/README.md (browserStandIns.ts); deploy/runtime-config/README.md.

### Exports through the server, My exports and export notices
- What it does: Every export button (26 kinds: QA tabs, registry transmission audit, Audit Log logs, billing log, My Contributions, case search, disposal report, change history) goes through one export service. Demo: the browser builds the file. With an API server: request, "preparing" notice from 1 s, exports ready in under 3 s download silently, longer ones notify through the hub (or re-read every 15 s); limits 1,000,000 rows, 3 open exports per user, files kept 7 days (1-30), download links valid 15 minutes, downloads by requester only, https signed links. Filters are treated as PHI. Notices clear at sign-out. Each export checks its own domain:object:export capability first; a refusal produces no file; exports are audited DOCUMENT_EXPORTED (and print/reprint/fax events DOCUMENT_PRINTED, REPRINTED, PREVIEW_PRINTED, RENDERED, FAXED).
- Workflow: Click export; notice bottom left (Download or Cancel); top-bar download icon with ready badge opens /my-exports.
- Roles/permissions: one capability per export kind (e.g. audit:*-log:export, search:case-results:export, qa:<report>:export); reprint reason if the lab requires it.
- Settings: lab print settings (requireReprintReason).
- Status: Built (Demo). All export buttons use one service; browser builds the file in demo and My exports plus notices are built. Server request/worker path is backend; 5,000-row search cap is the demo limit.
- Sources: src/services/exports/README.md; src/pages/MyExportsPage.tsx; src/components/Exports/ExportNotices.tsx; src/services/printing/exportGate.ts, documentOutputAudit.ts; docs/architecture/ASYNC_EXPORT_API.md.

### CSV formula-injection protection
- What it does: Text cells starting with = + - @ tab or CR get a leading apostrophe in every CSV writer; numbers are unchanged; re-import strips it. Applies to support-audit CSV, Action Registry CSV import parsing and staff CSV.
- Workflow: Automatic.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built.
- Sources: src/utils/csv.ts; src/i18n/README.md (Batch 543).

### Live updates (SignalR hub) and data topics
- What it does: One hub event DataChanged {topic, key} on /hubs/live. Topics: registryExceptions, messages, facilityOps, heldReleases, engravers, siteAgents, interfaceEngines, molecularQueue, caseReport (key = case support reference). The event carries ids only; the screen re-reads through its own permission-checked call; events are merged (at most one read a second); reconnect triggers a read; back-off 0, 2, 5, 10, 20, 30 s with jitter, never gives up. Separate OR/Intraop events (session.created, specimen.added, diagnosis.rendered, verbal.reported, specimen.dismissed and others), print job, WSI scan batch, delivery status and export status. Only SSO sessions subscribe. Without a hub, screens poll (registry badge 60 s, inbox 20 s, Facility Ops 20 s, held reports 5 s, Engraver Monitor 30 s, Site agents 60 s, Engines 60 s; OR boards 15 s, 60 s safety net) and same-browser windows update through BroadcastChannel (about 110 ms).
- Workflow: Automatic. Target latency under 500 ms for OR boards, 800 ms overall budget.
- Roles/permissions: hub must refuse unauthenticated connections.
- Settings: VITE_LIVE_UPDATES_HUB_URL.
- Status: Built (Demo). Client built with local live updates for the demo; all nine topics are used by screens through useLiveData. Only the SignalR hub is missing.
- Sources: src/services/liveUpdates/README.md, dataTopics.ts, signalRLiveUpdateService.ts; src/hooks/useLiveData.ts; docs/architecture/LIVE_UPDATES_SIGNALR.md.

### Live status badge on OR screens
- What it does: Badge on the OR Suite Live Board and Intraop Queue: Live (hub connected), Local updates (no hub: only this computer's windows update at once), Connecting/Reconnecting, Offline; tooltip explains; larger on the wall display; visual only.
- Workflow: Shown in the headers of those screens.
- Roles/permissions: none.
- Settings: hub address in deployment config.
- Status: Built (Demo). LiveStatusBadge is on the OR Suite board, Intraop Queue and WSI batches and shows Local updates without a hub; real-time needs the hub.
- Sources: src/components/LiveUpdates/README.md (LiveStatusBadge.tsx); src/services/intraopDashboard/README.md.

### Connection banner and waiting states
- What it does: Slim notice under the top bar: "Reconnecting" or "Offline" after 2 s of lost server connection, "Connection restored" for 4 s (only when the hub is really live), polite screen-reader announcement; never blocks clicks. Browser coming back online asks the hub to reconnect at once. Loading placeholders appear only after 300 ms and "Still working" from 3 s; page loaders share one wait clock.
- Workflow: Automatic on every signed-in screen.
- Roles/permissions: n/a.
- Settings: none (fixed thresholds).
- Status: Built — meaningful only with an API server (the local stand-in retry does nothing).
- Sources: src/services/connectivity/README.md; src/components/Connectivity/ConnectionBanner.tsx; src/components/Common/LoadingState.tsx.

### Error reporting, error boundaries and Sentry monitoring
- What it does: Browser crashes are scrubbed (quoted text, emails, 3+ digit runs, name-like words removed; at most 10 stack frames; routes keep :id segments), de-duplicated (same error once a minute, 25 per page load) and given a reference ERR-XXXX-XXXX; sent to the console and Audit Log > Error Log (CLIENT_RENDER_ERROR, CLIENT_UNCAUGHT_ERROR, CLIENT_UNHANDLED_REJECTION) with a Resolve button. Boundaries at app, route (nav bar and drawers survive; clears on address change) and panel (organ map, synoptic panel) show Try again and Back to worklist with "saved work is safe, unsaved may be lost". Optional Sentry or Sentry-compatible collector, off unless a valid DSN and environment name are set; fail-closed, drops request/user/breadcrumb data, loads the SDK as a separate chunk, DSN origin added to CSP. QA crash test ?ps-crash-test=<name> on dev/validation builds only.
- Workflow: Automatic; support reads Error Log; IT sets two keys.
- Roles/permissions: audit:error:resolve.
- Settings: VITE_ERROR_MONITORING_DSN and VITE_ERROR_MONITORING_ENV (not in config.example.json).
- Status: Built — in-app logging live; external sending configuration-dependent and nothing sent to a live Sentry project (BAA/DPA not set up, PS-752); source maps and .NET back end Planned. One reviewer marked the monitoring settings Unverified; code checked (sentrySink.ts, errorMonitoring.ts exist, @sentry/browser in package.json).
- Sources: docs/architecture/ERROR_MONITORING.md; src/services/errorReporting/README.md; src/components/ErrorBoundary/README.md.

### No patient data in browser storage (server installs) and start-up cleanup
- What it does: With VITE_API_BASE_URL set, data services keep data in tab memory only. The browser keeps only display preferences, language, workstation settings (scan station, OR terminal, display profile, foot pedal), a minimal session profile (id, name, email, role, initials, voice profile, sign-in method), SSO state and PubMed cache. Start-up removes every other key, plus retired copies (old AI draft text, ps_state_*, access-request markers, legacy FPPE store). Images and attachments are links only. Screens may not use localStorage, sessionStorage or Firebase directly or import mock services (guard tests, empty baseline).
- Workflow: Automatic.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built — enforced by browserData.guard.test.ts; server-mode cleanup keep-list not individually verified; data waits for the API (PS-539). In the demo patient data lives in localStorage.
- Sources: src/services/browserData/README.md (browserKeepList.ts, dataStorage.ts); src/services/deploymentReadiness/README.md; src/services/browserCleanup/README.md.

### Draft recovery, idle timeout and same-user second login
- What it does: Unsaved case typing (full case minus the patient object, including Orchestration section text) is cached to browser storage after a 1 s debounce, plaintext, dropped after 7 days; after reload, close or idle sign-out the case offers Restore (local only; marks the page dirty so Save Draft commits). Idle timeout default 15 min fallback, organisation default plus per-facility override for the performing lab of the open case; warning modal then sign-out with drafts kept; countdown uses real timestamps so throttled tabs cannot defeat it. A sign-in in another tab supersedes the first session and shows a notice. With the API server the draft cache is memory only, so a reload loses it. Session-end hooks clear per-user held data (such as export notices) at sign-out.
- Workflow: Automatic.
- Roles/permissions: config:session-security:manage.
- Settings: Configuration > System > Session Security; Facility editor > AI & Performance (idleTimeoutMinutesOverride).
- Status: Built (Demo) — draft encryption Planned; on server deployments Partial (lost on reload).
- Sources: src/services/drafts/README.md; src/services/session/README.md; src/hooks/README.md; src/services/auth/README.md.

### Edit conflicts and optimistic locking
- What it does: Saves carry the case version; a stale save is refused (409 on the server) and counted and audited. When another user saves an open case the page says so at once; "Show their changes" merges non-overlapping changes without reload, "Use their version" shows the other save; where the same field changed the next save asks which to keep; "Save mine anyway" needs case:edit-conflict:override. Also applies to registry detail saves and cytology saves.
- Workflow: Report page notice and Edit Conflict dialog.
- Roles/permissions: case:edit-conflict:override (Pathologist, Admin, Lab Director).
- Settings: none.
- Status: Built (Demo) — the 409 and row_version path needs the API server; the "caseReport" live topic is Planned.
- Sources: src/services/cases/README.md (caseWrite.ts); src/pages/SynopticReportPage/components/EditConflictDialog.tsx.

### Case addresses and support references carry no patient identifier
- What it does: Case pages use a random support reference /case/SR-XXXX-XXXX/<view> instead of the accession number, so history, bookmarks and logs hold no PHI; an old accession address opens once and is replaced; a guard test fails if any file puts MRN, accession or DOB in a URL. The same SR-XXXX-XXXX ids (40 random bits) identify cases, audit entries, errors and interface exceptions in support conversations; lookup is audited; typing one in the case search opens the case. The reference is also the live-topic key. In a server build the EMR address is not built.
- Workflow: Case header chip (copy); Audit Log "Find a support reference" (?supportRef=).
- Roles/permissions: not stated.
- Settings: none.
- Status: Built (Demo) — production: the API issues and resolves references (GET /api/cases/{caseId}/support-reference, Planned).
- Sources: src/services/caseAddresses/README.md; src/services/supportReferences/README.md.

### Performance: first-load budget, startup and paged search
- What it does: npm run build and build:server measure the gzipped first load and fail above the budget; the default target is 1 MB including the sign-in page chunks (code: measure-first-load.mjs, default 1; documents saying 3 MB and 1.87 MB are older). Overview figure 0.68 MB to the sign-in screen. Other languages, guide PDFs, seed templates, pdf-lib, PDF and barcode tools and Sentry load on demand; guard tests block static imports of the services barrel and SignedInApp.tsx. Case search is server-paged (page sizes 25/50/100, "page 3 of 13", sort with stable tiebreak, access rules applied first) and restores search/page/sort on return; in the demo it loads all accessible mock cases in memory. Deployment review sets an 800 ms latency budget.
- Workflow: Developer/build step; users see search paging.
- Roles/permissions: n/a.
- Settings: --target-mb.
- Status: Built — measured numbers not re-run here; API-backed search Planned (CASE_SEARCH_API.md).
- Sources: scripts/measure-first-load.mjs; src/services/loadSize/README.md; src/services/caseSearch/README.md; docs/architecture/DEPLOYMENT_READINESS_REVIEW.md.

### Accessibility (WCAG 2.1 AA)
- What it does: Clickable non-button elements are keyboard operable (pressable, switchable, clickableContainer helpers), no control nested in another, switches are named, every field has an accessible name, focus is visible and trapped in modals, selected tiles announce pressed state, focus moves to the next item after a keyboard delete (inbox, saved searches), faint text and chart labels raised to AA contrast, rows holding buttons open from a real button, polite live regions for banners. A source audit finds violations with no exception list; axe-core Playwright checks cover about 46+ routes and every Configuration section (npm run test:a11y).
- Workflow: Keyboard and screen-reader users.
- Roles/permissions: all.
- Settings: none.
- Status: Built — manual NVDA/VoiceOver run (38 scripts, PS-687) not yet done by a person.
- Sources: src/services/accessibility/README.md (a11y.guard.test.ts); src/utils/a11y/README.md; e2e/a11y.spec.ts; docs/quality/README.md.

### Supported browsers
- What it does: Chrome, Microsoft Edge and Firefox, current versions; Safari is not supported. Chrome and Edge 135+ draw styled dropdown lists; Firefox shows its native dark list, same behaviour.
- Workflow: n/a.
- Roles/permissions: none.
- Settings: none.
- Status: Built — Playwright specs run in Chromium; Firefox is run on request only (npm run test:e2e:firefox) and a Chrome/Edge/Firefox hand check is open (PS-718).
- Sources: src/README.md (Batch 580); src/i18n/README.md; docs/product/FEATURE_OVERVIEW.md.

### Demo mode, Demo Reset and demo baseline
- What it does: Demo build (__DEMO_TOOLS__) runs entirely on browser storage with demo accounts (PBKDF2-hashed, one per role). Configuration > Demo has a single Full Reset behind a confirmation: restores the demo baseline (seeded cases, patients, pools, delegations, QC pairs, registry submissions, autopsies, molecular queue, tumor board), clears case data, settings, session markers, display preferences, workstation settings (scan station, OR terminal, display profile, foot pedal) and sign-in lockouts; keeps audit trails, billing dictionaries, support audit stream and guide-window positions. Refuses unless the mock backend is on. No per-user reset. Case count: 19 baseline cases in older documents, 118 in the latest. OR board also has a sales demo mode.
- Workflow: Demo admin: Configuration > Demo.
- Roles/permissions: config:demo-data:reset (audited).
- Settings: none.
- Status: Built (Demo) — demo only by design.
- Sources: src/services/demoReset/README.md; src/components/Config/System/DemoResetTab.tsx; src/services/cases/README.md.

### Mock EMR window and mock WSI viewer
- What it does: Simulated NHS-style EMR (/mock-emr?case=, MRN lookup, "No Patient Found" state) and a mock WSI viewer (/wsi-viewer) for demos; an EMR sidecar drawer on the report page shows EMR context from the mock service. There is no live EMR connection: every "Open EMR" / EMR launch button (for example on Cytology Screening) opens this mock page, SMART on FHIR is not built, and the EMR-inbox critical alert is a stub (Planned).
- Workflow: Opened for demos.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo). Built demo tools: /mock-emr and /wsi-viewer routes exist (SignedInApp.tsx:309-310) behind __DEMO_TOOLS__. 'Stub' is their purpose; excluded from server builds on purpose.
- Sources: src/pages/README.md; src/SignedInApp.tsx:63-64,309-310.

### AI proxy, provider adapters and vendor policy (server side)
- What it does: The browser never holds an AI, Gemini, UMLS or vendor key. Provider adapters exist for OpenAI-style, Azure OpenAI, custom OpenAI-compatible, AWS Bedrock, Google Gemini, Anthropic Claude and a mock; all call a proxy (Vite dev proxy in development, API server in production) that adds keys, audits each call (who, case, provider, model, tokens, not the prompt), rate-limits and checks BAA/DPA. AI vendor policy per jurisdiction and facility refuses a call before anything is sent (AI_VENDOR_NOT_ALLOWED, audited, never falls back to another vendor). System Info checks the proxy status, but nothing in the app opens System Info.
- Workflow: Admin: Configuration > AI.
- Roles/permissions: config:ai-provider:manage, config:ai-model:manage, config:ai-behavior:manage, config:ai-vendor-policy:manage.
- Settings: provider, model, endpoint, deployment, hosting region.
- Status: Built (Demo). Adapters, vendor policy and dev proxy are built; browser holds no keys (guard test). Only the production proxy routes are missing.
- Sources: docs/architecture/AI_PROXY.md; src/services/ai/providers/README.md; src/services/aiIntegration/README.md; src/services/security/envExposure.guard.test.ts.

### Template lifecycle e-mails (server decides recipients)
- What it does: The browser posts only the template event (POST /api/notifications/template-events); the server picks recipients, writes each e-mail in the recipient's language and sends it from a PathScribe address.
- Workflow: Template review events.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Server chooses recipients, writes localised e-mail and sends it.
- Sources: docs/architecture/TEMPLATE_NOTIFICATIONS_API.md; src/services/communications/README.md.

### Planned server-side pieces with client contracts only
- What it does: Outside consult links (real signed tokens, media proxy, concordance mapping); server-side inking endpoints (POST /inking/validate, /inking/override, dbo.InkOverrideAuditLog); retention purge job (retention policy is a setting only, PS-345); dynamic label rules and central template store (printer-agnostic payload); queue-based live updates for the OR boards beyond the demo.
- Workflow: n/a.
- Roles/permissions: n/a.
- Settings: n/a.
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Signed consult tokens and media proxy, inking endpoints, purge job, central label template store, queue-based live updates.
- Sources: src/services/consultAccess/README.md; src/services/grossing/README.md; src/services/retention/README.md; src/services/labelDesigner/README.md.

### Deficiency endpoints (Vercel functions)
- What it does: contain.ts moves a specimen deficiency from open straight to closed; raise-and-resolve.ts creates one directly closed. Caller identity (resolvedBy) is taken from the request body; no authentication.
- Workflow: No in-app flow calls them; the app still uses the localStorage mock.
- Roles/permissions: none enforced server-side.
- Settings: none.
- Status: Built (Demo). Server code under /api/qa/deficiencies (Vercel functions), not browser work. Nothing to build in the front end.
- Sources: api/qa/deficiencies/README.md.

### Deployment readiness review and code-quality guards
- What it does: DEPLOYMENT_READINESS_REVIEW.md lists 25 server components, decisions D1 to D7 (jobs and events in SQL tables behind IMessageBus; on-site agent v1 printers and Windows shares; scripts applied by pipeline; hosting chosen by certifications; BridgeLink hosted or on site; async export), findings F1 to F12 and the market hosting rules (HIPAA, France HDS/SecNumCloud, Germany C5, NHS, Korea, India, Australia, Canada). Six blockers are server work. Build-gating tests also enforce no inline CSS, no unreferenced CSS, no new explicit any (baseline about 1,685), strict tsconfig, capability-catalog parity, deleted-files list, PHI tagging, export routing and language parity. About 10,000 unit tests and Playwright review specs exist; no CI pipeline yet.
- Workflow: Developer/quality.
- Roles/permissions: n/a.
- Settings: n/a.
- Status: Built (guards) / Planned (hosting) — documentation and tests only.
- Sources: docs/architecture/DEPLOYMENT_READINESS_REVIEW.md; src/services/deploymentReadiness/README.md; src/services/typeSafety/README.md; src/services/styleRules/README.md; docs/quality/README.md.

### Interface specification and bulk code import (cross-references)
- What it does: docs/architecture/PathScribe_Interface_Specification_v1_2.docx is the interface spec for vendors. Bulk billing-code import (CPT, HCPCS, OPCS-4, local) is a four-eyes billing function documented in the Financial theme (CSV mapping, check step with refused rows, pending approval as one job, rollback with reason).
- Workflow: Configuration > System > Code Import (Bulk), Pending Approvals.
- Roles/permissions: config:billing-code-import:run; config:billing-tables:approve.
- Settings: coding standard, country, vocabulary.
- Status: Built (Demo) — mock service; production transaction on the API server planned.
- Sources: src/services/billing/codeEngine/README.md; src/components/Config/System/CodeImportSection.tsx.

#### Not yet in FEATURE_OVERVIEW.md
Grep of docs/product/FEATURE_OVERVIEW.md found no mention of:
- Assist LIS ingestion (polling settings, staging queue, Retry failed) and Assist AI drafting rules ("Assist" appears once, as a mode name).
- Interface exception queue review (A43 move, Map & Link for unmapped codes), Specimen Code Crosswalk and pending orders queue, auto-created unverified facilities.
- Inbound ADT processing (A01 to A13, A31), inbound A40/A24/A47/A43, outbound patient ADT (A08, A40, A47).
- Outbound queues (eight) with Simulate failure and Capture as CAPA, Outbound Dispatches trail, Outbound message preview, DFT^P03 builder and preview, OrderCreated and accession event messages, billing JSON webhook.
- Inbound canonical events (block exception, material location, HPV, instrument status), engine webhooks, stand-in receiver, mock interface engine, FHIR scaffolds, physician master file sync, referral manifests, molecular worklist dispatch.
- Cancer registry (13 definitions, report at surgical sign-out, mandatory-data hold), screening registry engine, registry go-live gate and validation instance, acknowledgements, Registry Exceptions worklist, consent and opt-out, transmission audit (only a passing mention of registry submissions).
- Delivery Rules engine and channel plans (e-fax and file drop appear only as stored-document channels), report renderer.
- WSI scan batches, WSI viewer launch, AI screening results, Vendor Integrations dictionaries, scanner dashboard.
- Critical alert delivery channels and the EHR hand-off, secure messaging gateways, cold-chain telemetry.
- MPI multi-authority crosswalk and event bus, national identifiers with check digits, legacy migration pipeline and Migration Jobs.
- PathScribe Agent label client, label printing bridge types (beyond QZ Tray), network print job status, print queue modes.
- Clinical code search (NLM/UTS, LOINC), terminology services health monitor, ICD-O capture gap, uniform coded entry model, licensed terminology build.
- SignalR live updates and the nine data topics, live status badge, connection banner thresholds beyond Batch 548 text, server-supplied settings (/api/config), security headers generator and CSP, HTTPS-only endpoints, bundled fonts.
- Error reporting with PHI scrubbing, error boundaries, Sentry monitoring, draft recovery, idle timeout, edit-conflict dialog details (overview covers the notice only), support references and PHI-free case addresses, CSV formula injection protection.
- Demo Reset and demo baseline, mock EMR and WSI viewer, EMR sidecar.
- Production versus validation instance and server build versus demo build.
- Deficiency Vercel endpoints and the Firestore-based engraver/dispatch-history reads.
- Performance details: server-paged search, 1 MB budget enforced by the build (overview only quotes the sign-in figure).

#### Status in FEATURE_OVERVIEW.md that the code contradicts
- HL7 Processing — Partial ("Standard core (ORM/ORU builders, segment builders) is real and tested"): segmentBuilders has a test, ormBuilder.ts has none, and its only caller ModeAInterfaceService is never wired into any screen or transport; no HL7 ORU builder exists at all (PathScribe sends ORU^R01 as JSON and the engine builds HL7; confirmed by the note in resolvePreAnalyticDateGateConfig.ts). The real inbound ADT and patient-management processors have no listener or caller either.
- Interface Exception & Case-Binding — Live: A43 move, Map & Link and break-glass rebind work (demo storage); A40/A24/A47 manual identity binding is not built and there is no inbound transport.
- Master Patient Index (MPI) — Live: true only against the localStorage mock; the production index is the planned API.
- Hosting — Planned: partly built in the same section (config.json runtime configuration, connection banner, security headers generator, error monitoring, HTTPS-only endpoints, server build without demo code, no browser patient data); only the server, hub, agent and engine are Planned.
- Label Printing — Partial: consistent, but the PathScribe Agent client, status UI and printer-profile Agent Port are also built (agent program is not).
- Supported browsers — Live: Firefox has never been run in the automated suite in this workspace and the hand check is open (PS-718); Safari excluded.
- Accessibility to WCAG 2.1 AA — Live: automated checks pass; the manual screen-reader pass is still open (the overview says so).
- Code systems per jurisdiction — Partial: matches code (nothing reads the policy).
- No other mismatches found for Interface monitoring, Server jobs, Large exports, Site agents, Hosting regions (all marked Partial in the overview, and the code agrees).
- Capability count: overview says 244 (Batch 496), the catalog has 272 keys, AUTHORIZATION_API.md says 245 (from the docs reviewer; not re-counted here).

---

# Theme 6: Administration, configuration, roles and security


Verification note: statuses below were checked against /home/claude/work/src (systemSections.ts, System/index.tsx, configSectionAccess.ts, capabilityCatalog.ts, capabilitySeeds.ts, systemRoles.ts, mockRoleService.ts, signInLockout.ts, signerConfirmation.ts, supportAccess/*, mockBiometricService.ts, migration/*, participationTypes mock service) and against docs/product/FEATURE_OVERVIEW.md. "Demo" = works on browser/mock storage; a production API server is still required.

### Configuration page: tabs, deep links, landing tab
- What it does: Configuration has 11 tabs in this order: Actions, AI, Macros, Templates, Staff, Protocols, System, Cytology, TAT, Validation, Voice, plus Demo only in demo builds (`__DEMO_TOOLS__`). A plain visit lands on System. `?tab=` and `?section=` deep-link to any tab or section (also used by Configuration search and voice navigation). Switching tabs scrolls to top. Validation is locked ("admin required") for non-admins. Tabs AI, Protocols, TAT, Templates, Actions, Validation are wrapped in ConfigSectionGate.
- Workflow: Any user with `screen:configuration:open` opens Configuration; admin picks a tab, then a sub-tab or sidebar section.
- Roles/permissions: `screen:configuration:open` (Admin, Lab Director, QA Reviewer, Template Author/Approver by seed); per-tab write capabilities (see "Configuration write permissions").
- Settings: none; tab order is code.
- Status: Built (Demo) - verified in pages/ConfigurationPage.tsx (TAB_ORDER, getTabFromSearch) and constants/configSearchIndex.ts (CONFIG_TABS).
- Sources: src/components/Config/README.md; src/pages/ConfigurationPage.tsx; src/constants/configSearchIndex.ts

### System tab: all 81 sidebar sections in six groups (inventory)
- What it does: System shows six group tabs and, for the active group, a sidebar of sections (81 in code: Workstation & Hardware 7, Lab Materials & Workflows 20, Clinical Lookups 9, Financial & Revenue Lookups 10, Administration & Compliance 25, Integrations 10). Workstation & Hardware adds one shared facility picker. Each section is wrapped in ConfigSectionGate (view-only without the capability) and asks before leaving unsaved edits. Every section id maps to an existing component in System/index.tsx (verified: 81 of 81 render a component). Stale README claim: System/README and Config/README say "77 sections"; code has 81.
- Workflow: Admin opens Configuration > System, picks a group tab, then a section. The list below gives group, section, owning capability (from configSectionAccess.ts) and README coverage (NO-README = absent from Config/System/README.md).
  - Workstation & Hardware: Print Settings (`config:print-settings:manage`); Label Designer (`config:label-layouts:manage`); Printer Profiles (`config:printers:manage`); Scan Stations (`config:scan-stations:manage`); Site agents (`config:site-agents:enroll` or `config:site-agent-config:manage`); Equipment (`config:equipment:manage`, `equipment:maintenance:record`); Grossing Hardware (`config:grossing-hardware:manage`).
  - Lab Materials & Workflows: Cassette Colors (`config:cassette-colors:manage`); Cassette Routing Rules (`config:cassette-routing:manage`); Container Types (`config:container-types:manage`); Reagent & Solution Lots (`config:reagent-lots:manage`) NO-README; Workstation Groups (`config:workstation-groups:manage`); Action Groups (`config:action-groups:manage`); Diagnostic Catalog = stains (`config:stain-dictionary:manage`); Ink Colors (`config:ink-color:manage`); Inking Validation Mode (`config:inking-validation-mode:manage`); Vendor Integrations (`config:vendor-integrations:manage`; named in System/README only by label); Cytology QC Rules (`config:cytology-qc-rules:manage`); OR Suite Terminals (`config:or-suite-terminals:manage`); Intraoperative critical results (`config:intraop-critical-results:manage`, self-gated); Display Profiles (`config:display-profiles:manage`); Migration Field Mappings (`config:migration-mappings:manage`) NO-README; Cancer Registry Reporting (`config:cancer-registry:manage`, self-gated); Flags (`config:case-flags:manage`); Grossing Route Overrides (`config:grossing-routes:manage`); Specimen Dictionary (`config:specimen-dictionary:manage`); Asset Location Dictionary (`config:asset-locations:manage`) NO-README.
  - Clinical Lookups: Governing Bodies (`platform:governing-bodies:manage`); Abnormal Trigger Rules (`config:abnormal-triggers:manage`); Participation Types (`config:participation-types:manage`); Country Signing Rules (`platform:signing-rules:manage`); Code Systems (`config:code-systems:manage`); Protocol Dictionary (`config:processing-protocols:manage`); Organ maps (`config:organ-map-scheme:manage`, `config:organ-map-bindings:manage`); Departments (`config:departments:manage`); Subspecialties (`config:subspecialties:manage`).
  - Financial & Revenue Lookups: Billing Dictionary (`config:billing-rules:manage`); Billing Export Preview/DFT (`config:interface-preview:view`); Code Import Bulk (`config:billing-code-import:run`); Charge Release Triggers (`config:billing-triggers:manage`) NO-README; CPT Modifier Dictionary (`config:billing-modifiers:manage`); Jurisdiction Payment Mapping (`config:payment-mappings:manage`); Master Payment Types (`config:payment-types:manage`); NCCI Edit Rules (`config:billing-ncci:manage`); Pending Billing Rule Approvals (`config:billing-tables:approve`); RVU Code Map (`config:billing-rvu:manage`).
  - Administration & Compliance: Approved Fonts and Document Style (`config:report-appearance:manage`); Contribution Dashboard (`config:contribution-settings:manage`); Data Retention (`config:retention-policy:manage`); Delegation Types (`config:delegation-types:manage`); External Resources (`config:external-resources:manage`); Field Requirements (`config:field-requirements:manage`, self-gated); Post-Sign-Out Release Buffer (`config:release-buffer:manage`); Preliminary-vs-Final Concordance Review (`config:concordance-review:manage`) NO-README; Delivery Configuration Rules (`config:delivery-rules:manage`); Print Destination Routing Rules (`config:print-routing:manage`); QA Configuration Center (`config:qa-types:manage`); Biopsy-to-resection window (`config:biopsy-resection-correlation:manage`); Tumor Board Auto-Flag Rules (`config:tumor-board-rules:manage`); Follow-up tracking (`config:follow-up-tracking:manage`); Revision Reasons (`config:revision-reasons:manage`); Peer Review Before Sign-Out (`config:peer-review:manage`); Clinical Mismatch Rules (`config:clinical-mismatch-rules:manage`); AI Instructions (`config:ai-prompt:edit`/`approve`); Discordance Trend Policy (`config:qa-trend-policy:manage`); Feedback (`config:feedback:manage`); Research Feed (`config:research-feed:manage`); Session Security (`config:session-security:manage`); Support Access (policy/approve/audit capabilities, self-gated); Template Review (`config:template-governance:manage`, self-gated).
  - Integrations: Assist LIS Ingestion (`config:assist-polling:manage`); Case Mask Configuration (`config:case-masks:manage`); Case Routing (`config:case-routing:manage`, `case:routing:run`); Facility Configuration = id `clients` (`config:facilities:manage`); Order Types & Inbound Rules = crosswalk (`config:crosswalk:manage`); Outbound Interface Message Preview (`config:interface-preview:view`); Physicians (`config:physicians:manage`); Routing Rules (`config:case-routing:manage`); Specimen Deficiencies (`config:deficiency-types:manage`); Terminology Services (no capability; detail shown to Superadmin only).
- Roles/permissions: as listed per section. Seeds: Admin all, Lab Director all except drafting synoptic protocols, Template Author/Approver only protocol and template ones, hospital-made roles none.
- Settings: this inventory is the settings map; sections not in configSectionAccess.ts (Terminology, Staff, Support Access, Field Requirements, Template Review, Intraop critical results, Cancer Registry, Governing Bodies, Demo Reset) grey their own controls.
- Status: Built (Demo) overall - all 81 components exist and render. Per-section status differences are in the entries below (for example Code Systems Partial, Data Retention setting-only, Migration Field Mappings Partial).
- Sources: src/components/Config/System/systemSections.ts; System/index.tsx; System/README.md; src/services/screens/configSectionAccess.ts; docs/architecture/AUTHORIZATION_API.md

### README coverage gaps for System sections
- What it does: Sections with no mention in Config/System/README.md (component name or label): Reagent & Solution Lots (only services/reagentLots/README.md), Migration Field Mappings (services/migration/README.md, docs/product/CAPABILITIES.md), Asset Location Dictionary (services/assetLocation, types/assetLocation, Autopsy READMEs), Charge Release Triggers / Billing Type Trigger (services/billing/README.md capability line only; earlier reviewer called the UI "Unverified" - verified: BillingTypeTriggerSection.tsx exists, 197 lines, enterprise/site selector, writes through billingTypeTriggerConfigService), Preliminary-vs-Final Concordance Review (services/qualitySettings/README.md, AUTHORIZATION_API.md only). Vendor Integrations is named in System/README by label only. No admin-facing text explains any of these five screens.
- Workflow: documentation task for Pete's Admin Guide.
- Roles/permissions: n/a.
- Settings: n/a.
- Status: Built (Demo) for the screens; documentation gap.
- Sources: grep of all READMEs and docs/ for component names and labels; the five section files in src/components/Config/System/

### Cytology configuration tab (12 sections)
- What it does: Configuration > Cytology lists 12 sections from cytologySections.ts: Cytology Categories (`config:cytology-categories:manage`), Non-GYN Categories (same key), Nomenclature (`config:cytology-nomenclature:manage`), Screening Strategy (`config:cytology-screening-strategy:manage`), Non-GYN Routing (`config:cytology-routing:manage`), Registry Reporting (`config:screening-registry:manage`), QC Random Selection Rate (`config:cytology-qc-rates:manage`), Country-specific rules/compliance (`config:cytology-compliance:manage`), Daily Workload Cap (`config:cytology-workload-cap:manage`), Assisted Instrumentation (`config:cytology-instrumentation:manage`), Cyto-histologic correlation severity mapping (`config:cytology-severity-mapping:manage`), Correlation window (`config:cytology-histology-correlation:manage`).
- Workflow: Admin opens Cytology tab, picks a section; enterprise default with facility overrides where stated.
- Roles/permissions: per-section manage keys above (Admin, Lab Director).
- Settings: the sections themselves.
- Status: Built (Demo). Registry transmission needs production registry connection.
- Sources: src/components/Config/Cytology/cytologySections.ts, README.md; configSectionAccess.ts

### Configuration search
- What it does: Search bar on the Configuration header scores a full index (label, synonyms, description) covering every tab, every System, Cytology and Staff section, Report Templates and Validation Studies inner tabs, and staff sign-in password. Choosing a hit opens the exact tab and section. Search text is not an unsaved change. Tests fail on a missing section or placeholder entry. Known defect: entry `sys-jurisdiction` promises a SNOMED/ICD variant setting; it now opens System > Code Systems.
- Workflow: type in the search bar, pick result.
- Roles/permissions: anyone who can open Configuration.
- Settings: constants/configSearchIndex.ts must stay in step with section ids.
- Status: Built.
- Sources: src/components/Config/Search/README.md; ConfigSearchBar.tsx; src/constants/configSearchIndex.ts

### Configuration write permissions (one capability per section)
- What it does: Every Configuration service checks its own `config:<section>:manage` (or listed) capability on every write; a refused write changes nothing, is audited, and shows ConfigRefusalBanner naming the missing permission and where an administrator grants it. Reads are not checked, except interface previews. Count: docs say "84" (README) and "about 90" (AUTHORIZATION_API); code has 100 `config:*:manage` keys and 119 `config:` keys in total.
- Workflow: admin edits; if refused, banner appears; grant the key in Staff > Roles > Capabilities.
- Roles/permissions: Admin all; Lab Director all but drafting protocols; Template Author/Approver only protocol/template keys; hospital roles none; Superadmin all (except AI prompt approve).
- Settings: Role Dictionary.
- Status: Built (Demo); server enforcement Planned (PS-358).
- Sources: docs/architecture/AUTHORIZATION_API.md; src/services/authorization/guardConfigWrites.ts, capabilityCatalog.ts; ConfigRefusalBanner.tsx

### View-only Configuration sections
- What it does: Without a section's capability, the section opens view-only with a note naming the permission: buttons, checkboxes, radios, and every field except search/filter boxes are greyed or ignore changes (including selects that save on change). Tabs, sub-tabs, search, filters and closing a dialog still work (marked `data-config-nav`, 77 such fields). Sections that grey their own controls are not wrapped (Staff roles, Support Access, Field Requirements, registries, governing bodies, intraop critical results, Template Review, Demo Reset); Macros and Voice accent are personal and stay editable.
- Workflow: automatic.
- Roles/permissions: any one capability listed for the section makes it editable.
- Settings: services/screens/configSectionAccess.ts.
- Status: Built (Demo).
- Sources: src/components/Config/ConfigSectionGate.tsx (+test); configSectionAccess.ts; Config/README Batches 429-430

### Unsaved-change guard in Configuration
- What it does: Leaving with unsaved edits (tab, section, group tab, Staff sub-tab, Protocols list, logo, breadcrumb, nav bar, header search, Sign Out, browser close, backdrop/Escape on an edited dialog) asks first; "Discard changes" closes the dialog. About 25 sections report drafts; dialogs are tracked by the page (`useConfigEditTracking`); search and filter fields are marked ignored (70).
- Workflow: automatic.
- Roles/permissions: none.
- Settings: none.
- Status: Built.
- Sources: src/services/configDirty/README.md; configDirtyGuardContext.ts; pages/ConfigurationPage.tsx

### Duplicate policy
- What it does: Duplicate is offered only for complex configuration (Facility, Stain Dictionary parts, processing/synoptic protocols, case pool and routing, cassette routing, TAT, abnormal trigger rules, QA config, cytology QC rules, Role Dictionary, Billing Dictionary, Participation Types), templates (Specimen Dictionary, Report Parts, Report Templates, Action Groups) and multi-site variants (Printer Profiles, Workstation Groups). Never for people, physicians, container types, delegation types, RVU rows, cassette colors, grossing hardware or equipment. A copy opens a pre-filled Add form, gets a localized "Copy of" name, clears identity/matching fields, drops built-in status; cassette routing and abnormal trigger copies start inactive; a Superadmin copy becomes an ordinary custom role without platform-only capabilities.
- Workflow: click Duplicate, edit pre-filled form, Save.
- Roles/permissions: those of each screen.
- Settings: services/duplication/duplicatePolicy.ts (code).
- Status: Built; a guard test enforces the policy against every component.
- Sources: src/services/duplication/README.md; duplicatePolicy.guard.test.ts; Config/README "Duplicate policy"

### Uniqueness and performing-lab scoping of dictionary items
- What it does: Dictionaries (cassette colors, container types, delegation types, deficiencies, subspecialties, protocols, ink and others) can be scoped to a performing lab (blank = all labs). `findDuplicate` blocks same-scope collisions, case-insensitive (physician code and NPI, crosswalk clientId+externalCode, facility assigning authority, protocol name per lab); a different lab scope is allowed.
- Workflow: Add/Edit in any dictionary; error on collision.
- Roles/permissions: the dictionary's manage capability.
- Settings: performing lab selector in each editor.
- Status: Built (Demo).
- Sources: src/utils/README.md; duplicateEntry.ts, validateUnique.ts, performingLabs.ts

### Demo Reset tab
- What it does: Full Reset behind a confirmation restores the demo baseline and clears case data, settings, session markers and display preferences; some keys deliberately survive (support audit stream). About 9 real storage keys are still missing from the reset list (known gap).
- Workflow: Demo admin, Configuration > Demo (only when demo tools are enabled).
- Roles/permissions: `config:demo-data:reset`.
- Settings: build flag `__DEMO_TOOLS__`.
- Status: Built (Demo only); absent from server builds.
- Sources: src/components/Config/System/DemoResetTab.tsx; Config/README known issues

### Staff directory (Members sub-tab)
- What it does: Staff list grouped by primary role with member counts and "+N" for extra roles; role filter finds anyone holding it; "No Matching Role" catches orphans; search matches name, email, credentials, NPI, GMC number, licence, phone. Edit form covers name, roles (Superadmin omitted), facilities, subspecialties (replacing free-text department), email, phone, NPI, GMC, licence, signature link, spelling language, pediatric/orchestration/cross-tenant-QA flags, quick PIN. CSV export neutralizes formulas. Sub-tabs Members, Roles, Credentialing via `?section=members|roles|credentialing`.
- Workflow: Configuration > Staff > edit; Save refused with a plain message if a rule fails.
- Roles/permissions: `config:staff:edit` to save; `config:staff-access:assign` additionally to change roles, facilities, pediatric/orchestration/cross-tenant QA access or credentials (otherwise read-only with a note).
- Settings: Field Requirements page "Staff" (first name, last name, one role locked; email format checked; others requirable, footer "Still required: ...").
- Status: Built (Demo); `saveStaffMember` is the only save path.
- Sources: src/components/Config/Staff/README.md; StaffTab.tsx; services/staff/staffAdministration.ts, staffFormChecks.ts

### Facility scope on staff
- What it does: A staff record lists facilities (`facilityIds`; empty = all). For a limited person, capability checks refuse actions on another facility's data, actions spanning all facilities (enterprise/organisation QA scopes) and case actions on a case with no facility. Scope narrows, never grants.
- Workflow: admin assigns facilities on the staff record.
- Roles/permissions: `config:staff:edit` + `config:staff-access:assign`.
- Settings: Staff > edit > Facilities.
- Status: Built (Demo).
- Sources: src/services/authorization/README.md; evaluateCapability.ts; staffAdministration.ts

### Jurisdictional credentials and appointments
- What it does: Staff rows record credential type, issuing body, jurisdiction, effective and optional expiry dates; validated; each add/remove audited ("Staff credentials changed"). Active credentials normalize to capability keys CYTO_ADVANCED_SPECIALIST (UK Advanced Specialist, NL, DE equivalents) and FORENSIC_AUTOPSY_SIGNOUT (medicolegal appointment or UK Home Office registered forensic pathologist). Forensic autopsy sign-out requires an active appointment, no admin override. Sub-national (county/state) appointments Planned.
- Workflow: Staff > edit > Jurisdictional credentials & appointments.
- Roles/permissions: `config:staff-access:assign`.
- Settings: credential types in resolveNormalizedCredentialCapabilities.ts.
- Status: Built (Demo).
- Sources: Config/Staff/README Batch 331; services/staff/README.md; providerCredentialRules.ts

### Credentialing Review sub-tab (FPPE, Cytotechnologist competency)
- What it does: Hosts FPPE assignments and Cytotechnologist competency assignments panels. Creating and graduating FPPE assignments is permissioned.
- Workflow: Staff > Credentialing.
- Roles/permissions: `config:fppe:manage`, `config:cytotech-competency:manage` (section ids `staff:fppe`, `staff:cytotech-competency`).
- Settings: n/a.
- Status: Built (Demo).
- Sources: StaffTab.tsx lines 915-916; configSectionAccess.ts; services/cases/README.md Batch 515

### Staff sign-in password (admin-set)
- What it does: Shows state (set with date, must change next sign-in, built-in demo password, none). Admin Sets/Resets (new + confirm; "must choose a new password at next sign-in" on by default) or Removes. 12-128 characters, not blank, not the email; PBKDF2-SHA256 600,000 iterations with salt; hash only; audit STAFF_PASSWORD_SET/CLEARED (never the password). Once set, the built-in demo password stops working for that account; setting clears the person's sign-in lock. On SSO-only builds the section says the identity provider manages passwords.
- Workflow: Staff > edit > Sign-in password.
- Roles/permissions: `config:staff-password:manage` (button and service; Admin).
- Settings: none.
- Status: Built (Demo) - browser hash storage; production hash in SQL Server Planned. Password sign-in exists only in demo builds.
- Sources: Config/Staff/README Batch 448; services/staffPasswords/README.md, staffPasswordRules.ts; StaffSignInPassword.tsx

### Linked sign-in accounts (SSO) on Staff
- What it does: Lists a person's linked SSO accounts (provider, short id, when, how linked; link source can be `scim`). Admin can Unlink; effective at once and audited. With link-by-email on, the account re-links at next sign-in unless the person is deactivated or the email changed. Not shown when adding a new person.
- Workflow: Staff > edit > Linked sign-in accounts.
- Roles/permissions: `config:staff-access:assign`.
- Settings: link-by-email.
- Status: Built (Demo). SCIM provisioning itself is Planned (not seen in code). Older users README line "no admin screen shows them yet" is stale (LinkedSignInAccounts.tsx exists).
- Sources: Config/Staff/README Batch 345; LinkedSignInAccounts.tsx; services/auth/linkedAccounts.ts

### Staff signature link and spelling language
- What it does: Signature is an https link to an image in the hospital's own system (refuses data:, http://, credentials, single-label hosts); an older uploaded image opens empty with a note so the record can still be saved; preview loads after leaving the field. Per-staff Spelling language (blank = facility default) sets spell-check language for cases assigned to that pathologist unless the case overrides.
- Workflow: Staff > edit.
- Roles/permissions: `config:staff:edit`.
- Settings: `StaffUser.spellingLocale`.
- Status: Built.
- Sources: Config/Staff/README Batches 338, 544; staffFormChecks.ts

### Access-request tickets and clinical admins
- What it does: Requests for Pediatric, Pool or Orchestration access are saved as tickets with status lifecycle, turnaround metric and a required denial reason; admins ("clinical admins" subset) are messaged; badges show pending requests. Granting access closes the person's matching pending requests automatically.
- Workflow: requester asks; admin approves/denies on Staff.
- Roles/permissions: `config:staff-access:assign`.
- Settings: none.
- Status: Built (Demo).
- Sources: src/utils/README.md; src/types/access/README.md; services/access/closeGrantedAccessRequests.ts

### OR staff quick PIN
- What it does: `quickAuthPin` set on the Staff screen lets OR staff attribute actions at the OR wall display; PINs belonging to lab staff are refused; matched by role id `or-staff` or role name "Or Staff". Badge/RFID reader not built.
- Workflow: admin sets PIN on Staff; staff enters PIN in the dismiss modal.
- Roles/permissions: `config:staff:edit` to set.
- Settings: Staff record.
- Status: Built (Demo). PIN attribution works with lab-staff refusal; only the badge/RFID reader hardware is missing.
- Sources: services/intraopDashboard/README.md Batch 589; resolveStaffByQuickAuthPin.ts

### Role Dictionary
- What it does: Two-panel role editor with four tabs: Capabilities (enforced), Commands (voice/keyboard; informational), Case Participation, Cheat Sheet. Add, Edit, Duplicate (named "Copy of ...", built-in forced off, reviewed before save). Rename carries to staff records; built-in role descriptions show translated until edited. A save that would leave no assignable role able to manage roles is refused (lockout guard). Facility Access tab and role-level Pediatric switch were removed (never enforced; now on the staff record).
- Workflow: Configuration > Staff > Roles.
- Roles/permissions: `config:roles:manage` (Add Role, Duplicate, Save).
- Settings: role name, colour, case access, config access, capabilities, commands, participation types.
- Status: Built (Demo).
- Sources: Config/Staff/README; RoleDictionary.tsx (tabs line 134); services/roles/roleAdministration.ts

### Role Capabilities tab and dependencies
- What it does: Capabilities grouped for display, each with description, "Audited" tag for high-risk ones, the `domain:object:verb` key and its dependencies. Turning on a capability that requires others offers to turn them on; turning off one others need lists the dependents. The role service refuses unknown keys or unmet requirements. Saving writes audit entry "Role capabilities changed".
- Workflow: Role editor opens on this tab.
- Roles/permissions: `config:roles:manage`.
- Settings: catalog and dependencies in services/authorization (`planGrant`/`planRevoke`).
- Status: Built (Demo).
- Sources: Config/Staff/README Batch 369; RoleCapabilitiesTab.tsx (+test); capabilityToggle.ts; roleCapabilityRules.ts

### Capability catalog and permission check
- What it does: Every protected action has a `domain:object:verb` key with group, risk (high-risk checks audited on every check, allowed or refused) and optional `requires`. Allowed only if a held role grants it, its requirements are held, and the action is inside the person's facility scope. Refusal reasons: noUser, unknownCapability, notGranted, requirementNotGranted, outOfScope, facilityUnknown. No role bypasses it, Superadmin included. Code catalog has 272 keys (config 119, case 25, screen 21, qa 21, cytology 16, autopsy 12, audit 7, others); docs say 244/245.
- Workflow: services call `authorizationService.enforce`; screens use CapabilityButton / useCapabilities to grey controls with a tooltip naming the reason (not granted, missing requirement, outside facility).
- Roles/permissions: all roles.
- Settings: Role Dictionary; capabilitySeeds.ts.
- Status: Built (Demo, browser-side); server enforcement (403 `capability_refused`, append-only audit table) Planned (PS-358). Build-gate guard tests keep catalog, checks and AUTHORIZATION_API.md in step.
- Sources: docs/architecture/AUTHORIZATION_API.md; src/services/authorization/README.md, capabilityCatalog.ts (272 entries counted), evaluateCapability.ts; CapabilityButton.tsx

### Built-in roles
- What it does: 16 built-in roles ship in the Role Dictionary: Pathologist, Resident, Fellow, Pathologists' Assistant, Admin, Physician (directory only), Or Staff (directory only), Template Author, Template Approver, Lab Director, QA Reviewer, Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist, Superadmin. Fixed ids (admin, lab-director, template-author, ...) survive renames; missing built-ins are merged in on load. A separate session role (`pathologist-admin`) is derived when a person holds both a case-access and a config-access role.
- Workflow: Staff > Roles.
- Roles/permissions: `config:roles:manage`.
- Settings: Role Dictionary.
- Status: Built (Demo).
- Sources: src/services/roles/systemRoles.ts, mockRoleService.ts (builtIn rows), auth/sessionRole.ts; Config/Staff/README

### Default grants and "keep today's users" seeds
- What it does: Built-in roles start with the screens and actions they had before each capability existed. Superadmin gets all (minus AI prompt approve); Admin gets all exports, administration and Configuration capabilities; Lab Director gets Configuration except drafting protocols; QA Reviewer gets QA exports; Pathologist gets almost nothing extra (least privilege). Each seed is offered once so an admin's removal sticks. Custom hospital roles are offered screens once (all except Configuration and Quality & Compliance if the role has case access; those two if config access) plus most casework capabilities; never offered: `cytology:case:finalize`, `cytology:preliminary:release`, `billing:charge:approve`, `config:ai-prompt:edit`. Nobody holds by default: `autopsy:gross-exam-gate:override`, `cytology:qc-review:bypass`, `cytology:preliminary:release`.
- Workflow: seeds apply on load (`applyCapabilitySeeds`); admin adjusts in Role Dictionary.
- Roles/permissions: as above.
- Settings: Role Dictionary.
- Status: Built (Demo).
- Sources: src/services/authorization/README.md; capabilitySeeds.ts; docs/architecture/AUTHORIZATION_API.md

### Voice and shortcut commands in roles (not access control)
- What it does: All 257 voice/shortcut commands have Role Dictionary entries (60 record-changing commands added in Batch 600, 89 open/filter/move commands in Batch 601, 16 text-editor commands in Batch 614; 82 entries have no voice phrase of their own, each classified with a reason). Built-in roles are offered new commands once (`Role.seededActions`); admin removals stick; custom roles untouched. A command only triggers; capabilities decide access. Pathologist/Fellow/Resident/PA/Accessioner/Histotechnologist/Cytotechnologist/Molecular Tech/Admin/Lab Director get job commands; Physician, Or Staff, QA Reviewer, template roles get none of the record-changing ones. Default grants need Pete's review.
- Workflow: Role Dictionary > Commands tab; Configuration > Actions for the registry.
- Roles/permissions: `config:roles:manage`; `config:actions:manage` for the registry.
- Settings: constants/defaultActionGrants.ts; services/roles/actionSeeds.ts.
- Status: Built; 52 hotkey and voice clashes remain, all settled by screen-wins and locked in a known list (Batch 614).
- Sources: docs/product/ACTIONS_COVERAGE.md; src/services/actionRegistry/README.md; i18n README Batches 599-601

### Superadmin (ForMedrixAI support role)
- What it does: Superadmin is locked to the whole catalog on every load (minus `config:ai-prompt:approve`), cannot be edited, assigned or saved by hospitals; Role Dictionary shows it read-only with a "managed by ForMedrixAI" banner; a copy drops platform-only capabilities; a staff record naming Superadmin gets nothing. Platform-only keys: `platform:cross-tenant-cases:view` (audited each open), `platform:governing-bodies:manage`, `platform:signing-rules:manage`. SSO sign-in never yields superadmin (a non-assignable role is ignored). A separate ForMedrix identity tenant for support is not built.
- Workflow: support signs in through a support sign-in, then reaches a hospital only through the support access gate.
- Roles/permissions: Superadmin only; hospital capability tabs omit the platform group.
- Settings: none for hospitals.
- Status: Built (Demo, browser); ForMedrix identity tenant / server side Planned (ACCESS_CONTROL_PLAN.md).
- Sources: authorization/README.md Batches 371, 428; capabilitySeeds.ts (SUPERADMIN_WITHHELD); docs/architecture/ACCESS_CONTROL_PLAN.md; FEATURE_OVERVIEW "Planned" section

### Separation of duties
- What it does: One pair is defined: `config:clinical-mismatch-rules:manage` and `config:ai-prompt:approve` cannot be held together. A role holding both is refused (Superadmin included - which is why Superadmin lacks AI prompt approve), and a person's combined roles are checked too, on role save and staff save (`SEPARATION_OF_DUTIES`). AI instruction edits wait for a different person's approval.
- Workflow: admin saves a role or staff member; refusal appears in the dialog.
- Roles/permissions: applies to every role.
- Settings: pairs in code only (not admin-editable).
- Status: Built (Demo). One pair only; Config/Staff README entry was "Unverified" - verified in capabilityCatalog.ts lines 870-872 and roleCapabilityRules.ts.
- Sources: authorization/README.md Batch 536; capabilityCatalog.ts; separationOfDuties.test.ts; services/clinical/aiInstructionService.ts

### Cytotechnologist role restrictions
- What it does: The Cytotechnologist role lists only the cytotechnologist participation type and a save with a pathologist type is refused (locked in Role Dictionary). A person holding Cytotechnologist and none of Pathologist/Resident/Fellow cannot be placed in pathologist participation slots (primary, attending, resident, frozen, second_opinion, consultant, provisional_hire, or any type that can finalize) in pool claims, case team, delegation or role administration. A cytotech claiming a pool case becomes cytotechnologist, not primary pathologist.
- Workflow: automatic.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built (Demo).
- Sources: participationTypes/cytotechParticipationRules.ts; services/roles/README.md Batch 441; services/cases/README.md

### Screen access (Home tiles and route gates)
- What it does: 21 `screen:<name>:open` capabilities (Accession, Worklist, Search, Add-On Orders, Intraop Queue, Cytology QC Queue, Surgical QA, My Contribution, Bench Contributions, Tumor Board, Batch Management, Cytology Workspace, Microtome, Embedding, Slide Distribution, Molecular, Margin Exception Review, Audit, Quality Assurance, Registry Exceptions, Configuration). Home and hub tiles show only openable screens; routes re-check via ScreenGate. All Configuration sub-pages (template editor/review, Part Builder, Template Assembly, Migration Jobs, Molecular Order Queue, mock interface engine) are gated by `screen:configuration:open`; a guard test fails the build on an ungated route unless listed as open (sign-in, token links, wall dashboards, /consult, /my-exports). `cytology:qc-review:bypass` also opens the QC queue.
- Workflow: user signs in; Home filtered by role.
- Roles/permissions: seeded per role (SCREEN_SEEDS); Admin opens Batch Management but not bench actions.
- Settings: Role Dictionary.
- Status: Built (Demo).
- Sources: src/services/screens/README.md, screenAccess.ts, routeGating.guard.test.ts; ScreenGate.tsx

### Field Requirements (which fields are required per page)
- What it does: Organisation-level settings choose which fields each page requires; locked fields show why they cannot be switched off. Pages include Accession, Grossing, Case report (incl. hold notes, autopsy forms), Messaging, Cytology screening, Microtome, Intraop, Embedding, Slide distribution, Add-on orders, Batch management, Molecular plate builder and rack loading, Staff, Facility editor and Cytology clinical history (16 pages). Staff: first name, last name, role locked; Facility: name and assigning authority locked (unique, case-insensitive; matches inbound HL7), email required unless switched off, interface endpoint and LIS sending ID locked once interface set up. Screens mark a star and a "Still required" footer. Changes audited.
- Workflow: Configuration > System > Administration & Compliance > Field Requirements.
- Roles/permissions: `config:field-requirements:manage`.
- Settings: per organisation (performing-lab tenant); nothing fixed by jurisdiction.
- Status: Built (Demo).
- Sources: src/services/fieldRequirements/README.md; staffFormChecks.ts, facilityFormChecks.ts; docs/product/FEATURE_OVERVIEW.md

### Sign-in page and demo password accounts
- What it does: One working button per SSO provider configured; password form only when the build allows it; otherwise a disabled "Soon" row or "Sign-in isn't set up". Returns the user to the page they wanted (safe internal path only). Demo builds sign in against built-in demo accounts (PBKDF2-SHA256, 600,000 iterations; an unknown email takes as long as a wrong password): ~24 role demos (pathologists, accessioner, histotech, cytotechs, molecular tech, PA, Lab Director, Resident, Fellow, Template Author/Approver, QA Reviewer, a superadmin). Environment badge on the page. Server builds (`npm run build:server`) contain no demo accounts; a production-bundle check fails if present.
- Workflow: /login; SSO returns to /auth/callback/:providerId.
- Roles/permissions: public.
- Settings: `VITE_AUTH_MODE` (sso|password) in config.json; `VITE_AUTH_*` (16 settings).
- Status: Built (Demo) for password demo; see SSO entry for production.
- Sources: src/services/auth/README.md; LoginPage.tsx, AuthCallbackPage; services/auth/demo/demoAccounts.ts; scripts/auth/hash-demo-password.mjs

### Sign-in lockout
- What it does: 5 failed password sign-ins in a row for one typed email lock that email for 15 minutes (whether or not it is an account). While locked the password is not checked; a correct password clears the count. Message is plain "incorrect" until the last try, then a warning, then minutes left. Audited (never records what was typed).
- Workflow: automatic; admin set/reset of a password also clears the lock.
- Roles/permissions: none.
- Settings: fixed constants `SIGN_IN_LOCK_POLICY { maxFailures: 5, lockMinutes: 15 }`.
- Status: Built (Demo) - lock held only in that browser (`pathscribe_sign_in_locks`); server contract in AUTHENTICATION_OIDC.md section 4a. Services/staffPasswords README calls it "Unverified here"; verified in signInLockout.ts.
- Sources: services/auth/signInLockout.ts (+test); auth/README.md Batch 456

### Password screening and must-change password
- What it does: Rejects predictable patterns, passwords containing PathScribe, ForMedrixAI or the person's email/local part, common passwords (NCSC list, 9,365 entries), and breached ones via Have I Been Pwned range check (first 5 SHA-1 characters). If HIBP is unreachable the save proceeds and the audit notes local checks only. A password flagged must-change returns `password_change_required`; the login form shows "choose your own password" (new + confirm). "Forgot password?" tells the user to ask an administrator to reset it from Staff.
- Workflow: admin sets password; user changes at next sign-in.
- Roles/permissions: `config:staff-password:manage`.
- Settings: `VITE_PWNED_CHECK=off` disables the HIBP check.
- Status: Built (Demo). No self-service reset or email reset.
- Sources: services/staffPasswords/README.md, passwordScreening.ts; auth/README.md Batch 448

### Single sign-on (OpenID Connect)
- What it does: Sign-in through the hospital's identity provider with authorization code + PKCE (Microsoft Entra ID with a named tenant, or generic OIDC such as Okta; https only; Google refused until the API server exists; unknown mode fails closed). No client secret; tokens in sessionStorage with refresh-token renewal; sign-out forgets tokens only; one completion per callback URL. App role is derived from the staff roles (pathologist, admin, pathologist-admin or none), never superadmin. Server builds are SSO-only (`SSO_REQUIRED`).
- Workflow: user clicks provider button, authenticates, returns to the page originally wanted.
- Roles/permissions: only active, pre-provisioned staff may sign in.
- Settings: `VITE_AUTH_*` or deployment config.json (authority, client id, API scope).
- Status: Built (Demo). OIDC client with PKCE, config, role mapping and tests against a local fake provider are built; real IdP check and server-held sessions are external.
- Sources: docs/architecture/AUTHENTICATION_OIDC.md; services/auth/sso/ssoClient.ts, authConfig.ts, sessionRole.ts; FEATURE_OVERVIEW (Planned section)

### SSO account matching and provisioning (group mapping Planned)
- What it does: Linked by issuer + subject; first sign-in matches by trusted email; refusals not_provisioned, inactive, ambiguous, already_linked, each audited ("SSO account linked", "SSO sign-in refused"). Directory sync (SCIM) so a leaver loses access, and group-to-role mapping (bench roles only, second admin approves each mapping, each role shows its source; Entra first, then Okta) are Planned after first release; roles stay hand-assigned.
- Workflow: admin provisions staff; user signs in; link stored.
- Roles/permissions: staff record plus `config:staff-access:assign` for unlink.
- Settings: link-by-email.
- Status: Built (Demo) for matching; Planned for SCIM and group mapping.
- Sources: services/auth/externalIdentity.ts (+test); FEATURE_OVERVIEW "Single sign-on group mapping"; services/roles/README.md

### Multi-factor authentication
- What it does: PathScribe has no app-level MFA at sign-in; any second factor is the hospital identity provider's. Re-authentication at signing is separate (see Signer confirmation).
- Workflow: n/a.
- Roles/permissions: n/a.
- Settings: none.
- Status: Built (Demo) (Batch 611). Multi-factor sign-in: organisation policy, single sign-on assurance check, a Simulated authenticator with recovery codes, step-up at signature, lockout, expiry and audit without secrets; acceptance criteria and tests in docs/architecture/MFA.md. Waiting on the identity provider or auth server for the production second factor.
- Sources: grep of /home/claude/work/src and docs

### Session restore, same-user second login, session-end clearing
- What it does: Session restores on load. A sign-in from another tab by the same user is detected (browser `storage` event + active-session marker): conflict prompt, "supersede" vs explicit logout, with a "signed in elsewhere" notice on the login page; drafts preserved. Session-end hooks clear per-user held data (for example export notices) so the next person on a shared workstation sees nothing.
- Workflow: automatic.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo) - same-browser only; cross-browser needs server.
- Sources: auth/README.md Batches 343, 550; sessionEndHooks.ts; services/session/sessionSupersedeService.ts

### Idle session timeout and draft recovery
- What it does: Inactivity shows a warning modal then forces logout with drafts preserved. Org default in minutes (presets 5, 10, 15, 20, 30, 60; fallback 15 until it loads), overridden per performing lab of the case on screen (`Facility.idleTimeoutMinutesOverride`); falls back to the org default when no case is open. Timer uses absolute timestamps and rechecks on tab visibility. A whole-case draft cache (excluding the patient object) offers a Draft Recovery modal on reopening; restore is local-only and marks the case dirty. Draft encryption (phase 3) not built.
- Workflow: automatic; admin sets org default; facility override in Facility editor > AI & Performance.
- Roles/permissions: `config:session-security:manage`.
- Settings: Configuration > System > Session Security; Facility editor.
- Status: Built (Demo). The wall dashboards (/facility-ops-dashboard, /or-suite-dashboard) sit outside login and session timeout by design; since Batch 603 each needs a valid Display Token instead.
- Sources: services/session/README.md; hooks/useIdleTimeout.ts; SessionSecuritySection.tsx; services/drafts/

### Signer confirmation (re-authentication at every signature)
- What it does: Every signature (case sign-out, countersign, finalize synoptic, pre-finalisation, cytology sign-out/preliminary, autopsy PAD/FAD, registry go-live) requires confirming identity: password (username also on the first signature of a sign-in session, per 21 CFR 11.200(a)(1)), or SSO popup re-auth (`prompt=login`, `max_age=0`, same account, fresh auth_time), or biometric (demo only). Five failures lock signing for that user for 15 minutes (cancelled popup does not count). All confirmations, failures and locks audited.
- Workflow: signing dialogs use `useSignerConfirmation`.
- Roles/permissions: n/a.
- Settings: fixed `SIGNING_LOCK_POLICY` (5/15).
- Status: Built (Demo); server must re-verify the ID token cryptographically (Planned).
- Sources: auth/README.md Batches 344, 423, 533; signerConfirmation.ts; components/Signing/; signingScreens.guard.test.ts

### Biometric e-signature policy and enrolment
- What it does: Lab policy (on/off; ask every sign-out, once per session, every N days 1-365, or never; default disabled) set on a card in Session Security. A person enrols or removes only their own device (profile menu "Biometric signing" and an invitation after sign-in when policy asks). At sign-out the check is offered in demo builds only.
- Workflow: admin sets policy; each user enrols.
- Roles/permissions: policy needs `config:session-security:manage` (no separate biometric key); enrolment is self only.
- Settings: BiometricPolicyCard.tsx in Session Security.
- Status: Built (Demo) (Batch 611). Enrolment and sign-out biometric checks are labelled Simulated in the modal and the audit entry, and use the browser's own fingerprint or face prompt where available. Waiting on the server side: server-issued WebAuthn challenge and verification.
- Sources: services/biometric/mockBiometricService.ts line ~156; biometric/README.md; BiometricSigningModal.tsx

### Case privacy: one answer for a case you cannot open
- What it does: A missing case, another organisation's case, pool restriction, Orchestration or pediatric restriction, or an error all show the same "You do not have access rights to case ..." screen; a typed accession proves nothing; the real reason goes only to the support log and case audit. Message auto-links appear only for cases the reader can open; sign-out clears the inbox. Server must answer 404 identically.
- Workflow: all case routes (/report, /case/:ref/synoptic, /case/:ref/grossing).
- Roles/permissions: rule applies to everyone.
- Settings: none.
- Status: Built (Demo); test-enforced by casePrivacy.guard.test.ts; server 404 behaviour Planned.
- Sources: docs/architecture/CASE_PRIVACY_MODEL.md; services/cases/openCaseForView.ts; components/CaseUnavailable; services/privacy/README.md

### Support references (non-identifying IDs)
- What it does: Random `SR-XXXX-XXXX` references (40 random bits) stand in for case numbers, audit entries, errors and interface exceptions in support conversations. A chip on the case header and Audit Log rows creates (first click) or reveals and copies the reference; "Find a support reference" on Audit Log shows the entry and Open case; every lookup audited. Typing SR-... in the header search opens the case. Case pages are addressed by reference (`/case/SR-.../synoptic`), old accession URLs redirect; the same reference is used by all users and keys live-update topics. Support reports state "Generated:" in UTC.
- Workflow: user quotes a reference to support; support looks it up.
- Roles/permissions: anyone who can open the case.
- Settings: none.
- Status: Built (Demo) with a local reference service; server issue/resolve endpoint (`GET /api/cases/{caseId}/support-reference`) Planned.
- Sources: services/supportReferences/README.md; CASE_API.md section 8; hooks/useOpenCase.ts; services/caseAddresses/

### PHI redaction for support screenshots
- What it does: Anything showing patient identifiers (names, DOB, MRN, NHS/national ID, accession/case number, contact/insurance; JSX text, inputs, toasts, title/placeholder/alt) carries `data-phi`/`data-pii`; Enhancement-request and QA-feedback screenshots cover tagged elements with an overlay and the user approves/discards the redacted image. Toasts naming a case use a redacted message. Staff names are not PHI. A code audit over all of src fails the build on untagged patient data.
- Workflow: user sends feedback; screenshot is redacted automatically.
- Roles/permissions: none.
- Settings: none.
- Status: Built; guard-tested (phiTagging.guard.test.ts, phiRenderAudit.ts). Tagging limits listed in services/phi/README.md.
- Sources: services/phi/README.md; phiToast.ts; EnhancementRequest/README.md

### Support ticket and feedback privacy checks
- What it does: Tickets record only the route pattern and support reference, never the page address. Typed text is checked for case numbers, MRNs and other identifiers and the user can replace them with references, edit, or send anyway. Patient names and attachments are not detected. QA/enhancement button visibility and recipients (plus administrator cc) are set in System > Feedback (instance default, always shown, always hidden).
- Workflow: NavBar button > modal > send.
- Roles/permissions: `config:feedback:manage` for the setting.
- Settings: System > Feedback.
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Mail service for ticket delivery.
- Sources: services/supportReferences/supportTicketRules.ts; EnhancementRequest/README.md; FeedbackSection.tsx

### Client error reporting
- What it does: Browser crashes are scrubbed (quoted text, emails, long ids, digit runs, name-like words removed; routes keep :id segments, no query string), given a reference `ERR-XXXX-XXXX` and logged to the Audit Log > Error Log. Same error at most once a minute, 25 per page load. External error monitoring is configured by DSN and environment name in config.json (reporter itself not checked).
- Workflow: automatic; support reads Error Log (resolve needs `audit:error:resolve`).
- Roles/permissions: `audit:error:resolve`.
- Settings: `VITE_ERROR_MONITORING_DSN`, `VITE_ERROR_MONITORING_ENV`.
- Status: Built for scrub and log; Unverified for external monitoring sink.
- Sources: services/errorReporting/README.md; runtimeConfig/README.md Batch 590

### ForMedrixAI support access policy and approval
- What it does: Each organisation sets whether ForMedrixAI support (Superadmin) can reach its data: Disabled, Approval required (default) or Always allowed, with an access window (30, 60, 120 default, 240, 480 minutes). A request is tied to a ticket and a reason of 10+ characters; an approver in that organisation, not the requester, approves or rejects; approved access shows time left and can be revoked; past-time shows "Expired". Approvers are notified in the app; email and webhook are Planned. Support's case opens, lists, edits and searches are gated and recorded; lists omit organisations support cannot reach.
- Workflow: support requests > hospital Admin approves > support works > access expires or is revoked.
- Roles/permissions: `config:support-access:policy`, `config:support-access:approve` (Admin), `config:support-audit:view`, `platform:cross-tenant-cases:view`.
- Settings: Configuration > System > Support Access.
- Status: Built (Demo); server-side gate, approver email/webhook and server expiry job Planned.
- Sources: services/supportAccess/README.md, supportAccessRules.ts (windows), supportAccessGate.ts; SupportAccessSection.tsx

### Support audit stream (tamper evident)
- What it does: Per-organisation append-only stream, SHA-256 hash-chained, recording policy changes, requests, decisions, expiries, revocations, refused opens, case opens/edits, disclosed case ids, search criteria names (not values) and audit exports. "Verify chain" flags changes. Export CSV or JSON (formula characters neutralised). Survives Full Reset. IP and country columns exist but are empty in the browser. Conflict: docs/AUTHORIZATION_API.md says PDF export too; code offers only CSV and JSON (PDF Planned).
- Workflow: hospital Admin opens Support Access > audit.
- Roles/permissions: `config:support-audit:view`.
- Settings: none.
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: IP/country capture, ticketing close event, tenant-isolated storage.
- Sources: services/supportAccess/README.md; SupportAccessSection.tsx lines 97-201; supportAccessRules.ts (SUPPORT_AUDIT_COLUMNS)

### Cross-tenant QA and case access flags
- What it does: `canAccessCrossTenantQa` (staff flag) or Superadmin is required for QA/compliance reports spanning organisations; a cross-tenant read is audited. Single-facility QA scope: a person assigned to one facility opens on it; unplaceable rows show only enterprise-wide. Organisation-scope export check withdrawn until Organisation-to-Facility migration. Client-side only.
- Workflow: checked on QA tabs.
- Roles/permissions: staff flag `canAccessCrossTenantQa` (needs `config:staff-access:assign` to set).
- Settings: Staff > edit.
- Status: Built (Demo, client-side).
- Sources: auth/README.md; caseAccessControl.ts; hooks/useQaCaseScope.ts

### Browser data protection and secrets guards
- What it does: With the API server configured, patient data is never written to browser storage (memory only; old copies removed at start-up); only display preferences, workstation settings, language and a minimal sign-in record stay. HTML is sanitised on display (DOMPurify); keys and passwords must not enter the bundle (envExposure guard fails the build on secret-looking VITE_ names or direct-to-vendor AI calls; xlsx package removed). Security headers/CSP are generated per deployment; loopback print bridges (workstation agent wss 127.0.0.1:9100-9102, QZ Tray ports) are allowed by default and removable with `workstationBridges:false`. Server must also sanitise HTML on save (Planned).
- Workflow: deploy-time.
- Roles/permissions: IT.
- Settings: deploy/security-headers origins file; config.json.
- Status: Built (browser); server sanitisation Planned.
- Sources: src/services/security/README.md; browserData.guard.test.ts; deploy/security-headers/README.md

### Runtime configuration (config.json), hosting regions
- What it does: One build serves every site; settings (same names as VITE_*, 36-37 settings) are read from `/config.json` at start (served no-store). Unknown names, non-https server addresses, a server build without API URL or SSO, or a demo build with server addresses stop start-up with an error screen listing problems by setting name (never values). Order: config.json, then API server `/api/config` (AI model, deployment, token limit, region, voice, hosting regions; 5 s limit), then build values. Hosting regions card (database/blob region) shown to administrators beside AI region. Instance role `VITE_APP_ENV` is production or validation (fails closed to validation); registry payloads cannot cross lanes.
- Workflow: IT places config.json beside the build and reloads.
- Roles/permissions: deployment/IT; hosting regions card visible to administrators.
- Settings: deploy/runtime-config/config.example.json; `VITE_SERVER_JOBS`.
- Status: Built (browser); server `/api/config` Planned (client reads it, server not built).
- Sources: docs/architecture/RUNTIME_CONFIG.md; services/runtimeConfig/; components/Config/AI/HostingRegionsCard.tsx; services/deployment/

### Break-glass: Map Patient (downtime placeholder rebind)
- What it does: Rebinds a downtime placeholder patient (flagged `isDowntimeRecord`) to the confirmed patient: pick the downtime record, search the target, choose one of 7 reason codes (OUTAGE_EHR, OUTAGE_NETWORK, DOWNTIME_PROCEDURE, EMERGENCY_TRAUMA, UNIDENTIFIED_PATIENT, TYPO_DEMOGRAPHIC, MISLABELED_SPECIMEN; pre-filled from the original), justification of 10+ characters, then Review & Confirm. Repoints every case, writes immutable audit `mpi.breakglass.rebind` and queues ADT A47. Relabelled "Map Patient" in the UI; `breakGlassRebind()` unchanged.
- Workflow: Admin > Audit Log > Interfaces > Map Patient button; at accession a checkbox marks a downtime placeholder.
- Roles/permissions: role check, not a capability: AuditLogPage `isAdmin` = admin, pathologist-admin or superadmin (broader than the "Admin only" in READMEs); no `break-glass` capability key exists in the catalog.
- Settings: reason codes in code.
- Status: Built (Demo).
- Sources: types/patients/BreakGlassReasonCode.ts; services/patients/IPatientIndexService.ts line 489; components/Audit/BreakGlassRebindModal.tsx; pages/AuditLogPage.tsx lines 431, 1036

### Participation types (case team roles) and signing authority
- What it does: Dictionary of case-team roles with flags canFinalize, requiresCountersign, canViewWholeCase, allowsMultiple, requiresNote, abbreviation, colour. Code seeds 9 global types (Primary Pathologist, Resident/Fellow, Co-Signer/Supervisor, Grossing/PA, Cytotechnologist, Consultant, Frozen Section Pathologist, Second Opinion, Provisional Hire FPPE) plus 2 country-scoped (Biomedical Scientist UK+EU, Advanced Practitioner BMS UK only); Config README says "8 canonical types" (stale). Case Team modal offers only types valid for the case's jurisdiction with local titles. Resolution per case, field by field, most specific wins: facility override, country profile, platform default; seeded profiles for AU, NZ, BE/NL/DE/FR, GB nations, IE, CA, KR (US none). Shared by Surgical Pathology, Autopsy (coroner jurisdiction can override) and Cytology. `canViewWholeCase` is editable but no enforcing consumer confirmed.
- Workflow: Admin edits in System > Clinical Lookups > Participation Types; Case Team modal and sign-out gate consume it; attending can Return to Trainee with required feedback.
- Roles/permissions: `config:participation-types:manage` (Admin, Lab Director).
- Settings: Participation Types section; Role Dictionary > Case Participation tab uses the same service.
- Status: Built (Demo).
- Sources: services/participationTypes/README.md, mockParticipationTypeService.ts (lines 144-169), IParticipationTypeService.ts; ParticipationTypesSection.tsx, TypeModal.tsx; standingRules.guard.test.ts

### Facility-level signing authority override with provenance
- What it does: In the participation-type editor each performing lab shows the active rule for each flag and its source (jurisdiction default with regulatory basis, platform default, or "Overridden at facility level by X on date"). "Override default for this facility" seeds from the inherited value and needs a justification; "Revert to inherited default" has undo until save. Each change is stamped (who, when, why) and audited, one entry per change, written only after save succeeds. This is the only "authority override" and is not a break-glass for individual cases.
- Workflow: Admin opens type modal, toggles override per lab, saves.
- Roles/permissions: `config:participation-types:manage`.
- Settings: System > Participation Types.
- Status: Built (Demo).
- Sources: participationTypes/facilityAuthorityEditor.ts, saveParticipationType.ts, authorityProvenance.ts; TypeModal.tsx

### Country Signing Rules (platform editor)
- What it does: Pick a country; one card per participation type with local title, Can finalise / Requires countersign / Can view whole case (platform default, Yes, No), regulatory basis, who/when/why last changed, and whether a country-scoped role is offered there. Save needs a reason, writes one audit entry per changed type, is refused if nothing changed or a role would lose its last country; country picker locked while unsaved; sign-out sees saved rules immediately. Hospital admins see it read-only.
- Workflow: Superadmin (ForMedrixAI support) edits in System > Clinical Lookups > Country Signing Rules.
- Roles/permissions: `platform:signing-rules:manage`.
- Settings: as above.
- Status: Built (Demo).
- Sources: participationTypes/countryProfileEditor.ts, saveCountryProfiles.ts; CountrySigningRulesSection.tsx; Config/README "Country Signing Rules"

### Governing bodies
- What it does: Platform-level list of governing bodies (CAP, RCPath, ICCR, RCPA standard: toggle only; custom bodies full add/edit/remove with ID-conflict guard). Governing body maps ICD-10 variant (CAP to ICD-10-CM, RCPath/ICCR to WHO ICD-10, RCPA to ICD-10-AM) and retention minimums. Edits persist (earlier save was a TODO).
- Workflow: Superadmin edits in System > Clinical Lookups > Governing Bodies; hospital admins view.
- Roles/permissions: `platform:governing-bodies:manage`.
- Settings: this section.
- Status: Built (Demo).
- Sources: services/governingBodies/README.md, governingBodyAdministration.ts; GoverningBodiesSection.tsx

### Code Systems policy per jurisdiction
- What it does: Per jurisdiction, each code system (ICD-10, ICD-11, ICD-O, SNOMED CT and others) is off, optional or required from a start date; checks reject bad rows; reset to default (asks for nothing, ICD-11 off). Saved and audited (`CODE_SYSTEM_POLICY_CHANGED`). Nothing reads the policy: the Add Code window, sign-out and outbound messages ignore it (verified: only CodeSystemsSection and services index import it). A common `CodedEntry` shape exists in services/coding, not wired to screens.
- Workflow: Admin edits in System > Clinical Lookups > Code Systems.
- Roles/permissions: `config:code-systems:manage` (Admin, Lab Director).
- Settings: this section.
- Status: Built (Demo) (Batch 607). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: services/coding/README.md; docs/architecture/DIAGNOSIS_CODING.md; CodeSystemsSection.tsx; FEATURE_OVERVIEW "Code systems per jurisdiction - Partial"

### Terminology Services endpoints and health monitor
- What it does: Lists terminology endpoints (SNOMED CT, ICD-10-CM, ICD-11, LOINC, ICD-O, CPT) with a health check on open and "Test All"; free systems via NLM/UMLS through the server-side proxy; CPT and non-US ICD-10 need a licensed backend proxy. Endpoint details are shown to Superadmin sessions only.
- Workflow: Superadmin/support opens System > Integrations > Terminology Services.
- Roles/permissions: no capability; `useIsSuperAdmin()` hides details.
- Settings: `VITE_NLM_BASE_URL`, `VITE_CPT_PROXY_URL`, `VITE_ICD10_PROXY_URL`.
- Status: Built (Demo). Endpoint list, health check, Test All and superadmin-only details are built. Licensed CPT/ICD-10 proxies are backend; UMLS works through the dev proxy.
- Sources: Config/Terminology/README.md; TerminologyServicesSection.tsx

### Jurisdiction setup (no single screen)
- What it does: A facility's Jurisdiction is set on the General tab of Facility Configuration; country rules are scattered across Participation Types, Country Signing Rules, Code Systems, AI vendor policy, retention (governing body), correlation windows and registry settings. There is no region-wide setup screen.
- Workflow: admin follows docs/product/ADMIN_GUIDE_JURISDICTIONS.md.
- Roles/permissions: `config:facilities:manage` for the facility field.
- Settings: Facility editor > General.
- Status: Built (Batch 610). A read-only Jurisdiction Overview in System config lists, per jurisdiction, its facilities and key settings with links to change them.
- Sources: i18n README Batch 593; docs/product/ADMIN_GUIDE_JURISDICTIONS.md, KNOWN_GAPS.md

### Facility Configuration (the facility/client dictionary)
- What it does: One `Facility` record replaces the old Client entity, with six roles: performing_lab, internal_submitting_location, internal_ordering_client, external_ordering_client, specimen_acquisition, reference_lab (cmp3 inventory listed only five). Enterprise flag plus parent institution give Enterprise > site > ordering client hierarchy; searching a Trust includes all descendants. List has search, status filter, role filter, role badges. Deactivating a facility still referenced shows a confirm guard. Same store feeds Accession, TAT, Subspecialties, Routing Rules, Validation. Duplicate ("Name (Copy)") clears assigning authority, CLIA/ISO number, director, city/state/zip, legacy tenant ids, pediatric authorizations, interface endpoint, credentialConfigured and printing settings, keeps roles, jurisdiction, reporting, TAT, AI, LIS routing, identifier formats.
- Workflow: Configuration > System > Integrations > Facility Configuration (no own URL); Add/Edit/Duplicate/Deactivate/Verify.
- Roles/permissions: `config:facilities:manage` (add, update, deactivate, reactivate, verify).
- Settings: Field Requirements page "Facility editor".
- Status: Built (Demo).
- Sources: components/FacilityDictionary/README.md; services/facilities/README.md; FacilityEditorModal.tsx, FacilityTable.tsx

### Facility editor tabs
- What it does: General (identity, roles with tooltips, Enterprise, parent, CLIA/ISO number for performing labs, Place of Service code for specimen acquisition from 52 CMS codes, fax, address, https letterhead logo, "Charges need billing approval" On/Off/Same, report language, director, branding inherited facility > department > enterprise); LIS Integration (interface-engine connection editable on Enterprise only; per-facility LIS routing override; "Send one combined PDF per case"); Identifier Formats (per-format toggles, live test, simulate scan); Reporting and TAT & Escalation (always shown); AI & Performance (performing lab only: orchestrator override, AI model override, idle timeout override, release buffer override); Locations (edit mode; ward/room/bed resolved against HL7 PV1-3; unknown location auto-creates an Unverified entry); Spelling (lab dictionary, audited); Printing (see below); Secure messaging (enterprise gateways, BAA/DPA reference, expiry).
- Workflow: Facility editor modal; each of Printing and Secure messaging has its own Save and the main Save never alters them.
- Roles/permissions: `config:facilities:manage`; Printing `config:print-settings:manage`; Secure messaging `config:secure-messaging:manage`.
- Settings: as above.
- Status: Built (Demo); real LIS interface and gateway delivery need production; PDF branding layout steps wait for deployed render_report (Partial for branding output). Billing webhook still carries CLIA only, not Place of Service.
- Sources: FacilityDictionary/README.md Batches 391, 427, 433, 517, 528, 549, 553; services/facilities/README.md; services/locations/README.md; billing/README.md

### Facility printing settings and report print permission
- What it does: Performing lab: print released reports on/off, delivery mode (QZ Tray printer name, interface engine/print server, direct network printer), paper size, default network printer (can be a site-agent printer on this facility's site); ordering client: paper tray and one/two-sided. Rules flag QZ enabled without printer name, bad address or port outside 1-65535. Printing, reprinting and opening a stored version PDF check `report:case-report:print`; a case with an active flag marked "Restricts printing" (seeded "Confidential - Restricted Printing") also needs `report:restricted-case:print`. System > Print Settings adds an optional "require a reason when reprinting a previously printed report".
- Workflow: Facility editor > Printing; report page Print.
- Roles/permissions: `config:print-settings:manage`, `report:case-report:print`, `report:restricted-case:print` (seeded to Pathologist).
- Settings: Facility Printing tab; System > Print Settings; Flags > Restricts printing.
- Status: Built (Demo); PDF from render_report and server enforcement Planned.
- Sources: services/printing/README.md; facilityReportPrinting.ts, reportPrintGate.ts; FacilityPrintingTab.tsx

### Facility auto-create from inbound orders
- What it does: `findOrCreateByAssigningAuthority` matches an incoming order's facility code; no match creates an Unverified, autoCreated facility so processing continues; admin verifies later. Registry affiliation cascades enterprise default to facility override.
- Workflow: automatic at order intake; admin verifies in Facility Configuration.
- Roles/permissions: `config:facilities:manage` (verify).
- Settings: none.
- Status: Built (Demo).
- Sources: services/facilities/README.md; mockFacilityService.ts; mockFacilityRegistryOverrideService.ts

### Physician directory and master-file sync
- What it does: Referring/ordering physicians with structured names, unique `physicianCode` (auto `PHY-####` on import; `AUTO-` placeholder when intake auto-creates), optional NPI unique when present, affiliation to many facilities (`clientIds`), preferred contact, SMS carrier, title from common honorifics, names shown in screen language. CSV import matches code then NPI. Interface-engine JSON roster sync matches `sourceSystem`+`sourceRecordId`, then NPI; a no-NPI first encounter always creates a new physician (never name-only merge) and bypasses config permission. No Duplicate button (Duplicate service copies specialty/clients but clears identity fields where offered).
- Workflow: Admin in System > Integrations > Physicians; verify auto-created rows.
- Roles/permissions: `config:physicians:manage`.
- Settings: this section.
- Status: Built (Demo); master-file sync needs the interface engine. Message-the-physician from patient history matches by name only (Partial).
- Sources: services/physicians/README.md; PhysiciansSection.tsx; applyPhysicianMasterFileUpdate.ts

### Client SLA targets
- What it does: Stores per-client (assigning authority) first-touch and total TAT target hours with STAT variants. No screen and no consumer; not exported from services/index.ts.
- Workflow: none.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo) (Batch 610). A Client Service Levels screen sets per-client first-touch and total TAT with STAT variants; a breach shows as an SLA badge on the worklist and in the Quality tab. Waiting on the server side: API server store.
- Sources: services/clientSLA/README.md; IClientSLAService.ts

### Equipment register
- What it does: One register of devices (analyser, stainer, tissue processor, slide scanner, camera, scale, label printer, engraver, storage unit, other): unique code (fixed after creation), name, make, model, serial, performing lab, scan station, status; filters by text, kind, status, facility; never deleted, only deactivated; no Duplicate. Settings column shows linked printer and grossing profiles. Analysers get a deck layout editor (slot id, deck/bay, accepted rack types). Plate builder and batch creation accept only active analysers; slide scanners come from the register for WSI batches; Printer Profiles and Grossing Hardware link to a device of the right kind. Engravers and cold-chain storage are not linked yet.
- Workflow: System > Workstation & Hardware > Equipment.
- Roles/permissions: `config:equipment:manage`.
- Settings: facility picker shared across the group.
- Status: Built (Demo); Partial for workflow linkage.
- Sources: services/equipment/README.md; EquipmentSection.tsx, DeckLayoutEditor.tsx; Config/System/README Batches 356-361, 406

### Equipment maintenance and calibration log
- What it does: Optional maintenance and calibration intervals (1-3650 days) per device; append-only log (maintenance, calibration, function check, repair, malfunction; pass/fail/NA; date, who, notes); no future dates; failure or malfunction needs notes; a failed calibration does not reset the clock. Service state: malfunction, overdue, not yet done, due soon, up to date, not scheduled; open malfunction or overdue shows red and does not block use. Same log at /batch-management/equipment-log.
- Workflow: Equipment > Service column > Log (EquipmentLogModal); bench roles add entries.
- Roles/permissions: `equipment:maintenance:record` (bench roles, Admin, Lab Director).
- Settings: intervals on the device.
- Status: Built (Demo); reminders and cross-device report Planned.
- Sources: services/equipment/README.md; EquipmentLogModal.tsx; pages/BatchManagement/EquipmentServiceLogPage.tsx

### Scan stations, workstation groups and action groups
- What it does: Scan Stations: add/rename stations (facility list of performing labs, required; suggested workflow stages; barcode payload `STATION:...`). Workstation Groups define QC mode and functional area at each bench with an optional `dedicatedPageRoute` (microtome, embedding, slide-distribution) that gives the NavBar a "Go to Bench" button when the group is Active. Action Groups define which actions each workstation allows (pushed into the Action Registry when a station is chosen). A station's facility scopes a batch when no item resolves one. Workstation Groups and Action Groups can be duplicated.
- Workflow: Admin in System; user picks the station at login (ScanStationPrompt) or in the NavBar.
- Roles/permissions: `config:scan-stations:manage`, `config:workstation-groups:manage`, `config:action-groups:manage`.
- Settings: facility picker for Scan Stations; per-computer binding stored in workstationSettings.
- Status: Built (Demo).
- Sources: Config/System/README B444, B513; services/workstationGroups/README.md, actionGroups/README.md; components/NavBar/NavBarScanStation.tsx

### Printer profiles, print settings, label designer, print routing, site agents
- What it does: Printer Profiles: printer registry per facility or global, link to a register device, Bridge Type incl. PathScribe Agent with optional Agent Port 1024-65535. Print Settings: lab-wide defaults with facility override (inherited read-only; "+ Create Facility Override" / "Revert to System Default"). Label Designer: drag-and-drop layout for nine label types, enterprise/facility hierarchy with per-group lockdown, ZPL export. Print Routing Rules: destination by workstation/location/clientAccount/facility, specimen/case type, event trigger, live test. Site agents: enrolment code, revoke with reason, status, agent printers and Windows shares with checks. Slide label layout config defaults exist with no editor and are not wired to the ZPL template.
- Workflow: Admin in System > Workstation & Hardware (and Administration & Compliance for routing).
- Roles/permissions: `config:printers:manage`, `config:print-settings:manage`, `config:label-layouts:manage`, `config:print-routing:manage`, `config:site-agents:enroll`, `config:site-agent-config:manage`.
- Settings: as above.
- Status: Built (Demo) (Batch 606). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: PathScribe Agent, site agent service, POST /api/print/jobs.
- Sources: Config/System/README; services/printSettings/README.md; utils/labels/pathscribeAgent/README.md; services/siteAgent/README.md

### Display profiles (Facility Ops wall displays)
- What it does: Admin registers wall displays as Display Profiles: facility, assigned views (Grossing & Intake, Embedding & Microtome, Staining & IHC, Send-Out & Reference, Diagnostic Sign-Out/Scanner), carousel interval (default 20 s), optional device token, status. A kiosk opens the public `/facility-ops-dashboard`, binds by choosing a profile (if a token is recorded it must be typed; bookkeeping check, not hardware verification) and the binding is remembered on that browser. Route has no login or session timeout by design. "Open Facility Ops Dashboard" button on the section.
- Workflow: Admin creates profiles; bench display binds once.
- Roles/permissions: `config:display-profiles:manage` (Admin, Lab Director); dashboard route needs a Display Token (Batch 603), has no signed-in user and shows no patient identifiers.
- Settings: System > Lab Materials & Workflows > Display Profiles.
- Status: Built (Demo, computed from mock data); no push; no Routine/Special/IHC/Molecular breakdown.
- Sources: services/facilityOpsDashboard/README.md; DisplayProfilesSection.tsx; pages/FacilityOpsDashboard/README.md; SignedInApp.tsx line 179

### OR Suite terminals
- What it does: A physical OR display is a Station Identity bound to one location (facility first, then location); binding is remembered in the browser so a reload reconnects without sign-in. Feeds the public `/or-suite-dashboard` kiosk (visual only, no audio).
- Workflow: Admin creates terminal; device binds.
- Roles/permissions: `config:or-suite-terminals:manage`.
- Settings: System > Lab Materials & Workflows > OR Suite Terminals.
- Status: Built (Demo); live updates via SignalR hub Planned (15 s polling meanwhile).
- Sources: services/intraopDashboard/README.md; OrSuiteTerminalsSection.tsx; SignedInApp.tsx line 169

### Asset Location Dictionary and mortuary storage
- What it does: Governed hierarchical locations (building, room, storage unit, storage slot, workstation, archive shelf, other) with Active/Inactive/Unverified status and auto-created flags; an unknown location from the LIS creates an Unverified entry (exact case-insensitive match only). Two mortuary storage slots are seeded. A "Mortuary Storage Occupancy" tab shows real-time occupancy across autopsy specimens. `MaterialLocation.location` stays free text.
- Workflow: Admin defines/verifies locations in System > Lab Materials & Workflows.
- Roles/permissions: `config:asset-locations:manage`.
- Settings: this section.
- Status: Built (Demo). NO-README coverage in Config/System/README.
- Sources: services/assetLocation/README.md; types/assetLocation/README.md; AssetLocationDictionarySection.tsx

### Reagent and solution lots
- What it does: Admin CRUD (create, update, deactivate, reactivate) for stain reagent lots; a lot references exactly one StainType or a closed routine-stain component type. Molecular plate builder separately blocks a batch if any reagent lot is expired, failed or lacks QC sign-off, and requires every control/calibrator well to carry a lot number and unexpired date (reagent types: extraction buffer, master mix, primer/probe, detection reagent, positive/negative control).
- Workflow: System > Lab Materials & Workflows > Reagent & Solution Lots; gating shown live in the plate builder.
- Roles/permissions: `config:reagent-lots:manage`.
- Settings: this section.
- Status: Built (Demo). NO-README coverage in Config/System/README. Control-well Trace is empty (open item).
- Sources: services/reagentLots/README.md; ReagentLotsSection.tsx; molecular/README.md (resolveMolecularReagentLotGating.ts)

### Legacy migration tools (field mappings and Migration Jobs)
- What it does: Migration Field Mappings: admin CRUD mapping one legacy source field to one `MigrationCaseDraft` target field, scoped per source system. Migration Jobs page (`/migration-jobs`, gated by Configuration access) lists jobs with succeeded/failed/needs-review counts and per-record results, and cross-validates processed count against the source's claimed count. The pipeline (`processLegacyRecordImport`: map, validate minimum fields, resolve patient via the MPI) exists with tests but nothing in the UI or services calls it; no screen creates jobs; it builds drafts, not full Case records; no bulk import; OCR left to the interface engine.
- Workflow: admin edits mappings; jobs would be created by the (unbuilt) backend import.
- Roles/permissions: `config:migration-mappings:manage`; Migration Jobs under `screen:configuration:open`.
- Settings: System > Lab Materials & Workflows > Migration Field Mappings.
- Status: Built (Demo) (Batch 611). Same Import legacy file action as entry 132, with per-record results and audit. Waiting on the server side: server-side bulk import of legacy records.
- Sources: services/migration/README.md; MigrationFieldMappingsSection.tsx; pages/MigrationJobsPage.tsx; SignedInApp.tsx line 224

### Vendor Integrations dictionaries
- What it does: One section with four categories on its own sub-sidebar: Digital Pathology / AI vendors (Paige, Ibex, PathAI, Proscia, BD FocalPoint with FDA clearance data), WSI Viewers (Leica, Roche, Hamamatsu, Paige, PathAI, Proscia, Philips and a [DEMO ONLY] entry, each with a URL template; stain barcode substituted; launch button on a stain chip once Coverslipped or Ready for Review; all real templates ship empty; no DICOMweb, no vendor credentials), Image Management Systems (enterprise IMS vs on-prem file server), Gross/Macro Imaging and Telepathology (PAX-it!, PathoZoom, MacroPATH; https-only address). Images are stored as links only with fallback URLs (401/403 is auth_required, not fallback); fetch/purge logic Planned.
- Workflow: Admin edits per category; user launches viewer from stain chip.
- Roles/permissions: `config:vendor-integrations:manage` (add, update, deactivate, reactivate, remove).
- Settings: System > Lab Materials & Workflows > Vendor Integrations.
- Status: Built (Demo) - needs customer URL templates.
- Sources: services/digitalPathology/README.md; imageAssociation/README.md; VendorIntegrationsSection.tsx

### Vendor HL7 adapters, vendor-neutral events and engine webhooks
- What it does: PathScribe publishes one vendor-neutral message per event (labels/orders, cassette dispatch, material scan/location, block exception, patient events); the interface engine maps to Roche Vantage or Leica Cerebro. Only `identityAdapter` (pass-through) works; `vantageAdapter` and `cerebroAdapter` deliberately throw. Four inbound serverless webhooks (cassette dispatch outcome, block exception, material location, engraver status) use shared secret/HMAC, are idempotent by messageId and raise CAPAs, but are Firestore-based and never run against a real deployment (placeholder Firebase config).
- Workflow: none for users; engine posts.
- Roles/permissions: server-to-server secrets.
- Settings: `patientDataScope`; env `ENGINE_WEBHOOK_SECRET`, `ENGINE_WEBHOOK_HMAC_SECRET`.
- Status: Built (Demo). Vendor-neutral events and the identity adapter work and dispatch; Vantage and Cerebro adapters deliberately throw pending vendor specs. Webhooks are server (entry 111).
- Sources: docs/architecture/VENDOR_NEUTRAL_EVENTS.md; services/hl7/adapters/README.md; api/webhooks/engine/README.md

### AI proxy and AI vendor policy
- What it does: The browser never holds AI, Gemini, UMLS or vendor keys; the server proxy adds keys, audits each call (who, case, provider, model, tokens, not the prompt), rate-limits and checks BAA/DPA. AI vendor policy sets, per jurisdiction and optionally narrowed per facility, which AI services (structured_messages = Anthropic, chat_completions = OpenAI, chat_completions_managed = Azure OpenAI, model_gateway = Bedrock, structured_content = Gemini, custom) and hosting regions are allowed; no rule = all allowed; a refused call is never rerouted, throws `AI_VENDOR_NOT_ALLOWED`, audited `AI_CALL_REFUSED`; conflict warning before saving a service. A `mock` provider still sends to Anthropic through the proxy. AI Instructions are versioned, edit-then-approve by a different person.
- Workflow: admin sets provider/region and vendor policy in Configuration > AI; every call checks the policy.
- Roles/permissions: `config:ai-provider:manage`, `config:ai-model:manage`, `config:ai-behavior:manage`, `config:ai-vendor-policy:manage`, `config:ai-prompt:view/edit/approve`.
- Settings: Configuration > AI (Provider, Behavior, Models, Vendor policy, Hosting regions) and System > AI Instructions.
- Status: Built (Demo). Browser policy check is built and the dev proxy in vite.config serves AI calls; the production proxy routes and server-side policy repeat are server work.
- Sources: docs/architecture/AI_PROXY.md; services/aiIntegration/README.md; Config/AI/README.md; envExposure.guard.test.ts

### Data retention policy and retention windows
- What it does: Data Retention section records how long AI suggestions, audit log, case snapshots and report archives are kept; nothing purges by it yet. Separately, material retention windows (block, slide, wet tissue, decant slide) per jurisdiction (RCPath, CAP/CLIA) take the most conservative date, with a Department retention override (audited if below the governing-body minimum). Case holds (gate finalize) and retention holds (gate disposal) are placed/released on the case; there is no retention-holds queue page.
- Workflow: Admin in System > Administration & Compliance > Data Retention; Departments for overrides.
- Roles/permissions: `config:retention-policy:manage`; `case:retention-hold:place/release`.
- Settings: as above.
- Status: Built (Demo). Retention settings, material retention windows, holds and the disposal queue are built; the purge that acts on the AI/audit/snapshot settings is a server job (PS-345).
- Sources: services/retention/README.md; services/retentionPolicy/README.md; RetentionSection.tsx

### Configuration Administration & Compliance sections (settings summaries)
- What it does: Brief verified summary of sections not described elsewhere in this theme: Approved Fonts (toggle list, at least one enabled) and Document Style (default font Arial, page size, margins); Contribution Dashboard (show peer averages to plain pathologists); External Resources (reference links, enterprise or lab-scoped, URL validation); Research Feed (PubMed on Home); Post-Sign-Out Release Buffer (org default; per-lab override on Facility); Concordance Review (automatic frozen-vs-final discordance flagging and optional mandatory review at sign-out, org default plus Facility override); Delivery Rules (channels primary/secondary/fallback/off, retry waits 1/5/15 min, test panel; fax/file-drop transport not verified); Follow-up tracking; Biopsy-to-resection window; Tumor Board rules and batching cut-off; Revision Reasons; Peer Review Before Sign-Out; Clinical Mismatch Rules; Discordance Trend Policy (org + per-lab, recommends only); QA Configuration Center; Template Review (self-approval, required reviewers, 80% SNOMED coverage); Case Mask (accession number tokens); Crosswalk; Case/Routing rules; Deficiencies; Outbound message preview (admin only, shows patient data).
- Workflow: Admin edits each section.
- Roles/permissions: the section's `config:*:manage` key (see inventory).
- Settings: each section.
- Status: Built (Demo) - per-section detail belongs to the clinical, QA and billing themes.
- Sources: Config/System/README.md; related services READMEs

### In-app Admin Guide and User Guide
- What it does: The About menu's User Guide and Admin Guide items and the embedded PDFs were removed in Batch 669c; the guides open from the top-bar Help buttons. docs/product holds ADMIN_GUIDE_JURISDICTIONS, KNOWN_GAPS, ACTIONS_COVERAGE and related admin documents.
- Workflow: any user opens About menu.
- Roles/permissions: all.
- Settings: none.
- Status: Built.
- Sources: AppShell/README.md Batch 505; hooks/useGuideAssets.ts; docs/public/README.md

### Personal settings versus workstation settings
- What it does: Per-person settings follow the signed-in user (voice accent, learned corrections, personal dictionary and voice commands, language, worklist sort, Billing Log saved searches, personal AI override); per-computer settings stay on the workstation (scan station, OR terminal, display profile, foot pedal bindings, companion-window positions). Neither throws on blocked storage.
- Workflow: automatic.
- Roles/permissions: own only.
- Settings: Profile menu; Voice tab.
- Status: Built (Demo); server storage Planned (PS-345).
- Sources: services/userSettings/README.md; utils/uiPreferences.ts, workstationSettings.ts; Profile/README.md

#### Not yet in FEATURE_OVERVIEW.md
- Configuration page tabs, deep links, landing tab, and the System tab's 81-section inventory (no section list at all)
- Configuration search bar
- Per-section write permissions and view-only mode (`config:*:manage`, ConfigSectionGate, refusal banner)
- Unsaved-change guard in Configuration
- Duplicate policy; uniqueness and performing-lab scoping of dictionary items
- Demo Reset tab
- Staff directory, facility scope on staff, jurisdictional credentials/appointments, Credentialing sub-tab, staff sign-in password, linked SSO accounts and unlink, signature link, spelling language, access-request tickets, OR quick PIN
- Role Dictionary tabs and dependency prompts; built-in role list; default grants and seeds; Superadmin limits and platform-only capabilities; separation of duties; Cytotechnologist restrictions; screen-access capabilities; capability-gated buttons
- Sign-in lockout, password screening, must-change password, same-user second-login detection, idle timeout and draft recovery, signer confirmation, biometric e-signature policy
- Case privacy model, support references, PHI redaction, ticket privacy checks, client error reporting
- ForMedrixAI support access policy, approval window and tamper-evident support audit
- Break-glass Map Patient (only mentioned as "Break-Glass rebind" in the MPI line), reason codes, admin-only access
- Participation types, facility authority override, Country Signing Rules, Return to Trainee
- Code that governs terminology: Terminology Services monitor, jurisdiction setup guidance
- Facility editor tabs (LIS, identifier formats, locations, spelling, printing, secure messaging), facility duplicate, auto-created facilities, physician directory and master-file sync
- Equipment register and service log, scan stations, workstation/action groups, printer profiles, label designer, display profiles, OR suite terminals, asset location dictionary, reagent lots, migration field mappings and jobs, vendor integrations dictionaries
- Runtime config.json details, security headers/CSP and secrets guard (FEATURE_OVERVIEW mentions "One build for every site" and hosting only briefly)
- Data retention setting; In-app Admin/User Guide; personal vs workstation settings

#### Status in FEATURE_OVERVIEW.md that the code contradicts
- Capabilities, roles and Field Requirements - Live: overview says 244 capabilities (AUTHORIZATION_API says 245); code catalog has 272 keys (100 `config:*:manage`). The "84 sections" figure in Config README is also stale.
- System tab sections: Config/System README and Config README say 77 sections; code has 81.
- Governing Bodies, Specimen Dictionary, Client/Facility Dictionary - Live (one line): accurate for all three, but Governing Bodies edits are Superadmin-only (platform:governing-bodies:manage); overview does not say so.
- Code systems per jurisdiction - Partial: matches code (setting saved, nothing reads it); no contradiction.
- SSO: overview "Planned" section says Microsoft Entra/OIDC is built; true for the client only. Real identity-provider verification (PS-732), server-held tokens/session cookie and `/api/me` are not built, so "built" is Partial (Demo).
- Platform-level (ForMedrixAI-only) admin restrictions: overview says built in the browser; true. Overview omits that SSO can never produce a Superadmin, so there is currently no production way to sign in as support (ForMedrix identity tenant Planned).
- Break-Glass rebind workflow - listed under MPI as Live: true, but it is role-checked (`admin`, `pathologist-admin`, `superadmin`), not a capability, and cannot be assigned in the Role Dictionary.
- Biometric signing (README "Live Demo"; absent from overview): code is a simulated prompt that always succeeds; must not be presented as MFA.
- Support audit export: AUTHORIZATION_API.md claims CSV, JSON and PDF; code has CSV and JSON only.
- Participation types: Config README says "8 canonical types"; code seeds 9 global + 2 country-scoped.
- Migration: services/migration README calls the import pipeline "real, working"; no UI or service calls it (jobs cannot be created from the app).
- Equipment: overview describes deck layout under "Configuration → Equipment" (corrected note says System > Workstation & Hardware > Equipment); matches code.

---

# Theme 7: AI, voice, language, billing and user experience


Paths are relative to /home/claude/work. "Demo" means the feature runs on browser/mock storage or the Vite dev proxy and a production server is still required. Section groups (in order): AI, voice and hotkeys, language and locale, terminology and coding, billing and workload, messaging and notifications, navigation and app shell, personal settings, help and support, accessibility.

### AI provider layer and AI settings
- What it does: One provider interface for all AI calls. Providers are named by protocol: structured_messages (Anthropic), chat_completions (OpenAI), chat_completions_managed (Azure OpenAI), model_gateway (Bedrock), structured_content (Gemini), custom (OpenAI-compatible), mock. Resolution order: personal override, then organisation setting, then environment default. Hosting-region field (not for Bedrock or mock). Warns before saving a service that a served jurisdiction does not allow. Connection test.
- Workflow: Admin opens Configuration > AI Behavior > AI Provider Settings, picks provider, model and region, saves.
- Roles/permissions: config:ai-provider:manage (Admin, Lab Director). The personal override is stored per person but no screen sets it.
- Settings: provider, model, endpoint/deployment, hosting region.
- Status: Built (Demo) — adapters and screen work through the Vite dev proxy. The Bedrock route is not in vite.config.ts, so Bedrock is Planned. ClaudeProvider.ts no longer exists (replaced by StructuredMessagesProvider).
- Sources: src/components/Config/AI/README.md, AiProviderSettings.tsx, aiProviderConfig.ts; src/services/ai/providers/README.md; vite.config.ts

### AI proxy (server holds every key)
- What it does: The browser never holds an AI, Gemini, UMLS or vendor key. Every call goes to /api/ai/... routes where the server adds the key, rate-limits, checks BAA/DPA and audits who, case, provider, model, tokens (not the prompt). System Info checks whether the Anthropic and Gemini proxy endpoints answer.
- Workflow: Transparent to users; admins see proxy status in About > System Information.
- Roles/permissions: n/a
- Settings: AI Provider screen; server environment.
- Status: Built (Demo). Dev proxy routes work and NavBar/System Info call checkAiProxyStatus; key-exposure guard test exists. The production API-server proxy is backend.
- Sources: docs/architecture/AI_PROXY.md; vite.config.ts; src/services/aiIntegration/aiProxyStatus.ts; src/services/security/envExposure.guard.test.ts

### AI vendor policy by jurisdiction and facility
- What it does: Rules list which AI services and hosting regions each jurisdiction (optionally narrowed per facility) may use. No rule means all allowed. Checked before every AI call (mismatch check, critical findings, suggestions, coding, dictation, narrative, template suggestion). A refused call goes nowhere, never to another vendor, throws AI_VENDOR_NOT_ALLOWED and is audited AI_CALL_REFUSED. The mismatch check says "AI is not available for this jurisdiction"; other features continue without AI but do not yet say why. A mock provider still sends to Anthropic through the proxy (disclosed).
- Workflow: Admin: AI Behavior > AI vendor policy: edit jurisdiction rule, add or remove facility rule.
- Roles/permissions: config:ai-vendor-policy:manage (audited AI_VENDOR_POLICY_CHANGED).
- Settings: per jurisdiction and facility: allowed services, regions.
- Status: Built (Demo). Policy rules screen, pre-call check, refusal and AI_CALL_REFUSED audit are built in the browser; the same 403 check in the server proxy is backend.
- Sources: src/services/aiIntegration/aiCallPolicy.ts, aiVendorPolicyService.ts; src/components/Config/AI/AiVendorPolicySection.tsx; docs/architecture/AI_PROXY.md

### AI call audit log
- What it does: Every generation call is logged with service, model, hosting region, jurisdiction, facility, feature and status, including refused calls.
- Workflow: Automatic.
- Roles/permissions: n/a
- Settings: none
- Status: Built (Demo)
- Sources: src/services/ai/AIAuditLog.ts; src/services/ai/README.md

### AI behavior toggles
- What it does: Seven lab-wide settings: confidence threshold (default 75), auto-insert suggestions (off), show confidence scores (on), subspecialty routing (on), Gross-driven AI (on), Microscopic-driven AI (on), macro suggestions (off). Update and Reset are permission-checked.
- Workflow: Admin: Configuration > AI Behavior; read by the synoptic panel.
- Roles/permissions: config:ai-behavior:manage (view-only without it).
- Settings: as listed.
- Status: Built (Demo)
- Sources: src/services/aiBehavior/IAIBehaviorService.ts; src/components/Config/AI/index.tsx; RightSynopticPanel.tsx

### Orchestrator narrative auto-draft switch (org default and per-facility override)
- What it does: ON/OFF for AI narrative auto-draft. Org-wide default with a per-performing-lab override on the Facility editor; null means inherit.
- Workflow: Admin: AI Behavior > Orchestration panel switch; Facility editor > AI & Performance tab for one lab.
- Roles/permissions: config:ai-behavior:manage; config:facilities:manage for the facility field.
- Settings: org default; Facility.internalAiOrchestratorEnabled.
- Status: Built (Demo)
- Sources: src/components/Config/AI/orchestratorModeConfig.ts (+test), OrchestratorConfigSection.tsx; FacilityEditorModal.tsx

### Facility editor: AI and Performance tab
- What it does: Performing labs only: orchestrator override, AI model override (blocked without a passing validation study), idle-timeout override.
- Workflow: Facility editor.
- Roles/permissions: config:facilities:manage.
- Settings: internalAiOrchestratorEnabled, internalAiModelId, idleTimeoutMinutesOverride.
- Status: Built (Demo)
- Sources: src/components/FacilityDictionary/README.md; resolveClientAiModel.ts

### Narrative generation engine (Orchestrator) and section configuration
- What it does: Builds case context (missing values read "(not recorded)"; hidden questions omitted; results grids one line per part; Mohs stages one line per stage in the report language), then generates, regenerates (single section), cancels and assembles four AI sections: admin header, gross description, synoptic summary, ancillary and diagnosis. Skips sections the user is editing, supports headless mode, degrades to the gold-standard template with a warning, writes the AI audit log. Each section call is checked against the vendor policy.
- Workflow: Report page narrative generation (Orchestration mode).
- Roles/permissions: none stated.
- Settings: AI Behavior, AI instructions; narrativeTemplateConfig (data only, no screen of its own).
- Status: Built (Demo) — needs a configured AI service and the proxy. Root /orchestrator folder is a stale copy; live code is src/orchestrator.
- Sources: src/orchestrator/README.md, contextBuilder.ts, orchestratorEngine.ts; src/components/Config/NarrativeTemplates/narrativeTemplateConfig.ts

### AI narrative in the report editor (streaming, accept, regenerate, review)
- What it does: AI text streams into named sections without overwriting user-edited text; AI-written ranges are marked and survive undo. First generation starts once after 2 seconds; accept, keep version, accept all, Regen All one at a time, cancel mid-stream, save draft (section merge, review before overwriting another's save). Suggest Synoptic from Narrative; Generate Narrative with review and insert (Orchestration only); "keep or update?" for fields AI re-evaluated. The draft is stored on the case only. AI review and AI narrative review modals exist.
- Workflow: Pathologist uses Orchestration tab buttons or voice/keyboard save and generate.
- Roles/permissions: none stated.
- Settings: AI vendor policy; AI behavior.
- Status: Built (Demo) — depends on the AI service. The AiReportToolButtons and AiNarrativeReviewModal files exist; their finer behavior was not read.
- Sources: src/pages/SynopticReportPage/hooks/useReportGeneration.ts, useOrchestratorDraft.ts, components/AiReportToolButtons.tsx, AiNarrativeReviewModal.tsx; src/components/Editor/tiptapBridge/README.md

### AI draft-ready / review-pending badge
- What it does: Report-header badge counts only required (Must Have) fields with current answers; optional fields below threshold no longer trigger it.
- Workflow: Report header.
- Roles/permissions: n/a
- Settings: none
- Status: Built
- Sources: src/components/Templates/README.md Batch 437; aiSynthesisStatus.ts

### Assist-mode AI drafting from LIS milestones
- What it does: Updates from an external LIS go to a staging queue. At Gross Complete AI picks synoptic templates and fills what gross supports (never sees microscopic); at Microscopic/Diagnosis Complete it rechecks and completes the draft. All output is draft with Confirm/Override; signed-out cases are never touched. Person-typed fields are never overwritten; a differing suggestion asks "keep or update?". Records which milestone drove the draft, with reason and confidence. Failed events retry (up to 5) in the staging queue.
- Workflow: Admin: System > Integrations > Assist LIS Ingestion (interval 1 to 1440 min, status crosswalk, Poll now, Test an inbound message, Retry failed, run log). Pathologist opens a case with a draft waiting.
- Roles/permissions: config:assist-polling:manage; assist:lis-message:ingest.
- Settings: poll interval, status crosswalk, AI Behavior toggles.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Real LIS poll source or inbound endpoint.
- Sources: src/services/assistPolling/README.md, assistMilestoneRules.ts; src/components/Config/System/AssistLisPollingSection.tsx; src/services/lisIngestion/README.md

### Grossing template AI refinement and re-evaluation
- What it does: Each specimen gets the fallback grossing template at once; AI refinement runs afterward and swaps the template only for an untouched draft. At Complete Grossing the AI re-evaluates fit from the dictated gross text. Outcome stored per specimen (ai, fallback, override, failed).
- Workflow: Automatic at accession submit (toast only if a template changed) and at Complete Grossing.
- Roles/permissions: none.
- Settings: client override and confidence threshold in grossing routing config.
- Status: Built (Demo) — evaluateGrossingTemplateFit is called from useGrossingCompletion. No dashboard reads the outcome data yet.
- Sources: src/utils/applyGrossingRefinement.ts; src/services/cases/mockCaseService.ts; src/pages/SynopticReportPage/hooks/useGrossingCompletion.ts

### AI template suggestion, macro suggestion and synoptic field suggestion
- What it does: AI suggests which synoptic template fits a specimen, suggests macros and synoptic fields from text, and captures suggestion-accuracy signals. Calls carry feature and facility for the vendor policy. Synoptic assignment evaluation is a plain function, not through PathScribeAIService.
- Workflow: During template selection and from report AI tool buttons.
- Roles/permissions: none stated.
- Settings: AI vendor policy; macro suggestions toggle.
- Status: Built (Demo) — the signal service is a mock.
- Sources: src/services/aiIntegration/PathScribeAIService.ts; src/services/templateSuggestions/README.md

### Critical-finding detection in narrative at sign-out
- What it does: AI reads gross, microscopic and ancillary narrative only (no name, MRN, DOB) and flags critical or abnormal terms with severity and 0 to 100 confidence. Negation is handled by prompt and a code check (scope stops at but/however/and/comma; "cannot be ruled out" is not negation). Only Critical or Malignant raises the modal. Flagged findings are highlighted inline and kept per case; saved text is never changed.
- Workflow: Runs at e-signature attempt; pathologist records notification or acknowledges.
- Roles/permissions: sign-out users; vendor policy may refuse.
- Settings: enterprise/facility switch.
- Status: Built (Demo) — needs a configured AI provider.
- Sources: src/services/clinical/detectCriticalFindings.ts, negatedFindingCheck.ts, findingHighlight.ts; clinical/README.md

### AI agreement signals ("Level 1 learning")
- What it does: Records whether the pathologist confirmed or dismissed each flagged finding and captures AI-suggestion versus pathologist-edit differences, tagged with the covering active validation study. Narrative quotes and edits are de-identified at capture (measurements, dates, MRN, biomarker values, TNM, Gleason, accession numbers removed).
- Workflow: Automatic at sign-out when a study is active.
- Roles/permissions: none stated.
- Settings: validation study scope (facility, pathologist, subspecialty).
- Status: Built (Demo)
- Sources: src/services/abnormalDetection/README.md; src/services/narrativeSignals/deidentification.ts; src/services/validationStudies/resolveActiveStudyId.ts

### Governed AI instructions (mismatch check)
- What it does: AI instructions per discipline are versioned; version 0 is PathScribe's text. An edit is a pending version; only the latest approved version is used; the editor cannot approve their own edit (SELF_APPROVAL); a rejection needs a reason; a Test panel runs a draft on invented samples; audit AI_PROMPT_EDITED/APPROVED/REJECTED. Case data block and JSON answer format stay in code.
- Workflow: Admin edits in Configuration > System > AI Instructions; a different person (Lab Director, never Superadmin) approves or rejects.
- Roles/permissions: config:ai-prompt:view (QA Reviewer, Lab Director), :edit (nobody by default), :approve (Lab Director).
- Settings: instruction versions.
- Status: Built (Demo) — endpoints Planned.
- Sources: src/services/clinical/aiInstructionService.ts; src/components/Config/System/AiInstructionsSection.tsx; docs/architecture/AUTHORIZATION_API.md

### ForMedrixAI model catalog, store and organisation adoption
- What it does: ForMedrixAI publishes a global catalog (read-only to tenants). Each organisation adopts models (new adoption always Beta, non-default, zero cases), sets Beta/Active/Retired, separate defaults for report generation and for voice, own accuracy and notes. Never deleted (retire; blocked on the default; message names pinned facilities). Reads scoped to the organisation and fail closed. The store's "Download" is labelled Adopt and only creates the adoption record; the licence check always returns STORE_NOT_LICENSED in mock.
- Workflow: Admin: AI Behavior > Models tab (Set Default, Retire, Facilities Approved, Adopt from store); the study form links "Don't see the model you need?".
- Roles/permissions: config:ai-model:manage; any member can create an adoption under current rules.
- Settings: status, default, notes, facilities approved.
- Status: Built (Demo) (Batch 609). Per-adoption settings (longest answer, confidence threshold) are edited in Models config and read by the AI service and report page. Waiting on the server side: Firestore model service with emulator-tested rules, and real store licensing.
- Sources: src/services/models/README.md; src/components/Config/Models/README.md; ModelStoreModal.tsx

### AI model selection per lab and gates on defaults
- What it does: A lab's report model is the org default or the lab override; an override is blocked without a passing validation study. A voice model becomes default only with a PASS-graded, reported study; a report model default is always allowed. Voice has an org-wide default only.
- Workflow: Models tab Set Default; Facility editor.
- Roles/permissions: config:ai-model:manage.
- Settings: Models tab, Facility.internalAiModelId.
- Status: Built (Demo)
- Sources: src/components/Config/AI/resolveClientAiModel.ts, resolveVoiceAiModel.ts

### Validation studies (AI parallel-run governance)
- What it does: States draft, pending approval, approved, active, closed, reported. Activation blocked until committee approval with a valid IRB reference. Three tabs (Studies, Dashboard, Reports, via ?section=). The printed report is escaped, built in the reader's language, computes a grade (pass, conditional pass, further review); printing is audited.
- Workflow: Admin in Configuration > Validation: create study (picks AI model), submit, record approval, activate, close, report.
- Roles/permissions: config:validation-studies:manage; validation:approval:record (Admin, Lab Director). View-only without them.
- Settings: study form incl. AI Model Being Validated.
- Status: Built (Demo)
- Sources: src/services/validationStudies/README.md; src/components/ValidationStudies/README.md

### AI contribution tab
- What it does: AI acceptance/override by workflow, per-user feedback, department breakdown and monthly trend from real data. AI override examples and the synoptic dataset are hardcoded and badged demo.
- Workflow: My Contribution > AI tab.
- Roles/permissions: n/a
- Settings: none
- Status: Built (Demo). Duplicate of AI Contribution tab: real per-user numbers; hardcoded override examples are badged demo data. Cross-user aggregates need the server.
- Sources: src/components/Contribution/README.md; AIContributionTab.tsx

### Computational pathology / AI screening vendors, results and triage badge
- What it does: Admin list of AI vendors (Paige Prostate, Ibex, PathAI, Proscia, BD FocalPoint) with FDA clearance data. AI screening results (ordered, completed, failed, timed out) with findings, optional region and slide-level triage ingested idempotently from inbound events. Cytology worklist shows an AI badge (quintile rank and review recommendation, or count of flagged fields). After the reviewer saves, a once-per-result concordance prompt; a "discordant" answer opens def-ai-discordance (never auto-CAPA).
- Workflow: Admin: System > Vendor Integrations; interface engine delivers events; cytotech sees badge and answers prompt.
- Roles/permissions: config:vendor-integrations:manage.
- Settings: vendor dictionary.
- Status: Built (Demo) — real vendor feeds need the interface engine (Planned).
- Sources: src/services/digitalPathology/README.md; DpVendorDictionarySection.tsx; recordAiHumanConcordance.ts

### Slide images: reference preview and opening the lab's digital pathology application (Batch 750; replaces the WSI viewer launch button)
- What it does: A scanned slide shows the scanner's own preview, unchanged, marked "Reference preview. Not for diagnosis."; selecting it opens the slide in the laboratory's digital pathology application in a remembered window. Image states: No image yet, Queued, Scanning, Scan failed, Failed image quality. PathScribe has no viewer and does no image processing.
- Workflow: Admin sets the viewer and preview addresses in System > Vendor Integrations > WSI Viewers > Slide images (lab and per facility); user selects the preview in the block and stain window or on the cytology screening bar; the workstation menu's Set position… saves where the window opens.
- Roles/permissions: config:vendor-integrations:manage (settings); case:slide-image:open (opening, audited).
- Settings: slideImages (viewer and preview templates with {{slideId}} and {{accession}}); VITE_SLIDE_VIEWER_URL_TEMPLATE, VITE_SLIDE_THUMBNAIL_URL_TEMPLATE; the WSI Viewers list's launchUrlTemplate as a fallback.
- Status: Partial (Demo) — previews from the interface engine Planned; the preview host must be added to the security policy by hand.
- Sources: docs/architecture/SLIDE_IMAGES.md; slideImages.ts; slideImageOpen.ts; SlideImagePreview.tsx

### Machine verification of AI-suggested codes
- What it does: Before the Add Code panel shows an AI-suggested SNOMED, ICD-10, ICD-11, ICD-O or LOINC code it must exactly match a real terminology result (fails closed, 5 s timeout, positives cached, network failures never cached). CPT is checked against the curated table. The practitioner still decides.
- Workflow: Automatic in Add Code window.
- Roles/permissions: none.
- Settings: none
- Status: Built (Demo) — needs network.
- Sources: src/services/terminologySearch/README.md; codeSearchService.ts

### Voice dictation toggle, phases and recognition feedback
- What it does: On/off control with four-colour phase (standby, local, ai, dictate); "Voice Local only" when no AI model. Overlay flashes success/fail on commands; miss prompt shows up to 3 fuzzy candidates with auto-dismiss/auto-confirm (not during dictation). Profiles: 15 English accents (US, CA, GB, Scottish, Ireland, India, Philippines, Singapore, East Asian, Eastern European, Germanic, AU/NZ, South Africa, West Africa, Middle East) plus fr-FR, de-DE, nl-NL, ko-KR; no Belgian Dutch profile.
- Workflow: User toggles voice and speaks.
- Roles/permissions: none.
- Settings: Configuration > Voice; accent per person.
- Status: Built (Demo) — browser SpeechRecognition only.
- Sources: src/components/Voice/README.md; src/constants/voiceProfiles.ts

### Dictation with AI refinement
- What it does: AI refinement races a timeout then falls back to local punctuation/capitalisation; learned corrections per person; accent change updates punctuation words. Refinement uses the active "Voice Dictation" AI model through the multi-vendor path, the jurisdiction vendor policy and the validation-study gate. British spelling only when the jurisdiction locale starts en-GB; AU, CA and non-English jurisdictions get American (open issue).
- Workflow: Report editor dictation.
- Roles/permissions: voice setting capability.
- Settings: voice AI model (Models tab), Voice settings.
- Status: Built (Demo) (Batch 609). The refinement prompt follows the spelling convention for US, UK, Australia/NZ and Canada. Nothing waits on another team.
- Sources: src/services/aiIntegration/PathScribeAIService.ts; src/contexts/README.md; src/components/Voice/README.md

### Voice settings, foot pedal and deployment voice switch
- What it does: Accent selection; deployment-wide voice switch (view-only without permission); voice macro list; foot pedal bindings (3 per workstation): dictation, Microtome Pedal 2 print/etch next, Embedding Pedal 1 piece-count confirm, Pedal 3 pause/replay last segment (MediaRecorder). HID/Gamepad and keyboard-emulating pedals; bindings captured live.
- Workflow: User or admin in Configuration > Voice.
- Roles/permissions: config:voice:manage for the deployment switch.
- Settings: per workstation pedal bindings; per person accent.
- Status: Built (Demo) — hardware behavior not verified.
- Sources: src/components/Voice/VoiceSettings.tsx; src/components/Config/System/FootPedalSection.tsx; src/hooks/useFootPedal.ts

### Voice macros / Personal Quick Text
- What it does: Spoken phrase becomes text, applied to each dictated segment. Tiers: Enterprise, Facility, Staff. A pathologist selects text and presses the QT button in the narrative editor to make a personal macro (owner and performing lab filled; only the trigger asked). Voice settings list own plus shared macros; add/import is personal.
- Workflow: QT button or Configuration > Voice > Speech Processing Rules.
- Roles/permissions: own free; shared or another's needs config:macros:manage (CONFIG_NOT_PERMITTED); only admins create Enterprise.
- Settings: Voice settings.
- Status: Built (Demo)
- Sources: src/services/voicemacro/README.md; SpeechConfigTab.tsx; OrchestratorSectionEditor.tsx

### Report text macros (typed shortcuts) and Word import
- What it does: Typed shortcut macros in three tiers (Enterprise, Facility, Personal); admin "All" tab grouped Enterprise, facility, user. Import from Word (.dotx/.dotm/.docx AutoText/Building Blocks) with preview, tier choice and generated `;` shortcuts; plain text only. Font list in the macro editor is hardcoded (Arial, Times New Roman, Courier New, Roboto), not the Fonts dictionary.
- Workflow: Configuration > Macros.
- Roles/permissions: config:macros:manage for shared; only admins create Enterprise.
- Settings: macro list.
- Status: Built (Demo)
- Sources: src/services/macros/README.md; src/components/Config/Macros/README.md; wordBuildingBlocksEngine.ts

### Voice and shortcut action catalog (245 commands)
- What it does: Registry of 245 named actions triggered by voice phrase or hotkey. Each has a hotkey and phrases in en, fr, de, nl, ko. Matching tries the user's language first, then English, with fuzzy matching. Screen-specific commands beat always-on ones. Each action runs once. Includes model/context commands for Grossing, Microtome, Embedding, Slide distribution, Add-On Orders, Batch Management, Molecular plate builder, Intraop, Cytology, report modals.
- Workflow: User speaks or presses a key; admins edit in Configuration > Actions (live key capture, conflict detection, suggestions, category buttons, CSV import and export with quote and formula protection, audited).
- Roles/permissions: config:actions:manage (view-only without). Commands are not access control.
- Settings: hotkeys and phrases per lab.
- Status: Built (Demo) — mock store. Count verified: 246 internalKey lines (245 actions) in the seed.
- Sources: src/services/actionRegistry/README.md, mockActionRegistryService.ts; src/constants/systemActions.ts; src/components/Config/Actions/README.md

### Voice commands that mirror on-screen buttons and bench stations
- What it does: Many modal buttons have a voice phrase and hotkey that act exactly like the button, with Field Requirements checks: save specimen, amendment/correction/addendum, critical notification, holds, comment, biopsy array, delegation, discordance, billing change, correct billing code, autopsy forms, fixation and pre-analytic gates, secure email, cytology review forms, complete grossing, intraop start/next/close/merge, add block order, read flags. Station commands: Microtome add comment/stain; Embedding confirm piece count; Slide distribution confirm checkout; Add-On Orders add/submit; Batch create container; Molecular create plate/place rack. Aborting a batch, forcing reconciliation, cold-chain acknowledgement, Clone & Supersede and block cancel/restain deliberately have no voice command.
- Workflow: Open the form or station page, speak; nothing happens if the form is not open.
- Roles/permissions: also needs the button's capability (for example billing:applied-code:correct).
- Settings: hotkeys editable per lab.
- Status: Built (Demo)
- Sources: src/services/actionRegistry/README.md Batches 378-406; src/constants/systemActions.ts

### Screen-wins hotkeys and the Alt+J "Go to" prefix
- What it does: The screen in focus decides what a hotkey or phrase means. Always-on commands a screen shadows are reached with Alt+J then their key; a small panel lists keys, closes on Esc, outside click, Ctrl/Meta, unknown key or 3 seconds, and never takes focus. Six hotkeys remapped (old defaults migrate; customised keys kept); nine duplicate phrases removed. Screens can take a spoken command first (Mohs stage question). Confirm Field (Ctrl+Alt+Shift+A) confirms the last synoptic field, also inside text fields.
- Workflow: Press Alt+J, then the command key.
- Roles/permissions: none.
- Settings: Actions editor.
- Status: Built (Batch 614: Mac Option and AltGr handled in code and tested with simulated key presses; not tried on a Mac or an AltGr keyboard). The Role Dictionary action reference and Configuration > Actions show each always-on command's "Alt+J, then X" route.
- Sources: src/components/Common/GoToPrefix.tsx, src/hooks/useGoToPrefix.ts; src/services/actionRegistry/shortcutResolution.ts; docs/product/ACTIONS_COVERAGE.md

### Known hotkey clashes
- What it does: 52 clashes (27 hotkey, 25 voice) remain after Batch 614 moved seven Intraop commands to their own category; Alt+. / Alt+, / Alt+V are bound to both System and Navigation actions. The guard test lists them so the list can only shrink.
- Workflow: n/a
- Roles/permissions: n/a
- Settings: awaiting Pete's rule before default hotkeys change.
- Status: Built. Batch 602 resolved clashes by policy: screen in focus wins, Alt+J leader, guard tests enforce it; 'known defect' is stale. Mac Option/AltGr fixed in Batch 614 (see the Alt+J entry).
- Sources: src/services/actionRegistry/actionsCoverage.guard.test.ts; docs/product/ACTIONS_COVERAGE.md

### Role Dictionary coverage of voice and shortcut commands
- What it does: All 257 commands have Role Dictionary entries (roles list 355 entries); 82 entries have no voice phrase or hotkey of their own and each is classified, by id: 24 covered by another command, 25 a screen you open, 16 needing a choice on screen, 15 deliberate click only (see ACTIONS_COVERAGE.md). Defaults per role (job roles get job commands; Superadmin all; Physician, OR Staff and template roles none for record-changing; QA Reviewer, Admin, Lab Director get going-to and searching). Existing sites are offered new commands once; an admin removal sticks; custom roles untouched. The role editor Commands tab says the commands are not enforced and shows a live total (the "189" in the Staff README is a Batch 369 snapshot).
- Workflow: Configuration > Staff > Role Dictionary.
- Roles/permissions: config:roles:manage.
- Settings: Role.seededActions; src/constants/defaultActionGrants.ts.
- Status: Built (Demo) — defaults await Pete's review; fr/de/nl/ko phrases are machine translated and need native review; the permission-only entries are settled in Batch 614 (16 became voice and hotkey commands; the rest are covered by another command or deliberately not spoken, with a reason each).
- Sources: docs/product/ACTIONS_COVERAGE.md; src/services/roles/actionSeeds.ts; src/components/Config/Staff/RoleDictionary.tsx

### Personal dictionary and learned voice commands
- What it does: My dictionary: words added to the person's own spelling list (add/remove, own only). My voice commands: phrases the system learned from that person, listed per person and removable; old shared list carried over once.
- Workflow: Initials badge > About menu > My dictionary / My voice commands.
- Roles/permissions: own only.
- Settings: per person.
- Status: Built (Demo)
- Sources: src/components/Profile/MyDictionaryModal.tsx, MyVoiceCommandsModal.tsx; src/services/actionRegistry/README.md Batch 432

### Multi-language voice dictation and commands
- What it does: Profiles let speech recognition take French, German, Dutch and Korean free text with spoken punctuation in those languages and translated phrases for every action.
- Workflow: User picks language and dictates.
- Roles/permissions: none.
- Settings: language setting; voice profile.
- Status: Built (Demo) (Batch 609). An admin switch drops the English fuzzy fallback for non-English profiles, and the refinement prompts are reviewed per language. Waiting on people: native-speaker review of machine-translated phrases and prompt wording.
- Sources: src/services/actionRegistry/README.md; src/constants/voiceProfiles.ts, contexts/punctuationMaps.ts; src/MULTILANG_VOICE_COMMANDS_PLAN.md

### Dictating the verbal (intraoperative) report
- What it does: One dictated sentence proposes recipient, role, read-back and reason. AI first (organisation model), keyword rules as fallback. Patient name, MRN, DOB replaced with [PATIENT] before sending. Read-back only if stated and not negated; nothing entered is overwritten; time never taken from speech. Log records dictated fields and engine.
- Workflow: Pathologist dictates, reviews, saves.
- Roles/permissions: none extra.
- Settings: organisation AI model.
- Status: Built (Demo)
- Sources: src/services/intraop/README.md; parseVerbalReportDictation.ts

### Gross dictation by voice
- What it does: The ENTER_GROSS action starts continuous speech-to-text for the gross description, same mode as microscopic and diagnosis.
- Workflow: Voice or hotkey.
- Roles/permissions: not access control.
- Settings: none
- Status: Built (Demo) — browser SpeechRecognition only.
- Sources: src/services/grossingHardware/README.md; contexts/VoiceProvider.tsx

### Supported UI languages and regional variants
- What it does: UI in English, French, German, Dutch, Korean, plus Belgian French (fr-BE) and Belgian Dutch (nl-BE) files holding only differing words (fall back to fr/nl, then en). One language file loads at a time. Every visible string goes through t(); parity, placeholder and no-hardcoded-text guard tests enforce it. Audit-log detail and queue text deliberately stay English.
- Workflow: User picks language in the nav bar menu (saved to the person; sign-in page uses the workstation's last language).
- Roles/permissions: all users.
- Settings: per person; src/i18n/locales/{en,fr,de,nl,ko,fr-BE,nl-BE}.json.
- Status: Built — machine translations for fr/de/nl/ko; native review pending (Korean first); register in docs/quality/TRANSLATION_REVIEW.md.
- Sources: src/i18n/README.md; src/i18n/config.ts; src/components/NavBar/LanguageSwitcher.tsx; src/i18n/uiText.guard.test.ts, localeParity.test.ts

### Locale formatting and names
- What it does: Dates and times follow the user's locale (date-only values in UTC so DOB never shifts); lists, percentages and percentage-point changes by language ("12,3 %"); ordinals incl. nl-BE; Korean screens show name + 님 (선생님 for Dr./Prof.); search date matching accepts each jurisdiction's format; audit timestamps UTC; plurals via _one/_other.
- Workflow: Automatic.
- Roles/permissions: n/a
- Settings: user language.
- Status: Built
- Sources: src/utils/README.md; formatDate.ts, formatList.ts, formatPercent.ts, personName.ts, isoDateForSearch.ts

### Report language and date format by performing lab
- What it does: Reports are written in the performing lab's language (Facility.reportLanguage, else jurisdiction default: NL Dutch, DE German, FR French, KR Korean, BE Belgian Dutch, English elsewhere) with the lab's date format (UK lab 02/04/1988, 24-hour clock). Stored on the report at sign-out; corrections keep original language; Korean PDFs use embedded Pretendard. Printed validation reports follow the reader's language.
- Workflow: Admin sets language in Facility Dictionary; automatic.
- Roles/permissions: config:facilities:manage.
- Settings: Facility.reportLanguage.
- Status: Built
- Sources: src/services/reports/reportLanguage.ts, resolveReportLocale.ts; functions/fonts/

### Korean font and bundled fonts
- What it does: Korean text typed in any approved font is drawn in Pretendard (also in report PDFs). Inter and Pretendard and the urgent-alert sound are served from PathScribe itself; only PubMed and NLM terminology hosts are called externally.
- Workflow: Automatic.
- Roles/permissions: none.
- Settings: none
- Status: Built
- Sources: src/components/Editor/README.md; deploy/security-headers/README.md

### Approved editor fonts
- What it does: Admin toggle list of fonts for the editor toolbar; at least one must stay enabled.
- Workflow: Admin: System > Fonts.
- Roles/permissions: not stated.
- Settings: font dictionary.
- Status: Built (Demo) — firestore font service is a stub.
- Sources: src/components/Config/System/FontsSection.tsx; src/services/fonts/README.md

### Medical spell check, language control and word lists
- What it does: Hunspell in a Web Worker checks typing (300 ms pause) in the report editor, synoptic text, cytology screening notes, intraop forms. Order: personal, facility, regional variant (red = misspelling, blue = other English convention), medical lexicon, clinical vocabularies, base dictionary. Skips codes, digits, acronyms to 6 capitals, URLs. Languages: US, CA, UK, AU English, Dutch, French, Korean, German. Right-click: up to 5 suggestions, Ignore, Add to my dictionary, Add to facility dictionary. Language order: case choice, assigned pathologist's profile, ordering facility default, en-US; shown with its reason and overridable per case (Case.spellingLocaleOverride). Intraop control is read-only.
- Workflow: Pathologist works in editor; staff edit sets spelling language; Facility > Spelling tab for the lab list.
- Roles/permissions: facility list needs config:facilities:manage (audited); personal words only by owner.
- Settings: StaffUser.spellingLocale; facility dictionary.
- Status: Built (Demo) (Batch 609). Starter pathology word lists for German, French and Dutch are registered as the medical tier and the German false flags are fixed. Waiting on others: licensed SNOMED/LOINC/SPECIALIST releases (PS-343) and native-speaker clinical review of the starter lists.
- Sources: src/services/spellcheck/README.md; src/components/SpellCheck/*; spellcheck-data/README.md

### Terminology decisions (French IPP, Korean honorifics, percentage points)
- What it does: Pete's decisions: French MRN is "IPP", Korean name honorifics (님/선생님), "workload limit" not "CLIA" outside the US, Korean uses 스크리닝 for screening, "cas"/"증례" for case in some strings, percentage-point wording per language, the Ms. qualifier. Evidence found in code: IPP in fr.json, Korean honorific logic in personName.ts, formatPercent.ts. CLAUDE.md says these are listed under "Terminology decisions" in src/i18n/README.md, but no such heading exists there.
- Workflow: Developer rule; applied to every new string.
- Roles/permissions: n/a
- Settings: n/a
- Status: Built. src/i18n/README.md now has a Terminology decisions section, including the Ms. qualifier rule. It says Pete to confirm, so only his sign-off is left.
- Sources: CLAUDE.md; src/i18n/README.md Batches 554, 555, 572, 575; src/i18n/locales/fr.json; src/utils/personName.ts

### Code Systems policy per jurisdiction
- What it does: Per jurisdiction, each code system (ICD-10, ICD-11, ICD-O, SNOMED CT) is off, optional or required from a date. Saved, validated, audited. Defaults ask for nothing and keep ICD-11 off.
- Workflow: Admin: Configuration > System > Code Systems; reset to default.
- Roles/permissions: config:code-systems:manage (Admin, Lab Director; audited CODE_SYSTEM_POLICY_CHANGED).
- Settings: per jurisdiction and system.
- Status: Built (Demo) (Batch 607). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: docs/architecture/DIAGNOSIS_CODING.md; src/services/coding/codeSystemPolicyService.ts; CodeSystemsSection.tsx

### Terminology services and clinical code search
- What it does: Live search against NLM Clinical Tables and UTS (UMLS key held server-side in the dev proxy) for SNOMED, ICD-10, ICD-11, LOINC, ICD-O; CPT search reads the curated billing table. OPCS-4 stubbed (NHS TRUD licence). Add Code window: applied codes with strike/undo, system tabs, "Applied elsewhere" with Move here. Terminology services screen lists endpoints with live health and Test All (endpoint detail for ForMedrixAI support only); region maps ICD-10 variant to governing body. Template field-level coding and deprecation alerts exist in the template editor.
- Workflow: Codes button on the report; Configuration > System > Terminology Services.
- Roles/permissions: endpoint details Superadmin sessions only.
- Settings: VITE_NLM_BASE_URL, VITE_CPT_PROXY_URL, VITE_ICD10_PROXY_URL.
- Status: Built (Demo) (Batch 607). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Licensed proxy for CPT and non-US ICD-10, terminology server, nightly monitoring.
- Sources: src/services/terminologySearch/README.md; src/components/Config/Terminology/README.md; AddCodeModal.tsx

### RVU Code Map (productivity)
- What it does: Versioned CPT-to-work-RVU table (seed 88302, 88304, 88305, 88307, 88312, 88342), immutable and effective-dated; a case's RVU resolves against the version in effect on its finalization date. Add, edit, duplicate row (each saves a new version); download template and upload .xlsx/.csv with preview; accepts the CMS PPRRVU file (A/R/T rows). Codes with no verified RVU show "Unverified" and count 0 (88341, 88344, 88360, 88361, IHC-ADDL, FROZEN-*, PIN4-PANEL). Rule-based fallback counts a specimen with no code and no dictionary default as one 88305 (an estimate).
- Workflow: Admin: Configuration > System > Financial & Revenue Lookups > RVU Code Map.
- Roles/permissions: config:billing-rvu:manage; config:billing-tables:approve.
- Settings: version effective date, activate-now.
- Status: Built (Demo)
- Sources: src/services/billing/README.md; RvuTableVersion.ts, mockRvuCodeMapService.ts; RvuCodeMapSection.tsx

### Productivity and peer comparison (My Contribution)
- What it does: Monthly case counts for cases finalized by the signed-in user, real RVU totals and monthly chart from the RVU map, peer comparison. Peer averages are hidden from the plain Pathologist role unless the org enables showPeerAveragesToPathologists; own RVU tile always visible. Printing is audited; charts follow facility time zone.
- Workflow: My Contribution > Productivity; admin: System > Contribution Settings.
- Roles/permissions: all roles except plain pathologist see peers by default.
- Settings: showPeerAveragesToPathologists.
- Status: Built (Demo) — peer comparison still flagged demo in the scoping notes.
- Sources: src/components/Contribution/productivityCalculations.ts; ContributionSettingsSection.tsx; docs/product/WORKLOAD_AND_CHARGE_CAPTURE_SCOPE.md

### Billing Dictionary (charge capture, versioned, four-eyes)
- What it does: One row per internal billingCode (IHC-FIRST, IHC-ADDL, FROZEN-FIRST...) with ACTIVE version and append-only history. Each version: CPT/HCPCS, work/PE/MP RVU, pass-through modifier, country codes, effective dates, status DRAFT, PENDING_APPROVAL, ACTIVE, RETIRED, REJECTED. Change reason required after v1; custom codes must map to a real CPT/HCPCS/RVU; CPT search picker; drift warning versus RVU map; Country dropdown (operating countries, 27 EU states, New Zealand). Enterprise or per-site view. Approval keeps prior version active until the new one starts (natural sunset); UK/GB treated as one, EU matches any member state. Modifier-allowed, quantity, bundling and documentation fields are reference only.
- Workflow: Admin: new version (draft), submit, a different person approves in Pending Approvals.
- Roles/permissions: config:billing-rules:manage; config:billing-tables:approve.
- Settings: country, vocabulary (CPT, HCPCS, NHS_OPCS4, LOCAL_LAB).
- Status: Built (Demo)
- Sources: src/services/billing/README.md, resolveBillingRuleAt.ts, codeEngine/README.md; BillingDictionarySection.tsx

### Pending approvals queue (four-eyes) and bulk code import
- What it does: One queue for pending billing rule versions, modifier versions, NCCI imports and whole code-import jobs; approver cannot be the uploader; rejection needs a reason. Code Import wizard: file and scope (standard, country, site, note), column mapping (billing code, CPT, effective date or one date), check (refused rows with reasons), import as one PENDING_APPROVAL job. Approved jobs can roll back with reason (used rows retired, unused removed, prior versions reopened). All events audited.
- Workflow: Uploader imports; second admin approves in Pending Approvals.
- Roles/permissions: config:billing-code-import:run; config:billing-tables:approve.
- Settings: coding standard defaults country (CPT/HCPCS US, OPCS-4 UK).
- Status: Built (Demo) — production DB transaction on the API server Planned.
- Sources: src/services/billing/codeEngine/README.md; CodeImportSection.tsx; PendingApprovalSection.tsx

### CPT modifier table, NCCI edit rules and HCPCS Level II
- What it does: Versioned modifier list (26, TC, 59, XE/XS/XP/XU...) with real codes and synthetic "Modifier {code}" text until an AMA-licensed import; template export and re-upload with preview. NCCI Column One/Two pairs with modifier indicator 0/1/9 (small synthetic seed; customer imports CMS quarterly file) used by the sign-out bundling check. HCPCS Level II dictionary feeds the picker and Billing Dictionary. Four-eyes before activation.
- Workflow: Admin: System > Modifier Dictionary / NCCI Edit Rules.
- Roles/permissions: config:billing-modifiers:manage; config:billing-ncci:manage; config:billing-tables:approve.
- Settings: none
- Status: Built (Demo) — real AMA text and CMS data are not shipped (licence).
- Sources: src/services/billing/README.md; ModifierDictionarySection.tsx; NcciEditRulesSection.tsx; hcpcsLevelIIDictionary.ts

### Place of Service dictionary
- What it does: Read-only versioned list of 52 CMS POS codes with source URL and verified date. POS belongs to the ordering/collection facility (Facility.placeOfServiceCodeId).
- Workflow: Selected in the Facility editor (specimen_acquisition role shows POS).
- Roles/permissions: none stated.
- Settings: Facility editor fields.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: src/services/billing/mockPlaceOfServiceCodeService.ts; jsonWebhookBuilder.ts

### Specimen- and block-level CPT coding and suggestions
- What it does: Base CPT (88302 to 88309) per specimen, ancillary codes per block; "+ Code" with "Pending Base Code" badge. Suggestions: 88312 per special stain; IHC 88342 for the first stain per specimen and 88341 for each additional (counted across blocks); a stain type's own billing code overrides (88344, 88360/88361). Never auto-applied. Molecular units calculated; sign-out summary shows base beside ancillary codes with a soft non-blocking warning; complexity auto-upgrades to gross-and-micro when a diagnostic synoptic answer exists.
- Workflow: Pathologist or coder in Code Manager or block stain editor; billing tab on the report.
- Roles/permissions: billing:applied-code:review.
- Settings: Specimen Dictionary defaultBaseCptCode; StainType.defaultBillingCode.
- Status: Built (Demo)
- Sources: src/services/billing/codeMapTable.ts, shouldAutoUpgradeComplexity.ts, calculateMolecularUnits.ts; BillingReviewPanel.tsx; CaseSignOutModal.tsx

### Frozen section billing suggestion
- What it does: Intended: suggest 88331 for the first frozen block and 88332 for each additional, counting one frozen_section_cut milestone as a block (assumption unconfirmed; RVU unverified).
- Workflow: none (never invoked).
- Roles/permissions: none
- Settings: none
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated.
- Sources: src/services/billing/frozenSectionBilling.ts (+test)

### Biopsy-array (matrix block) billing
- What it does: Ancillary units attach to the specimen, not the shared block. Billing triggers only after a pathologist confirms which cores were evaluated (Evaluated Cores checklist); unconfirmed stain gives zero suggestions. Array Mapper orders stains to cores. Molecular on matrix blocks returns no units (gap). Pending matrix suggestions block sign-out. Charge audit records the specimen, not the source block.
- Workflow: Order targeted stain in the matrix block editor; pathologist confirms cores in Billing Review.
- Roles/permissions: billing:applied-code:review.
- Settings: none
- Status: Built (Demo)
- Sources: src/services/billing/README.md; BillingReviewPanel.tsx; MatrixBlockEditorModal

### Billing review panel (report page, Cytology Workspace, Microtome)
- What it does: Tree of specimens/blocks with pending/applied badges; confirm, override, decline, add, delete, correct codes; decants included and reactive to material events (decant add/rollback). Cytology Workspace "$ Billing" drawer with Approve all across decants. Microtome shows a read-only per-slide box with "$ Full billing review" (greyed without permission). Date of service = Date Collected else Date Received; missing both withholds the charge and audits it. Assist cases change codes without charging. Specimen codes and the Sequencer order save immediately (all or nothing; failure reverts and records no charge).
- Workflow: Open panel; each change is saved to the case then charged or credited.
- Roles/permissions: billing:applied-code:review (Admin, Lab Director, QA Reviewer, all case-access roles).
- Settings: Role Dictionary.
- Status: Built (Demo)
- Sources: src/services/billing/caseBillingCoding.ts, caseBillingCharges.ts, billingMaterialSync.ts; src/hooks/useCaseBillingReview.ts

### Post-sign-out billing change reason
- What it does: After sign-out, any billing change (case-level, specimen add/remove, matrix apply) asks for a reason from the post-sign-out billing reasons dictionary plus a required comment; the reason lands on the charge/credit and audit entry. Assist cases are exempt. Deleting a block-level applied code after sign-out still credits without asking.
- Workflow: Modal; confirm by button or voice "confirm billing change".
- Roles/permissions: not stated.
- Settings: Reason dictionary; locked Field Requirements.
- Status: Built (Demo) — the Batch 579/583 claims verified: postSignoutBillingReason.ts is used by the report page and shared billing review.
- Sources: src/services/billing/postSignoutBillingReason.ts; PostSignoutBillingChangeModal.tsx

### Billing correction engine (credit and rebill)
- What it does: One engine changes CPT code, changes modifier, reverses a charge or adds a missing charge. Requires reason and comment, writes credit and new charge, resolves or records a POST_SIGNOUT_CORRECTION deficiency, updates case coding in the same transaction, one audit entry. Refuses an already-reversed charge. Works without opening the case; version-checked. Correct-an-applied-code modal needs a differing corrected code.
- Workflow: Report page Correct code modal (voice "correct billing code"); Quality Assurance > Financials > Start correction (find by case id or accession).
- Roles/permissions: billing:applied-code:correct.
- Settings: reason category "post-sign-out billing change".
- Status: Built (Demo)
- Sources: src/services/billing/billingCorrection.ts, correctServiceCharge.ts; CorrectAppliedCodeModal.tsx; BillingCorrectionDialog.tsx

### Service charge record (charge ledger snapshot)
- What it does: At finalization each applied billingCode resolves once into an immutable ServiceChargeRecord (CPT/HCPCS/RVU/modifier, rule version, link to signed report version, deterministic id). Never re-resolved; unknown code yields nothing. Corrections append records.
- Workflow: Automatic at sign-out.
- Roles/permissions: see correction and approval.
- Settings: none
- Status: Built (Demo)
- Sources: src/services/billing/resolveServiceCharge.ts, mockServiceChargeService.ts

### Charge approval (four-eyes)
- What it does: When a lab or enterprise requires approval, charges and credits wait as PENDING_APPROVAL or HOLD and are skipped by the outbound sweep until APPROVED. Approve, reject (reason), hold, release. The drafter cannot approve. A charge whose performing lab cannot be found is refused (LAB_UNKNOWN).
- Workflow: Approver works Quality Assurance > Financials > Charges awaiting approval; admin sets "Charges need billing approval" in Facility editor > General.
- Roles/permissions: billing:charge:approve (nobody by default; checked against the charge's lab).
- Settings: Facility.requireBillingApproval (enterprise, lab override).
- Status: Built (Demo)
- Sources: src/services/billing/chargeApproval.ts, shouldRequireBillingApproval.ts; ChargeApprovalQueue.tsx

### Billing deficiencies (non-blocking compliance flags)
- What it does: Raised at sign-out for QA: MODIFIER_MISMATCH, NCCI_BUNDLING_VIOLATION, ZERO_FEE_MAPPING_ERROR, UNSUPPORTED_CPT_LEVEL, UNATTACHED_ANCILLARY_ORDER, MISSING_CHARGE, POST_SIGNOUT_CORRECTION, BLOCK_DELETED. Severity: critical rejection risk, compliance warning, revenue leakage. Status OPEN, UNDER_REVIEW, RESOLVED, OVERRIDDEN_WITH_JUSTIFICATION. DFT export is gated by open deficiencies.
- Workflow: Billing resolves in Quality Assurance > Financials > Billing deficiencies / Resolved.
- Roles/permissions: not stated.
- Settings: none
- Status: Built (Demo)
- Sources: src/services/billing/checkSignOutBillingDeficiencies.ts; mockBillingDeficiencyService.ts; canCaseExportDft.ts

### Code review pool
- What it does: Billing codes can be flagged for a second review. Manual flag: Request Review modal note type "Code Review". Random sampling: at sign-out a case is sampled at the performing lab's codeReviewSamplingRatePercent (0 or blank = never). A billing specialist reviews pending entries in the Code Review Pool tile.
- Workflow: Pathologist flags or sampling selects; specialist reviews in QA > Financials > Code Review Pool.
- Roles/permissions: not stated.
- Settings: Facility editor sampling rate (0 to 100); change is audited.
- Status: Built (Demo) — verified callers: QualityAssurancePage, RequestReviewModal, useSignOutWorkflow. Not described in the billing README.
- Sources: src/services/billing/mockCodeReviewPoolService.ts, shouldRandomlySampleForCodeReview.ts; QualityAssurancePage.tsx; FacilityEditorModal.tsx

### Billing type triggers (when a charge is released)
- What it does: Decides when each billing type sends its charge to the outbound queue. Defaults: TC at SPECIMEN_GROSSED, 26 and Global at CASE_SIGNED_OUT. Override enterprise-wide or per site (site falls back to enterprise). Charges are swept into the queue at Complete Grossing and at sign-out.
- Workflow: Admin: Configuration > System > Billing Type Triggers.
- Roles/permissions: config:billing-triggers:manage.
- Settings: trigger per billing type, per scope.
- Status: Built (Demo)
- Sources: src/services/billing/mockBillingTypeTriggerConfigService.ts, sweepChargesForOutbox.ts; BillingTypeTriggerSection.tsx; useGrossingCompletion.ts

### Outbound charge queue and dead-letter view
- What it does: Queued charges are validated (missing ICD-10 or provider NPI marks FAILED at once); failures can be fixed in place (attach ICD-10 or NPI) and retried. A "Simulate Failure" action produces DISPATCH_TIMEOUT / DISPATCH_REJECTED because real dispatch does not exist.
- Workflow: Billing specialist: Audit Log > Financial > Outbound DLQ (Performing Lab filter).
- Roles/permissions: not stated.
- Settings: none
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Charge transport to the billing system/engine.
- Sources: src/pages/OutboundDlqSection.tsx; src/services/billing/mockOutboundChargeQueueService.ts, validateChargeMetadata.ts, simulateDispatchFailure.ts

### Billing Log (billing audit search)
- What it does: Searches billing events (charge, credit, deficiency, code review, dispatch, amendment, audit) by case, patient name or ID, name range, billing-event date, date of service, sign-out date, staff, signing pathologist, facilities, billing type (TC, 26, Global), approval status (DRAFT to HOLD), detail text. Saved searches follow the person; CSV export through the export service (formula protection, meta header).
- Workflow: Audit Log > Financial > Billing Logs.
- Roles/permissions: export capability per kind.
- Settings: none
- Status: Built (Demo)
- Sources: src/pages/BillingLogsSection.tsx; src/services/billing/searchBillingAuditLog.ts

### DFT charge message and JSON charge payload (preview only)
- What it does: Builds DFT^P03 (professional pattern; one FT1 per charge record; FT1-26 modifiers; DG1 from ICD-10; not institutional) and a ChargeCaptureEventPayload (CLIA/ISO number via ordering facility). Preview shows the message with patient data, so it needs a capability; the output is not sent anywhere.
- Workflow: Admin: Configuration > System > DFT Export Preview.
- Roles/permissions: config:interface-preview:view.
- Settings: facility timezone.
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Billing engine endpoint.
- Sources: src/services/hl7/dftBuilder.ts; src/services/billing/jsonWebhookBuilder.ts; DftExportPreviewSection.tsx

### International financial class dictionaries
- What it does: Master Payment Types (11 jurisdiction-agnostic categories with guarantor rule, subscriber-ID label such as NHS Number or Claim #, split-billing flag) and Jurisdiction Payment Mapping (13 country/local-scheme rows, many-to-one; country free text allows CA_ON). Add, update, deactivate, reactivate; Category ID locks on edit.
- Workflow: Admin: System > Financial & Revenue Lookups.
- Roles/permissions: config:payment-types:manage; config:payment-mappings:manage.
- Settings: as above.
- Status: Built (Demo)
- Sources: src/services/billing/mockMasterPaymentTypeService.ts, mockJurisdictionPaymentMappingService.ts; MasterPaymentTypeDictionarySection.tsx

### Outside patient intake and financial data at accession
- What it does: Intake type selector Standard, Downtime (reason code, amber banner) or Outside/Contract (teal badge, reveals Outside Patient Data tab). Tab: client account (billing type defaults from Facility.defaultAccountBillingType), primary jurisdiction (sets Local ID label), payment and secondary scheme rows, split-billing toggle, payer and policy details. Outside cases always get a fresh patient identity (no fuzzy match; establishedVia created_unmatched), but the accessioner can still link to an existing patient. Outside block and fluid IDs are mapped to PathScribe IDs so containers need not be relabelled.
- Workflow: Accessioner on Accession page.
- Roles/permissions: none stated.
- Settings: Facility default account billing type.
- Status: Built (Demo)
- Sources: src/pages/AccessionPage/README.md; AccessionPage.tsx (resolvePatientWithoutMatching at line 2178); src/types/billing/OutsidePatientFinancialData.ts; src/utils/foreignIdCollision.ts

### Move a case to another patient (misattributed or outside cases)
- What it does: Moves a case to a different patient through patientIndexService.moveCaseToPatient, from the case or from the patient.
- Workflow: Search page "Reassign patient" panel (case-first) or QA Patient Management "Move a Case..." (patient-first).
- Roles/permissions: not stated.
- Settings: none
- Status: Built (Demo) — the accession README's "not built" is stale; both entry points exist.
- Sources: src/components/Search/ReassignCasePatientPanel.tsx; src/components/QualityAssurance/PatientManagementSection.tsx

### Financial class payload for a downstream engine
- What it does: Builds an outbound payload (local scheme, outbound format name, master type requirements, payer/policy, secondary coverage). No adjudication, dollar amounts or split-billing calculation.
- Workflow: none; nothing calls it except a comment in AccessionPage.
- Roles/permissions: none
- Settings: none
- Status: Built (Demo) (Batch 605). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Format specifications and downstream engine for X12 837P, KVDT, SESAM-Vitale.
- Sources: src/services/billing/buildFinancialClassPayload.ts

### AI charge capture (Smart Capture layer)
- What it does: Planned AI/NLP suggestion drawer at sign-off with mandatory pathologist sign-off, outputting a structured payload to the institution's own LIS/RCM; PathScribe would not submit claims. Gated on attorney and claims-specialist input; any prototype must be labelled "Prototype, not yet compliance-reviewed".
- Workflow: n/a
- Roles/permissions: n/a
- Settings: n/a
- Status: Built (Demo) (Batch 611). Prototype Smart Capture drawer at sign-off with mock suggestions, mandatory pathologist confirmation, suggested/reviewed/approved/sent states and payload preview, labelled Prototype, not compliance-reviewed; production use is gated by an admin checklist. Waiting on others: attorney and claims-specialist review, and the institution's LIS/RCM receiver.
- Sources: docs/product/WORKLOAD_AND_CHARGE_CAPTURE_SCOPE.md

### Cytology workload cap and Screening Credit Units
- What it does: Each review carries a weight by mode (manual 1.0, liquid non-gyn 0.5, FOV-assisted 0.5, manual rescreen 1.5, pathologist review 0). Limit = cap x hours screened / 8, never above the cap. Soft-brake near 85%; a save over the limit is refused. Cap is a whole number 1 to 100 (CLIA), cascade enterprise, facility (can only lower), person. A counter on worklist and screening page shows slides counted of the cap over 24 hours, reviews, left now and in a full day, and "Approaching / At / Over your limit". Editing a saved review adds only the escalation weight. Worklist hides the counter when no jurisdiction rule applies.
- Workflow: Screener works; admin sets Configuration > Cytology > Workload Cap (add-override pickers list only unset facilities/staff; errors beside the field).
- Roles/permissions: config:cytology-workload-cap:manage (also for a person's own cap).
- Settings: caps, "Screening day starts at" hour (audited).
- Status: Built (Demo)
- Sources: src/services/cytology/cytologyWorkloadSummary.ts, resolveCytologyWorkloadCapacity.ts, resolveCytologyScuWeight.ts; CytologyWorkloadCapSettingsSection.tsx

### Cytology screening hours sign-off and workload report CYT-QA-05
- What it does: "Today's screening hours" panel on the Cytology worklist: one click confirms, or Correct with reason (screened at the microscope, slide left open, other with note up to 200 chars). Yesterday can be signed off while needed (night shifts); a sign-off made before more screening stops counting. A correction over 0.5 h out, or turning an exceeded day into within-limit, is flagged for the supervisor. CYT-QA-05 shows recorded and signed-off hours, flags and reasons. Append-only, audited.
- Workflow: Screener confirms daily; supervisor/QA reads the report.
- Roles/permissions: cytology:screening-hours:sign-off (Pathologist, Fellow, Resident, Cytotechnologist).
- Settings: day start hour, tolerance.
- Status: Built (Demo). Panel, rules, supervisor flags and CYT-QA-05 are built in the browser. Only server-recorded screening events (replacing the display timer) are backend.
- Sources: src/services/cytology/screeningHoursRules.ts; ScreeningHoursPanel.tsx; docs/architecture/CYTOLOGY_QC_API.md

### Internal messages drawer
- What it does: Messages drawer: list, thread, compose, user search, delete/restore/delete-forever, "(No subject)", case numbers in text open the case, config links open a Configuration section (only PathScribe paths accepted). Linkable accessions only those the reader can open (support-only, pediatric/Orchestration cases excluded). Unread count; urgent flag plays two Web Audio beeps (no external download); drawer state kept per session; inbox clears when the user changes; phones show list-then-thread. Case links tagged data-phi for screenshot redaction. Message the physician from patient history looks the recipient up by name (imperfect, no physician ID).
- Workflow: User opens Messages from the nav bar, composes, sends or replies; a failed send keeps the draft.
- Roles/permissions: message:internal:send.
- Settings: Field Requirements > Messaging (recipient and text locked; subject switch).
- Status: Built (Demo) — messageService is browser-backed.
- Sources: src/components/AppShell/README.md; src/services/messages/README.md; src/utils/alertTone.ts, safeInternalPath.ts

### Secure email through lab gateways
- What it does: Window sends through a gateway configured for the lab with gateway branding and the agreement reference. "Contains patient details" ticked by default (forced on by the critical-findings email). Refusals: noGatewayConfigured, gatewayNotAvailable, noAgreementForPatientData. Catalogue: email (NHSmail, Egress, Accurx, Paubox, Virtru, Zix) and clinical networks (HealthLink, Medical-Objects, ReferralNet, Korea HIE with directory ID in To). Patient data only through a gateway with BAA (US) or DPA on file. Voice "submit secure email".
- Workflow: User opens Secure email from the drawer or the critical-findings flow; admin sets gateways in Facility editor > Secure messaging tab (enterprise facilities): sending address, staff allowed, default, BAA/DPA reference, signed date, expiry.
- Roles/permissions: message:secure-email:send; config:secure-messaging:manage (Admin, Lab Director).
- Settings: gateways, agreement, default.
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Real gateway transports (PS-332).
- Sources: src/components/SecureEmail/SecureEmailModal.tsx; src/services/secureMessaging/README.md; FacilitySecureMessagingTab.tsx

### Critical finding notification record and alert dispatch
- What it does: Append-only record of how a critical finding was communicated (who, method, read-back, role, decision, surgeon-unavailable reason); several per case. A pre-filled secure email (accession in subject, findings with source quote, request to acknowledge) in the sender's language is recorded only once sent. Automated SMS, secure email and EHR push channels resolve contacts by severity (SMS/email carry no PHI); the channel adapters only log to the console.
- Workflow: Pathologist at sign-out in the critical-findings window (voice "record notification").
- Roles/permissions: Field Requirements "Critical findings"; config:physicians:manage for carrier data.
- Settings: Physician SMS carrier fields.
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Engine alert channels (SMS, secure e-mail, EHR inbox push).
- Sources: src/services/clinical/README.md; criticalFindingEmail.ts, dispatchCriticalAlerts.ts, postGaAlertChannels/

### Notifications: toasts, email transport and calendar invites
- What it does: Toasts: warnings, errors and messages over 120 characters stay until closed; short confirmations fade after 4 to 9 s; toasts naming a case are PHI-tagged. sendEmail (optional attachments) is used for block-exhaustion alerts, Tumor Board presenter assignment (in-app message plus .ics invite, no patient details) and enhancement requests. Template lifecycle e-mails: the browser sends only the event, the server picks recipients and writes in each language.
- Workflow: Automatic.
- Roles/permissions: n/a
- Settings: none
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Server mail service and /api/notifications endpoints (phase 2e).
- Sources: src/utils/toastPolicy.ts; src/services/communications/notificationService.ts, templateLifecycleEvent.ts; notifyTumorBoardAssignment.ts

### Exports through the server and My exports
- What it does: Every export button goes through one export service (26 kinds) with notice; quick exports download at once, long ones show "Preparing", then Download from My exports (last 7 days, Cancel while preparing). Per-kind permission checked at request and download; signed https links only.
- Workflow: Click export; top-bar download icon with badge opens /my-exports.
- Roles/permissions: one capability per kind.
- Settings: none
- Status: Built (Demo) (Batch 611). A Simulated export server lets long exports show Preparing, appear in My exports and download. Waiting on the server side: /api/exports endpoints, worker, signed links and hub status events.
- Sources: src/services/exports/; src/pages/MyExportsPage.tsx; docs/architecture/ASYNC_EXPORT_API.md

### Global app shell, nav bar and breadcrumb
- What it does: Layout around every signed-in page: logo/home, breadcrumb (with "returning to Search" mark), Search quick case search, voice controls, Enhancement Request, external reference links (CAP, WHO, PathologyOutlines), Messages, user initials badge (credentials from staff record), logout. Unsaved-changes guard on logo, Intraop Queue, Registry Exceptions and bench buttons. Scan-station selector with "Go to Bench" button when the group is Active and has a page route. Registry exceptions badge shown to worklist users when something needs attention. Page-crash recovery keeps the nav bar and messages working. Background release of held reports starts in the shell.
- Workflow: Always visible after sign-in.
- Roles/permissions: screen:search:open for quick search; badge needs worklist access.
- Settings: user language; workstation scan station.
- Status: Built (Demo) — held-report release is a browser stand-in for a server job.
- Sources: src/components/AppShell/README.md, AppShell.tsx; src/components/NavBar/README.md, NavBarScanStation.tsx; useGuardedNavigate.ts

### Home page and screen access
- What it does: Home greets the user with the PubMed headline and tiles (Accession, Worklist, Search, Intraop Queue, My Contribution, Bench Contributions, Tumor Board, Configuration, Pathology Workspace hub, Quality & Compliance hub with registry-exceptions badge). Each tile shows only if the user holds screen:<name>:open; hubs show when any inner screen is allowed; routes re-check ("You don't have access to this screen"); a user with no tiles sees a message. Tiles are keyboard operable and colour-blind-safe. Add-On Orders is an action on a case, not a tile; Facility Ops Dashboards moved to Configuration > System > Display Profiles.
- Workflow: Home after login.
- Roles/permissions: screen:*:open per role (SCREEN_SEEDS, Sep 28 2026); Role Dictionary changes grants.
- Settings: Role Dictionary.
- Status: Built (Demo)
- Sources: src/pages/Home.tsx; src/services/screens/README.md, screenAccess.ts; src/components/Common/ScreenGate.tsx

### Case addressing by support reference
- What it does: Case pages open at /case/SR-xxxx-xxxx/synoptic, never the accession number. Old accession URLs redirect; an unknown reference or a case the reader cannot open shows the same neutral "case unavailable" screen. Scanned slides resolve to open-case by reference.
- Workflow: Any click that opens a case (useOpenCase).
- Roles/permissions: access check in openCaseForView.
- Settings: none
- Status: Built (Demo) — real reference issuing by the API server Planned.
- Sources: src/hooks/useOpenCase.ts; src/services/caseAddresses/; src/loaders/README.md

### Configuration shell
- What it does: Tabs Actions, AI, Macros, Templates, Staff, Protocols, System, Cytology, TAT, Validation, Voice (Demo Reset tab only in demo build). Unsaved-change guard on tab switch, voice next/previous tab, search jump, logo, breadcrumbs, nav, Sign Out and browser close; Discard prompt when closing an edited dialog. View-only for sections without capability (refusal banner). Configuration search index jumps to sections. Duplicate offered only for complex configuration.
- Workflow: Configuration page.
- Roles/permissions: screen:configuration:open; ConfigSectionGate per section.
- Settings: n/a
- Status: Built (Demo)
- Sources: src/pages/ConfigurationPage.tsx; src/constants/configSearchIndex.ts; src/services/duplication/duplicatePolicy.ts

### Connection banner, loading states and startup error screen
- What it does: A slim notice under the top bar: "Reconnecting..." or "Offline" after 2 s of lost server connection, "Connection restored" for 4 s. Loading text appears after 300 ms, "Still working..." from 3 s on every screen. If config.json is unreadable or breaks a rule the app shows a translated list of problems by setting name (never values), also for /api/config problems.
- Workflow: Automatic.
- Roles/permissions: n/a
- Settings: deployment config.json; /api/config.
- Status: Built — banner is meaningful only with an API server (local retry does nothing).
- Sources: src/components/Connectivity/ConnectionBanner.tsx; src/components/Common/LoadingState; src/startRuntimeConfigError.tsx

### Hosting regions card
- What it does: Read-only "Where PathScribe keeps data" showing database and file storage regions from the server beside the AI region.
- Workflow: Admin in AI Provider settings.
- Roles/permissions: administrators.
- Settings: server /api/config.
- Status: Built (Demo). Read-only card is built, labelled for demo, and reads server /api/config when present; region data is genuinely server supplied.
- Sources: src/components/Config/AI/HostingRegionsCard.tsx; src/services/runtimeConfig/hostingRegions.ts

### Per-person settings versus per-computer settings
- What it does: Follow the person: voice accent, learned dictation corrections, personal AI override, language, worklist sort order, Billing Log saved searches, remembered post-sign-out preference. Per workstation: scan station, OR terminal, display profile, foot-pedal bindings, companion-window positions, report screen layout. Display preferences cleared by Full Reset. Both survive blocked storage.
- Workflow: Automatic.
- Roles/permissions: n/a
- Settings: user profile.
- Status: Built (Demo) — server storage PS-345 Planned.
- Sources: src/services/userSettings/README.md; src/utils/uiPreferences.ts, workstationSettings.ts

### Profile and About menu
- What it does: Initials badge opens About: User Guide and Admin Guide (PDFs load when the menu opens), My dictionary, My voice commands, Biometric signing (when the lab policy is on, with enrolment invitation after sign-in), System Information (user role, voice profile, app version, build, AI provider, model, proxy and voice AI status; copy support report with UTC "Generated:" line, name and ID redacted).
- Workflow: Any user.
- Roles/permissions: policy via config:session-security:manage.
- Settings: Configuration > System > Session security.
- Status: Built (Demo) — System Information is reachable from About (the NavBar README calls it dead). Biometric uses a mock service.
- Sources: src/components/AppShell/AppShell.tsx (lines 1595 to 1670); NavBar.tsx SystemInfoModal; components/Profile/

### User Guide and Admin Guide
- What it does: Guide PDFs (public/help: Combined Admin Guide, User Guide v0.9.0) open in a companion window from the About menu via blob URLs; rebuilt with scripts/Update-GuideAssets.ps1. docs/product holds seller/admin documents (KNOWN_GAPS, ACTIONS_COVERAGE, GUIDE_UPDATES, CAPABILITIES and others).
- Workflow: About menu.
- Roles/permissions: all users.
- Settings: none
- Status: Built — PDFs are edited outside the repo; a public docs folder is intentionally empty.
- Sources: src/hooks/useGuideAssets.ts; public/help/; docs/public/README.md

### Resources panel and external reference links
- What it does: Admin-managed links (seed: CAP Cancer Protocols, WHO Classification, PathologyOutlines, UpToDate; enterprise or lab scope; URL validated). A viewer sees enterprise links plus links of each performing lab among visible cases, never cross-organisation. Opens in a Resources modal from the worklist.
- Workflow: Admin: System > External Resources.
- Roles/permissions: config:external-resources:manage.
- Settings: label, URL, scope, lab.
- Status: Built (Demo)
- Sources: src/services/externalResources/README.md; ExternalResourcesSection.tsx; ResourcesModal.tsx

### PubMed research headline on Home
- What it does: Home ticker shows the most recent PubMed article (no retractions, preprints, editorials, comments, letters) badged "From PubMed". Click opens a sized companion window. 24 h browser cache, 30 min backoff after HTTP 429, never blocks the dashboard, feed health with 3-day warning.
- Workflow: Admin: System > Research Feed (enabled, API base URL, article template with {PMID}, query; URLs allow-listed to nih.gov, nlm.nih.gov, doi.org over https).
- Roles/permissions: config:research-feed:manage.
- Settings: as listed.
- Status: Built (Demo) — browser calls NCBI directly; server cache Planned.
- Sources: src/services/research/README.md; PubMedTicker.tsx; ResearchFeedSection.tsx

### QA and enhancement feedback with PHI-redacted screenshot
- What it does: Two modes: enhancement (lightbulb) and QA (bug icon, restricted categories). QA button shows per Configuration > System > Feedback (instance default: shown on validation, hidden in production; always shown; always hidden) with recipients and admin cc. The modal shows a PHI-redacted screenshot to approve or discard (elements tagged data-phi/data-pii, build-time audit of untagged patient data). System details carry route pattern and support reference, never the address; typed text is checked for case numbers/MRNs with offer to replace by references (patient names and attachments not detected). Priority 1/2 tickets carry test evidence.
- Workflow: Nav bar button, modal, send.
- Roles/permissions: config:feedback:manage for settings.
- Settings: Feedback section (audited FEEDBACK_SETTINGS_CHANGED): QA recipients and cc, validation recipients, enhancement request destination URL (Partial: delivery to a website is built and tested against a stand-in; not exercised against a live website, and the demo build never sends). QA category AI / Template validation links a validation study and template and goes to the validation recipients (audited FEEDBACK_ROUTED_TO_VALIDATION).
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Server mail transport.
- Sources: src/components/EnhancementRequest/README.md; src/services/feedback/README.md; src/services/phi/README.md; supportTicketRules.ts

### Support references (non-identifying IDs)
- What it does: Random SR-XXXX-XXXX references stand in for case numbers, audit entries, errors and interface exceptions. Chip on case header and Audit Log rows creates or reveals and copies; "Find a support reference" on the Audit Log shows the entry and Open case; every lookup audited; typing SR-... in header search opens the case. Case reference is the same for all users and keys live-update topics.
- Workflow: Case header, Audit Log, header search.
- Roles/permissions: anyone who can open the case.
- Settings: none
- Status: Built (Demo) — server issuing (GET /api/cases/{caseId}/support-reference) Planned.
- Sources: src/services/supportReferences/README.md; docs/architecture/CASE_API.md section 8

### ForMedrixAI support access policy and tamper-evident audit
- What it does: Each hospital sets support access Disabled, Approval required (default) or Always allowed, with a window (30 min to 8 h, default 2 h). A request needs a ticket and a reason of 10+ characters; the approver must be in that organisation and not the requester; approve, reject, revoke; expiry. Cross-organisation case access also needs platform:cross-tenant-cases:view (audited). Support audit stream is append-only and SHA-256 hash-chained, with verify chain and CSV/JSON export.
- Workflow: ForMedrixAI requests; hospital admin approves in Configuration > System > Support Access.
- Roles/permissions: config:support-access:policy, :approve, config:support-audit:view (Admin); Superadmin reserved for ForMedrixAI.
- Settings: policy, window.
- Status: Built (Demo) (Batch 604). The browser side is complete and works against browser-side services; simulated outcomes are labelled Simulated. Waiting on the server side: Server-captured IP and country, approver e-mail/webhook, ticket system integration, tenant isolation.
- Sources: src/services/supportAccess/README.md; SupportAccessSection.tsx; docs/architecture/AUTHORIZATION_API.md

### Accessibility (WCAG 2.1 AA)
- What it does: Keyboard-operable non-button controls, named switches, named form fields, no control nested in another, focus moves to the next item after a delete, filter tiles expose pressed state, modal focus trap, AA contrast, readable charts, reduced motion on Home. Screen readers hear polite notices (someone else saved, someone opened the case). Automated axe checks cover every main screen and Configuration section; a source guard stops regressions.
- Workflow: App-wide.
- Roles/permissions: all.
- Settings: none
- Status: Built — manual NVDA/VoiceOver plan (38 scripts, PS-687) not yet run; about 17 nested-clickable places remained at Batch 566; the focus trap is used by few dialogs.
- Sources: src/utils/a11y/; src/services/accessibility/a11y.guard.test.ts; e2e/a11y.spec.ts; docs/quality/README.md

### Supported browsers and styled dropdowns
- What it does: Chrome, Edge and Firefox (current). Chrome and Edge draw dropdowns as styled panels; Firefox keeps its own dark list.
- Workflow: n/a
- Roles/permissions: n/a
- Settings: none
- Status: Built — hand check in all three open (PS-718); Safari not supported.
- Sources: src/README.md Batch 580; docs/product/FEATURE_OVERVIEW.md

#### Not yet in FEATURE_OVERVIEW.md
Checked by Grep on docs/product/FEATURE_OVERVIEW.md (no matching text):
- AI provider list and AI behavior toggles; AI call audit log; AI proxy status in System Information (only AI vendor choice and the Orchestrator are named).
- Narrative editor streaming, accept/regenerate, Suggest Synoptic from Narrative; AI draft-ready badge; Assist-mode AI drafting and LIS ingestion screen; grossing template AI refinement; AI template and macro suggestion.
- AI model catalog, Models tab and per-lab model gates; validation studies (only "Store" is named); AI contribution tab; AI vendor, WSI viewer and AI screening-result features; machine verification of AI codes.
- Voice dictation, voice profiles and accents, voice macros, report text macros, foot pedals, learned voice commands, Config > Actions editor, the 245-command catalog, hotkey clashes.
- Languages (en, fr, de, nl, ko, Belgian variants), locale formatting, Korean font, report language by lab, spell check and personal/facility dictionaries, terminology decisions.
- Terminology services screen and clinical code search; machine verification of codes.
- Every billing item: RVU Code Map, Billing Dictionary, code import and pending approvals, modifier/NCCI/HCPCS, Place of Service, financial class dictionaries, outside patient intake, CPT suggestions, billing review panel, correction engine, post-sign-out reason, charge approval, billing deficiencies, code review pool, billing type triggers, outbound charge queue, Billing Log, DFT preview, service charge record, productivity/peer comparison.
- Cytology workload cap and Screening Credit Units (only the screening-hours sign-off is named).
- Internal messaging, secure email and gateways, critical finding record and email draft, toasts, email transport, Tumor Board invites.
- Nav bar, Home tiles and screen access, case addressing by support reference, Configuration shell, profile/About menu, System Information, User/Admin Guide, Resources panel, PubMed ticker, QA/enhancement feedback with redacted screenshot, support references, per-person versus per-workstation settings, Belgian language variants.

#### Status in FEATURE_OVERVIEW.md that the code contradicts
- Computational Sidecar: the overview says "Live" with "full WCAG remediation"; the code says the Sidecar, ordering apparatus and Computational tab were deleted (constants/computationalActions.ts header; no ComputationalPanel file). Only the EMR sidecar drawer and flag audit logging remain.
- AI vendor choice: overview heading says "Live" and "All calls go through the server's AI proxy"; only the Vite dev proxy exists (no Bedrock route), the production proxy and its vendor-policy check are Planned (the body of that section does say the server check is Partial).
- ForMedrixAI Store: overview says "customer-facing model browse/download workflow is built"; "Download" only creates an adoption record, and the licence check and catalog source are mock (STORE_NOT_LICENSED), the Firestore service is a stub.
- Roles and commands: overview presents screen-aware hotkeys as settled "(Live)"; 52 known hotkey and voice clashes remain (all settled by screen-wins; a few await your decision), defaults await review, fr/de/nl/ko phrases are unreviewed machine translations, and 98 role-dictionary entries have no voice/hotkey.
- Orchestrator "Live": works only against the dev proxy with a configured AI service; the Assist-mode AI drafting path has no real LIS source or poll timer (Partial).
- Workload Tracking and Charge Capture: the overview says the rule-based part is built; one rule-based piece, frozen-section billing suggestions, exists in code but is never called (Stub), and charge dispatch (DFT, JSON, financial class payload) has no transport.
- Accessibility "Live": manual screen-reader QA is open (the overview says so); the Sidecar claim above is the only direct contradiction.

## Additions from the code-versus-inventory scan (Batch 603)

These entries were found by scanning every route, screen, folder, capability key and dialog against this inventory. Statuses are from the code.

### Protocol / template read-only reviewer view (`/template-review/:templateId`)
- What it does: Renders a synoptic protocol or template read-only so a reviewer or approver can inspect it before acting. Opened from Configuration > Protocols: "View Protocol" on an active protocol and "Open Reviewer" in the Review Queue.
- Workflow: Reviewer opens the item from the queue, reads the rendered template, returns to the queue to approve, return or publish.
- Roles/permissions: governed by the protocol lifecycle capabilities `config:protocol:approve`, `config:protocol:publish`, `config:protocol:retire` (exact gating of the viewer itself Unverified).
- Settings: none.
- Status: Built (Demo).
- Sources: SignedInApp.tsx (`TemplateRendererPage`); Config/Protocols ActiveProtocolsSection, ReviewQueueSection.

### Routes without their own entry
- `/pathology-workspace` (`PathologyWorkspacePage`): second-level hub grouping Cytology, Microtome, Embedding, Slide Distribution, Molecular and Margin Exception review. Built (Demo).
- `/add-on-orders` (`AddOnOrderPage`): add-on stains and recuts; capability `screen:add-on-orders:open`. Built (Demo).
- `/admin/parts/new`, `/admin/parts/:partId/edit` (`PartBuilderPage`): full-screen Report Part Builder. Built (Demo).
- `/admin/templates/new`, `/admin/templates/:templateId/edit` (`TemplateAssemblyPage`): Template Assembly slot-list editor. Built (Demo).
- Screen capability `screen:worklist:open` gates the Worklist.

### Support services that no entry described
- **System configuration store and change checks** (`services/systemConfig`): lab-wide settings (fonts, jurisdiction, voice, peer averages, facility time zone); a change is refused unless the person holds the owning section's capability. Built (Demo).
- **Reference check** (`services/referenceCheck`): blocks deactivating a Facility, Subspecialty, Department or Specimen Category still used by Physicians, TAT entries or Grossing Route Overrides. Built (Demo).
- **Report editing helpers** (`services/reportEditing`): unsaved-section list, Orchestrator regenerate-in-order, Sequencer reordering of specimens and synoptic reports. Built (Demo).
- **Signature records** (`services/signatures`): one record per signature applied (signed, finalized, released for countersign) with its purpose. Built (Demo).
- **New-case indicator** (`services/caseViewTracking`): per-user unread "New Cases" count on the Worklist KPI banner. Built (Demo).
- **Organisation / Site / Lab hierarchy** (`services/organisation`): `enterpriseId` links enterprise and hospital configuration; backs enterprise and hospital feature flags. Built (Demo).
- **Document rendering helpers** (`services/documentRendering`): embedded-image resolution check (below-300-DPI warning) and SVG-to-PNG for PDFs. Built (Demo).
- **Reason dictionary** (`services/reasons`): reasons by category (post-sign-out billing change, addendum, amendment, correction) plus revision-reason rules. Built (Demo).
- **Internal notes and management reviews** (`services/internalNotes`, `components/InternalNotes`): lab-internal case notes never printed on the patient report. Built (Demo).

### Dialogs without an entry
- **Station switch guard** (`StationSwitchGuardModal`): a scan that switches station with unsaved data pauses and offers Save & Switch, Discard & Switch or Cancel. Built (Demo).
- **Batch print progress** (`BatchProgressModal`, Microtome): real-time progress of "Print Batch" slide labels, one job at a time (PS-284). Built (Demo).
- **Patient History** (`PatientHistoryModal`): a patient's prior cases by master patient identity, "AI Matched Cases" (a Demonstration: `findSimilarCases` scores the seeded demonstration cases with fixed rules, cut-off 40, top 5, and does not call a language model; Planned: a real model-backed search over the laboratory's own cases), message-the-physician, with a two-identifier (name and date of birth) gate. Partial (Demo): matching by name is imperfect.
- **Biopsy array** (`CreateBiopsyArrayModal`): two or more cores into one shared cassette with ordered positions; editable. Built (Demo).
- **AI review** (`AiReviewModal`): step through AI-extracted fields with Confirm, Override, Skip, Esc. Built (Demo) against the dev proxy.
- **Cytology QC discrepancy** (`CytologyQcDiscrepancyModal`): primary and secondary diagnostic code, major or minor, reviewer commentary; shared by the QC queue and the screening page. Built (Demo).
- **Patient registry details** (`PatientRegistryDetailsModal`): post-accession edit of national identifiers and registry opt-outs from Registry Exceptions; needs `patient:national-identifier:record`, `patient:registry-consent:record`; issues an A08. Built (Demo).
- **Reason prompt** (`ReasonPromptModal`), **logout warning** (`LogoutWarningModal`), **session expiry warning** (`SessionExpiryWarningModal`), **cassette colour override** (`CassetteColorControl`), **cassette and slide label reprint with required reason** (`CassetteReprintModal`, `SlideLabelReprintModal`). Built (Demo).

### Simulated mail outbox (Configuration > System > Simulated mail outbox)
- What it does: With no mail service connected (cannot connect, or the server answers 404, 405, 501, 502, 503 or 504), every e-mail the system would send (follow-up, tumor board invite, template lifecycle, secure e-mail, critical-alert e-mail leg, support ticket and feedback, support-access approver notice) is kept in the browser, labelled Simulated, with a toast and an audit entry that carries no subject or address. Admins open each message (recipient, subject, body, attachment names) and can clear the list. A real refusal from a real server (for example 403) is never simulated.
- Workflow: Automatic when a feature sends; an administrator reviews the list.
- Roles/permissions: `config:vendor-integrations:manage` opens the section.
- Settings: none.
- Status: Built (Demo) (Batch 604). Waiting on the server side: the mail service endpoints `/api/notifications/email` and `/api/notifications/template-events`.
- Sources: services/communications/simulatedMailOutbox.ts; components/Config/System/SimulatedMailOutboxSection.tsx.

### Capability keys now quoted
`contribution:trainee-case-reference:export`, `contribution:case-mix-summary:export`; `qa:intraop-linkage:export`, `qa:reconciliation:export`, `qa:countersign-turnaround:export`, `qa:fppe-tracking:export`, `qa:drift-correction:export`, `qa:management-reviews:export`, `qa:billing-deficiencies:export`, `qa:activity-dashboard:export`; `qa:pathologist-trend:decide`; `audit:audit-log:export`, `audit:error-log:export`, `audit:interface-log:export`, `audit:qa-log:export`, `audit:billing-log:export`; `case:hold:release`, `case:retention-hold:release`; `case:peer-review:record`, `case:peer-review:override`; `case:consult-link:revoke`; `wsi:scan-batch:send`, `wsi:scan-batch:unload`; `autopsy:toxicology:result`, `autopsy:toxicology:cancel`; `print:job:cancel`, `print:job:redirect`, `print:job:retry`; `config:protocol:approve`, `config:protocol:publish`, `config:protocol:retire`; `patient:break-glass:rebind` (Batch 603). The full list with labels is `CAPABILITIES.md`.

### Workstation registry (System → Workstations)
- What it does: Registers named workstations with long-lived revocable tokens (shown once, stored as a SHA-256 hash, rotate with 24-hour grace, revoke with reason, last seen), a context binding (facility, room, discipline, functional area, point of care, printers) used as the workstation tier of print routing, and a Simulated token test.
- Workflow: Admin registers, copies the token once, rotates or revokes as needed; "Use this computer" binds the browser.
- Roles/permissions: `config:workstations:manage`, `config:workstation-tokens:manage`.
- Settings: System > Workstations; Print Routing Rules (workstation suggestions).
- Status: Built (Demo) (Batch 612). Waiting on the server side: the API server's token check and the site agent program (`docs/architecture/WORKSTATION_REGISTRY.md`).
- Sources: services/workstationRegistry; CCS/WorkstationsSection.tsx; printRouting/resolveRealPrintRoutingContext.ts.

### Scope reference (System → Scope reference)
- What it does: Explains, for nine confirmed setting areas, whether each is enterprise-wide, per performing-lab facility, enterprise with a facility override, or tiered.
- Workflow: Read-only reference.
- Roles/permissions: any role that can open System configuration.
- Settings: System > Scope reference.
- Status: Built. Works with no server.
- Sources: services/scopeReference; CCS/ScopeReferenceSection.tsx.

### Reporting feed for Power BI (System → Reporting feed)
- What it does: Lets Power BI and other reporting tools read PathScribe data through the API server. The administrator chooses which of six datasets (cases, specimens, billing, quality, workload, audit summaries) and which performing-lab facilities the feed offers, issues a token per tool (shown once, stored as a SHA-256 hash, replace with 24-hour grace, revoke with reason), and keeps identifying data out by default. Identified tokens need a named approver and a reason on record, which can be withdrawn. A field catalogue shows every column and what the de-identified feed does with it, and a Simulated pull test shows how the server would answer.
- Workflow: switch the feed on and choose datasets and facilities, create a token, copy it once into the reporting tool, replace or revoke as needed.
- Roles/permissions: `config:bi-feed:manage`, `config:bi-feed-tokens:manage`, `config:bi-feed-identified:approve`.
- Settings: System > Reporting feed (Power BI).
- Status: Built (Demo) (Batch 613). Waiting on the server side: the reporting API, the reporting copy of the data and the de-identification step (PS-787, `docs/architecture/BI_FEED_API.md`); pulls here are Simulated and return no rows.
- Sources: services/biFeed; CCS/BiFeedSection.tsx; hooks/useBiFeed.ts.

### Search on synoptic answers (Search → Synoptic answers)
- What it does: Finds cases by what a synoptic report says: choose a protocol, one of its questions, a condition (is, is not, contains, more than, at least, less than, at most, answered, not answered) and a value. Choices come from the protocol's own answers; numbers compare by value whatever the unit text. Every filter must match, and a case matches when one of its reports from that protocol has the answer. Saved searches and the search summary carry the filters.
- Workflow: open Search, add one or more answer filters under Synoptic answers, press Search cases.
- Roles/permissions: `screen:search:open`.
- Settings: none (the questions come from the protocol registry).
- Status: Built (Demo) (Batch 613). The answers are searched in the browser's case data; the API server runs the same rules in SQL (`docs/architecture/CASE_SEARCH_API.md`).
- Sources: services/caseSearch/synopticValueCriteria.ts; components/Search/Report/SynopticValueFilters.tsx.

### Case search reports (Search → Report)
- What it does: Turns the same search into a report: counts of the matching cases by pathologist, month, diagnosis, facility, case type, status, priority or subspecialty, with each group's share and median days from accession to sign-out and a total, sortable by name, count or median; click a group to see its cases. Or list the cases with columns the user chooses (standard columns and answers from synoptic reports) and orders. Reports can be saved and loaded back, and exported as CSV (counts per group, or the chosen columns for each case). The same access rules as the search apply before anything is counted.
- Workflow: run a search, press Report, choose Group by and Columns, optionally Save report or Export report CSV.
- Roles/permissions: `screen:search:open` to view; `search:case-report:export` to export (audited).
- Settings: none.
- Status: Built (Demo) (Batch 613). Built in the browser from the cases the search finds; the API server groups in SQL (`docs/architecture/CASE_SEARCH_API.md`, Reports; export kind `search.case-report`).
- Sources: services/caseSearch/caseSearchReport.ts; services/caseReports; components/Search/Report; utils/search/caseReportCsv.ts.

### Scheduled case search reports (Search → Report → Schedules)
- What it does: Sets up a saved report to run daily, weekly or monthly at a chosen time and go to chosen users as CSV, optionally covering the last N complete days each run. Lists each schedule with its next run and last run (when, cases matched, groups, rows); schedules can be run now, paused, resumed or deleted. Every change is audited without recipient identities.
- Workflow: save a report, open Schedules, choose the report, frequency, time and recipients, create.
- Roles/permissions: `search:report-schedule:manage`.
- Settings: none.
- Status: Built (Demo) (Batch 613). Runs are Simulated: the report is built in the browser and its counts kept as the last run; nothing is sent until the API server runs schedules and sends the files (`docs/architecture/SCHEDULED_REPORTS_API.md`).
- Sources: services/scheduledReports; components/Search/Report/ReportSchedulesPanel.tsx.

### Interface Dictionary (System → Interface Dictionary)
- What it does: ForMedrixAI support describes a vendor's own HL7 v2 (Z-segment), JSON or FHIR fields and maps each to an extension field on the case; tests a profile against a pasted sample; publishes it, rolls back to the previous version, or switches it off.
- Workflow: create profile, edit mappings, test, publish, roll back or retire. Every step audited without message content.
- Roles/permissions: `platform:interface-dictionary:manage`, `:publish`, `:simulate` (Superadmin only).
- Settings: System > Interface Dictionary (hidden from roles without the manage capability).
- Status: Built (Demo). Waiting on the server side: the interface engine applying published profiles to live messages (`docs/architecture/INTERFACE_DICTIONARY_API.md`).
- Sources: services/interfaceDictionary; Config/System/InterfaceDictionarySection.tsx; components/InterfaceDictionary.

### Vendor fields panel (case sidebar)
- What it does: Shows the extension fields a vendor's message added to the case, read-only, with vendor, profile version and time; values tagged for redaction; labelled Simulated in the demo. Renders nothing when there are none.
- Workflow: Open a case; the panel appears in the sidebar when fields exist.
- Roles/permissions: anyone who can open the case.
- Settings: none.
- Status: Built (Demo). Waiting on the server side: live messages applying profiles.
- Sources: components/VendorFields/VendorFieldsPanel.tsx; pages/SynopticReportPage/components/Sidebar.tsx.

### Mapping scope guard (Interface Dictionary)
- What it does: Refuses a mapping onto the case's own structure (patient, order, specimen, diagnosis, report, signature, billing) as it is typed and again at test and publish; lists what mapping handles and what needs a code release.
- Workflow: Automatic; reference list on the Interface Dictionary screen.
- Roles/permissions: n/a (applies to every mapping).
- Settings: none.
- Status: Built (Demo). The API server must repeat the check.
- Sources: services/interfaceDictionary/scopeGuard.ts; components/InterfaceDictionary/ScopeReference.tsx.

- **Access to a patient's other cases** (`RestrictedCasesNotice`, `services/patientCaseAccess`): count of cases out of reach, request with reason, approve/decline/revoke by the assigned pathologist or an administrator, open until revoked, audited; needs `patient:other-cases:request-access`, `patient:other-cases:decide-access`. Built (Demo).

### Related cases at sign-out (sign-out view)
- What it does: Tells the signer, inline, that the patient has other released cases they may open, lists each with the ordering and copy-to physicians (none pre-ticked), shows the chosen reports in full inside the sign-out view, fixes them at sign-out, and prints, exports and sends exactly that section with the signed report. A later amendment of a related case raises a flag without changing the attached section. Up to 10 cases. Sits beside the notice of cases the user cannot open (Access to a patient's other cases).
- Workflow: start sign-out, tick the cases to include, read the preview, sign out.
- Roles/permissions: `report:related-cases:attach` (pathologists, fellows).
- Settings: none.
- Status: Built (Demo) (Batch 613). The choice is kept in browser storage; the server stores it with the signed report version (`docs/architecture/RELATED_CASES_API.md`).
- Sources: services/relatedCases; components/RelatedCases; pages/SynopticReportPage/modals/CaseSignOutModal.tsx; functions/main.py.

### Patient summary print (Patient History)
- What it does: Prints a summary of chosen released cases of the patient (and linked identities) in date order, with diagnoses and the accession of each source case, headed as a summary and not a signed report. Only cases the user may already open are offered. Audited with counts only.
- Workflow: open Patient History, tick cases (or Select all), Print summary.
- Roles/permissions: `patient:summary:print` (all case-access roles).
- Settings: none.
- Status: Built (Demo) (Batch 613).
- Sources: services/relatedCases/patientSummary.ts; components/RelatedCases/PatientSummaryPanel.tsx.

### Intraoperative diagnosis in the report output (report PDF, text and outbound result)
- What it does: The intraoperative (frozen section) diagnosis is part of the case report: shown in the report preview, printed after the case header in the PDF and text copy, and sent in the outbound result, like an addendum. Before Batch 613 it appeared on screen only.
- Workflow: none; it appears once the intraoperative session is merged into the case.
- Roles/permissions: none beyond printing the report.
- Settings: none.
- Status: Built (Demo) (Batch 613); redeploy `functions/`.
- Sources: services/reports/intraopDiagnosisForCase.ts; pages/ReportPreview/ReportPreviewRenderer.tsx; functions/main.py.

### Text editor voice and hotkey commands (bold, lists, indent, find and replace, table, signature line, ruler)
- What it does: The report text editor can be driven by voice or key: Bold, Italic, Underline, Bullets, Numbered List, Increase and Decrease Indent, Find in Text, Replace in Text (opens on the Replace tab), Select All Text, Insert Table (opens the size picker), Insert Signature Line, Next and Previous Section (moves to the next or previous heading), Show / Hide Formatting Marks and Show / Hide Ruler. Keys are Ctrl+Alt+1 to 9 and 0 and Ctrl+Alt with . , / [ ] ; and phrases are in five languages. They act on the editor that last had the cursor; in a read-only editor the ones that change the text do nothing. The ruler is new (centimetre ticks above the text).
- Workflow: Say the phrase or press the key while the cursor is in a report text box on the report screen; the toolbar buttons still work.
- Roles/permissions: the 16 `editor.*` Role Dictionary commands (granted to the job roles by default); a command only triggers, capabilities decide access.
- Settings: Configuration > Actions (keys and phrases).
- Status: Built (Demo) (Batch 614).
- Sources: components/Editor/editorCommands.ts; components/Editor/editorFocus.ts; components/Editor/PathScribeEditor.tsx; services/actionRegistry/mockActionRegistryService.ts.

### Permission-only commands settled (no voice phrase of their own, each with a reason)
- What it does: The 82 Role Dictionary entries without a voice phrase or hotkey are each classified: covered by another command (for example Save Draft, Sign Out Case, Preview Report, Select Template, Open Configuration), a screen or list you open, needing a person or value picked on screen, or a deliberate click only (delete, archive, revoke sign-out, deliver, submit claim, data exports, impersonate). A guard test fails if a new one is unclassified or a covering command stops existing.
- Workflow: none; this is an accounting of the commands list.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Batch 614).
- Sources: services/actionRegistry/permissionOnlyActions.ts; actionsCoverage.guard.test.ts; docs/product/ACTIONS_COVERAGE.md.

### Mac Option and AltGr hotkeys
- What it does: Hotkeys work when Option (Mac) or AltGr (European keyboards) changes the typed character: the key is read from the physical key, AltGr counts as Alt and never fires a Ctrl+Alt shortcut, and a press that typed a character in a text field is typing, not a hotkey. Recording a hotkey in Configuration > Actions follows the same rules. Windows, Linux, AZERTY and QWERTZ keep matching what is printed on the key.
- Workflow: none; automatic.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Batch 614); tested with simulated key presses, not yet on a Mac or an AltGr keyboard.
- Sources: services/actionRegistry/shortcutResolution.ts; contexts/VoiceProvider.tsx; components/Config/Actions/ActionsTab.tsx.

### Code Manager searches for flagged findings (PS-138)
- What it does: When a synoptic answer matches an active abnormal-detection trigger rule, the Code Manager lists the finding (field: value) above the code-system tabs. Choosing it switches to SNOMED, selects that finding's specimen and fills the search box with the field and value; the live terminology search then returns real candidates. Nothing is searched until the finding is chosen, and nothing is applied until a result is chosen.
- Workflow: Open Codes on the report screen, press the finding, edit the words if wanted, pick a result.
- Roles/permissions: same as the Code Manager (no new permission).
- Settings: abnormal detection switch (enterprise and facility); trigger rules (Config > System); code-system policy (SNOMED must be allowed).
- Status: Built (Demo) (Batch 615). Results need the UMLS key on the server side of the search.
- Sources: services/abnormalDetection/triggerCodeQueries.ts; pages/SynopticReportPage/hooks/useTriggerCodeQueries.ts; pages/Synoptic/Codes/AddCodeModal.tsx.

### Server versions of billing, cytology, molecular and registry services (PS-498, PS-499, PS-500, PS-504)
- What it does: 52 services have an API-server version (one route per interface method) chosen by configuration; the mock stays the demonstration default.
- Workflow: none; automatic once an API server address is configured.
- Roles/permissions: none; the server decides permission.
- Settings: the API server address in `config.json`.
- Status: Built (Demo) (Batch 616). Waiting on the server side: the endpoints (India team).
- Sources: services/<area>/http<Name>Service.ts; services/<area>/<name>ServiceInstance.ts; docs/architecture/BILLING_API.md, CYTOLOGY_API.md, MOLECULAR_API.md, REGISTRY_API.md.

### Server versions of staff, access and lab dictionary services (PS-484, PS-507, PS-512)
- What it does: With an API server address configured, the audit log, authorization checks, staff, roles, facilities, screening-registry settings, access requests, session time-out and the lab dictionaries use the API server; the demo uses the mock. Authorization asks the server for each decision and fails closed.
- Workflow: none; automatic by deployment.
- Roles/permissions: unchanged; the server checks each action's own capability.
- Settings: the API server address in config.json.
- Status: Built (Demo) (Batch 616). The browser side is complete and tested with a fake server; waiting on the server side: the endpoints in STAFF_ADMIN_API.md, ACCESS_SESSION_API.md, LAB_DICTIONARIES_API.md. Biometric: server version built, screens not yet moved onto it.
- Sources: services/auditlog/httpAuditService.ts; services/authorization/httpAuthorizationService.ts; services/users/httpUserService.ts; services/roles/httpRoleService.ts; services/facilities/httpFacilityService.ts; services/facilities/httpRegistrySettingsService.ts; services/access/httpAccessRequestService.ts; services/session/httpSessionTimeoutService.ts; services/biometric/httpBiometricService.ts; services/departments, locations, containerTypes, inkColors, cassetteColors, physicians, reasons http*Service.ts.

### Server versions of report, accessioning, patient and encounter services (PS-483, PS-503, PS-505)
- What it does: 14 services have an API-server version chosen by configuration (amendments, informal reviews, LIS amendment notices, release buffer, report change log, report parts, order intake, drafts, patient index, encounters, patient history, and the LIS sync, result, accession and patient ADT queues); the mock stays the demonstration default.
- Workflow: none; automatic once an API server address is configured.
- Roles/permissions: none; the server decides permission.
- Settings: the API server address in `config.json`.
- Status: Built (Demo) (Batch 616). Waiting on the server side: the endpoints (India team). Follow-up tracking has no server version yet.
- Sources: services/<area>/http<Name>Service.ts; services/reports/reportServicesInstance.ts; services/patients/patientServicesInstance.ts; docs/architecture/REPORTS_API.md, ACCESSIONING_API.md, PATIENTS_API.md.


### Server versions of interface, model, protocol, template, routing, macro, flag, message and AI-policy services (PS-509, PS-511, PS-513, PS-515)
- What it does: 20 services (interface exceptions, order-created events, LIS staging queue, AI models, model store, protocols, fixative and processing-format dictionaries, template suggestion signals, narrative edit signals, report templates, routing rules, print routing rules, text macros, voice macros, stain order macros, case flags, secure messaging settings, internal messages, AI vendor policy) have an API-server version beside the mock. With an API server address the server version is used; the demo keeps the mock.
- Workflow: none; automatic once an API server address is configured.
- Roles/permissions: none; the server decides permission.
- Settings: the API server address in `config.json`.
- Status: Built (Demo) (Batch 616). Waiting on the server side: the endpoints (India team); contracts in `docs/architecture/` (`INTERFACE_EXCEPTIONS_API.md`, `INTERFACE_ENGINE_API.md`, `LIS_INGESTION_API.md`, `MODELS_API.md`, `PROTOCOLS_API.md`, `TEMPLATE_SIGNALS_API.md`, `REPORT_TEMPLATES_API.md`, `ROUTING_API.md`, `MACROS_API.md`, `FLAGS_AND_MESSAGES_API.md`, `AI_VENDOR_POLICY_API.md`).
- Sources: services/<area>/http<Name>Service.ts; services/<area>/<name>ServiceInstance.ts; services/apiServer/httpServiceKit.ts.

### Production-build and same-origin guards (PS-486, PS-488)
- What it does: A test fails if demonstration screens, demo accounts or the Simulated authenticator are reachable without the demo-tools switch, if AI or terminology-search code names an outside host, or if the UMLS and AI routes leave `/api`.
- Workflow: none; runs with the tests.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Batch 616). Not covered: the mock services are still bundled in a server build; the public NLM look-up is called directly (allowed by the security headers).
- Sources: services/apiServer/productionBuild.guard.test.ts; vite.config.ts.

### Server versions: quality, validation studies and deficiencies (PS-501)
- What it does: the 11 quality, validation studies and deficiencies services have an API-server version beside the mock (ValidationStudyService, DeficiencyTypeService, ResolutionTypeService, ManagementReviewService, SpecimenDeficiencyService, QaActivityRecordService, QaActivityTypeService, QaSupervisionAssignmentService, QaSupervisionAssignmentTypeService, ReconciliationService, SurgicalPeerReviewRiskWeightService); the browser uses it when an API server address is configured, the mock otherwise.
- Workflow: none; automatic by configuration.
- Roles/permissions: none new; the server decides permission and returns a fixed code.
- Settings: API server address (`config.json`).
- Status: Built (Demo) (Batch 616). The browser side is complete and tested with a fake server; waiting on the server side: the endpoints (`docs/architecture/QUALITY_API.md`, India team).
- Sources: services/<area>/http<Name>Service.ts; services/<area>/<name>ServiceInstance.ts; docs/architecture/QUALITY_API.md.

### Server versions: digital pathology and image association (PS-502)
- What it does: the 8 digital pathology and image association services have an API-server version beside the mock (AiScreeningResultService, AiStalledResultSettingsService, DpVendorService, WsiScanBatchService, WsiViewerVendorService, GrossImagingVendorService, ImageManagementSystemVendorService, ImageUploadService); the browser uses it when an API server address is configured, the mock otherwise.
- Workflow: none; automatic by configuration.
- Roles/permissions: none new; the server decides permission and returns a fixed code.
- Settings: API server address (`config.json`).
- Status: Built (Demo) (Batch 616). The browser side is complete and tested with a fake server; waiting on the server side: the endpoints (`docs/architecture/DIGITAL_PATHOLOGY_API.md`, India team).
- Sources: services/<area>/http<Name>Service.ts; services/<area>/<name>ServiceInstance.ts; docs/architecture/DIGITAL_PATHOLOGY_API.md.

### Server versions: grossing hardware, cassette routing and dictionaries (PS-506)
- What it does: the 6 grossing hardware, cassette routing and dictionaries services have an API-server version beside the mock (GrossingHardwareProfileService, GrossingRoutingOverrideService, CassetteRoutingRuleService, SpecimenDictionaryService, HardwareContainerRegistryService, ScanStationService); the browser uses it when an API server address is configured, the mock otherwise.
- Workflow: none; automatic by configuration.
- Roles/permissions: none new; the server decides permission and returns a fixed code.
- Settings: API server address (`config.json`).
- Status: Built (Demo) (Batch 616). The browser side is complete and tested with a fake server; waiting on the server side: the endpoints (`docs/architecture/GROSSING_ROUTING_API.md`, India team).
- Sources: services/<area>/http<Name>Service.ts; services/<area>/<name>ServiceInstance.ts; docs/architecture/GROSSING_ROUTING_API.md.

### Server versions: reagents, cold chain and label hardware (PS-508)
- What it does: the 6 reagents, cold chain and label hardware services have an API-server version beside the mock (ReagentLotService, StorageConditionTypeService, StorageUnitService, TelemetryReadingService, LabelLayoutService, PrinterProfileService); the browser uses it when an API server address is configured, the mock otherwise.
- Workflow: none; automatic by configuration.
- Roles/permissions: none new; the server decides permission and returns a fixed code.
- Settings: API server address (`config.json`).
- Status: Built (Demo) (Batch 616). The browser side is complete and tested with a fake server; waiting on the server side: the endpoints (`docs/architecture/REAGENTS_LABELS_API.md`, India team).
- Sources: services/<area>/http<Name>Service.ts; services/<area>/<name>ServiceInstance.ts; docs/architecture/REAGENTS_LABELS_API.md.

### Server versions: intraoperative and operations dashboards (PS-510)
- What it does: the 4 intraoperative and operations dashboards services have an API-server version beside the mock (IntraoperativeService, OrEventLogService, OrSuiteTerminalService, DisplayProfileService); the browser uses it when an API server address is configured, the mock otherwise.
- Workflow: none; automatic by configuration.
- Roles/permissions: none new; the server decides permission and returns a fixed code.
- Settings: API server address (`config.json`).
- Status: Built (Demo) (Batch 616). The browser side is complete and tested with a fake server; waiting on the server side: the endpoints (`docs/architecture/INTRAOP_OPS_API.md`, India team).
- Sources: services/<area>/http<Name>Service.ts; services/<area>/<name>ServiceInstance.ts; docs/architecture/INTRAOP_OPS_API.md.

### Follow-up tracking by commands, and the biometric flow (server versions)
- What it does: Follow-up tracking has a server version that works by commands (mark expected, record an outcome, reopen, email the ordering clinician); the server works out the window, status and actor. Biometric enrolment, verification, the policy card and the post-sign-in invitation go through one flow: the labelled Simulated demo check, or the API server's challenge and verification (no simulated fallback).
- Workflow: unchanged for the person; the server address decides which version runs.
- Roles/permissions: none new (`case:follow-up:expect`, `qa:follow-up:record`, `qa:follow-up-clinician:email`, `config:session-security:manage` as before); the server decides permission.
- Settings: API server address (`config.json`).
- Status: Built (Demo) (Batch 616). The browser side is complete and tested with a fake server; waiting on the server side: the follow-up commands (`FOLLOW_UP_API.md`, Browser commands) and the biometric calls (`ACCESS_SESSION_API.md` 3 and 3a), India team. Not tried on a real authenticator against a server.
- Sources: services/followUp/IFollowUpService.ts; services/followUp/httpFollowUpService.ts; services/followUp/mockFollowUpService.ts; services/followUp/followUpServiceInstance.ts; services/biometric/IBiometricFlow.ts; services/biometric/serverBiometricFlow.ts; services/biometric/mockBiometricFlow.ts; services/biometric/biometricFlowInstance.ts.

### Terminology look-ups through the API server (PS-488)
- What it does: with an API address configured, ICD-10-CM, ICD-11 and LOINC searches go to a same-origin server route that holds credentials and caches; the browser names no NLM host and a server deployment's security policy does not allow one. Without an API address the demonstration calls NLM directly.
- Workflow: none for the user; the Code Manager and code search behave as before.
- Roles/permissions: same as code search (no new permission).
- Settings: `terminologyViaServer` in the deployment's origins file; `VITE_API_BASE_URL`.
- Status: Built (Demo) (Batch 617). Waiting on the server side: the `/api/terminology/nlm/…` routes (TERMINOLOGY_PROXY_API.md).
- Sources: services/terminologySearch/nlmLookupRoute.ts; services/terminologySearch/codeSearchService.ts; deploy/security-headers/securityHeaders.mjs; docs/architecture/TERMINOLOGY_PROXY_API.md.

### Deployment switch for biometric sign-in (PS-512)
- What it does: a deployment can turn biometric sign-in off for everyone (`VITE_BIOMETRIC_SIGN_IN=false`), whatever the lab's policy says; Session Security shows why the switch is disabled.
- Workflow: none; passwords are used for sign-off.
- Roles/permissions: none (a deployment setting).
- Settings: `VITE_BIOMETRIC_SIGN_IN` (build or config.json).
- Status: Built (Batch 617).
- Sources: services/biometric/biometricDeploymentSwitch.ts; services/biometric/biometricFlowInstance.ts; components/Config/System/BiometricPolicyCard.tsx.

### One route style for every server version of a service (PS-488)
- What it does: every API-server version of a service uses the same route and verb convention (`/api/<area>/<service>/<method-kebab>`; GET for plain-value reads, POST otherwise); about 85 earlier REST-style versions were converted and an automated test fails on any other shape.
- Workflow: none for the user; the server team builds one route pattern.
- Roles/permissions: none; the server decides permission.
- Settings: none.
- Status: Built (Demo) (Batch 617). Waiting on the server side (India team).
- Sources: services/apiServer/httpServiceKit.ts; services/apiServer/httpRoutes.guard.test.ts; docs/architecture/HTTP_SERVICES_PATTERN.md; docs/architecture/HTTP_ROUTE_MAPPING.md.

### Server versions of delivery, print, delegation, dictionary, equipment and migration services (PS-514)
- What it does: 26 services have an API-server version (one route per interface method) chosen by configuration; the mock stays the demonstration default. Three interfaces were written for services that had none (label reprint runs, LIS sync, feedback settings).
- Workflow: none; automatic once an API server address is configured.
- Roles/permissions: none; the server decides permission.
- Settings: the API server address in `config.json`.
- Status: Built (Demo) (Batch 617). Waiting on the server side: the endpoints (India team).
- Sources: services/<area>/http<Name>Service.ts; services/<area>/<name>ServiceInstance.ts; docs/architecture/DELIVERY_PRINTING_API.md, DELEGATIONS_NOTES_API.md, CONFIG_DICTIONARIES_API.md, EQUIPMENT_MIGRATION_API.md.

### Server versions of settings, dictionaries, case workflows and critical results services (PS-514)
- What it does: 29 more services have an API-server version (one route per interface method; case search keeps its documented routes) chosen by configuration; the mock stays the demonstration default. Nothing that names a patient or carries a token goes in a URL.
- Workflow: none; automatic once an API server address is configured.
- Roles/permissions: none; the server decides permission.
- Settings: the API server address in `config.json`.
- Status: Built (Demo) (Batch 617). Waiting on the server side: the endpoints (India team).
- Sources: services/<area>/http<Name>Service.ts; services/<area>/<name>ServiceInstance.ts; docs/architecture/CONFIG_SERVICES_API.md, CASE_WORKFLOWS_API.md, CRITICAL_RESULTS_API.md.

### Server versions of quality, referral, search, signature, dictionary, tumor board and workstation services (PS-514, PS-501)
- What it does: 28 services have an API-server version (one route per interface method) chosen by configuration; the mock stays the demonstration default.
- Workflow: none; automatic once an API server address is configured.
- Roles/permissions: none; the server decides permission.
- Settings: the API server address in `config.json`.
- Status: Built (Demo) (Batch 617). Waiting on the server side: the endpoints (India team).
- Sources: services/<area>/http<Name>Service.ts; services/<area>/<name>ServiceInstance.ts; docs/architecture/QUALITY_SETTINGS_API.md, REFERRAL_RESEARCH_API.md, SEARCH_REPORTING_API.md, SIGNATURES_SMART_CAPTURE_API.md, DICTIONARIES_CONFIG_API.md, TUMOR_BOARD_API.md.

### Roles list names the actions added by Batches 613 to 616
- What it does: The Role Dictionary lists 16 more actions (attach related cases, patient summary print, case access request/approve/deny/revoke, case search report save/export/schedule, follow-up expect/record/reopen/email, flagged-finding code search, biometric enrol/disable). Each has default grants that follow the matching capabilities, and a reason why it has no voice phrase or hotkey.
- Workflow: Configuration > Staff > Role Dictionary.
- Roles/permissions: roles-list grants never widen access; capabilities decide.
- Settings: Role Dictionary grants per role.
- Status: Built (Demo) (Batch 617).
- Sources: constants/systemActions.ts; constants/defaultActionGrants.ts; services/actionRegistry/permissionOnlyActions.ts; docs/product/ACTIONS_COVERAGE.md.

### Server version of case material (PS-482)
- What it does: A decant change (add, change, delete) is saved by one atomic call through `caseMaterialService`; the demo's version runs in the browser, the API server's version posts to `/api/material/case-material/apply-decant-change`.
- Workflow: Material tab on the report screen and the microtome workstation.
- Roles/permissions: deleting a decant needs `case:decant:delete`, checked in the service (demo) and by the server.
- Settings: API server address (config.json).
- Status: Built (Demo) (Batch 618). Waiting on the server side: the route in CASE_MATERIAL_API.md.
- Sources: services/material/httpCaseMaterialService.ts; services/material/caseMaterialServiceInstance.ts; docs/architecture/CASE_MATERIAL_API.md.

### Partial nephrectomy drawing: adrenal and Gerota's fascia only when reported (PS-492)
- What it does: A partial nephrectomy's map always draws the perinephric fat, draws Gerota's fascia only for the extent "Beyond Gerota's fascia" and the adrenal only for "contiguous adrenal"; a radical nephrectomy is unchanged.
- Workflow: Anatomical map on the report screen.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Demo) (Batch 618). Tested for none, adrenal, Gerota, both and both sides; not yet looked at by eye.
- Sources: services/organMapping/renalAnatomy.ts; services/organMapping/renalGeometry.ts; services/organMapping/resolveRenalMap.ts; services/organMapping/renalMap.test.ts.

### File-size ratchet guard (PS-497)
- What it does: A test fails if a source file over 1,000 lines grows, if a new one crosses 1,000 lines, or if a file that shrank keeps its old number; 35 files are recorded.
- Workflow: none; runs with the tests.
- Roles/permissions: none.
- Settings: none.
- Status: Built (Batch 618).
- Sources: services/styleRules/fileSize.guard.test.ts; services/styleRules/fileSizeBaseline.ts.

### Second facility for the technical component (PS-336)
- What it does: A consultation or outside case can name the lab that did the technical work (`order.technicalComponentFacilityId`, set at accessioning). The technical charge goes to that lab at grossing, the professional line stays with the reporting lab until sign-out, and the signed-out report names the technical lab (name and address; no director or CLIA).
- Workflow: Accession screen or Case team window; billing at grossing and sign-out; signed-out report.
- Roles/permissions: existing Case team permission for later changes; changes are audited with facility ids only.
- Settings: none.
- Status: Built (Demo) (Batch 618).
- Sources: services/accessioning/resolveTechnicalFacilityOffer.ts; services/billing/resolveChargeFacilities.ts; services/billing/jsonWebhookBuilder.ts; services/facilities/technicalFacilityAudit.ts; pages/AccessionPage/AccessionTechnicalFacilityField.tsx; functions/main.py.

### Delivery schedules (PS-800)
- What it does: Configuration > System > Delivery Schedules. When each feed (report delivery, billing, results, ADT, accession, LIS sync, and each registry separately) goes out: immediately, in set hours, in daily/weekly/monthly batches with a cutoff, held until sign-out, or a review hold after sign-out. Enterprise schedule with performing-facility overrides; registries add a reporting deadline and an amendment re-queue flag; a test panel.
- Workflow: Configuration > System > Delivery Schedules; the outbound queue reads the resolved schedule.
- Roles/permissions: `config:delivery-schedules:manage` (Admin, Lab Director).
- Settings: the schedules themselves.
- Status: Built (Demo) (Batch 619).
- Sources: services/deliverySchedules/deliverySchedule.ts; services/deliverySchedules/mockDeliveryScheduleService.ts; components/Config/System/DeliverySchedulesSection.tsx.

### Billing release rules (PS-800)
- What it does: Configuration > System > Billing Release. When a generated charge is released from the Outbound Queue to billing, per billing type (TC, -26, Global): at once, after a review hold, in a batch, or only by a person; optional narrowing by case type, ordering site, primary pathologist and amended/original. Enterprise default with performing-facility overrides. Unmapped CPT, missing technical-component facility and amendment delta charges go to review; amendment or retraction cancels unsent charges. A live check panel.
- Workflow: Configuration > System > Billing Release; the Outbound Queue's billing feed shows the release time, review reason, override and retraction.
- Roles/permissions: `config:billing-release:manage` (Admin, Lab Director); releasing from the queue uses `interface:outbound:release`.
- Settings: the release rules themselves.
- Status: Built (Demo) (Batch 619).
- Sources: services/billingRelease/billingRelease.ts; services/billingRelease/billingReleaseFeed.ts; services/billingRelease/mockBillingReleaseService.ts; components/Config/System/BillingReleaseSection.tsx.

### Outbound Queue (PS-800)
- What it does: Home > Quality & Compliance > Outbound Queue. Every outbound message (results, ADT, accession, LIS sync, billing charges, report delivery, cytology results, referrals, molecular orders, registry submissions) in one list; filter, sort, bulk hold, release and retry; registry rejections with error codes, correction due date, resubmit with a reason or mark not reportable; reporting-deadline flags; amended-report links; billing needs-review, retract and release now.
- Workflow: pick messages, choose an action, give a reason where asked; each change is audited without patient text.
- Roles/permissions: `screen:outbound-queue:open`, `interface:outbound:hold`, `interface:outbound:release`, `interface:outbound:resend`, `interface:outbound:mark-not-reportable`, `interface:outbound:retract`, `interface:outbound:override-release` (Admin).
- Settings: schedules (Delivery Schedules) and billing release rules supply the times, deadlines and review reasons.
- Status: Built (Demo) (Batch 619).
- Sources: services/outboundQueue/; pages/OutboundQueuePage/; hooks/useOutboundQueue.ts.


### UK cancer registry (COSD): destination, checks and correction window (PS-800)
- What it does: Configuration > System > UK Cancer Registry (COSD). The enterprise default and each performing facility's own settings for the UK registry: how it is sent (a label: secure API, SFTP or portal upload) and how many working days (default 5, Monday to Friday, skipping the lab's own bank-holiday list) a rejected submission has to be corrected. The Outbound Queue shows the rejection with its correction due date. A sample check holds back what PathScribe can see is wrong (NHS number length and check digit, dates, ICD-O-3 shape, missing items) and shows a labelled preview, which is PathScribe's simplified model and not the official COSD file.
- Workflow: Configuration > System > UK Cancer Registry (COSD); the Outbound Queue's registry feed reads the settings; resubmitting a correction is the queue's own retry with a reason.
- Roles/permissions: `config:cosd-destination:manage` (Admin, Lab Director).
- Settings: the destination settings; the registry's reporting deadline stays in Delivery Schedules.
- Status: Built (Demo) (Batch 620 part C). Not the official COSD schema; the rules in `COSD_RULES_NEEDING_SPEC` still need the published NHS England / NCRAS specification; the real file, transport and acknowledgements are the interface engine's; nothing was tried against a real server or registry.
- Sources: services/cosd/; components/Config/System/CosdDestinationSection.tsx; services/outboundQueue/registryFeedAdapter.ts.

### AI extraction of historical reports (Batch 621)
- What it does: when a historical case is opened in the patient history, the AI reads its Final Diagnosis and Microscopic text through the existing synoptic capability (`callAi`, feature `history-extraction`, so the PS-558 vendor policy applies) and shows the matched template (a guess) and its fields beside the text, labelled "AI-extracted, not verified". Cached by a hash of the text; runs in the background on open or refresh; a failure is recorded with a fixed code and never breaks the history. Advisory only: never read by reports, printing, registries, billing, rules or exports (`advisoryOnly.guard.test.ts`).
- Workflow: Patient history > a historical case > the panel beside its text; "Check again" retries; "Flag as wrong" records a miss for accuracy measurement.
- Roles/permissions: `ai:history-extraction:run` and `ai:history-extraction:flag` (Pathologist, Fellow, Resident).
- Settings: Configuration > System > AI history extraction (off by default).
- Status: Built (Demo) (Batch 621). Works against browser-side services; the server side is not built (contract `HISTORY_AI_EXTRACTION_API.md`). Not built: extraction when an Assist-mode LIS summary arrives (no user to authorise it).
- Sources: services/historyExtraction/; services/aiIntegration/synopticFieldsPrompt.ts; components/PatientHistory/HistoryExtractionPanel.tsx.

### AI history extraction setting (Batch 621)
- What it does: Configuration > System > AI history extraction. Turns the AI reading of historical reports on or off for the enterprise, with a performing-facility override; off unless turned on. Shows accuracy counts (reports read, fields extracted, flagged as wrong).
- Workflow: Configuration > System > AI history extraction.
- Roles/permissions: `config:history-extraction:manage` (Admin, Lab Director).
- Settings: the setting itself.
- Status: Built (Demo) (Batch 621).
- Sources: services/historyExtraction/; components/Config/System/HistoryExtractionSection.tsx.

### US ePath state registry reporting (PS-800)
- What it does: Configuration > US ePath. HL7 v2.5.1 ePath base message with a profile per state (required and optional fields, transport, checks, field extensions); routing by the performing facility's state; reports failing a check held for review with fixed codes; queue entries on the registry feed.
- Workflow: Configuration > System > US ePath; the Outbound Queue's registry feed lists submissions.
- Roles/permissions: `config:us-epath:manage` (Admin, Lab Director).
- Settings: the profiles and each facility's choice.
- Status: Built (Demo) (Batch 620 part E). Only an example profile ships; real state profiles and OBX identifiers to be confirmed against the NPCR guide.
- Sources: services/usEpath/; services/hl7/epathBuilder.ts; components/Config/System/UsEpathSection.tsx.

### Registry batch files (PS-800)
- What it does: Configuration > System > Registry Batch Files. Profiles for screening programmes and registries that take a CSV or XML file: columns, delimiter, header row, file name pattern, formula-safe cells; make the file now; records missing a required field held back; run manifests with checksums; the registry's file-level answer applied to each record. NAACCR XML is a slot that cannot be turned on.
- Workflow: Configuration > System > Registry Batch Files; the Outbound Queue's registry feed lists the programmes' submissions; the registry's delivery schedule says when a file is made.
- Roles/permissions: `config:batch-registry-feed:manage` (Admin, Lab Director); `registry:batch-file:generate` (Admin).
- Settings: the profiles; schedules stay in Delivery Schedules.
- Status: Built (Demo) (Batch 620 part S). No real programme layout is shipped; NAACCR XML output Planned.
- Sources: services/batchRegistryFeed/; components/Config/System/BatchRegistryFeedSection.tsx; services/screeningRegistry/submitScreeningRegistryResult.ts.

### Spain and Spanish, the sixth language (Batch 622)
- What it does: Spain as a jurisdiction (CIE-10-ES label, es-ES dates, 24-hour clock, DNI/NIE pattern) and Castilian Spanish as the sixth interface and report language, with the Español (España) voice profile, Spanish spoken punctuation, Spanish dictation refinement, the Spanish spell-check dictionary (RLA-ES, MPL-1.1) and a starter pathology word list.
- Workflow: Configuration > Facilities > Jurisdiction (Spain); language switcher (ES); Configuration > Voice (profile); report language per facility.
- Roles/permissions: the existing facility, voice and language settings; no new capability.
- Settings: facility jurisdiction, report language, voice profile.
- Status: Partial (Batch 622). The translation is AI-produced and needs native-speaker clinical review. Not built: Spanish cervical screening intervals and programmes, regional cancer registry profiles, e-invoicing, SNOMED CT Spanish edition, CIE-10-ES tables, Catalan, Basque and Galician.
- Sources: i18n/locales/es.json; types/systemConfig.ts; constants/voiceProfiles.ts; contexts/punctuationMaps.ts; services/spellcheck/; spellcheck-data/es/.

