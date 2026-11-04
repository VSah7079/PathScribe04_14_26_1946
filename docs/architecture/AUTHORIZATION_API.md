# AUTHORIZATION_API.md: capabilities checked in context

**Status:** phases 1 and 2 built in the browser (Batches 369 and 370;
PS-355, PS-356); phase 3, the remaining real permissions, is being added
screen by screen (245 capabilities as of Batch 499, Oct 9, 2026; 244 as of Batch 495 — this said 232 "as of Batch 480" and had fallen behind the catalog; it said 88, as of Batch 425, until Batch 467b corrected it: see
[the capability catalog](#capability-catalog-system-capabilities) below). The
API server part described here is phase 4 (PS-358) and is not built yet.

Design: "PathScribe Access Control: Capabilities in Context" (the design doc
linked from PS-355). Browser code: [`src/services/authorization/`](../../src/services/authorization/README.md).

## The model

- A **capability** is a single thing PathScribe enforces, named
  `domain:object:verb` with the verb last: `qa:fppe-tracking:export`,
  `report:change-history:export`.
- The **catalog** (`capabilityCatalog.ts`) is the only list. Each entry has
  its key, its admin-facing group, a risk level, and the capabilities it
  **requires**. A key is added when its check is added, never before; a
  guard test fails the build otherwise.
- A **role** grants capabilities (`Role.capabilities`). A **staff member**
  holds roles (`StaffUser.roles`) and a facility assignment
  (`StaffUser.facilityIds`, empty = all). Scope belongs to the assignment,
  not the role (Batch 370).
- **Superadmin** is a built-in role, reserved for ForMedrixAI support staff
  (Pete, Batch 371). It always holds every capability, and there is no
  bypass in the check. It is held only through a support sign-in, can't be
  assigned to a hospital's staff, and can't be changed by a hospital.
- **Platform-only capabilities** (`platform:*`) count only from Superadmin.
  A hospital role can't hold them.

## The check

```
can(user, capability, context) → decision
```

Allowed when all three hold:
- a role the user holds grants the capability;
- every capability it requires is granted too, by the same role or another held role;
- the action is within the user's facility assignment.

An assignment limited to some facilities refuses:
- another facility's data;
- any action spanning all facilities (enterprise or organisation QA scopes);
- a case action on a case with no facility recorded.

Batch 653: when a check names a case (`caseId`) and no facility, the service looks up the case's ordering facility (`Case.order.facilityId`) before judging a facility-limited person. The lookup only runs for a person with a facility assignment. A case that cannot be found, or a lookup that fails, leaves the check refused with `facilityUnknown`. The server is specified to repeat this lookup from its own case record (not built).

The decision carries the role(s) that granted it; that is what the audit
entry records.

| Field | Meaning |
|---|---|
| `capability` | the key checked |
| `allowed` | true / false |
| `reason` | when refused: `noUser`, `unknownCapability`, `notGranted`, `requirementNotGranted`, `outOfScope`, `facilityUnknown` |
| `outsideFacilities` | for `outOfScope`: the facilities not covered (`all` for an all-facility action) |
| `grantedBy` | `[{ id, name }]` of the held roles that grant it |
| `missingRequirements` | for `requirementNotGranted` |
| `context` | `{ caseId?, facilityId?, facilityIds?, allFacilities? }` |

## What the API server must do (phase 4)

1. **Decide who the caller is from the bearer token**, never from anything
   the browser sends (see `AUTHENTICATION_OIDC.md`). Load the caller's staff
   record and the site's role catalog from SQL Server.
2. **Check before doing the work.** Every endpoint that performs a catalog
   action names its capability and runs the same evaluation (same catalog,
   same requirement rule). A refusal returns `403` with
   `{ "error": "capability_refused", "capability": "...", "reason": "..." }`
   and does no work.
3. **Audit every check of a high-risk capability**, allowed or refused, in
   the same transaction as the action where possible. The entry holds: time
   (UTC), user id and name, capability, allowed/refused, the granting role
   id(s) and name(s) or the refusal reason, case id and facility id when
   present, and the session role. The audit table is append-only: no
   update or delete permission for the application's database login.
4. **Role writes are validated and audited.** Saving a role refuses unknown
   keys and a capability whose requirements aren't granted
   (`roleCapabilityProblem`), and writes a "Role capabilities changed" entry
   naming who changed what.
5. **Superadmin** is granted from ForMedrix's own identity tenant (see
   `ACCESS_CONTROL_PLAN.md`), never from a customer's staff directory.

Endpoints so far:

| Action | Capability |
|---|---|
| Export a case's report change history | `report:change-history:export` |
| Export each Quality Assurance report | its own `qa:<report>:export` (16; this said 14 until the Batch 496 README audit), with the scope's facilities |
| Create or change a role (including its capabilities) | `config:roles:manage`; also refuse a change that leaves no assignable role with it |
| Create or edit a staff record | `config:staff:edit` |
| Change a staff member's roles, facilities, pediatric/orchestration/cross-tenant access or credentials | `config:staff-access:assign` (requires `config:staff:edit`) |
| Reset all demo data (demo deployments only) | `config:demo-data:reset` |
| Open a case from another organisation (support) | `platform:cross-tenant-cases:view`, audited on every open |
| Change the governing-body content settings | `platform:governing-bodies:manage` |
| Remove the demonstration checklists from an organisation's library (`POST /api/templates/remove-demo-checklists`, Batch 754; `docs/architecture/DEMO_CHECKLISTS.md`) | `platform:demo-checklists:remove` and `config:protocol:retire` |
| Change the Superadmin role | refused for everyone at a hospital; ForMedrixAI defines it |
| Any endpoint serving a screen reached from Home (its lists and data) | that screen's `screen:<name>:open` (Batch 374), besides the action's own capability |
| Complete grossing (case to Gross Complete) | `case:grossing:complete` with the case's facility; the organisation's Grossing field requirements checked first |
| Change which fields a page requires (Field Requirements) | `config:field-requirements:manage`, caller a member of that organisation; locked fields refused |
| Set an organisation's support access policy and window | `config:support-access:policy`, caller a member of that organisation |
| Approve, reject or revoke a support access request | `config:support-access:approve`, caller a member of that organisation and not the requester |
| Read or export an organisation's support audit | `config:support-audit:view`, caller a member of that organisation |
| Place or release a case hold or retention hold | `case:hold:place` / `case:hold:release` / `case:retention-hold:place` / `case:retention-hold:release`, with the case's facility (Batch 381) |
| Delegate a case | `case:delegation:create`, with the case's facility (Batch 381) |
| Correct an applied billing code | `billing:applied-code:correct` (Batch 382) |
| Approve, decline, override, add or delete a case's billing codes (report page, Cytology Workspace, Microtome) | `billing:applied-code:review` (Batch 460) |
| Insert, replace or remove a case's anatomical map image in the report | `report:organ-map:insert`, with the case's facility (Batch 461) |
| Print or reprint a case report, or open a stored version's PDF | `report:case-report:print`, with the case's facility (Batch 495; the preview window it also covered was retired in Batch 497). *Batch 558:* the API server checks it for the case on `GET /api/cases/{caseId}/report-versions` and `…/report-versions/{versionNumber}/pdf` (`BLOB_STORAGE_API.md` §11) |
| Change organ-map colours, patterns and thresholds (enterprise, jurisdiction, facility) / a template's map question bindings | `config:organ-map-scheme:manage` (with the facility for a facility layer) / `config:organ-map-bindings:manage` (Batch 461; thresholds Batches 462, 464, 465, 466) |
| Release an autopsy body | `autopsy:body:release` (Batch 383) |
| Record a forensic autopsy chain-of-custody transfer | `autopsy:custody:transfer` (Batch 468) |
| Narrow or revoke a hospital next-of-kin autopsy consent | `autopsy:consent:manage` (Batch 469) |
| Record disposal of retained organs/tissue | `autopsy:retention-disposal:record` (Batch 469) |
| Order postmortem toxicology / record its result | `autopsy:toxicology:order` / `autopsy:toxicology:result` (Batch 469) |
| Send an internal message / a secure email | `message:internal:send` / `message:secure-email:send` (Batch 385) |
| Correct or add to a signed-out cytology report | `cytology:report:correct` / `cytology:report:addend` (Batch 390) |
| Send an urgent cytology preliminary report (one specimen, before the case report) | `cytology:preliminary:release` (Batch 533) |
| Record a cytology QC or surgical QA review verdict | `cytology:qc-review:record` / `surgical:qa-review:record` (Batch 396) |
| Change the intraoperative critical results dictionary | `config:intraop-critical-results:manage` (Batch 399) |
| Place add-on orders; cancel or modify one after a block exception | `add-on:order:place` (Batch 403) |
| Approve destructive cutting of a block | `add-on:exception:approve-destructive-cut` (Batch 403) |
| Flag a block exception (Block exhausted and the other reasons); mark a block retrieved for an add-on order | `add-on:exception:flag` / `add-on:block:mark-retrieved` (Batch 669) |
| Record an item's end state; request re-embedding of an exhausted block; mark it re-embedded | `material:end-state:record` / `material:reembed:request` / `material:reembed:complete` (Batch 731) |
| Hand a cell block off to histology at the Cytology Preparation bench | `cytology:cell-block:hand-off` (Batch 740) |
| Divide a specimen into aliquots; update an aliquot's status | `material:specimen:divide` / `material:aliquot-status:update` (Batch 741) |
| Attach a file to a case; link a file; remove an attachment from a case | `case:attachment:upload` / `case:attachment:link` / `case:attachment:unlink` (Batch 742) |
| Open a slide in the laboratory's own digital pathology application | `case:slide-image:open` (Batch 750) |
| Run requisition ingestion now; review the Requisition Inbox; link or discard an unmatched scan; view a case's scanned requisition; set up the ingestion source | `requisition:ingestion:run` / `requisition:inbox:review` / `requisition:inbox:resolve` / `case:requisition:view` / `config:requisition-ingestion:manage` (Batch 762) |
| Sign off a staining run at the QC checkpoint; sign off instead of a stainer that signs off its own runs; release or send back a scanned image; set the QC defaults | `stain:qc:sign-off` / `stain:qc:override` / `scan:image-qc:sign-off` / `config:stain-qc:manage` (Batch 763) |
| Complete a reconciliation with discrepancies; abort a batch; acknowledge a cold-chain excursion | `batch:reconciliation:override` / `batch:run:abort` / `batch:cold-chain-excursion:acknowledge` (Batch 404) |
| Seal a carrier's manifest; move a carrier to its next step; open a carrier at a station for another step; read the station scan trail | `batch:manifest:seal` / `batch:carrier:advance` / `station:scan-mismatch:continue` / `station:scan-history:view` (Batch 726) |
| Supersede a molecular run (clone and retire the original) | `molecular:batch:supersede` (Batch 405) |
| Put in-house molecular orders on a plate, or take one off (Order Queue) | `molecular:order:assign-plate` (Batch 467) |
| Cancel an in-house molecular order, or re-route it to send-out | `molecular:order:cancel` (Batch 467) |
| Choose or change a queued send-out molecular order's reference lab | `molecular:order:set-lab` (Batch 467b) |
| Open the Control Rules page and read the rules (it no longer needs the Molecular screen) | `config:molecular-control-rules:view` (Batch 669), or `:manage` |
| Add, change or delete a molecular assay control rule (its controls and the deck slots its sample rack may use) | `config:molecular-control-rules:manage` (Batch 406; view-only without it, Batch 669; needs `:view`) |
| Dispose of retained material (scan on the Disposal Queue) | `retention:material:dispose`, with the station's facility (Batch 407) |
| Export the disposal (waste-tracking) report | `retention:disposal-report:export`, with the report's facility or all facilities (Batch 407) |
| Sign out (Orchestration) or finalize (Assist) a surgical report | `surgical:report:sign-out` with the case and its facility (Batch 649), then the case relationship (`canFinalizeCase`: an active participant whose participation type can finalize at the performing lab). Neither has a bypass for any role: the administrator "admin-override" was removed |
| Release preliminary (surgical); release an amendment, correction or addendum | `surgical:preliminary:release`; `surgical:amendment:release`, `surgical:correction:release`, `surgical:addendum:release` by the record's type (Batch 649) |
| Recall a report during its release delay | `report:release:recall` (Batch 649), and only the person who released it, before the delay ends |
| Print a report during its release delay | Release Hold Print Policy (System > Release Buffer): allow, warn and confirm (default), supervisor override (`print:release-hold:override`, with a reason) or block (Batch 654). Checked in `planReportPrint` for the case and its facility |
| Take or pass a pool case | `case:pool:claim` (audited) / `case:pool:pass` (Batch 649); pool membership still applies |
| Apply or remove a case or specimen flag | `case:flag:apply` / `case:flag:remove` (Batch 649) |
| Save diagnosis codes from the Codes window | `case:diagnosis-code:apply` (Batch 649) |
| Create a case on the Accession screen | `case:accession:create` (Batch 649); an order arriving from the LIS, a legacy import or a control slide is not this action |
| Ask a colleague for a review (informal review, consultation, observation, second opinion) | `case:informal-review:request` (Batch 649); a code review goes to the billing review pool as before |
| Raise, escalate, contain or verify a deficiency on the Quality Assurance screen | `qa:deficiency:raise` / `qa:deficiency:escalate` / `qa:deficiency:contain` / `qa:deficiency:verify` (Batch 649); raising one from a bench screen is that screen's act |
| Submit a Management Review of closed deficiencies on the Quality Assurance screen | `qa:management-review:submit` (Batch 659) |
| Sign out a cytology specimen, or release it for countersign | `cytology:report:sign-out` with the case (Batch 409), before signing authority, the CT gate and countersign rules, which still apply |
| A cytotechnologist signing out (negative GYN, advanced-CT exception) | also `cytology:ct-report:sign-out` with the case (Batch 415); remove it from the role where cytotechnologists may not sign reports |
| Save a cytology screening review (new or your own) | `cytology:review:record` with the case (Batch 410), before the workload check and QC selection |
| Sign off your own screening hours for a day (Batch 572) | `cytology:screening-hours:sign-off`; your own hours only, a correction needs a reason (CYTOLOGY_QC_API.md §5) |
| Record the CSMS eligibility check on a case, clearing its verification flag (Batch 636) | `cytology:csms-eligibility:verify`; the outcome is verified, or not eligible with one of four reasons; the server repeats the check, clears the open `f36` flag and writes the audit entry. From Batch 638 the answer also decides the held CSMS message: verified releases it, not eligible closes it unsent (`REGISTRY_ACKNOWLEDGEMENT_API.md` §10) |
| Record an hrHPV result by hand, or approve a manual entry that replaces an interface result (Batch 630) | `cytology:hpv-result:record-manual`; the Result Source is required; a different person must approve a replacement of an interface result; the server repeats the check and writes the audit entry (HPV_RESULT_INBOUND.md) |
| Choose which cytology review is the final diagnosis | `cytology:final-diagnosis:select` with the case (Batch 410); the CT/pathologist sign-out gate still applies |
| Remove a cytology QC flag (adding one needs none) | `cytology:qc-flag:remove` with the case (Batch 410); audited |
| Record a 5-year retrospective review outcome | `cytology:retrospective-review:record` with the case (Batch 410) |
| Record or dismiss a cyto-histologic correlation | `cytology:histology-correlation:record` with the case (Batch 410) |
| Finalize a cytology case before every specimen is signed out | `cytology:case:finalize` with the case (Batch 411), a reason required; audited. Otherwise the case finalizes itself when its last cytology specimen is signed out |
| Mark a note on someone's cytology review "Requires revision" (plain notes need none) | `cytology:revision:request` with the case (Batch 412); audited. It blocks CT sign-out (gate reason `pending_author_revision`) until the author revises or a pathologist records their own review |
| Choose a facility's cervical screening registry, or change a registry's code mappings and hold rules | `config:screening-registry:manage` (Batch 414), checked in `services/screeningRegistry/saveScreeningRegistrySettings.ts`; audited |
| Switch the CLIA workload cap or CAP 5-year lookback on or off (enterprise or facility) | `config:cytology-compliance:manage` (Batch 415), checked in `services/cytology/saveCytologyComplianceFeatures.ts`; audited |

## Capability catalog (System Capabilities)

Every capability PathScribe enforces today, generated from
`src/services/authorization/capabilityCatalog.ts` and `capabilitySeeds.ts`
(Batch 406). A test (`services/authorization/capabilityDocs.guard.test.ts`)
fails when a catalog key is missing here, so this list can't fall behind the
code.

- **Risk**: `high` capabilities are audited on every check, allowed or
  refused; `standard` ones (the screens and internal messages) are not.
- **Default roles** are the built-in roles' starting grants (least privilege,
  Pete, Sep 28, 2026). Superadmin holds every capability except `config:ai-prompt:approve`
  (withheld for separation of duties: only the laboratory approves its AI
  instructions, Pete, Oct 11, 2026; `SUPERADMIN_WITHHELD` in
  `capabilitySeeds.ts`) and is left out of the column. "Every case-access role" means Pathologist, Fellow, Resident,
  PA, Accessioner, Histotechnologist, Cytotechnologist and Molecular
  Technologist. "Hospital roles with case access" are the roles a hospital
  created itself with case access switched on. Every grant is a starting
  point: an administrator adds or removes any of them in the Role Dictionary.
- **Checked in** is the service that refuses the action. A screen only greys
  the control out (`CapabilityButton` / `useCapabilities`); the screens
  themselves are checked by `ScreenGate` on the route through
  `screens/screenAccess.ts`.

- **Configuration sections** (Batch 428, Pete's decisions of Oct 1, 2026): one
  capability per section, checked in the section's service, mostly through
  `authorization/guardConfigWrites.ts` (each listed method checked and
  audited). Admin starts with all of them; Lab Director with all but drafting
  synoptic protocols; Template Author and Template Approver with only the
  protocol and template ones; a hospital's own roles with none. The API server
  must check the same capability on each section's endpoints.

<!-- capability-catalog:start -->
### Administration: staff, roles and system (17)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:roles:manage` | Manage roles. | high | Admin | `roles/roleAdministration.ts` |
| `config:staff:edit` | Edit staff records. | high | Admin | `staff/staffAdministration.ts`, `subspecialties/mockSubspecialtyService.ts` |
| `config:staff-access:assign` | Assign roles and access to staff. Requires `config:staff:edit`. | high | Admin | `auth/linkedAccounts.ts`, `staff/staffAdministration.ts` |
| `config:staff-password:manage` | Manage staff sign-in passwords. Requires `config:staff:edit`. | high | Admin | `staffPasswords/mockStaffPasswordService.ts` |
| `config:demo-data:reset` | Reset all demo data. | high | Admin | `demoReset/demoReset.ts` |
| `config:field-requirements:manage` | Manage field requirements. | high | Admin | `fieldRequirements/fieldRequirementService.ts` |
| `auth:mfa-enrolment:reset` | Reset a colleague's second-factor enrolment. | high | Admin | `auth/mfa/mfaService.ts` |
| `config:intraop-critical-results:manage` | Manage the intraoperative critical results dictionary. | high | Admin | `intraop/mockIntraopCriticalResultService.ts` |
| `config:or-board-demo:run` | Start and Stop the OR Suite Live Board demo (adds and removes four DEMO cases in the intraoperative data). | high | Admin | `intraop/mockIntraoperativeService.ts` |
| `config:molecular-control-rules:view` | View molecular assay control rules. | standard | Admin, Lab Director, QA Reviewer, Molecular Technologist and any role with the Molecular screen (Batch 669) | `molecular/mockMolecularAssayControlRuleService.ts` (`listForReview`) |
| `config:molecular-control-rules:manage` | Manage molecular assay control rules. Needs `:view`. | high | Admin, Lab Director (Batch 669) | `molecular/mockMolecularAssayControlRuleService.ts` |
| `config:screening-registry:manage` | Manage screening registry reporting. | high | Admin | `screeningRegistry/saveScreeningRegistrySettings.ts` |
| `config:cancer-registry:manage` | Manage cancer registry reporting. | high | Admin | `cancerRegistry/saveCancerRegistrySettings.ts` |
| `config:cytology-compliance:manage` | Manage country-specific cytology rules. | high | Admin | `cytology/saveCytologyComplianceFeatures.ts` |
| `registry:submission:resend` | Resend a registry submission. Requires `screen:registry-exceptions:open`. | high | Admin, Lab Director | `registrySubmission/resendRegistrySubmission.ts` |
| `registry:live-register:approve` | Approve a registry go-live. | high | Admin, Lab Director | `registryGoLive/registryGoLive.ts` |
| `config:registry-go-live:manage` | Manage registry go-live approval settings. | high | Admin | `registryGoLive/registryGoLive.ts` |
| `registry:test-suite:run` | Run the registry test suite. | high | Admin | `registryGoLive/registryGoLive.ts` |
| `registry:revision:review` | Mark a registry revision reviewed. Requires `screen:registry-exceptions:open`. | high | Admin, Lab Director | `registrySubmission/recordRegistryRevision.ts` |
| `registry:batch-file:generate` | Make a registry batch file now, ahead of its schedule or on it (Batch 620, PS-800). Requires `config:batch-registry-feed:manage`. | high | Admin | `batchRegistryFeed/mockBatchRegistryFeedService.ts` |
| `config:template-governance:manage` | Manage template review settings. | high | Admin | `templates/templateGovernanceSettings.ts` |

### Support access: ForMedrixAI support in this organisation (3)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:support-access:policy` | Set the support access policy. | high | Admin | `supportAccess/supportAccessService.ts` |
| `config:support-access:approve` | Approve support access. | high | Admin | `supportAccess/supportAccessService.ts` |
| `config:support-audit:view` | View and export the support audit. | high | Admin | `supportAccess/supportAccessService.ts` |

### Configuration: protocols and report templates (7)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:protocol:draft` | Draft synoptic protocols. | high | Admin, Template Author | `templates/templateService.ts` |
| `config:protocol:approve` | Review synoptic protocols. | high | Admin, Template Approver, Lab Director | `templates/templateService.ts` |
| `config:protocol:publish` | Publish synoptic protocols. | high | Admin, Template Approver, Lab Director | `templates/templateService.ts` |
| `config:protocol:retire` | Retire synoptic protocols. | high | Admin, Template Approver, Lab Director | `templates/templateService.ts` |
| `config:report-template:manage` | Edit report templates and parts. | high | Admin, Template Author, Lab Director | `reportParts/mockReportPartService.ts`, `reportTemplates/mockReportTemplateService.ts` |
| `config:report-template:publish` | Publish report templates and parts. | high | Admin, Template Approver, Lab Director | `reportParts/mockReportPartService.ts`, `reportTemplates/mockReportTemplateService.ts` |
| `config:template-routing:manage` | Manage template routing rules. | high | Admin, Lab Director | `routingRules/mockRoutingRuleService.ts` |

### Configuration: AI, voice, actions and macros (6)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:ai-behavior:manage` | Manage AI features. | high | Admin, Lab Director | `aiBehavior/IAIBehaviorService.ts` |
| `config:ai-provider:manage` | Manage the AI service. | high | Admin, Lab Director | `aiConfig/saveAiSettings.ts` |
| `config:ai-model:manage` | Choose the default AI model. | high | Admin, Lab Director | `models/mockModelService.ts` |
| `config:ai-vendor-policy:manage` | Set which AI services and hosting regions each jurisdiction (or facility) allows (Batch 536, PS-558). Audited (`AI_VENDOR_POLICY_CHANGED`). | high | Admin, Lab Director | `aiIntegration/aiVendorPolicyService.ts` `save`, `remove` |
| `config:code-systems:manage` | Set which code systems (ICD-10, ICD-11, ICD-O, SNOMED CT and others) each jurisdiction uses, whether each is optional or required, and from what date (Batch 595). Audited (`CODE_SYSTEM_POLICY_CHANGED`). `group: 'configSystem'`, so granted to Admin and Lab Director by default via `CONFIG_SECTIONS`. | high | Admin, Lab Director | `coding/codeSystemPolicyService.ts` `save`, `reset`; `systemConfig/systemConfigChangeChecks.ts` (recording a terminology licence, Batch 623) |
| `config:actions:manage` | Manage keyboard and voice commands. | high | Admin, Lab Director | `actionRegistry/mockActionRegistryService.ts` |
| `config:voice:manage` | Turn voice on or off. | high | Admin, Lab Director | `systemConfig/systemConfigChangeChecks.ts` |
| `config:macros:manage` | Manage shared macros. | high | Admin, Lab Director | `macros/mockMacroService.ts`, `voicemacro/mockVoiceMacroService.ts` |

### Configuration: cytology (13)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:cytology-categories:manage` | Manage cytology categories. | high | Admin, Lab Director | `cytology/mockCytologyCategoryService.ts`, `cytology/mockNonGynCytologyCategoryService.ts` |
| `config:cytology-nomenclature:manage` | Manage cytology nomenclature. | high | Admin, Lab Director | `cytology/mockCytologyNomenclatureSettingsService.ts`, `cytology/mockFacilityCytologyNomenclatureOverrideService.ts` |
| `config:cytology-routing:manage` | Manage cytology routing. | high | Admin, Lab Director | `cytology/mockCytologyRoutingSettingsService.ts`, `cytology/mockFacilityCytologyRoutingOverrideService.ts` |
| `config:cytology-screening-strategy:manage` | Manage the screening strategy. | high | Admin, Lab Director | `cytology/mockCytologyScreeningStrategyService.ts`, `cytology/mockFacilityCytologyScreeningStrategyOverrideService.ts` |
| `config:cytology-histology-correlation:manage` | Manage the cyto-histo correlation window (Batch 452, PS-156). | high | Admin, Lab Director | `cytology/mockCytologyHistologyCorrelationSettingsService.ts` |
| `config:biopsy-resection-correlation:manage` | Manage the surgical biopsy-to-resection correlation window (Batch 453, PS-324). | high | Admin, Lab Director | `quality/biopsyResectionCorrelationSettings.ts` |
| `config:tumor-board-rules:manage` | Manage the Tumor Board auto-flagging rules (enterprise baseline and facility overrides). | high | Admin, Lab Director | `tumorBoardRules/mockTumorBoardRuleService.ts` |
| `config:follow-up-tracking:manage` | Manage follow-up tracking: the warning period, whether staff may email the ordering clinician, and that email's wording (Batch 454). | high | Admin, Lab Director | `followUp/followUpSettings.ts` |
| `config:cytology-instrumentation:manage` | Manage cytology instruments. | high | Admin, Lab Director | `cytology/mockCytologyInstrumentationService.ts`, `cytology/mockFacilityCytologyInstrumentationOverrideService.ts` |
| `config:cytology-qc-rates:manage` | Manage QC rescreen rates. | high | Admin, Lab Director | `cytology/mockCytologyQcSettingsService.ts`, `cytology/mockFacilityCytologyQcOverrideService.ts`, `cytology/mockStaffCytologyQcOverrideService.ts` |
| `config:cytology-workload-cap:manage` | Manage the slide workload cap (enterprise, facility and, from Batch 576, a person's own cap; the start of the screening day, Batch 574). A cap is 1–100 whole slides. | high | Admin, Lab Director | `cytology/mockCytologyWorkloadCapSettingsService.ts`, `cytology/mockFacilityCytologyWorkloadCapOverrideService.ts`, `cytology/mockStaffCytologyWorkloadCapOverrideService.ts`, `cytology/saveScreeningDayStart.ts` |
| `config:cytology-severity-mapping:manage` | Manage histology severity mapping. | high | Admin, Lab Director | `cytology/mockSnomedCervicalHistologySeverityMappingService.ts` |
| `config:cytology-qc-rules:manage` | Manage cytology QC rules. | high | Admin, Lab Director | `cytologyQc/mockCytologyQcRuleService.ts` |

### Configuration: lab dictionaries and case workflow (19)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:case-flags:manage` | Manage case flags. | high | Admin, Lab Director | `flags/mockFlagService.ts` |
| `config:subspecialties:manage` | Manage subspecialties. | high | Admin, Lab Director | `subspecialties/mockSubspecialtyService.ts` |
| `config:specimen-dictionary:manage` | Manage the specimen dictionary. | high | Admin, Lab Director | `specimenDictionary/mockSpecimenDictionaryService.ts` |
| `config:stain-dictionary:manage` | Manage the stain dictionary. | high | Admin, Lab Director | `stains/mockMolecularTargetService.ts`, `stains/mockSectioningProtocolService.ts`, `stains/mockStainOrderMacroService.ts`, `stains/mockStainTypeService.ts` |
| `config:ink-color:manage` | Manage the ink colour dictionary. | high | Admin, Lab Director | `inkColors/mockInkColorService.ts` |
| `config:processing-protocols:manage` | Manage processing protocols. | high | Admin, Lab Director | `protocols/mockProtocolService.ts` |
| `config:container-types:manage` | Manage container types. | high | Admin, Lab Director | `containerTypes/mockContainerTypeService.ts` |
| `config:reagent-lots:manage` | Manage reagent lots. | high | Admin, Lab Director | `reagentLots/mockReagentLotService.ts` |
| `config:delegation-types:manage` | Manage delegation types. | high | Admin, Lab Director | `delegationTypes/mockDelegationTypeService.ts` |
| `config:deficiency-types:manage` | Manage deficiency types. | high | Admin, Lab Director | `deficiencies/mockDeficiencyTypeService.ts`, `deficiencies/mockResolutionTypeService.ts` |
| `config:tat-targets:manage` | Manage turnaround targets. | high | Admin, Lab Director | `tatConfig/mockTatTargetService.ts` |
| `config:case-routing:manage` | Manage case routing rules. | high | Admin, Lab Director | `cases/casePoolAssignmentService.ts` |
| `case:routing:run` | Route unassigned cases now. | high | Admin, Lab Director | `cases/casePoolAssignmentService.ts` |
| `config:grossing-routes:manage` | Manage grossing route overrides. | high | Admin, Lab Director | `grossingRoutingOverrides/mockGrossingRoutingOverrideService.ts` |
| `config:facilities:manage` | Manage facilities. | high | Admin, Lab Director | `facilities/mockFacilityService.ts`, `locations/mockLocationService.ts`, `spellcheck/mockCustomDictionaryService.ts` |
| `config:physicians:manage` | Manage the physician directory. | high | Admin, Lab Director | `physicians/mockPhysicianService.ts` |
| `config:departments:manage` | Manage departments. | high | Admin, Lab Director | `departments/mockDepartmentService.ts` |
| `config:asset-locations:manage` | Manage storage locations. | high | Admin, Lab Director | `assetLocation/mockAssetLocationDictionaryService.ts` |
| `config:case-masks:manage` | Manage case number formats. | high | Admin, Lab Director | `caseRegistry/mockCaseMaskService.ts` |

### Configuration: results, reporting and quality (14)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:participation-types:manage` | Manage participation types. | high | Admin, Lab Director | `participationTypes/mockParticipationTypeService.ts` |
| `config:release-buffer:manage` | Manage the release buffer. | high | Admin, Lab Director | `reportRelease/mockReportReleaseService.ts` |
| `config:delivery-rules:manage` | Manage report delivery rules. | high | Admin, Lab Director | `delivery/mockDeliveryRuleService.ts` |
| `config:delivery-schedules:manage` | Manage delivery schedules. | high | Admin, Lab Director | `deliverySchedules/mockDeliveryScheduleService.ts` |
| `config:billing-release:manage` | Manage billing release rules. | high | Admin, Lab Director | `billingRelease/mockBillingReleaseService.ts` |
| `config:batch-registry-feed:manage` | Manage registry batch file programmes (Batch 620, PS-800). | high | Admin, Lab Director | `batchRegistryFeed/mockBatchRegistryFeedService.ts` |
| `config:us-epath:manage` | Manage US ePath state profiles and which profile each performing facility uses (Batch 620, PS-800). | high | Admin, Lab Director | `usEpath/mockUsEpathService.ts` |
| `config:cosd-destination:manage` | Manage the UK cancer registry destination. | high | Admin, Lab Director | `cosd/mockCosdDestinationService.ts` |
| `config:history-extraction:manage` | Manage the AI history extraction: whether the AI reads historical reports, for the enterprise and each performing facility (Batch 621). | high | Admin, Lab Director | `historyExtraction/mockHistoryExtractionSettingsService.ts` |
| `config:abnormal-triggers:manage` | Manage abnormal result rules. | high | Admin, Lab Director | `abnormalDetection/mockAbnormalTriggerRuleService.ts`, `systemConfig/systemConfigChangeChecks.ts` |
| `config:concordance-review:manage` | Manage concordance review. | high | Admin, Lab Director | `qualitySettings/mockConcordanceReviewSettingsService.ts` |
| `config:qa-types:manage` | Manage QA activity types. | high | Admin, Lab Director | `quality/mockQaActivityTypeService.ts`, `quality/mockQaSupervisionAssignmentTypeService.ts`, `quality/mockSurgicalPeerReviewRiskWeightService.ts` |
| `config:revision-reasons:manage` | Manage revision reasons. | high | Admin, Lab Director | `reasons/mockReasonDictionaryService.ts` |
| `config:bench-reasons:manage` | Reword, add, order and retire the bench's tap-to-pick reasons (Configuration → System → Bench Reasons, Batch 736). | high | Admin, Lab Director | `reasons/mockReasonDictionaryService.ts` |
| `config:peer-review:manage` | Manage the peer-review sign-out gate. | high | Admin, Lab Director | `quality/mockPeerReviewSettingsService.ts` |
| `config:clinical-mismatch-rules:manage` | Change the clinical-pathologic mismatch risk rules (Batch 529, PS-554). Requires `…rules:view`. | high | **none**: each hospital grants it to its own role (e.g. a Pathologist Administrator) | `clinical/clinicalMismatchRuleService.ts` `save`, `remove` |
| `config:clinical-mismatch-rules:view` | Read the mismatch rules (Batch 529, PS-554), so a pathologist can see why a case was held. | standard | Pathologist, QA Reviewer, Lab Director | `clinical/clinicalMismatchRuleService.ts` `list` |
| `config:ai-prompt:view` | Read the governed AI instructions for the mismatch check, their versions and approvals (Batch 536, PS-554). | standard | QA Reviewer, Lab Director | `clinical/aiInstructionService.ts` `list` |
| `config:ai-prompt:edit` | Edit the AI instructions: a new version, pending approval; the check keeps using the approved one (Batch 536). Requires `…:view`. | high | **none**: each hospital grants it (Superadmin holds it, for ForMedrixAI testing) | `clinical/aiInstructionService.ts` `saveDraft`, `test` |
| `config:ai-prompt:approve` | Approve or reject an edited version; never by anyone who edited it (`SELF_APPROVAL`) (Batch 536). Requires `…:view`. Separation of duties with `config:clinical-mismatch-rules:manage`. | high | Lab Director (**never Superadmin**, Pete Oct 11) | `clinical/aiInstructionService.ts` `approve`, `reject`, `test` |
| `config:qa-trend-policy:manage` | Manage the discordance trend policy. | high | Admin, Lab Director | `quality/mockQaTrendPolicyService.ts` |
| `config:validation-studies:manage` | Manage validation studies. | high | Admin, Lab Director | `validationStudies/mockValidationStudyService.ts` |
| `validation:approval:record` | Record validation approval. | high | Admin, Lab Director | `validationStudies/mockValidationStudyService.ts` |
| `config:retention-policy:manage` | Manage the retention policy. | high | Admin, Lab Director | `retention/retentionPolicyService.ts` |
| `config:fppe:manage` | Manage FPPE assignments. | high | Admin, Lab Director | `cases/mockFppeAssignmentService.ts` |
| `config:cytotech-competency:manage` | Manage cytotechnologist competency. | high | Admin, Lab Director | `quality/mockQaSupervisionAssignmentService.ts` |

### Configuration: printing, labels and benches (14)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:printers:manage` | Manage printers. | high | Admin, Lab Director | `printerProfiles/mockPrinterProfileService.ts` |
| `config:print-settings:manage` | Manage print settings, including a facility's report printing (Batch 517). Batch 553: also lets the Printing tab list the facility's own site agent printers for its default (`siteAgent/siteAgentAdminService.ts` reportPrinters). | high | Admin, Lab Director | `printSettings/mockFacilityPrintSettingsService.ts`, `printSettings/mockPrintSettingsService.ts`, `facilities/mockFacilityService.ts` (setPrintSettings) |
| `config:direct-device-printing:manage` | Turn direct browser-to-printer printing on or off for a facility (Batch 734, Pete's Decision 4). Off by default in a server deployment; every direct print, and every blocked one, is audited. | high | Admin, Lab Director | `facilities/mockFacilityService.ts` (setDirectDevicePrinting) |
| `config:organ-map-delivery:manage` | Set a performing lab's organ map delivery to its laboratory system on Assist cases: off (default), text only, or text and an image file (PNG or PDF) to a destination (Batch 751, spec section 12.3). Audited; each delivery and failure is audited too. | high | Admin, Lab Director | `facilities/mockFacilityService.ts` (setOrganMapDelivery) |
| `config:print-routing:manage` | Manage print routing. Batch 553: also lets the rule window list a site's agent printers (`siteAgent/siteAgentAdminService.ts` reportPrinters). | high | Admin, Lab Director | `printRouting/mockPrintRoutingRuleService.ts` |
| `config:label-layouts:manage` | Manage label layouts. | high | Admin, Lab Director | `labelDesigner/mockLabelLayoutService.ts` |
| `config:cassette-routing:manage` | Manage cassette routing. | high | Admin, Lab Director | `cassetteRouting/mockCassetteRoutingRuleService.ts` |
| `config:cassette-colors:manage` | Manage cassette colours. | high | Admin, Lab Director | `cassetteColors/mockCassetteColorService.ts` |
| `config:scan-stations:manage` | Manage scan stations. | high | Admin, Lab Director | `scanStations/mockScanStationService.ts` |
| `config:equipment:manage` | Manage equipment. | high | Admin, Lab Director | `equipment/mockEquipmentService.ts`, `hardwareContainers/mockHardwareContainerRegistryService.ts` |
| `equipment:maintenance:record` | Record equipment maintenance. | high | Histotechnologist, Cytotechnologist, Molecular Technologist, Admin, Lab Director | `equipment/mockEquipmentLogService.ts` |
| `config:grossing-hardware:manage` | Manage grossing hardware. | high | Admin, Lab Director | `grossingHardware/mockGrossingHardwareProfileService.ts` |
| `config:workstation-groups:manage` | Manage workstation groups. | high | Admin, Lab Director | `workstationGroups/mockWorkstationGroupService.ts` |
| `config:action-groups:manage` | Manage action groups. | high | Admin, Lab Director | `actionGroups/mockActionGroupService.ts` |
| `config:or-suite-terminals:manage` | Manage operating room terminals. | high | Admin, Lab Director | `intraopDashboard/mockOrSuiteTerminalService.ts` |
| `config:display-profiles:manage` | Manage wall display profiles. | high | Admin, Lab Director | `facilityOpsDashboard/mockDisplayProfileService.ts` |

### Configuration: integrations and intake (6)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:site-agents:enroll` | Make a one-time enrolment code for a site agent, and revoke an agent, at the site's facility (Batch 552; `SITE_AGENT_API.md` §2). Either this or the next lets you see the site's agents and configuration. | high | Admin, Lab Director | `siteAgent/siteAgentAdminService.ts` |
| `config:site-agent-config:manage` | Change a site agent's printers and file shares (Batch 552; `SITE_AGENT_API.md` §3). | high | Admin, Lab Director | `siteAgent/siteAgentAdminService.ts` |
| `config:workstations:manage` | Register a workstation and change its name, facility and context binding (Batch 612; `WORKSTATION_REGISTRY.md`). | high | Admin, Lab Director | `workstationRegistry/workstationRegistryServices.ts` |
| `config:workstation-tokens:manage` | Rotate or revoke a workstation's token, and run the Simulated token test (Batch 612; `WORKSTATION_REGISTRY.md`). | high | Admin, Lab Director | `workstationRegistry/workstationRegistryServices.ts` |
| `config:bi-feed:manage` | Switch the reporting feed on or off and choose the datasets and facilities it offers (Batch 613; `BI_FEED_API.md`). | high | Admin, Lab Director | `biFeed/biFeedServices.ts` |
| `config:bi-feed-tokens:manage` | Issue, replace and revoke reporting feed tokens, and run the Simulated pull test (Batch 613; `BI_FEED_API.md`). | high | Admin, Lab Director | `biFeed/biFeedServices.ts` |
| `config:bi-feed-identified:approve` | Record or withdraw the approval for identified (not de-identified) feed tokens (Batch 613; `BI_FEED_API.md`). | high | Admin, Lab Director | `biFeed/biFeedServices.ts` |
| `config:vendor-integrations:manage` | Manage vendor integrations. | high | Admin, Lab Director | `digitalPathology/mockDpVendorService.ts`, `digitalPathology/mockWsiViewerVendorService.ts`, `imageAssociation/mockGrossImagingVendorService.ts`, `imageAssociation/mockImageManagementSystemVendorService.ts` |
| `config:crosswalk:manage` | Manage the specimen code crosswalk. | high | Admin, Lab Director | `orderIntake/mockOrderIntakeService.ts` |
| `config:secure-messaging:manage` | Manage a lab's secure messaging gateways and their BAA or data processing agreements (Batch 517, PS-143). | high | Admin, Lab Director | `secureMessaging/mockSecureMessagingConfigService.ts` |
| `config:migration-mappings:manage` | Manage migration field mappings. | high | Admin, Lab Director | `migration/mockMigrationFieldMappingService.ts` |
| `config:assist-polling:manage` | Manage Assist LIS polling. | high | Admin, Lab Director | `assistPolling/mockAssistPollingService.ts` |
| `assist:lis-message:ingest` | Process LIS messages by hand. | high | Admin, Lab Director | `assistPolling/assistPollingRuntime.ts` |
| `config:interface-preview:view` | Preview interface messages. | high | Admin, Lab Director | `interfacePreview/permitInterfacePreview.ts` |

### Configuration: billing tables (9)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:billing-rules:manage` | Manage billing rules. | high | Admin, Lab Director | `billing/mockBillingRuleService.ts` |
| `config:billing-tables:approve` | Approve billing tables. | high | Admin, Lab Director | `billing/mockBillingRuleService.ts`, `billing/mockCodeImportService.ts`, `billing/mockModifierDictionaryService.ts`, `billing/mockNcciEditService.ts`, `billing/mockRvuCodeMapService.ts` |
| `config:billing-code-import:run` | Import billing codes. | high | Admin, Lab Director | `billing/mockCodeImportService.ts` |
| `config:billing-modifiers:manage` | Manage CPT modifiers. | high | Admin, Lab Director | `billing/mockModifierDictionaryService.ts` |
| `config:billing-rvu:manage` | Manage the RVU code map. | high | Admin, Lab Director | `billing/mockRvuCodeMapService.ts` |
| `config:billing-ncci:manage` | Manage NCCI edits. | high | Admin, Lab Director | `billing/mockNcciEditService.ts` |
| `config:billing-triggers:manage` | Manage billing triggers. | high | Admin, Lab Director | `billing/mockBillingTypeTriggerConfigService.ts` |
| `config:payment-types:manage` | Manage payment types. | high | Admin, Lab Director | `billing/mockMasterPaymentTypeService.ts` |
| `config:payment-mappings:manage` | Manage payment mappings. | high | Admin, Lab Director | `billing/mockJurisdictionPaymentMappingService.ts` |
| `config:smart-capture:manage` | Manage Smart Capture settings. | high | Admin, Lab Director | `smartCapture/smartCaptureServices.ts` |

### Configuration: security and system (9)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:session-security:manage` | Manage session timeout. | high | Admin, Lab Director | `biometric/mockBiometricService.ts`, `session/mockSessionTimeoutService.ts` |
| `config:report-appearance:manage` | Manage report appearance. | high | Admin, Lab Director | `reportAppearance/pageSetup.ts`, `reportAppearance/saveDocumentStyle.ts`, `systemConfig/systemConfigChangeChecks.ts` |
| `config:contribution-settings:manage` | Manage contribution settings. | high | Admin, Lab Director | `systemConfig/systemConfigChangeChecks.ts` |
| `config:external-resources:manage` | Manage external links. | high | Admin, Lab Director | `externalResources/mockExternalResourceService.ts` |
| `config:research-feed:manage` | Manage the research feed. | high | Admin, Lab Director | `research/mockResearchFeedConfigService.ts` |
| `config:feedback:manage` | Manage feedback settings. | high | Admin, Lab Director | `feedback/mockFeedbackSettingsService.ts` |
| `config:organ-map-scheme:manage` | Manage organ-map colours, patterns and legend wording, and their thresholds (the breast close-margin distance, Batch 462; the malignant-polyp and rectal CRM involved-margin rules, a distance and an operator each, Batch 464; the oral cavity involved- and close-margin rules, Batch 465; the kidney parenchymal and soft tissue involved-margin rules, Batch 466), for the enterprise, a jurisdiction or a facility (Batch 461). | high | Admin, Lab Director | `organMapping/organMapConfig.ts` |
| `config:organ-map-bindings:manage` | Manage which of a synoptic template's questions feed its organ map, and what each answer means (Batch 461); and which of its generic margin questions the map calculates (Batch 466b). | high | Admin, Lab Director | `organMapping/organMapConfig.ts` |
| `config:inking-validation-mode:manage` | Manage a site's inking validation mode (`WARN_ONLY`, the default, or `STRICT_ENFORCE`) for structured-inking sign-out checks (Batch 480). | high | Admin, Lab Director | `grossing/inkingSiteSettings.ts` |

### Case work (97)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `case:grossing:complete` | Complete grossing. | high | Pathologist, Fellow, Resident, PA | `grossing/grossingCompletion.ts`, `grossing/reportGrossComplete.ts` |
| `grossing:margin-ink:record` | Record a margin's ink application during grossing (creating the margin on its first application, or appending a further one), and mark the margin examined (Batch 480). | standard | Pathologist, Fellow, Resident, PA | `grossing/recordMarginInkApplication.ts` |
| `case:hold:place` | Place a case hold. | high | Every case-access role; hospital roles with case access | `cases/caseHolds.ts` |
| `case:hold:release` | Release a case hold. | high | Every case-access role; hospital roles with case access | `cases/caseHolds.ts` |
| `case:retention-hold:place` | Place a retention hold. | high | Every case-access role; hospital roles with case access | `cases/caseHolds.ts` |
| `case:retention-hold:release` | Release a retention hold. | high | Every case-access role; hospital roles with case access | `cases/caseHolds.ts` |
| `case:delegation:create` | Delegate a case. | high | Every case-access role; hospital roles with case access | `delegations/mockDelegationService.ts` |
| `case:tumor-board:flag` | Flag a case for Tumor Board/MDT. | high | Pathologist, Fellow, Resident, PA | `tumorBoard/mockTumorBoardService.ts` |
| `case:margin-exception:resolve` | Resolve a margin-distance exception. | high | Pathologist, Fellow, Resident, PA | `marginExtraction/mockMarginExtractionService.ts` |
| `case:tumor-board:manage` | Manage the Tumor Board queue status (Cancel, Presented, Deferred a nomination). Board, schedule and presenter changes are `case:tumor-board:schedule` instead (Batch 493). | standard | Pathologist, Fellow, Resident, PA, Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist | `tumorBoard/mockTumorBoardService.ts` |
| `case:tumor-board:schedule` | Schedule a Tumor Board/MDT meeting in advance: which board, the meeting date and time, and who presents (Batch 493). | standard | Pathologist, Fellow, Resident, PA, Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist | `tumorBoard/mockTumorBoardService.ts` |
| `case:tumor-board:dismiss` | Dismiss an auto-generated Tumor Board flag with a reason. | high | Pathologist, Fellow, Resident, PA | `tumorBoard/mockTumorBoardService.ts` |
| `case:team:manage` | Change a case's team. | high | Every case-access role; hospital roles with case access | `cases/saveCaseTeam.ts` |
| `patient:break-glass:rebind` | Rebind a downtime patient identity (break-glass). | high | Admin | `patients/mockPatientIndexService.ts` |
| `patient:national-identifier:record` | Record a patient's national identifier. | high | Every case-access role; hospital roles with case access | `patientIdentifiers/recordNationalPatientIdentifier.ts` |
| `patient:registry-consent:record` | Record a patient's registry opt-out. | high | Every case-access role; hospital roles with case access | `registryConsent/recordPatientRegistryConsent.ts` |
| `patient:other-cases:request-access` | Ask to see a patient's other cases that the user cannot open, from the patient history or the case workup. Sends the request to the assigned pathologists and administrators (Batch 613). | standard | Every case-access role; hospital roles with case access | `patientCaseAccess/patientCaseAccessService.ts` |
| `patient:other-cases:decide-access` | Approve, decline or revoke access to a patient's other cases. Pathologists decide for cases assigned to them; administrators for any. Nobody decides their own request (Batch 613). | high | Pathologist; Admin | `patientCaseAccess/patientCaseAccessService.ts` |
| `cytology:report:correct` | Correct a signed-out cytology report. | high | Pathologist | `cytology/releaseCytologyCorrection.ts` |
| `cytology:report:addend` | Add an addendum to a signed-out cytology report. | high | Pathologist | `cytology/releaseCytologyAddendum.ts` |
| `cytology:preliminary:release` | Send an urgent preliminary report for one cytology specimen before the case report (Batch 533). | high | **none**: each laboratory grants it in the Role Dictionary (Pete: configurable) | `cytology/releaseCytologyPreliminary.ts` |
| `cytology:report:sign-out` | Sign out a cytology report. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/signOutCytologyCase.ts` |
| `cytology:ct-report:sign-out` | Sign out a cytology report as a cytotechnologist. Requires `cytology:report:sign-out`. | high | Cytotechnologist; hospital roles with case access | `cytology/signOutCytologyCase.ts` |
| `cytology:review:record` | Record a cytology screening review. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/saveCytologyReview.ts` |
| `cytology:screening-hours:sign-off` | Confirm or correct your own screening hours for a day (the screening hours record, CLIA in the US: the supervisor's workload report counts them; the live limit uses the recorded time). | high | Pathologist, Fellow, Resident, Cytotechnologist (its own seed, `CYTOLOGY_SCREENING_HOURS`; not offered to a hospital's own roles) | `cytology/mockCytologyScreeningHoursService.ts` |
| `cytology:csms-eligibility:verify` | Record the answer to the CSMS eligibility check on a case (verified, or not eligible with a reason) and clear its verification flag. Audited with user, time and outcome. | high | Pathologist, Lab Director | `cytology/verifyCsmsEligibility.ts` |
| `cytology:hpv-result:record-manual` | Enter an hrHPV result by hand (Record Positive / Negative) with a required Result Source, and approve, as a second person, a manual entry that replaces an interface result. Audited with user, time, source and the earlier result. | high | Pathologist, Lab Director | `cytology/recordManualHpvResult.ts` |
| `cytology:final-diagnosis:select` | Choose a cytology final diagnosis. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/cytologyCaseActions.ts` |
| `cytology:qc-flag:remove` | Remove a cytology QC flag. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/cytologyCaseActions.ts` |
| `cytology:retrospective-review:record` | Record a 5-year retrospective review. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/cytologyCaseActions.ts` |
| `cytology:histology-correlation:record` | Record a cyto-histologic correlation. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/cytologyCaseActions.ts` |
| `cytology:case:finalize` | Finalize a cytology case early. | high | Pathologist | `cytology/cytologyCaseFinalization.ts` |
| `cytology:revision:request` | Request a cytology review revision. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/cytologyReviewNotes.ts` |
| `cytology:qc-review:record` | Record a cytology QC peer review. | high | Pathologist, Fellow | `cytologyQc/mockCytologyQcCaseAssignmentService.ts` |
| `cytology:qc-review:bypass` | Bypass a cytology QC review (supervisor). | high | None | `cytologyQc/mockCytologyQcCaseAssignmentService.ts` |
| `surgical:qa-review:record` | Record a surgical post-sign-out QA review. | high | Pathologist, Fellow | `quality/surgicalQaReview.ts` |
| `case:peer-review:request` | Ask for a peer review before sign-out. | high | Pathologist, Fellow | `quality/peerReviewService.ts` |
| `case:peer-review:record` | Record a peer review. | high | Pathologist | `quality/peerReviewService.ts` |
| `case:peer-review:override` | Sign out ahead of a required peer review. | high | Pathologist | `quality/peerReviewService.ts` |
| `case:clinical-mismatch:record` | Decide a clinical-pathologic mismatch. | high | Pathologist, Fellow | `clinical/clinicalMismatchDecision.ts` |
| `case:clinical-history:record` | Add or reconcile a case's structured clinical history after accession, until sign-out (Batch 530). | high | Pathologist, Fellow, Resident, PA | `clinicalHistory/recordClinicalHistoryAfterAccession.ts` |
| `case:outside-consult:assess` | Assess an outside consult opinion. | high | Pathologist, Fellow | `consultAccess/mockConsultTokenService.ts` |
| `case:consult-link:issue` | Issue an outside consultant's view-only link to a case. | high | Pathologist, Fellow, Resident, PA, Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access (Batch 515; who should hold it is awaiting Pete's decision) | `consultAccess/mockConsultTokenService.ts` |
| `case:consult-link:revoke` | Revoke an outside consult link. | high | Same as `case:consult-link:issue` | `consultAccess/mockConsultTokenService.ts` |
| `case:consult-link:reveal-identity` | When issuing an outside consult link, opt in to showing the consultant the patient's full name and date of birth (the page is masked by default). Only used together with issuing, which is checked first (Lab Director does not hold `case:consult-link:issue` by default, so it has no effect there until a hospital grants it). | high | Pathologist, Lab Director (Batch 669, access-11) | `consultAccess/mockConsultTokenService.ts` (`issue`) |
| `audit:consult-links:view` | See every outside consult link across all cases (Audit Log → Consult links). Requires `screen:audit-log:open`. | high | Admin, Lab Director, QA Reviewer (Batch 522) | `consultAccess/mockConsultTokenService.ts` (`listAll`) |
| `cytology:pathologist-review:take` | Take a positive GYN cytology case for review. | high | Pathologist, Fellow | `cytology/cytologyQueuesLive.ts` |
| `add-on:order:place` | Place an add-on order. | high | Pathologist, Fellow, Resident; hospital roles with case access | `addOnOrders/addOnOrderActions.ts` |
| `add-on:exception:approve-destructive-cut` | Approve destructive cutting. | high | Pathologist, Fellow, Resident; hospital roles with case access | `addOnOrders/addOnOrderActions.ts` |
| `add-on:exception:flag` | Flag a block exception (Block exhausted and the other reasons) from the Add-On Orders tracking list or the Microtome workstation (Batch 669). | standard | Pathologist, Fellow, Resident, Histotechnologist (every role with the Add-On Orders or Microtome screen); hospital roles with case access | `addOnOrders/addOnOrderActions.ts` |
| `add-on:block:mark-retrieved` | Mark a block retrieved for an add-on order (Batch 669). | standard | Same roles as `add-on:exception:flag` | `addOnOrders/addOnOrderActions.ts` |
| `batch:reconciliation:override` | Complete a batch reconciliation anyway. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `batches/mockBatchService.ts` |
| `batch:run:abort` | Abort a batch. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `batches/mockBatchService.ts` |
| `batch:cold-chain-excursion:acknowledge` | Acknowledge a cold-chain excursion. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `batches/mockBatchService.ts` |
| `batch:manifest:seal` | Seal a carrier's manifest: nothing can be added or removed after it (Batch 726). | standard | Pathologists Assistant, Histotechnologist, Cytotechnologist, Molecular Technologist (every role with Batch Management, Embedding, Microtome or Slide Distribution); hospital roles with case access | `batches/mockBatchService.ts` |
| `batch:carrier:advance` | Move a carrier to its next processing step, updating every item in it (Batch 726). | standard | Same roles as `batch:manifest:seal` | `batches/mockBatchService.ts` |
| `station:scan-mismatch:continue` | Open a carrier, or keep an item, at a station for another step after the mismatch warning; audited (Batch 726). | standard | Same roles as `batch:manifest:seal` | `batches/mockBatchService.ts` (`recordCarrierScan`) |
| `station:scan-history:view` | Read the station scan trail (who scanned which item, where and when) (Batch 726). | standard | Same roles as `batch:manifest:seal` | `stationScans/mockStationScanEventService.ts` |
| `referral:transit-status:update` | Update a referral batch’s transit status. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `referral/mockReferralTrackingService.ts` |
| `wsi:scan-batch:load` | Load a WSI scan batch. | standard | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `digitalPathology/wsiScanBatchWorkflow.ts` |
| `wsi:scan-batch:send` | Send a WSI scan batch to the scanner. | standard | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `digitalPathology/wsiScanBatchWorkflow.ts` |
| `wsi:scan-batch:unload` | Unload a WSI scan batch. | standard | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `digitalPathology/wsiScanBatchWorkflow.ts` |
| `retention:material:dispose` | Dispose of retained material. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `retentionPolicy/disposeItemByScan.ts` |
| `case:decant:delete` | Remove a decant from the material tree (Batch 452). | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `material/caseMaterialService.ts` |
| `material:block:delete-in-process` | Delete a block that is still in process: a soft delete, the block stays on the case marked Deleted; unfinished stains are cancelled and a billing credit item is queued (Batch 588). Each facility chooses the roles through its grants. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `material/deleteBlockInProcess.ts` |
| `material:block:delete-signed-out` | Delete a block on a signed-out case: a soft delete, the block is marked Invalidated and stays on the case; a billing credit item is queued (Batch 610). | high | Admin, Lab Director, QA Reviewer | `material/deleteBlockAfterSignOut.ts` |
| `material:block:flag-amended` | Flag a block Invalidated or Superseded on an amended report; a flag only, no deletion (Batch 610). | high | Pathologist, QA Reviewer | `material/deleteBlockAfterSignOut.ts` |
| `batch:cold-chain-reading:simulate` | Send a Simulated temperature reading for a storage unit or container (Batch 610). | standard | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `coldChain/simulatedTelemetryFeed.ts` |
| `retention:holds-queue:export` | Export the Retention Holds queue as CSV (Batch 610). | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `retentionHolds/exportRetentionHoldsQueue.ts` |
| `config:cold-chain:manage` | Manage storage units and storage condition types (Batch 610). | high | Admin, Lab Director | `coldChain/mockStorageUnitService.ts` |
| `report:workflow-turnaround:view` | View the Lab Workflow report: turnaround by step (Batch 730, spec §9). Also needs `station:scan-history:view`. | standard | Roles with Batch Management | `labWorkflowReports/labWorkflowReportService.ts` |
| `report:workflow-turnaround:export` | Export that report as CSV; audited with the row count (Batch 730). Requires the view capability. | high | Roles with Batch Management | `labWorkflowReports/labWorkflowCsv.ts` |
| `report:station-volume:view` | View the Lab Workflow report: volume per station per day or week (Batch 730, spec §9). Also needs `station:scan-history:view`. | standard | Roles with Batch Management | `labWorkflowReports/labWorkflowReportService.ts` |
| `report:station-volume:export` | Export that report as CSV; audited with the row count (Batch 730). Requires the view capability. | high | Roles with Batch Management | `labWorkflowReports/labWorkflowCsv.ts` |
| `report:stat-performance:view` | View the Lab Workflow report: STAT performance (Batch 730, spec §9). Also needs `station:scan-history:view`. | standard | Roles with Batch Management | `labWorkflowReports/labWorkflowReportService.ts` |
| `report:stat-performance:export` | Export that report as CSV; audited with the row count (Batch 730). Requires the view capability. | high | Roles with Batch Management | `labWorkflowReports/labWorkflowCsv.ts` |
| `report:add-on-volume:view` | View the Lab Workflow report: add-on order volume and turnaround (Batch 730, spec §9). | standard | Roles with Batch Management | `labWorkflowReports/labWorkflowReportService.ts` |
| `report:add-on-volume:export` | Export that report as CSV; audited with the row count (Batch 730). Requires the view capability. | high | Roles with Batch Management | `labWorkflowReports/labWorkflowCsv.ts` |
| `report:recut-rework:view` | View the Lab Workflow report: recut and rework rates (Batch 730, spec §9). | standard | Roles with Batch Management | `labWorkflowReports/labWorkflowReportService.ts` |
| `report:recut-rework:export` | Export that report as CSV; audited with the row count (Batch 730). Requires the view capability. | high | Roles with Batch Management | `labWorkflowReports/labWorkflowCsv.ts` |
| `report:reconciliation-exceptions:view` | View the Lab Workflow report: reconciliation exceptions (missing, unexpected, overrides) (Batch 730, spec §9). | standard | Roles with Batch Management | `labWorkflowReports/labWorkflowReportService.ts` |
| `report:reconciliation-exceptions:export` | Export that report as CSV; audited with the row count (Batch 730). Requires the view capability. | high | Roles with Batch Management | `labWorkflowReports/labWorkflowCsv.ts` |
| `report:batch-duration:view` | View the Lab Workflow report: Decal and Staining batch duration against target (Batch 730, spec §9). | standard | Roles with Batch Management | `labWorkflowReports/labWorkflowReportService.ts` |
| `report:batch-duration:export` | Export that report as CSV; audited with the row count (Batch 730). Requires the view capability. | high | Roles with Batch Management | `labWorkflowReports/labWorkflowCsv.ts` |
| `material:end-state:record` | Record a block's or slide's end state by hand (exhausted, returned to storage, archived, sent out, consumed for testing, discarded), with a reason (Batch 731, spec §10.5). The system's own records (disposal, a completed referral, a confirmed exhaustion) ride on the permission of the action that makes them. | high | Roles with the Microtome or Slide Distribution screen | `itemEndStates/mockItemEndStateService.ts` |
| `material:reembed:request` | Ask for an exhausted block's remnant or wet tissue to be re-embedded, from the Add-On Order builder or in answer to a "Block exhausted" flag; the order waits until it is done (Batch 731, spec §10.6). | high | Pathologist, Fellow, Resident | `addOnOrders/addOnOrderActions.ts` |
| `material:reembed:complete` | Mark an exhausted block re-embedded at the Embedding Station, releasing the orders waiting for it (Batch 731). | high | Roles with the Embedding screen | `addOnOrders/addOnOrderActions.ts` |
| `cytology:cell-block:hand-off` | Hand a cell block off to histology at the Cytology Preparation bench after scanning its source and its cassette (Batch 740). | high | Roles with the Cytology Preparation screen | `cytology/cellBlockHandoff.ts` |
| `material:specimen:divide` | Divide a specimen into aliquots with the starting volume and each aliquot's volume and destination (Batch 741). | high | Roles with the Grossing or Cytology Preparation screen | `material/specimenDivision.ts` |
| `material:aliquot-status:update` | Move an aliquot to Sent, Received or Result back (with the receiving accession) (Batch 741). | standard | Roles with the Cytology Preparation or Batch Management screen | `material/specimenDivision.ts` |
| `config:research-cases:manage` | Set how research cases are recognised (accession and research-patient MRN prefixes), the no-charge financial class, and how long their material is kept (Batch 728, Lab Workflow spec Decision 4). | high | Admin, Lab Director | `researchCases/researchCaseSettings.ts` |
| `config:batch-purposes:manage` | Switch built-in batch purposes on or off and add the lab's own (Batch 728, Decision 4a). | high | Admin, Lab Director | `batches/batchPurposes.ts` |
| `case:follow-up:expect` | Mark a signed-out surgical case "follow-up specimen expected" (Batch 454). | standard | Pathologist, Fellow | `followUp/followUpActions.ts` |
| `case:edit-conflict:override` | Overwrite on the Edit Conflict dialog: save this session's changes over a newer version someone else saved (Batch 458, PS-71). | high | Pathologist, Admin, Lab Director | `cases/caseWrite.ts` |
| `case:inking-gate:override` | Administrative Override of the Structured Inking sign-out gate (Gate B) for a Severity 3 issue, with a mandatory reason (Batch 484, PS-519). | high | Admin, Lab Director | `grossing/recordInkingGateOverride.ts` |
| `report:organ-map:insert` | Insert the anatomical map (drawn from the synoptic answers) into the report as a snapshot, insert it again, or remove it; refused once the report is signed out (Batch 461). | standard | Pathologist, Fellow, Resident | `organMapping/organMapFigures.ts` |
| `report:case-images:attach` | Place photos, files and links in a case's report from the Attachments window, or take them out (Batch 609, PS-44; Batch 742). In the surgical report an image prints inside the section chosen, a PDF is named there and its pages follow the report; in the cytology report images print after its pages. Since Batch 742 a signed report (pending release or finalized) takes or loses a placement only while an amendment or addendum is in draft. | standard | Every case-access role; hospital roles with case access | `imageAssociation/caseReportImages.ts` |
| `case:attachment:upload` | Attach External File: a PDF, JPG or PNG sent to the hospital's own storage through the storage adapter; PathScribe keeps only the pointer it hands back (Batch 742; `CASE_ATTACHMENTS_API.md`). | standard | Every case-access role; hospital roles with case access | `caseAttachments/caseAttachments.ts` |
| `case:attachment:link` | Attach an https link into a hospital system to a case (Batch 742). | standard | Every case-access role; hospital roles with case access | `caseAttachments/caseAttachments.ts` |
| `case:attachment:unlink` | Remove an attachment from a case: unlinks only, the stored file is never deleted; refused while it is placed in the report (Batch 742). | standard | Every case-access role; hospital roles with case access | `caseAttachments/caseAttachments.ts` |
| `case:slide-image:open` | Open a slide from its reference preview in the laboratory's own digital pathology application (a separate window; the address comes from the configured template; audited with who, which slide and when, no patient name) (Batch 750). | standard | Every case-access role; hospital roles with case access | `digitalPathology/slideImageOpen.ts` |
| `case:requisition:view` | Open the scanned requisition linked to a case from the case (the report header's Requisition button); each view is audited as Requisition Viewed, with no file name or patient name (Batch 762; `REQUISITION_INGESTION_API.md`). | standard | Every case-access role; hospital roles with case access | `requisitions/requisitionService.ts` |
| `requisition:ingestion:run` | Run requisition ingestion now: read the source and link each scanned requisition to its case by its barcode, or put it in the Unmatched Requisitions queue (the server's scheduled job runs as its own service identity); every match and quarantine is audited (Batch 762). | standard | Roles that open Accession | `requisitions/requisitionService.ts` |
| `requisition:inbox:review` | Open the Requisition Inbox (the Unmatched Requisitions queue, recent links and runs) and view an unmatched scan; each view is audited (Batch 762). | high | Roles that open Accession | `requisitions/requisitionService.ts` |
| `requisition:inbox:resolve` | Link an unmatched scan to a case by its accession, or discard it with a reason; the file itself is never touched; audited (Batch 762). Requires `requisition:inbox:review`. | high | Roles that open Accession | `requisitions/requisitionService.ts` |
| `config:requisition-ingestion:manage` | Set the requisition ingestion source: a watched folder or a sending system, how often it is read, and the separator-sheet barcode; audited (Batch 762). | high | Admin (with the other configuration sections) | `requisitions/requisitionService.ts` |
| `stain:qc:sign-off` | Sign off a staining run at the QC checkpoint on Slide Distribution: every slide passes, or a failed slide is sent for re-stain or re-cut with a reason; audited (Batch 763). | high | Roles that open Slide Distribution, Lab Director | `stainQc/stainQcService.ts` |
| `stain:qc:override` | Sign off a run that waits for its stainer's own sign-off through the interface engine; audited as an override (Batch 763). Requires `stain:qc:sign-off`. | high | Lab Director | `stainQc/stainQcService.ts` |
| `scan:image-qc:sign-off` | Release a scanned image to the Pathologist, or send it back to be scanned again with a reason; audited (Batch 763). | high | Roles that open Slide Distribution, Lab Director | `stainQc/stainQcService.ts` |
| `config:stain-qc:manage` | Set the QC defaults for stainers and slide scanners (auto-accept, the instrument's own sign-off, a PathScribe sign-off); audited (Batch 763). Each instrument's own mode is on the Equipment screen. | high | Admin, Lab Director (with the other configuration sections) | `stainQc/stainQcService.ts` |
| `report:related-cases:attach` | Choose a patient's other released cases to send with the report being signed out, and take them off before sign-out. The chosen cases are fixed when the report is signed out and travel with it in print, PDF and outbound results; a later amendment of a chosen case raises a flag and does not change the signed report (Batch 613). | standard | Pathologist, Fellow | `relatedCases/relatedCaseAttachments.ts` |
| `patient:summary:print` | Print a Patient summary of a patient's released cases that the user may already see, from the patient history. Labelled a summary, not a signed report; every print is audited with counts only (Batch 613). | high | Every case-access role; hospital roles with case access | `relatedCases/patientSummary.ts` |
| `ai:history-extraction:run` | Run the AI extraction on a historical report: the AI reads its Final Diagnosis and Microscopic text and the synoptic fields it finds are kept beside the case, labelled not verified. Advisory only; audited (`HISTORY_EXTRACTION_RUN`, no patient text) (Batch 621). | high | Pathologist, Fellow, Resident | `historyExtraction/runHistoryExtraction.ts`, `historyExtraction/mockHistoryExtractionService.ts` `save` |
| `ai:history-extraction:flag` | Flag an AI extraction, or one field of it, as wrong, for accuracy measurement; changes nothing else; audited (`HISTORY_EXTRACTION_FLAGGED`). Requires `…:run` (Batch 621). | standard | Pathologist, Fellow, Resident | `historyExtraction/mockHistoryExtractionService.ts` `flagAsWrong` |
| `report:case-report:print` | Print or reprint a case report, or open a stored version's PDF (the preview window was retired in Batch 497) (Batch 495, PS-283 §4.2.4). Since Batch 516 a case carrying a print-restricting flag also needs `report:restricted-case:print` (below). | high | Every case-access role; hospital roles with case access | `printing/reportPrintGate.ts` (`beginReportPrint`) |
| `report:restricted-case:print` | Print a case that carries a print-restricting flag (VIP, confidential). Requires `report:case-report:print`. | high | Pathologist (Batch 516) | `printing/reportPrintGate.ts` |
| `retention:disposal-report:export` | Export the disposal report. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `retentionPolicy/exportDisposalReport.ts` |
| `search:case-results:export` | Export case search results. Requires `screen:search:open`. | high | Every case-access role, Lab Director; hospital roles with case access | `printing/exportGate.ts` |
| `search:case-report:export` | Export case search reports (Batch 613). Requires `screen:search:open`. | high | Same roles as the case search export | `printing/exportGate.ts` |
| `search:report-schedule:manage` | Schedule case search reports (Batch 613). Requires `screen:search:open`. | high | Same roles as the case search export | `scheduledReports/mockScheduledReportService.ts` (`guardConfigWrites`) |
| `contribution:trainee-case-reference:export` | Export my trainee case log. Requires `screen:my-contributions:open`. | high | Pathologist, Fellow, Resident, PA, Lab Director; hospital roles with case access | `printing/exportGate.ts` |
| `contribution:case-mix-summary:export` | Export my case-mix progress. Requires `screen:my-contributions:open`. | high | Pathologist, Fellow, Resident, PA, Lab Director; hospital roles with case access | `printing/exportGate.ts` |
| `molecular:batch:supersede` | Supersede a molecular run. | high | Molecular Technologist; hospital roles with case access | `molecular/mockMolecularBatchService.ts` |
| `molecular:order:assign-plate` | Put queued in-house molecular orders on a draft plate, or take one off (Batch 467). Requires `screen:molecular:open`. | standard | Molecular Technologist; hospital roles with case access | `molecularOrders/molecularOrderEngine.ts` |
| `molecular:order:cancel` | Cancel an in-house molecular order (and its add-on slide order), or re-route it to send-out when its lab no longer runs the test in-house (Batch 467). Requires `screen:molecular:open`. | high | Molecular Technologist; hospital roles with case access | `molecularOrders/molecularOrderEngine.ts` |
| `molecular:order:set-lab` | Choose or change the reference lab a queued send-out molecular order goes to: one of the test's approved labs, or any active reference lab when it has none (Batch 467b). Requires `screen:molecular:open`. | standard | Molecular Technologist; hospital roles with case access | `molecularOrders/molecularOrderEngine.ts` |
| `surgical:report:sign-out` | Sign out (Orchestration) or finalize (Assist) a surgical report (Batch 649). The case relationship still applies: only an active participant whose participation type can finalize at the performing lab (`canFinalizeCase`). No role bypasses either check, Superadmin included (the old administrator "admin-override" was removed in Batch 649). | high | Pathologist, Fellow, Resident; hospital roles with case access | `auth/authorizeSurgicalSignOut.ts` |
| `surgical:preliminary:release` | Release a preliminary report on a surgical case before sign-out, held for the release delay (Batch 649). | high | Pathologist, Fellow only. Residents and hospital-defined roles do not get it by default; a laboratory grants it in the Role Dictionary (Pete, Oct 2026: residents do not issue preliminary releases independently) | `reports/releasePreliminaryReport.ts` |
| `surgical:amendment:release` | Release an amendment to a signed surgical report (diagnosis changed; clinician notification required) (Batch 649). | high | Pathologist, Fellow; hospital roles with case access | `reports/mockAmendmentService.ts` (`reports/revisionReleaseCapability.ts`) |
| `surgical:correction:release` | Release a correction to a signed surgical report (no diagnostic change) (Batch 649). | high | Pathologist, Fellow; hospital roles with case access | `reports/mockAmendmentService.ts` (`reports/revisionReleaseCapability.ts`) |
| `surgical:addendum:release` | Release an addendum to a signed surgical report (Batch 649). | high | Pathologist, Fellow; hospital roles with case access | `reports/mockAmendmentService.ts` (`reports/revisionReleaseCapability.ts`) |
| `report:release:recall` | Recall a signed report, preliminary, correction or addendum during its release delay. Only the person who released it, as before (Batch 649). | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `reportRelease/mockReportReleaseService.ts` (`recall`), `reportRelease/releaseReport.ts` (`recallHeldRelease`) |
| `case:pool:claim` | Take a pool case (it is assigned to you). Pool membership rules still apply (Batch 649). | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cases/poolCaseActions.ts` |
| `case:pool:pass` | Pass on a pool case (it stays in the pool) (Batch 649). | standard | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cases/poolCaseActions.ts` |
| `case:flag:apply` | Apply a case or specimen flag in the Flag Manager (Batch 649). | standard | Every case-access role; hospital roles with case access | `../api/caseFlagsApi.ts` |
| `case:flag:remove` | Remove a case or specimen flag in the Flag Manager; who removed it and when are kept (Batch 649). | standard | Every case-access role; hospital roles with case access | `../api/caseFlagsApi.ts` |
| `case:diagnosis-code:apply` | Save diagnosis and procedure codes on a case from the Codes window (Batch 649). | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `codes/diagnosisCodeApply.ts` (report page), `cytology/cytologyCaseActions.ts` (Cytology Screening) |
| `case:accession:create` | Create a case on the Accession screen (Batch 649). Requires `screen:accession:open`. | high | Accessioner, PA; hospital roles with case access | `accessioning/createAccessionedCase.ts` |
| `case:informal-review:request` | Ask a colleague for an informal review, consultation, clinical observation or second opinion on a case (Batch 649). | standard | Pathologist, Fellow, Resident; hospital roles with case access | `reports/sendReviewRequest.ts` |

*Corrected in the Batch 496 README audit (Oct 9, 2026): the five Tumor Board and margin-exception capabilities are not seeded to a hospital's own roles (`customRoleScreenSeed` in `capabilitySeeds.ts` leaves them out); "hospital roles with case access" removed from their rows.*

### Billing (3)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `billing:applied-code:correct` | Correct an applied billing code. | high | Every case-access role, Admin, Lab Director, QA Reviewer; hospital roles with case access or configuration access | `billing/billingCorrection.ts`, `billing/correctServiceCharge.ts` |
| `billing:applied-code:review` | Review a case's billing codes: approve, decline, override, add and delete (each charges or credits the case). | high | Same as `billing:applied-code:correct` | `billing/caseBillingCharges.ts` (`enforceBillingReview`) |
| `billing:charge:approve` | Approve charges. | high | None | `billing/chargeApproval.ts` |
| `billing:smart-capture:review` | Review Smart Capture suggestions. | standard | Pathologist | `smartCapture/smartCaptureService.ts` |
| `billing:smart-capture:approve` | Approve Smart Capture lines. | high | Pathologist | `smartCapture/smartCaptureService.ts` |
| `billing:smart-capture:send` | Send approved Smart Capture lines. | high | Pathologist | `smartCapture/smartCaptureService.ts` |

### Autopsy (12)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `autopsy:body:release` | Release an autopsy body. | high | Every case-access role; hospital roles with case access | `autopsy/releaseAutopsyBody.ts` |
| `autopsy:custody:transfer` | Record a forensic autopsy case's chain-of-custody transfer (body, evidence, or personal effects). | high | Every case-access role; hospital roles with case access | `autopsy/recordAutopsyCustodyTransfer.ts` |
| `autopsy:consent:manage` | Narrow or revoke an already-granted hospital next-of-kin consent (never widens it back). | high | Every case-access role; hospital roles with case access | `autopsy/recordAutopsyConsentStatusChange.ts` |
| `autopsy:consent:reinstate` | Restore an already-narrowed or revoked hospital next-of-kin consent, with a required note. A separate capability from `autopsy:consent:manage` — narrowing and reinstating are opposite-direction actions. | high | Every case-access role; hospital roles with case access | `autopsy/recordAutopsyConsentReinstatement.ts` |
| `autopsy:retention-disposal:record` | Record how and when retained organs/tissue were disposed of. | high | Every case-access role; hospital roles with case access | `autopsy/recordAutopsyOrganRetentionDisposal.ts` |
| `autopsy:retention-detail:record` | Record who holds retained organs/tissue and where, while retention is ongoing (distinct from disposal). | high | Every case-access role; hospital roles with case access | `autopsy/recordAutopsyOrganRetentionDetail.ts` |
| `autopsy:retention-tier:record` | Choose the organ/tissue retention tier and its reason, within what the consent on file permits (Batch 499; saved with no check before). | high | Every case-access role; hospital roles with case access | `autopsy/recordAutopsyOrganRetentionTier.ts` |
| `autopsy:toxicology:order` | Order a postmortem toxicology test on a specimen. | standard | Every case-access role; hospital roles with case access | `autopsy/orderAutopsyToxicology.ts` |
| `autopsy:toxicology:result` | Record the result of an ordered postmortem toxicology test. | high | Every case-access role; hospital roles with case access | `autopsy/recordAutopsyToxicologyResult.ts` |
| `autopsy:toxicology:cancel` | Cancel a still-pending postmortem toxicology order, with a reason. | high | Every case-access role; hospital roles with case access | `autopsy/cancelAutopsyToxicologyOrder.ts` |
| `autopsy:gross-exam-gate:override` | Sign a PAD/FAD despite a blocked authorization gate (missing legal order, or revoked consent), with a required reason. Every override is logged (`AutopsyCaseDetails.gateOverrides`, and the audit trail). | high | None — an administrator assigns it, same as `cytology:qc-review:bypass` | `autopsy/signAutopsyReport.ts` |
| `autopsy:organ-tag:record` | Record a per-organ gross-exam finding (normal, abnormal, or not examined), with an optional note. | standard | GROSSERS (Pathologist, Fellow, Resident, PA) | `autopsy/recordAutopsyOrganTag.ts` |

### Messaging (2)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `message:internal:send` | Send a message or reply. | standard | Every role (hospital roles too) | `messages/mockMessageService.ts` |
| `message:secure-email:send` | Send a secure email. | high | Every role (hospital roles too) | `messages/mockMessageService.ts` |

### Report history (1)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `report:change-history:export` | Export report change history. | high | Admin, QA Reviewer | `reportChangeLog/exportChangeLog.ts` |

### Quality assurance: Operations (15)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `qa:deficiencies:export` | Export deficiencies. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:intraop-linkage:export` | Export frozen section linkage. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:reconciliation:export` | Export discordance and reconciliation. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:follow-up:export` | Export the Follow-up not received list (Batch 454). | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:countersign-turnaround:export` | Export countersign turnaround. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:fppe-tracking:export` | Export credentialing review (FPPE). | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:drift-correction:export` | Export post-final drift corrections. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:patient-match-review:export` | Export patient match review. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:access-request-response:export` | Export access requests. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:ai-discordance:export` | Export AI discordance. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:registry-transmission-audit:export` | Export the registry transmission audit. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:deficiency:raise` | Raise a case or specimen deficiency by hand on the Quality Assurance screen (Batch 649). Requires `screen:quality-assurance:open`. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `deficiencies/qaDeficiencyActions.ts` |
| `qa:deficiency:escalate` | Escalate an open deficiency to CAPA with root cause and corrective action (pending verification) (Batch 649). Requires `screen:quality-assurance:open`. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `deficiencies/qaDeficiencyActions.ts` |
| `qa:deficiency:contain` | Close an open deficiency at once by immediate containment (Batch 649). Requires `screen:quality-assurance:open`. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `deficiencies/qaDeficiencyActions.ts` |
| `qa:deficiency:verify` | Record the effectiveness check of an escalated deficiency: effective closes it, recurred reopens it (Batch 649). Requires `screen:quality-assurance:open`. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `deficiencies/qaDeficiencyActions.ts` |
| `qa:management-review:submit` | Submit a Management Review of closed QA deficiencies from the Quality Assurance screen (Batch 659). Requires `screen:quality-assurance:open`. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `deficiencies/qaDeficiencyActions.ts` |

### Quality assurance: Cytology (1)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `qa:cytology-histology-correlation:export` | Export cytology–histology correlation. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |

### Quality assurance: CAPA (6)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `qa:management-reviews:export` | Export management reviews. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:capa-recommendation:decide` | Confirm or dismiss CAPA recommendations. Requires `screen:quality-assurance:open`. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `quality/mockCapaRecommendationService.ts` |
| `qa:follow-up:record` | Close a follow-up with an outcome, or reopen it (Batch 454). | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `followUp/followUpActions.ts` |
| `qa:follow-up-clinician:email` | Email the ordering clinician about a follow-up that is due soon or overdue, where the facility allows it; never automatic (Batch 454). | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `followUp/followUpClinicianEmail.ts` |
| `qa:pathologist-trend:view` | View discordance patterns. Requires `screen:quality-assurance:open`. | high | Lab Director | `quality/qaTrendService.ts` |
| `qa:pathologist-trend:decide` | Decide a discordance pattern. Requires `qa:pathologist-trend:view`. | high | Lab Director | `quality/qaTrendService.ts` |

### Quality assurance: Financials (1)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `qa:billing-deficiencies:export` | Export billing deficiencies. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |

### Quality assurance: Dashboard, inspection and enterprise (9)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `qa:activity-dashboard:export` | Export QA dashboard. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `audit:error:resolve` | Resolve an Audit Log error. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `auditlog/mockAuditService.ts` |
| `print:job:hold` | Hold or release a print job in the Print Queue. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access (Batch 515) | `printing/mockPrintQueueService.ts` |
| `print:release-hold:override` | Print a report that is still in its release delay, under the Supervisor Override print policy. | high | Admin, Lab Director (Batch 654) | `printing/recordDocumentOutput.ts` (`planReportPrint`) |
| `print:job:cancel` | Cancel a print job in the Print Queue. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access (Batch 515) | `printing/mockPrintQueueService.ts` |
| `print:job:redirect` | Redirect a network print job to another printer. Batch 553: also lets Redirect list the job's site's agent printers; an agent printer on another site than the job's performing lab is refused. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access (Batch 515) | `printing/mockPrintQueueService.ts` |
| `print:job:retry` | Retry a failed print job. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access (Batch 515) | `printing/redispatchPrintJob.ts` |
| `interface:outbound:resend` | Send, resend or simulate a failure for an outbound interface message, in any of the seven queues (Batch 518, PS-122). | high | Admin | `interfaceDispatch/outboundQueueActions.ts` |
| `interface:outbound:hold` | Hold a waiting or failed outbound message from the Outbound Queue screen so nothing sends it until released (Batch 619, PS-800). Requires `screen:outbound-queue:open`. | high | Admin | `outboundQueue/outboundQueueService.ts` |
| `interface:outbound:release` | Release a held outbound message from the Outbound Queue screen (Batch 619). Requires `screen:outbound-queue:open`. | high | Admin | `outboundQueue/outboundQueueService.ts` |
| `interface:outbound:mark-not-reportable` | Close a message a registry rejected as not reportable, with a reason (Batch 619). Requires `screen:outbound-queue:open`. | high | Admin | `outboundQueue/outboundQueueService.ts` |
| `interface:outbound:retract` | Cancel a queued billing charge before release because its case was amended or retracted; terminal, with a reason code (Batch 619). Requires `screen:outbound-queue:open`. | high | Admin | `outboundQueue/outboundQueueService.ts` |
| `interface:outbound:override-release` | Force an immediate release of a queued or held billing charge ahead of its schedule; recorded by user id (Batch 619). Requires `screen:outbound-queue:open`. | high | Admin | `outboundQueue/outboundQueueService.ts` |
| `lockbox:specimen:receive` | Look up a scanned container barcode and write its permanent "Received in Lockbox" receipt (server time and user from the token). A barcode with no pending order gets a placeholder record, never an accession number (Batch 645). Requires `screen:lockbox-drop-off:open`. | high | Accessioner | `lockbox/lockboxService.ts` |
| `lockbox:folder:review` | See the Overnight folder (receipts not yet accessioned, with the time-to-receipt figures) and mark a receipt accessioned (Batch 645). Requires `screen:lockbox-drop-off:open`. | high | Accessioner, Admin | `lockbox/lockboxService.ts` |
| `lockbox:placeholder:resolve` | Attach the real order or accession number to a lockbox placeholder, as a new entry (Batch 645). Requires `lockbox:folder:review`. | high | Accessioner | `lockbox/lockboxService.ts` |
| `interface:engine-status:view` | See the interface engines' status in Audit Log → Interfaces → Engines: each hospital's engine (hosted or on site), its listeners and channels, what is waiting and the dead letters (Batch 554). No patient data. Requires `screen:audit-log:open`. | standard | Admin | `interfaceMonitoring/interfaceMonitoringService.ts` |
| `jobs:server-job:view` | See the API server's background jobs in System Logs → Server jobs: each job kind's waiting, running and dead-lettered counts, the recurring jobs, and the jobs that failed for good (Batch 551). Requires `screen:audit-log:open`. | standard | Admin | `serverJobs/serverJobsService.ts` |
| `jobs:server-job:requeue` | Requeue a dead-lettered delivery, held release, charge, export or event job (Batch 551; interface and print jobs keep `interface:outbound:resend` and `print:job:retry`). Audited by the server. Requires `jobs:server-job:view`. | high | Admin | `serverJobs/serverJobsService.ts` |
| `label:batch:reprint` | Reprint labels for many cases at once, through the print queue (Batch 518, PS-123). | high | Admin, Histotechnologist | `labels/batchLabelReprint.ts` |
| `qa:inspection-evidence:export` | Export inspection evidence binder. Requires `qa:activity-dashboard:export`. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:enterprise-rollup:export` | Export enterprise rollup. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `audit:audit-log:export` | Export the Audit Log. Requires `screen:audit-log:open`. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `printing/exportGate.ts` |
| `audit:error-log:export` | Export the Error Log. Requires `screen:audit-log:open`. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `printing/exportGate.ts` |
| `audit:interface-log:export` | Export the Interface Log. Requires `screen:audit-log:open`. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `printing/exportGate.ts` |
| `audit:qa-log:export` | Export the Quality Assurance log. Requires `screen:audit-log:open`. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `printing/exportGate.ts` |
| `audit:billing-log:export` | Export the Billing Log. Requires `screen:audit-log:open`. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `printing/exportGate.ts` |

### Screens: what each role can open (21)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `screen:accession:open` | Open Accession. | standard | PA, Accessioner; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:worklist:open` | Open Worklist. | standard | Pathologist, Fellow, Resident, PA, Accessioner; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:search:open` | Open Search. | standard | Every case-access role, Lab Director; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:add-on-orders:open` | Open Add-On Orders. | standard | Pathologist, Fellow, Resident; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:intraop-queue:open` | Open Intraop Queue. | standard | Pathologist, Fellow, Resident, PA; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:cytology-qc-queue:open` | Open Cytology QC Peer Review Queue. | standard | Pathologist, Fellow; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:surgical-qa-worklist:open` | Open Surgical Post-Sign-Out QA. | standard | Pathologist, Fellow; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:my-contributions:open` | Open My Contribution. | standard | Pathologist, Fellow, Resident, PA, Lab Director; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:bench-contributions:open` | Open Bench Contributions. | standard | Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:tumor-board:open` | Open Tumor Board. | standard | Pathologist, Fellow, Resident, PA; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:batch-management:open` | Open Batch Management. | standard | Histotechnologist, Cytotechnologist, Molecular Technologist, Admin; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:cytology-workspace:open` | Open Cytology Workspace. | standard | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:microtomy:open` | Open Microtome Workspace. | standard | Histotechnologist; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:cytology-prep:open` | Open the Cytology Preparation bench (Batch 740). | standard | Histotechnologist, Cytotechnologist | `screens/screenAccess.ts` |
| `screen:grossing:open` | Open Grossing Workspace. | standard | PA, Pathologist, Fellow, Resident; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:embedding:open` | Open Embedding Workspace. | standard | PA, Histotechnologist; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:slide-distribution:open` | Open Slide Distribution Workspace. | standard | Histotechnologist; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:molecular:open` | Open Molecular Workspace. | standard | Molecular Technologist; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:margin-exception-review:open` | Open Margin Exception Review. | standard | Pathologist, Fellow, Resident, PA; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:audit-log:open` | Open Audit. | standard | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `screens/screenAccess.ts` |
| `screen:quality-assurance:open` | Open Quality Assurance. | standard | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `screens/screenAccess.ts` |
| `screen:autopsy-dashboards:open` | Open Autopsy Dashboards. | standard | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `screens/screenAccess.ts` |
| `screen:outbound-queue:open` | Open Outbound Queue. | standard | Admin | `screens/screenAccess.ts` |
| `screen:lockbox-drop-off:open` | Open Lockbox Drop-Off. | standard | Accessioner, Admin | `screens/screenAccess.ts` |
| `screen:registry-exceptions:open` | Open Registry Exceptions. | standard | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `registrySubmission/captureRegistryExceptionAsCapa.ts`, `screens/screenAccess.ts` |
| `screen:configuration:open` | Open Configuration. | standard | Admin, Template Author, Template Approver, Lab Director; hospital roles with configuration access | `screens/screenAccess.ts` |

### ForMedrixAI platform support (7)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `platform:cross-tenant-cases:view` | Open other organisations' cases (support). | high | Superadmin only (ForMedrixAI support) | `cases/CaseRouter.ts` |
| `platform:governing-bodies:manage` | Manage governing-body content. | high | Superadmin only (ForMedrixAI support) | `governingBodies/governingBodyAdministration.ts` |
| `platform:signing-rules:manage` | Manage country signing rules. | high | Superadmin only (ForMedrixAI support) | `participationTypes/saveCountryProfiles.ts` |
| `platform:interface-dictionary:manage` | Create vendor interface profiles, edit their field mappings and test them (Interface Dictionary). | high | Superadmin only (ForMedrixAI support) | `interfaceDictionary/interfaceDictionaryServices.ts` |
| `platform:interface-dictionary:publish` | Publish, roll back or switch off a vendor interface profile. Needs manage. | high | Superadmin only (ForMedrixAI support) | `interfaceDictionary/interfaceDictionaryServices.ts` |
| `platform:interface-dictionary:simulate` | Demo: apply a pasted vendor message to a case. Needs manage. | high | Superadmin only (ForMedrixAI support) | `interfaceDictionary/interfaceDictionaryServices.ts` |
| `platform:demo-checklists:remove` | Remove the 19 demonstration checklists (tagged "Demo wording") from a customer organisation's synoptic library; each is archived (Batch 754). Needs `config:protocol:retire`. Audited. | high | Superadmin only (ForMedrixAI support) | `templates/demoChecklistRemoval.ts` |
<!-- capability-catalog:end -->

## Configuration endpoints the API server must check (Batch 429, PS-345)

One row per write the browser's mock services do today. The endpoint that replaces each one checks the capability before writing and audits the check, allowed or refused (all are high risk). Reads are not checked, except the interface previews. The scheduled Assist poll, the LIS physician master-file feed and LIS flag auto-creation are system traffic and are not checked against a person.

| Service (`src/services/`) | Writes | Capability |
|---|---|---|
| `abnormalDetection/mockAbnormalTriggerRuleService.ts` | add, update, deactivate, reactivate | `config:abnormal-triggers:manage` |
| `actionGroups/mockActionGroupService.ts` | create, update, deactivate, reactivate | `config:action-groups:manage` |
| `assetLocation/mockAssetLocationDictionaryService.ts` | add, update, verify, deactivate | `config:asset-locations:manage` |
| `coldChain/mockStorageUnitService.ts` | add, update, deactivate | `config:cold-chain:manage` |
| `coldChain/mockStorageConditionTypeService.ts` | add, update, deactivate, reactivate, remove | `config:cold-chain:manage` |
| `researchCases/researchCaseSettings.ts` | saveResearchCaseSettings | `config:research-cases:manage` |
| `batches/batchPurposes.ts` | saveBatchPurposes | `config:batch-purposes:manage` |
| `assistPolling/mockAssistPollingService.ts` | saveSettings | `config:assist-polling:manage` |
| `billing/mockBillingRuleService.ts` | approveVersion, rejectVersion | `config:billing-tables:approve` |
| `billing/mockBillingRuleService.ts` | createVersion, submitForApproval, retireVersion | `config:billing-rules:manage` |
| `billing/mockBillingTypeTriggerConfigService.ts` | setTriggerOverride, resetToDefault | `config:billing-triggers:manage` |
| `billing/mockCodeImportService.ts` | approveJob, rejectJob | `config:billing-tables:approve` |
| `billing/mockCodeImportService.ts` | importRows, rollbackJob | `config:billing-code-import:run` |
| `billing/mockJurisdictionPaymentMappingService.ts` | add, update, deactivate, reactivate | `config:payment-mappings:manage` |
| `billing/mockMasterPaymentTypeService.ts` | add, update, deactivate, reactivate | `config:payment-types:manage` |
| `billing/mockModifierDictionaryService.ts` | approveVersion, rejectVersion, activateVersion | `config:billing-tables:approve` |
| `billing/mockModifierDictionaryService.ts` | createVersion | `config:billing-modifiers:manage` |
| `billing/mockNcciEditService.ts` | approveImport, rejectImport | `config:billing-tables:approve` |
| `billing/mockNcciEditService.ts` | importQuarter | `config:billing-ncci:manage` |
| `billing/mockRvuCodeMapService.ts` | approveVersion, rejectVersion, activateVersion | `config:billing-tables:approve` |
| `billing/mockRvuCodeMapService.ts` | createVersion | `config:billing-rvu:manage` |
| `caseRegistry/mockCaseMaskService.ts` | saveMask, deleteMask | `config:case-masks:manage` |
| `cases/mockFppeAssignmentService.ts` | create, graduate | `config:fppe:manage` |
| `cassetteColors/mockCassetteColorService.ts` | create, update, deactivate, reactivate | `config:cassette-colors:manage` |
| `cassetteRouting/mockCassetteRoutingRuleService.ts` | create, update, deactivate, reactivate | `config:cassette-routing:manage` |
| `containerTypes/mockContainerTypeService.ts` | create, update, deactivate, reactivate | `config:container-types:manage` |
| `cytology/mockCytologyCategoryService.ts` | add, update, deactivate, reactivate, remove | `config:cytology-categories:manage` |
| `cytology/mockCytologyInstrumentationService.ts` | update, reset | `config:cytology-instrumentation:manage` |
| `cytology/mockCytologyNomenclatureSettingsService.ts` | update, reset | `config:cytology-nomenclature:manage` |
| `cytology/mockCytologyQcSettingsService.ts` | update, reset | `config:cytology-qc-rates:manage` |
| `cytology/mockCytologyRoutingSettingsService.ts` | update, reset | `config:cytology-routing:manage` |
| `cytology/mockCytologyScreeningStrategyService.ts` | update, reset | `config:cytology-screening-strategy:manage` |
| `cytology/mockCytologyWorkloadCapSettingsService.ts` | update, reset | `config:cytology-workload-cap:manage` |
| `cytology/mockFacilityCytologyInstrumentationOverrideService.ts` | create, update, remove | `config:cytology-instrumentation:manage` |
| `cytology/mockFacilityCytologyNomenclatureOverrideService.ts` | create, update, remove | `config:cytology-nomenclature:manage` |
| `cytology/mockFacilityCytologyQcOverrideService.ts` | create, update, remove | `config:cytology-qc-rates:manage` |
| `cytology/mockFacilityCytologyRoutingOverrideService.ts` | create, update, remove | `config:cytology-routing:manage` |
| `cytology/mockFacilityCytologyScreeningStrategyOverrideService.ts` | create, update, remove | `config:cytology-screening-strategy:manage` |
| `cytology/mockCytologyHistologyCorrelationSettingsService.ts` (settings) | update, reset | `config:cytology-histology-correlation:manage` |
| `cytology/mockCytologyHistologyCorrelationSettingsService.ts` (facility overrides) | set, remove | `config:cytology-histology-correlation:manage` |
| `quality/biopsyResectionCorrelationSettings.ts` (settings) | update, reset | `config:biopsy-resection-correlation:manage` |
| `quality/biopsyResectionCorrelationSettings.ts` (facility overrides) | set, remove | `config:biopsy-resection-correlation:manage` |
| `tumorBoardRules/mockTumorBoardRuleService.ts` (rules) | update | `config:tumor-board-rules:manage` |
| `tumorBoardRules/mockTumorBoardRuleService.ts` (facility overrides) | set, remove | `config:tumor-board-rules:manage` |
| `tumorBoard/mockTumorBoardService.ts` (update, status change) | update | `case:tumor-board:manage` |
| `tumorBoard/mockTumorBoardService.ts` (update, board/schedule/presenter change) | update | `case:tumor-board:schedule` (Batch 493) |
| `tumorBoard/mockTumorBoardService.ts` (dismiss) | dismiss | `case:tumor-board:dismiss` |
| `followUp/followUpSettings.ts` (settings) | update, reset | `config:follow-up-tracking:manage` |
| `followUp/followUpSettings.ts` (facility overrides) | set, remove | `config:follow-up-tracking:manage` |
| `organMapping/organMapConfig.ts` (colour layers) | save, remove a layer | `config:organ-map-scheme:manage` (facility layer: with that facility) |
| `organMapping/organMapConfig.ts` (bindings) | save, remove | `config:organ-map-bindings:manage` |
| `cytology/mockFacilityCytologyWorkloadCapOverrideService.ts` | create, update, remove | `config:cytology-workload-cap:manage` |
| `cytology/mockStaffCytologyWorkloadCapOverrideService.ts` (Batch 576) | create, update, remove | `config:cytology-workload-cap:manage` |
| `cytology/mockNonGynCytologyCategoryService.ts` | add, update, deactivate, reactivate, remove | `config:cytology-categories:manage` |
| `cytology/mockSnomedCervicalHistologySeverityMappingService.ts` | add, update, remove | `config:cytology-severity-mapping:manage` |
| `cytology/mockStaffCytologyQcOverrideService.ts` | create, update, remove | `config:cytology-qc-rates:manage` |
| `cytologyQc/mockCytologyQcRuleService.ts` | add, update, deactivate, reactivate, remove, duplicate | `config:cytology-qc-rules:manage` |
| `deficiencies/mockDeficiencyTypeService.ts` | add, update, deactivate, reactivate | `config:deficiency-types:manage` |
| `deficiencies/mockResolutionTypeService.ts` | add, update, deactivate, reactivate | `config:deficiency-types:manage` |
| `delegationTypes/mockDelegationTypeService.ts` | add, update, deactivate, reactivate, remove | `config:delegation-types:manage` |
| `delivery/mockDeliveryRuleService.ts` | create, update, remove | `config:delivery-rules:manage` |
| `deliverySchedules/mockDeliveryScheduleService.ts` | set, remove | `config:delivery-schedules:manage` |
| `billingRelease/mockBillingReleaseService.ts` | set, remove | `config:billing-release:manage` |
| `batchRegistryFeed/mockBatchRegistryFeedService.ts` | saveProfile, removeProfile | `config:batch-registry-feed:manage` |
| `usEpath/mockUsEpathService.ts` | saveProfile, removeProfile, setAssignment, removeAssignment | `config:us-epath:manage` |
| `cosd/mockCosdDestinationService.ts` | set, remove | `config:cosd-destination:manage` |
| `historyExtraction/mockHistoryExtractionSettingsService.ts` | set, remove | `config:history-extraction:manage` |
| `historyExtraction/mockHistoryExtractionService.ts` | save; flagAsWrong | `ai:history-extraction:run`; `ai:history-extraction:flag` |
| `departments/mockDepartmentService.ts` | add, update, verify, deactivate | `config:departments:manage` |
| `digitalPathology/mockDpVendorService.ts` | add, update, deactivate, reactivate, remove | `config:vendor-integrations:manage` |
| `digitalPathology/mockWsiViewerVendorService.ts` | add, update, deactivate, reactivate, remove | `config:vendor-integrations:manage` |
| `equipment/mockEquipmentLogService.ts` | add | `equipment:maintenance:record` |
| `equipment/mockEquipmentService.ts` | create, update, deactivate, reactivate | `config:equipment:manage` |
| `externalResources/mockExternalResourceService.ts` | create, update, remove | `config:external-resources:manage` |
| `facilities/mockFacilityService.ts` | add, update, deactivate, reactivate, verify | `config:facilities:manage` |
| `displayAccess/mockDisplayAccessService.ts` | issueFacilityOpsToken, revokeFacilityOpsToken | `config:display-profiles:manage` |
| `displayAccess/mockDisplayAccessService.ts` | issueOrSuiteToken, revokeOrSuiteToken | `config:or-suite-terminals:manage` |
| `facilityOpsDashboard/mockDisplayProfileService.ts` | add, update, deactivate | `config:display-profiles:manage` |
| `flags/mockFlagService.ts` | add, update, deactivate, reactivate | `config:case-flags:manage` |
| `grossingHardware/mockGrossingHardwareProfileService.ts` | create, update | `config:grossing-hardware:manage` |
| `grossingRoutingOverrides/mockGrossingRoutingOverrideService.ts` | add, update, remove | `config:grossing-routes:manage` |
| `hardwareContainers/mockHardwareContainerRegistryService.ts` | update (Batch 737: a rack's large-format and smart-container settings) | `config:equipment:manage` |
| `imageAssociation/mockGrossImagingVendorService.ts` | add, update, deactivate, reactivate, remove | `config:vendor-integrations:manage` |
| `imageAssociation/mockImageManagementSystemVendorService.ts` | add, update, deactivate, reactivate, remove | `config:vendor-integrations:manage` |
| `inkColors/mockInkColorService.ts` | create, update, deactivate, reactivate | `config:ink-color:manage` |
| `intraopDashboard/mockOrSuiteTerminalService.ts` | add, update, deactivate | `config:or-suite-terminals:manage` |
| `labelDesigner/mockLabelLayoutService.ts` | save, reset | `config:label-layouts:manage` |
| `locations/mockLocationService.ts` | create, update, deactivate, reactivate, verify | `config:facilities:manage` |
| `migration/mockMigrationFieldMappingService.ts` | add, update, remove | `config:migration-mappings:manage` |
| `participationTypes/mockParticipationTypeService.ts` | add, update, deactivate, reactivate, remove | `config:participation-types:manage` |
| `physicians/mockPhysicianService.ts` | add, update, verify, deactivate | `config:physicians:manage` |
| `printRouting/mockPrintRoutingRuleService.ts` | create, update, remove | `config:print-routing:manage` |
| `printSettings/mockFacilityPrintSettingsService.ts` | create, update, remove | `config:print-settings:manage` |
| `printSettings/mockPrintSettingsService.ts` | update, reset | `config:print-settings:manage` |
| `facilities/mockFacilityService.ts` | setPrintSettings (Batch 517; add and update never change report printing) | `config:print-settings:manage` |
| `facilities/mockFacilityService.ts` | setDirectDevicePrinting (Batch 734) | `config:direct-device-printing:manage` |
| `facilities/mockFacilityService.ts` | setOrganMapDelivery (Batch 751) | `config:organ-map-delivery:manage` |
| `secureMessaging/mockSecureMessagingConfigService.ts` | save | `config:secure-messaging:manage` |
| `printerProfiles/mockPrinterProfileService.ts` | add, update, remove | `config:printers:manage` |
| `protocols/mockProtocolService.ts` | add, update, restoreVersion | `config:processing-protocols:manage` |
| `quality/mockQaActivityTypeService.ts` | add, update, deactivate, reactivate | `config:qa-types:manage` |
| `quality/mockQaSupervisionAssignmentService.ts` | create, graduate | `config:cytotech-competency:manage` |
| `quality/mockQaSupervisionAssignmentTypeService.ts` | add, update, deactivate, reactivate | `config:qa-types:manage` |
| `qualitySettings/mockConcordanceReviewSettingsService.ts` | setOrgDefault | `config:concordance-review:manage` |
| `reagentLots/mockReagentLotService.ts` | create, update, deactivate, reactivate | `config:reagent-lots:manage` |
| `reportParts/mockReportPartService.ts` | create, save, archive, clone, remove | `config:report-template:manage` |
| `reportParts/mockReportPartService.ts` | publish | `config:report-template:publish` |
| `reportRelease/mockReportReleaseService.ts` | setOrgDefault | `config:release-buffer:manage` |
| `reportTemplates/mockReportTemplateService.ts` | create, save, update, clone, remove, archive | `config:report-template:manage` |
| `reportTemplates/mockReportTemplateService.ts` | publish | `config:report-template:publish` |
| `research/mockResearchFeedConfigService.ts` | saveConfig | `config:research-feed:manage` |
| `routingRules/mockRoutingRuleService.ts` | add, update, remove | `config:template-routing:manage` |
| `scanStations/mockScanStationService.ts` | create, update, deactivate, reactivate | `config:scan-stations:manage` |
| `session/mockSessionTimeoutService.ts` | setOrgDefault | `config:session-security:manage` |
| `specimenDictionary/mockSpecimenDictionaryService.ts` | addEntries, updateEntries | `config:specimen-dictionary:manage` |
| `stains/mockMolecularTargetService.ts` | add, update | `config:stain-dictionary:manage` |
| `stains/mockSectioningProtocolService.ts` | add, update | `config:stain-dictionary:manage` |
| `stains/mockStainOrderMacroService.ts` | add, update | `config:stain-dictionary:manage` |
| `stains/mockStainTypeService.ts` | add, update | `config:stain-dictionary:manage` |
| `subspecialties/mockSubspecialtyService.ts` | add, update, deactivate, reactivate | `config:subspecialties:manage` |
| `tatConfig/mockTatTargetService.ts` | add, update, remove | `config:tat-targets:manage` |
| `validationStudies/mockValidationStudyService.ts` | create, update, submitForReview, activate, close, remove | `config:validation-studies:manage` |
| `validationStudies/mockValidationStudyService.ts` | recordApproval | `validation:approval:record` |
| `workstationGroups/mockWorkstationGroupService.ts` | create, update, deactivate, reactivate | `config:workstation-groups:manage` |
| `templates/templateService.ts` | saveDraft, submitForReview, deleteTemplate | `config:protocol:draft` |
| `templates/templateService.ts` | approveTemplate, requestChanges, resetToDraft | `config:protocol:approve` |
| `templates/templateService.ts` | resubmitForReview | `config:protocol:draft` or `config:protocol:approve` |
| `templates/templateService.ts` | publishTemplate | `config:protocol:publish` |
| `templates/templateService.ts` | archiveTemplate, restoreTemplate | `config:protocol:retire` |
| `aiBehavior/IAIBehaviorService.ts` | update, reset | `config:ai-behavior:manage` |
| `aiConfig/saveAiSettings.ts` | saveOrgAiProvider, saveOrgOrchestratorDefault | `config:ai-provider:manage` |
| `models/mockModelService.ts` | setDefault, update, retire, adopt | `config:ai-model:manage` |
| `actionRegistry/mockActionRegistryService.ts` | updateAction | `config:actions:manage` |
| `macros/mockMacroService.ts` | add, update, deactivate, reactivate (shared or someone else's macro; your own personal macro needs nothing) | `config:macros:manage` |
| `systemConfig/systemConfigChangeChecks.ts` | voiceEnabled | `config:voice:manage` |
| `systemConfig/systemConfigChangeChecks.ts` | approvedFonts | `config:report-appearance:manage` |
| `systemConfig/systemConfigChangeChecks.ts` | showPeerAveragesToPathologists, facilityTimezone | `config:contribution-settings:manage` |
| `systemConfig/systemConfigChangeChecks.ts` | enterprise features.abnormalDetectionEnabled | `config:abnormal-triggers:manage` |
| `systemConfig/systemConfigChangeChecks.ts` | enterprise terminologyLicences (Batch 623) | `config:code-systems:manage` |
| `reportAppearance/saveDocumentStyle.ts` | saveDocumentStyleDefault | `config:report-appearance:manage` |
| `retention/retentionPolicyService.ts` | saveRetentionPolicy | `config:retention-policy:manage` |
| `cases/casePoolAssignmentService.ts` | saveRoutingRules, saveRoutingConfig | `config:case-routing:manage` |
| `cases/casePoolAssignmentService.ts` | routeUnassignedCases ("Run now") | `case:routing:run` |
| `assistPolling/assistPollingRuntime.ts` | runAssistPollNow (manual), ingestLisMessageNow, retryFailedLisEventsNow | `assist:lis-message:ingest` |
| `orderIntake/mockOrderIntakeService.ts` | addCrosswalkEntry, updateCrosswalkEntry | `config:crosswalk:manage` |
| `interfacePreview/permitInterfacePreview.ts` | outbound message (ADT/ORU) and DFT preview reads | `config:interface-preview:view` |
| `participationTypes/saveCountryProfiles.ts` | saveCountryProfilesWithAudit | `platform:signing-rules:manage` |
| `interfaceDictionary/interfaceDictionaryServices.ts` | createProfile, startDraft, saveMappings, testProfile; publish, rollback, retire; simulateReceive (via guardConfigWrites) | `platform:interface-dictionary:manage`, `:publish`, `:simulate` |
| `auth/linkedAccounts.ts` | unlinkExternalIdentity | `config:staff-access:assign` |
| `subspecialties/mockSubspecialtyService.ts` | assignUser, removeUser | `config:staff:edit` |

## Actions wired in Batch 432 (PS-345)

These actions had a service method but nothing called it; Batch 432 added the screens. The API server makes the same checks on the same endpoints.

| Action | Service (mock) | Check |
|---|---|---|
| Resolve an Audit Log error (records who and when) | `auditlog/mockAuditService.ts` `resolveError` | `audit:error:resolve` |
| Send, resend or simulate a failed outbound interface message (Batch 518) | `interfaceDispatch/outboundQueueActions.ts` `dispatchOutboundEntry`, `resendOutboundEntry`, `simulateOutboundFailure` | `interface:outbound:resend` |
| Hold, release, retry, retract, release now or mark not reportable on the Outbound Queue (Batch 619) | `outboundQueue/outboundQueueService.ts` `hold`, `release`, `retry`, `retract`, `overrideRelease`, `markNotReportable` | `interface:outbound:hold`, `interface:outbound:release`, `interface:outbound:resend`, `interface:outbound:retract`, `interface:outbound:override-release`, `interface:outbound:mark-not-reportable` |
| Scan in, review, mark accessioned or link a placeholder in Lockbox Drop-Off (Batch 645) | `lockbox/lockboxService.ts` `lookupBarcode`, `receiveSpecimen`, `getFolder`, `markAccessioned`, `resolvePlaceholder` | `lockbox:specimen:receive`, `lockbox:folder:review`, `lockbox:placeholder:resolve` |
| Batch label reprint (Batch 518) | `labels/batchLabelReprint.ts` `reprintLabelsForCases` | `label:batch:reprint` |
| See the interface engines' listeners and queues (Batch 554) | `interfaceMonitoring/interfaceMonitoringService.ts` `engines` (the API server checks again) | `interface:engine-status:view` |
| See the server jobs; requeue a dead-lettered job (Batch 551) | `serverJobs/serverJobsService.ts` `health`, `deadLetters`, `requeue` (the API server checks again) | `jobs:server-job:view`, `jobs:server-job:requeue` |
| Retire an AI model (not the default) | `models/mockModelService.ts` `retire` | `config:ai-model:manage` |
| Escalate an SLA-breached cytology QC review (reason required) | `cytologyQc/mockCytologyQcCaseAssignmentService.ts` `escalateForSlaBreach` | `cytology:qc-review:record` |
| Cytology QC supervisor bypass (justification required) | same, `supervisorBypass` | `cytology:qc-review:bypass` (nobody by default; also opens the Cytology QC queue) |
| Referral transit status, forward only, never "result received" by hand | `referral/mockReferralTrackingService.ts` `updateTransitStatus` | `referral:transit-status:update` |
| Surgical peer review risk weight per subspecialty | `quality/mockSurgicalPeerReviewRiskWeightService.ts` `setWeight` / `removeWeight` | `config:qa-types:manage` |
| Deny an access request (reason required; the requester is messaged) | `access/mockAccessRequestService.ts` `deny` | pool: `config:staff:edit`; pediatric and Orchestration: `config:staff-access:assign` |
| Facility spelling dictionary add / remove (audited) | `spellcheck/mockCustomDictionaryService.ts` | `config:facilities:manage` (was a role-name check) |
| Personal spelling word remove | same, `removePersonal` | the owner only (no capability) |
| Learned voice commands (list, remove) | `actionRegistry/mockActionRegistryService.ts` | the person's own (personal setting, no capability) |

## Billing corrections and charge approval (Batch 433, PS-345)

Pete: every billing correction after sign-out goes through one engine, needs a
reason, is audited, and can be made without opening the case; charges can wait
for a billing-office approval, set per enterprise with facility overrides.

| Action | Service (mock) | Check |
|---|---|---|
| Correct billing for a case: change a CPT code or modifier, reverse a charge, add a missing charge (credit and rebill; reason and comment required; one audit entry; resolves the billing deficiency it came from, or records a resolved `POST_SIGNOUT_CORRECTION` one) | `billing/billingCorrection.ts` `applyBillingCorrection` (the report page's own code change goes through it too, via `correctServiceCharge.ts`) | `billing:applied-code:correct` for the case |
| Review a case's billing codes from the billing panel (report page, Cytology Workspace, Microtome full review): approve, decline, override, add, delete; each change charges, credits or is audited | `billing/caseBillingCharges.ts` (`recordCaseCharge`, `recordCaseCredit`), with the coding changes in `billing/caseBillingCoding.ts` | `billing:applied-code:review` for the case |
| Approve, reject (reason required), hold, release a charge awaiting approval | `billing/chargeApproval.ts` `decideCharge` | `billing:charge:approve` for the charge's performing lab (nobody holds it by default); the person who drafted the charge can't approve or reject it |
| Whether a facility's charges wait for approval | `Facility.requireBillingApproval` (enterprise on/off; a lab unset follows its enterprise) | saving a facility (`config:facilities:manage`) |

Server notes:

- The correction is one transaction: the credit, the new charge, the
  deficiency update and the audit row commit together. The engine refuses a
  charge already reversed, so a retried request can't credit twice.
- `PENDING_APPROVAL` and `HOLD` charges are never sent to the billing system;
  approval moves a charge to `APPROVED` for the next outbound sweep.
- The four-eyes rule is enforced on the server, not only in the browser.

## WSI scan batches and corrections to Batch 433 (Batch 434, PS-345)

| Action | Service (mock) | Check |
|---|---|---|
| Load slides from the scanning queue onto a slide scanner as a batch | `digitalPathology/wsiScanBatchWorkflow.ts` `loadScanBatch` | `wsi:scan-batch:load` for the scanner's lab (Equipment register `facilityId`) |
| Send the batch manifest to the scanner (interface engine, transaction `WSI_SCAN_MANIFEST`) | same, `sendScanBatch` | `wsi:scan-batch:send` for the scanner's lab |
| Unload a batch (every slide has its result, or it was never sent); slides not scanned successfully go back to the queue | same, `unloadScanBatch` | `wsi:scan-batch:unload` for the scanner's lab |
| Approve, reject, hold, release a charge | `billing/chargeApproval.ts` `decideCharge` | `billing:charge:approve` for the charge's performing lab, now also found for legacy tenant ids (`facilities/resolveCasePerformingLab.ts`); a charge whose lab can't be found is refused (`LAB_UNKNOWN`) instead of being checked with no facility |

Server notes:

- Loading a batch, linking each slide (`StainOrder.wsiScanBatchId`, status `Loaded on Scanner`) and the audit row are one transaction; a slide already in a batch can't be loaded again.
- The batch is `scanning` only after the interface engine accepts the manifest. A refused or unreachable send leaves it `loaded` with `sendError`, and it can be sent again.
- Inbound scan status (`WsiScanStatusUpdateEventPayload`) moves a scanning batch to `completed` (or `failed` when any slide failed) once every slide has its outcome; unloading sets `unloaded`.
- A billing correction also updates the case's own coding (specimen and block `coding.cpt`) in the same transaction, except the report page's own code change, which saves the case itself.
- Each batch write publishes `WsiScanBatchChanged` on the live hub after the commit (`LIVE_UPDATES_SIGNALR.md` §11).
- Admin opens Batch Management (`screen:batch-management:open`, Batch 434 follow-up) but doesn't start with the scan-batch actions.
- The engine's routing list for every outbound transaction, `WSI_SCAN_MANIFEST` included, is `docs/architecture/INTERFACE_TRANSACTIONS.md`.

## Exports and the print/export audit (Batch 437, PS-282, PS-357)

| Action | Service (mock) | Check |
|---|---|---|
| Export Audit Log → Audit Log / Error Log / Interface Log / Quality Assurance / Billing Log as CSV | `printing/exportGate.ts` `beginExport` | `audit:audit-log:export`, `audit:error-log:export`, `audit:interface-log:export`, `audit:qa-log:export`, `audit:billing-log:export` (each needs `screen:audit-log:open`) |
| Export case search results | `caseSearch/createCaseSearchService.ts` `exportRows` | `search:case-results:export` (refused: `EXPORT_NOT_PERMITTED`, no rows) |
| Export case search report | `caseSearch/createCaseSearchService.ts` `exportReport` | `search:case-report:export` (refused: `EXPORT_NOT_PERMITTED`, no report) |
| Create, change, pause, resume, delete or run a report schedule | `scheduledReports/mockScheduledReportService.ts` | `search:report-schedule:manage` (refused: `CONFIG_NOT_PERMITTED`) |
| Export the trainee case log / the case-mix progress summary (My Contributions) | `printing/exportGate.ts` `beginExport` | `contribution:trainee-case-reference:export`, `contribution:case-mix-summary:export` |

Server notes:

- Every print, reprint, preview print, stored-PDF open and export writes one audit row (`printing/documentOutputAudit.ts`): event `DOCUMENT_PRINTED`, `DOCUMENT_REPRINTED`, `DOCUMENT_PREVIEW_PRINTED`, `DOCUMENT_RENDERED`, `DOCUMENT_EXPORTED` or `DOCUMENT_FAXED`; the person (or `SYSTEM`); the accession; and document, id, version, destination, status (`success`, `failed`, `pending`), time in UTC with the local offset, reason, format and row count. The server writes the same row for the same actions, and for every file it renders or sends itself.
- An export is checked before the file is built; a refusal builds nothing.
- A report printed before is a reprint. When the performing lab's print settings ask for it (`requireReprintReason`), a reprint needs a reason, kept in the row.
- Configuration exports (dictionaries, crosswalks, the physician list, protocol files) are audited but have no capability of their own: the Configuration screen and section already decide who sees the data.

## CAPA recommendations and revision reasons (Batch 438, PS-144 to PS-148)

| Action | Service (mock) | Check |
|---|---|---|
| Confirm a CAPA recommendation (opens the CAPA, assigned to the chosen owner) | `quality/capaRecommendationService.ts` `confirm` | `qa:capa-recommendation:decide` (needs `screen:quality-assurance:open`) |
| Dismiss a CAPA recommendation (reason required) | `quality/capaRecommendationService.ts` `dismiss` | `qa:capa-recommendation:decide` |
| Mark a surgical case "follow-up expected" at sign-out | `followUp/followUpActions.ts` `markFollowUpExpected` | `case:follow-up:expect` |
| Overwrite a newer version after an edit conflict | `cases/caseWrite.ts` `overwriteAfterConflict` | `case:edit-conflict:override` |
| Record a follow-up's outcome (closes it) / reopen it | `followUp/followUpActions.ts` `recordFollowUpDisposition` / `reopenFollowUp` | `qa:follow-up:record` |
| Email the ordering clinician about a follow-up (reviewed, then sent) | `followUp/followUpClinicianEmail.ts` `emailOrderingClinician` | `qa:follow-up-clinician:email` |
| Add, edit, deactivate or reactivate a revision reason, including its "clinically significant" switch | `reasons/mockReasonDictionaryService.ts` (`permitReasonChange`, by category; Batch 736) | `config:revision-reasons:manage` |
| Add, reword, reorder, retire or restore a bench reason (categories `BENCH_*`) | `reasons/mockReasonDictionaryService.ts` (`permitReasonChange`, by category; Batch 736) | `config:bench-reasons:manage` |

Server notes:

- Nothing opens a CAPA by itself (Pete, Oct 2). The server records a recommendation when a QA review finds a discordance its rule names (unless the reviewers reached consensus), when reviewers can't agree, when a peer review after sign-out finds a discordance, and when an amendment or correction is released for a reason marked clinically significant. Every cytology diagnosis correction recommends, because its reason is free text.
- A recommendation for a problem that already has a live one (pending, or confirmed with its CAPA still open) is linked to it, not added: a correction after a discordance on the same case links to the discordance; the same deficiency type on the same specimen links to the earlier one. A dismissed one never absorbs a new event.
- Confirming needs an owner; dismissing needs a reason. A decided recommendation can't be decided again (`NOT_PENDING`).
- Audit events: `CAPA_RECOMMENDED`, `CAPA_RECOMMENDATION_LINKED`, `CAPA_RECOMMENDATION_CONFIRMED` (with the CAPA's id and owner), `CAPA_RECOMMENDATION_DISMISSED` (with the reason).
- Endpoints: `GET /api/quality/capa-recommendations`, `POST /api/quality/capa-recommendations/{id}/confirm` `{ assignedTo, note? }`, `POST /api/quality/capa-recommendations/{id}/dismiss` `{ reason }`. Recording is server-side only; there is no client endpoint to create one.

## Peer review before sign-out, clinical-pathologic mismatch, outside consults (Batch 439, PS-144, PS-145, PS-148)

| Action | Service (mock) | Check |
|---|---|---|
| Ask for a peer review; withdraw it; record the consensus as the signing pathologist | `quality/peerReviewService.ts` `request`, `withdraw`, `resolve` | `case:peer-review:request` |
| Record the independent read; record the consensus as the reviewer | `quality/peerReviewService.ts` `recordRead`, `resolve` | `case:peer-review:record` |
| Sign out ahead of a required review for urgent care | `quality/peerReviewService.ts` `override` | `case:peer-review:override` |
| Decide a clinical-pathologic mismatch suggestion | `clinical/clinicalMismatchDecision.ts` | `case:clinical-mismatch:record` |
| Record clinical history after accession (audited `CLINICAL_HISTORY_UPDATED`; refused once signed out) | `clinicalHistory/recordClinicalHistoryAfterAccession.ts` | `case:clinical-history:record` |
| Assess an outside consultant's opinion | `consultAccess/mockConsultTokenService.ts` `assessOpinion` | `case:outside-consult:assess` |
| Change where the peer-review gate is on (organisation, facility, department) | `quality/mockPeerReviewSettingsService.ts` `save` (via `guardConfigWrites`) | `config:peer-review:manage` |
| Read the clinical mismatch rules | `clinical/clinicalMismatchRuleService.ts` `list` | `config:clinical-mismatch-rules:view` |
| Add, change or remove a clinical mismatch rule; audited (`CLINICAL_MISMATCH_RULE_CHANGED`) | `clinical/clinicalMismatchRuleService.ts` `save`, `remove` | `config:clinical-mismatch-rules:manage` |
| Save an edit to the AI instructions (pending approval); audited (`AI_PROMPT_EDITED`) | `clinical/aiInstructionService.ts` `saveDraft` | `config:ai-prompt:edit` |
| Approve or reject a version of the AI instructions; audited (`AI_PROMPT_APPROVED`, `AI_PROMPT_REJECTED`) | `clinical/aiInstructionService.ts` `approve`, `reject` | `config:ai-prompt:approve` |
| Read the AI instructions | `clinical/aiInstructionService.ts` `list` | `config:ai-prompt:view` |
| Add, change or remove an AI vendor policy rule; audited (`AI_VENDOR_POLICY_CHANGED`) | `aiIntegration/aiVendorPolicyService.ts` `save`, `remove` | `config:ai-vendor-policy:manage` |
| Set or reset a jurisdiction's code systems; audited (`CODE_SYSTEM_POLICY_CHANGED`) | `coding/codeSystemPolicyService.ts` `save`, `reset` | `config:code-systems:manage` |

Server notes:

- **First-time malignancy** (Pete, Oct 2) is judged from the patient's prior cases, across every identity confirmed to be the same person: none malignant (a confirmed Malignant finding, or a diagnosis stating an established malignancy, not a negated or tentative mention), and no known malignancy in the order's clinical history (category `MAL_STAGE`) or indication. Rules: `services/quality/peerReviewRules.ts`.
- **The reviewer** is a different, active pathologist; the server refuses the signer as reviewer (`REVIEWER_IS_SIGNER`) and a second open request for the case (`ALREADY_REQUESTED`). Only the reviewer records the read (`NOT_REVIEWER`); either pathologist records the consensus (`NOT_A_PARTY` otherwise).
- **The gate** is off by default. The most specific setting wins: department (the case's subspecialty), then the facility that signs it out (the performing lab, resolved from the ordering facility), then the organisation. With it on, sign-out is refused while a first-time malignancy has no completed review (or while a requested review is open), unless an urgent-care override is recorded (reason `immediate-surgery`, `immediate-treatment`, or `other-urgent-care` with a note). An override leaves the review owed within 24 hours.
- **QA records.** A completed review writes a "Pre-Sign-Out Peer Review" record: concordant, or discordant with `consensus` `consensus-reached` / `unresolved`; `recordedBy` is the reviewer and `reviewedPathologist` the signer (PS-147 will trend on this). A mismatch decision writes "Clinical-Pathologic Correlation". An outside consult assessment writes "Outside Consult Correlation" with `postSignOut` set when the report was already released (`finalized` or `closed`).
- **CAPA** is always a recommendation (Pete): an unresolved disagreement → `unresolved-disagreement`; an unresolved mismatch → `clinical-mismatch`; a major outside-consult discordance on a released report → `post-signout-discordance`. Consensus reached, a resolved mismatch, or a discordance found before release recommend nothing.
- **The mismatch check** sends only narrative and clinical text to the AI provider, never patient identifiers. The server should run it, not the browser.
- Audit events: `PEER_REVIEW_REQUESTED`, `PEER_REVIEW_READ_RECORDED`, `PEER_REVIEW_RESOLVED`, `PEER_REVIEW_WITHDRAWN`, `PEER_REVIEW_OVERRIDDEN`, `PEER_REVIEW_GATE_CHANGED`, `CLINICAL_MISMATCH_DECIDED`, `consult.opinion.assessed`.
- Endpoints: `GET /api/cases/{id}/peer-review`, `POST /api/cases/{id}/peer-review` `{ reviewerId, trigger, note? }`, `POST /api/peer-reviews/{id}/read` `{ agrees, diagnosis?, severity?, notes? }`, `POST /api/peer-reviews/{id}/resolve` `{ result, consensusDiagnosis?, note? }`, `POST /api/peer-reviews/{id}/withdraw` `{ reason }`, `POST /api/cases/{id}/peer-review/override` `{ reason, note? }`, `GET/PUT /api/config/peer-review-gate`, `POST /api/cases/{id}/clinical-mismatch` (Batch 530: `{ kind, source, confidence?, resolution, risk?, ruleId?, quickReason?, note?, reviewOf? }`; see the mismatch section below), `POST /api/consult-opinions/{id}/assessment` `{ assessment, note? }`.

## GYN cytology QC queue and pathologist review tray (Batch 440, PS-271)

| Action | Service (mock) | Check |
|---|---|---|
| Record a QC rescreen | `cytology/saveCytologyReview.ts` | `cytology:review:record` (existing), plus the rule below |
| Take a positive GYN case for pathologist review | `cytology/cytologyQueuesLive.ts` `takeCytologyReview` | `cytology:pathologist-review:take` |

Server notes:

- **QC / Rescreen queue** (Pete, Oct 2): an unassigned, shared queue: every QC-flagged GYN specimen (random or targeted high-risk) still waiting for its rescreen, across every case the viewer may open, not only the cases assigned to them. A specimen the viewer did the primary screen on stays in their queue, marked as theirs, and the server refuses a new QC rescreen recorded by the person who did the primary screen (`QC_BY_PRIMARY_SCREENER`). A pathologist doing the QC records it as the QC role (when the QC flag is pending and no screen has asked for a pathologist yet). Rules: `services/cytology/cytologyQueues.ts`.
- **Cytology Review tray**: a GYN specimen whose primary, QC or secondary screen asked for pathologist review, with no pathologist review recorded and the case not signed out (`finalized`, `closed`, `pending-release`). Listed to holders of the capability while no pathologist is on the case (`open`), and afterwards only to the pathologist on it (`mine`). No auto-assignment.
- **Taking** makes the caller the case's primary participant; the cytotechnologist stays on the case as `cytotechnologist` (a cytotech who was primary, possible before Batch 441, is demoted to `cytotechnologist`, never to the co-signer slot). A cytotech is never counted as the case's pathologist; with no participants list, `order.assignedTo` decides. Refused with `ALREADY_TAKEN` when another pathologist is on the case and `NOT_AWAITING` when the case no longer needs a pathologist; the server must make the take atomic so two pathologists can't both take one case. A QC rescreen that finds an abnormality follows the same route; no discrepancy is recorded automatically.
- Audit event: `CYTOLOGY_REVIEW_TAKEN`.
- Endpoints: `GET /api/cytology/qc-queue`, `GET /api/cytology/review-tray`, `POST /api/cases/{id}/cytology-review/take`.

## Cytotechnologists and pathologist slots; the case team (Batch 441)

Pete (Oct 2): "Cytotechs can not be selected for Pathologist roles."

| Action | Service (mock) | Check |
|---|---|---|
| Change a case's team (Case Team) | `cases/saveCaseTeam.ts` | `case:team:manage` (every role that could open a case report) |
| Delegate a case or a synoptic | `delegations/mockDelegationService.ts` | `case:delegation:create` (existing), plus the rule below |
| Change a role's participation types | `roles/roleAdministration.ts` | `config:roles:manage` (existing), plus the rule below |

Server notes:

- **The rule** (`participationTypes/cytotechParticipationRules.ts`): staff whose roles include Cytotechnologist and none of Pathologist, Resident or Fellow may not hold a pathologist participation type: `primary`, `attending`, `resident`, `frozen`, `second_opinion`, `consultant`, `provisional_hire`, or any type that can finalize. This holds whatever the role catalog lists.
- **Refusals:** a case-team save with such a participant (`cytotechPathologistType`, naming the person and type); a delegation to such a person, since every delegation puts its recipient in a pathologist slot (`recipientIsCytotechnologist`); a save of the Cytotechnologist role listing a pathologist type (`cytotechPathologistType`).
- **Pool claims:** a cytotech claiming a pool case holds `cytotechnologist`, never the `primary` fallback. The built-in Cytotechnologist role lists `cytotechnologist`; stored catalogs with an empty list are filled.
- **Demotion:** when a new primary is set, a cytotech who held `primary` becomes `cytotechnologist`, not `attending`.
- Endpoint: `PUT /api/cases/{id}/team` `{ participants }`.

## Discordance patterns over time (Batch 442, PS-147)

Pete (Oct 2): thresholds are each site's to set, not constants in code.

| Action | Service (mock) | Check |
|---|---|---|
| Change the discordance trend policy (organisation; any performing lab's own) | `quality/mockQaTrendPolicyService.ts` `save` (via `guardConfigWrites`) | `config:qa-trend-policy:manage` (Admin, Lab Director) |
| See the patterns (and run the evaluation) | `quality/qaTrendService.ts` `list`, `evaluate` | `qa:pathologist-trend:view` (Lab Director) |
| Start a review, conclude it with a CAPA, or dismiss | `quality/qaTrendService.ts` `decide` | `qa:pathologist-trend:decide` (Lab Director) |

Server notes:

- **Policy** (`QaTrendPolicy`): `pathologistTrendEnabled`, `specimenTypeTrendEnabled`, `rollingWindowMonths` (1–36), `minSampleSize` (≥1), `majorSeverities` (of `low`/`medium`/`high`), `countThreshold` (0 = off), `rateThresholdPercent` (0–100, 0 = off; not both 0), `action` (`review-task` | `notify-only`). Organisation default, overridden per performing lab. Defaults: 3 months, 20 reviews, `high`, 3 majors or 10%, `review-task`. Changes audited `QA_TREND_POLICY_CHANGED`.
- **What counts:** completed QA reviews (outcome concordant or discordant) in the window. A major discordance is a discordant review at a major severity. Each review is judged by the policy of the lab that performed its case (the ordering facility's performing lab).
- **Two patterns:** per pathologist (records naming `reviewedPathologist`: pre-sign-out peer review, outside consult, and from Batch 442 retrospective surgical peer review, which names the case's primary) and per specimen type (the reviewed specimen's dictionary entry, whoever read it). Grouped per subject and performing lab.
- **Trigger:** at least `minSampleSize` reviews and either test crossed. One open recommendation per subject and lab (`recommended`, `noted` or `under-review`).
- **Never a CAPA by itself:** `review-task` → `recommended` (waits for a decision); `notify-only` → `noted`. The Lab Director starts a review (`under-review`), then concludes with `capa-opened` (note required) or dismisses (reason required). Audited `QA_TREND_RECOMMENDED`, `QA_TREND_DECIDED`.
- **Who sees it:** holders of `qa:pathologist-trend:view` only; the reviewed pathologist doesn't hold it by default. Return 403 to anyone else.
- **When to evaluate:** the mock evaluates when the list opens. The server should evaluate after each QA record is saved, and notify the holders of the view capability for a new `recommended` one.
- Endpoints: `GET/PUT /api/config/qa-trend-policy`, `GET /api/qa/trends`, `POST /api/qa/trends/{id}/decision` `{ kind: 'start-review' | 'open-capa' | 'dismiss', note? }`.

## Support access (Batch 372)

The hospital controls whether ForMedrixAI support reaches its data. The browser
version is `src/services/supportAccess/`; the server must do the following.

1. **Policy gate before the capability check.** Every request from a support
   (Superadmin) token that touches an organisation other than the agent's own
   first reads that organisation's policy:
   - `disabled` → `403 { "error": "support_access_disabled" }`;
   - `approvalRequired` → allowed only with an approved, unexpired request for
     that agent and organisation, else `403 { "error": "support_access_not_approved" }`;
   - `alwaysAllowed` → allowed.
   Refusals are recorded in the organisation's support audit. List and search
   endpoints drop rows from organisations the agent can't reach, rather than
   refusing the whole request.
2. **Ticket-bound sessions.** On approval the server issues (or marks) the
   agent's access with the ticket id and the approval's expiry
   (`approvedAt + windowMinutes`, default 120, allowed 30/60/120/240/480). The
   token or server-side session carries both; nothing is honoured after
   expiry, revocation, the agent ending it, or the ticket closing (ticketing
   webhook).
3. **The hospital's support audit table**, one per tenant (or a tenant-keyed
   table whose rows only that tenant can read), append-only for the
   application's database login. Row: `seq`, `at` (UTC), actor id and name,
   ticket id, action, case ids, detail (English, PHI-free), **originating IP
   and country** (from the request, which the browser can't know truthfully),
   `prevHash`, `hash` = SHA-256 over the JSON array
   `[id, seq, tenantId, at, actorId, actorName, ticketId, action, caseIds, detail, originIp, originCountry, prevHash]`,
   genesis `prevHash` 64 zeros. Actions: `policyChanged`, `accessRequested`,
   `accessApproved`, `accessRejected`, `accessExpired`, `accessEnded`,
   `accessRevoked`, `caseOpened`, `casesListed`, `searchRun`, `caseEdited`,
   `accessRefused`, `auditExported`; also support's exports and configuration
   changes in that tenant.
4. **Notification.** A new request notifies the organisation's approvers
   (holders of `config:support-access:approve`) in-app, by email, and by an
   optional tenant webhook.
5. **Export** as CSV, JSON (with the chain check) and PDF, columns
   `Timestamp | Support agent name | Originating IP | Originating country | Ticket ID | Action taken | Case IDs | Detail`.

## Anatomical maps (Batch 461)

The maps beside the synoptic (prostate in Batch 461; the other organs follow)
are drawn from the synoptic answers; the map stores nothing of its own. The
full contract is `docs/architecture/ORGAN_MAPPING_API.md`.

| Action | Service (mock) | Check |
|---|---|---|
| Insert the map into the report (a snapshot in print colours, SVG and PNG), insert it again, or remove it; refused when the report is signed out, pending release or pending countersign; audited | `organMapping/organMapFigures.ts` (`insertOrganMapFigure`, `removeOrganMapFigure`) | `report:organ-map:insert` for the case |
| Save or remove a colour layer (enterprise, jurisdiction, facility), with its thresholds (Batch 462: breast close margin, 0.1–10 mm; Batch 464: polyp and CRM involved margins, 0–10 mm with ≤, < or =; Batch 465: oral involved 0–10 mm and close 0–20 mm, each with an operator, validated with what the layer inherits — close above involved — strictly, Batch 465b — with conflicts a save leaves in lower layers returned as warnings and audited, "=" only with 0 mm); validated (hex colour, a pattern for every colour but "no tumour" and "not sampled", wording ≤ 40); audited before → after | `organMapping/organMapConfig.ts` `saveOrganMapSchemeLayer` | `config:organ-map-scheme:manage` (facility layer: with that facility) |
| Save or remove a template's map binding (Batch 466b: with the generic margin questions it calculates); validated against the template; audited | `organMapping/organMapConfig.ts` `saveOrganMapBinding` | `config:organ-map-bindings:manage` |

## Structured Inking, Module 1 (Batch 480, PS-359)

Margin/ink data model, recording and the severity engine only this batch (no
grossing-screen UI yet, no ink-colour admin palette yet — see
`src/services/grossing/README.md`'s own Batch 480 entry). *(Since closed: the grossing-screen UI in Batch 481 (`pages/GrossingScreenPage/GrossingScreenPage.tsx`) and the ink-colour palette in Batch 482 — checked in the Batch 496 README audit.)*

| Action | Service (mock) | Check |
|---|---|---|
| Record a margin's first ink application (creating the margin) or append a further ink application to an existing margin, never overwriting a prior application or renaming/re-orienting the margin; audited | `grossing/recordMarginInkApplication.ts` | `grossing:margin-ink:record` |
| Change a facility's `inking_validation_mode` (`WARN_ONLY`, the default, or `STRICT_ENFORCE`) | `grossing/inkingSiteSettings.ts` `setInkingValidationMode` | `config:inking-validation-mode:manage`. `group: 'configSystem'`, so granted to Admin and Lab Director by default via `CONFIG_SECTIONS` — not "nobody by default" |

`resolveInkingValidationSeverity.ts` is read-only resolution logic (no capability of its own, same as `resolveAutopsyGrossExaminationGate.ts`): it blocks sign-out on a Severity 2 issue only when the facility's mode is `STRICT_ENFORCE`, and always blocks on a Severity 3 issue.

## Batch 482 — Structured Inking, Module 3 (PS-359 follow-up)

Both items the Module 1/2 entries above left open, now resolved:

- **`inkingSiteSettings.ts` re-scoped from Site to Facility.** `getInkingValidationMode`/`setInkingValidationMode` now take `Case.order?.facilityId`, not a Site id — no case ever resolved a real Site id, a gap confirmed before this batch. Pete's own choice, over deferring again until the Organisation/Site admin UI exists.
- **The ink-colour admin palette** (`services/inkColors/`) now exists, so the Severity 3 `margin_ink_color_unmapped` check in `resolveInkingValidationSeverity.ts` can actually trigger.

| Action | Service (mock) | Check |
|---|---|---|
| Add, edit, deactivate or reactivate a margin ink colour; audited | `inkColors/mockInkColorService.ts` | `config:ink-color:manage` |

## Clinical-pathologic mismatch rules and governed AI instructions (PS-554, Pete's decisions of Oct 11, 2026)

**Built in stages.** Batch 529 built the rules and their two capabilities, now in the catalog above. Batch 530 built the report alert, sign-out and the QA queues. Batch 536 built the governed AI instructions, their three capabilities and separation of duties. *(Corrected in Batch 536: earlier text here and in `CLINICAL_MISMATCH_CHECK.md` scheduled this for "Batch 531"; Batch 531 did other work, and this shipped in Batch 536.)* The customer and staff explanation is in [`docs/product/CLINICAL_MISMATCH_CHECK.md`](../product/CLINICAL_MISMATCH_CHECK.md).

| Capability | Allows | Risk | Default roles | Checked in |
|---|---|---|---|---|
| `config:clinical-mismatch-rules:manage` (built, Batch 529) | Create and change mismatch rules: specimen type, category, `minimumDisplayThreshold`, `actionThreshold`, `actionType` (block / warn / log) | high | **none**; each hospital grants it (e.g. to its own Pathologist Administrator role) | `clinical/clinicalMismatchRuleService.ts` |
| `config:ai-prompt:approve` (built, Batch 536) | Approve or reject the AI instructions for the mismatch check; not by anyone who edited the version | high | Lab Director (never Superadmin) | `clinical/aiInstructionService.ts` |
| `config:ai-prompt:edit` (built, Batch 536) | Edit the AI instructions (a new version, pending) | high | **none**; each hospital grants it | `clinical/aiInstructionService.ts` |
| `config:ai-prompt:view` (built, Batch 536) | Read the AI instructions and their history | standard | QA Reviewer, Lab Director | `clinical/aiInstructionService.ts` |
| `config:clinical-mismatch-rules:view` (built, Batch 529) | Read the rules | standard | Pathologist, QA Reviewer, Lab Director | `clinical/clinicalMismatchRuleService.ts` |
| `case:clinical-mismatch:record` (exists) | Record a decision on a case: RESOLVED, UNRESOLVED or DEFERRED (built, Batch 530), at report review, at sign-out or in the secondary review | high | Pathologist, Fellow | `clinical/clinicalMismatchDecision.ts` |

**Decisions (Batch 530, for the API server):** `POST /api/cases/{id}/clinical-mismatch` `{ kind, source, confidence?, resolution: RESOLVED | UNRESOLVED | DEFERRED, risk?: low | high, ruleId?, quickReason?: expected-variation | clinical-context-reviewed | preop-nonspecific, note?, discipline?, specimenId?, reviewOf? }` needs `case:clinical-mismatch:record`; refusals `DECISION_REQUIRED`, `DEFER_HIGH_RISK` (DEFERRED is for low risk only), `UNKNOWN_REASON`. The server must recompute the risk from its own rules rather than trust the browser's. Sign-out itself writes `LOGGED` for a low-risk mismatch nobody decided (no capability: part of the sign-out). `GET /api/qa/clinical-mismatch/secondary-review` lists DEFERRED records with no later record whose `reviewOf` names them.

**Rules endpoints (Batch 529, for the API server):** `GET /api/config/clinical-mismatch-rules` (needs `…rules:view`); `PUT /api/config/clinical-mismatch-rules/{id}` with `{ specimenTypeId | null, category, minimumDisplayThreshold, actionThreshold | null, actionType }` and `DELETE /api/config/clinical-mismatch-rules/{id}` (need `…rules:manage`; the rule for all specimen types of a kind can be changed, never deleted; refusals `CONFIG_NOT_PERMITTED`, `thresholdRange`, `actionBelowDisplay`, `duplicate`, `cannotRemoveDefault`). The mismatch check reads the rules as a system read, whoever signs out. Each change writes `CLINICAL_MISMATCH_RULE_CHANGED` with before and after.

- **The Pathologist default for viewing the rules** is a deliberate exception to least privilege (Pete). It lets a pathologist see why a case was held.
- **Separation of duties** (Pete): one person may not hold both `config:clinical-mismatch-rules:manage` and `config:ai-prompt:approve`.
  - The server refuses granting both to one role (`SEPARATION_OF_DUTIES`).
  - It also refuses assigning a person roles that together carry both.
  - Built (Batch 536): the browser refuses both, in `roleCapabilityRules.roleCapabilityProblem` (a role; also when a role change would give someone holding it and another role both: `roleAdministration.saveRole`, reason `separationOfDutiesStaff`) and `staffAdministration.saveStaffMember` (a person's roles). The pairs are `SEPARATION_OF_DUTIES` in `capabilityCatalog.ts`.
  - Superadmin has no exemption. **Pete's decision (Oct 11, 2026):** Superadmin will not hold `config:ai-prompt:approve` (Batch 536 takes it out of the Superadmin set: `SUPERADMIN_WITHHELD` in `capabilitySeeds.ts`, also kept out by `lockPlatformRoles`), provided ForMedrixAI staff can still test and research: Superadmin keeps reading and changing the rules and reading and editing the AI instructions (an edit voids approval), and approval itself is exercised with a Lab Director test account in a demonstration or test tenant.
  - The catalog will carry the pair as a separation-of-duty rule, so the Role Dictionary and the Staff screen can say why a change is refused.
- **Editing the AI instructions** needs `config:ai-prompt:edit` (Batch 536). An edit is a new version, pending; the check keeps using the last approved version and never uses an unapproved one. A new edit replaces a pending one (withdrawn), so an approval always covers the exact text approved. Nobody who edited the pending text since the last approval can approve it (`SELF_APPROVAL`). Endpoints for the API server: `GET /api/config/ai-instructions` (`…:view`); `POST /api/config/ai-instructions/{discipline}` `{ text }` (`…:edit`; refusals `empty`, `tooLong`, `unchanged`); `POST /api/config/ai-instructions/versions/{id}/approve` and `…/reject` `{ reason }` (`…:approve`; refusals `notPending`, `SELF_APPROVAL`, `reasonRequired`); the mismatch check reads the approved text as a system read. Only the instructions (what counts as a mismatch) are governed; the case data block and the JSON answer format stay in code, because the check parses that answer.
- **Assignment history** (Pete's `PrivilegeAssignment` design): the server keeps, for each grant, the capability or role, the user, `assignedBy`, `assignedDate` and `activeFlag`, so the history of who could change the rules and who approved the instructions can be reported. In PathScribe's model, people receive capabilities through roles, so this history covers role assignments and role grants.
- **Audit events:**
  - `CLINICAL_MISMATCH_RULE_CHANGED` (before and after; built, Batch 529);
  - `AI_PROMPT_EDITED`, `AI_PROMPT_APPROVED`, `AI_PROMPT_REJECTED` (built, Batch 536; each names the discipline and version);
  - `CODE_SYSTEM_POLICY_CHANGED` (built, Batch 595: before and after);
  - `AI_VENDOR_POLICY_CHANGED` (built, Batch 536, PS-558: before and after) and `AI_CALL_REFUSED` (an AI call the jurisdiction's policy didn't allow; see `AI_PROXY.md`);
  - `CLINICAL_MISMATCH_DEFERRED` (built, Batch 530);
  - `CLINICAL_MISMATCH_LOGGED` (built, Batch 530: a low-risk mismatch logged at sign-out);
  - `CLINICAL_MISMATCH_CHECK_DEFERRED` (built, Batch 530: no clinical indication or history at sign-out, so the check could not run; sign-out is not held);
  - `CLINICAL_HISTORY_UPDATED` (built, Batch 530: clinical history added after accession; `PUT /api/cases/{id}/clinical-history` `{ entries }`, needs `case:clinical-history:record`, refused `signedOut` after sign-out);
  - `CLINICAL_MISMATCH_DECIDED` (existing; it gained the resolution status, risk and reason in Batch 530).

## What the browser does

- `authorizationService.enforce()` is the mock phase's enforcement point:
  the export services call it and stop on a refusal. It writes the same
  audit entry the server will.
- `useCapabilities()` / `CapabilityButton` grey out an action the user can't
  take and say why. That is presentation only: the service still checks.
- Batch 429: a Configuration section the person can't change is shown view
  only (`components/Config/ConfigSectionGate.tsx`, rules in
  `services/screens/configSectionAccess.ts`): a note names the permission and
  the action buttons and toggles are greyed and inert. A change that still
  reaches a service is refused there and named by `ConfigRefusalBanner`.
- In production the browser's check stays as presentation; the server's is
  the one that counts.
