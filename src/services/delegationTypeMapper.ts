// src/services/delegationTypeMapper.ts
// ─────────────────────────────────────────────────────────────────────────────
// Maps a real DelegationType id (constants/delegationTypes.ts —
// REASSIGN, POOL, SECOND_OPINION, CASUAL_REVIEW, TUMOR_BOARD, TEACHING,
// CONSULT_EXT, SYNOPTIC_ASSIGN, or an admin-added CUSTOM_* type) to a real
// seeded participation type id (mockParticipationTypeService.ts — primary,
// attending, consultant, resident, cytotechnologist, frozen, grossing,
// second_opinion) for non-ownership-transferring delegations.
//
// Only used for delegations where DelegationType.transfersOwnership is
// false — REASSIGN/POOL never reach this (handled separately in
// delegateCase), and SYNOPTIC_ASSIGN is routed through assignSynoptic(),
// never through delegateCase() at all.
// ─────────────────────────────────────────────────────────────────────────────

export function mapDelegationTypeToParticipationRole(delegationTypeId: string): string {
  const normalized = delegationTypeId.toLowerCase();

  switch (normalized) {
    case 'second_opinion':
      return 'second_opinion';
    case 'casual_review':
    case 'tumor_board':
    case 'teaching':
    case 'consult_ext':
    default:
      // Every other collaborative/administrative delegation type —
      // including any admin-added CUSTOM_* type, which by definition
      // isn't in this switch — falls back to the standard seeded
      // 'consultant' role rather than an invented, unseeded string.
      return 'consultant';
  }
}
