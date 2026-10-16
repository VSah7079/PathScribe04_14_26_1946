// ─────────────────────────────────────────────────────────────────────────────
// services/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 527 (PS-486): the demo build only (no API server); see __DEMO_TOOLS__ in vite.config.ts.
export const IS_MOCK_BACKEND = __DEMO_TOOLS__;
export { mockUserService          as userService          } from './users/mockUserService';
export { mockRoleService          as roleService          } from './roles/mockRoleService';
export { mockParticipationTypeService as participationTypeService } from './participationTypes/mockParticipationTypeService';
export { mockPhysicianService     as physicianService     } from './physicians/mockPhysicianService';
export { mockFlagService          as flagService          } from './flags/mockFlagService';
// Batch 452 (PS-156): the cyto-histo correlation window settings.
// Batch 453: the surgical biopsy-to-resection window, configured the same way.
export { mockBiopsyResectionCorrelationSettingsService as biopsyResectionCorrelationSettingsService, mockFacilityBiopsyResectionCorrelationOverrideService as facilityBiopsyResectionCorrelationOverrideService } from './quality/biopsyResectionCorrelationSettings';
export { mockCytologyHistologyCorrelationSettingsService as cytologyHistologyCorrelationSettingsService, mockFacilityCytologyHistologyCorrelationOverrideService as facilityCytologyHistologyCorrelationOverrideService } from './cytology/mockCytologyHistologyCorrelationSettingsService';
// Batch 491: the Tumor Board auto-flagging rules — enterprise baseline and
// facility overrides, same two-tier pattern as the two lines above.
export { mockTumorBoardRuleService as tumorBoardRuleService, mockFacilityTumorBoardRuleOverrideService as facilityTumorBoardRuleOverrideService, mockTumorBoardBatchSettingsService as tumorBoardBatchSettingsService } from './tumorBoardRules/mockTumorBoardRuleService';
// Batch 490 (margin-distance extraction layer): added to the barrel only
// now, when Batch 491 gives it a real caller — a disclosed gap in Batch
// 490 (the service existed but nothing outside services/ could reach it
// without importing the mock file directly, against CLAUDE.md rule 4).
export { mockMarginExtractionService as marginExtractionService } from './marginExtraction/mockMarginExtractionService';
export { resolveLisFlagDefinitionId } from './flags/resolveLisFlagDefinition';
export { mockContainerTypeService as containerTypeService } from './containerTypes/mockContainerTypeService';
export { mockIntraoperativeService as intraoperativeService } from './intraop/mockIntraoperativeService';
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
// Batch 345: the signature records (one per signature applied to a case).
export { mockSignatureRecordService as signatureRecordService } from './signatures/mockSignatureRecordService';
// Batch 344: the biometric enrolment and (simulated) WebAuthn check.
export * as biometricService from './biometric/mockBiometricService';
export type { BiometricCadence, BiometricPolicy } from './biometric/mockBiometricService';
export { mockOrSuiteTerminalService as orSuiteTerminalService } from './intraopDashboard/mockOrSuiteTerminalService';
export { mockOrEventLogService as orEventLogService } from './intraopDashboard/mockOrEventLogService';
// PS-113, Stage 5. reconciliationService/mockReconciliationService.ts
// retired and deleted - the real, generic qaActivityRecordService
// below is now the sole system for this data (first release, no real
// production history to preserve).
export { mockQaActivityRecordService as qaActivityRecordService } from './quality/mockQaActivityRecordService';
export { mockQaActivityTypeService as qaActivityTypeService } from './quality/mockQaActivityTypeService';
export { mockQaSupervisionAssignmentTypeService as qaSupervisionAssignmentTypeService } from './quality/mockQaSupervisionAssignmentTypeService';
// PS-114. Second archetype's generic service, added to the barrel the
// same way - real consumers (FppeAssignmentsSection.tsx, and later
// useSignOutWorkflow.ts) need it during this migration too.
export { mockQaSupervisionAssignmentService as qaSupervisionAssignmentService } from './quality/mockQaSupervisionAssignmentService';
export { mockAmendmentService as amendmentService } from './reports/mockAmendmentService';
export { mockCriticalResultNotificationService as criticalResultNotificationService } from './clinical/mockCriticalResultNotificationService';
// Batch 558: with the API server, the server's versions too, and their PDFs read through the API.
export { reportVersionService, reportVersionPdfReader } from './reports/reportVersionInstance';
export { versionHasPdf, versionPdfProblem, type VersionPdfProblem } from './reports/reportVersionPdf';
export { mockLisAmendmentNoticeService as lisAmendmentNoticeService } from './reports/mockLisAmendmentNoticeService';
export { mockInformalReviewService as informalReviewService } from './reports/mockInformalReviewService';
export { mockAccessRequestService as accessRequestService } from './access/mockAccessRequestService';
export { mockSubspecialtyService  as subspecialtyService  } from './subspecialties/mockSubspecialtyService';
export { mockFacilityService       as facilityService     } from './facilities/mockFacilityService';
export { mockPatientIndexService    as patientIndexService } from './patients/mockPatientIndexService';
export { mockLocationService       as locationService     } from './locations/mockLocationService';
export { mockInterfaceExceptionService as interfaceExceptionService } from './interfaceExceptions/mockInterfaceExceptionService';
export { mockReportReleaseService as reportReleaseService } from './reportRelease/mockReportReleaseService';
export { mockConcordanceReviewSettingsService as concordanceReviewSettingsService } from './qualitySettings/mockConcordanceReviewSettingsService';
export { mockDepartmentService as departmentService } from './departments/mockDepartmentService';
export { mockAssetLocationDictionaryService as assetLocationDictionaryService } from './assetLocation/mockAssetLocationDictionaryService';
export { mockCaseViewTrackingService as caseViewTrackingService } from './caseViewTracking/mockCaseViewTrackingService';
export { mockGrossingRoutingOverrideService as grossingRoutingOverrideService } from './grossingRoutingOverrides/mockGrossingRoutingOverrideService';
export { mockTemplateSuggestionSignalService as templateSuggestionSignalService } from './templateSuggestions/mockTemplateSuggestionSignalService';
export { mockLisSyncService as lisSyncService } from './lisSync/mockLisSyncService';
export { mockSpecimenDictionaryService as specimenDictionaryService } from './specimenDictionary/mockSpecimenDictionaryService';
export { mockSpecimenCategoryService as specimenCategoryService } from './specimenCategories/mockSpecimenCategoryService';
export { mockPriorityService as priorityService } from './priority/mockPriorityService';
export { mockStainTypeService as stainTypeService } from './stains/mockStainTypeService';
export { mockFixativeDictionaryService as fixativeDictionaryService, mockProcessingFormatDictionaryService as processingFormatDictionaryService } from './protocols/mockPathwayMaterialDictionaryService';
export { mockSectioningProtocolService as sectioningProtocolService } from './stains/mockSectioningProtocolService';
export { mockStainOrderMacroService as stainOrderMacroService } from './stains/mockStainOrderMacroService';
export { mockManagementReviewService as managementReviewService } from './deficiencies/mockManagementReviewService';
export { mockBatchService as batchService } from './batches/mockBatchService';
// Real, pre-existing baseline gap fixed here, confirmed directly before
// touching anything: all three mock service files (Stain QC Module §2.1
// Reagent & Solution Lot Registry, and PS-289 Workstation Groups & Action
// Routing) were already fully built, but never actually wired into this
// barrel export — a real tsc error blocking a clean baseline, not a
// stylistic gap, same class of finding as this file's own reagentLots/
// workstationGroups/actionGroups README notes already describe elsewhere.
export { mockReagentLotService as reagentLotService } from './reagentLots/mockReagentLotService';
export { mockWorkstationGroupService as workstationGroupService } from './workstationGroups/mockWorkstationGroupService';
export { mockActionGroupService as actionGroupService } from './actionGroups/mockActionGroupService';
export { mockHardwareContainerRegistryService as hardwareContainerRegistryService } from './hardwareContainers/mockHardwareContainerRegistryService';
// PS-290 — External Consult / Second-Opinion Access. See
// consultAccess/IConsultTokenService.ts's own header before using this
// anywhere: it is NOT real token security, mock-first in a categorically
// different sense than most of this barrel's other entries.
export { mockConsultTokenService as consultTokenService } from './consultAccess/mockConsultTokenService';
// PS-136 — the opaque reference token behind the SMS/secure-email
// non-PHI "tap to view" deep link. See
// clinical/ICriticalAlertReferenceTokenService.ts's own header before
// using this anywhere: same NOT-real-token-security caveat as
// consultTokenService just above, for the identical underlying reason.
export { mockCriticalAlertReferenceTokenService as criticalAlertReferenceTokenService } from './clinical/mockCriticalAlertReferenceTokenService';
export { mockProtocolService as protocolService } from './protocols/mockProtocolService';
export { mockPrinterProfileService as printerProfileService } from './printerProfiles/mockPrinterProfileService';
export { mockDiagnosisCodesService as diagnosisCodesService } from './diagnosisCodes/mockDiagnosisCodesService';
export { mockOrderIntakeService as orderIntakeService } from './orderIntake/mockOrderIntakeService';
export { mockDeficiencyTypeService as deficiencyTypeService } from './deficiencies/mockDeficiencyTypeService';
export { mockResolutionTypeService as resolutionTypeService } from './deficiencies/mockResolutionTypeService';
export { mockAbnormalTriggerRuleService as abnormalTriggerRuleService } from './abnormalDetection/mockAbnormalTriggerRuleService';
export { mockAbnormalDetectionSignalService as abnormalDetectionSignalService } from './abnormalDetection/mockAbnormalDetectionSignalService';
export { mockSpecimenDeficiencyService as specimenDeficiencyService } from './deficiencies/mockSpecimenDeficiencyService';
// Batch 438 (PS-144–148): CAPA recommendations, confirmed or dismissed by a QA lead.
export { mockCapaRecommendationService as capaRecommendationService } from './quality/mockCapaRecommendationService';
export { decisionProblem as capaDecisionProblem, capaOwnerOptions, capaQueueOrder } from './quality/capaRecommendationRules';
export { isClinicallySignificant, REVISION_REASON_CATEGORIES } from './reasons/revisionReasonRules';
// Batch 439 (PS-144, PS-145, PS-148): peer review before sign-out, the
// clinical-pathologic mismatch check, and outside-consult assessment.
export { mockPeerReviewService as peerReviewService } from './quality/mockPeerReviewService';
export { mockPeerReviewSettingsService as peerReviewSettingsService } from './quality/mockPeerReviewSettingsService';
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
export { mockClinicalMismatchRuleService as clinicalMismatchRuleService } from './clinical/mockClinicalMismatchRuleService';
// Batch 536 (PS-554, PS-558): the governed AI instructions and the AI vendor policy.
export { mockAiInstructionService as aiInstructionService } from './clinical/mockAiInstructionService';
export { AI_INSTRUCTION_DISCIPLINES, MAX_AI_INSTRUCTION_LENGTH, type AiInstructionDiscipline, type AiInstructionVersion } from './clinical/aiInstructions';
export type { AiInstructionsView, AiInstructionTestResult } from './clinical/aiInstructionService';
export { mockAiVendorPolicyService as aiVendorPolicyService } from './aiIntegration/mockAiVendorPolicyService';
export { AI_POLICY_SERVICES, aiVendorConflicts, aiVendorScopeStatuses, parseRegionList, type AiVendorScopeStatus, type AiPolicyService, type AiVendorRule, type AiVendorRuleScope, type AiVendorRefusal } from './aiIntegration/aiVendorPolicy';
export type { ServedFacility } from './aiIntegration/aiVendorPolicyService';
export {
  evaluateClinicalMismatch, applicableRules, newSpecimenRule, clinicalMismatchRuleProblem, clinicalMismatchRuleRemovalProblem,
  DEFAULT_CLINICAL_MISMATCH_RULES, CLINICAL_MISMATCH_CATEGORIES, CLINICAL_MISMATCH_ACTION_TYPES, DEFAULT_MINIMUM_DISPLAY_THRESHOLD,
} from './clinical/clinicalMismatchRules';
export type { ClinicalMismatchRule, ClinicalMismatchActionType, ClinicalMismatchOutcome, ClinicalMismatchRisk, ClinicalMismatchRuleProblem } from './clinical/clinicalMismatchRules';
export type { ClinicalMismatchSuggestion, ClinicalMismatchKind } from './clinical/detectClinicalPathologicMismatch';
export { assessmentProblem as outsideConsultAssessmentProblem, OUTSIDE_CONSULT_ASSESSMENTS, reportReleased } from './consultAccess/outsideConsultRules';
export type { OutsideConsultAssessment } from './consultAccess/outsideConsultRules';
export { mockSystemConfigService  as systemConfigService  } from './systemConfig/mockSystemConfigService';
export { mockMacroService         as macroService         } from './macros/mockMacroService';
export { mockVoiceMacroService    as voiceMacroService    } from './voicemacro/mockVoiceMacroService';
export { mockFontService          as fontService          } from './fonts/mockFontService';
export { mockAIBehaviorService    as aiBehaviorService    } from './aiBehavior/mockAIBehaviorService';
export { mockPrintSettingsService as printSettingsService } from './printSettings/mockPrintSettingsService';
export { mockFacilityPrintSettingsService as facilityPrintSettingsService } from './printSettings/mockFacilityPrintSettingsService';
// PS-282 (Batch 437): print and export audit.
export { recordDocumentOutput, planReportPrint } from './printing/recordDocumentOutput';
export { DESTINATION as DOCUMENT_DESTINATION, printPromptComplete } from './printing/documentOutputAudit';
export type { DocumentOutputEvent, PrintPlan } from './printing/documentOutputAudit';
export { beginExport, recordExport, type GatedExport } from './printing/exportGate';
// Batch 495 (PS-283): the case-report print permission.
export { beginReportPrint, checkReportPrint, type ReportPrintCheck } from './printing/reportPrintGate';
// Batch 495: historical-data migration jobs, so MigrationJobsPage reaches them through this index.
export { mockMigrationJobService as migrationJobService } from './migration/mockMigrationJobService';
export { mockMigrationRecordResultService as migrationRecordResultService } from './migration/mockMigrationRecordResultService';
export { mockModelService         as modelService         } from './models/mockModelService';
export { mockSavedSearchService   as savedSearchService   } from './savedSearches/mockSavedSearchService';
// Batch 350: server-side case search (filter, sort, count, one page) and CSV export rows.
export { mockCaseSearchService    as caseSearchService    } from './caseSearch/mockCaseSearchService';
export { mockActionRegistryService as actionRegistryService } from './actionRegistry/mockActionRegistryService';
// Batch 396: for the Cytology QC Peer Review Queue (was imported directly from the mock).
export { mockCytologyQcCaseAssignmentService as cytologyQcCaseAssignmentService } from './cytologyQc/mockCytologyQcCaseAssignmentService';
export { mockCytologyQcRuleService as cytologyQcRuleService } from './cytologyQc/mockCytologyQcRuleService';
// Batch 353: TAT targets and case delegations, each behind its own service
// (they were kept by the TAT settings screen and the demo case service).
// Batch 358: the equipment register (analysers molecular batches target, and more).
export { mockEquipmentService     as equipmentService     } from './equipment/mockEquipmentService';
// Batch 359: grossing cameras and scales (settings; the device is in the register).
export { mockGrossingHardwareProfileService as grossingHardwareProfileService } from './grossingHardware/mockGrossingHardwareProfileService';
export type { GrossingHardwareProfile, GrossingHardwareKind, GrossingHardwareBridgeType } from './grossingHardware/IGrossingHardwareProfileService';
export { mockScanStationService   as scanStationService   } from './scanStations/mockScanStationService';
export type { ScanStation } from './scanStations/IScanStationService';
// Batch 444: the Scan Stations screen's decisions and validation codes.
export { SCAN_STATION_WORKFLOW_STAGES } from './scanStations/IScanStationService';
export { filterScanStations, activeScanStations, workflowStageKey, type ScanStationStatusFilter } from './scanStations/scanStationList';
export { validateScanStationDraft, type ScanStationDraftValidationErrors, type ScanStationDraftError } from './scanStations/validateScanStationDraft';
export type { IEquipmentService, Equipment, EquipmentDraft, EquipmentError, EquipmentKind } from './equipment/IEquipmentService';
export { EQUIPMENT_KINDS, EQUIPMENT_LINK_INVALID, DECK_RACK_TYPES, type DeckSlot, type DeckRackType } from './equipment/IEquipmentService';
// Batch 360: each device's maintenance, calibration and service history (append-only).
export { mockEquipmentLogService  as equipmentLogService  } from './equipment/mockEquipmentLogService';
export type { EquipmentLogEntry, NewEquipmentLogEntry, EquipmentLogType, EquipmentLogOutcome, IEquipmentLogService } from './equipment/IEquipmentLogService';
export { EQUIPMENT_LOG_TYPES, EQUIPMENT_LOG_OUTCOMES } from './equipment/IEquipmentLogService';
// Batch 364 (PS-349, PS-350): support references, non-identifying ids support staff can use instead of case numbers.
export { mockSupportReferenceService as supportReferenceService } from './supportReferences/mockSupportReferenceService';
export { mockReportChangeLogService as reportChangeLogService, REPORT_CHANGE_LOGGED_EVENT } from './reportChangeLog/mockReportChangeLogService';
export type { ReportChangeEntry, ReportFieldChange, ReportChangeArea } from './reportChangeLog/IReportChangeLogService';
export type { SupportReference, SupportReferenceKind, ISupportReferenceService } from './supportReferences/ISupportReferenceService';
export { SUPPORT_REFERENCE_KINDS, SUPPORT_REFERENCE_NOT_FOUND, SUPPORT_REFERENCE_INVALID } from './supportReferences/ISupportReferenceService';
export { mockTatTargetService     as tatTargetService     } from './tatConfig/mockTatTargetService';
export { mockDelegationService    as delegationService    } from './delegations/mockDelegationService';
export { mockDelegationTypeService as delegationTypeService } from './delegationTypes/mockDelegationTypeService';
export type { ITatTargetService, TatTargetError } from './tatConfig/ITatTargetService';
export type {
  IDelegationService, DelegationRecord, DelegationStatus, DelegationRecipient, DelegationRequest, DelegationError,
} from './delegations/IDelegationService';
export { mockAuditService         as auditService         } from './auditlog/mockAuditService';
export { mockCaseService          as caseService          } from './cases/mockCaseService';
export { mockCountersignService   as countersignService   } from './cases/mockCountersignService';
export { mockCodeService          as codeService          } from './codes/mockCodeService';
// PS-89 (Batch 334): bulk billing-code imports (System → Code Import).
export { mockCodeImportService    as codeImportService    } from './billing/mockCodeImportService';
// PS-342 (Batch 336): personal and facility spelling dictionaries.
export { mockCustomDictionaryService as customDictionaryService } from './spellcheck/mockCustomDictionaryService';
export type { CodeImportRefusal, CodeImportPreview } from './billing/mockCodeImportService';
export { mockBillingRuleService   as billingRuleService   } from './billing/mockBillingRuleService';
// Batch 381: the report page used it by its mock file path.
export { mockServiceChargeService as serviceChargeService } from './billing/mockServiceChargeService';
export { mockModifierDictionaryService as modifierDictionaryService } from './billing/mockModifierDictionaryService';
export { mockNcciEditService      as ncciEditService      } from './billing/mockNcciEditService';
export { mockRvuCodeMapService    as rvuCodeMapService    } from './billing/mockRvuCodeMapService';
export { mockMessageService       as messageService       } from './messages/mockMessageService';
// Batch 517 (PS-143): each lab's secure messaging gateways and agreements.
export { mockSecureMessagingConfigService as secureMessagingConfigService } from './secureMessaging/mockSecureMessagingConfigService';
export { mockInternalNoteService  as internalNoteService  } from './internalNotes/mockInternalNoteService';
export { INTERNAL_NOTE_TYPE_LABELS                        } from './internalNotes/IInternalNoteService';
// resultService removed — the whole discrete-result concept (order,
// poll, status) was shelved as unvalidated. See Flag Maintenance /
// ComputationalPanel for what remains: Flags as a real catalog/triage
// concept, without the ordering/result apparatus that was built on an
// integration model (outbound polling) that never matched how either
// Orchestration or CoPilot actually works.
export { mockReportTemplateService as reportTemplateService } from './reportTemplates/mockReportTemplateService';
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
export { mockCytologyCategoryService as cytologyCategoryService } from './cytology/mockCytologyCategoryService';
export { mockPlaceOfServiceCodeService as placeOfServiceCodeService } from './billing/mockPlaceOfServiceCodeService';
export { mockCytologyQaReportService as cytologyQaReportService } from './cytology/mockCytologyQaReportService';
// Batch 406: molecular QC runs and the specimens on each (for Batch Management's QC view).
export { mockMolecularQcRunRecordService as molecularQcRunRecordService } from './cytology/mockMolecularQcRunRecordService';
export { qcRunsNewestFirst, specimensByMolecularRun, type QcRunSpecimenLink } from './cytology/molecularQcRunLinks';
export { mockReferralTrackingService as referralTrackingService } from './referral/mockReferralTrackingService';
export { mockCassetteColorService as cassetteColorService } from './cassetteColors/mockCassetteColorService';
// Structured Inking, Module 3 (PS-359 follow-up): the margin ink-colour admin palette.
export { mockInkColorService as inkColorService } from './inkColors/mockInkColorService';
// Batch 381: the block/stain editor used it by its mock file path.
export { mockMolecularTargetService as molecularTargetService } from './stains/mockMolecularTargetService';
// Batch 403: which reference labs perform a molecular/send-out test.
export { activeReferenceLabs, normalizeReferenceLabLink, activePerformingLabs, normalizeInHouseLabs } from './stains/referenceLabLink';
export { mockMolecularBatchService as molecularBatchService } from './molecular/mockMolecularBatchService';
// Batch 405: so the plate builder doesn't import the mocks directly.
export { mockMolecularAssayControlRuleService as molecularAssayControlRuleService } from './molecular/mockMolecularAssayControlRuleService';
export { mockMolecularExtractionRackService as molecularExtractionRackService } from './molecular/mockMolecularExtractionRackService';
// Batch 406: rack placement on an instrument's deck, and the control rules' refusals.
export { MOLECULAR_RACK_ERRORS, type MolecularExtractionRack, type MolecularRackPosition, type MolecularRackPlacement } from './molecular/IMolecularExtractionRackService';
export { resolveMolecularMovementRecord, molecularActor, UNKNOWN_STATION_NAME } from './molecular/resolveMolecularMovementRecord';
export { molecularAssayTypes } from './molecular/molecularAssays';
export { controlRuleDraftProblem, sampleRackSlotChoices, withControlPatch, type ControlRuleDraftProblem } from './molecular/controlRuleDraft';
export { rackWorklistRows, type RackWorklistRow, type RackWorklistStatus } from './molecular/rackWorklist';
export { slotsForRack, deckSlotRequired, checkDeckSlot, parseDeckLocationBarcode, resolveDeckScan, type DeckSlotProblem, type DeckScanResult } from './molecular/deckSlots';
export {
  MOLECULAR_CONTROL_RULE_NOT_PERMITTED, MOLECULAR_CONTROL_RULE_DUPLICATE, MOLECULAR_CONTROL_RULE_NOT_FOUND,
  type MolecularAssayControlRule, type MolecularRequiredControl,
} from './molecular/IMolecularAssayControlRuleService';
export { mockReportPartService as reportPartService, onReportPartsChanged } from './reportParts/mockReportPartService';
export { mockLabelLayoutService as labelLayoutService } from './labelDesigner/mockLabelLayoutService';
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
export { mockBillingDeficiencyService as billingDeficiencyService } from './billing/mockBillingDeficiencyService';
export { mockOutboundChargeQueueService as outboundChargeQueueService } from './billing/mockOutboundChargeQueueService';
export { mockCodeReviewPoolService as codeReviewPoolService } from './billing/mockCodeReviewPoolService';
export { mockReasonDictionaryService as reasonDictionaryService } from './reasons/mockReasonDictionaryService';
export { roleCapabilityChangeAudit, roleCapabilityProblem } from './authorization/roleCapabilityRules';
// Batch 536: the Superadmin role's capabilities (all but SUPERADMIN_WITHHELD).
export { SUPERADMIN_CAPABILITY_KEYS } from './authorization/capabilitySeeds';

// Batch 371: the governing-body settings screen took this service directly as a mock.
export { mockGoverningBodyService as governingBodyService } from './governingBodies/mockGoverningBodyService';

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
  type ScreenId, type HubId, type HomeTileId, type WorklistView, type IScreenAccessService,
} from './screens/screenAccess';

// Batch 375: services the Worklist page used by their mock file paths.
export { mockExternalResourceService as externalResourceService } from './externalResources/mockExternalResourceService';
export { mockWsiScanBatchService as wsiScanBatchService } from './digitalPathology/mockWsiScanBatchService';
export { mockAiScreeningResultService as aiScreeningResultService } from './digitalPathology/mockAiScreeningResultService';
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
export { mockIntraopCriticalResultService as intraopCriticalResultService, INTRAOP_CRITICAL_RESULTS_NOT_PERMITTED } from './intraop/mockIntraopCriticalResultService';
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
export { mockClinicalHistoryDictionaryService as clinicalHistoryDictionaryService } from './clinicalHistory/mockClinicalHistoryDictionaryService';
export { mockAccessionOutboundQueueService as accessionOutboundQueueService } from './accessioning/mockAccessionOutboundQueueService';
export { mockMolecularOrderOutboundQueueService as molecularOrderOutboundQueueService } from './molecularOrders/mockMolecularOrderOutboundQueueService';
export { queueEntriesNewestFirst, isMolecularOrderPayload } from './molecularOrders/orderQueueView';
// Batch 467: the in-house molecular order engine (spec "In-House Molecular Order Queue & Plate Binding Engine").
export { molecularOrderEngine, simulateMolecularRunResults, simulateSendOutResult } from './molecularOrders/molecularOrderEngineLive';
export { molecularRoutingChoices } from './molecularOrders/molecularRouting';
export { MOLECULAR_ORDER_STATUS_HUE } from './molecularOrders/molecularOrderTypes';
export { mockInterfaceEngineService as interfaceEngineService } from './interfaceEngine/mockInterfaceEngineService';
export { mockEncounterService as encounterService } from './encounters/mockEncounterService';
export { mockCaseMaskService as caseMaskService } from './caseRegistry/mockCaseMaskService';
export { mockMasterPaymentTypeService as masterPaymentTypeService } from './billing/mockMasterPaymentTypeService';
export { mockJurisdictionPaymentMappingService as jurisdictionPaymentMappingService } from './billing/mockJurisdictionPaymentMappingService';

// Batch 378: completing grossing, checked against the Grossing field requirements.
export {
  completeGrossing, missingGrossingItems, canCompleteGrossingFrom, blockGrossingFieldsMissing,
  type MissingGrossingItem, type CompleteGrossingResult,
} from './grossing/grossingCompletion';


// Batch 409: the Cytology Workspace's services, so its pages use @/services (deployment-neutral UI).
export { mockCytologyInstrumentationService as cytologyInstrumentationService } from './cytology/mockCytologyInstrumentationService';
export { mockCytologyNomenclatureSettingsService as cytologyNomenclatureSettingsService } from './cytology/mockCytologyNomenclatureSettingsService';
export { mockCytologyQcSettingsService as cytologyQcSettingsService } from './cytology/mockCytologyQcSettingsService';
export { mockCytologyRegistryOutboundQueueService as cytologyRegistryOutboundQueueService } from './cytology/mockCytologyRegistryOutboundQueueService';
export { mockCytologyReviewRecordService as cytologyReviewRecordService } from './cytology/mockCytologyReviewRecordService';
export { mockCytologyRoutingSettingsService as cytologyRoutingSettingsService } from './cytology/mockCytologyRoutingSettingsService';
export { mockCytologyScreeningStrategyService as cytologyScreeningStrategyService } from './cytology/mockCytologyScreeningStrategyService';
export { mockCytologySignOutRecordService as cytologySignOutRecordService } from './cytology/mockCytologySignOutRecordService';
export { mockCytologyWorkloadCapSettingsService as cytologyWorkloadCapSettingsService } from './cytology/mockCytologyWorkloadCapSettingsService';
export { mockCytologyWorkloadLedgerService as cytologyWorkloadLedgerService } from './cytology/mockCytologyWorkloadLedgerService';
export { mockFacilityCytologyInstrumentationOverrideService as facilityCytologyInstrumentationOverrideService } from './cytology/mockFacilityCytologyInstrumentationOverrideService';
export { mockFacilityCytologyNomenclatureOverrideService as facilityCytologyNomenclatureOverrideService } from './cytology/mockFacilityCytologyNomenclatureOverrideService';
export { mockFacilityCytologyQcOverrideService as facilityCytologyQcOverrideService } from './cytology/mockFacilityCytologyQcOverrideService';
export { mockFacilityCytologyRoutingOverrideService as facilityCytologyRoutingOverrideService } from './cytology/mockFacilityCytologyRoutingOverrideService';
export { mockFacilityCytologyScreeningStrategyOverrideService as facilityCytologyScreeningStrategyOverrideService } from './cytology/mockFacilityCytologyScreeningStrategyOverrideService';
export { mockFacilityCytologyWorkloadCapOverrideService as facilityCytologyWorkloadCapOverrideService } from './cytology/mockFacilityCytologyWorkloadCapOverrideService';
export { mockFacilityRegistryOverrideService as facilityRegistryOverrideService } from './facilities/mockFacilityRegistryOverrideService';
export { mockPathologyLexiconService as pathologyLexiconService } from './cytology/mockPathologyLexiconService';
export { mockRegistrySettingsService as registrySettingsService } from './facilities/mockRegistrySettingsService';
// Batch 414: the screening registry engine's per-registry configuration and its permissioned saves.
export { mockScreeningRegistryConfigService as screeningRegistryConfigService } from './screeningRegistry/mockScreeningRegistryConfigService';
export { saveEnterpriseScreeningRegistry, saveFacilityScreeningRegistry, saveScreeningRegistryConfig } from './screeningRegistry/saveScreeningRegistrySettings';
export { screeningRegistrySettingsDeps } from './screeningRegistry/screeningRegistrySettingsDeps';
// Batch 415: the CLIA workload cap and CAP 5-year lookback as switchable features.
export { mockCytologyComplianceFeaturesService as cytologyComplianceFeaturesService } from './cytology/mockCytologyComplianceFeaturesService';
export { saveCytologyComplianceFeatures } from './cytology/saveCytologyComplianceFeatures';
export { cytologyComplianceSaveDeps } from './cytology/cytologyComplianceSaveDeps';
// Batch 422: cancer registry settings, read and saved with config:cancer-registry:manage.
export { mockCancerRegistrySettingsService as cancerRegistrySettingsService } from './cancerRegistry/mockCancerRegistrySettingsService';
export { mockFacilityCancerRegistryOverrideService as facilityCancerRegistryOverrideService } from './cancerRegistry/mockFacilityCancerRegistryOverrideService';
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
export { mockSnomedCervicalHistologySeverityMappingService as snomedCervicalHistologySeverityMappingService } from './cytology/mockSnomedCervicalHistologySeverityMappingService';
export { mockStaffCytologyQcOverrideService as staffCytologyQcOverrideService } from './cytology/mockStaffCytologyQcOverrideService';
export { mockStaffCytologyWorkloadCapOverrideService as staffCytologyWorkloadCapOverrideService } from './cytology/mockStaffCytologyWorkloadCapOverrideService';
export { claimPoolCase, acceptPoolCase, passPoolCase } from './cases/mockCaseService';
// Batch 572: cases another tab changed (the demo's stand-in for the hub's caseReport topic).
export { subscribeCasesChangedElsewhere } from './cases/mockCaseService';
// Batch 572 (F7, option C): screening hours and their end-of-day sign-off.
export { mockCytologyScreeningHoursService as cytologyScreeningHoursService } from './cytology/mockCytologyScreeningHoursService';
export type { ScreeningHoursDay, ScreeningHoursCurrentDays } from './cytology/ICytologyScreeningHoursService';
export { signOffProblem, isCorrection, isSignOffStale, showScreeningHoursPanel, SCREENING_HOURS_FLAG_TOLERANCE_HOURS, screeningDay } from './cytology/screeningHoursRules';
export { signOutCytologyCase, type CytologySignOutOutcome, type CytologySignOutInput } from './cytology/signOutCytologyCase';
export { signOutCytologyCaseDeps, cytologyPreliminaryDeps } from './cytology/signOutCytologyCaseDeps';
// Batch 533: urgent cytology preliminary reports.
export { releaseCytologyPreliminary, preliminarySignatureRequired, cytologyPreliminaryBlock, cytologyPreliminariesFor, type CytologyPreliminaryOutcome } from './cytology/releaseCytologyPreliminary';
export { CYTOLOGY_PRELIMINARY_REASONS, type CytologyPreliminaryReason } from './cytology/cytologyPreliminaryReasons';
export { saveCaseTeam, caseTeamUpdates, withAssigneeOnTeam, type SaveCaseTeamResult } from './cases/saveCaseTeam';
export { caseTeamSaveDeps } from './cases/caseTeamSaveDeps';
export { mockQaTrendPolicyService as qaTrendPolicyService } from './quality/mockQaTrendPolicyService';
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
export { mockSurgicalPeerReviewRiskWeightService as surgicalPeerReviewRiskWeightService } from './quality/mockSurgicalPeerReviewRiskWeightService';
// Batch 444: the System Info AI check asks the proxy; no key in the browser.
export { checkAiProxyStatus, AI_PROXY_STATUS_ROUTES, type AiProxyStatus } from './aiIntegration/aiProxyStatus';
// Batch 445: the report page's unsaved-change sections, as ids the dialog translates.
export { DIRTY_SECTION_IDS, dirtySectionList, type DirtySectionId } from './reportEditing/dirtySections';
export { sequenceCaseReports, type SequencedCase } from './reportEditing/reportSequence';
// Batch 446: case pages are addressed by support reference, never by accession.
export { CASE_ADDRESS_VIEWS, isCaseAddressReference, createCaseAddresses, type CaseView, type CaseAddresses, type CaseIdFromAddress } from './caseAddresses/caseAddresses';
export { caseAddresses } from './caseAddresses/caseAddressesInstance';
// Batch 447: the QA feedback button and recipients, a Configuration setting.
export { mockFeedbackSettingsService as feedbackSettingsService, FEEDBACK_SETTINGS_STORAGE_KEY, type IFeedbackSettingsService } from './feedback/mockFeedbackSettingsService';
export { qaButtonShown, parseEmailList, feedbackSettingsProblem, QA_BUTTON_MODES, DEFAULT_FEEDBACK_SETTINGS, type FeedbackSettings, type QaButtonMode, type FeedbackSettingsProblem } from './feedback/feedbackSettingsRules';
export { deploymentInstance, type InstanceRole } from './deployment/deploymentInstance';
// Batch 448: staff sign-in passwords set from the Staff screen.
export { staffPasswordService } from './signIn';
export { STAFF_PASSWORD_STORAGE_KEY, type IStaffPasswordService, type StaffPasswordStatus, type StaffPasswordCheck, type StaffPasswordError } from './staffPasswords/mockStaffPasswordService';
export { passwordPolicyProblem, passwordConfirmProblem, staffPasswordState, PASSWORD_MIN_LENGTH, type StaffPasswordState } from './staffPasswords/staffPasswordRules';
// Batch 456: the sign-in lockout.
export { signInRefusalNotice, SIGN_IN_LOCK_POLICY, SIGN_IN_LOCK_STORAGE_KEY, type SignInRefusal } from './auth/signInLockout';
// Batch 454: follow-up tracking (overdue cytology and surgical follow-ups, the lab's dispositions and clinician emails).
export { loadFollowUpItems, loadFollowUpCaseIdsForUser, sendFollowUpAlertsLive, markFollowUpExpectedLive, loadFollowUpMarkOffer, markFollowUpExpectedAfterSignOutLive, recordFollowUpDispositionLive, reopenFollowUpLive, draftFollowUpClinicianEmailLive, emailOrderingClinicianLive, type LoadedFollowUps } from './followUp/followUpLive';
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
// Batch 460: the billing review panel's changes, shared by the report page, the Cytology Workspace and Microtomy.
export { recordCaseCharge, recordCaseCredit, recordCaseCodeCorrection, enforceBillingReview, auditBillingSuggestionDeclined, billingSourceLabel, caseBillingChargeDeps, type CaseBillingChargeDeps, type CaseChargeOutcome } from './billing/caseBillingCharges';
export { codingWithApproved, codingWithRejected, codingWithOverride, codingWithoutCode, codingWithCorrection, groupApprovalsByUnit, specimensWithBaseCodeAdded, specimensWithBaseCodeRemoved, specimensWithBaseCodeCorrected, specimensWithMatrixCode, matrixSlidesWithEvaluatedCores, type BillingApprovalItem, type UnitCoding } from './billing/caseBillingCoding';
export { enforceAppliedCodeCorrection } from './billing/correctServiceCharge';
export { isCaseSignedOutForBilling } from './billing/isCaseSignedOutForBilling';
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
export { mockTumorBoardService as tumorBoardService } from './tumorBoard/mockTumorBoardService';
export { TUMOR_BOARD_NAMES, TUMOR_BOARD_CASE_STATUSES, TUMOR_BOARD_SOURCES, type TumorBoardName, type TumorBoardCaseStatus, type TumorBoardSource, type TumorBoardListing, type TumorBoardListingFilter, type NewTumorBoardListing, type TumorBoardListingUpdate, type ITumorBoardService } from './tumorBoard/ITumorBoardService';

// ─── Batch 506 (PS-477) ──────────────────────────────────────────────────────
// What the screens used to import straight from mock files. With these here,
// no screen imports a mock service (deploymentReadiness.guard.test.ts), so
// Stage 2 swaps each line for its HTTP service without touching a screen.
export { MAX_INTERVAL_MINUTES, MIN_INTERVAL_MINUTES, mockAssistPollingService as assistPollingService } from './assistPolling/mockAssistPollingService';
export { mockBillingTypeTriggerConfigService as billingTypeTriggerConfigService } from './billing/mockBillingTypeTriggerConfigService';
export type { BillingTypeTriggerMap } from './billing/mockBillingTypeTriggerConfigService';
export { findSimilarCases, recordAiFeedback, saveReportSuggestions } from './cases/mockCaseService';
export { mockOnDemandCaseFetchService as onDemandCaseFetchService } from './cases/mockOnDemandCaseFetchService';
export { mockCassetteRoutingRuleService as cassetteRoutingRuleService } from './cassetteRouting/mockCassetteRoutingRuleService';
export { mockCriticalAlertDispatchService as criticalAlertDispatchService } from './clinical/mockCriticalAlertDispatchService';
export { mockNonGynCytologyCategoryService as nonGynCytologyCategoryService } from './cytology/mockNonGynCytologyCategoryService';
export { mockDeliveryRuleService as deliveryRuleService } from './delivery/mockDeliveryRuleService';
// Batch 521 (PS-281): delivery retries and the delivery exception queue.
export { mockDeliveryRetrySettingsService as deliveryRetrySettingsService } from './delivery/mockDeliveryRetrySettingsService';
export { mockDeliveryRetryService as deliveryRetryService } from './delivery/mockDeliveryRetryService';
export { deliveryExceptions } from './delivery/deliveryRetries';
export { parseRetryDelays, retrySettingsProblem, DEFAULT_RETRY_DELAYS_MINUTES } from './delivery/deliveryRetryPolicy';
export { mockDpVendorService as dpVendorService } from './digitalPathology/mockDpVendorService';
export { mockWsiViewerVendorService as wsiViewerVendorService } from './digitalPathology/mockWsiViewerVendorService';
export { mockDraftCacheService as draftCacheService } from './drafts/mockDraftCacheService';
export { mockDisplayProfileService as displayProfileService } from './facilityOpsDashboard/mockDisplayProfileService';
export { mockGrossImagingVendorService as grossImagingVendorService } from './imageAssociation/mockGrossImagingVendorService';
export { mockImageManagementSystemVendorService as imageManagementSystemVendorService } from './imageAssociation/mockImageManagementSystemVendorService';
export { mockImageUploadService as imageUploadService } from './imageAssociation/mockImageUploadService';
export { mockLisStagingQueueService as lisStagingQueueService } from './lisIngestion/mockLisStagingQueueService';
export { mockMigrationFieldMappingService as migrationFieldMappingService } from './migration/mockMigrationFieldMappingService';
export { getMockInterfaceEngineSettings, setMockInterfaceEngineSettings } from './mockInterfaceEngine/mockInterfaceEngineSettings';
export type { MockInterfaceEngineMode, MockInterfaceEngineSettings } from './mockInterfaceEngine/mockInterfaceEngineSettings';
export { mockModelStoreService as modelStoreService } from './models/mockModelStoreService';
export type { StoreListing } from './models/mockModelStoreService';
export { mockNarrativeSignalService as narrativeSignalService } from './narrativeSignals/mockNarrativeSignalService';
export { mockOutboundPatientAdtQueueService as outboundPatientAdtQueueService } from './patients/mockOutboundPatientAdtQueueService';
export { mockPrintRoutingRuleService as printRoutingRuleService } from './printRouting/mockPrintRoutingRuleService';
export { mockPrintQueueService as printQueueService } from './printing/mockPrintQueueService';
export { ABNORMAL_FINDING_CONFIRMATION_ACTIVITY_TYPE_ID } from './quality/mockQaActivityTypeService';
export { FPPE_ACTIVITY_TYPE_ID } from './quality/mockQaSupervisionAssignmentService';
export { mockOutboundLisSyncQueueService as outboundLisSyncQueueService } from './reports/mockOutboundLisSyncQueueService';
export { mockOutboundResultQueueService as outboundResultQueueService } from './reports/mockOutboundResultQueueService';
export { ALLOWED_HOSTS, isAllowedUrl, mockResearchFeedConfigService as researchFeedConfigService } from './research/mockResearchFeedConfigService';
export { buildRoutingRuleMap, mockRoutingRuleService as routingRuleService } from './routingRules/mockRoutingRuleService';
export { mockSessionTimeoutService as sessionTimeoutService } from './session/mockSessionTimeoutService';
export { mockValidationStudyService as validationStudyService } from './validationStudies/mockValidationStudyService';
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

// Batch 518 (PS-123): batch label reprint (label:batch:reprint).
export {
  casesForReprint, reprintItems, reprintLabels, retryFailedLabels, reprintSummary, REPRINT_LABEL_KINDS,
  type ReprintLabelKind, type ReprintCaseFilter, type ReprintItem, type LabelReprintRun, type ReprintRefusal,
} from './labels/batchLabelReprint';
export { batchLabelReprintDeps } from './labels/batchLabelReprintDeps';
export { mockLabelReprintRunService as labelReprintRunService } from './labels/mockLabelReprintRunService';

// Batch 538 (Pete, Oct 12): released report documents, stored once with their SHA-256 and sent as is.
// Batch 556: with the API server, documents are read through it too (reportDocumentInstance.ts).
export { reportDocumentService } from './reportDocuments/reportDocumentInstance';
export { sentDocumentProblem, type SentDocumentProblem } from './reportDocuments/reportDocumentService';
export { shortHash, pdfSha256, type ReportDocument, type ReportDocumentProducer } from './reportDocuments/reportDocuments';
