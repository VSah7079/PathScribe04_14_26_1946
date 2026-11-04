// src/services/apiServer/directMockImportBaseline.ts
// Batch 670: files that still import a mock service module directly instead of the
// `…Instance` that picks the server version. A ratchet: remove entries as the wiring
// steps convert them (scripts/dev/regen-direct-mock-baseline.py rewrites this file);
// directMockImports.guard.test.ts fails on a new one.
// Intentionally demo-only (no server version, by design): services/signIn.ts -> mockStaffPasswordService
// (server deployments are single sign-on only, AUTHENTICATION_MODEL.md); demoReset.ts -> seed versions.
export const DIRECT_MOCK_IMPORT_BASELINE: Readonly<Record<string, readonly string[]>> = {
  'services/assistPolling/assistPollingRuntime.ts': ['mockCaseService'],
  'services/biometric/serverBiometricFlow.ts': ['mockBiometricService'],
  'services/cases/CaseRouter.ts': ['mockOrchestratorCaseService'],
  'services/cases/caseUpdateNoticeDeps.ts': ['mockCaseService'],
  'services/cases/poolCaseActions.ts': ['mockCaseService'],
  'services/clinical/detectClinicalPathologicMismatch.ts': ['mockAiInstructionService'],
  'services/demoReset/demoReset.ts': ['mockBillingRuleService', 'mockModifierDictionaryService'],
  'services/flags/resolveLisFlagDefinition.ts': ['mockFlagService'],
  'services/followUp/followUpLive.ts': ['mockFollowUpService'],
  'services/participationTypes/saveCountryProfiles.ts': ['mockParticipationTypeService'],
  'services/physicians/applyPhysicianMasterFileUpdate.ts': ['mockPhysicianService'],
  'services/quality/biopsyResectionCorrelationSettings.ts': ['mockCytologyHistologyCorrelationSettingsService'],
  'services/signIn.ts': ['mockStaffPasswordService'],
};
