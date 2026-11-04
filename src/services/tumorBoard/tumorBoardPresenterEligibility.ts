// src/services/tumorBoard/tumorBoardPresenterEligibility.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 494 (PS-359 follow-up — MDT Self-Service Assignment & Batching
// redesign, Pete, Oct 8). One, shared, pure source of truth for "can this
// person present at Tumor Board" — Pete's own confirmed restriction (Batch
// 493): "Attending Pathologists, Fellows, and Residents." PA is
// deliberately excluded (grosses specimens, doesn't present findings).
//
// Real gap this closes: until this batch, that restriction only lived in
// useTumorBoardWorkspace.ts's own client-side filter on the Presenter
// dropdown's OPTIONS — nothing stopped a server-side caller (or a future
// UI path) from setting presenterUserId to an ineligible user directly.
// mockTumorBoardService.ts now calls isPresenterEligibleRoles() for real,
// in the service, on every create()/update() that sets a presenter — CLAUDE.md
// rule 2 ("no business logic in components," and the corollary that a rule
// worth enforcing is worth enforcing server-side, not just by hiding the
// option in a dropdown). useTumorBoardWorkspace.ts's own presenter-list
// filter now calls this same function, so the two can't drift apart again.
// ─────────────────────────────────────────────────────────────────────────────

/** Roles allowed to present at Tumor Board / MDT. Exported as a readonly
 *  array (not just the predicate below) so a caller that needs the raw
 *  list — the presenter-dropdown filter — doesn't have to re-derive it. */
export const PRESENTER_ELIGIBLE_ROLES = ['pathologist', 'fellow', 'resident'] as const;

/** Pure: does this set of StaffUser.roles make someone eligible to present
 *  at Tumor Board? A user can hold several roles; eligible if ANY of them
 *  is in PRESENTER_ELIGIBLE_ROLES. */
export function isPresenterEligibleRoles(roles: readonly string[]): boolean {
  return roles.some(r => (PRESENTER_ELIGIBLE_ROLES as readonly string[]).includes(r));
}
