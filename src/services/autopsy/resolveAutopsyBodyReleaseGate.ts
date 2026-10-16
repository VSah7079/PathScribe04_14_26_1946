// src/services/autopsy/resolveAutopsyBodyReleaseGate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own confirmed design (RFP-APLIS-2026-
// GLOBAL §3.1.C's own "regulatory chain-of-custody tracking," scoped
// directly since no more specific written spec exists for body
// release mechanics — PS-261 itself confirms detailed scoping was
// deliberately deferred to exactly this moment). Mirrors
// resolveAutopsyGrossExaminationGate.ts's own established
// { allowed, blockedReasons } shape — a real, separate, later gate in
// the same case's own lifecycle, never merged into that one.
//
// Real, deliberate, confirmed criteria:
// - Requires a real padSnapshot (Preliminary Anatomical Diagnosis) —
//   real-world practice releases the body once the physical exam is
//   done and organs are returned/appropriately retained, without
//   waiting on the real FAD (histology/toxicology can take weeks and
//   should never hold up burial/cremation).
// - Blocks conservatively while a real ancillaryHold is active — a
//   real hold exists for a real reason (often awaiting toxicology
//   specimens that must come from the body itself), so release during
//   one is blocked by default.
// - Deliberately does NOT block on organRetentionTier/
//   organRetentionDisposal — real, authorized retention is a real,
//   parallel process, never itself a release blocker. A real caller
//   wanting to surface that as an informational note reads
//   organRetentionTier directly; kept out of this gate's own blocking
//   logic to keep its own result shape consistent with
//   resolveAutopsyGrossExaminationGate.ts's own simple, binary one.
//
// Batch 495: blockedReasons used to be hardcoded English sentences,
// shown as-is by AutopsyBodyReleaseForm.tsx. Batch 479 fixed the same
// problem in resolveAutopsyGrossExaminationGate.ts and named this file
// as having it too, but this file was never converted. Now reason codes,
// same pattern: callers translate via
// t('autopsyBodyRelease.blockedReasons.<code>').
// ─────────────────────────────────────────────────────────────────────────────

import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';

export type AutopsyBodyReleaseBlockReason =
  | 'pad_not_signed'
  | 'ancillary_hold_active';

export interface AutopsyBodyReleaseGateResult {
  allowed: boolean;
  blockedReasons: AutopsyBodyReleaseBlockReason[];
}

export function resolveAutopsyBodyReleaseGate(caseDetails: AutopsyCaseDetails): AutopsyBodyReleaseGateResult {
  const blockedReasons: AutopsyBodyReleaseBlockReason[] = [];

  // A signed PAD is required; the FAD is not.
  if (!caseDetails.padSnapshot) {
    blockedReasons.push('pad_not_signed');
  }

  if (caseDetails.ancillaryHold.active) {
    blockedReasons.push('ancillary_hold_active');
  }

  return {
    allowed: blockedReasons.length === 0,
    blockedReasons,
  };
}
