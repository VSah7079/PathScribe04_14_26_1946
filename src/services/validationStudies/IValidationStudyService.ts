// src/services/validationStudies/IValidationStudyService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Validation Study governance workflow:
//
//   draft → pending_approval → approved → active → closed → reported
//
//   draft:            Study configured, not yet submitted for ethics review
//   pending_approval: Submitted to committee — awaiting outcome
//   approved:         Committee approved — admin can now activate
//   active:           Collecting signals — most fields locked
//   closed:           Data collection ended
//   reported:         Validation report generated
//
// Governance principle: Activation is blocked until committeeApproval is
// recorded with a valid irbReference. The system cannot enforce the real-world
// committee meeting but enforces documentation of its outcome.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';

export type StudyStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'closed'
  | 'reported';

export interface CommitteeSubmission {
  submittedAt:          string;
  submittedBy:          string;
  committeeName:        string;
  expectedReviewDate?:  string;
  notes?:               string;
}

export interface CommitteeApproval {
  approvedAt:             string;
  approvedBy:             string;
  irbReference:           string;   // required — blocks activation if missing
  committeeMinutesRef?:   string;
  conditions?:            string;
}

export interface ValidationStudy {
  id:          string;
  name:        string;
  description: string;
  status:      StudyStatus;

  // ── Scope ─────────────────────────────────────────────────────────────────
  clientIds:        string[];
  pathologistIds:   string[];
  subspecialtyIds?: string[];
  templateIds?:     string[];

  // ── Period ────────────────────────────────────────────────────────────────
  startDate:         string;
  endDate?:          string;
  targetCaseCount?:  number;

  // ── Quality thresholds ────────────────────────────────────────────────────
  targetAcceptanceRate:  number;
  targetMaxEditRatio:    number;

  // ── Governance ────────────────────────────────────────────────────────────
  principalInvestigatorId: string;
  /** Populated when study submitted to ethics/IRB committee */
  committeeSubmission?:    CommitteeSubmission;
  /** Populated when admin records committee approval — required before activation */
  committeeApproval?:      CommitteeApproval;
  /** Always 'advisory' — AI never submits directly to LIS */
  validationMode:          'advisory';

  // ── Audit ─────────────────────────────────────────────────────────────────
  createdAt:  string;
  createdBy:  string;
  updatedAt:  string;
}

export interface IValidationStudyService {
  getAll():                                                       Promise<ServiceResult<ValidationStudy[]>>;
  getActive():                                                    Promise<ServiceResult<ValidationStudy[]>>;
  getById(id: ID):                                                Promise<ServiceResult<ValidationStudy>>;
  create(study: Omit<ValidationStudy, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<ValidationStudy>>;
  update(id: ID, changes: Partial<Omit<ValidationStudy, 'id' | 'createdAt'>>): Promise<ServiceResult<ValidationStudy>>;
  /** Submit draft study to ethics/IRB committee for review */
  submitForReview(id: ID, submission: CommitteeSubmission):       Promise<ServiceResult<ValidationStudy>>;
  /** Record committee approval — required before activation */
  recordApproval(id: ID, approval: CommitteeApproval):           Promise<ServiceResult<ValidationStudy>>;
  /** Activate approved study — blocked if no committeeApproval.irbReference */
  activate(id: ID, activatedBy: string):                         Promise<ServiceResult<ValidationStudy>>;
  close(id: ID):                                                  Promise<ServiceResult<ValidationStudy>>;
  remove(id: ID):                                                 Promise<ServiceResult<void>>;
  getStudyForCase(clientId: string, pathologistId: string, subspecialtyId?: string): Promise<ServiceResult<ValidationStudy | null>>;
}
