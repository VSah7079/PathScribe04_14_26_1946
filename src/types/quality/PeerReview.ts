// src/types/quality/PeerReview.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 (Batch 439): independent peer review before sign-out.
//
// Pete (Oct 2):
//   • Triggered by a first-time malignancy, judged from the patient's prior
//     cases. A pathologist can also ask for one on any case.
//   • The reviewer is a different pathologist from the one signing out.
//   • A disagreement resolved by consensus recommends no CAPA; an
//     unresolved one recommends a CAPA (the QA lead confirms or dismisses).
//   • The sign-out gate is configurable per facility or department
//     (subspecialty) and off by default.
//
// A request never changes who owns the case (unlike a delegation): the
// reviewer reads and records, the primary pathologist still signs out.
// ─────────────────────────────────────────────────────────────────────────────

import type { QaDiscordanceSeverity } from './QaActivityRecord';

export interface PersonRef { userId: string; userName: string }

/** Why a peer review was asked for. */
export type PeerReviewTrigger = 'first-time-malignancy' | 'requested';

/**
 * pending      — waiting for the reviewer's independent read.
 * disagreement — the reviewer disagreed; the two pathologists are working
 *                towards consensus (third opinion, multi-head, outside expert).
 * completed    — agreed, consensus reached, or recorded as unresolved.
 * withdrawn    — the requester withdrew it before a read (reason kept).
 */
export type PeerReviewStatus = 'pending' | 'disagreement' | 'completed' | 'withdrawn';

/** How a completed review ended. */
export type PeerReviewResult = 'concordant' | 'consensus-reached' | 'unresolved';

export interface PeerReviewRequest {
  id: string;
  caseId: string;
  /** Display only (data-phi on screen). */
  accession?: string;
  trigger: PeerReviewTrigger;
  /** Why the trigger fired, in literal English (audit text). */
  triggerDetail?: string;
  primaryPathologist: PersonRef;
  reviewer: PersonRef;
  status: PeerReviewStatus;
  requestedAt: string;
  note?: string;

  /** The reviewer's own, independent read. */
  reviewerAgrees?: boolean;
  reviewerDiagnosis?: string;
  reviewerNotes?: string;
  /** How far apart the two reads are, when they disagree. */
  disagreementSeverity?: QaDiscordanceSeverity;
  reviewedAt?: string;

  result?: PeerReviewResult;
  /** The diagnosis both agreed to issue (consensus reached). */
  consensusDiagnosis?: string;
  /** How it was resolved, or why it could not be. */
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedBy?: PersonRef;

  withdrawnReason?: string;
  /** The QaActivityRecord written when the review completed. */
  qaRecordId?: string;
}

/** Why a pathologist signs out before the review is complete (gate on). */
export type PeerReviewOverrideReason = 'immediate-surgery' | 'immediate-treatment' | 'other-urgent-care';

export interface PeerReviewOverride {
  id: string;
  caseId: string;
  reason: PeerReviewOverrideReason;
  note?: string;
  by: PersonRef;
  at: string;
  /** The review is still owed: due 24 hours after the override. */
  retrospectiveDueAt: string;
}

/**
 * Where the sign-out gate is on. Most specific wins: a subspecialty
 * (department) setting, then the facility's (keyed by performing lab, the
 * lab that signs the case out), then the organisation's default, which
 * starts off.
 */
export interface PeerReviewGateSettings {
  orgDefault: boolean;
  facilities: Record<string, boolean>;
  subspecialties: Record<string, boolean>;
}
