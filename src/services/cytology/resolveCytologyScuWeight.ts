// src/services/cytology/resolveCytologyScuWeight.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own CLIA 42 CFR § 493.1274 workload
// specification — the real, standard weight per review_mode: a
// standard full manual gyn screen counts as one real slide (1.0
// SCU); a liquid-based non-gyn prep or an FOV-assisted initial pass
// with no manual rescreen each count as half (0.5); an FOV pass that
// escalates into a full manual rescreen counts as one and a half
// (1.5), since real, direct guidance's own rationale is that this
// represents genuinely more real screening work than either alone;
// pathologist confirmatory review counts as zero — CLIA's own daily
// cap specifically governs cytotechnologists, not pathologists.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyReviewMode } from '@/types/cytology/CytologyReviewRecord';

export const CYTOLOGY_REVIEW_MODE_SCU_WEIGHTS: Record<CytologyReviewMode, number> = {
  primary_manual: 1.0,
  liquid_nongyn: 0.5,
  fov_assisted: 0.5,
  fov_manual_rescreen: 1.5,
  pathologist_review: 0.0,
};

export function resolveCytologyScuWeight(reviewMode: CytologyReviewMode): number {
  return CYTOLOGY_REVIEW_MODE_SCU_WEIGHTS[reviewMode];
}

/**
 * Batch 574 (review): what a save adds to the workload. A new review adds its mode's weight; an edit of an
 * existing review adds only what its new mode weighs beyond the old (an escalation, such as an imager pass
 * becoming a manual rescreen: 0.5 → 1.5 adds 1), never the slide again. Before this, every edit counted the
 * slide once more against the limit.
 */
export function resolveCytologyScuWeightAdded(existingMode: CytologyReviewMode | undefined, targetMode: CytologyReviewMode): number {
  const target = resolveCytologyScuWeight(targetMode);
  return existingMode === undefined ? target : Math.max(0, target - resolveCytologyScuWeight(existingMode));
}
