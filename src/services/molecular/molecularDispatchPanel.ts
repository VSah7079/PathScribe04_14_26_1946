// src/services/molecular/molecularDispatchPanel.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-236 (Batch 450): the plate builder's scan-to-verify dispatch panel
// (§3.4). Decisions moved out of MolecularPlateBuilderPage, unchanged:
//   - the Dispatch Worklist action is offered only for a batch that has not
//     been dispatched and is not superseded (a dispatched batch shows its
//     timestamp instead);
//   - Confirm Dispatch is enabled only once both the plate barcode and the
//     deck location have been scanned, and not while a dispatch is running;
//   - what the screen says after a dispatch attempt. Whether the scans match
//     is decided by dispatchMolecularWorklist (resolveMolecularScanVerification),
//     which refuses a mismatch; this turns that refusal into the failed-check
//     codes the screen translates, or the plain reason for other failures.
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularBatch } from './IMolecularBatchService';
import type { DispatchMolecularWorklistError, DispatchMolecularWorklistResult } from './dispatchMolecularWorklist';

/** Whether the batch offers the Dispatch Worklist action. */
export function canStartMolecularDispatch(batch: Pick<MolecularBatch, 'worklistDispatchedAt' | 'status'>): boolean {
  return !batch.worklistDispatchedAt && batch.status !== 'superseded';
}

/** Whether Confirm Dispatch is enabled: both scans present and no dispatch in flight. */
export function canConfirmMolecularDispatch(
  scannedPlateBarcode: string | undefined,
  scannedDeckLocationLabel: string | undefined,
  dispatching: boolean,
): boolean {
  return !dispatching && !!scannedPlateBarcode && !!scannedDeckLocationLabel;
}

export type MolecularDispatchFeedback =
  | { success: true }
  | { success: false; verificationFailures: Array<'plate' | 'deck' | 'station'> }
  | { success: false; reason: string };

/** What the screen reports after a dispatch attempt. */
export function molecularDispatchFeedback(
  result: DispatchMolecularWorklistResult | DispatchMolecularWorklistError,
): MolecularDispatchFeedback {
  // `in` checks rather than `result.dispatched`: the project compiles without
  // strictNullChecks, where a boolean discriminant does not narrow.
  if (!('reason' in result)) return { success: true };
  const failures = result.verificationFailures;
  return failures?.length ? { success: false, verificationFailures: failures } : { success: false, reason: result.reason };
}
