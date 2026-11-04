// src/services/tumorBoard/tumorBoardRefusal.ts
// Batch 659 (finding 11): the Tumor Board workspace showed nothing when a Claim or a scheduling change was refused;
// the row just went back. This maps the service's refusal code to the wording key the screen shows. Pure.

const KNOWN: ReadonlySet<string> = new Set(['batchLocked', 'presenterNotEligible', 'notPermitted']);

/** The key under tumorBoard.errors for a refusal code; anything unrecognised reads as "could not be saved". */
export function tumorBoardRefusalKey(code: string | undefined): 'batchLocked' | 'presenterNotEligible' | 'notPermitted' | 'saveFailed' {
  return code && KNOWN.has(code) ? (code as 'batchLocked' | 'presenterNotEligible' | 'notPermitted') : 'saveFailed';
}
