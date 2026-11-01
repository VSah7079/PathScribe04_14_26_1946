// ─────────────────────────────────────────────────────────────────────────────
// services/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 527 (PS-486): the demo build only (no API server); see __DEMO_TOOLS__ in vite.config.ts.
export const IS_MOCK_BACKEND = __DEMO_TOOLS__;
export { userService } from './users/userServiceInstance';
export { roleService } from './roles/roleServiceInstance';
export { participationTypeService } from './participationTypes/participationTypeServiceInstance';
export { physicianService } from './physicians/physicianServiceInstance';
export { flagService } from './flags/flagServiceInstance';
// Batch 452 (PS-156): the cyto-histo correlation window settings.
// Batch 453: the surgical biopsy-to-resection window, configured the same way.
export { mockBiopsyResectionCorrelationSettingsService as biopsyResectionCorrelationSettingsService, mockFacilityBiopsyResectionCorrelationOverrideService as facilityBiopsyResectionCorrelationOverrideService } from './quality/biopsyResectionCorrelationSettings';
export { cytologyHistologyCorrelationSettingsService } from './cytology/cytologyHistologyCorrelationSettingsServiceInstance';
export { facilityCytologyHistologyCorrelationOverrideService } from './cytology/facilityCytologyHistologyCorrelationOverrideServiceInstance';
// Batch 491: the Tumor Board auto-flagging rules — enterprise baseline and
// facility overrides, same two-tier pattern as the two lines above.
export { tumorBoardCriteriaRuleService } from './tumorBoardRules/tumorBoardCriteriaRuleServiceInstance';
export { tumorBoardBatchSettingsService } from './tumorBoardRules/tumorBoardBatchSettingsServiceInstance';
export { facilityTumorBoardRuleOverrideService } from './tumorBoardRules/facilityTumorBoardRuleOverrideServiceInstance';
export { tumorBoardRuleService } from './tumorBoardRules/tumorBoardRuleServiceInstance';
// Batch 490 (margin-distance extraction layer): added to the barrel only
// now, when Batch 491 gives it a real caller — a disclosed gap in Batch
// 490 (the service existed but nothing outside services/ could reach it
// without importing the mock file directly, against CLAUDE.md rule 4).
export { marginExtractionService } from './marginExtraction/marginExtractionServiceInstance';
export { resolveLisFlagDefinitionId } from './flags/resolveLisFlagDefinition';
export { containerTypeService } from './containerTypes/containerTypeServiceInstance';
export { intraoperativeService } from './intraop/intraoperativeServiceInstance';
export { liveUpdateService } from './liveUpdates/liveUpdateService';
// Batch 347 (PS-54): network print jobs and the engine's answers.
export { networkPrintJobs } from './networkPrint/networkPrintJobsInstance';
// Batch 550 (PS-539 phase 2d): exports through the API server (built in the browser in the demo).
export { exportService } from './exports/exportTrackerInstance';
// Batch 551 (PS-539 phase 2d): the API server's background jobs (the Server jobs view).
export { serverJobsService } from './serverJobs/serverJobsInstance';
// Batch 554 (PS-539 phase 2d): the interface engines' listeners and queues (Interfaces → Engines).
export { interfaceMonitoringService } from './interfaceMonitoring/interfaceMonitoringInstance';
// Batch 552 (PS-539 phase 2d): site agents (enrolment, revoke, printers and shares).
export { siteAgentAdminService } from './siteAgent/siteAgentAdminInstance';
// PS-60 (Batch 343): signing in and out (password demo accounts, SSO).
export { authSession, authConfig, signerConfirmation, signatureGate } from './auth/authSessionInstance';
export { signOutPolicyService } from './auth/signOutPolicy/signOutPolicyInstance';
export { mfaService } from './auth/mfa/mfaInstance';
// Batch 345: the signature records (one per signature applied to a case).
export { signatureRecordService } from './signatures/signatureRecordServiceInstance';
// Batch 344: the biometric enrolment and (simulated) WebAuthn check.
// Batch 616 (PS-512): screens use biometricFlow (the demo's, or the API server's); no screen imports the mock.
export { biometricFlow } from './biometric/biometricFlowInstance';
export { biometricOffForDeployment } from './biometric/biometricDeploymentSwitch';
export type { IBiometricFlow, BiometricRunResult } from './biometric/IBiometricFlow';
export { BIOMETRIC_POLICY_DEFAULTS } from './biometric/IBiometricService';
export type { BiometricCadence, BiometricPolicy, BiometricCredential } from './biometric/mockBiometricService';
export { orSuiteTerminalService } from './intraopDashboard/orSuiteTerminalServiceInstance';
export { displayAccessService } from './displayAccess/displayAccessServiceInstance';
export { orEventLogService } from './intraopDashboard/orEventLogServiceInstance';
// PS-113, Stage 5. reconciliationService/mockReconciliationService.ts
// retired and deleted - the real, generic qaActivityRecordService
// below is now the sole system for this data (first release, no real
// production history to preserve).
export { qaActivityRecordService } from './quality/qaActivityRecordServiceInstance';
export { qaActivityTypeService } from './quality/qaActivityTypeServiceInstance';
export { qaSupervisionAssignmentTypeService } from './quality/qaSupervisionAssignmentTypeServiceInstance';
// PS-114. Second archetype's generic service, added to the barrel the
// same way - real consumers (FppeAssignmentsSection.tsx, and later
// useSignOutWorkflow.ts) need it during this migration too.
export { qaSupervisionAssignmentService } from './quality/qaSupervisionAssignmentServiceInstance';
export { amendmentService } from './reports/reportServicesInstance';
export { criticalResultNotificationService } from './clinical/criticalResultNotificationServiceInstance';
// Batch 558: with the API server, the server's versions too, and their PDFs read through the API.
export { reportVersionService, reportVersionPdfReader } from './reports/reportVersionInstance';
export { versionHasPdf, versionPdfProblem, type VersionPdfProblem } from './reports/reportVersionPdf';
export { lisAmendmentNoticeService } from './reports/reportServicesInstance';
export { informalReviewService } from './reports/reportServicesInstance';
export { accessRequestService } from './access/accessRequestServiceInstance';
export { subspecialtyService } from './subspecialties/subspecialtyServiceInstance';
export { facilityService } from './facilities/facilityServiceInstance';
export { patientIndexService } from './patients/patientServicesInstance';
export { locationService } from './locations/locationServiceInstance';
export { interfaceExceptionService } from './interfaceExceptions/interfaceExceptionServiceInstance';
export { reportReleaseService } from './reportRelease/reportReleaseInstance';
export { concordanceReviewSettingsService } from './qualitySettings/concordanceReviewSettingsServiceInstance';
export { departmentService } from './departments/departmentServiceInstance';
export { assetLocationDictionaryService } from './assetLocation/assetLocationDictionaryServiceInstance';
export { caseViewTrackingService } from './caseViewTracking/caseViewTrackingServiceInstance';
export { grossingRoutingOverrideService } from './grossingRoutingOverrides/grossingRoutingOverrideServiceInstance';
// Batch 619 (PS-800): when things go out, set at the enterprise with performing-facility overrides.
export { deliveryScheduleService } from './deliverySchedules/deliveryScheduleServiceInstance';
export { billingReleaseService } from './billingRelease/billingReleaseServiceInstance';
export { batchRegistryFeedService } from './batchRegistryFeed/batchRegistryFeedServiceInstance';
// Batch 620 (part E, PS-800): US ePath state profiles and which profile each facility uses.
export { usEpathService } from './usEpath/usEpathServiceInstance';
export { cosdDestinationService } from './cosd/cosdDestinationServiceInstance';
// Batch 621: AI extraction of historical reports (advisory only; services/historyExtraction/advisoryOnly.guard.test.ts).
export { historyExtractionService, historyExtractionSettingsService } from './historyExtraction/historyExtractionServiceInstance';
export { templateSuggestionSignalService } from './templateSuggestions/templateSuggestionSignalServiceInstance';
export { lisSyncService } from './lisSync/lisSyncServiceInstance';
export { specimenDictionaryService } from './specimenDictionary/specimenDictionaryServiceInstance';
export { specimenCategoryService } from './specimenCategories/specimenCategoryServiceInstance';
export { priorityService } from './priority/priorityServiceInstance';
export { stainTypeService } from './stains/stainTypeServiceInstance';
export { fixativeDictionaryService } from './protocols/fixativeDictionaryServiceInstance';
export { processingFormatDictionaryService } from './protocols/processingFormatDictionaryServiceInstance';
export { sectioningProtocolService } from './stains/sectioningProtocolServiceInstance';
export { stainOrderMacroService } from './stains/stainOrderMacroServiceInstance';
export { managementReviewService } from './deficiencies/managementReviewServiceInstance';
export { batchService } from './batches/batchServiceInstance';
// Batch 726 (Lab Workflow & Batch spec §7): station-level tracking, the scan event log.
export { stationScanEventService } from './stationScans/stationScanEventServiceInstance';
export { labelPrintRouteService } from './labelPrintRoutes/labelPrintRouteServiceInstance';
export { itemEndStateService } from './itemEndStates/itemEndStateServiceInstance'; // Batch 731 (spec §10.5)
// Batch 610 (#17, #123): cold chain storage units, condition types, readings and the labelled Simulated feed.
export { storageUnitService } from './coldChain/storageUnitServiceInstance';
export { storageConditionTypeService } from './coldChain/storageConditionTypeServiceInstance';
export { telemetryReadingService } from './coldChain/telemetryReadingServiceInstance';
export { postSimulatedTelemetryReading } from './coldChain/simulatedTelemetryFeed';
export { summariseReadings, recentReadings } from './coldChain/coldChainStatus';
export type { StorageUnit } from './coldChain/IStorageUnitService';
export type { StorageConditionType } from './coldChain/IStorageConditionTypeService';
export type { TelemetryReading, MonitoredAssetType } from './coldChain/ITelemetryReadingService';
export type { AssetReadingSummary } from './coldChain/coldChainStatus';
// Real, pre-existing baseline gap fixed here, confirmed directly before
// touching anything: all three mock service files (Stain QC Module §2.1
// Reagent & Solution Lot Registry, and PS-289 Workstation Groups & Action
// Routing) were already fully built, but never actually wired into this
// barrel export — a real tsc error blocking a clean baseline, not a
// stylistic gap, same class of finding as this file's own reagentLots/
// workstationGroups/actionGroups README notes already describe elsewhere.
export { reagentLotService } from './reagentLots/reagentLotServiceInstance';
export { workstationGroupService } from './workstationGroups/workstationGroupServiceInstance';
export { actionGroupService } from './actionGroups/actionGroupServiceInstance';
export { hardwareContainerRegistryService } from './hardwareContainers/hardwareContainerRegistryServiceInstance';
// PS-290 — External Consult / Second-Opinion Access. See
// consultAccess/IConsultTokenService.ts's own header before using this
// anywhere: it is NOT real token security, mock-first in a categorically
// different sense than most of this barrel's other entries.
export { consultTokenService } from './consultAccess/consultTokenServiceInstance';
// PS-136 — the opaque reference token behind the SMS/secure-email
// non-PHI "tap to view" deep link. See
// clinical/ICriticalAlertReferenceTokenService.ts's own header before
// using this anywhere: same NOT-real-token-security caveat as
// consultTokenService just above, for the identical underlying reason.
export { criticalAlertReferenceTokenService } from './clinical/criticalAlertReferenceTokenServiceInstance';
export { protocolService } from './protocols/protocolServiceInstance';
export { printerProfileService } from './printerProfiles/printerProfileServiceInstance';
export { diagnosisCodesService } from './diagnosisCodes/diagnosisCodesServiceInstance';
export { orderIntakeService } from './orderIntake/orderIntakeInstance';
export { deficiencyTypeService } from './deficiencies/deficiencyTypeServiceInstance';
export { resolutionTypeService } from './deficiencies/resolutionTypeServiceInstance';
export { abnormalTriggerRuleService } from './abnormalDetection/abnormalTriggerRuleServiceInstance';
export { abnormalDetectionSignalService } from './abnormalDetection/abnormalDetectionSignalServiceInstance';
export { specimenDeficiencyService } from './deficiencies/specimenDeficiencyServiceInstance';
// Batch 438 (PS-144–148): CAPA recommendations, confirmed or dismissed by a QA lead.
export { capaRecommendationService } from './quality/capaRecommendationServiceInstance';
export { decisionProblem as capaDecisionProblem, capaOwnerOptions, capaQueueOrder } from './quality/capaRecommendationRules';
export { isClinicallySignificant, REVISION_REASON_CATEGORIES } from './reasons/revisionReasonRules';
// Batch 439 (PS-144, PS-145, PS-148): peer review before sign-out, the
// clinical-pathologic mismatch check, and outside-consult assessment.
export { peerReviewService } from './quality/peerReviewServiceInstance';
export { peerReviewSettingsService } from './quality/peerReviewSettingsServiceInstance';
export { peerReviewStatusFor } from './quality/peerReviewStatusLive';
export type { PeerReviewStatus } from './quality/peerReviewStatus';
export {
  peerReviewerOptions, OVERRIDE_REASONS as PEER_REVIEW_OVERRIDE_REASONS, overrideProblem as peerReviewOverrideProblem,
  readProblem as peerReviewReadProblem, resolutionProblem as peerReviewResolutionProblem, requestProblem as peerReviewRequestProblem,
  withdrawProblem as peerReviewWithdrawProblem, peerReviewGateOn, caseSignedOut, gateChoice as peerReviewGateChoice, withGateChoice as withPeerReviewGateChoice, performingLabs as peerReviewPerformingLabs, DEFAULT_PEER_REVIEW_GATE_SETTINGS,
} from './quality/peerReviewRules';
export { clinicalMismatchService, clinicalMismatchSignOutStep } from './clinical/clinicalMismatchService';
export type { ClinicalMismatchAssessment, ClinicalMismatchSignOutStep } from './clinical/clinicalMismatchService';
export { clinicalMismatchProblem, CLINICAL_MISMATCH_RESOLUTIONS, CLINICAL_MISMATCH_QUICK_REASONS } from './clinical/clinicalMismatchDecision';
export type { ClinicalMismatchResolution, ClinicalMismatchQuickReason, ClinicalMismatchRiskLevel } from './clinical/clinicalMismatchDecision';
// Batch 529 (PS-554): the mismatch risk rules.
export { clinicalMismatchRuleService } from './clinical/clinicalMismatchRuleServiceInstance';
// Batch 536 (PS-554, PS-558): the governed AI instructions and the AI vendor policy.
export { mockAiInstructionService as aiInstructionService } from './clinical/mockAiInstructionService';
export { AI_INSTRUCTION_DISCIPLINES, MAX_AI_INSTRUCTION_LENGTH, type AiInstructionDiscipline, type AiInstructionVersion } from './clinical/aiInstructions';
export type { AiInstructionsView, AiInstructionTestResult } from './clinical/aiInstructionService';
export { aiVendorPolicyService } from './aiIntegration/aiVendorPolicyServiceInstance';
export { AI_POLICY_SERVICES, aiVendorConflicts, aiVendorScopeStatuses, parseRegionList, type AiVendorScopeStatus, type AiPolicyService, type AiVendorRule, type AiVendorRuleScope, type AiVendorRefusal } from './aiIntegration/aiVendorPolicy';
export type { ServedFacility } from './aiIntegration/aiVendorPolicyService';
// Batch 595: the code systems (ICD-10, ICD-11, ICD-O, SNOMED CT ...) each jurisdiction uses, and when (Configuration → System → Code Systems).
export { codeSystemPolicyService } from './coding/codeSystemPolicyServiceInstance';
export type { CodeSystemPolicyRecord } from './coding/codeSystemPolicyRules';
export type { CodeSystemRule, CodeSystemRole, CodeSystemPolicy } from './coding/codeSystemPolicy';
export { roleOn as codeSystemRoleOn, activeSystems as activeCodeSystems } from './coding/codeSystemPolicy';
export { defaultCodePolicy } from './coding/codeSystemPolicy';
export { KNOWN_CODE_SYSTEMS } from './coding/codedEntry';
export {
  evaluateClinicalMismatch, applicableRules, newSpecimenRule, clinicalMismatchRuleProblem, clinicalMismatchRuleRemovalProblem,
  DEFAULT_CLINICAL_MISMATCH_RULES, CLINICAL_MISMATCH_CATEGORIES, CLINICAL_MISMATCH_ACTION_TYPES, DEFAULT_MINIMUM_DISPLAY_THRESHOLD,
} from './clinical/clinicalMismatchRules';
export type { ClinicalMismatchRule, ClinicalMismatchActionType, ClinicalMismatchOutcome, ClinicalMismatchRisk, ClinicalMismatchRuleProblem } from './clinical/clinicalMismatchRules';
export type { ClinicalMismatchSuggestion, ClinicalMismatchKind } from './clinical/detectClinicalPathologicMismatch';
export { assessmentProblem as outsideConsultAssessmentProblem, OUTSIDE_CONSULT_ASSESSMENTS, reportReleased } from './consultAccess/outsideConsultRules';
export type { OutsideConsultAssessment } from './consultAccess/outsideConsultRules';
export { systemConfigService } from './systemConfig/systemConfigServiceInstance';
export { macroService } from './macros/macroServiceInstance';
export { voiceMacroService } from './voicemacro/voiceMacroServiceInstance';
export { fontService } from './fonts/fontServiceInstance';
export { aiBehaviorService } from './aiBehavior/aiBehaviorServiceInstance';
export { printSettingsService } from './printSettings/printSettingsServiceInstance';
export { facilityPrintSettingsService } from './printSettings/facilityPrintSettingsServiceInstance';
// PS-282 (Batch 437): print and export audit.
export { recordDocumentOutput, planReportPrint, releaseHoldPolicyFor } from './printing/recordDocumentOutput';
export { RELEASE_HOLD_PRINT_POLICIES, DEFAULT_RELEASE_HOLD_PRINT_POLICY, type ReleaseHoldPrintPolicy } from './reportRelease/heldPrintPolicy';
export { DESTINATION as DOCUMENT_DESTINATION, printPromptComplete } from './printing/documentOutputAudit';
export type { DocumentOutputEvent, PrintPlan } from './printing/documentOutputAudit';
export { beginExport, recordExport, type GatedExport } from './printing/exportGate';
// Batch 495 (PS-283): the case-report print permission.
export { beginReportPrint, checkReportPrint, type ReportPrintCheck } from './printing/reportPrintGate';
// Batch 495: historical-data migration jobs, so MigrationJobsPage reaches them through this index.
export { migrationJobService } from './migration/migrationJobServiceInstance';
export { migrationRecordResultService } from './migration/migrationRecordResultServiceInstance';
// Batch 611 (#132, #166): the Import legacy file run on Migration Jobs, and the readers it uses.
export { importLegacyFile } from './migration/importLegacyFile';
export { parseLegacyFile, legacyFormatOf, LEGACY_IMPORT_MAX_RECORDS, type LegacyFileFormat, type LegacyParseError } from './migration/parseLegacyFile';
export { sourceSystemsWithMappings, type LegacyImportOutcome, type LegacyImportError, type LegacyImportSummary } from './migration/runLegacyFileImport';
export { modelService } from './models/modelServiceInstance';
export { savedSearchService } from './savedSearches/savedSearchServiceInstance';
// Batch 350: server-side case search (filter, sort, count, one page) and CSV export rows.
export { caseSearchService } from './caseSearch/caseSearchServiceInstance';
export { mockActionRegistryService as actionRegistryService } from './actionRegistry/mockActionRegistryService';
// Batch 396: for the Cytology QC Peer Review Queue (was imported directly from the mock).
export { cytologyQcCaseAssignmentService } from './cytologyQc/cytologyQcCaseAssignmentServiceInstance';
export { cytologyQcRuleService } from './cytologyQc/cytologyQcRuleServiceInstance';
// Batch 353: TAT targets and case delegations, each behind its own service
// (they were kept by the TAT settings screen and the demo case service).
// Batch 358: the equipment register (analysers molecular batches target, and more).
export { equipmentService } from './equipment/equipmentServiceInstance';
// Batch 359: grossing cameras and scales (settings; the device is in the register).
export { grossingHardwareProfileService } from './grossingHardware/grossingHardwareProfileServiceInstance';
export type { GrossingHardwareProfile, GrossingHardwareKind, GrossingHardwareBridgeType } from './grossingHardware/IGrossingHardwareProfileService';
export { scanStationService } from './scanStations/scanStationServiceInstance';
export type { ScanStation } from './scanStations/IScanStationService';
// Batch 444: the Scan Stations screen's decisions and validation codes.
export { SCAN_STATION_WORKFLOW_STAGES } from './scanStations/IScanStationService';
export { filterScanStations, activeScanStations, workflowStageKey, type ScanStationStatusFilter } from './scanStations/scanStationList';
export { validateScanStationDraft, type ScanStationDraftValidationErrors, type ScanStationDraftError } from './scanStations/validateScanStationDraft';
export type { IEquipmentService, Equipment, EquipmentDraft, EquipmentError, EquipmentKind } from './equipment/IEquipmentService';
export { EQUIPMENT_KINDS, EQUIPMENT_LINK_INVALID, DECK_RACK_TYPES, type DeckSlot, type DeckRackType } from './equipment/IEquipmentService';
// Batch 360: each device's maintenance, calibration and service history (append-only).
export { equipmentLogService } from './equipment/equipmentLogServiceInstance';
export type { EquipmentLogEntry, NewEquipmentLogEntry, EquipmentLogType, EquipmentLogOutcome, IEquipmentLogService } from './equipment/IEquipmentLogService';
export { EQUIPMENT_LOG_TYPES, EQUIPMENT_LOG_OUTCOMES } from './equipment/IEquipmentLogService';
// Batch 364 (PS-349, PS-350): support references, non-identifying ids support staff can use instead of case numbers.
export { supportReferenceService } from './supportReferences/supportReferenceServiceInstance';
export { reportChangeLogService } from './reportChangeLog/reportChangeLogInstance';
export { REPORT_CHANGE_LOGGED_EVENT } from './reportChangeLog/mockReportChangeLogService';
export type { ReportChangeEntry, ReportFieldChange, ReportChangeArea } from './reportChangeLog/IReportChangeLogService';
export type { SupportReference, SupportReferenceKind, ISupportReferenceService } from './supportReferences/ISupportReferenceService';
export { SUPPORT_REFERENCE_KINDS, SUPPORT_REFERENCE_NOT_FOUND, SUPPORT_REFERENCE_INVALID } from './supportReferences/ISupportReferenceService';
export { tatTargetService } from './tatConfig/tatTargetServiceInstance';
// Batch 610 (#87, #164): performance targets (cases and RVUs per period) and per-client service-level targets, set in Configuration → System and measured on the dashboards.
export { performanceTargetService } from './performanceTargets/performanceTargetServiceInstance';
export type { IPerformanceTargetService, PerformanceTarget, TargetUnit, TargetPeriod } from './performanceTargets/IPerformanceTargetService';
export { clientSlaService } from './clientSLA/clientSlaServiceInstance';
export type { IClientSLAService, ClientSLA } from './clientSLA/IClientSLAService';
export { loadOpenSlaBreaches } from './clientSLA/loadOpenSlaBreaches';
export type { SlaBreachKind } from './clientSLA/clientSlaRules';
// Batch 610 (#163): the read-only Jurisdiction overview (Configuration → System).
export { loadJurisdictionOverview } from './jurisdictionOverview/jurisdictionOverviewLoader';
export type { JurisdictionOverviewRow, JurisdictionAiPolicy } from './jurisdictionOverview/jurisdictionOverview';
export { JURISDICTION_SETTING_LINKS } from './jurisdictionOverview/jurisdictionOverview';
export { delegationService } from './delegations/delegationServiceInstance';
export { delegationTypeService } from './delegationTypes/delegationTypeServiceInstance';
export { delegationTypeForVoiceAction, presetAvailable } from './delegations/delegationVoicePresets';
export { completeDelegatedWork } from './delegations/completeDelegatedWork';
export type { ITatTargetService, TatTargetError } from './tatConfig/ITatTargetService';
export type {
  IDelegationService, DelegationRecord, DelegationStatus, DelegationRecipient, DelegationRequest, DelegationError,
} from './delegations/IDelegationService';
export { auditService } from './auditlog/auditServiceInstance';
export { recordAiCodeBinds, unreviewedAiValueCount } from './aiGovernance/aiReviewAudit';
// Batch 615 (PS-481, PS-482): the mock in the demo, the API server's with an address.
export { caseService } from './cases/caseServiceInstance';
export { caseMaterialService } from './material/caseMaterialServiceInstance';
export { countersignService } from './cases/countersignServiceInstance';
export { codeService } from './codes/codeServiceInstance';
// PS-89 (Batch 334): bulk billing-code imports (System → Code Import).
export { codeImportService } from './billing/codeImportServiceInstance';
// PS-342 (Batch 336): personal and facility spelling dictionaries.
export { customDictionaryService } from './spellcheck/customDictionaryServiceInstance';
export type { CodeImportRefusal, CodeImportPreview } from './billing/mockCodeImportService';
export { billingRuleService } from './billing/billingRuleServiceInstance';
// Batch 381: the report page used it by its mock file path.
export { serviceChargeService } from './billing/serviceChargeServiceInstance';
export { modifierDictionaryService } from './billing/modifierDictionaryServiceInstance';
export { ncciEditService } from './billing/ncciEditServiceInstance';
export { rvuCodeMapService } from './billing/rvuCodeMapServiceInstance';
export { messageService } from './messages/messageServiceInstance';
// Batch 517 (PS-143): each lab's secure messaging gateways and agreements.
export { secureMessagingConfigService } from './secureMessaging/secureMessagingConfigServiceInstance';
export { internalNoteService } from './internalNotes/internalNoteServiceInstance';
export { INTERNAL_NOTE_TYPE_LABELS                        } from './internalNotes/IInternalNoteService';
// resultService removed — the whole discrete-result concept (order,
// poll, status) was shelved as unvalidated. See Flag Maintenance /
// ComputationalPanel for what remains: Flags as a real catalog/triage
// concept, without the ordering/result apparatus that was built on an
// integration model (outbound polling) that never matched how either
// Orchestration or CoPilot actually works.
export { reportTemplateService } from './reportTemplates/reportTemplateServiceInstance';
export { checkTemplateFinalDiagnosis, finalTemplatesBrokenByPart, finalDiagnosisCheck, FINAL_DIAGNOSIS_DESIGNATION_ERROR } from './reportTemplates/finalDiagnosisPublishCheck';
export type { FinalDiagnosisCheck } from './reportTemplates/finalDiagnosisPublishCheck';
export { onReportTemplatesChanged, STANDARD_TEMPLATE_ID,
         BREAST_TEMPLATE_ID, GI_TEMPLATE_ID,
         THORACIC_TEMPLATE_ID, URO_TEMPLATE_ID           } from './reportTemplates/mockReportTemplateService';
export { resolveReportTemplate                            } from './reportTemplates/TemplateRoutingService';

// ─── Type re-exports ──────────────────────────────────────────────────────────
export type { StaffUser }         from './users/IUserService';
export type { GrossingRoutingOverrideEntry } from './grossingRoutingOverrides/IGrossingRoutingOverrideService';
export type { Role }              from './roles/IRoleService';
export type { Physician }         from './physicians/IPhysicianService';
export type { Flag }              from './flags/IFlagService';
export type { Subspecialty }      from './subspecialties/ISubspecialtyService';
export type { Facility }          from './facilities/IFacilityService';
export type { Department }  from './departments/IDepartmentService';
export type { PriorityLevel }     from './priority/IPriorityService';
export type { StainType, StainCategory, SectioningProtocol, StainOrderMacro } from './stains/IStainService';
export type { FixativeDictionaryEntry, FixativeCategory, ProcessingFormatDictionaryEntry } from './protocols/IPathwayMaterialDictionaryService';
export type { IncomingOrder, IncomingOrderSpecimen, SpecimenCodeCrosswalkEntry, OrderResolutionResult } from './orderIntake/IOrderIntakeService';
export type { DeficiencyType, ResolutionType, SpecimenDeficiency, ManagementReview } from './deficiencies/IDeficiencyService';
export type { Protocol, ProtocolPathway, PathwayTask, ProtocolHistoryEntry } from './protocols/IProtocolService';
export type { PrinterProfile, PrinterVendor, PrinterBridgeType } from './printerProfiles/IPrinterProfileService';
export type { Icd10Code } from './diagnosisCodes/IDiagnosisCodesService';
export type { SystemConfig }      from './systemConfig/mockSystemConfigService';
export type { Macro }             from './macros/IMacroService';
export type { EditorFont, EditorFontConfig } from './fonts/IFontService';
export type { AIBehaviorConfig }  from './aiBehavior/IAIBehaviorService';
export type { AIModel }           from './models/IModelService';
export type { SavedSearch, SearchContext, WorklistFilters, CaseSearchFilters, RefinedSearchFilters } from './savedSearches/ISavedSearchService';
export type * from './caseSearch/caseSearchTypes';
export {
  CASE_SEARCH_STATUS_OPTIONS, CASE_SEARCH_PRIORITY_OPTIONS, CASE_SEARCH_SEX_OPTIONS, CASE_SEARCH_SORT_OPTIONS, CASE_SEARCH_PAGE_SIZES,
  DEFAULT_CASE_SEARCH_SORT, DEFAULT_CASE_SEARCH_PAGE_SIZE, CASE_SEARCH_EXPORT_LIMIT, emptyCaseSearchDraft,
  // Batch 351
  CASE_SEARCH_DATE_BASES, CASE_SEARCH_CASE_TYPES, CASE_SEARCH_PATHOLOGIST_ROLES, CASE_SEARCH_REVISION_TYPES, CASE_SEARCH_HOLD_TYPES,
  CASE_SEARCH_RESULT_FLAGS, CASE_SEARCH_PENDING_WORK, CASE_SEARCH_INTAKES, CASE_SEARCH_AUTOPSY_AUTHORITIES, CASE_SEARCH_AUTOPSY_REPORTS,
} from './caseSearch/caseSearchTypes';
export type { ICaseSearchService } from './caseSearch/ICaseSearchService';
export type { AuditLog, ErrorLog, AuditLogType, ErrorSeverity } from './auditlog/IAuditService';
export type { PathologyCase, CaseStatus, CasePriority, AIStatus, CaseGender, FlagColor, CaseFilterParams } from './cases/ICaseService';
export type { ClinicalCode, CodeSystem, CodeSearchParams, IcdOSubtype } from './codes/ICodeService';
export type { Message }           from './messages/IMessageService';
export { MESSAGE_NOT_PERMITTED } from './messages/IMessageService';
export type { MessageRecipient, SecureEmailInput } from './messages/IMessageService';
export { DEMO_MESSAGE_RECIPIENTS, searchRecipients, findRecipientByName } from './messages/messageRecipients';
export type { InternalNote, InternalNoteType, InternalNoteVisibility } from './internalNotes/IInternalNoteService';
export type { ServiceResult }     from './types';
// ComputationalResult re-export removed — the type itself was removed
// from smarttag.types.ts along with the ordering/result apparatus.
export type { ReportTemplate }    from './reportTemplates/IReportTemplateService';
export type { TemplateRoutingInput, TemplateRoutingResult } from './reportTemplates/TemplateRoutingService';

// Batch 368: services the UI imported directly as mocks (deployment-readiness
// rule 4), exported here so screens take them from @/services.
export { cytologyCategoryService } from './cytology/cytologyCategoryServiceInstance';
export { placeOfServiceCodeService } from './billing/placeOfServiceCodeServiceInstance';
export { cytologyQaReportService } from './cytology/cytologyQaReportServiceInstance';
// Batch 406: molecular QC runs and the specimens on each (for Batch Management's QC view).
export { molecularQcRunRecordService } from './cytology/molecularQcRunRecordServiceInstance';
export { qcRunsNewestFirst, specimensByMolecularRun, type QcRunSpecimenLink } from './cytology/molecularQcRunLinks';
export { referralTrackingService } from './referral/referralTrackingServiceInstance';
export { cassetteColorService } from './cassetteColors/cassetteColorServiceInstance';
// Structured Inking, Module 3 (PS-359 follow-up): the margin ink-colour admin palette.
export { inkColorService } from './inkColors/inkColorServiceInstance';
// Batch 381: the block/stain editor used it by its mock file path.
export { molecularTargetService } from './stains/molecularTargetServiceInstance';
// Batch 403: which reference labs perform a molecular/send-out test.
export { activeReferenceLabs, normalizeReferenceLabLink, activePerformingLabs, normalizeInHouseLabs } from './stains/referenceLabLink';
export { molecularBatchService } from './molecular/molecularBatchServiceInstance';
// Batch 405: so the plate builder doesn't import the mocks directly.
export { molecularAssayControlRuleService } from './molecular/molecularAssayControlRuleServiceInstance';
export { molecularExtractionRackService } from './molecular/molecularExtractionRackServiceInstance';
// Batch 406: rack placement on an instrument's deck, and the control rules' refusals.
export { MOLECULAR_RACK_ERRORS, type MolecularExtractionRack, type MolecularRackPosition, type MolecularRackPlacement } from './molecular/IMolecularExtractionRackService';
export { resolveMolecularMovementRecord, molecularActor, UNKNOWN_STATION_NAME } from './molecular/resolveMolecularMovementRecord';
export { molecularAssayTypes } from './molecular/molecularAssays';
export { supersedeMolecularBatchNow } from './molecular/supersedeMolecularBatchLive';
export { molecularBatchErrorKey } from './molecular/molecularBatchErrors';
export { controlRuleDraftProblem, sampleRackSlotChoices, withControlPatch, type ControlRuleDraftProblem } from './molecular/controlRuleDraft';
export { rackWorklistRows, type RackWorklistRow, type RackWorklistStatus } from './molecular/rackWorklist';
export { slotsForRack, deckSlotRequired, checkDeckSlot, parseDeckLocationBarcode, resolveDeckScan, type DeckSlotProblem, type DeckScanResult } from './molecular/deckSlots';
export {
  MOLECULAR_CONTROL_RULE_NOT_PERMITTED, MOLECULAR_CONTROL_RULE_DUPLICATE, MOLECULAR_CONTROL_RULE_NOT_FOUND,
  type MolecularAssayControlRule, type MolecularRequiredControl,
} from './molecular/IMolecularAssayControlRuleService';
export { reportPartService } from './reportParts/reportPartServiceInstance';
export { onReportPartsChanged } from './reportParts/mockReportPartService';
export { labelLayoutService } from './labelDesigner/labelLayoutServiceInstance';
export { getAiFeedbackLog, type AiFeedbackEntry } from './cases/mockCaseService';
export { FROZEN_FINAL_ACTIVITY_TYPE_ID } from './quality/mockQaActivityTypeService';
// Batch 486: so MentorTab.tsx (UI) can tell a Cytotech Competency
// Assessment supervision apart from an FPPE one without importing the
// mock service file directly (deployment-neutral UI rule).
export { CYTOTECH_COMPETENCY_ACTIVITY_TYPE_ID } from './quality/mockQaSupervisionAssignmentService';

// PS-355 (Batch 369): capabilities and the permission check
// (services/authorization/README.md).
export { authorizationService } from './authorization/defaultAuthorizationService';
export { createAuthorizationService, type IAuthorizationService, type AuthorizationDeps } from './authorization/authorizationService';
export {
  CAPABILITY_CATALOG, CAPABILITY_GROUPS, ALL_CAPABILITY_KEYS, capabilitiesByGroup, capabilityDefinition, isCapabilityKey,
  SEPARATION_OF_DUTIES, separationOfDutiesConflicts,
  capabilityLabelKey, capabilityDescriptionKey, capabilityGroupKey,
  type CapabilityDefinition, type CapabilityGroupId, type CapabilityKey, type QaExportCapability, type CapabilityRisk,
} from './authorization/capabilityCatalog';
export { planGrant, planRevoke, requirementsOf, dependentsOf, unmetRequirements, type GrantPlan, type RevokePlan } from './authorization/capabilityDependencies';
export type { CapabilityDecision, CapabilityContext } from './authorization/evaluateCapability';
export { exportQaReport } from './qualityAssurance/qaExport';

// Batch 369: services the Quality Assurance page imported directly as mocks
// (deployment-readiness rule 4).
export { billingDeficiencyService } from './billing/billingDeficiencyServiceInstance';
export { outboundChargeQueueService } from './billing/outboundChargeQueueServiceInstance';
export { codeReviewPoolService } from './billing/codeReviewPoolServiceInstance';
export { reasonDictionaryService } from './reasons/reasonDictionaryServiceInstance';
export { roleCapabilityChangeAudit, roleCapabilityProblem } from './authorization/roleCapabilityRules';
// Batch 536: the Superadmin role's capabilities (all but SUPERADMIN_WITHHELD).
export { SUPERADMIN_CAPABILITY_KEYS } from './authorization/capabilitySeeds';

// Batch 371: the governing-body settings screen took this service directly as a mock.
export { governingBodyService } from './governingBodies/governingBodyServiceInstance';

// Batch 372: ForMedrixAI support access (policy, just-in-time approvals, the
// hospital's support audit stream). services/supportAccess/README.md.
export { supportAccessService } from './supportAccess/defaultSupportAccessService';
export type { ISupportAccessService } from './supportAccess/supportAccessService';
export {
  SUPPORT_ACCESS_POLICIES, SUPPORT_WINDOW_OPTIONS, SUPPORT_AUDIT_COLUMNS, minutesLeft, isLiveGrant, effectiveSupportStatus, supportRequestQueues, supportWindowParts,
  type SupportAccessPolicy, type SupportAccessSettings, type SupportAccessRequest, type SupportAuditEntry, type SupportAuditAction, type ChainCheck,
} from './supportAccess/supportAccessRules';

// Batch 374: which screens a user may open (Home tiles, hubs and routes).
export { screenAccessService } from './screens/defaultScreenAccessService';
export {
  SCREEN_CAPABILITY, HUB_SCREENS, TILE_SCREENS, canOpenTile, visibleTiles, worklistViews, resolveWorklistView,
  type SubScreenId, type ScreenId, type HubId, type HomeTileId, type WorklistView, type IScreenAccessService,
} from './screens/screenAccess';

// Batch 375: services the Worklist page used by their mock file paths.
export { externalResourceService } from './externalResources/externalResourceServiceInstance';
export { wsiScanBatchService } from './digitalPathology/wsiScanBatchServiceInstance';
export { aiScreeningResultService } from './digitalPathology/aiScreeningResultServiceInstance';
export { aiStalledResultSettingsService } from './digitalPathology/aiStalledResultSettingsServiceInstance';
export type { LisSyncState, LisSyncPendingFlag } from './lisSync/mockLisSyncService';

// PS-359 (Batch 376): which fields each page requires, per organisation.
export { fieldRequirementService } from './fieldRequirements/defaultFieldRequirementService';
export type { IFieldRequirementService } from './fieldRequirements/fieldRequirementService';
export {
  FIELD_REQUIREMENT_PAGES, FIELD_REQUIREMENT_PAGE_IDS, FIELD_GROUP_ORDER, resolveFieldRequirements, missingRequiredFields, isFieldRequired,
  type FieldRequirementPageId, type FieldGroup, type ResolvedFieldRequirement,
} from './fieldRequirements/fieldRequirementRules';
// Batch 380: the case report page's modals.
export {
  REPORT_DEFAULT_REQUIREMENTS, reportFieldRequired, specimenEditProblems,
  revisionMissingFields, revisionNotificationShown, criticalNotificationMissing,
  holdMissing, commentMissing, delegationMissing, delegationNoteShown, biopsyArrayMissing,
  chosenReason, blockCancelMissing, restainMissing,
  discordanceStage, discordanceMissing, billingChangeMissing, correctedCodeCheck,
  autopsyAuthorizationMissing, autopsyReleaseMissing, addOrdersBlockMissing, addOrdersBlockSentence,
  type RevisionMode, type HoldKind, type HoldStep, type DiscordanceForm, type DiscordanceStage,
} from './fieldRequirements/reportPageChecks';
// Batch 399: the Intraop verbal report and the critical intraoperative results dictionary.
export { intraopCriticalResultService } from './intraop/intraopCriticalResultServiceInstance';
export { INTRAOP_CRITICAL_RESULTS_NOT_PERMITTED } from './intraop/mockIntraopCriticalResultService';
export { matchIntraopCriticalResults, mentionsUnnegated, parseMatchTerms, type CriticalResultMatch } from './intraop/matchIntraopCriticalResults';
export {
  SURGEON_UNAVAILABLE_OTHER, OTHER_NOTE_SUGGESTION_KEYS, surgeonUnavailableNeeded, verbalReportProblems,
  otherNoteAcceptable, recipientSuggestions, receivedByForRole,
} from './intraop/verbalReport';
// Batch 400: dictating the verbal report.
export { parseVerbalReportDictationDefault } from './intraop/defaultVerbalReportDictation';
export { applyDictationProposal, type VerbalReportDictationProposal } from './intraop/parseVerbalReportDictation';
// Batch 397: the Intraop page's checks.
export {
  INTRAOP_DEFAULT_REQUIREMENTS, intraopFieldRequired, intraopSessionMissing, intraopSpecimenMissing,
  intraopQuickGrossMissing, intraopTouchPrepSkipMissing, intraopVerbalReportMissing, intraopMergeMissing,
  type IntraopSessionForm, type IntraopSpecimenForm,
} from './fieldRequirements/intraopChecks';
// Batch 384: the message drawer's checks.
export { messagingFieldRequired, newMessageMissing, secureEmailMissing, replyMissing } from './fieldRequirements/messagingChecks';
export { cytologyFieldRequired, cytologyReviewMissing, cisoeaMissing, retrospectiveMissing, histologyCorrelationMissing, cytologyCorrectionMissing, cytologyAddendumMissing, RETROSPECTIVE_NO_ACTION_OUTCOME } from './fieldRequirements/cytologyChecks';
export type { CytologyReviewValues, CisoeAValues } from './fieldRequirements/cytologyChecks';
// Batch 528 (PS-359): Staff, Facility editor and Clinical history requirements.
export { checkStaffForm, staffFormValues } from './staff/staffFormChecks';
export type { StaffFormValues, StaffFormProblem, StaffFormCheck } from './staff/staffFormChecks';
export { checkFacilityForm, facilityFormValues } from './facilities/facilityFormChecks';
export type { FacilityFormProblem, FacilityFormCheck } from './facilities/facilityFormChecks';
export { missingClinicalHistory, clinicalHistoryValues } from './clinicalHistory/clinicalHistoryRequirementChecks';
export { clinicalHistoryAfterAccessionService } from './clinicalHistory/clinicalHistoryAfterAccessionService';
export { microtomyFieldRequired, microtomyCommentMissing, microtomyAddStainMissing, microtomyReprintMissing, microtomyCancelMissing } from './fieldRequirements/microtomyChecks';
// Batch 401: the Embedding station's checks.
export {
  EMBEDDING_DEFAULT_REQUIREMENTS, embeddingFieldRequired, parseObservedPieceCount,
  embeddingCommentMissing, embeddingConfirmMissing, embeddingReprintMissing, type EmbeddingConfirmValues,
} from './fieldRequirements/embeddingChecks';
// Batch 402: the Slide distribution station's checks.
export {
  SLIDE_DISTRIBUTION_DEFAULT_REQUIREMENTS, CHECKOUT_TARGET_MISSING, slideDistributionFieldRequired,
  slideCheckoutMissing, scannerLoadMissing, slideExceptionMissing, slideReprintMissing,
  type SlideCheckoutValues, type ScannerLoadValues,
} from './fieldRequirements/slideDistributionChecks';
// Batch 403: the Add-On Orders page's checks.
export {
  ADD_ON_ORDER_DEFAULT_REQUIREMENTS, addOnOrderFieldRequired, validLevelDepth,
  addOnLineMissing, addOnSubmitMissing, addOnExceptionMissing, addOnResponseMissing,
  type AddOnLineValues, type AddOnSubmitValues,
} from './fieldRequirements/addOnOrderChecks';
// Batch 404: Batch Management's checks.
export {
  BATCH_DEFAULT_REQUIREMENTS, batchFieldRequired, batchCreateMissing, batchAbortMissing, batchOverrideMissing, coldChainAckMissing,
  type BatchCreateValues,
} from './fieldRequirements/batchChecks';
// Batch 405: the molecular plate builder's checks.
export {
  MOLECULAR_BATCH_DEFAULT_REQUIREMENTS, molecularFieldRequired, molecularCreateMissing, molecularWellsMissingSpecimen,
  molecularSupersedeMissing, wellHasSpecimen, type MolecularCreateValues,
} from './fieldRequirements/molecularBatchChecks';
// Batch 406: what a molecular rack needs before it goes on an instrument.
export {
  MOLECULAR_RACK_DEFAULT_REQUIREMENTS, molecularRackFieldRequired, molecularRackPlacementMissing,
  rackPositionsMissingSampleId, rackDeckSlotNeeded, rackTypeOf, type MolecularRackPlacementValues,
} from './fieldRequirements/molecularRackChecks';
// Batch 383: the two sign-out gates' decisions (fixation time, pre-analytic dates).
export {
  fixativeGateMissing, buildFixativeResolutions,
  type FixativeGateSpecimen, type FixativeResolution, type FixativeRowState,
} from './signoutGates/fixativeGate';
export {
  preAnalyticGateMissing, buildPreAnalyticResolutions, emptyPreAnalyticRow, preAnalyticRowUsesOverride,
  type PreAnalyticDateGateSpecimen, type PreAnalyticDateResolution, type PreAnalyticFieldState, type PreAnalyticRowState,
} from './signoutGates/preAnalyticGate';
// Batch 382: the discordance record the reconciliation modal saves.
export { buildDiscordanceRecord, type DiscordanceRecordContext } from './quality/discordanceRecord';

// PS-359 (Batch 376): services the Accession page used by their mock file paths.
export { evaluateGrossingTemplateAssignment } from './cases/mockCaseService';
// Batch 380: the report page's amendment hook used these by their mock file path.
export { generateAiSuggestionsForReport, generateGrossingFieldSuggestionsFromDictation } from './cases/mockCaseService';
export { clinicalHistoryDictionaryService } from './clinicalHistory/clinicalHistoryDictionaryServiceInstance';
export { accessionOutboundQueueService } from './accessioning/accessionOutboundQueueInstance';
export { molecularOrderOutboundQueueService } from './molecularOrders/molecularOrderOutboundQueueServiceInstance';
export { queueEntriesNewestFirst, isMolecularOrderPayload, simulatedResultMessage } from './molecularOrders/orderQueueView';
// Batch 467: the in-house molecular order engine (spec "In-House Molecular Order Queue & Plate Binding Engine").
export { molecularOrderEngine, simulateMolecularRunResults, simulateSendOutResult } from './molecularOrders/molecularOrderEngineLive';
export { molecularRoutingChoices } from './molecularOrders/molecularRouting';
export { MOLECULAR_ORDER_STATUS_HUE } from './molecularOrders/molecularOrderTypes';
export { interfaceEngineService } from './interfaceEngine/interfaceEngineServiceInstance';
export { encounterService } from './encounters/encounterInstance';
export { caseMaskService } from './caseRegistry/caseMaskServiceInstance';
export { masterPaymentTypeService } from './billing/masterPaymentTypeServiceInstance';
export { jurisdictionPaymentMappingService } from './billing/jurisdictionPaymentMappingServiceInstance';

// Batch 378: completing grossing, checked against the Grossing field requirements.
export {
  completeGrossing, missingGrossingItems, canCompleteGrossingFrom, blockGrossingFieldsMissing,
  type MissingGrossingItem, type CompleteGrossingResult,
} from './grossing/grossingCompletion';


// Batch 409: the Cytology Workspace's services, so its pages use @/services (deployment-neutral UI).
export { cytologyInstrumentationService } from './cytology/cytologyInstrumentationServiceInstance';
export { cytologyNomenclatureSettingsService } from './cytology/cytologyNomenclatureSettingsServiceInstance';
export { cytologyQcSettingsService } from './cytology/cytologyQcSettingsServiceInstance';
export { cytologyRegistryOutboundQueueService } from './cytology/cytologyRegistryOutboundQueueServiceInstance';
export { cytologyReviewRecordService } from './cytology/cytologyReviewRecordServiceInstance';
export { screeningIntervalService } from './cytology/screeningIntervalServiceInstance';
export { cytologyProficiencyPanelService } from './cytology/cytologyProficiencyPanelServiceInstance';
export { cytologyRoutingSettingsService } from './cytology/cytologyRoutingSettingsServiceInstance';
export { cytologyScreeningStrategyService } from './cytology/cytologyScreeningStrategyServiceInstance';
export { cytologySignOutRecordService } from './cytology/cytologySignOutRecordServiceInstance';
export { cytologyWorkloadCapSettingsService } from './cytology/cytologyWorkloadCapSettingsServiceInstance';
export { cytologyWorkloadLedgerService } from './cytology/cytologyWorkloadLedgerServiceInstance';
export { facilityCytologyInstrumentationOverrideService } from './cytology/facilityCytologyInstrumentationOverrideServiceInstance';
export { facilityCytologyNomenclatureOverrideService } from './cytology/facilityCytologyNomenclatureOverrideServiceInstance';
export { facilityCytologyQcOverrideService } from './cytology/facilityCytologyQcOverrideServiceInstance';
export { facilityCytologyRoutingOverrideService } from './cytology/facilityCytologyRoutingOverrideServiceInstance';
export { facilityCytologyScreeningStrategyOverrideService } from './cytology/facilityCytologyScreeningStrategyOverrideServiceInstance';
export { facilityCytologyWorkloadCapOverrideService } from './cytology/facilityCytologyWorkloadCapOverrideServiceInstance';
export { facilityRegistryOverrideService } from './facilities/facilityRegistryOverrideServiceInstance';
export { pathologyLexiconService } from './cytology/pathologyLexiconServiceInstance';
export { registrySettingsService } from './facilities/registrySettingsServiceInstance';
// Batch 414: the screening registry engine's per-registry configuration and its permissioned saves.
export { screeningRegistryConfigService } from './screeningRegistry/screeningRegistryConfigServiceInstance';
export { saveEnterpriseScreeningRegistry, saveFacilityScreeningRegistry, saveScreeningRegistryConfig } from './screeningRegistry/saveScreeningRegistrySettings';
export { screeningRegistrySettingsDeps } from './screeningRegistry/screeningRegistrySettingsDeps';
// Batch 415: the CLIA workload cap and CAP 5-year lookback as switchable features.
export { cytologyComplianceFeaturesService } from './cytology/cytologyComplianceFeaturesServiceInstance';
export { saveCytologyComplianceFeatures } from './cytology/saveCytologyComplianceFeatures';
export { cytologyComplianceSaveDeps } from './cytology/cytologyComplianceSaveDeps';
// Batch 422: cancer registry settings, read and saved with config:cancer-registry:manage.
export { cancerRegistrySettingsService } from './cancerRegistry/cancerRegistrySettingsServiceInstance';
export { facilityCancerRegistryOverrideService } from './cancerRegistry/facilityCancerRegistryOverrideServiceInstance';
export { saveEnterpriseCancerRegistry, saveFacilityCancerRegistry } from './cancerRegistry/saveCancerRegistrySettings';
export { cancerRegistrySettingsDeps } from './cancerRegistry/cancerRegistrySettingsDeps';
// Batch 423: registry go-live (test system → live register): request, approve with re-confirmed credentials, return to test.
// Batch 424: validation vs production instances, the data-sharing agreement, the synthetic test suite,
// validation records, the local overlay (adapter rules, confirming local changes), stop live reporting.
export {
  addRegistryAdapterRule, approveRegistryGoLive, confirmRegistryLocalChanges, exportRegistryValidation, importRegistryValidation,
  loadRegistryGoLive, previewRegistryGoLivePrechecks, recordRegistryAgreement, removeRegistryAdapterRule, requestRegistryGoLive,
  runRegistryTestSuite, saveRegistryGoLiveGovernance, stopRegistryLiveReporting, withdrawRegistryGoLive,
} from './registryGoLive/registryGoLive';
export { registryGoLiveDeps } from './registryGoLive/registryGoLiveDeps';
export { snomedCervicalHistologySeverityMappingService } from './cytology/snomedCervicalHistologySeverityMappingServiceInstance';
export { staffCytologyQcOverrideService } from './cytology/staffCytologyQcOverrideServiceInstance';
export { staffCytologyWorkloadCapOverrideService } from './cytology/staffCytologyWorkloadCapOverrideServiceInstance';
// Batch 649: with their capabilities (case:pool:claim, case:pool:pass).
export { postCaseComment, commentAuditEntry } from './cases/postCaseComment';
export { claimPoolCase, acceptPoolCase, passPoolCase, releasePoolClaim, isPoolActionNotPermitted } from './cases/poolCaseActions';
// Batch 572: cases another tab changed (the demo's stand-in for the hub's caseReport topic).
export { subscribeCasesChangedElsewhere } from './cases/mockCaseService';
// Batch 572 (F7, option C): screening hours and their end-of-day sign-off.
export { cytologyScreeningHoursService } from './cytology/cytologyScreeningHoursServiceInstance';
export type { ScreeningHoursDay, ScreeningHoursCurrentDays } from './cytology/ICytologyScreeningHoursService';
export { signOffProblem, isCorrection, isSignOffStale, showScreeningHoursPanel, SCREENING_HOURS_FLAG_TOLERANCE_HOURS, screeningDay } from './cytology/screeningHoursRules';
export { signOutCytologyCase, type CytologySignOutOutcome, type CytologySignOutInput } from './cytology/signOutCytologyCase';
export { signOutCytologyCaseDeps, cytologyPreliminaryDeps } from './cytology/signOutCytologyCaseDeps';
// Batch 533: urgent cytology preliminary reports.
export { releaseCytologyPreliminary, preliminarySignatureRequired, cytologyPreliminaryBlock, cytologyPreliminariesFor, type CytologyPreliminaryOutcome } from './cytology/releaseCytologyPreliminary';
export { CYTOLOGY_PRELIMINARY_REASONS, type CytologyPreliminaryReason } from './cytology/cytologyPreliminaryReasons';
export { saveCaseTeam, caseTeamUpdates, withAssigneeOnTeam, type SaveCaseTeamResult } from './cases/saveCaseTeam';
export { caseTeamSaveDeps } from './cases/caseTeamSaveDeps';
export { qaTrendPolicyService } from './quality/qaTrendPolicyServiceInstance';
export { qaTrendService } from './quality/qaTrendServiceLive';
export {
  DEFAULT_QA_TREND_POLICY, SEVERITIES as QA_TREND_SEVERITIES, effectiveQaTrendPolicy, isOpenTrend, qaTrendDecisionProblem,
  qaTrendPolicyProblem, qaTrendQueueOrder, qaTrendPendingCount, toggledMajorSeverity, withLabQaTrendPolicy, type QaTrendDecision, type TrendCandidate,
} from './quality/qaTrendRules';
export { availableOrganSites, cytologyWorklistView, simulatedHpvResultEvent, type CytologyDomain, type CytologyWorklistCase, type CytologyWorklistTab } from './cytology/cytologyWorklist';
export { loadCytologyWorklist } from './cytology/cytologyWorklistLive';
export { loadQcRescreenQueue, loadCytologyReviewTray, takeCytologyReview, type GynSpecimenRef, type QcRescreenRef } from './cytology/cytologyQueuesLive';
export { CYTO_HISTO_CORRELATION_ACTIVITY_TYPE_ID, GYN_CYTOLOGY_SECONDARY_SCREENING_ACTIVITY_TYPE_ID } from './quality/mockQaActivityTypeService';
// Batch 428: the retention policy, saved with config:retention-policy:manage.
export { loadRetentionPolicy, saveRetentionPolicy, DEFAULT_RETENTION_POLICY, type RetentionPolicy } from './retention/retentionPolicyService';
// Batch 432: per-subspecialty risk weights for surgical peer review sampling.
export { surgicalPeerReviewRiskWeightService } from './quality/surgicalPeerReviewRiskWeightServiceInstance';
// Batch 444: the System Info AI check asks the proxy; no key in the browser.
export { checkAiProxyStatus, AI_PROXY_STATUS_ROUTES, type AiProxyStatus } from './aiIntegration/aiProxyStatus';
// Batch 445: the report page's unsaved-change sections, as ids the dialog translates.
export { DIRTY_SECTION_IDS, dirtySectionList, type DirtySectionId } from './reportEditing/dirtySections';
export { sequenceCaseReports, type SequencedCase } from './reportEditing/reportSequence';
// Batch 446: case pages are addressed by support reference, never by accession.
export { CASE_ADDRESS_VIEWS, isCaseAddressReference, createCaseAddresses, type CaseView, type CaseAddresses, type CaseIdFromAddress } from './caseAddresses/caseAddresses';
export { caseAddresses } from './caseAddresses/caseAddressesInstance';
// Batch 447: the QA feedback button and recipients, a Configuration setting.
export { feedbackSettingsService } from './feedback/feedbackSettingsServiceInstance';
export { FEEDBACK_SETTINGS_STORAGE_KEY, type IFeedbackSettingsService } from './feedback/mockFeedbackSettingsService';
export { loadValidationLinkOptions, templatesForStudy, buildValidationLinks, VALIDATION_CATEGORY, type ValidationLinkOptions, type ValidationLinks } from './feedback/validationRouting';
export { effectiveEnhancementUrl, destinationHost } from './feedback/enhancementDestination';
export { enhancementUrlProblem } from './feedback/feedbackSettingsRules';
export { qaButtonShown, parseEmailList, feedbackSettingsProblem, QA_BUTTON_MODES, DEFAULT_FEEDBACK_SETTINGS, type FeedbackSettings, type QaButtonMode, type FeedbackSettingsProblem } from './feedback/feedbackSettingsRules';
export { deploymentInstance, type InstanceRole } from './deployment/deploymentInstance';
// Batch 448: staff sign-in passwords set from the Staff screen.
export { staffPasswordService, passwordResetRequestService } from './signIn';
export { STAFF_PASSWORD_STORAGE_KEY, type IStaffPasswordService, type StaffPasswordStatus, type StaffPasswordCheck, type StaffPasswordError } from './staffPasswords/mockStaffPasswordService';
export { passwordPolicyProblem, passwordConfirmProblem, staffPasswordState, PASSWORD_MIN_LENGTH, type StaffPasswordState } from './staffPasswords/staffPasswordRules';
// Batch 456: the sign-in lockout.
export { signInRefusalNotice, SIGN_IN_LOCK_POLICY, SIGN_IN_LOCK_STORAGE_KEY, type SignInRefusal } from './auth/signInLockout';
// Batch 454: follow-up tracking (overdue cytology and surgical follow-ups, the lab's dispositions and clinician emails).
export { loadFollowUpItems, loadFollowUpCaseIdsForUser, sendFollowUpAlertsLive, markFollowUpExpectedLive, loadFollowUpMarkOffer, markFollowUpExpectedAfterSignOutLive, recordFollowUpDispositionLive, reopenFollowUpLive, draftFollowUpClinicianEmailLive, emailOrderingClinicianLive, type LoadedFollowUps } from './followUp/followUpLive';
export { followUpService } from './followUp/followUpServiceInstance';
export { followUpSettingsService, facilityFollowUpOverrideService, validateFollowUpSettings, followUpDraftOf, followUpRuleFromDraft, followUpDraftDirty, FOLLOW_UP_PLACEHOLDERS_AS_WRITTEN, type FollowUpSettingsDraft, FOLLOW_UP_EMAIL_PLACEHOLDERS, DEFAULT_FOLLOW_UP_SETTINGS, MAX_FOLLOW_UP_WARNING_DAYS, MAX_FOLLOW_UP_EMAIL_SUBJECT, MAX_FOLLOW_UP_EMAIL_BODY, type FollowUpSettingsRule, type FacilityFollowUpOverride, type FollowUpSettingsProblem } from './followUp/followUpSettings';
export { filterFollowUpItems, countFollowUpItems, followUpCaseView, followUpExportRows, followUpOutcomeAction, type FollowUpFilter } from './followUp/followUpTracking';
export { canOfferClinicianEmail, clinicianEmailProblem, type FollowUpEmailDraft } from './followUp/followUpClinicianEmail';
export { dispositionProblem, followUpMarkFailureKey, followUpMarkOffer, MAX_FOLLOW_UP_NOTE, type FollowUpMarkOffer } from './followUp/followUpActions';
export { FOLLOW_UP_DISPOSITIONS, isOpenFollowUp, needsFollowUpAttention, type FollowUpItem, type FollowUpDisposition, type FollowUpStatus, type FollowUpKind } from './followUp/followUpTypes';
// Batch 458 (PS-71): versioned case saves and the Edit Conflict dialog.
export { updateCaseWithRetry, updateCaseWithRetryOrThrow, overwriteAfterConflict, caseConflictRows, adoptSavedVersion, caseVersionOf, CONFLICT_FIELDS, type ConflictRow, type ConflictField, type CaseWriteResult, type OverwriteResult } from './cases/caseWrite';
export { savePageChange, commitMergeReview, takeUpSavedCase, takeUpNewerCase, takeTheirVersion, selectionAfterTakeUp, orchestrationDiagnosticAfterTakeUp, MergeReviewPendingError, type TheirVersion, type CasePageSelection, type PageSaveOutcome, type PendingChange, type MergeReview } from './cases/caseWrite';
export { caseWriteDeps, caseOverwriteDeps } from './cases/caseWriteDeps';
export { saveDraftParts, mergeDraftParts, DRAFT_LIST_KEYS, type DraftSaveResult, type DraftMerge } from './cases/caseWrite';
// Batch 460: the billing review panel's changes, shared by the report page, the Cytology Workspace and Microtome.
export { recordCaseCharge, recordCaseCredit, recordCaseCodeCorrection, enforceBillingReview, auditBillingSuggestionDeclined, billingSourceLabel, caseBillingChargeDeps, type CaseBillingChargeDeps, type CaseChargeOutcome } from './billing/caseBillingCharges';
export { codingWithApproved, codingWithRejected, codingWithOverride, codingWithoutCode, codingWithCorrection, groupApprovalsByUnit, specimensWithBaseCodeAdded, specimensWithBaseCodeRemoved, specimensWithBaseCodeCorrected, specimensWithMatrixCode, matrixSlidesWithEvaluatedCores, type BillingApprovalItem, type UnitCoding } from './billing/caseBillingCoding';
export { enforceAppliedCodeCorrection } from './billing/correctServiceCharge';
export { isCaseSignedOutForBilling } from './billing/isCaseSignedOutForBilling';
export { postSignoutReasonNeeded, specimenBillingChangeSummary } from './billing/postSignoutBillingReason';
export { saveCytologyUnitCoding, saveCytologySpecimenBilling } from './cytology/cytologyCaseActions';
// Batch 460: a slide's level is the one printed on its label (not its position).
export { slideLevelOf, stainAtLevel, stainIndexAtLevel, isSlideAtLevel, nextSlideLevelNumber } from './material/slideLevels';
export { materialChargePreview, type MaterialChargePreview, type MaterialChargeRow, type MaterialChargeWarning, type MaterialChargeTarget, type MaterialChargeState, type MaterialChargeLedgerStatus } from './billing/materialChargePreview';
export { saveUnitCodingOnCase, saveSpecimensOnCase, materialBillingWriteDeps, MaterialBillingNotSaved, type MaterialBillingWriteDeps } from './material/materialBillingWrites';
// Batch 461: the organ-mapping engine (prostate first).
export * from './organMapping/organMapTypes';
export { PROSTATE_PIRADS_SECTORS, PROSTATE_BIOPSY_SITES, PROSTATE_SECTOR_IDS, type ProstateSector, type ProstateBiopsySite } from './organMapping/prostateSectors';
export { resolveProstateMap, organMapFingerprint, categoryForGradeGroup } from './organMapping/resolveProstateMap';
export { BUILT_IN_ORGAN_MAP_SCHEME, resolveOrganMapScheme, validateOrganMapScheme, organMapSchemeVars, type PartialScheme, type OrganMapSchemeLayers, type ResolvedOrganMapScheme, type OrganMapSchemeProblem } from './organMapping/organMapScheme';
export { pathScribeDefaultBinding, resolveOrganMapBinding, validateOrganMapBinding, allowedBindingValues, SECTORS_INPUTS, type OrganMapBinding, type ChoiceBinding, type ProstateSectorsBinding, type ProstateBiopsyBinding, type SectorsInput, type OrganMapBindingProblem } from './organMapping/organMapBindings';
export { saveOrganMapSchemeLayer, saveOrganMapBinding, schemeLayerOf, browserOrganMapConfigStore, type OrganMapSchemeScope } from './organMapping/organMapConfig';
export { insertOrganMapFigure, removeOrganMapFigure, organMapFigureState, figureForInstance, organMapFiguresForVersion, isReportLockedForFigures, organMapFigureOutcomeKey, organMapReportFigures, type OrganMapReportFigure, type OrganMapFigure, type OrganMapFigureState } from './organMapping/organMapFigures';
export { organMapLayout, renderOrganMapSvg, patternMarks, usesPatternFill, patternId, type OrganMapDrawingLabels } from './organMapping/organMapDrawing';
export { loadOrganMapContext, organMapConfigDeps, organMapFigureDeps, type OrganMapContext } from './organMapping/organMapLive';
export { svgToPngDataUrl } from './documentRendering/svgToPng';
export { organMapDrawingLabels, organMapInlineText, organMapPartsText, organMapSectorName, organMapSectorSummary, organMapLegendLabel, type Translate as OrganMapTranslate } from './organMapping/organMapLabels';
export { partGridKey, partGridRowsOf, partGridRowValues, partGridHasAnswer, partGridDisplay, isPartGridKey, synopticFieldAnswered, clearSynopticFieldAnswers, type PartGridColumn, type PartGridRow } from './templates/partGrid';
// Batch 489 (Module 1 of Pete's Tumor Board / MDT Workspace spec): the
// dedicated board-nomination record (manual "Flag for MDT" + workspace).
export { tumorBoardService } from './tumorBoard/tumorBoardServiceInstance';
export { TUMOR_BOARD_NAMES, TUMOR_BOARD_CASE_STATUSES, TUMOR_BOARD_SOURCES, type TumorBoardName, type TumorBoardCaseStatus, type TumorBoardSource, type TumorBoardListing, type TumorBoardListingFilter, type NewTumorBoardListing, type TumorBoardListingUpdate, type ITumorBoardService } from './tumorBoard/ITumorBoardService';

// ─── Batch 506 (PS-477) ──────────────────────────────────────────────────────
// What the screens used to import straight from mock files. With these here,
// no screen imports a mock service (deploymentReadiness.guard.test.ts), so
// Stage 2 swaps each line for its HTTP service without touching a screen.
export { assistPollingService } from './assistPolling/assistPollingServiceInstance';
export { MAX_INTERVAL_MINUTES, MIN_INTERVAL_MINUTES } from './assistPolling/mockAssistPollingService';
export { billingTypeTriggerConfigService } from './billing/billingTypeTriggerConfigServiceInstance';
export type { BillingTypeTriggerMap } from './billing/mockBillingTypeTriggerConfigService';
export { findSimilarCases, recordAiFeedback, saveReportSuggestions } from './cases/mockCaseService';
export { onDemandCaseFetchService } from './cases/onDemandCaseFetchServiceInstance';
export { cassetteRoutingRuleService } from './cassetteRouting/cassetteRoutingRuleServiceInstance';
export { criticalAlertDispatchService } from './clinical/criticalAlertDispatchServiceInstance';
export { nonGynCytologyCategoryService } from './cytology/nonGynCytologyCategoryServiceInstance';
export { deliveryRuleService } from './delivery/deliveryRuleServiceInstance';
// Batch 521 (PS-281): delivery retries and the delivery exception queue.
export { deliveryRetrySettingsService } from './delivery/deliveryRetrySettingsServiceInstance';
export { deliveryRetryService } from './delivery/deliveryRetryServiceInstance';
export { deliveryExceptions } from './delivery/deliveryRetries';
export { parseRetryDelays, retrySettingsProblem, DEFAULT_RETRY_DELAYS_MINUTES } from './delivery/deliveryRetryPolicy';
export { dpVendorService } from './digitalPathology/dpVendorServiceInstance';
export { wsiViewerVendorService } from './digitalPathology/wsiViewerVendorServiceInstance';
export { slidePreviewService } from './digitalPathology/slidePreviewServiceInstance'; // Batch 750
export { draftCacheService } from './drafts/draftCacheInstance';
export { displayProfileService } from './facilityOpsDashboard/displayProfileServiceInstance';
export { grossImagingVendorService } from './imageAssociation/grossImagingVendorServiceInstance';
export { imageManagementSystemVendorService } from './imageAssociation/imageManagementSystemVendorServiceInstance';
export { imageUploadService } from './imageAssociation/imageUploadServiceInstance';
// Batch 609 (PS-44): images linked to a case's report, and put into its PDF.
export {
  attachCaseReportImage, removeCaseReportImage, listCaseReportImages, subscribeCaseReportImages,
  applyCaseReportImagesToPdf, applyCaseReportImagesToBlob, CASE_IMAGES_FAILED,
  REPORT_IMAGE_TYPES, MAX_REPORT_IMAGES, MAX_CAPTION_LENGTH,
  type CaseReportImage, type AttachResult, type AttachFailure, type ReportImageRef,
  insertIntoReport, takeOutOfReport, type ReportEditState, type PlacementProblem,
} from './imageAssociation/caseReportImages';
export { reportSectionImagesFor } from './imageAssociation/reportSectionImages';
export { placementFetchUrl } from './imageAssociation/placementLinks';
// Batch 742: case attachments (pointers only; the bytes go to the hospital's storage through the storage adapter).
export { attachmentStorageService } from './caseAttachments/attachmentStorageServiceInstance';
export {
  attachExternalFile, addAttachmentLink, unlinkAttachment, listCaseAttachments, subscribeCaseAttachments,
  type UploadProblem, type LinkProblem, type UnlinkProblem,
} from './caseAttachments/caseAttachments';
export * from './caseAttachments/attachmentCatalog';
export { ATTACHMENT_ACCEPT, DEFAULT_ATTACHMENT_WARN_BYTES, isOverWarningSize, megabytes } from './caseAttachments/attachmentFiles';
export { lisStagingQueueService } from './lisIngestion/lisStagingQueueServiceInstance';
export { migrationFieldMappingService } from './migration/migrationFieldMappingServiceInstance';
export { getMockInterfaceEngineSettings, setMockInterfaceEngineSettings } from './mockInterfaceEngine/mockInterfaceEngineSettings';
export type { MockInterfaceEngineMode, MockInterfaceEngineSettings } from './mockInterfaceEngine/mockInterfaceEngineSettings';
export { modelStoreService } from './models/modelStoreServiceInstance';
export type { StoreListing } from './models/mockModelStoreService';
export { narrativeSignalService } from './narrativeSignals/narrativeSignalServiceInstance';
export { outboundPatientAdtQueueService } from './patients/patientServicesInstance';
export { printRoutingRuleService } from './printRouting/printRoutingRuleServiceInstance';
export { printQueueService } from './printing/printQueueServiceInstance';
export { ABNORMAL_FINDING_CONFIRMATION_ACTIVITY_TYPE_ID } from './quality/mockQaActivityTypeService';
export { FPPE_ACTIVITY_TYPE_ID } from './quality/mockQaSupervisionAssignmentService';
export { outboundLisSyncQueueService } from './reports/reportServicesInstance';
export { outboundResultQueueService } from './reports/reportServicesInstance';
export { ALLOWED_HOSTS, isAllowedUrl } from './research/mockResearchFeedConfigService';
export { researchFeedConfigService } from './research/researchFeedConfigServiceInstance';
export { buildRoutingRuleMap } from './routingRules/mockRoutingRuleService';
export { routingRuleService } from './routingRules/routingRuleServiceInstance';
export { sessionTimeoutService } from './session/sessionTimeoutServiceInstance';
export { validationStudyService } from './validationStudies/validationStudyServiceInstance';
export type { AiMatchedCase, PatientHistoryCase } from './cases/mockCaseService';
export { evaluateSynopticAssignment, evaluateGrossingTemplateFit } from './cases/mockCaseService';
export { computeEditRatio } from './narrativeSignals/mockNarrativeSignalService';

// Batch 518 (PS-122): every outbound interface queue, and the actions on a
// failed or waiting message (interface:outbound:resend).
export { OUTBOUND_QUEUE_TYPES, type OutboundQueueType } from './interfaceDispatch/outboundQueueAdapters';
export {
  outboundRows, dispatchOutboundEntry, resendOutboundEntry, simulateOutboundFailure, captureOutboundFailureAsCapa,
  OUTBOUND_RESEND_CAPABILITY, type OutboundRow, type OutboundActionOutcome,
} from './interfaceDispatch/outboundQueueActions';
export { outboundQueueDeps } from './interfaceDispatch/outboundQueueDeps';

// Batch 619 (PS-800): the one Outbound Queue (every outbound feed; hold, release, retry).
export { outboundQueueService } from './outboundQueue/outboundQueueServiceInstance';
export type { IOutboundQueueService, OutboundQueueView } from './outboundQueue/IOutboundQueueService';
export {
  OUTBOUND_FEEDS, OUTBOUND_STATES, HOLD_REASONS,
  type OutboundFeed, type OutboundState, type HoldReason, type OutboundQueueItem, type OutboundQueueFilter, type OutboundQueueSort,
  type OutboundSortKey, type OutboundAction, type OutboundActionResult, type OutboundActionRefusal, type OutboundCounts, type OutboundDestination,
} from './outboundQueue/outboundQueueTypes';
export { ACTIONS_FOR_STATE, allows as outboundActionAllowed } from './outboundQueue/outboundQueueView';
export { outboundHoldStore } from './outboundQueue/outboundHoldStore';

// Batch 518 (PS-123): batch label reprint (label:batch:reprint).
export {
  casesForReprint, reprintItems, reprintLabels, retryFailedLabels, reprintSummary, REPRINT_LABEL_KINDS,
  type ReprintLabelKind, type ReprintCaseFilter, type ReprintItem, type LabelReprintRun, type ReprintRefusal,
} from './labels/batchLabelReprint';
export { batchLabelReprintDeps } from './labels/batchLabelReprintDeps';
export { labelReprintRunService } from './labels/labelReprintRunServiceInstance';

// Batch 538 (Pete, Oct 12): released report documents, stored once with their SHA-256 and sent as is.
// Batch 556: with the API server, documents are read through it too (reportDocumentInstance.ts).
export { reportDocumentService } from './reportDocuments/reportDocumentInstance';
export { sentDocumentProblem, type SentDocumentProblem } from './reportDocuments/reportDocumentService';
export { shortHash, pdfSha256, type ReportDocument, type ReportDocumentProducer } from './reportDocuments/reportDocuments';

// Batch 611 (#189): Smart Capture, a labelled prototype that suggests charge lines for a person to review.
// Batch 612: the Interface Dictionary / Message Mapper (vendor profiles and the vendor fields on a case).
export { mockInterfaceDictionaryService as interfaceDictionaryService } from './interfaceDictionary/interfaceDictionaryServices';
export {
  EXTENSION_PREFIX, SCOPE_HANDLED_BY_MAPPER, SCOPE_NEEDS_CODE_RELEASE, targetRefusal,
  type ScopeHandledId, type ScopeReleaseId, type TargetRefusal,
} from './interfaceDictionary/scopeGuard';
export { validateMappings, type MappingProblem, type MappingProblemCode, type MappingOutcome, type ApplyResult } from './interfaceDictionary/mappingEngine';
export { isZSegment, parseSourcePath } from './interfaceDictionary/messagePath';
export { codeKey, formatValueMap, parseValueMap } from './interfaceDictionary/interfaceDictionaryText';
export { blankMapping, messageTypeValid, publishRefusal, publishedVersion, rollbackTarget, workingVersion } from './interfaceDictionary/profileLifecycle';
export {
  MAPPING_DATA_TYPES, MAPPING_TRANSFORMS, VENDOR_MESSAGE_FORMATS,
  type ExtensionValue, type FieldMapping, type InterfaceDictionaryRefusal, type MappingDataType, type MappingTransform,
  type ProfileVersion, type VendorMessageFormat, type VendorProfile,
} from './interfaceDictionary/interfaceDictionaryTypes';
export type { ProfileTestReport } from './interfaceDictionary/interfaceDictionaryService';
export { workstationRegistryService } from './workstationRegistry/workstationRegistryServiceInstance';
export type { WorkstationSummary, WorkstationDraft, WorkstationState } from './workstationRegistry/workstationRegistryRules';
export { biFeedService } from './biFeed/biFeedServiceInstance';
export type { BiFeedSettings, BiTokenSummary, BiTokenDraft, BiTokenState } from './biFeed/biFeedRules';
export { BI_DATASETS, type BiDatasetId } from './biFeed/biFeedCatalog';
export { SCOPE_REFERENCE, SETTING_SCOPES, entriesByScope, type ScopeReferenceEntry, type SettingScope } from './scopeReference/scopeReference';
export { smartCaptureSettingsService } from './smartCapture/smartCaptureSettingsServiceInstance';
export { smartCaptureService } from './smartCapture/smartCaptureServiceInstance';
export { SMART_CAPTURE_CHECKLIST_IDS, checklistComplete as smartCaptureChecklistComplete, type SmartCaptureSettings } from './smartCapture/smartCaptureSettings';
export { SMART_CAPTURE_CPT_LABELS, type SmartCaptureEvidence } from './smartCapture/smartCaptureRules';
export type { SmartCaptureView } from './smartCapture/smartCaptureService';
export type { SmartCaptureLine, SmartCaptureRecordState } from './smartCapture/smartCaptureStates';
export type { SmartCapturePayload } from './smartCapture/smartCapturePayload';
// Batch 613: saved case-report definitions and report schedules (Simulated runs).
export { caseReportsStore as savedCaseReportService } from './caseReports/caseReportStore';
export { scheduledReportService } from './scheduledReports/scheduledReportServiceInstance';
// Batch 645: Lockbox Drop-Off (after-hours specimens: the scan kiosk and the Overnight folder).
export { lockboxService } from './lockbox/lockboxServiceInstance';
export type { ILockboxService } from './lockbox/ILockboxService';
export type {
  LockboxReceipt, LockboxResolution, LockboxLookup, LockboxReceiveInput, LockboxPlaceholderInput, LockboxFolder, LockboxFolderEntry,
  LockboxFolderStatus, LockboxTimeSummary, LockboxState, LockboxRefusal,
} from './lockbox/lockboxTypes';
export { scanStepFor, dropTimeFromLocalInput, dwellParts, dwellLabel, accessionLinkForReceipt, localInputValueFromDate, normalizeBarcode, normalizeCallbackNumber, type ScanStep } from './lockbox/lockboxRules';

// Batch 669h (footer): the Home footer's system status (docs/architecture/HEALTH_STATUS_API.md).
export { healthStatusService } from './healthStatus/healthStatusServiceInstance';
export type { IHealthStatusService } from './healthStatus/IHealthStatusService';
export { footerStatusKind, shouldRecheck, parseHealthStatus, HEALTH_RECHECK_AFTER_MS, type HealthStatus, type HealthState, type FooterPhase, type FooterStatusKind } from './healthStatus/healthStatusContract';
