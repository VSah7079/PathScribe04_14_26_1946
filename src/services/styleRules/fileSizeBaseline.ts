// src/services/styleRules/fileSizeBaseline.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 618 (PS-497): the length of every source file over 1,000 lines when the size guard went in
// (fileSize.guard.test.ts). The numbers only go down: a story that touches one of these files moves the part it
// changes into its own module and lowers the number. Never raise one.
// ─────────────────────────────────────────────────────────────────────────────
export const FILE_SIZE_LIMIT = 1000;

export const FILE_SIZE_BASELINE: Readonly<Record<string, number>> = {
  'components/AppShell/AppShell.tsx': 1682,
  'components/Config/Protocols/SynopticEditor.tsx': 1278,
  'components/Config/System/StainDictionarySection.tsx': 1086,
  'components/Config/System/TATConfigSection.tsx': 1049,
  'components/Editor/PathScribeEditor.tsx': 1113,
  'components/FacilityDictionary/FacilityEditorModal.tsx': 1469,
  'components/QualityAssurance/CytologyQaTab.tsx': 1177,
  'components/TemplateBuilder/TemplateAssemblyPage.tsx': 1006,
  'components/ValidationStudies/ValidationStudiesSection.tsx': 1055,
  'components/Worklist/WorklistTable.tsx': 2290,
  'constants/systemActions.ts': 1309,
  'mock/mockReports.ts': 1104,
  'pages/AccessionPage/AccessionPage.tsx': 4163,
  'pages/AuditLogPage.tsx': 1288,
  'pages/CytologyWorklistPage/CytologyScreeningPage.tsx': 1528,
  'pages/IntraopQueuePage.tsx': 1194,
  'pages/QualityAssurancePage.tsx': 1470,
  'pages/SearchPage.tsx': 1913,
  'pages/Synoptic/Codes/AddCodeModal.tsx': 1179,
  'pages/SynopticReportPage/components/BillingReviewPanel.tsx': 1316,
  'pages/SynopticReportPage/components/RightSynopticPanel.tsx': 1751,
  'pages/SynopticReportPage/hooks/useSignOutWorkflow.ts': 1747,
  'pages/SynopticReportPage/hooks/useSpecimenBlockManagement.ts': 1713,
  'pages/SynopticReportPage/modals/BlockStainEditorModal.tsx': 1437,
  'pages/SynopticReportPage/SynopticReportPage.tsx': 7058,
  'pages/WorklistPage/WorklistPage.tsx': 1291,
  'pathscribe.css': 28448,
  'services/actionRegistry/mockActionRegistryService.ts': 4189,
  'services/billing/codeMapTable.ts': 1070,
  'services/cases/mockCaseService.ts': 6020,
  'services/cases/mockOrchestratorCaseService.ts': 2001,
  'services/quality/mockQaActivityRecordService.ts': 3725,
  'types/case/Case.ts': 1059,
  'types/case/Specimen.ts': 1839, // Batch 732: the add-on exception types moved to addOnOrderException.ts; Batch 750: a comment shortened
};
