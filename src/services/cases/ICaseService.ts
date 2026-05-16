// src/services/cases/ICaseService.ts
// -------------------------------------------------------------
// Contract for all Case service implementations.
// The UI depends ONLY on this interface.
// -------------------------------------------------------------

import { Case } from "../../types/case/Case";
import type { ServiceResult } from '../types';

// ── Case status ───────────────────────────────────────────────
export type CaseStatus =
  | 'pending'
  | 'in_progress'
  | 'pending_review'
  | 'finalized'
  | 'on_hold'
  | 'archived';

// ── Case priority ─────────────────────────────────────────────
export type CasePriority = 'routine' | 'urgent' | 'stat';

// ── AI processing status ──────────────────────────────────────
export type AIStatus = 'none' | 'pending' | 'processing' | 'complete' | 'error';

// ── Flag color ────────────────────────────────────────────────
export type FlagColor = 'red' | 'amber' | 'green' | 'blue' | 'grey';

// ── Case gender ───────────────────────────────────────────────
export type CaseGender = 'male' | 'female' | 'other' | 'unknown';

// ── Flag instance (case-attached) ────────────────────────────
// Distinct from IFlagService.Flag (the flag definition).
// This represents a flag applied to a specific case or specimen.
export interface Flag {
  id:          string;
  definitionId: string;
  name:        string;
  lisCode:     string;
  level:       'case' | 'specimen';
  severity:    1 | 2 | 3 | 4 | 5;
  active:      boolean;
  specimenId?: string | null;
  createdAt:   string;
}

// ── PathologyCase — UI representation ────────────────────────
// Extends Case with worklist-specific computed fields.
export type PathologyCase = Case & {
  priority?:      CasePriority;
  aiStatus?:      AIStatus;
  caseFlags?:     Flag[];
  specimenFlags?: Flag[];
};

// ── Filter params ─────────────────────────────────────────────
export interface CaseFilterParams {
  userId?:       string;
  status?:       CaseStatus | CaseStatus[];
 
  priority?:     CasePriority;
 
  aiStatus?:     AIStatus;
  search?:       string;
  dateFrom?:     string;
  dateTo?:       string;
  specialty?:    string;
  subspecialty?: string;

  limit?:        number;
  offset?:       number;
  
  patientName?:   string;
hospitalId?:    string;
accessionNo?:   string;
diagnosisList?: string[];
specimenList?:  string[];
snomedCodes?:   string[];
icdCodes?:      string[];
statusList?:    CaseStatus[];
priorityList?:  CasePriority[];
genderList?:    CaseGender[];
dobFrom?:       string;
dobTo?:         string;
ageMin?:        number;
ageMax?:        number;
  
}

// ── Service interface ─────────────────────────────────────────
export interface ICaseService {
  /**
   * Fetch a single case by ID.
   * May return undefined if the case does not exist.
   */
  getCase(caseId: string): Promise<Case | undefined>;

  /**
   * List all cases matching filter params.
   * Used by SearchPage and admin views.
   */
  getAll(params?: CaseFilterParams): Promise<ServiceResult<PathologyCase[]>>;

  /**
   * List all cases visible to a given user.
   * Pediatric access is evaluated by the worklist using client authorization lists.
   */
  listCasesForUser(userId: string): Promise<Case[]>;

  /**
   * Update a case with partial fields.
   */
  updateCase(caseId: string, updates: Partial<Case>): Promise<void>;
}
