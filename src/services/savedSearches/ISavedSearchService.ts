import { ServiceResult, ID } from '../types';
import type { CaseSearchDraft } from '../caseSearch/caseSearchTypes';
import type { CaseReportDefinition } from '../caseReports/caseReportDefinition';

// ─── Filter shapes per context ────────────────────────────────────────────────

export interface WorklistFilters {
  status?: string[];           // e.g. ['Active', 'On Hold']
  assignedTo?: string[];       // userIds
  subspecialtyIds?: string[];
  dateRange?: { from: string; to: string };
  priority?: string[];
  flagIds?: string[];
}

/**
 * Batch 350: a saved search from the Search page stores the page's whole
 * draft (services/caseSearch/caseSearchTypes.ts), so loading it restores
 * every filter, including facility and specimen flags, which the page's
 * old browser-only saved searches dropped. The older, never-used shape
 * (query, diagnosisContains, subspecialtyIds …) is retired.
 */
export type CaseSearchFilters = CaseSearchDraft;

/** Not used by any screen yet. */
export interface RefinedSearchFilters {
  query?: string;
  patientName?: string;
  accessionNumber?: string;
  dateRange?: { from: string; to: string };
  diagnosisContains?: string;
  subspecialtyIds?: string[];
  assignedTo?: string[];
  status?: string[];
  snomedCodes?: string[];
  icdCodes?: string[];
  specimenTypes?: string[];
  physicianIds?: string[];
  facilityIds?: string[];
  hasFlag?: string[];
  minConfidenceScore?: number;
}

/** Batch 613: 'caseReport' saves a report definition (a search plus its grouping and columns). */
export type SearchContext = 'worklist' | 'caseSearch' | 'refinedSearch' | 'caseReport';

export type SearchFilters =
  | WorklistFilters
  | CaseSearchFilters
  | CaseReportDefinition
  | RefinedSearchFilters;

export interface SavedSearch {
  id: ID;
  userId: string;
  name: string;
  context: SearchContext;
  filters: SearchFilters;
  createdAt: string;
  lastUsedAt?: string;
  useCount: number;
}

export interface ISavedSearchService {
  getForUser(userId: string): Promise<ServiceResult<SavedSearch[]>>;
  getForUserByContext(userId: string, context: SearchContext): Promise<ServiceResult<SavedSearch[]>>;
  save(search: Omit<SavedSearch, 'id' | 'createdAt' | 'useCount'>): Promise<ServiceResult<SavedSearch>>;
  rename(id: ID, name: string): Promise<ServiceResult<SavedSearch>>;
  delete(id: ID): Promise<ServiceResult<void>>;
  recordUse(id: ID): Promise<ServiceResult<SavedSearch>>;
}
