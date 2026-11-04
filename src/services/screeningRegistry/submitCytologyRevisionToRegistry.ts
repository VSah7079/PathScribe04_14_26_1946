// src/services/screeningRegistry/submitCytologyRevisionToRegistry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 419 (Registry Engine SRS v2.1, FR-008.4). After a cytology correction
// or addendum is released, the registry gets the new version of the result:
// CORRECTION (the diagnosis changed) or AMENDMENT (an addendum), linked to the
// first submission by its master transaction id. Before Batch 419 a registry
// only ever saw the first sign-out. Same rules as a sign-out
// (submitScreeningRegistryResult.ts): consent, eligibility, holds.
//
// For an addendum the coded result is the one it adds to (the addendum's
// sign-out record keeps that review id); for a correction it is the corrected
// review.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { CytologyCategoryEntry } from '../cytology/ICytologyCategoryService';
import { submitScreeningRegistryResult, type ScreeningRegistrySubmitDeps, type ScreeningRegistrySubmitOutcome } from './submitScreeningRegistryResult';

type Result<T> = { ok: true; data: T } | { ok: false; error?: string };

export interface CytologyRevisionRegistryDeps extends ScreeningRegistrySubmitDeps {
  getCaseSignOutRecords: (caseId: string) => Promise<Result<CytologySignOutRecord[]>>;
  getCaseReviews: (caseId: string) => Promise<Result<CytologyReviewRecord[]>>;
}

export async function submitCytologyRevisionToRegistry(
  input: { caseData: any; signOutRecordId: string; kind: 'correction' | 'addendum'; isGynCytology: boolean; categories: CytologyCategoryEntry[] },
  deps: CytologyRevisionRegistryDeps,
): Promise<ScreeningRegistrySubmitOutcome | { outcome: 'recordNotFound' }> {
  const [records, reviews] = await Promise.all([deps.getCaseSignOutRecords(input.caseData.id), deps.getCaseReviews(input.caseData.id)]);
  const record = records.ok ? records.data.find(r => r.id === input.signOutRecordId) : undefined;
  const review = record && reviews.ok ? reviews.data.find(r => r.id === record.reviewRecordId) : undefined;
  if (!record || !review) return { outcome: 'recordNotFound' };
  return submitScreeningRegistryResult({
    caseData: input.caseData, record, review, categories: input.categories, isGynCytology: input.isGynCytology, kind: input.kind,
  }, deps);
}
