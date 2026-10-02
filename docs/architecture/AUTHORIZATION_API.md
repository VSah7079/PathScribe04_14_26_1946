# AUTHORIZATION_API.md: capabilities checked in context

**Status:** phases 1 and 2 built in the browser (Batches 369 and 370;
PS-355, PS-356); phase 3, the remaining real permissions, is being added
screen by screen (88 capabilities as of Batch 425, Oct 1, 2026: see
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
| Export each Quality Assurance report | its own `qa:<report>:export` (14), with the scope's facilities |
| Create or change a role (including its capabilities) | `config:roles:manage`; also refuse a change that leaves no assignable role with it |
| Create or edit a staff record | `config:staff:edit` |
| Change a staff member's roles, facilities, pediatric/orchestration/cross-tenant access or credentials | `config:staff-access:assign` (requires `config:staff:edit`) |
| Reset all demo data (demo deployments only) | `config:demo-data:reset` |
| Open a case from another organisation (support) | `platform:cross-tenant-cases:view`, audited on every open |
| Change the governing-body content settings | `platform:governing-bodies:manage` |
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
| Release an autopsy body | `autopsy:body:release` (Batch 383) |
| Send an internal message / a secure email | `message:internal:send` / `message:secure-email:send` (Batch 385) |
| Correct or add to a signed-out cytology report | `cytology:report:correct` / `cytology:report:addend` (Batch 390) |
| Record a cytology QC or surgical QA review verdict | `cytology:qc-review:record` / `surgical:qa-review:record` (Batch 396) |
| Change the intraoperative critical results dictionary | `config:intraop-critical-results:manage` (Batch 399) |
| Place add-on orders; cancel or modify one after a block exception | `add-on:order:place` (Batch 403) |
| Approve destructive cutting of a block | `add-on:exception:approve-destructive-cut` (Batch 403) |
| Complete a reconciliation with discrepancies; abort a batch; acknowledge a cold-chain excursion | `batch:reconciliation:override` / `batch:run:abort` / `batch:cold-chain-excursion:acknowledge` (Batch 404) |
| Supersede a molecular run (clone and retire the original) | `molecular:batch:supersede` (Batch 405) |
| Add, change or delete a molecular assay control rule (its controls and the deck slots its sample rack may use) | `config:molecular-control-rules:manage` (Batch 406) |
| Dispose of retained material (scan on the Disposal Queue) | `retention:material:dispose`, with the station's facility (Batch 407) |
| Export the disposal (waste-tracking) report | `retention:disposal-report:export`, with the report's facility or all facilities (Batch 407) |
| Sign out a cytology specimen, or release it for countersign | `cytology:report:sign-out` with the case (Batch 409), before signing authority, the CT gate and countersign rules, which still apply |
| A cytotechnologist signing out (negative GYN, advanced-CT exception) | also `cytology:ct-report:sign-out` with the case (Batch 415); remove it from the role where cytotechnologists may not sign reports |
| Save a cytology screening review (new or your own) | `cytology:review:record` with the case (Batch 410), before the workload check and QC selection |
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
  Pete, Sep 28, 2026). Superadmin holds every capability and is left out of
  the column. "Every case-access role" means Pathologist, Fellow, Resident,
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
### Administration: staff, roles and system (16)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:roles:manage` | Manage roles. | high | Admin | `roles/roleAdministration.ts` |
| `config:staff:edit` | Edit staff records. | high | Admin | `staff/staffAdministration.ts`, `subspecialties/mockSubspecialtyService.ts` |
| `config:staff-access:assign` | Assign roles and access to staff. Requires `config:staff:edit`. | high | Admin | `auth/linkedAccounts.ts`, `staff/staffAdministration.ts` |
| `config:demo-data:reset` | Reset all demo data. | high | Admin | `demoReset/demoReset.ts` |
| `config:field-requirements:manage` | Manage field requirements. | high | Admin | `fieldRequirements/fieldRequirementService.ts` |
| `config:intraop-critical-results:manage` | Manage the intraoperative critical results dictionary. | high | Admin | `intraop/mockIntraopCriticalResultService.ts` |
| `config:molecular-control-rules:manage` | Manage molecular assay control rules. | high | Admin | `molecular/mockMolecularAssayControlRuleService.ts` |
| `config:screening-registry:manage` | Manage screening registry reporting. | high | Admin | `screeningRegistry/saveScreeningRegistrySettings.ts` |
| `config:cancer-registry:manage` | Manage cancer registry reporting. | high | Admin | `cancerRegistry/saveCancerRegistrySettings.ts` |
| `config:cytology-compliance:manage` | Manage country-specific cytology rules. | high | Admin | `cytology/saveCytologyComplianceFeatures.ts` |
| `registry:submission:resend` | Resend a registry submission. Requires `screen:registry-exceptions:open`. | high | Admin, Lab Director | `registrySubmission/resendRegistrySubmission.ts` |
| `registry:live-register:approve` | Approve a registry go-live. | high | Admin, Lab Director | `registryGoLive/registryGoLive.ts` |
| `config:registry-go-live:manage` | Manage registry go-live approval settings. | high | Admin | `registryGoLive/registryGoLive.ts` |
| `registry:test-suite:run` | Run the registry test suite. | high | Admin | `registryGoLive/registryGoLive.ts` |
| `registry:revision:review` | Mark a registry revision reviewed. Requires `screen:registry-exceptions:open`. | high | Admin, Lab Director | `registrySubmission/recordRegistryRevision.ts` |
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
| `config:actions:manage` | Manage keyboard and voice commands. | high | Admin, Lab Director | `actionRegistry/mockActionRegistryService.ts` |
| `config:voice:manage` | Turn voice on or off. | high | Admin, Lab Director | `systemConfig/systemConfigChangeChecks.ts` |
| `config:macros:manage` | Manage shared macros. | high | Admin, Lab Director | `macros/mockMacroService.ts`, `voicemacro/mockVoiceMacroService.ts` |

### Configuration: cytology (9)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:cytology-categories:manage` | Manage cytology categories. | high | Admin, Lab Director | `cytology/mockCytologyCategoryService.ts`, `cytology/mockNonGynCytologyCategoryService.ts` |
| `config:cytology-nomenclature:manage` | Manage cytology nomenclature. | high | Admin, Lab Director | `cytology/mockCytologyNomenclatureSettingsService.ts`, `cytology/mockFacilityCytologyNomenclatureOverrideService.ts` |
| `config:cytology-routing:manage` | Manage cytology routing. | high | Admin, Lab Director | `cytology/mockCytologyRoutingSettingsService.ts`, `cytology/mockFacilityCytologyRoutingOverrideService.ts` |
| `config:cytology-screening-strategy:manage` | Manage the screening strategy. | high | Admin, Lab Director | `cytology/mockCytologyScreeningStrategyService.ts`, `cytology/mockFacilityCytologyScreeningStrategyOverrideService.ts` |
| `config:cytology-instrumentation:manage` | Manage cytology instruments. | high | Admin, Lab Director | `cytology/mockCytologyInstrumentationService.ts`, `cytology/mockFacilityCytologyInstrumentationOverrideService.ts` |
| `config:cytology-qc-rates:manage` | Manage QC rescreen rates. | high | Admin, Lab Director | `cytology/mockCytologyQcSettingsService.ts`, `cytology/mockFacilityCytologyQcOverrideService.ts`, `cytology/mockStaffCytologyQcOverrideService.ts` |
| `config:cytology-workload-cap:manage` | Manage the slide workload cap. | high | Admin, Lab Director | `cytology/mockCytologyWorkloadCapSettingsService.ts`, `cytology/mockFacilityCytologyWorkloadCapOverrideService.ts` |
| `config:cytology-severity-mapping:manage` | Manage histology severity mapping. | high | Admin, Lab Director | `cytology/mockSnomedCervicalHistologySeverityMappingService.ts` |
| `config:cytology-qc-rules:manage` | Manage cytology QC rules. | high | Admin, Lab Director | `cytologyQc/mockCytologyQcRuleService.ts` |

### Configuration: lab dictionaries and case workflow (18)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:case-flags:manage` | Manage case flags. | high | Admin, Lab Director | `flags/mockFlagService.ts` |
| `config:subspecialties:manage` | Manage subspecialties. | high | Admin, Lab Director | `subspecialties/mockSubspecialtyService.ts` |
| `config:specimen-dictionary:manage` | Manage the specimen dictionary. | high | Admin, Lab Director | `specimenDictionary/mockSpecimenDictionaryService.ts` |
| `config:stain-dictionary:manage` | Manage the stain dictionary. | high | Admin, Lab Director | `stains/mockMolecularTargetService.ts`, `stains/mockSectioningProtocolService.ts`, `stains/mockStainOrderMacroService.ts`, `stains/mockStainTypeService.ts` |
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

### Configuration: results, reporting and quality (11)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:participation-types:manage` | Manage participation types. | high | Admin, Lab Director | `participationTypes/mockParticipationTypeService.ts` |
| `config:release-buffer:manage` | Manage the release buffer. | high | Admin, Lab Director | `reportRelease/mockReportReleaseService.ts` |
| `config:delivery-rules:manage` | Manage report delivery rules. | high | Admin, Lab Director | `delivery/mockDeliveryRuleService.ts` |
| `config:abnormal-triggers:manage` | Manage abnormal result rules. | high | Admin, Lab Director | `abnormalDetection/mockAbnormalTriggerRuleService.ts`, `systemConfig/systemConfigChangeChecks.ts` |
| `config:concordance-review:manage` | Manage concordance review. | high | Admin, Lab Director | `qualitySettings/mockConcordanceReviewSettingsService.ts` |
| `config:qa-types:manage` | Manage QA activity types. | high | Admin, Lab Director | `quality/mockQaActivityTypeService.ts`, `quality/mockQaSupervisionAssignmentTypeService.ts`, `quality/mockSurgicalPeerReviewRiskWeightService.ts` |
| `config:validation-studies:manage` | Manage validation studies. | high | Admin, Lab Director | `validationStudies/mockValidationStudyService.ts` |
| `validation:approval:record` | Record validation approval. | high | Admin, Lab Director | `validationStudies/mockValidationStudyService.ts` |
| `config:retention-policy:manage` | Manage the retention policy. | high | Admin, Lab Director | `retention/retentionPolicyService.ts` |
| `config:fppe:manage` | Manage FPPE assignments. | high | Admin, Lab Director | `cases/mockFppeAssignmentService.ts` |
| `config:cytotech-competency:manage` | Manage cytotechnologist competency. | high | Admin, Lab Director | `quality/mockQaSupervisionAssignmentService.ts` |

### Configuration: printing, labels and benches (14)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:printers:manage` | Manage printers. | high | Admin, Lab Director | `printerProfiles/mockPrinterProfileService.ts` |
| `config:print-settings:manage` | Manage print settings. | high | Admin, Lab Director | `printSettings/mockFacilityPrintSettingsService.ts`, `printSettings/mockPrintSettingsService.ts` |
| `config:print-routing:manage` | Manage print routing. | high | Admin, Lab Director | `printRouting/mockPrintRoutingRuleService.ts` |
| `config:label-layouts:manage` | Manage label layouts. | high | Admin, Lab Director | `labelDesigner/mockLabelLayoutService.ts` |
| `config:cassette-routing:manage` | Manage cassette routing. | high | Admin, Lab Director | `cassetteRouting/mockCassetteRoutingRuleService.ts` |
| `config:cassette-colors:manage` | Manage cassette colours. | high | Admin, Lab Director | `cassetteColors/mockCassetteColorService.ts` |
| `config:scan-stations:manage` | Manage scan stations. | high | Admin, Lab Director | `scanStations/mockScanStationService.ts` |
| `config:equipment:manage` | Manage equipment. | high | Admin, Lab Director | `equipment/mockEquipmentService.ts` |
| `equipment:maintenance:record` | Record equipment maintenance. | high | Histotechnologist, Cytotechnologist, Molecular Technologist, Admin, Lab Director | `equipment/mockEquipmentLogService.ts` |
| `config:grossing-hardware:manage` | Manage grossing hardware. | high | Admin, Lab Director | `grossingHardware/mockGrossingHardwareProfileService.ts` |
| `config:workstation-groups:manage` | Manage workstation groups. | high | Admin, Lab Director | `workstationGroups/mockWorkstationGroupService.ts` |
| `config:action-groups:manage` | Manage action groups. | high | Admin, Lab Director | `actionGroups/mockActionGroupService.ts` |
| `config:or-suite-terminals:manage` | Manage operating room terminals. | high | Admin, Lab Director | `intraopDashboard/mockOrSuiteTerminalService.ts` |
| `config:display-profiles:manage` | Manage wall display profiles. | high | Admin, Lab Director | `facilityOpsDashboard/mockDisplayProfileService.ts` |

### Configuration: integrations and intake (6)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:vendor-integrations:manage` | Manage vendor integrations. | high | Admin, Lab Director | `digitalPathology/mockDpVendorService.ts`, `digitalPathology/mockWsiViewerVendorService.ts`, `imageAssociation/mockGrossImagingVendorService.ts`, `imageAssociation/mockImageManagementSystemVendorService.ts` |
| `config:crosswalk:manage` | Manage the specimen code crosswalk. | high | Admin, Lab Director | `orderIntake/mockOrderIntakeService.ts` |
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

### Configuration: security and system (5)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `config:session-security:manage` | Manage session timeout. | high | Admin, Lab Director | `session/mockSessionTimeoutService.ts` |
| `config:report-appearance:manage` | Manage report appearance. | high | Admin, Lab Director | `reportAppearance/pageSetup.ts`, `reportAppearance/saveDocumentStyle.ts`, `systemConfig/systemConfigChangeChecks.ts` |
| `config:contribution-settings:manage` | Manage contribution settings. | high | Admin, Lab Director | `systemConfig/systemConfigChangeChecks.ts` |
| `config:external-resources:manage` | Manage external links. | high | Admin, Lab Director | `externalResources/mockExternalResourceService.ts` |
| `config:research-feed:manage` | Manage the research feed. | high | Admin, Lab Director | `research/mockResearchFeedConfigService.ts` |

### Case work (31)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `case:grossing:complete` | Complete grossing. | high | Pathologist, Fellow, Resident, PA | `grossing/grossingCompletion.ts`, `grossing/reportGrossComplete.ts` |
| `case:hold:place` | Place a case hold. | high | Every case-access role; hospital roles with case access | `cases/caseHolds.ts` |
| `case:hold:release` | Release a case hold. | high | Every case-access role; hospital roles with case access | `cases/caseHolds.ts` |
| `case:retention-hold:place` | Place a retention hold. | high | Every case-access role; hospital roles with case access | `cases/caseHolds.ts` |
| `case:retention-hold:release` | Release a retention hold. | high | Every case-access role; hospital roles with case access | `cases/caseHolds.ts` |
| `case:delegation:create` | Delegate a case. | high | Every case-access role; hospital roles with case access | `delegations/mockDelegationService.ts` |
| `patient:national-identifier:record` | Record a patient's national identifier. | high | Every case-access role; hospital roles with case access | `patientIdentifiers/recordNationalPatientIdentifier.ts` |
| `patient:registry-consent:record` | Record a patient's registry opt-out. | high | Every case-access role; hospital roles with case access | `registryConsent/recordPatientRegistryConsent.ts` |
| `cytology:report:correct` | Correct a signed-out cytology report. | high | Pathologist | `cytology/releaseCytologyCorrection.ts` |
| `cytology:report:addend` | Add an addendum to a signed-out cytology report. | high | Pathologist | `cytology/releaseCytologyAddendum.ts` |
| `cytology:report:sign-out` | Sign out a cytology report. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/signOutCytologyCase.ts` |
| `cytology:ct-report:sign-out` | Sign out a cytology report as a cytotechnologist. Requires `cytology:report:sign-out`. | high | Cytotechnologist; hospital roles with case access | `cytology/signOutCytologyCase.ts` |
| `cytology:review:record` | Record a cytology screening review. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/saveCytologyReview.ts` |
| `cytology:final-diagnosis:select` | Choose a cytology final diagnosis. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/cytologyCaseActions.ts` |
| `cytology:qc-flag:remove` | Remove a cytology QC flag. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/cytologyCaseActions.ts` |
| `cytology:retrospective-review:record` | Record a 5-year retrospective review. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/cytologyCaseActions.ts` |
| `cytology:histology-correlation:record` | Record a cyto-histologic correlation. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/cytologyCaseActions.ts` |
| `cytology:case:finalize` | Finalize a cytology case early. | high | Pathologist | `cytology/cytologyCaseFinalization.ts` |
| `cytology:revision:request` | Request a cytology review revision. | high | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `cytology/cytologyReviewNotes.ts` |
| `cytology:qc-review:record` | Record a cytology QC peer review. | high | Pathologist, Fellow | `cytologyQc/mockCytologyQcCaseAssignmentService.ts` |
| `cytology:qc-review:bypass` | Bypass a cytology QC review (supervisor). | high | None | `cytologyQc/mockCytologyQcCaseAssignmentService.ts` |
| `surgical:qa-review:record` | Record a surgical post-sign-out QA review. | high | Pathologist, Fellow | `quality/surgicalQaReview.ts` |
| `add-on:order:place` | Place an add-on order. | high | Pathologist, Fellow, Resident; hospital roles with case access | `addOnOrders/addOnOrderActions.ts` |
| `add-on:exception:approve-destructive-cut` | Approve destructive cutting. | high | Pathologist, Fellow, Resident; hospital roles with case access | `addOnOrders/addOnOrderActions.ts` |
| `batch:reconciliation:override` | Complete a batch reconciliation anyway. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `batches/mockBatchService.ts` |
| `batch:run:abort` | Abort a batch. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `batches/mockBatchService.ts` |
| `batch:cold-chain-excursion:acknowledge` | Acknowledge a cold-chain excursion. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `batches/mockBatchService.ts` |
| `referral:transit-status:update` | Update a referral batch’s transit status. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `referral/mockReferralTrackingService.ts` |
| `retention:material:dispose` | Dispose of retained material. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `retentionPolicy/disposeItemByScan.ts` |
| `retention:disposal-report:export` | Export the disposal report. | high | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `retentionPolicy/exportDisposalReport.ts` |
| `molecular:batch:supersede` | Supersede a molecular run. | high | Molecular Technologist; hospital roles with case access | `molecular/mockMolecularBatchService.ts` |

### Billing (1)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `billing:applied-code:correct` | Correct an applied billing code. | high | Every case-access role, Admin, Lab Director, QA Reviewer; hospital roles with case access or configuration access | `billing/correctServiceCharge.ts` |

### Autopsy (1)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `autopsy:body:release` | Release an autopsy body. | high | Every case-access role; hospital roles with case access | `autopsy/releaseAutopsyBody.ts` |

### Messaging (2)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `message:internal:send` | Send a message or reply. | standard | Every role (hospital roles too) | `messages/mockMessageService.ts` |
| `message:secure-email:send` | Send a secure email. | high | Every role (hospital roles too) | `messages/mockMessageService.ts` |

### Report history (1)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `report:change-history:export` | Export report change history. | high | Admin, QA Reviewer | `reportChangeLog/exportChangeLog.ts` |

### Quality assurance: Operations (9)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `qa:deficiencies:export` | Export deficiencies. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:intraop-linkage:export` | Export frozen section linkage. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:reconciliation:export` | Export discordance and reconciliation. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:countersign-turnaround:export` | Export countersign turnaround. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:fppe-tracking:export` | Export credentialing review (FPPE). | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:drift-correction:export` | Export post-final drift corrections. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:patient-match-review:export` | Export patient match review. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:access-request-response:export` | Export access requests. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:registry-transmission-audit:export` | Export the registry transmission audit. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |

### Quality assurance: Cytology (1)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `qa:cytology-histology-correlation:export` | Export cytology–histology correlation. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |

### Quality assurance: CAPA (1)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `qa:management-reviews:export` | Export management reviews. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |

### Quality assurance: Financials (1)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `qa:billing-deficiencies:export` | Export billing deficiencies. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |

### Quality assurance: Dashboard, inspection and enterprise (4)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `qa:activity-dashboard:export` | Export QA dashboard. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `audit:error:resolve` | Resolve an Audit Log error. | high | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `auditlog/mockAuditService.ts` |
| `qa:inspection-evidence:export` | Export inspection evidence binder. Requires `qa:activity-dashboard:export`. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |
| `qa:enterprise-rollup:export` | Export enterprise rollup. | high | Admin, QA Reviewer | `qualityAssurance/qaExport.ts` (via `exportQaReport`) |

### Screens: what each role can open (18)

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
| `screen:batch-management:open` | Open Batch Management. | standard | Histotechnologist, Cytotechnologist, Molecular Technologist; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:cytology-workspace:open` | Open Cytology Workspace. | standard | Pathologist, Fellow, Resident, Cytotechnologist; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:microtomy:open` | Open Microtomy Workspace. | standard | Histotechnologist; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:embedding:open` | Open Embedding Workspace. | standard | PA, Histotechnologist; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:slide-distribution:open` | Open Slide Distribution Workspace. | standard | Histotechnologist; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:molecular:open` | Open Molecular Workspace. | standard | Molecular Technologist; hospital roles with case access | `screens/screenAccess.ts` |
| `screen:audit-log:open` | Open Audit. | standard | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `screens/screenAccess.ts` |
| `screen:quality-assurance:open` | Open Quality Assurance. | standard | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `screens/screenAccess.ts` |
| `screen:registry-exceptions:open` | Open Registry Exceptions. | standard | Admin, Lab Director, QA Reviewer; hospital roles with configuration access | `registrySubmission/captureRegistryExceptionAsCapa.ts`, `screens/screenAccess.ts` |
| `screen:configuration:open` | Open Configuration. | standard | Admin, Template Author, Template Approver, Lab Director; hospital roles with configuration access | `screens/screenAccess.ts` |

### ForMedrixAI platform support (3)

| Capability | What it allows | Risk | Default roles | Checked in (`src/services/`) |
|---|---|---|---|---|
| `platform:cross-tenant-cases:view` | Open other organisations' cases (support). | high | Superadmin only (ForMedrixAI support) | `cases/CaseRouter.ts` |
| `platform:governing-bodies:manage` | Manage governing-body content. | high | Superadmin only (ForMedrixAI support) | `governingBodies/governingBodyAdministration.ts` |
| `platform:signing-rules:manage` | Manage country signing rules. | high | Superadmin only (ForMedrixAI support) | `participationTypes/saveCountryProfiles.ts` |
<!-- capability-catalog:end -->

## Configuration endpoints the API server must check (Batch 429, PS-345)

One row per write the browser's mock services do today. The endpoint that replaces each one checks the capability before writing and audits the check, allowed or refused (all are high risk). Reads are not checked, except the interface previews. The scheduled Assist poll, the LIS physician master-file feed and LIS flag auto-creation are system traffic and are not checked against a person.

| Service (`src/services/`) | Writes | Capability |
|---|---|---|
| `abnormalDetection/mockAbnormalTriggerRuleService.ts` | add, update, deactivate, reactivate | `config:abnormal-triggers:manage` |
| `actionGroups/mockActionGroupService.ts` | create, update, deactivate, reactivate | `config:action-groups:manage` |
| `assetLocation/mockAssetLocationDictionaryService.ts` | add, update, verify, deactivate | `config:asset-locations:manage` |
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
| `cytology/mockFacilityCytologyWorkloadCapOverrideService.ts` | create, update, remove | `config:cytology-workload-cap:manage` |
| `cytology/mockNonGynCytologyCategoryService.ts` | add, update, deactivate, reactivate, remove | `config:cytology-categories:manage` |
| `cytology/mockSnomedCervicalHistologySeverityMappingService.ts` | add, update, remove | `config:cytology-severity-mapping:manage` |
| `cytology/mockStaffCytologyQcOverrideService.ts` | create, update, remove | `config:cytology-qc-rates:manage` |
| `cytologyQc/mockCytologyQcRuleService.ts` | add, update, deactivate, reactivate, remove, duplicate | `config:cytology-qc-rules:manage` |
| `deficiencies/mockDeficiencyTypeService.ts` | add, update, deactivate, reactivate | `config:deficiency-types:manage` |
| `deficiencies/mockResolutionTypeService.ts` | add, update, deactivate, reactivate | `config:deficiency-types:manage` |
| `delegationTypes/mockDelegationTypeService.ts` | add, update, deactivate, reactivate, remove | `config:delegation-types:manage` |
| `delivery/mockDeliveryRuleService.ts` | create, update, remove | `config:delivery-rules:manage` |
| `departments/mockDepartmentService.ts` | add, update, verify, deactivate | `config:departments:manage` |
| `digitalPathology/mockDpVendorService.ts` | add, update, deactivate, reactivate, remove | `config:vendor-integrations:manage` |
| `digitalPathology/mockWsiViewerVendorService.ts` | add, update, deactivate, reactivate, remove | `config:vendor-integrations:manage` |
| `equipment/mockEquipmentLogService.ts` | add | `equipment:maintenance:record` |
| `equipment/mockEquipmentService.ts` | create, update, deactivate, reactivate | `config:equipment:manage` |
| `externalResources/mockExternalResourceService.ts` | create, update, remove | `config:external-resources:manage` |
| `facilities/mockFacilityService.ts` | add, update, deactivate, reactivate, verify | `config:facilities:manage` |
| `facilityOpsDashboard/mockDisplayProfileService.ts` | add, update, deactivate | `config:display-profiles:manage` |
| `flags/mockFlagService.ts` | add, update, deactivate, reactivate | `config:case-flags:manage` |
| `grossingHardware/mockGrossingHardwareProfileService.ts` | create, update | `config:grossing-hardware:manage` |
| `grossingRoutingOverrides/mockGrossingRoutingOverrideService.ts` | add, update, remove | `config:grossing-routes:manage` |
| `imageAssociation/mockGrossImagingVendorService.ts` | add, update, deactivate, reactivate, remove | `config:vendor-integrations:manage` |
| `imageAssociation/mockImageManagementSystemVendorService.ts` | add, update, deactivate, reactivate, remove | `config:vendor-integrations:manage` |
| `intraopDashboard/mockOrSuiteTerminalService.ts` | add, update, deactivate | `config:or-suite-terminals:manage` |
| `labelDesigner/mockLabelLayoutService.ts` | save, reset | `config:label-layouts:manage` |
| `locations/mockLocationService.ts` | create, update, deactivate, reactivate, verify | `config:facilities:manage` |
| `migration/mockMigrationFieldMappingService.ts` | add, update, remove | `config:migration-mappings:manage` |
| `participationTypes/mockParticipationTypeService.ts` | add, update, deactivate, reactivate, remove | `config:participation-types:manage` |
| `physicians/mockPhysicianService.ts` | add, update, verify, deactivate | `config:physicians:manage` |
| `printRouting/mockPrintRoutingRuleService.ts` | create, update, remove | `config:print-routing:manage` |
| `printSettings/mockFacilityPrintSettingsService.ts` | create, update, remove | `config:print-settings:manage` |
| `printSettings/mockPrintSettingsService.ts` | update, reset | `config:print-settings:manage` |
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
| `reportAppearance/saveDocumentStyle.ts` | saveDocumentStyleDefault | `config:report-appearance:manage` |
| `retention/retentionPolicyService.ts` | saveRetentionPolicy | `config:retention-policy:manage` |
| `cases/casePoolAssignmentService.ts` | saveRoutingRules, saveRoutingConfig | `config:case-routing:manage` |
| `cases/casePoolAssignmentService.ts` | routeUnassignedCases ("Run now") | `case:routing:run` |
| `assistPolling/assistPollingRuntime.ts` | runAssistPollNow (manual), ingestLisMessageNow, retryFailedLisEventsNow | `assist:lis-message:ingest` |
| `orderIntake/mockOrderIntakeService.ts` | addCrosswalkEntry, updateCrosswalkEntry | `config:crosswalk:manage` |
| `interfacePreview/permitInterfacePreview.ts` | outbound message (ADT/ORU) and DFT preview reads | `config:interface-preview:view` |
| `participationTypes/saveCountryProfiles.ts` | saveCountryProfilesWithAudit | `platform:signing-rules:manage` |
| `auth/linkedAccounts.ts` | unlinkExternalIdentity | `config:staff-access:assign` |
| `subspecialties/mockSubspecialtyService.ts` | assignUser, removeUser | `config:staff:edit` |

## Actions wired in Batch 432 (PS-345)

These actions had a service method but nothing called it; Batch 432 added the screens. The API server makes the same checks on the same endpoints.

| Action | Service (mock) | Check |
|---|---|---|
| Resolve an Audit Log error (records who and when) | `auditlog/mockAuditService.ts` `resolveError` | `audit:error:resolve` |
| Retire an AI model (not the default) | `models/mockModelService.ts` `retire` | `config:ai-model:manage` |
| Escalate an SLA-breached cytology QC review (reason required) | `cytologyQc/mockCytologyQcCaseAssignmentService.ts` `escalateForSlaBreach` | `cytology:qc-review:record` |
| Cytology QC supervisor bypass (justification required) | same, `supervisorBypass` | `cytology:qc-review:bypass` (nobody by default; also opens the Cytology QC queue) |
| Referral transit status, forward only, never "result received" by hand | `referral/mockReferralTrackingService.ts` `updateTransitStatus` | `referral:transit-status:update` |
| Surgical peer review risk weight per subspecialty | `quality/mockSurgicalPeerReviewRiskWeightService.ts` `setWeight` / `removeWeight` | `config:qa-types:manage` |
| Deny an access request (reason required; the requester is messaged) | `access/mockAccessRequestService.ts` `deny` | pool: `config:staff:edit`; pediatric and Orchestration: `config:staff-access:assign` |
| Facility spelling dictionary add / remove (audited) | `spellcheck/mockCustomDictionaryService.ts` | `config:facilities:manage` (was a role-name check) |
| Personal spelling word remove | same, `removePersonal` | the owner only (no capability) |
| Learned voice commands (list, remove) | `actionRegistry/mockActionRegistryService.ts` | the person's own (personal setting, no capability) |

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
