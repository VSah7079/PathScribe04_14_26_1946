// src/types/quality/CapaRecommendation.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 to PS-148 (Batch 438). Pete (Oct 2): PathScribe recommends a CAPA;
// it never opens one by itself. A qualifying event creates a pending
// recommendation in the QA lead's queue (Quality Assurance → CAPA →
// Recommended). Confirming opens the CAPA (an open deficiency of the
// recommendation's type) and assigns it; dismissing needs a reason. Both are
// audited. One engine serves every trigger.
// ─────────────────────────────────────────────────────────────────────────────

/** What raised the recommendation. */
export type CapaRecommendationSource =
  /** A QA review with an outcome found a discordance its activity type's capaTriggerRule names (PS-134 mechanism). */
  | 'qa-discordance'
  /** PS-148: a major discordance found after sign-out (retrospective peer review / audit, outside consult). */
  | 'post-signout-discordance'
  /** PS-146: an amendment or correction whose reason the lab marks clinically significant. */
  | 'clinical-correction'
  /** PS-145: the microscopic finding contradicts the pre-op or frozen-section impression (detection: Batch 439). */
  | 'clinical-mismatch'
  /** PS-144: a pre-sign-out peer review disagreement that reached no consensus (workflow: Batch 439). */
  | 'unresolved-disagreement';

export type CapaRecommendationStatus =
  | 'pending'
  | 'confirmed'
  | 'dismissed';

/** A later event about the same problem, recorded on the recommendation instead of a second one. */
export interface CapaLinkedEvent {
  source: CapaRecommendationSource;
  sourceRecordId: string;
  summary: string;
  at: string;
}

export interface CapaRecommendation {
  id: string;
  caseId: string;
  specimenId?: string | null;
  source: CapaRecommendationSource;
  /** The deficiency type the CAPA opens as, when confirmed. */
  deficiencyTypeId: string;
  /** The record that raised it: a QA activity record, an amendment. */
  sourceRecordId: string;
  /** Literal English, no patient identifiers (audit posture). */
  summary: string;
  severity?: 'low' | 'medium' | 'high';
  /** Carried onto the CAPA when confirmed (PS-119). */
  rootCause?: string;
  status: CapaRecommendationStatus;
  createdAt: string;
  /** 'system', or the person whose action raised it. */
  createdBy: string;
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: string;
  /** Required to dismiss. */
  dismissReason?: string;
  /** Who owns the CAPA, chosen when confirming. */
  assignedTo?: string;
  assignedToName?: string;
  /** The CAPA (deficiency) opened on confirmation. */
  deficiencyId?: string;
  /** PS-148: later events about the same problem (e.g. the correction that followed). */
  linkedEvents?: CapaLinkedEvent[];
}

/** What a trigger hands the engine. */
export type CapaRecommendationInput = Pick<CapaRecommendation,
  'caseId' | 'specimenId' | 'source' | 'deficiencyTypeId' | 'sourceRecordId' | 'summary' | 'severity' | 'rootCause' | 'createdBy'>;
