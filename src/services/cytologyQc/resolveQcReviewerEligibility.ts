// src/services/cytologyQc/resolveQcReviewerEligibility.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per spec §2.2's own Self-Review Prevention guardrail — "the
// system enforces a strict system rule blocking the primary sign-out
// provider from being assigned as the QC reviewer." A single, real
// exclusion — kept as its own tiny, pure function rather than folded
// into the criteria matcher, since this is a hard, non-configurable
// system rule, never something an admin-defined rule could override.
// ─────────────────────────────────────────────────────────────────────────────

export function resolveQcReviewerEligibility(candidateReviewerId: string, primarySignOutProviderId: string): boolean {
  return candidateReviewerId !== primarySignOutProviderId;
}

/** Batch 608 (#50, #79): whether a reviewer belongs to a case's reviewer pool.
 *  The pool is the rule's eligibleReviewerRoles. An empty or missing pool means
 *  anyone but the sign-out provider may review; otherwise the reviewer must
 *  hold at least one of the pool's roles (compared case-insensitively). */
export function resolveQcReviewerPool(poolRoles: string[] | undefined | null, reviewerRoles: string[] | undefined | null): boolean {
  const pool = (poolRoles ?? []).map(r => r.trim().toUpperCase()).filter(Boolean);
  if (pool.length === 0) return true;
  const mine = new Set((reviewerRoles ?? []).map(r => r.trim().toUpperCase()));
  return pool.some(r => mine.has(r));
}

/** Batch 608: the pools a person reviews in. Their own qcReviewerRoles when set
 *  (an empty list means none); otherwise a staff role of Pathologist counts as
 *  the PATHOLOGIST pool, so existing staff keep working until an admin sets it. */
export function effectiveQcReviewerRoles(user: { qcReviewerRoles?: string[] | null; roles?: string[] } | null | undefined): string[] {
  if (!user) return [];
  if (user.qcReviewerRoles) return user.qcReviewerRoles;
  return (user.roles ?? []).some(r => r.toLowerCase() === 'pathologist') ? ['PATHOLOGIST'] : [];
}
