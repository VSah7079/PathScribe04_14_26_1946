// src/services/marginExtraction/IMarginExtractionService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 490. Persists what marginDistanceExtraction.ts's pure parser finds
// when it's run over one workup's free-text margin-distance fields:
//   - A confident parse becomes a MarginShadowAttribute — a normalized,
//     hidden numeric distance (mm) alongside the pathologist's own
//     free-text answer, never shown or editable in the report itself.
//     This is what a later rule evaluator (Batch 491) reads instead of
//     parsing free text on its own.
//   - An unconfident parse opens a MarginExtractionException — Pete's own
//     "Explicit Fallback/Review Flags" queue — so a human tags the real
//     distance by hand rather than a rule silently misfiring (or not
//     firing) on text it couldn't read.
// At most one shadow attribute and one exception per (caseId, instanceId,
// fieldId): re-running extraction (e.g. the pathologist edits the answer
// before signing) upserts the attribute and clears/updates the exception,
// it never piles up duplicates for the same field.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';
import type { MarginDistanceApprox } from './marginDistanceExtraction';

export interface MarginShadowAttribute {
  id: ID;
  caseId: string;
  instanceId: string;
  fieldId: string;
  fieldLabel: string;
  valueMm: number;
  approx: MarginDistanceApprox;
  rawText: string;
  extractedAt: string;
}

export const MARGIN_EXCEPTION_STATUSES = ['Pending', 'Resolved', 'Dismissed'] as const;
export type MarginExceptionStatus = typeof MARGIN_EXCEPTION_STATUSES[number];

export interface MarginExtractionException {
  id: ID;
  caseId: string;
  instanceId: string;
  fieldId: string;
  fieldLabel: string;
  rawText: string;
  /** Why the parser didn't trust it — see MarginExtractionFailureReason. */
  reason: string;
  status: MarginExceptionStatus;
  resolvedValueMm?: number;
  /** Set only when dismissed with no numeric tag — the original parse-failure `reason` above is kept either way. */
  dismissReason?: string;
  resolvedByUserId?: string;
  resolvedByUserName?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface MarginExtractionFieldLike {
  id: string;
  label: string;
  type: string;
}

export interface ExtractAndStoreInput {
  caseId: string;
  instanceId: string;
  /** The workup's template fields — only the free-text margin-distance ones
   *  (isMarginDistanceTextField) are extracted; everything else is ignored. */
  fields: MarginExtractionFieldLike[];
  answers: Record<string, string | string[]>;
}

export interface ExtractionRunResult {
  stored: MarginShadowAttribute[];
  exceptions: MarginExtractionException[];
}

export interface MarginExtractionExceptionFilter {
  caseId?: string;
  status?: MarginExceptionStatus;
}

export interface IMarginExtractionService {
  /** Runs the extraction layer over one workup and persists the result (see file header). */
  extractAndStore(input: ExtractAndStoreInput): Promise<ServiceResult<ExtractionRunResult>>;
  getShadowAttributesForCase(caseId: string): Promise<ServiceResult<MarginShadowAttribute[]>>;
  getShadowAttribute(caseId: string, instanceId: string, fieldId: string): Promise<ServiceResult<MarginShadowAttribute | null>>;
  listExceptions(filter?: MarginExtractionExceptionFilter): Promise<ServiceResult<MarginExtractionException[]>>;
  /** Manually tags the real distance for an exception a rule would otherwise skip. Protected (case:margin-exception:resolve). */
  resolveException(id: ID, valueMm: number, byUserId: string, byUserName: string): Promise<ServiceResult<MarginExtractionException>>;
  /** Closes an exception with no numeric tag (e.g. the field genuinely has no distance to give). Protected (case:margin-exception:resolve). */
  dismissException(id: ID, reason: string, byUserId: string, byUserName: string): Promise<ServiceResult<MarginExtractionException>>;
}
