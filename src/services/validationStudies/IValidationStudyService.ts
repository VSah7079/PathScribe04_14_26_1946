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
  /** Which AI model version this study validates — required, since a
   *  study with no model reference can't answer "is model X actually
   *  safe for this client," the entire reason this field exists. See
   *  Client.internalAiModelId's own doc comment for how a PASS-graded,
   *  reported study for this exact (client, model) pair is what
   *  actually unlocks that client moving to this model in production. */
  modelId: string;

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
  /** Set by activate() — who/when a study actually went active. Added
   *  alongside fixing activate()'s unused activatedBy parameter: the
   *  method already accepted this on both the interface and
   *  implementation, but nothing ever recorded it anywhere. */
  activatedBy?: string;
  activatedAt?: string;
  /** The study's real, final outcome — set exactly once, the first time
   *  a report is generated for a closed study, and never recomputed
   *  after that even if the underlying signal data could theoretically
   *  still change. Deliberately a persisted fact, not a live-computed
   *  display value: this is what Client.internalAiModelId's hard-block
   *  enforcement checks against, and something used as real evidence
   *  for a model-adoption decision needs to be a fixed, timestamped
   *  record, not something that could drift on recalculation. */
  finalGrade?:   'PASS' | 'CONDITIONAL PASS' | 'FURTHER REVIEW';
  finalGradedAt?: string;
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
