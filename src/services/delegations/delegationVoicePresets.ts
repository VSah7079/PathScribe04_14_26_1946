// src/services/delegations/delegationVoicePresets.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#83). Saying "request peer review", "formal consultation" or
// "full transfer" opens the Delegate dialog with that delegation type already
// chosen. This file is the one place that says which delegation type each
// spoken action means; the dialog only applies the answer.
// ─────────────────────────────────────────────────────────────────────────────

/** Voice action id → delegation type id (services/delegationTypes/). */
export const DELEGATION_VOICE_PRESETS: Readonly<Record<string, string>> = {
  DELEGATE_PEER_REVIEW: 'CASUAL_REVIEW',
  DELEGATE_FORMAL_CONSULT: 'SECOND_OPINION',
  DELEGATE_FULL_TRANSFER: 'REASSIGN',
};

/** The delegation type a spoken delegate action presets, or undefined for any other action. */
export function delegationTypeForVoiceAction(actionId: string): string | undefined {
  return DELEGATION_VOICE_PRESETS[actionId];
}

/**
 * Whether the preset type can be chosen right now: it must be one of the
 * active delegation types the dialog lists (an administrator may have turned
 * one off, as Informal Review is by default). When it cannot, the dialog
 * says so rather than doing nothing.
 */
export function presetAvailable(activeTypes: readonly { id: string }[], typeId: string): boolean {
  return activeTypes.some(t => t.id === typeId);
}
