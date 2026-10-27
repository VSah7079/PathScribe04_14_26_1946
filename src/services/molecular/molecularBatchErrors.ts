// src/services/molecular/molecularBatchErrors.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (mol-9): which translated message a refused batch change shows. The services answer with a fixed code
// (IMolecularBatchService.ts); the API server's own codes (NOT_PERMITTED, NOT_FOUND, CONFLICT) map onto the same
// messages, and anything else reads as the generic one, so an English service sentence never reaches the screen.
// The message lives at molecularPlateBuilderPage.batchErrors.<key>. Pure.
// ─────────────────────────────────────────────────────────────────────────────

export const MOLECULAR_BATCH_ERROR_KEYS = [
  'notPermitted', 'batchNotFound', 'alreadySuperseded', 'reasonRequired', 'lotGatingFailed', 'controlsNotSatisfied',
  'instrumentUnavailable', 'wellSpecimenMissing', 'deckSlotInvalid', 'generic',
] as const;
export type MolecularBatchErrorKey = typeof MOLECULAR_BATCH_ERROR_KEYS[number];

const SERVER_CODES: Record<string, MolecularBatchErrorKey> = { NOT_PERMITTED: 'notPermitted', NOT_FOUND: 'batchNotFound', CONFLICT: 'alreadySuperseded' };

export function molecularBatchErrorKey(error: string | undefined): MolecularBatchErrorKey {
  if (!error) return 'generic';
  if ((MOLECULAR_BATCH_ERROR_KEYS as readonly string[]).includes(error)) return error as MolecularBatchErrorKey;
  return SERVER_CODES[error] ?? 'generic';
}
