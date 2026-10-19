// src/services/caseReports/caseReportStore.ts
// Batch 613: the signed-in user's saved report definitions, on the saved-search service.
import { savedSearchService } from '../savedSearches/savedSearchServiceInstance';
import { readSessionProfile } from '../auth/sessionProfile';
import { createSavedCaseReports } from './savedCaseReports';

export const caseReportsStore = createSavedCaseReports(savedSearchService, () => readSessionProfile()?.id);
